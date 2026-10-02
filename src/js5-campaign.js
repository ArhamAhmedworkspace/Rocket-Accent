/* =========================================================================
   CAMPAIGN LAYER — 100 levels, gate bosses, new enemies, new parts,
   achievements & extra contracts. Loaded last; hooks the core by wrappers.
   ========================================================================= */

/* ---------------- extra contracts --------------------------------------- */
MISSIONS.push(
  { id:'m8',  name:'Gate Crasher',    desc:'Complete campaign level 5',              goal:{lvl:5},        rp:2500, rs:60  },
  { id:'m9',  name:'Mini Hunter',     desc:'Destroy 5 gate bosses (any levels)',     goal:{mini:5},       rp:1800, rs:45  },
  { id:'m10', name:'Decathlon',       desc:'Complete campaign level 10',             goal:{lvl:10},       rp:4000, rs:100 },
  { id:'m11', name:'Half Hundred',    desc:'Destroy 50 hostiles in one sortie',      goal:{kills:50},     rp:3000, rs:80  },
  { id:'m12', name:'Quarter Century', desc:'Complete campaign level 25',             goal:{lvl:25},       rp:9000, rs:220 }
);

/* ---------------- achievements ------------------------------------------ */
const ACH = [
  { id:'a_fly',   name:'Wheels Up',      desc:'Fly any sortie',            test:()=> (P.flights|0) >= 1 },
  { id:'a_k50',   name:'Fifty Down',     desc:'50 lifetime kills',         test:()=> (P.kills|0) >= 50 },
  { id:'a_k250',  name:'Sky Sweeper',    desc:'250 lifetime kills',        test:()=> (P.kills|0) >= 250 },
  { id:'a_l5',    name:'Gate Crasher',   desc:'Reach level 6',             test:()=> P.level > 5 },
  { id:'a_l10',   name:'Decathlete',     desc:'Reach level 11',            test:()=> P.level > 10 },
  { id:'a_l25',   name:'Veteran',         desc:'Reach level 26',            test:()=> P.level > 25 },
  { id:'a_l50',   name:'Halfway Hero',   desc:'Reach level 51',            test:()=> P.level > 50 },
  { id:'a_l100',  name:'Ascent Complete',desc:'Beat level 100',            test:()=> P.done.includes(100) },
  { id:'a_mini',  name:'Boss Breaker',   desc:'10 gate bosses down',       test:()=> (P.miniKills|0) >= 10 },
  { id:'a_coll',  name:'Collector',      desc:'Own 30 parts',              test:()=> P.owned.length >= 30 },
  { id:'a_rich',  name:'War Budget',     desc:'Earn 50,000 RP lifetime',   test:()=> (P.totalRP|0) >= 50000 },
  { id:'a_chute', name:'Feather Fall',   desc:'Land under a parachute',    test:()=> !!(run && run.chuteLanded) }
];
function checkAch(){
  let got = false;
  for(const a of ACH){
    if(P.ach.includes(a.id)) continue;
    let ok = false; try{ ok = a.test(); }catch(e){}
    if(ok){ P.ach.push(a.id); got = true;
      toast('🏅 <b>ACHIEVEMENT:</b> '+a.name+' — '+a.desc, 3600); Snd.buy(); }
  }
  if(got){ save(); if(typeof renderAchRow==='function') renderAchRow(); }
}

/* ---------------- level strip & achievement row (hangar) ---------------- */
function renderLevelStrip(){
  const el = document.getElementById('lvstrip'); if(!el) return;
  const now = document.getElementById('lv-now'); if(now) now.textContent = P.level;
  let h = '';
  for(let n=1;n<=100;n++){
    const done = P.done.includes(n), open = n <= P.level;
    h += '<button class="lvb'+(done?' done':open?' open':'')+(n%5===0||n===100?' b5':'')+'" data-lv="'+n+'"'+
         (open?'':' disabled')+'>'+ (done? n+'✓' : n) +'</button>';
  }
  el.innerHTML = h;
}
document.getElementById('lvstrip').addEventListener('click', e=>{
  const b = e.target.closest('[data-lv]'); if(!b || b.disabled) return;
  startLevel(+b.dataset.lv);
});
function renderAchRow(){
  const el = document.getElementById('achrow'); if(!el) return;
  el.innerHTML = ACH.map(a=>{
    const on = P.ach.includes(a.id);
    return '<span class="ach'+(on?'':' lock')+'" title="'+a.desc+'">'+(on?'🏅 ':'🔒 ')+a.name+'</span>';
  }).join('');
}
function startLevel(n){
  if(n > P.level || n < 1 || n > 100) return;
  closeLevelSel();
  pendingLevel = n;
  gotoBuild();
  document.getElementById('btn-launch').click();   // runs the normal TWR checks
}
function openLevelSel(){ renderLevelStrip(); document.getElementById('lvsel').classList.add('on'); Snd.tone(620,0.06,'triangle',0.06); }
function closeLevelSel(){ document.getElementById('lvsel').classList.remove('on'); }
document.getElementById('btn-levels').addEventListener('click', openLevelSel);
document.getElementById('lvsel-x').addEventListener('click', closeLevelSel);
document.getElementById('lvsel').addEventListener('click', e=>{ if(e.target.id==='lvsel') closeLevelSel(); });

