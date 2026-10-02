'use strict';
/* =========================================================================
   NOVA ASCENT — Rocket Works
   ========================================================================= */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => { if (b === undefined) { b = a; a = 0; } return a + Math.random() * (b - a); };
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt = n => Math.floor(n).toLocaleString('en-US');

/* ---------------- safe storage (works in sandboxed iframes) -------------- */
const _mem = {};
const Store = {
  ok: (()=>{ try{ localStorage.setItem('__probe','1'); localStorage.removeItem('__probe'); return true; }catch(e){ return false; } })(),
  get(k, d) {
    try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }
    catch (e) { return (k in _mem) ? _mem[k] : d; }
  },
  set(k, v) { _mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
};

/* ---------------- part catalogue ---------------------------------------- */
/* cat, name, tier, desc, cost{rp,rs}, stats..., vis...                      */
const PARTS = {
  /* --- NOSE CONES (drag) --- */
  'nose-basic':   { cat:'nose', name:'Standard Cone', tier:'Tier I', desc:'A perfectly serviceable pointy hat. Gets the job done.',
                    cost:{rp:0,rs:0}, mass:4, drag:1.00, rsBonus:0,
                    vis:{shape:'cone', h:26, color:'#dfe4ee', tip:'#9aa3b5'} },
  'nose-aero':    { cat:'nose', name:'Aero Cone', tier:'Tier II', desc:'Blended ogive profile. Slices the lower atmosphere.',
                    cost:{rp:250,rs:0}, mass:5, drag:0.80, rsBonus:0,
                    vis:{shape:'ogive', h:33, color:'#f2f5ff', tip:'#7fd4ff'} },
  'nose-hyper':   { cat:'nose', name:'Hypersonic Spike', tier:'Tier III', desc:'Aerospike nose for Mach 5+ flight. Runs hot, flies fast.',
                    cost:{rp:900,rs:10}, mass:6, drag:0.62, rsBonus:0,
                    vis:{shape:'spike', h:42, color:'#2b2f3a', tip:'#ff9d3d'} },
  'nose-quantum': { cat:'nose', name:'Quantum Tip', tier:'Tier IV', desc:'Phase-shifting apex. Near-zero drag and it hums with data.',
                    cost:{rp:2500,rs:60}, mass:5, drag:0.45, rsBonus:0.15,
                    vis:{shape:'crystal', h:35, color:'#241540', tip:'#c07bff'} },

  /* --- FUEL TANKS --- */
  'tank-small':   { cat:'tank', name:'Pony Tank', tier:'Tier I', desc:'Barely a sip of propellant. Light and cheap.',
                    cost:{rp:0,rs:0}, mass:8, fuel:90,
                    vis:{h:42, w:0, color:'#e6e9f2', stripe:'#c8384a'} },
  'tank-std':     { cat:'tank', name:'Standard Tank', tier:'Tier II', desc:'The workhorse. A sensible amount of boom-juice.',
                    cost:{rp:200,rs:0}, mass:14, fuel:160,
                    vis:{h:56, w:1, color:'#eef1f8', stripe:'#3f7fe0'} },
  'tank-ext':     { cat:'tank', name:'Extended Tank', tier:'Tier III', desc:'Stretched core stage. Long burns, long flights.',
                    cost:{rp:700,rs:8}, mass:23, fuel:260,
                    vis:{h:74, w:2.4, color:'#dfe6f0', stripe:'#f0a63c'} },
  'tank-cryo':    { cat:'tank', name:'Cryo Tank', tier:'Tier IV', desc:'Sub-cooled densified propellant. Absurd capacity.',
                    cost:{rp:1800,rs:40}, mass:31, fuel:400,
                    vis:{h:86, w:3.8, color:'#cfe9f5', stripe:'#37d6c0'} },

  /* --- ENGINES --- */
  'eng-tiny':     { cat:'engine', name:'Sputnik Thruster', tier:'Tier I', desc:'One small bell, one honest flame. Sips fuel.',
                    cost:{rp:0,rs:0}, mass:10, thrust:270, burn:6.0, vmax:265,
                    vis:{h:15, nozzles:1, size:0.85, flame:'#ffbe5c'} },
  'eng-dual':     { cat:'engine', name:'Twin Bell', tier:'Tier II', desc:'Two regeneratively-cooled bells. Serious punch.',
                    cost:{rp:300,rs:0}, mass:14, thrust:450, burn:9.5, vmax:385,
                    vis:{h:18, nozzles:2, size:0.95, flame:'#ff9a3c'} },
  'eng-ion':      { cat:'engine', name:'Ion Drive', tier:'Tier III', desc:'Blue whisper of accelerated xenon. Incredible efficiency.',
                    cost:{rp:1000,rs:15}, mass:12, thrust:420, burn:6.5, vmax:430,
                    vis:{h:20, nozzles:3, size:0.62, flame:'#7fd4ff'} },
  'eng-nuke':     { cat:'engine', name:'Nuclear Pulse', tier:'Tier IV', desc:'Ride a series of small atomic explosions. Legal-ish.',
                    cost:{rp:2600,rs:70}, mass:22, thrust:740, burn:16.0, vmax:560,
                    vis:{h:23, nozzles:2, size:1.35, flame:'#b6ff6a'} },
  'eng-sing':     { cat:'engine', name:'Singularity Drive', tier:'Tier V', desc:'Bottled micro-black-hole. Do not lick.',
                    cost:{rp:6000,rs:150}, mass:26, thrust:1010, burn:13.0, vmax:720,
                    vis:{h:26, nozzles:4, size:1.1, flame:'#d67bff'} },

  /* --- FINS (handling) --- */
  'fin-basic':    { cat:'fins', name:'Stubby Fins', tier:'Tier I', desc:'Little nubs. Turns like a bus.',
                    cost:{rp:0,rs:0}, mass:4, turn:2.2, stab:0.6,
                    vis:{h:15, w:13, color:'#c8384a', sweep:0.3} },
  'fin-swept':    { cat:'fins', name:'Swept Fins', tier:'Tier II', desc:'Raked surfaces for crisp attitude control.',
                    cost:{rp:180,rs:0}, mass:5, turn:3.0, stab:1.0,
                    vis:{h:21, w:19, color:'#3f7fe0', sweep:0.85} },
  'fin-delta':    { cat:'fins', name:'Delta Vanes', tier:'Tier III', desc:'Big canard-delta set. Dances in the airstream.',
                    cost:{rp:650,rs:6}, mass:7, turn:3.8, stab:1.5,
                    vis:{h:26, w:23, color:'#f0a63c', sweep:1.25} },
  'fin-mag':      { cat:'fins', name:'Mag Rails', tier:'Tier IV', desc:'Magnetohydrodynamic vanes. Steers in vacuum too.',
                    cost:{rp:1600,rs:35}, mass:8, turn:4.7, stab:2.0,
                    vis:{h:21, w:18, color:'#37d6c0', sweep:1.0, glow:true} },

  /* --- WEAPONS --- */
  'wpn-pulse':    { cat:'weapon', name:'Pulse Cannon', tier:'Tier I', desc:'Single barrel, rapid bolts. Reliable.',
                    cost:{rp:0,rs:0}, mass:6, dmg:11, shots:1, rate:5.5, bspd:920, spread:0, pierce:0, splash:0,
                    vis:{pods:1, len:15, color:'#9aa3b5', shot:'#ffe27a'} },
  'wpn-twin':     { cat:'weapon', name:'Twin Blaster', tier:'Tier II', desc:'Two barrels, twice the opinions.',
                    cost:{rp:400,rs:0}, mass:9, dmg:9, shots:2, rate:6.5, bspd:940, spread:0.06, pierce:0, splash:0,
                    vis:{pods:2, len:17, color:'#7f8aa0', shot:'#7fd4ff'} },
  'wpn-plasma':   { cat:'weapon', name:'Plasma Lance', tier:'Tier III', desc:'Slow, hot beams that punch through rock.',
                    cost:{rp:1200,rs:20}, mass:11, dmg:30, shots:2, rate:2.6, bspd:1050, spread:0.03, pierce:2, splash:0,
                    vis:{pods:2, len:23, color:'#5b3f8f', shot:'#c07bff'} },
  'wpn-rail':     { cat:'weapon', name:'Railgun', tier:'Tier IV', desc:'Hypervelocity slugs. Deletes whatever it touches.',
                    cost:{rp:2800,rs:75}, mass:15, dmg:64, shots:1, rate:1.5, bspd:1500, spread:0, pierce:4, splash:0,
                    vis:{pods:2, len:27, color:'#3a4256', shot:'#ff6a6a'} },
  'wpn-nova':     { cat:'weapon', name:'Nova Cannon', tier:'Tier V', desc:'Lobs micro-suns that detonate on arrival.',
                    cost:{rp:6500,rs:170}, mass:17, dmg:34, shots:3, rate:3.2, bspd:820, spread:0.14, pierce:0, splash:95,
                    vis:{pods:3, len:21, color:'#8f5b1f', shot:'#ffb03a'} },

  /* --- SCIENCE MODULES --- */
  'mod-none':     { cat:'module', name:'Empty Bay', tier:'—', desc:'Nothing up here but wiring and regret.',
                    cost:{rp:0,rs:0}, mass:2, rpMult:1.00, rsMult:1.00, vis:null },
  'mod-probe':    { cat:'module', name:'Probe Bay', tier:'Tier II', desc:'Deploys sensor pucks. Sponsors pay more per flight.',
                    cost:{rp:350,rs:0}, mass:6, rpMult:1.30, rsMult:1.00,
                    vis:{h:18, color:'#b9c3d6', kind:'dish'} },
  'mod-lab':      { cat:'module', name:'Science Lab', tier:'Tier III', desc:'Centrifuge, spectrometer, one very brave mouse.',
                    cost:{rp:1100,rs:18}, mass:9, rpMult:1.10, rsMult:1.65,
                    vis:{h:22, color:'#9fe0d2', kind:'ring'} },
  'mod-obs':      { cat:'module', name:'Deep Observatory', tier:'Tier IV', desc:'Folded-mirror telescope array. Publishes constantly.',
                    cost:{rp:3200,rs:90}, mass:12, rpMult:1.35, rsMult:2.20,
                    vis:{h:26, color:'#c9b3ff', kind:'dome'} },

  /* --- HULLS --- */
  'hull-alloy':   { cat:'hull', name:'Alloy Hull', tier:'Tier I', desc:'Aluminium skin. Dents bravely.',
                    cost:{rp:0,rs:0}, mass:12, hp:100, shield:0,
                    vis:{color:'#cfd6e4', trim:'#8b95a8'} },
  'hull-titan':   { cat:'hull', name:'Titanium Frame', tier:'Tier II', desc:'Stiffer, tougher, slightly smug.',
                    cost:{rp:500,rs:0}, mass:17, hp:170, shield:0,
                    vis:{color:'#d8dee9', trim:'#5c6b85'} },
  'hull-nano':    { cat:'hull', name:'Nano Weave', tier:'Tier III', desc:'Self-repairing lattice that regrows a shield layer.',
                    cost:{rp:1500,rs:30}, mass:18, hp:210, shield:7,
                    vis:{color:'#bfe9df', trim:'#2f8f7d'} },
  'hull-aegis':   { cat:'hull', name:'Aegis Field', tier:'Tier IV', desc:'Projected barrier. Shrugs off asteroid impacts.',
                    cost:{rp:4200,rs:110}, mass:24, hp:270, shield:16,
                    vis:{color:'#cfe0ff', trim:'#3f6fe0'} }
};
const CATS = [
  { id:'nose',   label:'Nose'   },
  { id:'missile',label:'Missile'},
  { id:'tank',   label:'Tank'   },
  { id:'engine', label:'Engine' },
  { id:'fins',   label:'Fins'   },
  { id:'weapon', label:'Weapon' },
  { id:'module', label:'Module' },
  { id:'hull',   label:'Hull'   },
  { id:'stage',  label:'Stage'  },
  { id:'sgun',   label:'St.Gun' }
];
/* racks that live in the loadout (P.build); stages & stage-guns live in the Stage Bay */
const BUILD_CATS = CATS.filter(c => c.id!=='stage' && c.id!=='sgun');
/* --- BOOSTER STAGES (burn first, then separate) --- */
PARTS['stg-solid']  = { cat:'stage', name:'Solid Booster', tier:'Tier II',
  desc:'A strapped-on brick of explosive cement. Enormous kick, short life, one gun mount.',
  cost:{rp:600,rs:0}, mass:26, thrust:920, burn:26, fuel:150, mounts:1,
  vis:{h:50,w:6,color:'#d8dde6',stripe:'#c8384a',nozzles:2,flame:'#ffbe5c'} };
