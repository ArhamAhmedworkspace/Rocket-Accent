
/* =========================================================================
   FLIGHT STATE
   ========================================================================= */
const GROUND_Y = 0;                 // world y of the ground plane (y grows downward)
let mode = 'title';                 // title | countdown | play | tutplay | dead
let R = null, cam = null, run = null;
let bullets=[], ebullets=[], enemies=[], pickups=[], parts=[], floats=[], stars=[], debris=[];
let spawnT=1.2, pickT=3, shake=0, flash=0, deathT=0, countT=0, bossSpawned=false;
let pendingLevel = 0;      // campaign level queued by the level strip / summary buttons
let tutStep=0, tutFlags={}, tutTimer=0;

const TUT_STEPS = [
  { id:'steer', text:'Steer with <span class="kbd">A</span> and <span class="kbd">D</span> — tilt left, then tilt right.',
    check:()=>tutFlags.left && tutFlags.right },
  { id:'climb', text:'Your engine burns automatically. Climb to <b>250 m</b>.',
    check:()=>run.maxAlt>=250 },
  { id:'shoot', text:'A target asteroid is inbound. Destroy it with <span class="kbd">SPACE</span>.',
    check:()=>tutFlags.kills>=1 },
  { id:'fuel', text:'Fuel is life. Fly over the <b>fuel canister</b> to collect it.',
    check:()=>tutFlags.fuel },
  { id:'done', text:'That is everything, Chief. Bank your bonus and build something faster.',
    check:()=>false }
];

function makeStars(){
  stars = [];
  for(let layer=0; layer<3; layer++){
    const arr=[];
    const n = 60 + layer*70;
    for(let i=0;i<n;i++) arr.push({x:Math.random(), y:Math.random(), s:(3-layer)*0.55+Math.random()*0.9,
                                   b:0.25+Math.random()*0.75, tw:Math.random()*TAU});
    stars.push(arr);
  }
}
function stackStages(){
  const stages = [];
  ['a','b'].forEach(sl=>{
    const id = P.stages[sl];
    if(id && P.owned.includes(id)){
      const p = PARTS[id], f = p.fuel*(1+0.12*lvlOf(id));
      stages.push({ slot:sl, id, fuel:f, max:f, attached:true,
        h: p.vis.pair ? p.vis.h*0.42 : p.vis.h,      // side boosters hang alongside, not below
        rw: 13 + p.vis.w*1.6, gm: slotGunMass(sl),
        guns: stageGunList(sl).map(g=>({ id:g, cd:rnd(0,0.25) })) });
    }
  });
  return stages;
}
function stackH(){ return R.L.H + R.stages.reduce((a,s)=>a+(s.attached?s.h:0),0); }
function flightMass(){ return STATS.mass + R.stages.reduce((a,s)=>a+(s.attached? stageMass(s.id)+s.gm :0),0); }
function refreshStack(){
  R.stagesH = R.stages.reduce((a,s)=>a+(s.attached?s.h:0),0);
  R.cr = Math.max(R.L.R, ...R.stages.filter(s=>s.attached).map(s=>s.rw), 1) + 4;
}
function newRun(tutorial){
  refreshStats();
  const L = layout(P.build);
  R = {
    x:0, y:0, vx:0, vy:0, angle:0, fuel:STATS.fuel, hp:STATS.hp, maxhp:STATS.hp,
    shield:0, maxshield:STATS.shield*7, cd:0, invuln:0, L:L, dead:false, hitFlash:0, thrust:0,
    thr:0.5,   // throttle 0..1 — starts at MEDIUM (1.0x thrust)
    engOn:true, // engine master switch — E toggles
    chute:false,
    stages: stackStages(), stagesH:0, cr:L.R+4, ignT:0
  };
  refreshStack();
  R.y = surfaceY(0) - stackH()/2;   // standing on the pad deck
  cam = { x:0, y:R.y, zoom:1 };
  run = {
    tutorial:!!tutorial, t:0, maxAlt:0, kills:0, rp:0, rs:0, fuelGot:0, dmgTaken:0,
    shots:0, hits:0, missions:[], bossKilled:0, over:false, reason:'', stagesDropped:0, dist:0,
    level:0, diff:1, gate:null, levelDone:false
  };
  bullets=[]; ebullets=[]; enemies=[]; pickups=[]; parts=[]; floats=[]; debris=[];
  spawnT=1.4; pickT=4; shake=0; flash=0; deathT=0; bossSpawned=false;
  tutStep=0; tutFlags={kills:0}; tutTimer=0;
  mode = 'countdown'; countT = 3.05;
  Snd.init(); Snd.thrustOn();
  run.level = (!tutorial && pendingLevel) ? Math.min(100, pendingLevel|0) : 0;
  pendingLevel = 0;
  run.diff = 1 + Math.max(0, run.level-1)*0.05;
  run.gate = null; run.levelDone = false; run.trick = null;
  if(run.level) setTimeout(()=>{ if(mode==='countdown'||mode==='play')
    toast('🚀 <b>LEVEL '+run.level+'</b> — destroy the gate boss to complete it'); }, 700);
  toast('THROTTLE <b>50%</b> — hold <span class="kbd">SHIFT</span> to push, <span class="kbd">CTRL</span> to ease off');
}
function altitudeOf(y){ return Math.max(0, (GROUND_Y - y) / PX_PER_M); }
function densityAt(alt){ return Math.exp(-alt/2600); }