/* ---------------- gate bosses (mini every level, huge every 5th, super @100) */
function gateAlt(lv){ return lv===100 ? 15 : Math.min(4200, 450 + lv*55); }
function spawnGate(lv){
  const s = 1 + lv*0.06, dsc = 1 + Math.min(50, lv)*0.02;
  const mk = (k, gg)=>{
    const b = { mini:{r:44,hp:300,rp:220,rs:55,dmg:22},
                huge:{r:88,hp:1400,rp:700,rs:200,dmg:40},
                super:{r:112,hp:9000,rp:8000,rs:1800,dmg:60} }[k];
    const p = spawnAhead(H*0.55, 80);
    const e = { type:'warden', gateKind:gg, x:p.x, y:p.y, vx:60, vy:0,
                r: Math.round(b.r * (lv<=20 ? 1.3 : 1)),        // levels 1-20: chunkier gate bosses
                hp:Math.round(b.hp*s), maxhp:Math.round(b.hp*s), rot:0, spin:0,
                t:0, fire:2.2, phase:0, rp:Math.round(b.rp*(1+lv*0.03)), rs:Math.round(b.rs*(1+lv*0.03)),
                dmg:Math.round(b.dmg*dsc), baseY:p.y };
    if(lv<=20){                                                 // levels 1-20: rockets + lasers
      e.rk = 1.8; e.rkCd = 3.4 - Math.min(1.3, lv*0.07); e.rkN = lv>=10?3:2;
      e.laser = 3.0; e.laserCd = 5.2 - Math.min(1.8, lv*0.09); e.beamMax = 1.0;
    }
    enemies.push(e); return e;
  };
  /* ---- levels 21-100: the trick. A bait boss dies, nothing happens… ---- */
  if(lv>=21){
    const decoy = mk('mini', 'mini');
    decoy.hp = decoy.maxhp = Math.round(decoy.hp*0.55);         // soft on purpose: it is bait
    decoy.trickDecoy = true;
    run.gate = decoy;
    run.trick = { lv, phase:1, left:0, mother:null };
    toast('⚠ <b>MINI BOSS</b> ON RADAR — level gate?', 3600);
    Snd.tone(90,1.0,'sawtooth',0.14,50);
    return;
  }
  /* ---- levels 1-20: straight fight, boss is bigger and shoots rockets/lasers */
  const kind = lv%5===0 ? 'huge' : 'mini';
  run.gate = mk(kind, kind);
  if(kind!=='mini') mk('mini', 'miniwarm');        // mini still shows on boss levels
  toast('⚠ <b>'+(kind==='huge'?'HUGE BOSS':'MINI BOSS')+'</b> ON RADAR — level gate!', 3600);
  Snd.tone(90,1.0,'sawtooth',0.14,50);
}