PARTS['stg-kero']   = { cat:'stage', name:'Kerolox Booster', tier:'Tier III',
  desc:'Refined-fuel first stage with room for two side guns.',
  cost:{rp:1600,rs:25}, mass:34, thrust:1080, burn:20, fuel:260, mounts:2,
  vis:{h:64,w:8,color:'#e6e9f2',stripe:'#3f7fe0',nozzles:3,flame:'#ff9a3c'} };
PARTS['stg-hydro']  = { cat:'stage', name:'Hydrolox Upper Stage', tier:'Tier IV',
  desc:'Silky, efficient second stage. Keeps pushing long after the others quit.',
  cost:{rp:3200,rs:80}, mass:30, thrust:780, burn:9, fuel:340, mounts:2,
  vis:{h:72,w:7,color:'#cfe9f5',stripe:'#37d6c0',nozzles:1,flame:'#7fd4ff'} };
PARTS['stg-cluster']= { cat:'stage', name:'Cluster Strap-ons', tier:'Tier V',
  desc:'Four tanks, four bells, three gun mounts. Subtlety not included.',
  cost:{rp:6500,rs:160}, mass:48, thrust:1800, burn:34, fuel:240, mounts:3,
  vis:{h:58,w:10,color:'#dfe6f0',stripe:'#f0a63c',nozzles:4,flame:'#b6ff6a'} };