/* ---------------- input ---------------- */
const keys = { left:false, right:false, fire:false, thrUp:false, thrDn:false };
const keyMap = {
  'KeyA':'left','ArrowLeft':'left','KeyD':'right','ArrowRight':'right',
  'Space':'fire','KeyJ':'fire','Enter':'fire',
  'ShiftLeft':'thrUp','ShiftRight':'thrUp','ControlLeft':'thrDn','ControlRight':'thrDn'
};
window.addEventListener('keydown', e=>{
  const tn = e.target && e.target.tagName;
  if(tn==='INPUT' || tn==='TEXTAREA') return;   // never hijack typing
  if(keyMap[e.code]){ keys[keyMap[e.code]] = true; e.preventDefault(); Snd.init(); }
  if(e.code==='KeyP' || e.code==='Escape'){ if(mode==='shop') gotoBuild(); else togglePause(); }
  if(e.code==='KeyM'){ Snd.setMuted(!P.muted); }
  if(e.code==='KeyE' && !e.repeat){ toggleEngine(); }
  if(e.code==='F1'){ e.preventDefault(); toggleDevPanel(); }
  if(e.code==='F11' || e.code==='KeyF'){ e.preventDefault(); toggleFullscreen(); }
});
window.addEventListener('keyup', e=>{ if(keyMap[e.code]){ keys[keyMap[e.code]] = false; e.preventDefault(); } });
window.addEventListener('blur', ()=>{ keys.left=keys.right=keys.fire=keys.thrUp=keys.thrDn=false; });
document.querySelectorAll('#touch .tbtn').forEach(b=>{
  const k = b.dataset.k;
  const on = e=>{ e.preventDefault(); keys[k]=true; Snd.init(); };
  const off = e=>{ e.preventDefault(); keys[k]=false; };
  b.addEventListener('touchstart',on,{passive:false}); b.addEventListener('touchend',off,{passive:false});
  b.addEventListener('touchcancel',off,{passive:false});
  b.addEventListener('mousedown',on); b.addEventListener('mouseup',off); b.addEventListener('mouseleave',off);
});
function toggleEngine(){
  if(!(mode==='play'||mode==='tutplay'||mode==='countdown') || !R) return;
  R.engOn = !R.engOn;
  toast(R.engOn? '🔥 <b>ENGINE LIT</b> — thrust restored' : '⏻ <b>ENGINE CUT</b> — coasting, press E to relight');
  Snd.tone(R.engOn? 520:240, 0.14, 'square', 0.07);
}
function togglePause(){
  if(mode==='play'||mode==='tutplay'){ mode='paused'; Snd.thrustLevel(0); show('pause'); }
  else if(mode==='paused'){ mode = run.tutorial?'tutplay':'play'; show('none'); }
}
function show(name){
  for(const k in SCR) SCR[k].classList.toggle('on', k===name);
  curScreen = name;
  document.getElementById('touch').classList.toggle('on', (mode==='play'||mode==='tutplay') && isTouch);
}

/* ---------------- spawning ---------------- */
function spawnAhead(dy, margin){
  const w = W/cam.zoom;
  return { x: cam.x + rnd(-w/2-60, w/2+60), y: cam.y - (dy===undefined? H*0.75 : dy) - rnd(0, margin||120) };
}
function spawnBelow(){
  const w = W/cam.zoom;
  return { x: cam.x + rnd(-w/2-60, w/2+60), y: cam.y + H*0.60/cam.zoom + rnd(0,200) };
}
function updateSpawner(dt){
  const alt = run.maxAlt;
  if(run.tutorial){
    tutTimer -= dt;
    if(tutStep===0 && !tutFlags.spawned0){ tutFlags.spawned0=true; }
    if(tutStep===2){
      let ta = enemies.find(e=>e.tut);
      if(!ta){ ta = makeAsteroid(R.x + rnd(-70,70), R.y - 520, 1.6, true); enemies.push(ta); }
      const gap = R.y - ta.y;                       // >0 = target is ahead (above)
      if(gap > 900 || gap < -140){ ta.y = R.y - 460; ta.x = R.x + rnd(-140,140); ta.vy = 0; }
      ta.vx *= 0.94;
    }
    if(tutStep===3){
      let fp = pickups.find(p=>p.kind==='fuel');
      if(!fp){ fp = makePickup(R.x + rnd(-60,60), R.y - 480, 'fuel'); pickups.push(fp); }
      const gap = R.y - fp.y;
      if(gap > 860 || gap < -120){ fp.y = R.y - 420; fp.x = R.x + rnd(-110,110); }
    }
    // keep the trainee topped up so they can never stall
    if(R.fuel < STATS.fuel*0.35) R.fuel = Math.min(STATS.fuel, R.fuel + STATS.fuel*0.25*dt);
    return;
  }
  spawnT -= dt;
  if(spawnT<=0){
    const pressure = clamp(0.35 + alt/5000, 0.35, 2.2);
    spawnT = rnd(0.6,1.3) / pressure;
    if(enemies.length < 24) spawnWave(alt, R.vy > 90 && Math.random()<0.75);
  }
  pickT -= dt;
  if(pickT<=0){ pickT = rnd(2.6,5.5); spawnPickup(); }
  // boss
  if(alt > 7000 && !bossSpawned){ bossSpawned = true; spawnBoss(); toast('⚠ <b>WARDEN</b> DETECTED ON RADAR'); Snd.tone(120,0.8,'sawtooth',0.14,60); }
}
function spawnWave(alt, below){
  const r = Math.random();
  const p = below ? spawnBelow() : spawnAhead(H*0.62, 260);
  if(alt < 900){
    if(r<0.8) enemies.push(makeAsteroid(p.x,p.y, rnd(0.7,1.7)));
    else enemies.push(makeDrone(p.x,p.y));
  } else if(alt < 4000){
    if(r<0.45) enemies.push(makeAsteroid(p.x,p.y, rnd(0.8,2.1)));
    else if(r<0.85) enemies.push(makeDrone(p.x,p.y));
    else enemies.push(makeSaucer(p.x,p.y));
  } else {
    if(r<0.3) enemies.push(makeAsteroid(p.x,p.y, rnd(1.0,2.6)));
    else if(r<0.62) enemies.push(makeDrone(p.x,p.y));
    else if(r<0.92) enemies.push(makeSaucer(p.x,p.y));
    else { const n=rndInt(2,3); for(let i=0;i<n;i++) enemies.push(makeAsteroid(p.x+rnd(-160,160),p.y+i*70, rnd(0.7,1.5))); }
  }
}
function makeAsteroid(x,y,s,tut){
  const verts=[], n=rndInt(7,11), rr0=18*s;
  for(let i=0;i<n;i++){ const a=i/n*TAU; verts.push({a, r: rr0*rnd(0.72,1.22)}); }
  return { type:'rock', x, y, vx:rnd(-46,46), vy:rnd(-18,38), r:rr0, hp:Math.round(14*s*s+8),
           maxhp:Math.round(14*s*s+8), rot:rnd(TAU), spin:rnd(-1.4,1.4), verts, size:s, tut:!!tut,
           rp:Math.round(4+7*s), rs:0, dmg:Math.round(9+11*s), seed:Math.random() };
}
function makeDrone(x,y){
  return { type:'drone', x, y, vx:0, vy:0, r:17, hp:34, maxhp:34, rot:0, spin:0, t:rnd(10),
           fire:rnd(1,2.4), rp:12, rs:2, dmg:14 };
}
function makeSaucer(x,y){
  return { type:'saucer', x, y, vx:rnd(-90,90), vy:rnd(10,40), r:26, hp:70, maxhp:70, rot:0, spin:0,
           t:rnd(10), fire:rnd(1.4,2.6), rp:24, rs:6, dmg:18, baseY:y };
}
function spawnBoss(){
  const p = spawnAhead(H*0.5, 60);
  enemies.push({ type:'warden', x:p.x, y:p.y, vx:60, vy:0, r:74, hp:950, maxhp:950, rot:0, spin:0,
                 t:0, fire:2.0, phase:0, rp:520, rs:160, dmg:38, baseY:p.y });
}
function spawnPickup(){
  const p = spawnAhead(H*0.6, 200);
  const alt = run.maxAlt;
  const r = Math.random();
  let type = 'rp';
  if(r<0.30) type='fuel';
  else if(r<0.46) type='repair';
  else if(r<0.60) type='rs';
  else if(r<0.85) type='rp';
  else type='rp';
  pickups.push(makePickup(p.x,p.y,type,alt));
}
function makePickup(x,y,type,alt){
  return { type:'pickup', kind:type, x, y, vx:rnd(-14,14), vy:rnd(6,26), r:14, t:rnd(9),
           value: type==='rp' ? Math.round(rnd(14,30)*(1+(alt||0)/6000))
                : type==='rs' ? Math.round(rnd(4,9)*(1+(alt||0)/9000)) : 0 };
}