/* ---------------- the mothership trick (levels 21-100) --------------------- */
function startMothership(){
  if(!run || !run.trick || run.trick.phase!==1) return;
  run.trick.phase = 2;
  toast('…the wreck tumbles away. <b>Nothing happens.</b> …', 3200);
  setTimeout(()=>{
    if(!run || !run.trick || run.trick.phase!==2) return;
    if(mode!=='play' && mode!=='countdown') return;
    const lv = run.trick.lv;
    const s = 1 + lv*0.03, dsc = 1 + Math.min(50, lv)*0.02, fin = lv===100;
    const r = Math.round(100 + (lv-21)*1.35 + (fin?46:0));      // grows every level 21 → 100
    const p = spawnAhead(H*0.55, 120);
    const m = { type:'warden', gateKind:'mother', x:p.x, y:p.y, vx:60, vy:0, r:r,
                hp:Math.round(2600*s*(fin?2.2:1)), maxhp:Math.round(2600*s*(fin?2.2:1)),
                rot:0, spin:0, t:0, fire:1.6, phase:0,
                rp:Math.round(1400*(1+lv*0.05)), rs:Math.round(360*(1+lv*0.05)),
                dmg:Math.round((fin?70:38)*dsc), baseY:p.y,
                escortPhase:true, inv:true, p2:1.2 };
    enemies.push(m);
    run.gate = m; run.trick.mother = m; run.trick.phase = 3;
    run.trick.left = lv>=85 ? 4 : lv>=55 ? 3 : 2;                // waves of escorts
    toast('🛸 <b>MOTHERSHIP</b> ON RADAR — it is launching fighters!', 4200);
    Snd.tone(70,1.4,'sawtooth',0.16,40); shake=Math.max(shake,22); flash=0.5;
  }, 1400);
}
function spawnEscort(lv, i){
  const p = spawnAhead(H*0.5, 200 + i*95);
  const s = 1 + lv*0.03;
  enemies.push({ type:'warden', gateKind:'escort', x:p.x, y:p.y, vx:40, vy:0,
                 r:Math.round(30 + lv*0.15), hp:Math.round(320*s), maxhp:Math.round(320*s),
                 rot:0, spin:0, t:0, seed:i*1.7+rnd(0,6), fire:1+i*0.35, phase:0,
                 rp:Math.round(90*(1+lv*0.03)), rs:Math.round(18*(1+lv*0.03)),
                 dmg:Math.round(16*(1+Math.min(50,lv)*0.02)), baseY:p.y });
}
function motherWave(){
  const tr = run && run.trick; if(!tr || tr.phase!==3) return;
  if(enemies.some(e=>e.gateKind==='escort')) return;             // clear this wave first
  if(tr.left<=0){ engageMothership(); return; }
  const lv = tr.lv, n = 2 + Math.floor(lv/40);
  for(let i=0;i<n;i++) spawnEscort(lv, i);
  tr.left--;
  toast('🛸 Mothership launched <b>'+n+'</b> fighters — '+(tr.left?tr.left+' wave'+(tr.left===1?'':'s')+' to go':'last wave!'), 2600);
  Snd.tone(240,0.14,'square',0.06,200);
}
function engageMothership(){
  const tr = run && run.trick, m = tr && tr.mother;
  if(!m || !enemies.includes(m)) return;
  m.escortPhase = false; m.inv = false;
  m.rk = 1.0; m.rkCd = 3.0; m.rkN = 3;                           // rockets…
  m.laser = 2.4; m.laserCd = 4.4; m.beamMax = 1.0;               // …lasers…
  m.fire = 0.8;                                                  // …and blasters
  tr.phase = 4;
  toast('🔥 <b>THE MOTHERSHIP TURNS TO FACE YOU</b> — rockets, lasers, blasters!', 4200);
  Snd.tone(110,0.8,'sawtooth',0.14,50); shake=Math.max(shake,18);
}
setInterval(()=>{
  if(mode!=='play' || !run || !run.level || run.levelDone) return;
  const alt = altitudeOf(R.y), lv = run.level;
  if(!run.gate && alt > gateAlt(lv)) spawnGate(lv);
  if(lv===100){                                   // final level: wall of obstacles
    if(Math.random()<0.55) spawnWave(alt, Math.random()<0.4);
    if(run.gate && enemies.includes(run.gate) && Math.random()<0.30) spawnWave(alt, true);
  } else if(lv>=10 && Math.random() < 0.10 + lv*0.004){   // denser fields as levels climb
    spawnWave(alt, false);
  }
  // tier enemies join the mix as you climb
  if(lv>=4  && Math.random()<0.16) spawnMine(alt);
  if(lv>=8  && Math.random()<0.12) spawnGunner(alt);
}, 900);
function spawnMine(alt){
  const p = spawnAhead(H*0.6, 220);
  enemies.push({ type:'mine', x:p.x, y:p.y, vx:0, vy:0, r:16, hp:Math.round(26*(run.diff||1)), maxhp:Math.round(26*(run.diff||1)),
                 rot:0, t:0, rp:Math.round(28*(run.diff||1)), rs:6, dmg:Math.round(16*(1+(run.level||0)*0.02)) });
}
function spawnGunner(alt){
  const p = spawnAhead(H*0.62, 240);
  enemies.push({ type:'gunner', x:p.x, y:p.y, vx:0, vy:20, r:22, hp:Math.round(60*(run.diff||1)), maxhp:Math.round(60*(run.diff||1)),
                 t:0, fire:1.2, rp:Math.round(70*(run.diff||1)), rs:12, dmg:Math.round(12*(1+(run.level||0)*0.02)) });
}