/* --- STAGE GUNS (bolt onto a stage mount) --- */
PARTS['sgun-pod']   = { cat:'sgun', name:'Twin Pod Guns', tier:'Tier II',
  desc:'Cheap belt-fed pods. More bullets is a strategy.',
  cost:{rp:350,rs:0}, mass:5, dmg:8, shots:2, rate:4.5, bspd:880, spread:0.10, pierce:0, splash:0,
  vis:{len:14,color:'#9aa3b5',shot:'#ffe27a'} };
PARTS['sgun-rocket']= { cat:'sgun', name:'Rocket Pod', tier:'Tier III',
  desc:'Unguided but enthusiastic. Fragile asteroids hate it.',
  cost:{rp:900,rs:12}, mass:7, dmg:24, shots:2, rate:1.6, bspd:700, spread:0.16, pierce:0, splash:60,
  vis:{len:18,color:'#5b4a3f',shot:'#ffb03a'} };
PARTS['sgun-beam']  = { cat:'sgun', name:'Phase Lances', tier:'Tier IV',
  desc:'Coherent beams mounted on the stage shoulders.',
  cost:{rp:2000,rs:45}, mass:8, dmg:16, shots:2, rate:6.5, bspd:1200, spread:0.02, pierce:1, splash:0,
  vis:{len:20,color:'#5b3f8f',shot:'#c07bff'} };