/* ---------------- combat helpers ---------------- */
function local2world(lx, ly){
  const c = Math.cos(R.angle), s = Math.sin(R.angle);
  return { x: R.x + lx*c - ly*s, y: R.y + lx*s + ly*c };
}
function fireStageGun(stg, g, am, idx){
  const w = PARTS[g.id];
  const ly = R.L.H/2 + 10 + idx*0;              // shoulder of this stage
  const side = (idx%2===0)?-1:1;
  const o = local2world(side*(stg.rw+4), ly);
  const shots = w.shots + am.shots;
  for(let i=0;i<shots;i++){
    const sd = shots===1?0:(i-(shots-1)/2);
    const a = R.angle + side*0.10 + sd*(w.spread+0.03) + rnd(-0.02,0.02);
    bullets.push({
      x:o.x, y:o.y,
      vx: Math.sin(a)*w.bspd*am.spd + R.vx*0.35, vy: -Math.cos(a)*w.bspd*am.spd + R.vy*0.35,
      r: w.splash||am.splash ? 5.4 : 3.2, dmg: w.dmg*am.dmg, life:1.3,
      pierce:(w.pierce||0)+am.pierce, splash: Math.max(w.splash||0, am.splash),
      seek: am.seek, col: w.vis.shot, hits:[], stage:true
    });
  }
}
function playerShoot(){
  const am = ammoMods();
  const w = STATS.wpn, L = R.L;
  R.cd = 1/(w.rate*am.rate);
  run.shots++;
  const dirx = Math.sin(R.angle), diry = -Math.cos(R.angle);
  const muzzle = stackH()/2 + 6;
  const shots = w.shots + am.shots;
  for(let i=0;i<shots;i++){
    const side = shots===1 ? 0 : (i-(shots-1)/2);
    const a = R.angle + side*(w.spread+0.03) + rnd(-0.012,0.012);
    const ox = Math.cos(R.angle)*side*(L.R*0.85+3), oy = Math.sin(R.angle)*side*(L.R*0.85+3);
    bullets.push({
      x: R.x + dirx*muzzle + ox, y: R.y + diry*muzzle + oy,
      vx: Math.sin(a)*w.bspd*am.spd + R.vx*0.35, vy: -Math.cos(a)*w.bspd*am.spd + R.vy*0.35,
      r: (w.splash||am.splash)?6:3.6, dmg:w.dmg*am.dmg, life:1.35,
      pierce:(w.pierce||0)+am.pierce, splash: Math.max(w.splash||0, am.splash),
      seek: am.seek, col: PARTS[P.build.weapon].vis.shot, hits:[]
    });
  }
  /* missile rack: separate launcher, own cooldown, seekers home in */
  const mz = STATS.msl;
  if(mz && mz.dmg > 0 && mz.len !== undefined ? true : (mz && mz.dmg>0)){
    if((R.mcd||0) <= 0){
      R.mcd = 1/(mz.rate*am.rate);
      const n = (mz.shots||1) + am.shots;
      for(let i=0;i<n;i++){
        const side = n===1 ? 0 : (i-(n-1)/2);
        const a = R.angle + side*((mz.spread||0)+0.06) + rnd(-0.03,0.03);
        const off = (i%2? 7 : -7) + side*3;
        const ox = Math.cos(R.angle)*(off), oy = Math.sin(R.angle)*(off);
        bullets.push({
          x: R.x + dirx*muzzle*0.55 + ox, y: R.y + diry*muzzle*0.55 + oy,
          vx: Math.sin(a)*mz.bspd*am.spd + R.vx*0.3, vy: -Math.cos(a)*mz.bspd*am.spd + R.vy*0.3,
          r: 7, dmg: mz.dmg*am.dmg, life: 3.4,
          pierce: (mz.pierce||0)+am.pierce, splash: Math.max(mz.splash||0, am.splash),
          seek: (mz.seek||0) + (am.seek||0), col: (PARTS[P.build.missile] && PARTS[P.build.missile].vis.shot) || '#ffb03a',
          hits: [], msl: true
        });
      }
      run.shots++;
    }
  }

  /* stage guns join the volley */
  let gi = 0;
  for(const stg of R.stages){
    if(!stg.attached) continue;
    for(const g of stg.guns){
      if(g.cd<=0){ g.cd = 1/(PARTS[g.id].rate*am.rate); fireStageGun(stg, g, am, gi); }
      gi++;
    }
  }
  Snd.shoot();
  shake = Math.max(shake, (w.splash||am.splash)?4:1.6);
  for(let i=0;i<4;i++) parts.push({x:R.x+dirx*muzzle, y:R.y+diry*muzzle, vx:dirx*rnd(60,220)+rnd(-40,40),
    vy:diry*rnd(60,220)+rnd(-40,40), life:0.18, max:0.18, r:rnd(1.5,3.4), col:'#fff2c0', g:0});
}
function damageEnemy(e, dmg, bx, by){
  if(e.inv){ e.flash=0.12; return; }                 // shields up — no damage yet
  e.hp -= dmg; run.hits++;
  e.flash = 0.12;
  for(let i=0;i<4;i++) parts.push({x:bx,y:by,vx:rnd(-140,140),vy:rnd(-140,140),life:0.28,max:0.28,r:rnd(1,2.6),col:'#ffd27a',g:0});
  if(e.hp<=0) killEnemy(e);
  else Snd.hit();
}
function killEnemy(e){
  const idx = enemies.indexOf(e); if(idx>=0) enemies.splice(idx,1);
  run.kills++;
  if(e.gateKind){
    P.miniKills = (P.miniKills|0) + 1;
    if(e === run.gate && run.level && !run.levelDone && !e.trickDecoy){
      run.levelDone = true;
      const lv = run.level, k = e.gateKind;
      if(!P.done.includes(lv)) P.done.push(lv);
      P.level = Math.max(P.level, Math.min(100, lv+1));
      const rm = k==='mother'? (lv===100?12:4) : k==='super'?10 : k==='huge'?3 : 1;
      P.rp += Math.round(220*lv*rm); P.rs += Math.round(22*lv*rm);
      save();
      toast('🏁 <b>LEVEL '+lv+' COMPLETE!</b>  +'+Math.round(220*lv*rm)+' RP  +'+Math.round(22*lv*rm)+' RS', 4200);
      setTimeout(()=>{ if(mode==='play'||mode==='countdown') endFlight('LEVEL '+lv+' COMPLETE'); }, 1100);
    }
  }
  const big = e.type==='warden';
  explode(e.x, e.y, e.r*(big?2.2:1.3), big);
  Snd.boom(big);
  shake = Math.max(shake, big?26:(e.type==='saucer'?8:5));
  const rp = Math.round(e.rp * STATS.rpMult), rs = Math.round(e.rs * STATS.rsMult);
  run.rp += rp; run.rs += rs;
  if(rp) addFloat(e.x, e.y-10, '+'+rp+' RP', '#ffb03a');
  if(rs) addFloat(e.x, e.y+8, '+'+rs+' RS', '#c07bff');
  if(big){ run.bossKilled = 1; addFloat(e.x, e.y-34, 'WARDEN DOWN', '#ff6a6a'); flash=0.6; }
  // drops
  if(e.tut){ if(run.tutorial) tutFlags.kills++; return; }
  if(run.tutorial) tutFlags.kills++;
  const dr = Math.random();
  if(dr < 0.16) pickups.push(makePickup(e.x,e.y,'fuel'));
  else if(dr < 0.26) pickups.push(makePickup(e.x,e.y,'repair'));
  else if(dr < 0.42) pickups.push(makePickup(e.x,e.y,'rp'));
  else if(dr < 0.50) pickups.push(makePickup(e.x,e.y,'rs'));
}
function separateStage(stg){
  stg.attached = false;
  refreshStack();
  const off = stackH()/2 - 4;
  debris.push({ x: R.x - Math.sin(R.angle)*off, y: R.y + Math.cos(R.angle)*off,
    vx: R.vx*0.35 + rnd(-50,50), vy: R.vy*0.25 + rnd(70,150),
    rot: R.angle, spin: rnd(-2.4,2.4), id: stg.id, life: 2.6, max: 2.6,
    guns: stg.guns.map(g=>g.id) });
  R.ignT = 0.4;
  run.stagesDropped = (run.stagesDropped||0)+1;
  shake = Math.max(shake, 8); flash = Math.max(flash, 0.15);
  Snd.noise(0.34, 0.3, 620); Snd.tone(210, 0.3, 'square', 0.1, 70);
  addFloat(R.x, R.y + 34, PARTS[stg.id].name.toUpperCase()+' AWAY', '#9fb3d9');
  toast('▂▃ <b>STAGE SEPARATION</b> — '+PARTS[stg.id].name+' jettisoned', 2400);
  for(let i=0;i<26;i++){ const a2=rnd(TAU);
    parts.push({x:R.x-Math.sin(R.angle)*off, y:R.y+Math.cos(R.angle)*off,
      vx:Math.cos(a2)*rnd(60,260), vy:Math.sin(a2)*rnd(60,260)+60,
      life:rnd(0.3,0.8), max:0.8, r:rnd(2,5), col:pick(['#fff3c4','#ffb03a','#9fb4d8']), g:80}); }
}
function addFloat(x,y,text,col){ floats.push({x,y,text,col,life:1.25,max:1.25}); }
function explode(x,y,r,big){
  const n = big?90:Math.round(14+r*1.1);
  for(let i=0;i<n;i++){
    const a=rnd(TAU), sp=rnd(40, big?520:300);
    parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rnd(0.35,big?1.3:0.8),max:1,
      r:rnd(1.5,big?6:4), col: pick(['#fff3c4','#ffb03a','#ff6a2a','#ff3d3d','#9fb4d8']), g:60});
  }
  parts.push({x,y,vx:0,vy:0,life:0.32,max:0.32,r:r*(big?3:1.8),col:'flash',g:0});
  for(let i=0;i<(big?16:5);i++){
    const a=rnd(TAU), sp=rnd(20,90);
    parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rnd(0.8,1.8),max:1.8,r:rnd(6,16),col:'smoke',g:-10});
  }
}
function damageRocket(dmg, sx, sy){
  if(P.dev && P.dev.nodmg) return;   // dev console: no damage
  if(R.invuln>0 || R.dead) return;
  if(run.tutorial){ // training wheels: no damage, just feedback
    addFloat(R.x, R.y-30, 'SHIELDED (training)', '#7fd4ff');
    R.invuln = 0.5; shake=Math.max(shake,5); Snd.hit(); return;
  }
  let d = dmg;
  if(R.shield>0){ const a=Math.min(R.shield,d); R.shield-=a; d-=a; }
  R.hp -= d; R.invuln = 0.55; R.hitFlash = 1; run.dmgTaken += dmg;
  shake = Math.max(shake, 6+dmg*0.15); flash = Math.max(flash, 0.25);
  Snd.noise(0.16,0.25,700);
  addFloat(sx||R.x, (sy||R.y)-20, '-'+Math.round(dmg), '#ff5f6d');
  if(R.hp<=0){ R.hp=0; killRocket('HULL BREACH — VEHICLE LOST'); }
}
function killRocket(reason){
  if(R.dead) return;
  R.dead = true; run.over = true; run.reason = reason;
  explode(R.x, R.y, 40, true); Snd.boom(true); shake = 30; flash = 0.8;
  Snd.thrustOff(); mode='dead'; deathT=1.5;
}