/* ---------------- hooks: difficulty, achievements, chute landing --------- */
const _swBase = spawnWave;
spawnWave = function(alt, below){
  const before = enemies.length;
  _swBase(alt, below);
  const d = (run && run.diff) || 1;
  for(let i=before;i<enemies.length;i++){ enemies[i].hp*=d; enemies[i].maxhp*=d; }
};
const _keBase = killEnemy;
killEnemy = function(e){
  const bait = !!(e && e.trickDecoy);
  _keBase(e);
  if(bait) startMothership();          // the level is NOT over — the trick begins
  checkAch();
};
const _efBase = endFlight;
endFlight = function(reason){
  if(run && run.chute) run.chuteLanded = true;
  _efBase(reason); checkAch();
};
const _bpBase = buyPart;
buyPart = function(id){ _bpBase(id); checkAch(); };

/* ---------------- dev: unlock all levels --------------------------------- */
document.getElementById('dev-levels').addEventListener('click', ()=>{
  P.level = 100; save(); syncDevUI();
  toast(' <b>ALL 100 LEVELS UNLOCKED</b> — the ladder is yours');
});

/* ---------------- dev: reset all levels back to 1 ------------------------ */
const rlBtn = document.getElementById('dev-resetlevels');
let rlArmed = false, rlTimer = 0;
function rlDisarm(){
  rlArmed = false;
  if(rlTimer){ clearTimeout(rlTimer); rlTimer = 0; }
  if(rlBtn){ rlBtn.textContent = 'RESET'; rlBtn.classList.remove('on'); }
}
const _rdbBase = renderDevBox;
renderDevBox = function(){ _rdbBase(); rlDisarm(); };   // any repaint cancels a pending confirm
rlBtn.addEventListener('click', ()=>{
  if(!rlArmed){                                          // two-click guard: no accidental wipes
    rlArmed = true; rlBtn.textContent = 'SURE?'; rlBtn.classList.add('on');
    rlTimer = setTimeout(rlDisarm, 3000);
    toast('⚠ Click <b>RESET</b> again to wipe campaign progress back to level 1');
    return;
  }
  rlDisarm();
  P.level = 1; P.done = []; P.miniKills = 0;             // campaign progress only…
  pendingLevel = 0;                                      // …parts, points and records stay
  save(); renderDevBox(); syncDevUI();
  toast('↩ <b>LEVELS RESET</b> — back to level 1 (parts, points & records kept)');
});

/* ---------------- save hygiene -------------------------------------------- */
/* A save can reference parts this build no longer ships (renamed/removed).
   Repair it here — after the whole catalogue exists — then recompute stats. */
function sanitizeProfile(){
  let dirty = false;
  BUILD_CATS.forEach(c=>{
    const id = P.build[c.id];
    if(!PARTS[id] || PARTS[id].cat !== c.id){ P.build[c.id] = FALLBACK[c.id]; dirty = true; }
  });
  if(P.build.chute && !PARTS[P.build.chute]){ P.build.chute = null; dirty = true; }
  const own = (P.owned||[]).filter(id => PARTS[id]);
  if(own.length !== (P.owned||[]).length){ P.owned = own; dirty = true; }
  ['a','b'].forEach(sl=>{
    const id = P.stages[sl];
    if(id && (!PARTS[id] || PARTS[id].cat !== 'stage')){ P.stages[sl] = null; dirty = true; }
    P.sguns[sl] = ((P.sguns && P.sguns[sl]) || []).filter(g => PARTS[g] && PARTS[g].cat === 'sgun');
  });
  Object.keys(P.lvl || {}).forEach(id=>{ if(!PARTS[id]){ delete P.lvl[id]; dirty = true; } });
  Object.keys(P.ammo || {}).forEach(id=>{ if(!AMMO.some(a=>a.id===id)){ delete P.ammo[id]; dirty = true; } });
  BUILD_CATS.forEach(c=>{ if(!P.owned.includes(P.build[c.id])) P.owned.push(P.build[c.id]); });
  /* ship skins */
  if(!Array.isArray(P.skinsOwned) || !P.skinsOwned.length) P.skinsOwned = ['skin-dawn'];
  P.skinsOwned = P.skinsOwned.filter(id => (typeof SKINS!=='undefined') && SKINS.some(s=>s.id===id));
  if(!P.skinsOwned.includes('skin-dawn')) P.skinsOwned.push('skin-dawn');
  if(!P.skin || !P.skinsOwned.includes(P.skin)) P.skin = P.skinsOwned.includes('skin-dawn') ? 'skin-dawn' : P.skinsOwned[0];
  if(dirty) save();
  refreshStats();
}
sanitizeProfile();

/* initial paint */
if(typeof refreshAllUI === 'function') refreshAllUI();
renderLevelStrip(); renderAchRow();