/* ---------------- new top-shelf parts (Tier VI/VII — pricey) ------------- */
Object.assign(PARTS, {
  'nose-sing':   { cat:'nose', name:'Singularity Tip', tier:'Tier VI', desc:'Bends airflow around itself. Whispers slightly.',
                   cost:{rp:12000,rs:300}, mass:5, drag:0.55, rsBonus:0.20,
                   vis:{shape:'crystal', h:30, color:'#241540', tip:'#c07bff'} },
  'tank-sing':   { cat:'tank', name:'Event-Horizon Tank', tier:'Tier VI', desc:'Holds more propellant than geometry allows.',
                   cost:{rp:13000,rs:320}, mass:34, fuel:2600,
                   vis:{h:64,w:4.6,color:'#dfe6f0',stripe:'#c07bff'} },
  'eng-warp':    { cat:'engine', name:'Warp Burner', tier:'Tier VII', desc:'Technically an engine. Philosophically a doorway.',
                   cost:{rp:18000,rs:450}, mass:24, thrust:1500, burn:14.0, vmax:900,
                   vis:{h:24, nozzles:3, size:1.5, flame:'#7af0ff'} },
  'fin-quantum': { cat:'fins', name:'Quantum Vanes', tier:'Tier VI', desc:'Steer in four dimensions, complain in none.',
                   cost:{rp:11000,rs:280}, mass:5, turn:4.6, stab:1.4,
                   vis:{h:16,w:20,color:'#c07bff',sweep:1.1,glow:true} },
  'wpn-nova2':   { cat:'weapon', name:'Nova Repeater', tier:'Tier VII', desc:'Three barrels of organised sunrise.',
                   cost:{rp:16000,rs:400}, mass:16, dmg:90, shots:3, rate:2.2, bspd:1150, spread:0.10, pierce:3, splash:80,
                   vis:{pods:3, len:22,color:'#ffd782',shot:'#ffe9b8'} },
  'hull-fortress':{ cat:'hull', name:'Fortress Lattice', tier:'Tier VI', desc:'A wall that learned to fly.',
                   cost:{rp:14000,rs:350}, mass:26, hp:420, shield:4,
                   vis:{color:'#8fa3c8', trim:'#4d5b7a'} },
  'mod-sing':    { cat:'module', name:'Override Core', tier:'Tier VII', desc:'Doubles payouts. Voids warranty.',
                   cost:{rp:17000,rs:420}, mass:4, rpMult:2.00, rsMult:2.00,
                   vis:{h:20, color:'#d9c2ff', kind:'ring'} },
  'stg-ion':     { cat:'stage', name:'Ion Stack', tier:'Tier VI', desc:'Slow, silent, endless push. Two gun mounts.',
                   cost:{rp:9000,rs:230}, mass:26, thrust:900, burn:8, fuel:420, mounts:2,
                   vis:{h:44,w:9,color:'#dfe6f0',stripe:'#7af0ff',nozzles:2,flame:'#7af0ff'} },
  'stg-titan':   { cat:'stage', name:'Titan Colossus', tier:'Tier VII', desc:'A building with ambitions. Three gun mounts.',
                   cost:{rp:14000,rs:340}, mass:60, thrust:2600, burn:40, fuel:300, mounts:3,
                   vis:{h:70,w:13,color:'#cfd6e4',stripe:'#ff5f6d',nozzles:5,flame:'#ffb454'} },
  'sgun-rail':   { cat:'sgun', name:'Stage Railgun', tier:'Tier VI',
                   cost:{rp:5200,rs:120}, mass:9, dmg:40, shots:1, rate:1.4, bspd:1500, spread:0.01, pierce:2, splash:0,
                   vis:{len:24,color:'#33466e',shot:'#7af0ff'} },
  'sgun-nova':   { cat:'sgun', name:'Nova Pods', tier:'Tier VII', desc:'Triple splash volleys from the stage shoulders.',
                   cost:{rp:7800,rs:190}, mass:11, dmg:30, shots:3, rate:1.2, bspd:900, spread:0.14, pierce:0, splash:90,
                   vis:{len:20,color:'#5b3f8f',shot:'#ffd782'} }
});
PARTS['sgun-rail'].desc = 'Hypervelocity darts bolted to your booster.';

/* --- MISSILE RACK (separate launcher, own cooldown, homes onto targets) --- */
PARTS['msl-none']   = { cat:'missile', name:'Empty Rack', tier:'—', desc:'No launcher fitted. Just a clean hardpoint.',
                   cost:{rp:0,rs:0}, mass:1, dmg:0, shots:0, rate:0, bspd:0, spread:0, splash:0, seek:0,
                   vis:{pods:0, len:0, color:'#5c6b85', shot:'#8fa3c8'} };
PARTS['msl-dart']   = { cat:'missile', name:'Dart Missiles', tier:'Tier II',
                   desc:'Single seeker on a rail. Cheap, reliable, gently homes.',
                   cost:{rp:900,rs:0}, mass:6, dmg:26, shots:1, rate:0.85, bspd:620, spread:0.05, splash:46, seek:2.2,
                   vis:{pods:1, len:16, color:'#9aa3b5', shot:'#ffb03a'} };
PARTS['msl-swarm']  = { cat:'missile', name:'Swarm Pods', tier:'Tier III',
                   desc:'Three little seekers per launch. Covers the sky in confetti and fire.',
                   cost:{rp:1900,rs:30}, mass:9, dmg:18, shots:3, rate:0.7, bspd:560, spread:0.24, splash:42, seek:1.8,
                   vis:{pods:3, len:13, color:'#7f8aa0', shot:'#ffe27a'} };
PARTS['msl-hunter'] = { cat:'missile', name:'Hunter Seekers', tier:'Tier IV',
                   desc:'Aggressive guidance. Turns hard, refuses to be shaken off.',
                   cost:{rp:4200,rs:110}, mass:12, dmg:40, shots:2, rate:0.75, bspd:640, spread:0.14, splash:60, seek:3.8,
                   vis:{pods:2, len:20, color:'#3a4256', shot:'#7af0ff'} };
PARTS['msl-torpedo']= { cat:'missile', name:'Siege Torpedo', tier:'Tier V',
                   desc:'One enormous warhead. Slow, unsubtle, deletes bosses.',
                   cost:{rp:8000,rs:210}, mass:18, dmg:120, shots:1, rate:0.45, bspd:430, spread:0, splash:130, seek:1.1,
                   vis:{pods:1, len:26, color:'#5b3f8f', shot:'#c07bff'} };
PARTS['msl-tsar']   = { cat:'missile', name:'Tsar Volley', tier:'Tier VII',
                   desc:'Four singularity-tipped seekers. Everything dies politely.',
                   cost:{rp:15500,rs:390}, mass:22, dmg:70, shots:4, rate:0.6, bspd:700, spread:0.18, splash:90, seek:3.0,
                   vis:{pods:4, len:18, color:'#241540', shot:'#ff5fd0'} };