/* ---------------- main update --------------- */
function updateFlight(dt){
  run.t += dt;
  const alt = altitudeOf(R.y);
  run.maxAlt = Math.max(run.maxAlt, alt);
  const dens = densityAt(alt);

  if(!R.dead){
    /* steering */
    const inp = (keys.right?1:0) - (keys.left?1:0);
    /* throttle trim — hold SHIFT to push up, CTRL to ease off */
    if(keys.thrUp) R.thr = Math.min(1, R.thr + dt*0.65);
    if(keys.thrDn) R.thr = Math.max(0, R.thr - dt*0.65);
    const thrM = 0.5 + R.thr;      // 0.5x .. 1.5x thrust; medium (50%) = 1.0x
    if(inp<0) R.angle -= STATS.turn*dt;
    if(inp>0) R.angle += STATS.turn*dt;
    if(run.tutorial){ if(inp<0 && R.angle<-0.22) tutFlags.left=true; if(inp>0 && R.angle>0.22) tutFlags.right=true; }
    // passive stability: gently self-levels in atmosphere
    if(inp===0) R.angle -= R.angle * clamp(STATS.stab*0.55*dt*dens,0,0.4);
    R.angle = clamp(R.angle, -1.38, 1.38);

    /* thrust — lowest attached stage burns first, then separates */
    let burning = false;
    if(R.ignT>0){ R.ignT -= dt; }
    else if(R.engOn){
      const stg = R.stages.find(s=>s.attached);
      if(stg && stg.fuel>0){
        burning = true;
        const p = PARTS[stg.id];
        const thrust = p.thrust*(1+0.09*lvlOf(stg.id));
        if(P.dev && P.dev.fuel){ stg.fuel = stg.max; } else stg.fuel = Math.max(0, stg.fuel - p.burn*thrM*dt);
        const a = thrust/flightMass()*96*thrM;
        R.vx += Math.sin(R.angle)*a*dt; R.vy -= Math.cos(R.angle)*a*dt;
        if(stg.fuel<=0) separateStage(stg);
      } else if(!stg && R.fuel>0){
        burning = true;
        if(P.dev && P.dev.fuel){ R.fuel = STATS.fuel; } else R.fuel = Math.max(0, R.fuel - STATS.burn*thrM*dt);
        const a = STATS.thrust/flightMass()*96*thrM;
        R.vx += Math.sin(R.angle)*a*dt; R.vy -= Math.cos(R.angle)*a*dt;
        if(R.fuel<=0){ toast('⚠ TANKS DRY — collect fuel or ride it down'); Snd.tone(300,0.4,'sawtooth',0.1,90); }
      }
    }
    /* stage gun cooldowns */
    for(const stg of R.stages) if(stg.attached) for(const g of stg.guns) g.cd -= dt;
    R.thrust = burning? thrM : 0;
    /* parachute — auto-deploys the moment every tank runs dry */
    const dry = R.fuel<=0 && !R.stages.some(s=>s.attached && s.fuel>0);
    if(dry && !R.chute && P.build.chute && P.owned.includes(P.build.chute)){
      R.chute = P.build.chute;
      toast('🪂 <b>'+PARTS[R.chute].name.toUpperCase()+'</b> DEPLOYED — riding it down');
      Snd.tone(660,0.25,'sine',0.08);
    }
    if(R.chute && R.vy>0){
      const lim = PARTS[R.chute].limit;
      if(R.vy > lim) R.vy -= (R.vy-lim)*Math.min(1, dt*3);
      R.vy = Math.min(R.vy, lim + 30);
      R.vx *= (1 - Math.min(1, dt*1.2));
    }
    Snd.thrustLevel(burning? (0.55+0.45*Math.min(1,Math.hypot(R.vx,R.vy)/900))*(0.6+0.8*R.thr) : 0);

    /* gravity + drag */
    R.vy += G_ACC*dt;
    let sp = Math.hypot(R.vx,R.vy);
    if(sp>1){
      const decel = Math.min(sp/dt*0.9, STATS.drag*0.0022*dens*sp);
      R.vx -= R.vx/sp*decel*dt; R.vy -= R.vy/sp*decel*dt;
    }
    const vmax = STATS.maxV * (1 + 0.35*(1-dens));
    sp = Math.hypot(R.vx,R.vy);
    if(sp > vmax){ const k = 1 - Math.min(0.5, (sp-vmax)/sp*dt*3.5); R.vx*=k; R.vy*=k; }
    R.x += R.vx*dt; R.y += R.vy*dt;
    run.dist += Math.hypot(R.vx,R.vy)*dt/4;
    if(R.x < -2400){ R.x=-2400; R.vx=Math.abs(R.vx)*0.4; }
    if(R.x > 2400){ R.x=2400; R.vx=-Math.abs(R.vx)*0.4; }

    /* ground contact */
    const rest = surfaceY(R.x) - stackH()/2 - 2;
    if(R.y > rest && R.vy > 0){
      const impact = R.vy;
      R.y = rest;
      if(impact > 380 && alt < 70){
        damageRocket(Math.round(20+(impact-380)*0.45), R.x, R.y);
        explode(R.x, R.y+R.L.H/2, 24, false);
        R.vx*=0.3; R.vy = -impact*0.18;
        if(R.hp>0){ R.vy = Math.min(R.vy, -30); }
      } else {
        R.vy = 0; R.vx *= 0.6;
        if(alt<70 && impact<=380 && run.maxAlt>120 && !run.tutorial){
          // safe landing after a real flight = recovery bonus
          endFlight('TOUCHDOWN — VEHICLE RECOVERED');
          return;
        }
      }
    }

    /* exhaust particles */
    if(burning){
      const hh = stackH()/2;
      const bx = R.x - Math.sin(R.angle)*hh, by = R.y + Math.cos(R.angle)*hh;
      for(let i=0;i<3;i++){
        parts.push({x:bx+rnd(-4,4), y:by+rnd(-3,3),
        vx:-Math.sin(R.angle)*rnd(90,260)*thrM+rnd(-45,45)+R.vx*0.25,
        vy:Math.cos(R.angle)*rnd(90,260)*thrM+rnd(-45,45)+R.vy*0.25,
          life:rnd(0.18,0.45), max:0.45, r:rnd(2,6), col:'exhaust', g:0});
      }
      if(dens>0.25 && Math.random()<0.5)
        parts.push({x:bx,y:by,vx:rnd(-30,30),vy:rnd(20,80),life:rnd(0.6,1.4),max:1.4,r:rnd(7,15),col:'smoke',g:-6});
    }

    /* shooting */
    R.cd -= dt;
    if(R.mcd>0) R.mcd -= dt;
    if(keys.fire && R.cd<=0) playerShoot();
    R.invuln = Math.max(0, R.invuln-dt);
    R.hitFlash = Math.max(0, R.hitFlash - dt*3.4);
    if(STATS.shield>0) R.shield = Math.min(R.maxshield, R.shield + STATS.shield*dt);
  }

  /* camera */
  const targetZoom = clamp(1.05 - Math.hypot(R.vx,R.vy)/3200, 0.76, 1.05);
  cam.zoom = lerp(cam.zoom, targetZoom, dt*1.6);
  cam.x = lerp(cam.x, R.x, dt*5.5);
  const wantY = R.y - (H*0.16)/cam.zoom + (R.dead?0:0);
  cam.y = lerp(cam.y, wantY, dt*4.2);

  updateSpawner(dt);
  updateDebris(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updatePickups(dt);
  updateParticles(dt);

  /* rocket vs enemies */
  if(!R.dead){
    const cr = R.cr;
    for(let i=enemies.length-1;i>=0;i--){
      const e = enemies[i];
      const dx=e.x-R.x, dy=e.y-R.y;
      if(dx*dx+dy*dy < (e.r+cr)*(e.r+cr)){
        if(run.tutorial){
          damageEnemy(e, 999, e.x, e.y);
        } else {
          damageRocket(e.dmg, R.x, R.y);
          if(e.type!=='warden') damageEnemy(e, e.type==='rock'?9999:60, e.x, e.y);
          R.vx += -dx*2.2; R.vy += -dy*2.2;
        }
      }
    }
    for(let i=ebullets.length-1;i>=0;i--){
      const b = ebullets[i];
      const dx=b.x-R.x, dy=b.y-R.y;
      if(dx*dx+dy*dy < (b.r+cr)*(b.r+cr)){
        ebullets.splice(i,1);
        damageRocket(b.dmg, b.x, b.y);
      }
    }
  }

  /* tutorial progression */
  if(run.tutorial && tutStep < TUT_STEPS.length){
    if(TUT_STEPS[tutStep].check()){
      tutStep++; Snd.coin();
      if(tutStep>=TUT_STEPS.length){ completeTutorial(); }
    }
  }
  /* mission checks (live) */
  checkMissions();

  shake = Math.max(0, shake - dt*shake*6 - dt*4);
  flash = Math.max(0, flash - dt*2.2);
  if(toastT>0){ toastT-=dt; if(toastT<=0) document.getElementById('toast').classList.remove('on'); }

  if(mode==='dead'){
    deathT -= dt;
    if(deathT<=0) endFlight(run.reason);
  }
  if(tutDoneT>0){ tutDoneT-=dt; if(tutDoneT<=0) endFlight('FLIGHT SCHOOL COMPLETE'); }
}
function updateBullets(dt){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    if(b.seek){
      let best=null, bd=420*420;
      for(const e of enemies){ const dx=e.x-b.x, dy=e.y-b.y, d=dx*dx+dy*dy; if(d<bd){bd=d;best=e;} }
      if(best){
        const want=Math.atan2(best.y-b.y, best.x-b.x), cur=Math.atan2(b.vy,b.vx);
        let da=want-cur; while(da>Math.PI)da-=TAU; while(da<-Math.PI)da+=TAU;
        const na=cur+clamp(da, -3.4*dt, 3.4*dt), sp=Math.hypot(b.vx,b.vy);
        b.vx=Math.cos(na)*sp; b.vy=Math.sin(na)*sp;
      }
    }
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    if(b.life<=0){ if(b.splash) splashDamage(b); bullets.splice(i,1); continue; }
    if(Math.abs(b.x-cam.x)>W/cam.zoom+300 || Math.abs(b.y-cam.y)>H/cam.zoom+300){ bullets.splice(i,1); continue; }
    let hit=false;
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];
      if(b.hits && b.hits.includes(e)) continue;
      const dx=e.x-b.x, dy=e.y-b.y;
      if(dx*dx+dy*dy < (e.r+b.r)*(e.r+b.r)){
        if(b.splash){ splashDamage(b); hit=true; break; }
        damageEnemy(e, b.dmg, b.x, b.y);
        if(b.pierce>0){ b.pierce--; b.dmg*=0.78; (b.hits=b.hits||[]).push(e); }
        else { hit=true; }
        break;
      }
    }
    if(hit) bullets.splice(i,1);
  }
  for(let i=ebullets.length-1;i>=0;i--){
    const b=ebullets[i];
    if(b.homing && R && !R.dead){                       // guided rockets curve after you
      const want=Math.atan2(R.y-b.y, R.x-b.x), cur=Math.atan2(b.vy,b.vx);
      let d=want-cur; while(d>Math.PI)d-=TAU; while(d<-Math.PI)d+=TAU;
      const sp=Math.hypot(b.vx,b.vy), na=cur+Math.min(b.homing*dt, Math.abs(d))*Math.sign(d);
      b.vx=Math.cos(na)*sp; b.vy=Math.sin(na)*sp;
      b.smk=(b.smk||0)-dt;
      if(b.smk<=0){ b.smk=0.04; parts.push({x:b.x,y:b.y,vx:rnd(-20,20),vy:rnd(-20,20),life:0.4,max:0.4,r:2.6,col:'#ff9a3c',g:0}); }
    }
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    if(b.life<=0 || Math.abs(b.x-cam.x)>W/cam.zoom+400 || Math.abs(b.y-cam.y)>H/cam.zoom+400) ebullets.splice(i,1);
  }
}
function splashDamage(b){
  explode(b.x,b.y,18,false); Snd.boom(false); shake=Math.max(shake,7);
  for(let j=enemies.length-1;j>=0;j--){
    const e=enemies[j], dx=e.x-b.x, dy=e.y-b.y, d=Math.hypot(dx,dy);
    if(d < b.splash + e.r) damageEnemy(e, b.dmg*clamp(1-d/(b.splash+e.r),0.35,1), b.x, b.y);
  }
  const idx=bullets.indexOf(b); if(idx>=0) bullets.splice(idx,1);
}
function updateEnemies(dt){
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    e.flash = Math.max(0,(e.flash||0)-dt);
    e.t = (e.t||0)+dt;
    if(e.type==='mine'){                       // homing mine (lvl 4+): hunts you down
      const dx=R.x-e.x, dy=R.y-e.y, dl=Math.hypot(dx,dy)||1;
      e.vx += (dx/dl)*300*dt; e.vy += (dy/dl)*300*dt;
      const sp=Math.hypot(e.vx,e.vy); if(sp>200){ e.vx*=200/sp; e.vy*=200/sp; }
      e.x+=e.vx*dt; e.y+=e.vy*dt; e.rot+=dt*5;
      if(dl < e.r + R.cr){ damageRocket(e.dmg, e.x, e.y); killEnemy(e); }
      continue;
    }
    if(e.type==='gunner'){                     // gunner (lvl 8+): strafe + 3-shot bursts
      e.x += Math.sin(e.t*1.8)*110*dt; e.y += e.vy*dt + (R.y-e.y)*0.10*dt;
      e.fire -= dt;
      if(e.fire<=0 && Math.abs(e.y-R.y)<H*0.9){
        e.fire = 2.1;
        for(let k=-1;k<=1;k++)
          ebullets.push({x:e.x+k*8, y:e.y+e.r*0.6, vx:k*130, vy:430*Math.min(2.2,(run.diff||1)), r:4.5, dmg:e.dmg, life:3.6, col:'#7af0ff'});
        Snd.tone(300,0.07,'sawtooth',0.05,140);
      }
      continue;
    }
    if(e.type==='rock'){
      e.x+=e.vx*dt; e.y+=e.vy*dt; e.rot+=e.spin*dt;
      // gentle drift toward the player's column
      e.vx += clamp((R.x-e.x)*0.018, -13, 13)*dt;   // lazy drift toward the flight path
    } else if(e.type==='drone'){
      const dx=R.x-e.x, dy=R.y-e.y, d=Math.hypot(dx,dy)||1;
      const want = 190;
      const sp = 130;
      e.vx = lerp(e.vx, dx/d*sp*(d>want?1:-0.6), dt*2.2);
      e.vy = lerp(e.vy, dy/d*sp*(d>want?1:-0.6) + 22, dt*2.2);
      e.x+=e.vx*dt; e.y+=e.vy*dt; e.rot = Math.atan2(dy,dx)+Math.PI/2;
      e.fire-=dt;
      if(e.fire<=0 && d<760 && !run.tutorial){
        e.fire = rnd(1.5,2.6);
        const a=Math.atan2(R.y-e.y,R.x-e.x);
        ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*250,vy:Math.sin(a)*250,r:4,dmg:9,life:3.4,col:'#ff7a7a'});
        Snd.tone(220,0.08,'sawtooth',0.05,120);
      }
    } else if(e.type==='saucer'){
      e.vx = Math.sin(e.t*0.7)*130; e.vy = Math.cos(e.t*0.45)*46 + 14;
      e.x+=e.vx*dt; e.y+=e.vy*dt; e.rot = Math.sin(e.t*0.9)*0.2;
      e.fire-=dt;
      if(e.fire<=0 && Math.abs(e.x-R.x)<620 && !run.tutorial){
        e.fire = rnd(2.0,3.0);
        const base=Math.atan2(R.y-e.y,R.x-e.x);
        for(let k=-1;k<=1;k++){
          const a=base+k*0.22;
          ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*290,vy:Math.sin(a)*290,r:4.5,dmg:11,life:3.2,col:'#b6ff6a'});
        }
        Snd.tone(300,0.1,'square',0.05,180);
      }
    } else if(e.type==='warden'){
      const k = e.gateKind || 'warden';
      if(k==='escort'){                       /* ESCORT — darts in, 3-shot bursts */
        e.x = lerp(e.x, R.x + Math.sin(e.t*1.1 + (e.seed||0))*270, dt*1.6);
        const ty = R.y - 210 - ((e.seed|0)%3)*80;
        if(e.y - ty > 1400) e.y = ty + 800;
        e.y = lerp(e.y, ty, dt*2.2);
        e.rot = Math.sin(e.t*3)*0.28;
        e.fire -= dt;
        if(e.fire<=0){
          e.fire = 1.7;
          const base=Math.atan2(R.y-e.y, R.x-e.x);
          for(let q=0;q<3;q++){ const a=base+(q-1)*0.18;
            ebullets.push({x:e.x, y:e.y+e.r*0.5, vx:Math.cos(a)*430, vy:Math.sin(a)*430,
                           r:5, dmg:e.dmg||10, life:3.4, col:'#7af0ff'}); }
          Snd.tone(430,0.08,'square',0.05,300);
        }
      } else if(k==='mother'){                 /* MOTHERSHIP */
        e.x = lerp(e.x, R.x + Math.sin(e.t*0.3)*(e.r*1.4), dt*0.9);
        const ty = R.y - (e.escortPhase ? 430 + e.r*0.5 : 300);
        if(e.y - ty > 1600) e.y = ty + 900;
        e.y = lerp(e.y, ty, dt*2.0);
        e.rot = Math.sin(e.t*0.5)*0.06;
        if(e.escortPhase){                     // launching fighters: invulnerable, spawning
          e.inv = true;
          e.p2 = (e.p2||0) - dt;
          if(e.p2<=0){ e.p2 = 4.0; if(typeof motherWave==='function') motherWave(); }
        } else {                               // facing you: blaster volleys (+rockets/lasers)
          e.inv = false;
          e.fire -= dt;
          if(e.fire<=0){
            e.fire = (e.hp < e.maxhp*0.4 ? 1.2 : 1.9);
            const base=Math.atan2(R.y-e.y, R.x-e.x);
            const n = (e.hp < e.maxhp*0.4 ? 8 : 5);
            for(let q=0;q<n;q++){
              const a = base + (q-(n-1)/2)*0.13;
              ebullets.push({x:e.x, y:e.y+e.r*0.35, vx:Math.cos(a)*520, vy:Math.sin(a)*520,
                             r:6, dmg:e.dmg||10, life:4, col:'#ff5fd0'});
            }
            Snd.tone(150,0.2,'sawtooth',0.08,80); shake=Math.max(shake,6);
          }
        }
      } else {
      e.x = lerp(e.x, R.x + Math.sin(e.t*0.45)*330, dt*1.1);
      const targetY = R.y - (k==='super'? 260 : 340);
      if(e.y - targetY > 1500) e.y = targetY + 900;          // never fall hopelessly behind
      e.y = lerp(e.y, targetY, dt*2.4);
      e.rot = Math.sin(e.t*0.8)*0.12;
      e.fire -= dt;
      if(e.fire<=0){
        e.fire = (e.hp < e.maxhp*0.4 ? 1.5 : 2.2) * (k==='mini'?0.75 : k==='huge'?0.85 : k==='super'?0.6 : 0.8);
        const base=Math.atan2(R.y-e.y,R.x-e.x);
        const n = (e.hp < e.maxhp*0.4 ? 6 : 4) + (k==='mini'?1 : k==='huge'?3 : k==='super'?4 : 0);
        const spd = 290 + (k==='warden'?60:0) + (k==='mini'?120:0) + (k==='huge'?90:0) + (k==='super'?160:0);
        for(let q=0;q<n;q++){
          const a = base + (q-(n-1)/2)*0.16;
          ebullets.push({x:e.x,y:e.y+30,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:6,dmg:e.dmg||10,life:4,
                         col: k==='super'?'#ff3b3b': k==='huge'?'#b6ff6a': k==='mini'?'#ffb454':'#ff5fd0'});
        }
        Snd.tone(140,0.22,'sawtooth',0.09,70);
        shake=Math.max(shake,4);
      }
      /* radial bullet rings from the big ones */
      if(k==='huge'||k==='super'){
        e.p2 = (e.p2||0) - dt;
        if(e.p2<=0){
          e.p2 = k==='super'? 2.6 : 3.4;
          const m = k==='super'? 22 : 14, off = (e.phase=(e.phase||0)+0.35);
          for(let q=0;q<m;q++){
            const a = off + q*TAU/m;
            ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*230,vy:Math.sin(a)*230,r:5,
                           dmg:Math.max(8,Math.round((e.dmg||10)*0.8)),life:4,col:k==='super'?'#ff8b5f':'#7af0ff'});
          }
          Snd.tone(80,0.3,'square',0.1,40); shake=Math.max(shake,8);
        }
      }
      /* the super tyrant calls escorts */
      if(k==='super'){
        e.p3 = (e.p3||0) - dt;
        if(e.p3<=0){ e.p3=6; if(enemies.length<26 && typeof spawnMine==='function'){ spawnMine(altitudeOf(R.y)); spawnGunner(altitudeOf(R.y)); } }
      }
      }

      /* ---- rocket pods (levels 1-20 gate bosses + engaged motherships) ---- */
      if(e.rk){
        e.rk -= dt;
        if(e.rk<=0){
          e.rk = e.rkCd || 3.4;
          const shots = e.rkN || 2;
          for(let q=0;q<shots;q++){
            const a = Math.atan2(R.y-e.y, R.x-e.x) + (q-(shots-1)/2)*0.55;
            ebullets.push({x:e.x, y:e.y+e.r*0.3, vx:Math.cos(a)*200, vy:Math.sin(a)*200,
                           r:8, dmg:Math.round((e.dmg||10)*1.1), life:6, col:'#ff8b5f',
                           kind:'rocket', homing:1.5});
          }
          Snd.tone(200,0.18,'square',0.06,120); shake=Math.max(shake,5);
        }
      }
      /* ---- laser lances ---- */
      if(e.laser){
        e.laser -= dt;
        if(e.laser<=0 && !e.beam){
          e.laser = e.laserCd || 4.6;
          e.beam = { a: Math.atan2(R.y-e.y, R.x-e.x) + rnd(-0.07,0.07),
                     t: e.beamMax || 1.0, max: e.beamMax || 1.0,
                     dmg: Math.round((e.dmg||10)*0.9), hit:false };
          Snd.tone(1250,0.12,'sawtooth',0.05,900);
        }
      }
      if(e.beam){
        e.beam.t -= dt;
        const firing = e.beam.t > e.beam.max*0.35;      // first 65% = telegraph, then it lances
        if(firing && !e.beam.hit && R && !R.dead){
          const dx=R.x-e.x, dy=R.y-e.y;
          const perp = Math.abs(dx*Math.sin(e.beam.a) - dy*Math.cos(e.beam.a));
          const along = dx*Math.cos(e.beam.a) + dy*Math.sin(e.beam.a);
          if(along>0 && perp < 18 + R.cr){ e.beam.hit = true; damageRocket(e.beam.dmg, R.x, R.y); }
        }
        if(e.beam.t<=0) e.beam = null;
      }
    }
    // cull far off-screen (bosses stick around)
    if(e.type!=='warden' && (e.y > cam.y + H/cam.zoom + 400 || Math.abs(e.x-cam.x) > W/cam.zoom*1.9 + 500)) enemies.splice(i,1);
  }
}
function updatePickups(dt){
  for(let i=pickups.length-1;i>=0;i--){
    const p=pickups[i]; p.t+=dt;
    const dx=R.x-p.x, dy=R.y-p.y, d=Math.hypot(dx,dy)||1;
    if(d<150){ p.vx += dx/d*520*dt; p.vy += dy/d*520*dt; }
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    if(d < R.L.R + p.r + 6){
      pickups.splice(i,1); collect(p); continue;
    }
    if(p.y > cam.y + H/cam.zoom + 300) pickups.splice(i,1);
  }
}
function collect(p){
  if(p.kind==='fuel'){
    const amt = STATS.fuel*0.34; R.fuel = Math.min(STATS.fuel, R.fuel+amt); run.fuelGot++;
    addFloat(p.x,p.y,'+'+Math.round(amt)+' FUEL','#54d8ff'); Snd.coin();
    if(run.tutorial) tutFlags.fuel=true;
  } else if(p.kind==='repair'){
    R.hp=Math.min(R.maxhp,R.hp+R.maxhp*0.28); addFloat(p.x,p.y,'+HULL','#59e08a'); Snd.coin();
  } else if(p.kind==='rp'){
    const v=Math.round(p.value*STATS.rpMult); run.rp+=v; addFloat(p.x,p.y,'+'+v+' RP','#ffb03a'); Snd.coin();
  } else if(p.kind==='rs'){
    const v=Math.round(p.value*STATS.rsMult); run.rs+=v; addFloat(p.x,p.y,'+'+v+' RS','#c07bff'); Snd.sci();
  }
  for(let i=0;i<10;i++){ const a=rnd(TAU); parts.push({x:p.x,y:p.y,vx:Math.cos(a)*rnd(40,140),vy:Math.sin(a)*rnd(40,140),
    life:0.4,max:0.4,r:rnd(1.5,3),col:'#fff',g:0}); }
}
function updateDebris(dt){
  for(let i=debris.length-1;i>=0;i--){
    const d=debris[i];
    d.life-=dt; d.x+=d.vx*dt; d.y+=d.vy*dt; d.vy+=G_ACC*0.45*dt; d.rot+=d.spin*dt;
    if(Math.random()<0.4) parts.push({x:d.x+rnd(-8,8),y:d.y+rnd(-8,8),vx:rnd(-20,20),vy:rnd(-20,20),
      life:0.5,max:0.5,r:rnd(3,7),col:'smoke',g:-6});
    if(d.life<=0 || d.y > cam.y + H/cam.zoom + 500) debris.splice(i,1);
  }
}
function updateParticles(dt){
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];
    p.life-=dt;
    if(p.life<=0){ parts.splice(i,1); continue; }
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    if(p.g){ p.vy+=p.g*dt; }
    if(p.col==='smoke'){ p.r+=18*dt; p.vx*=0.98; p.vy*=0.98; }
    if(p.col!=='flash' && p.col!=='smoke'){ p.vx*=0.97; p.vy*=0.97; }
  }
  if(parts.length>900) parts.splice(0, parts.length-900);
  for(let i=floats.length-1;i>=0;i--){
    const f=floats[i]; f.life-=dt; f.y-=34*dt;
    if(f.life<=0) floats.splice(i,1);
  }
}
function checkMissions(){
  const m = MISSIONS.find(x=>!P.missions.includes(x.id));
  if(!m || run.tutorial) return;
  const g = m.goal;
  const ok = (!g.alt || run.maxAlt>=g.alt) && (!g.kills || run.kills>=g.kills) && (!g.boss || run.bossKilled>=g.boss)
          && (!g.lvl || P.level > g.lvl) && (!g.mini || (P.miniKills|0) >= g.mini);
  if(ok){
    P.missions.push(m.id); run.missions.push(m);
    P.rp += m.rp; P.rs += m.rs; save();
    toast('✅ CONTRACT COMPLETE: <b>'+m.name+'</b> &nbsp;+'+m.rp+' RP &nbsp;+'+m.rs+' RS', 3600);
    Snd.buy(); flash=Math.max(flash,0.3);
  }
}
let tutDoneT = 0;
function completeTutorial(){
  P.tutDone = true;
  if(!P.missions.includes('tut')){ P.missions.push('tut'); P.rp += 220; P.rs += 12; }
  save();
  tutDoneT = 1.1;                                  // counted down in updateFlight (no timers)
  toast('🎓 <b>FLIGHT SCHOOL COMPLETE</b> — +220 RP · +12 RS', 3000);
  Snd.buy();
}