/* --- SPACE SHUTTLE STACK (parallel boosters + external tank) ------------- */
PARTS['stg-srb'] = { cat:'stage', name:'Shuttle SRB Pair', tier:'Tier VI',
  desc:'Two solid rocket boosters bolted alongside. Lit together on the pad: colossal kick, brutal burn, then they drop away.',
  cost:{rp:12000,rs:280}, mass:44, thrust:2700, burn:27, fuel:215, mounts:0,
  vis:{h:118,w:7,color:'#eef2f7',stripe:'#c8384a',nozzles:1,flame:'#ffcf6b',pair:true} };
PARTS['stg-et']  = { cat:'stage', name:'External Tank', tier:'Tier VI',
  desc:'The giant orange tank. Feeds the main engines long after the boosters are gone, then it too is cut loose.',
  cost:{rp:11000,rs:260}, mass:34, thrust:860, burn:11, fuel:660, mounts:0,
  vis:{h:100,w:9,color:'#c96a1e',stripe:'#5a4029',nozzles:3,flame:'#ff8b3c',big:true} };

/* ---------------- SHIP SKINS (livery + its own staging) -------------------- */
const SKINS = [
  { id:'skin-dawn',    name:'Dawn Patrol',   tier:'Standard', desc:'Factory livery. Orange stripe, honest aluminium.',
    cost:{rp:0,rs:0},
    paint:{ nose:'#dfe4ee', tip:'#9aa3b5', tank:'#eef1f8', stripe:'#ff8b3c', fin:'#c8384a', flame:'#ffb45c', hull:'#cfd6e4' },
    stages:{ a:'stg-solid', b:null }, sguns:{ a:[], b:[] } },
  { id:'skin-void',    name:'Voidrunner',    tier:'Livery', desc:'Matte black airframe, cyan plasma trim. Runs silent.',
    cost:{rp:2400,rs:40},
    paint:{ nose:'#171c26', tip:'#7af0ff', tank:'#1b2230', stripe:'#7af0ff', fin:'#223044', flame:'#7af0ff', hull:'#2a3350' },
    stages:{ a:'stg-kero', b:'stg-hydro' }, sguns:{ a:['sgun-beam'], b:['sgun-beam'] } },
  { id:'skin-crimson', name:'Crimson Fang',  tier:'Livery', desc:'Racing red, gold accents, a very hot burner.',
    cost:{rp:3400,rs:70},
    paint:{ nose:'#3a0f14', tip:'#ffd782', tank:'#5a1620', stripe:'#ffd782', fin:'#c8384a', flame:'#ff5f6d', hull:'#7a2028' },
    stages:{ a:'stg-cluster', b:null }, sguns:{ a:['sgun-rocket','sgun-pod'], b:[] } },
  { id:'skin-aurora',  name:'Aurora Warden', tier:'Livery', desc:'Deep-space teal with a green ion bloom.',
    cost:{rp:5200,rs:120},
    paint:{ nose:'#0e2a2a', tip:'#b6ff6a', tank:'#123333', stripe:'#b6ff6a', fin:'#1d4a44', flame:'#b6ff6a', hull:'#1c4a4a' },
    stages:{ a:'stg-hydro', b:'stg-kero' }, sguns:{ a:['sgun-beam'], b:['sgun-pod'] } },
  { id:'skin-nova',    name:'Nova Lance',    tier:'Prestige', desc:'Violet singularity plating. Humms faintly.',
    cost:{rp:9800,rs:250},
    paint:{ nose:'#241540', tip:'#c07bff', tank:'#2a1a4a', stripe:'#c07bff', fin:'#3b2470', flame:'#d67bff', hull:'#3a2a63' },
    stages:{ a:'stg-titan', b:'stg-ion' }, sguns:{ a:['sgun-nova','sgun-rail'], b:['sgun-rail'] } },
  { id:'skin-spectre', name:'Spectre Mk-II', tier:'Prestige', desc:'Stealth grey. Radar sees a rumour.',
    cost:{rp:14000,rs:380},
    paint:{ nose:'#2b3140', tip:'#c07bff', tank:'#333b4d', stripe:'#8fa3d8', fin:'#242a38', flame:'#c07bff', hull:'#3d465a' },
    stages:{ a:'stg-ion', b:'stg-cluster' }, sguns:{ a:['sgun-rail'], b:['sgun-nova'] } },
  { id:'skin-shuttle', name:'Space Shuttle', tier:'Legend', shape:'shuttle',
    desc:'The real stack: orbiter, big orange external tank, twin solid boosters. SRBs burn together on the pad, drop, then the tank carries you.',
    cost:{rp:26000,rs:700},
    paint:{ nose:'#132a38', tip:'#e44b4b', tank:'#0a2a3c', stripe:'#cfd6de', fin:'#123243', flame:'#ff8b3c', hull:'#0a2a3c' },
    stages:{ a:'stg-srb', b:'stg-et' }, sguns:{ a:[], b:[] } }
];

/* --- AMMO LAB: global bullet upgrades --- */
const AMMO = [
  { id:'heavy',    name:'Heavy Rounds',   max:3, desc:'Denser slugs. +14% bullet damage per mark.',
    cost:L=>({rp:Math.round(260*Math.pow(2.1,L)), rs:Math.round(6*Math.pow(2,L))}) },
  { id:'velocity', name:'Velocity Coils', max:3, desc:'Rail-boosted muzzles. +16% bullet speed per mark.',
    cost:L=>({rp:Math.round(240*Math.pow(2.1,L)), rs:Math.round(5*Math.pow(2,L))}) },
  { id:'feed',     name:'Rapid Feed',     max:3, desc:'Greased belts, happy gunners. +11% fire rate per mark.',
    cost:L=>({rp:Math.round(300*Math.pow(2.1,L)), rs:Math.round(7*Math.pow(2,L))}) },
  { id:'ap',       name:'AP Tips',        max:2, desc:'Tungsten cores. +1 pierce per mark.',
    cost:L=>({rp:Math.round(700*Math.pow(2.3,L)), rs:Math.round(20*Math.pow(2,L))}) },
  { id:'split',    name:'Splitter Heads', max:2, desc:'Each volley gains +1 projectile (wider fan).',
    cost:L=>({rp:Math.round(900*Math.pow(2.4,L)), rs:Math.round(30*Math.pow(2,L))}) },
  { id:'frag',     name:'Frag Cores',     max:2, desc:'Bullets detonate: +45 blast radius per mark.',
    cost:L=>({rp:Math.round(800*Math.pow(2.3,L)), rs:Math.round(26*Math.pow(2,L))}) },
  { id:'seeker',   name:'Seeker Chips',   max:1, desc:'Bullets curve toward the nearest target.',
    cost:L=>({rp:2600, rs:90}) }
];
const AMMO_MAX = {}; AMMO.forEach(a=>AMMO_MAX[a.id]=a.max);
function ammoLvl(id){ return clamp(((P.ammo && P.ammo[id])|0), 0, AMMO_MAX[id]||0); }
function ammoCost(id){ const a=AMMO.find(x=>x.id===id); return a.cost(ammoLvl(id)); }
/* ---------------- parachutes ------------------------------------------- */
Object.assign(PARTS, {
  'chute-daisy':  { cat:'chute', name:'Daisy Chute',    tier:'Free',    cost:{rp:0},          mass:1.2, limit:150, desc:'Free starter canopy. Cuts your fall to ~37 m/s.' },
  'chute-brake':  { cat:'chute', name:'Brake Chute',    tier:'Tier II', cost:{rp:1200},       mass:1.8, limit:95,  desc:'Denser weave — floats you down at ~24 m/s.' },
  'chute-feather':{ cat:'chute', name:'Feather Canopy', tier:'Tier III',cost:{rp:3400,rs:70}, mass:2.6, limit:55,  desc:'Tri-lobe silk. Barely falls at all (~14 m/s).' }
});

function ammoMods(){
  return {
    dmg:    1 + 0.14*ammoLvl('heavy'),
    spd:    1 + 0.16*ammoLvl('velocity'),
    rate:   1 + 0.11*ammoLvl('feed'),
    pierce: ammoLvl('ap'),
    shots:  ammoLvl('split'),
    splash: ammoLvl('frag')*45,
    seek:   ammoLvl('seeker')
  };
}

const STARTER = ['nose-basic','tank-small','eng-tiny','fin-basic','wpn-pulse','mod-none','hull-alloy'];

/* ---------------- missions ---------------------------------------------- */
const MISSIONS = [
  { id:'m1', name:'First Hop',        desc:'Climb to 400 m altitude',                    goal:{alt:400},            rp:200,  rs:8   },
  { id:'m2', name:'Cloud Piercer',    desc:'Climb to 1,200 m and destroy 10 targets',    goal:{alt:1200, kills:10}, rp:500,  rs:22  },
  { id:'m3', name:'The Space Line',   desc:'Climb to 3,000 m',                           goal:{alt:3000},           rp:1100, rs:50  },
  { id:'m4', name:'Drone Hunter',     desc:'Destroy 30 hostiles in one sortie',          goal:{kills:30},           rp:1400, rs:75  },
  { id:'m5', name:'Orbital Ambition', desc:'Climb to 6,000 m',                           goal:{alt:6000},           rp:2600, rs:130 },
  { id:'m6', name:'Warden Slayer',    desc:'Defeat the Warden above 7,000 m',            goal:{boss:1},             rp:4000, rs:230 },
  { id:'m7', name:'Deep Sky',         desc:'Climb to 10,000 m',                          goal:{alt:10000},          rp:7000, rs:420 }
];

/* ---------------- profile / save ---------------------------------------- */
function defaultProfile(){
  return {
    rp: 150, rs: 0,
    owned: STARTER.slice(),
    build: { nose:'nose-basic', tank:'tank-small', engine:'eng-tiny', fins:'fin-basic', chute:null,
             weapon:'wpn-pulse', module:'mod-none', hull:'hull-alloy', missile:'msl-none' },
    best: 0, totalRP: 0, totalRS: 0, flights: 0, kills: 0, name:'', distBest:0,
    dev:{ parts:false, nodmg:false, fuel:false, rp:false, rs:false }, devGranted:[], devSnap:[],
    level:1, done:[], ach:[], miniKills:0,
    missions: [], tutDone: false, muted: false, seenIntro: false, lvl: {},
    stages: { a:null, b:null }, sguns: { a:[], b:[] }, ammo: {},
    skin: 'skin-dawn', skinsOwned: ['skin-dawn']
  };
}
const SAVE_KEY = 'nova_ascent_save_v1';
let P = loadProfile();
function loadProfile(){
  const d = defaultProfile();
  const s = Store.get(SAVE_KEY, null);
  if(!s) return d;
  const p = Object.assign(d, s);
  p.build = Object.assign(d.build, s.build || {});
  p.owned = Array.from(new Set(d.owned.concat(s.owned || [])));
  p.lvl = Object.assign({}, s.lvl || {});
  p.stages = Object.assign({a:null,b:null}, s.stages || {});
  p.sguns = Object.assign({a:[],b:[]}, s.sguns || {});
  p.ammo = Object.assign({}, s.ammo || {});
  if(p.dev === true) p.dev = { parts:true, nodmg:true, fuel:true };      // ancient saves
  if(!p.dev || typeof p.dev !== 'object' || !('rp' in p.dev))
    p.dev = { parts:false, nodmg:false, fuel:false, rp:false, rs:false };   // every switch OFF by default
  p.devGranted = Array.isArray(s.devGranted) ? s.devGranted : [];
  p.devSnap = Array.isArray(s.devSnap) ? s.devSnap : [];
  p.level = Math.min(100, Math.max(1, s.level|0 || 1));
  p.done = Array.isArray(s.done) ? s.done : [];
  p.ach = Array.isArray(s.ach) ? s.ach : [];
  p.miniKills = s.miniKills|0 || 0;
  for(const sl of ['a','b']){
    if(p.stages[sl] && !p.owned.includes(p.stages[sl])) p.stages[sl]=null;
    p.sguns[sl] = (p.sguns[sl]||[]).filter(g=>g && p.owned.includes(g));
  }
  // validate build against owned parts
  for(const c of BUILD_CATS){ if(!p.owned.includes(p.build[c.id])) p.build[c.id] = STARTER.find(x=>PARTS[x].cat===c.id); }
  return p;
}
function save(){ Store.set(SAVE_KEY, P); }

/* ---------------- part upgrade levels (Mk I..IV) ------------------------- */
const MAXLVL = 3;
function lvlOf(id){ return clamp(((P.lvl && P.lvl[id])|0), 0, MAXLVL); }
function upCost(id){
  const p = PARTS[id], L = lvlOf(id), m = Math.pow(1.9, L);
  return { rp: Math.round((90 + (p.cost.rp||0)*0.5) * m),
           rs: Math.round(((p.cost.rs||0)*0.35) * m) };
}
/* per-level growth factors, by category */
const UPG = {
  engine: p => L => ({ thrust: p.thrust*(1+0.09*L), vmax: (p.vmax||300)*(1+0.05*L) }),
  tank:   p => L => ({ fuel:   p.fuel*(1+0.12*L) }),
  weapon: p => L => ({ dmg:    p.dmg*(1+0.12*L), rate: p.rate*(1+0.05*L) }),
  hull:   p => L => ({ hp:     p.hp*(1+0.12*L), shield: p.shield*(1+0.15*L) }),
  fins:   p => L => ({ turn:   p.turn*(1+0.09*L), stab: p.stab+0.25*L }),
  nose:   p => L => ({ drag:   Math.max(0.3, p.drag*(1-0.07*L)) }),
  module: p => L => ({ rpMult: p.rpMult+0.06*L, rsMult: p.rsMult+0.08*L }),
  stage:  p => L => ({ thrust: p.thrust*(1+0.09*L), fuel: p.fuel*(1+0.12*L) }),
  sgun:   p => L => ({ dmg: p.dmg*(1+0.12*L), rate: p.rate*(1+0.05*L) }),
  missile:p => L => ({ dmg: p.dmg*(1+0.12*L), rate: p.rate*(1+0.05*L) })
};
function upStat(id, L){ const p = PARTS[id]; if(!p) return {}; return UPG[p.cat](p)(L); }

/* ---------------- derived stats ----------------------------------------- */
const G_ACC = 250;          // gravity px/s^2
const PX_PER_M = 4;         // world scale (px per metre)
/* any part id the catalogue no longer knows falls back to that rack's starter part */
const FALLBACK = { nose:'nose-basic', tank:'tank-small', engine:'eng-tiny', fins:'fin-basic',
                   weapon:'wpn-pulse', module:'mod-none', hull:'hull-alloy', missile:'msl-none' };
function partOf(id, cat){
  const p = PARTS[id];
  return (p && p.cat===cat) ? p : PARTS[FALLBACK[cat]];
}
function ensurePart(b, cat){        // repairs the build in place, returns a usable id
  if(!PARTS[b[cat]] || PARTS[b[cat]].cat !== cat) b[cat] = FALLBACK[cat];
  return b[cat];
}
function computeStats(b){
  const nose=partOf(b.nose,'nose'), tank=partOf(b.tank,'tank'), eng=partOf(b.engine,'engine'),
        fin=partOf(b.fins,'fins'), wpn=partOf(b.weapon,'weapon'),
        mod=partOf(b.module,'module'), hull=partOf(b.hull,'hull'),
        mis=partOf(b.missile,'missile');
  // apply Mk upgrade levels
  const se=upStat(ensurePart(b,'engine'),lvlOf(b.engine)), st=upStat(ensurePart(b,'tank'),lvlOf(b.tank)),
        sw=upStat(ensurePart(b,'weapon'),lvlOf(b.weapon)), sh=upStat(ensurePart(b,'hull'),lvlOf(b.hull)),
        sf=upStat(ensurePart(b,'fins'),lvlOf(b.fins)),     sn=upStat(ensurePart(b,'nose'),lvlOf(b.nose)),
        sm=upStat(ensurePart(b,'module'),lvlOf(b.module)),
        sk=upStat(ensurePart(b,'missile'),lvlOf(b.missile));
  const thrust = se.thrust, fuel = st.fuel, dmg = sw.dmg, rate = sw.rate,
        hp = sh.hp, shield = sh.shield, turn0 = sf.turn, drag0 = sn.drag,
        rpM = sm.rpMult, rsM = sm.rsMult;
  const mass = nose.mass+tank.mass+eng.mass+fin.mass+wpn.mass+mod.mass+hull.mass+mis.mass;
  const mDmg = sk.dmg===undefined ? mis.dmg : sk.dmg, mRate = sk.rate===undefined ? mis.rate : sk.rate;
  const accel = thrust / mass * 96;                     // px/s^2 (core only)
  const maxV = se.vmax * (1.6 - 0.6*drag0);             // px/s in thin air
  const twr = accel / G_ACC;
  const turn = turn0 * clamp(62/mass, 0.45, 1.45);
  const endurance = fuel / eng.burn;
  const dps = dmg * wpn.shots * rate;
  const wpnLive = Object.assign({}, wpn, { dmg, rate });
  const mslLive = Object.assign({}, mis, { dmg:mDmg, rate:mRate });
  return {
    mass, coreMass: mass, thrust, accel, twr, turn, fuel, burn: eng.burn, endurance,
    drag: drag0 * (1 + mass/260), maxV, hp, shield,
    dps, wpn: wpnLive, msl: mslLive, mslDps: (mDmg||0)*(mis.shots||0)*(mRate||0),
    rpMult: rpM, rsMult: rsM * (1 + nose.rsBonus),
    stab: sf.stab, R: 13 + (tank.vis.w||0)*1.6,
    lv: { engine:lvlOf(b.engine), tank:lvlOf(b.tank), weapon:lvlOf(b.weapon),
          hull:lvlOf(b.hull), fins:lvlOf(b.fins), nose:lvlOf(b.nose), module:lvlOf(b.module),
          missile:lvlOf(b.missile) }
  };
}
let STATS = computeStats(P.build);
function refreshStats(){ STATS = computeStats(P.build); }

/* ---- stage helpers ---- */
function stageSlots(){ return ['a','b'].map(sl=>P.stages[sl]).filter(id=>id && P.owned.includes(id)); }
function stageMass(id){
  const p=PARTS[id]; let m=p.mass;
  return m;
}
function slotGunMass(sl){ return (P.sguns[sl]||[]).reduce((a,g)=>a+(g?PARTS[g].mass:0),0); }
function launchMass(){
  let m = STATS.mass;
  ['a','b'].forEach(sl=>{ const id=P.stages[sl]; if(id&&P.owned.includes(id)) m += stageMass(id)+slotGunMass(sl); });
  return m;
}
function launchThrust(){
  const id = P.stages.a && P.owned.includes(P.stages.a) ? P.stages.a
           : (P.stages.b && P.owned.includes(P.stages.b) ? P.stages.b : null);
  if(id) return PARTS[id].thrust * (1+0.09*lvlOf(id));
  return STATS.thrust;
}
function launchTWR(){ return (launchThrust()/launchMass()*96)/G_ACC; }
function totalFuel(){
  let f = STATS.fuel;
  ['a','b'].forEach(sl=>{ const id=P.stages[sl]; if(id&&P.owned.includes(id)) f += PARTS[id].fuel*(1+0.12*lvlOf(id)); });
  return f;
}
function stageGunList(sl){
  const id = P.stages[sl]; if(!id) return [];
  const mounts = PARTS[id].mounts||0;
  return (P.sguns[sl]||[]).slice(0,mounts).filter(Boolean);
}

/* ---------------- audio -------------------------------------------------- */
const Snd = {
  ctx:null, master:null, thrustGain:null, thrustSrc:null, ok:true,
  init(){
    if(this.ctx || !this.ok) return;
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = P.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }catch(e){ this.ok=false; }
  },
  setMuted(m){ P.muted=m; save(); if(this.master) this.master.gain.value = m?0:0.5;
               document.getElementById('btn-mute').textContent = m?'🔇 Sound: OFF':'🔊 Sound: ON'; },
  tone(f, dur, type, vol, slideTo){
    if(!this.ctx || P.muted) return;
    const t=this.ctx.currentTime, o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type||'square'; o.frequency.setValueAtTime(f,t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30,slideTo), t+dur);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol||0.12, t+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+dur+0.03);
  },
  noise(dur, vol, freq, q){
    if(!this.ctx || P.muted) return;
    const t=this.ctx.currentTime, len=Math.max(1,Math.floor(this.ctx.sampleRate*dur));
    const buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
    const s=this.ctx.createBufferSource(); s.buffer=buf;
    const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=freq||900; f.Q.value=q||1;
    const g=this.ctx.createGain(); g.gain.value=vol||0.2;
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  shoot(){ this.tone(rnd(620,760), 0.07, 'square', 0.05, 180); },
  hit(){ this.noise(0.09, 0.16, 1600); },
  boom(big){ this.noise(big?0.6:0.3, big?0.4:0.22, big?420:800); this.tone(big?90:150, big?0.5:0.22,'sine',0.16,40); },
  coin(){ this.tone(880,0.07,'triangle',0.1); setTimeout(()=>this.tone(1320,0.1,'triangle',0.09),60); },
  sci(){ this.tone(520,0.09,'sine',0.1); setTimeout(()=>this.tone(780,0.14,'sine',0.09),80); },
  buy(){ [440,660,880].forEach((f,i)=>setTimeout(()=>this.tone(f,0.11,'triangle',0.11),i*70)); },
  deny(){ this.tone(180,0.16,'sawtooth',0.09,90); },
  thrustOn(){
    if(!this.ctx || this.thrustSrc) return;
    const len=this.ctx.sampleRate*2, buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    const s=this.ctx.createBufferSource(); s.buffer=buf; s.loop=true;
    const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=520;
    const g=this.ctx.createGain(); g.gain.value=0;
    s.connect(f); f.connect(g); g.connect(this.master); s.start();
    this.thrustSrc=s; this.thrustGain=g;
  },
  thrustLevel(v){ if(this.thrustGain) this.thrustGain.gain.value = clamp(v,0,1)*0.22; },
  thrustOff(){ if(this.thrustSrc){ try{this.thrustSrc.stop();}catch(e){} this.thrustSrc=null; this.thrustGain=null; } },
  countdown(n){ this.tone(n>0?440:880, n>0?0.16:0.5, 'square', 0.12); }
};
