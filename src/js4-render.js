
/* =========================================================================
   WORLD RENDERING
   ========================================================================= */
let clouds = [];
function makeClouds(){
  clouds = [];
  for(let i=0;i<70;i++){
    clouds.push({ x: rnd(-2600,2600), y: rnd(-4200,-260), s: rnd(0.6,2.1), a: rnd(0.25,0.7), n: rndInt(3,6) });
  }
}
/* Rolling hills — except the launch complex around x=0, which is graded flat */
const PAD_W = 190, PAD_TOP = -18;            // pad deck height (world y; ground plane = 0)
const LC_FLAT = 300, LC_BLEND = 340;         // flat complex half-width + blend into hills
function terrainRaw(x){ return -Math.sin(x*0.0042)*26 - Math.sin(x*0.0113+2)*11 - Math.sin(x*0.0017)*44; }
function terrainY(x){
  const ax = Math.abs(x);
  if(ax >= LC_FLAT + LC_BLEND) return terrainRaw(x);
  if(ax <= LC_FLAT) return 0;
  const t = (ax-LC_FLAT)/LC_BLEND, s = t*t*(3-2*t);
  return terrainRaw(x)*s;
}
function surfaceY(x){ return Math.abs(x) <= PAD_W/2+4 ? PAD_TOP : terrainY(x); }

function skyColors(alt){
  const f = clamp(alt/4200, 0, 1);
  const top = mixRGB([42,96,180],[2,3,10], f);
  const bot = mixRGB([140,196,240],[6,11,26], f);
  return [top,bot];
}
function mixRGB(a,b,t){ return 'rgb('+Math.round(lerp(a[0],b[0],t))+','+Math.round(lerp(a[1],b[1],t))+','+Math.round(lerp(a[2],b[2],t))+')'; }

function drawSpaceBG(alt, t){
  const [top,bot] = skyColors(alt);
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  // stars fade in with altitude
  const sa = clamp(alt/2200, 0, 1);
  if(sa > 0.02){
    const off = cam ? cam.y : t*20;
    const ox = cam ? cam.x : t*4;
    for(let L=0;L<3;L++){
      const pf = [0.06,0.16,0.34][L];
      ctx.save();
      for(const s of stars[L]){
        const x = ((s.x*W*2 - ox*pf) % (W*2) + W*2) % (W*2) - W*0.5;
        const y = ((s.y*H*2 - off*pf) % (H*2) + H*2) % (H*2) - H*0.5;
        const tw = 0.6 + 0.4*Math.sin(t*2.2 + s.tw);
        ctx.globalAlpha = sa * s.b * tw;
        ctx.fillStyle = L===2 ? '#ffffff' : '#cfe0ff';
        ctx.fillRect(x, y, s.s, s.s);
      }
      ctx.restore();
    }
  }
}
function drawEarthLimb(alt){
  if(alt < 1500) return;
  const f = clamp((alt-1500)/7000, 0, 1);
  const rad = H*2.1;
  const cy = H*1.5 - f*H*0.85;
  const g = ctx.createRadialGradient(W/2, cy, rad*0.82, W/2, cy, rad);
  g.addColorStop(0,'rgba(20,60,130,0)');
  g.addColorStop(0.86,'rgba(60,150,255,'+(0.35*f)+')');
  g.addColorStop(0.93,'rgba(120,210,255,'+(0.75*f)+')');
  g.addColorStop(1,'rgba(190,235,255,'+(0.9*f)+')');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(W/2, cy, rad, 0, TAU); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(W/2, cy, rad*0.965, 0, TAU); ctx.clip();
  const g2 = ctx.createLinearGradient(0, cy-rad, 0, cy);
  g2.addColorStop(0,'rgba(10,40,90,'+(0.85*f)+')'); g2.addColorStop(1,'rgba(28,90,170,'+(0.9*f)+')');
  ctx.fillStyle=g2; ctx.fillRect(0, cy-rad, W, rad);
  ctx.restore();
}
function drawGroundLayer(){
  // terrain
  const left = cam.x - W/cam.zoom/2 - 80, right = cam.x + W/cam.zoom/2 + 80;
  if(cam.y + H/cam.zoom/2 < -200) return;   // ground not visible
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left, 3000);
  for(let x=left; x<=right; x+=26) ctx.lineTo(x, terrainY(x));
  ctx.lineTo(right, 3000); ctx.closePath();
  const g = ctx.createLinearGradient(0,-60,0,600);
  g.addColorStop(0,'#3d5a3a'); g.addColorStop(0.25,'#26382a'); g.addColorStop(1,'#0d1410');
  ctx.fillStyle=g; ctx.fill();
  ctx.strokeStyle='rgba(150,200,150,.28)'; ctx.lineWidth=2; ctx.stroke();

  // concrete apron across the flat launch complex
  ctx.fillStyle='#39424f'; ctx.fillRect(-LC_FLAT+60, 0, (LC_FLAT-60)*2, 14);
  ctx.fillStyle='#2c3440';
  for(let x=-LC_FLAT+90; x<LC_FLAT-90; x+=64) ctx.fillRect(x, 5, 26, 3);

  // launch pad — deck sits on the flat ground, rocket stands on the deck
  const padW = PAD_W;
  ctx.fillStyle='#2b3444'; ctx.fillRect(-padW/2, PAD_TOP, padW, 22);
  ctx.fillStyle='#3c4a5f'; ctx.fillRect(-padW/2, PAD_TOP, padW, 5);
  ctx.fillStyle='#f0a63c';
  for(let i=0;i<7;i++) ctx.fillRect(-padW/2+8+i*26, PAD_TOP+8, 12, 4);
  // service tower, rooted in the flat ground beside the deck
  ctx.strokeStyle='#55627a'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(padW/2+18, 4); ctx.lineTo(padW/2+18, PAD_TOP-136); ctx.stroke();
  for(let i=0;i<6;i++){ const y=PAD_TOP-6-i*24;
    ctx.beginPath(); ctx.moveTo(padW/2+18,y); ctx.lineTo(padW/2+2,y-10); ctx.stroke(); }
  ctx.fillStyle='#ff5f6d'; ctx.beginPath(); ctx.arc(padW/2+18, PAD_TOP-140, 4, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawCloudLayer(){
  const alt = run ? run.maxAlt : 0;
  ctx.save();
  for(const c of clouds){
    if(Math.abs(c.x - cam.x) > W/cam.zoom/2 + 260) continue;
    if(c.y < cam.y - H/cam.zoom/2 - 200 || c.y > cam.y + H/cam.zoom/2 + 200) continue;
    ctx.globalAlpha = c.a * 0.85;
    ctx.fillStyle = '#e8f0ff';
    for(let i=0;i<c.n;i++){
      const ox = (i-(c.n-1)/2)*22*c.s, oy = Math.sin(i*2.1)*7*c.s;
      ctx.beginPath(); ctx.ellipse(c.x+ox, c.y+oy, 30*c.s, 17*c.s, 0, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

function drawEntities(t){
  /* pickups */
  for(const p of pickups){
    const bob = Math.sin(p.t*3)*3;
    ctx.save(); ctx.translate(p.x, p.y+bob);
    const col = p.kind==='fuel'?'#54d8ff':p.kind==='repair'?'#59e08a':p.kind==='rs'?'#c07bff':'#ffb03a';
    ctx.globalAlpha=0.25+0.15*Math.sin(p.t*4);
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(0,0,p.r+9,0,TAU); ctx.fill();
    ctx.globalAlpha=1;
    ctx.rotate(Math.sin(p.t*2)*0.3);
    ctx.fillStyle='#0d1729'; ctx.strokeStyle=col; ctx.lineWidth=2;
    rr(ctx,-9,-11,18,22,4); ctx.fill(); ctx.stroke();
    ctx.fillStyle=col;
    if(p.kind==='fuel'){ ctx.fillRect(-4,-6,8,12); ctx.fillRect(-6,-2,12,4); }
    else if(p.kind==='repair'){ ctx.fillRect(-5,-1.6,10,3.2); ctx.fillRect(-1.6,-5,3.2,10); }
    else if(p.kind==='rs'){ ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(5,0); ctx.lineTo(0,6); ctx.lineTo(-5,0); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0,0,4.6,0,TAU); ctx.fill(); ctx.strokeStyle='#0d1729'; ctx.lineWidth=1.4; ctx.stroke(); }
    ctx.restore();
  }
  /* jettisoned stage debris */
  for(const d of debris){
    const k = clamp(d.life/d.max,0,1);
    const sv = PARTS[d.id].vis, rw = 13 + sv.w*1.6;
    ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.rot); ctx.globalAlpha = 0.35+0.65*k;
    const bg = ctx.createLinearGradient(-rw,0,rw,0);
    bg.addColorStop(0, shade(sv.color,-0.4)); bg.addColorStop(0.5, sv.color); bg.addColorStop(1, shade(sv.color,-0.5));
    ctx.fillStyle=bg; rr(ctx,-rw,-sv.h/2,rw*2,sv.h,4); ctx.fill();
    ctx.strokeStyle=sv.stripe; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#39414f';
    for(let i=0;i<(sv.nozzles||1);i++){
      const off=(sv.nozzles===1)?0:(i-(sv.nozzles-1)/2)*(rw*1.5/Math.max(1,sv.nozzles-1));
      ctx.fillRect(off-5, sv.h/2-2, 10, 6);
    }
    (d.guns||[]).forEach((gid,gi)=>{ const side=(gi%2===0)?-1:1;
      ctx.fillStyle=shade(PARTS[gid].vis.color,-0.2); ctx.fillRect(side*(rw+1)-3, -sv.h/2+4, 6, 12); });
    ctx.restore();
  }
  /* enemies */
  for(const e of enemies) drawEnemy(e, t);
  /* boss laser lances (drawn in world space, on top of the fighters) */
  for(const e of enemies){
    if(!e.beam) continue;
    const b=e.beam, hot = b.t > b.max*0.35, L=3000;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    if(!hot){ ctx.strokeStyle='rgba(255,110,110,.45)'; ctx.lineWidth=2; }
    else { ctx.strokeStyle='rgba(255,70,70,.9)'; ctx.lineWidth=11+5*Math.sin(t*40); }
    ctx.beginPath(); ctx.moveTo(e.x,e.y); ctx.lineTo(e.x+Math.cos(b.a)*L, e.y+Math.sin(b.a)*L); ctx.stroke();
    if(hot){ ctx.strokeStyle='#fff'; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(e.x,e.y); ctx.lineTo(e.x+Math.cos(b.a)*L, e.y+Math.sin(b.a)*L); ctx.stroke(); }
    ctx.fillStyle= hot?'#fff':'rgba(255,150,150,.7)';
    ctx.beginPath(); ctx.arc(e.x,e.y, hot?16:9, 0, TAU); ctx.fill();
    ctx.restore();
  }
  /* enemy bullets */
  for(const b of ebullets){
    if(b.kind==='rocket'){
      ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(Math.atan2(b.vy,b.vx));
      ctx.fillStyle='#ff8b5f';
      ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-6,4.5); ctx.lineTo(-3,0); ctx.lineTo(-6,-4.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#fff2cf'; ctx.fillRect(-15,-1.4,8,2.8);
      ctx.restore(); continue;
    }
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r*3.2);
    g.addColorStop(0,'#fff'); g.addColorStop(0.3,b.col); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(b.x,b.y,b.r*3.2,0,TAU); ctx.fill();
    ctx.restore();
  }
  /* player bullets */
  for(const b of bullets){
    if(b.msl){                       // missiles: fat dart with a smoke trail
      ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(Math.atan2(b.vy,b.vx));
      ctx.fillStyle='rgba(255,190,120,.30)';
      ctx.beginPath(); ctx.moveTo(-4,0); ctx.lineTo(-34,3.4); ctx.lineTo(-34,-3.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#d8dee9';
      ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(-6,4.4); ctx.lineTo(-3,0); ctx.lineTo(-6,-4.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle=b.col||'#ffb03a';
      ctx.beginPath(); ctx.moveTo(11,0); ctx.lineTo(0,3.2); ctx.lineTo(0,-3.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#fff'; ctx.fillRect(-10,-1.1,6,2.2);
      ctx.restore(); continue;
    }
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const a=Math.atan2(b.vy,b.vx);
    ctx.translate(b.x,b.y); ctx.rotate(a);
    const g=ctx.createLinearGradient(-16,0,8,0);
    g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(0.6,b.col); g.addColorStop(1,'#fff');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.ellipse(0,0, b.splash?11:9, b.r*0.85, 0,0,TAU); ctx.fill();
    ctx.restore();
  }
  /* particles */
  ctx.save();
  for(const p of parts){
    const k = p.max ? clamp(p.life/p.max,0,1) : 0;
    if(p.col==='flash'){
      ctx.globalCompositeOperation='lighter';
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*(2-k));
      g.addColorStop(0,'rgba(255,255,255,'+(k)+')'); g.addColorStop(0.4,'rgba(255,190,90,'+(k*0.7)+')');
      g.addColorStop(1,'rgba(255,90,20,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*(2-k),0,TAU); ctx.fill();
      ctx.globalCompositeOperation='source-over';
    } else if(p.col==='smoke'){
      ctx.globalAlpha = k*0.30; ctx.fillStyle='#9fb0cc';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,TAU); ctx.fill(); ctx.globalAlpha=1;
    } else if(p.col==='exhaust'){
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha = k*0.85;
      ctx.fillStyle = k>0.6 ? '#fff6d8' : (k>0.3 ? '#ffb03a' : '#ff5f2a');
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*k+0.6,0,TAU); ctx.fill();
      ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
    } else {
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha = k; ctx.fillStyle=p.col;
      ctx.fillRect(p.x-p.r/2, p.y-p.r/2, p.r, p.r);
      ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
    }
  }
  ctx.restore();
  /* floating text */
  ctx.save();
  ctx.textAlign='center'; ctx.font='900 15px ui-monospace,Consolas,monospace';
  for(const f of floats){
    const k=clamp(f.life/f.max,0,1);
    ctx.globalAlpha=k; ctx.fillStyle='rgba(0,0,0,.55)';
    ctx.fillText(f.text, f.x+1.5, f.y+1.5);
    ctx.fillStyle=f.col; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}
function drawEnemy(e,t){
  ctx.save(); ctx.translate(e.x,e.y);
  const flash = e.flash>0;
  if(e.type==='mine'){
    ctx.rotate(e.rot||0);
    ctx.fillStyle = flash? '#fff' : '#5b2d6e';
    ctx.beginPath(); ctx.arc(0,0,e.r*0.72,0,TAU); ctx.fill();
    ctx.strokeStyle = flash? '#fff' : '#c07bff'; ctx.lineWidth=3;
    for(let i=0;i<6;i++){ const a=i*TAU/6;
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*e.r*0.6, Math.sin(a)*e.r*0.6);
      ctx.lineTo(Math.cos(a)*e.r, Math.sin(a)*e.r); ctx.stroke(); }
    ctx.fillStyle = '#ff5f6d'; ctx.beginPath(); ctx.arc(0,0,e.r*0.28,0,TAU); ctx.fill();
    ctx.restore(); return;
  }
  if(e.type==='gunner'){
    ctx.fillStyle = flash? '#fff' : '#134b52';
    ctx.beginPath(); ctx.moveTo(0,e.r); ctx.lineTo(-e.r*0.9,-e.r*0.5); ctx.lineTo(e.r*0.9,-e.r*0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = flash? '#fff' : '#7af0ff';
    ctx.fillRect(-e.r*0.55,-e.r*0.35,e.r*1.1,e.r*0.35);
    ctx.fillStyle='#05262b'; ctx.beginPath(); ctx.arc(0,e.r*0.55,e.r*0.22,0,TAU); ctx.fill();
    ctx.restore(); return;
  }
  if(e.type==='rock'){
    ctx.rotate(e.rot);
    ctx.beginPath();
    e.verts.forEach((v,i)=>{ const x=Math.cos(v.a)*v.r, y=Math.sin(v.a)*v.r; i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
    ctx.closePath();
    const g=ctx.createRadialGradient(-e.r*0.3,-e.r*0.3,e.r*0.15,0,0,e.r*1.2);
    g.addColorStop(0, flash?'#fff':'#8d8577'); g.addColorStop(1, flash?'#ffb':'#3b3730');
    ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=1.6; ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.22)';
    for(let i=0;i<3;i++){ const a=e.seed*7+i*2.3, rr2=e.r*(0.18+0.12*i);
      ctx.beginPath(); ctx.arc(Math.cos(a)*e.r*0.42, Math.sin(a)*e.r*0.42, rr2, 0, TAU); ctx.fill(); }
  } else if(e.type==='drone'){
    ctx.rotate(e.rot);
    ctx.fillStyle= flash?'#fff':'#39414f';
    ctx.beginPath();
    for(let i=0;i<6;i++){ const a=i/6*TAU; const x=Math.cos(a)*e.r, y=Math.sin(a)*e.r; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#7f8aa0'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle= flash?'#fff':'#ff5f6d';
    ctx.shadowColor='#ff5f6d'; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.arc(0,0,5+Math.sin(e.t*7)*1.2,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='#54d8ff'; ctx.fillRect(-e.r-5,-2.5,5,5); ctx.fillRect(e.r,-2.5,5,5);
  } else if(e.type==='saucer'){
    ctx.rotate(e.rot);
    ctx.fillStyle='rgba(150,255,180,.28)';
    ctx.beginPath(); ctx.ellipse(0,e.r*0.5,e.r*0.9,e.r*1.5,0,0,TAU); ctx.fill();
    const g=ctx.createLinearGradient(0,-e.r*0.6,0,e.r*0.6);
    g.addColorStop(0, flash?'#fff':'#b9c6dd'); g.addColorStop(1, flash?'#fcc':'#4a5468');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,e.r,e.r*0.42,0,0,TAU); ctx.fill();
    ctx.strokeStyle='#22303f'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle='rgba(140,230,255,.75)';
    ctx.beginPath(); ctx.ellipse(0,-e.r*0.28,e.r*0.5,e.r*0.42,0,Math.PI,TAU); ctx.fill();
    for(let i=0;i<5;i++){
      const a=t*3+i/5*TAU;
      ctx.fillStyle= i%2? '#b6ff6a':'#ffe27a';
      ctx.globalAlpha=0.5+0.5*Math.sin(a);
      ctx.beginPath(); ctx.arc(Math.cos(i/5*TAU)*e.r*0.78, Math.sin(i/5*TAU)*e.r*0.24, 2.6,0,TAU); ctx.fill();
    }
    ctx.globalAlpha=1;
  } else if(e.type==='warden'){
    const k = e.gateKind || 'warden';
    ctx.rotate(e.rot);
    if(k==='mini'){                        /* EMBER EYE — spiked orange orb */
      ctx.fillStyle= flash?'#fff':'#4a2410';
      ctx.beginPath(); ctx.arc(0,0,e.r*0.8,0,TAU); ctx.fill();
      ctx.strokeStyle='#ffb454'; ctx.lineWidth=3;
      for(let i=0;i<8;i++){ const a=i*TAU/8 + t*1.2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a)*e.r*0.7,Math.sin(a)*e.r*0.7);
        ctx.lineTo(Math.cos(a)*e.r*1.15,Math.sin(a)*e.r*1.15); ctx.stroke(); }
      const eye=0.6+0.4*Math.sin(t*6);
      ctx.fillStyle='rgba(255,180,84,'+eye+')'; ctx.shadowColor='#ffb454'; ctx.shadowBlur=20;
      ctx.beginPath(); ctx.arc(0,0,e.r*0.34,0,TAU); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle='#20100a'; ctx.beginPath(); ctx.arc(0,0,e.r*0.14,0,TAU); ctx.fill();
    } else if(k==='huge'){                 /* BULWARK — gunmetal hex, twin green cores */
      ctx.fillStyle= flash?'#fff':'#22303a';
      ctx.beginPath();
      for(let i=0;i<6;i++){ const a=i*TAU/6 + t*0.25;
        const x=Math.cos(a)*e.r, y=Math.sin(a)*e.r; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#b6ff6a'; ctx.lineWidth=4; ctx.stroke();
      ctx.strokeStyle='rgba(182,255,106,.4)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(0,0,e.r*0.62,0,TAU); ctx.stroke();
      const c2=0.55+0.45*Math.sin(t*4);
      ctx.fillStyle='rgba(182,255,106,'+c2+')'; ctx.shadowColor='#b6ff6a'; ctx.shadowBlur=22;
      ctx.beginPath(); ctx.arc(-e.r*0.3,0,e.r*0.2,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(e.r*0.3,0,e.r*0.2,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    } else if(k==='super'){                /* VOID TYRANT — black disc, accretion rings, crimson eye */
      const g2=ctx.createRadialGradient(0,0,e.r*0.2,0,0,e.r*1.9);
      g2.addColorStop(0,'rgba(255,59,59,.35)'); g2.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(0,0,e.r*1.9,0,TAU); ctx.fill();
      ctx.fillStyle= flash?'#fff':'#07070c';
      ctx.beginPath(); ctx.arc(0,0,e.r*0.95,0,TAU); ctx.fill();
      ctx.strokeStyle='#ff3b3b'; ctx.lineWidth=5;
      ctx.beginPath(); ctx.arc(0,0,e.r*1.15, t*1.5, t*1.5+TAU*0.8); ctx.stroke();
      ctx.strokeStyle='rgba(255,139,95,.6)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(0,0,e.r*1.35, -t*1.1, -t*1.1+TAU*0.6); ctx.stroke();
      const e3=0.6+0.4*Math.sin(t*7);
      ctx.fillStyle='rgba(255,59,59,'+e3+')'; ctx.shadowColor='#ff3b3b'; ctx.shadowBlur=30;
      ctx.beginPath(); ctx.arc(0,0,e.r*0.3,0,TAU); ctx.fill(); ctx.shadowBlur=0;
      ctx.strokeStyle='#ffd0d0'; ctx.lineWidth=2;
      for(let i=0;i<3;i++){ const a=t*3+i*TAU/3;
        ctx.beginPath(); ctx.moveTo(Math.cos(a)*e.r*0.35,Math.sin(a)*e.r*0.35);
        ctx.lineTo(Math.cos(a)*e.r*0.8,Math.sin(a)*e.r*0.8); ctx.stroke(); }
    } else if(k==='mother'){               /* MOTHERSHIP — vast carrier, hangar bay, spinning rings */
      const g2=ctx.createRadialGradient(0,0,e.r*0.3,0,0,e.r*2.2);
      g2.addColorStop(0,'rgba(130,95,255,.30)'); g2.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(0,0,e.r*2.2,0,TAU); ctx.fill();
      ctx.fillStyle='#2a3350';                                   // wings
      ctx.beginPath(); ctx.moveTo(-e.r*1.25,0); ctx.lineTo(-e.r*1.95,-e.r*0.6); ctx.lineTo(-e.r*1.45,e.r*0.25); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(e.r*1.25,0); ctx.lineTo(e.r*1.95,-e.r*0.6); ctx.lineTo(e.r*1.45,e.r*0.25); ctx.closePath(); ctx.fill();
      ctx.fillStyle= flash?'#fff':'#1b2136';                     // hull
      ctx.beginPath(); ctx.ellipse(0,0,e.r*1.35,e.r*0.72,0,0,TAU); ctx.fill();
      ctx.strokeStyle='#8fa3d8'; ctx.lineWidth=5; ctx.stroke();
      const bay = e.escortPhase ? 0.55+0.45*Math.sin(t*7) : 0.22; // hangar bay
      ctx.fillStyle='rgba(255,150,80,'+bay+')'; ctx.shadowColor='#ff9a3c'; ctx.shadowBlur=26;
      rr(ctx,-e.r*0.42, e.r*0.26, e.r*0.84, e.r*0.26, 6); ctx.fill(); ctx.shadowBlur=0;
      ctx.strokeStyle='rgba(122,240,255,.75)'; ctx.lineWidth=3;   // spinning rings
      ctx.beginPath(); ctx.ellipse(0,0,e.r*1.12,e.r*0.46, t*0.9,0,TAU); ctx.stroke();
      ctx.strokeStyle='rgba(192,123,255,.55)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(0,0,e.r*1.4,e.r*0.62, -t*0.6,0,TAU); ctx.stroke();
      const core=0.55+0.45*Math.sin(t*5);
      ctx.fillStyle='rgba(255,80,80,'+core+')'; ctx.shadowColor='#ff3b3b'; ctx.shadowBlur=30;
      ctx.beginPath(); ctx.arc(0,-e.r*0.26,e.r*0.18,0,TAU); ctx.fill(); ctx.shadowBlur=0;
      if(e.inv){                                                  // shield up while launching
        ctx.strokeStyle='rgba(122,240,255,'+(0.22+0.2*Math.sin(t*4))+')'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.ellipse(0,0,e.r*1.75,e.r*1.05,0,0,TAU); ctx.stroke();
        ctx.fillStyle='rgba(122,240,255,.06)'; ctx.fill();
      }
    } else if(k==='escort'){               /* ESCORT — compact interceptor dart */
      ctx.fillStyle= flash?'#fff':'#123044';
      ctx.beginPath(); ctx.moveTo(0,e.r*0.95); ctx.lineTo(e.r*0.85,-e.r*0.5);
      ctx.lineTo(0,-e.r*0.18); ctx.lineTo(-e.r*0.85,-e.r*0.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#7af0ff'; ctx.lineWidth=2.4; ctx.stroke();
      ctx.fillStyle='rgba(122,240,255,'+(0.5+0.5*Math.sin(t*9))+')';
      ctx.shadowColor='#7af0ff'; ctx.shadowBlur=14;
      ctx.beginPath(); ctx.arc(0,e.r*0.12,e.r*0.22,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    } else {                               /* WARDEN Mk-II — violet stealth disc, spinning blades */
      ctx.fillStyle='rgba(192,123,255,.12)';
      ctx.beginPath(); ctx.arc(0,0,e.r*1.6,0,TAU); ctx.fill();
      ctx.fillStyle= flash?'#fff':'#241b33';
      ctx.beginPath(); ctx.ellipse(0,0,e.r*1.15,e.r*0.62,0,0,TAU); ctx.fill();
      ctx.strokeStyle='#c07bff'; ctx.lineWidth=3; ctx.stroke();
      ctx.strokeStyle='rgba(84,216,255,.8)'; ctx.lineWidth=3;
      for(let i=0;i<3;i++){ const a=t*2+i*TAU/3;
        ctx.beginPath(); ctx.moveTo(Math.cos(a)*e.r*0.4,Math.sin(a)*e.r*0.4);
        ctx.lineTo(Math.cos(a)*e.r*1.05,Math.sin(a)*e.r*1.05); ctx.stroke(); }
      const core=0.55+0.45*Math.sin(t*5);
      ctx.fillStyle='rgba(192,123,255,'+core+')'; ctx.shadowColor='#c07bff'; ctx.shadowBlur=26;
      ctx.beginPath(); ctx.arc(0,0,e.r*0.3,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    }
    ctx.rotate(-e.rot);
    // boss health bar
    const bw=170, bx=-bw/2, by=-e.r-30;
    const bcol = k==='mother'?'#ff5f6d': k==='escort'?'#7af0ff': k==='super'?'#ff3b3b': k==='huge'?'#b6ff6a': k==='mini'?'#ffb454':'#c07bff';
    ctx.fillStyle='rgba(6,10,20,.8)'; rr(ctx,bx-2,by-2,bw+4,12,4); ctx.fill();
    ctx.fillStyle=bcol; ctx.fillRect(bx,by,bw*clamp(e.hp/e.maxhp,0,1),8);
    ctx.strokeStyle='#ffd0f2'; ctx.lineWidth=1; rr(ctx,bx-2,by-2,bw+4,12,4); ctx.stroke();
    ctx.fillStyle='#ffd0f2'; ctx.font='900 11px ui-monospace,Consolas,monospace'; ctx.textAlign='center';
    ctx.fillText(k==='mother'? (e.inv?'MOTHERSHIP — SHIELDED':'MOTHERSHIP') : k==='escort'?'ESCORT FIGHTER'
                 : k==='super'?'VOID TYRANT': k==='huge'?'BULWARK': k==='mini'?'EMBER EYE':'WARDEN MK-II', 0, by-8);
  }
  ctx.restore();
  // small health bar
  if(e.type!=='warden' && e.hp < e.maxhp && e.maxhp>16){
    const bw=e.r*2, bx=e.x-bw/2, by=e.y-e.r-10;
    ctx.fillStyle='rgba(6,10,20,.7)'; ctx.fillRect(bx-1,by-1,bw+2,5);
    ctx.fillStyle='#59e08a'; ctx.fillRect(bx,by,bw*clamp(e.hp/e.maxhp,0,1),3);
  }
}

/* ---------------- HUD ---------------- */
function drawHUD(t){
  const alt = run.maxAlt, cur = altitudeOf(R.y);
  const sp = Math.hypot(R.vx,R.vy)/PX_PER_M;
  const vs = -R.vy/PX_PER_M;
  ctx.save();
  ctx.textBaseline='alphabetic';

  /* left: altitude */
  ctx.textAlign='left';
  ctx.fillStyle='rgba(6,10,20,.55)'; rr(ctx,12,12,196,86,12); ctx.fill();
  ctx.fillStyle='#7d90b8'; ctx.font='800 11px ui-monospace,Consolas,monospace';
  ctx.fillText('ALTITUDE', 26, 34);
  ctx.font='900 30px ui-monospace,Consolas,monospace';
  const altTxt = fmt(cur), altW = ctx.measureText(altTxt).width;
  ctx.fillStyle='#fff'; ctx.fillText(altTxt, 26, 64);
  ctx.fillStyle='#7d90b8'; ctx.font='800 13px ui-monospace,Consolas,monospace';
  ctx.fillText('m', 30+altW, 64);
  ctx.fillStyle = vs>0 ? '#7cf0a8' : '#ff9aa4';
  ctx.font='800 12px ui-monospace,Consolas,monospace';
  ctx.fillText((vs>0?'▲ ':'▼ ')+Math.abs(vs).toFixed(0)+' m/s   '+sp.toFixed(0)+' m/s', 26, 86);

  /* right: score */
  ctx.textAlign='right';
  ctx.fillStyle='rgba(6,10,20,.55)'; rr(ctx,W-208,12,196,74,12); ctx.fill();
  ctx.font='800 15px ui-monospace,Consolas,monospace';
  ctx.fillStyle='#ffb03a'; ctx.fillText('◆ '+fmt(run.rp)+' RP', W-26, 38);
  ctx.fillStyle='#c07bff'; ctx.fillText('✦ '+fmt(run.rs)+' RS', W-26, 60);
  ctx.fillStyle='#9fb3d9'; ctx.font='800 12px ui-monospace,Consolas,monospace';
  ctx.fillText('TARGETS '+run.kills+'   BEST '+fmt(P.best)+'m', W-26, 79);

  /* bottom-left: bars */
  const nSt = R.stages.length;
  const bw = Math.min(240, W*0.34), bx = 16, by = H-86 - (nSt? 20*nSt : 0);
  const panelH = 84 + (nSt ? 20*nSt : 0);
  ctx.fillStyle='rgba(6,10,20,.55)'; rr(ctx,bx-6,by-18,bw+12,panelH,12); ctx.fill();
  bar(bx,by,bw,'HULL',R.hp/R.maxhp, R.hp/R.maxhp<0.3?'#ff5f6d':'#59e08a', Math.round(R.hp)+'/'+R.maxhp);
  bar(bx,by+22,bw,'FUEL',R.fuel/STATS.fuel, R.fuel/STATS.fuel<0.2?'#ff9a3c':'#54d8ff', Math.round(R.fuel)+'u');
  if(R.maxshield>0) bar(bx,by+44,bw,'SHLD',R.shield/R.maxshield,'#c07bff',Math.round(R.shield)+'/'+Math.round(R.maxshield));
  else { ctx.textAlign='left'; ctx.fillStyle='#4d5f80'; ctx.font='800 11px ui-monospace,Consolas,monospace';
         ctx.fillText('SHIELD  — none fitted', bx, by+54); }
  const actSt = R.stages.find(s=>s.attached);
  R.stages.forEach((s,i)=>{
    const y = by+66+i*20;
    ctx.textAlign='left'; ctx.fillStyle = s.attached ? '#7d90b8' : '#3c4a63';
    ctx.font='800 10px ui-monospace,Consolas,monospace';
    ctx.fillText('S'+(i+1)+(s===actSt?' ▸':''), bx, y-4);
    ctx.fillStyle='rgba(255,255,255,.10)'; rr(ctx,bx+26,y-11,bw-26,9,4); ctx.fill();
    if(s.attached){
      ctx.fillStyle = s===actSt ? '#ffb03a' : '#8296bd';
      rr(ctx,bx+26,y-11,Math.max(2,(bw-26)*clamp(s.fuel/s.max,0,1)),9,4); ctx.fill();
      ctx.textAlign='right'; ctx.fillStyle='#c9d8f5';
      ctx.fillText(Math.round(s.fuel)+'u', bx+bw, y-4);
    } else {
      ctx.textAlign='right'; ctx.fillStyle='#3c4a63'; ctx.fillText('DROPPED', bx+bw, y-4);
    }
  });

  /* campaign level + gate boss bar */
  if(run && run.level){
    ctx.textAlign='center'; ctx.fillStyle='#ffd782'; ctx.font='900 13px ui-monospace,Consolas,monospace';
    ctx.fillText('LEVEL '+run.level+(run.level===100?' — FINAL':''), W/2, 24);
    if(run.gate && enemies.includes(run.gate)){
      const g=run.gate, bw=Math.min(420, W*0.4);
      ctx.fillStyle='rgba(6,10,20,.6)'; rr(ctx, W/2-bw/2-6, 32, bw+12, 16, 8); ctx.fill();
      ctx.fillStyle='#ff5f6d'; rr(ctx, W/2-bw/2, 36, Math.max(4, bw*Math.max(0,g.hp)/g.maxhp), 8, 4); ctx.fill();
      ctx.fillStyle='#ffb4c0'; ctx.font='800 9px ui-monospace,Consolas,monospace';
      let lbl = g.gateKind==='mother'? (g.inv?'MOTHERSHIP — FIGHTERS LAUNCHING':'MOTHERSHIP')
              : g.gateKind==='super'?'SUPER WARDEN': g.gateKind==='huge'?'HUGE BOSS':'MINI BOSS';
      if(run.trick && run.trick.phase===3) lbl += '   ✈ ESCORTS: '+enemies.filter(x=>x.gateKind==='escort').length;
      ctx.fillText(lbl, W/2, 60);
    }
  }

  /* bottom-right: throttle gauge */
  {
    const tw=150, tx=W-24-tw, ty=H-118;
    ctx.fillStyle='rgba(6,10,20,.55)'; rr(ctx,tx-12,ty-18,tw+24,52,10); ctx.fill();
    ctx.textAlign='left'; ctx.fillStyle='#8fa3c8'; ctx.font='900 10px ui-monospace,Consolas,monospace';
    ctx.fillText('THROTTLE', tx, ty-5);
    ctx.textAlign='right'; ctx.fillStyle= R.thr>0.75?'#ff8b5f': R.thr>0.35?'#ffd782':'#7cf0ff';
    ctx.fillText(Math.round(R.thr*100)+'%', tx+tw, ty-5);
    ctx.fillStyle='#16213a'; rr(ctx,tx,ty,tw,9,4.5); ctx.fill();
    if(R.thr>0.02){ ctx.fillStyle= R.thr>0.75?'#ff7a4d': R.thr>0.35?'#ffb454':'#54d8ff';
      rr(ctx,tx,ty,Math.max(9,tw*R.thr),9,4.5); ctx.fill(); }
    ctx.fillStyle='rgba(255,255,255,.7)'; ctx.fillRect(tx+tw/2-1, ty-2, 2, 13);   // medium detent
    ctx.textAlign='left'; ctx.font='700 9px ui-monospace,Consolas,monospace';
    if(R.engOn){ ctx.fillStyle='#5c6f93'; ctx.fillText('SHIFT + / CTRL −  ·  E CUT', tx, ty+22); }
    else { ctx.fillStyle='#ff5f6d'; ctx.fillText('ENGINE CUT — E TO RELIGHT', tx, ty+22); }
  }

  /* bottom-right: mission / objectives */
  const m = MISSIONS.find(x=>!P.missions.includes(x.id));
  if(m && !run.tutorial){
    ctx.textAlign='right';
    ctx.fillStyle='rgba(6,10,20,.55)'; rr(ctx,W-266,H-86,254,72,12); ctx.fill();
    ctx.fillStyle='#ffd782'; ctx.font='900 12px ui-monospace,Consolas,monospace';
    ctx.fillText('CONTRACT · '+m.name.toUpperCase(), W-24, H-66);
    let yy=H-48;
    if(m.goal.alt){ ctx.fillStyle='#9fb3d9'; ctx.font='700 11px ui-monospace,Consolas,monospace';
      ctx.fillText('ALT '+fmt(Math.min(run.maxAlt,m.goal.alt))+' / '+fmt(m.goal.alt)+' m', W-24, yy); yy+=16; }
    if(m.goal.kills){ ctx.fillStyle='#9fb3d9'; ctx.font='700 11px ui-monospace,Consolas,monospace';
      ctx.fillText('KILLS '+Math.min(run.kills,m.goal.kills)+' / '+m.goal.kills, W-24, yy); yy+=16; }
    if(m.goal.boss){ ctx.fillStyle='#9fb3d9'; ctx.font='700 11px ui-monospace,Consolas,monospace';
      ctx.fillText('WARDEN '+(run.bossKilled?'DOWN':'ACTIVE ABOVE 7 km'), W-24, yy); }
  }

  /* warnings */
  ctx.textAlign='center';
  if(R.fuel<=0 && !R.dead){ pulse('OUT OF FUEL', '#ff5f6d', t, H*0.24); }
  else if(R.fuel/STATS.fuel < 0.18) pulse('LOW FUEL', '#ff9a3c', t, H*0.24);
  if(R.hp/R.maxhp < 0.28 && !R.dead) pulse('HULL CRITICAL', '#ff5f6d', t, H*0.29);

  /* tutorial prompt */
  if(run.tutorial && tutStep < TUT_STEPS.length){
    const txt = TUT_STEPS[tutStep].text.replace(/<[^>]+>/g,'');
    ctx.font='900 17px "Segoe UI",Roboto,sans-serif';
    const wpx = ctx.measureText(txt).width;
    ctx.fillStyle='rgba(6,10,20,.78)'; rr(ctx, W/2-wpx/2-20, H*0.13-24, wpx+40, 42, 12); ctx.fill();
    ctx.strokeStyle='#54d8ff'; ctx.lineWidth=1.4; rr(ctx, W/2-wpx/2-20, H*0.13-24, wpx+40, 42, 12); ctx.stroke();
    ctx.fillStyle='#dff1ff'; ctx.fillText(txt, W/2, H*0.13+4);
    ctx.fillStyle='#54d8ff'; ctx.font='800 11px ui-monospace,Consolas,monospace';
    ctx.fillText('OBJECTIVE '+(tutStep+1)+' / '+TUT_STEPS.length, W/2, H*0.13-32);
  }
  ctx.restore();
}
function bar(x,y,w,label,v,col,valTxt){
  ctx.textAlign='left'; ctx.fillStyle='#7d90b8'; ctx.font='800 10px ui-monospace,Consolas,monospace';
  ctx.fillText(label, x, y-5);
  ctx.fillStyle='rgba(255,255,255,.10)'; rr(ctx,x,y,w,10,5); ctx.fill();
  ctx.fillStyle=col; rr(ctx,x,y,Math.max(2,w*clamp(v,0,1)),10,5); ctx.fill();
  ctx.textAlign='right'; ctx.fillStyle='#c9d8f5'; ctx.font='700 10px ui-monospace,Consolas,monospace';
  ctx.fillText(valTxt, x+w, y-5);
}
function pulse(txt,col,t,y){
  const a = 0.55+0.45*Math.sin(t*7);
  ctx.globalAlpha=a; ctx.fillStyle=col; ctx.font='900 20px "Segoe UI",Roboto,sans-serif';
  ctx.fillText(txt, W/2, y); ctx.globalAlpha=1;
}
function drawCountdown(t){
  const n = Math.ceil(countT - 0.05);
  ctx.save(); ctx.textAlign='center';
  const label = n>0 ? String(n) : 'LIFTOFF';
  const frac = n>0 ? (countT%1) : clamp(countT+0.05,0,1);
  ctx.globalAlpha = clamp(frac*1.6,0,1);
  ctx.fillStyle= n>0 ? '#ffd782' : '#7cf0a8';
  ctx.font='900 '+Math.round(clamp(70+ (1-frac)*40, 60, 150))+'px ui-monospace,Consolas,monospace';
  ctx.shadowColor= n>0 ? 'rgba(255,170,60,.7)':'rgba(90,255,150,.7)'; ctx.shadowBlur=30;
  ctx.fillText(label, W/2, H*0.42);
  ctx.shadowBlur=0; ctx.globalAlpha=1;
  ctx.fillStyle='#9fb3d9'; ctx.font='800 13px ui-monospace,Consolas,monospace';
  ctx.fillText(run.tutorial ? 'TRAINING SORTIE · NO DAMAGE' : 'SORTIE ACTIVE', W/2, H*0.42+38);
  ctx.restore();
}

/* =========================================================================
   ATTRACT MODE (title / hangar backdrop)
   ========================================================================= */
let attract = { t:0, rocks:[] };
function initAttract(){
  attract.rocks = [];
  for(let i=0;i<9;i++) attract.rocks.push(makeAsteroid(rnd(-W,W), rnd(-H*2, H), rnd(0.5,1.8)));
}
function updateAttract(dt){
  attract.t += dt;
  for(const r of attract.rocks){
    r.y += 34*dt + r.size*10*dt; r.x += r.vx*dt*0.3; r.rot += r.spin*dt;
    if(r.y > camLikeY() + H) { r.y = camLikeY() - H - rnd(60,400); r.x = rnd(-W,W); }
  }
}
function camLikeY(){ return -attract.t*40; }
function drawAttract(){
  const alt = clamp(attract.t*22 % 9000, 0, 9000);
  cam = cam || {x:0,y:0,zoom:1};
  const savedCam = cam;
  cam = { x:0, y:camLikeY(), zoom:1 };
  drawSpaceBG(alt, attract.t);
  drawEarthLimb(alt);
  ctx.save(); ctx.translate(W/2, H/2); ctx.translate(-cam.x, -cam.y);
  for(const r of attract.rocks) drawEnemy(r, attract.t);
  // hero rocket drifting upward
  ctx.save();
  const hx = Math.sin(attract.t*0.35)*W*0.16;
  const hy = cam.y + Math.cos(attract.t*0.27)*H*0.10;
  ctx.translate(hx, hy);
  ctx.rotate(Math.sin(attract.t*0.5)*0.14);
  ctx.scale(1.5,1.5);
  drawRocket(ctx, P.build, attract.t, {flame:0.9, shield:1,
    stages:['a','b'].map(sl=>P.stages[sl]).filter(id=>id&&P.owned.includes(id))
      .map((id,i)=>({id, active:i===0, frac:1, guns:stageGunList(id===P.stages.a?'a':'b')}))});
  ctx.restore();
  ctx.restore();
  cam = savedCam;
}

/* =========================================================================
   MAIN LOOP
   ========================================================================= */
let last = performance.now();
let frameErrs = 0;
function frame(now){
  const dt = Math.min(0.034, (now-last)/1000); last = now;
  try{
    update(dt); draw(dt);
  }catch(e){                       // a draw bug must never black-screen the whole game
    frameErrs++;
    if(frameErrs <= 3) console.error('[frame error]', e);
    if(frameErrs === 30) toast('⚠ A drawing glitch was caught and skipped — the game kept running (see console).');
  }
  requestAnimationFrame(frame);
}
function update(dt){
  if(P.dev){ if(P.dev.rp) P.rp = 999999; if(P.dev.rs) P.rs = 99999; }
  if(mode==='countdown'){
    const prev = Math.ceil(countT-0.05);
    countT -= dt;
    const cur = Math.ceil(countT-0.05);
    if(cur !== prev) Snd.countdown(cur);
    // build up flame + shake
    const f = 1 - clamp(countT,0,3)/3;
    Snd.thrustLevel(0.25+f*0.5);
    if(countT < 1.2) shake = Math.max(shake, 2+f*3);
    for(let i=0;i<3;i++){
      const bx = R.x, by = R.y + R.L.H/2;
      parts.push({x:bx+rnd(-6,6),y:by,vx:rnd(-70,70),vy:rnd(60,240),life:rnd(0.2,0.6),max:0.6,r:rnd(3,8),col:'exhaust',g:0});
      if(Math.random()<0.4) parts.push({x:bx+rnd(-20,20),y:by+rnd(0,10),vx:rnd(-90,90),vy:rnd(-20,60),life:rnd(0.8,1.8),max:1.8,r:rnd(8,20),col:'smoke',g:-8});
    }
    updateParticles(dt);
    cam.x = lerp(cam.x, R.x, dt*3); cam.y = lerp(cam.y, R.y - (H*0.16), dt*3); cam.zoom = lerp(cam.zoom,1,dt*2);
    if(countT <= -0.35){ mode = run.tutorial ? 'tutplay' : 'play'; Snd.tone(660,0.4,'square',0.1,990); }
    if(toastT>0){ toastT-=dt; if(toastT<=0) document.getElementById('toast').classList.remove('on'); }
    return;
  }
  if(mode==='play' || mode==='tutplay' || mode==='dead'){ updateFlight(dt); return; }
  if(mode==='title' || mode==='build' || mode==='shop' || mode==='paused' || mode==='summary'){
    updateAttract(dt);
    if(toastT>0){ toastT-=dt; if(toastT<=0) document.getElementById('toast').classList.remove('on'); }
  }
}
/* engine master-switch button (E) */
const engBtn = document.getElementById('btn-eng');
function syncEngBtn(){
  const flight = !!R && (mode==='play'||mode==='tutplay'||mode==='countdown');
  engBtn.style.display = flight? 'flex':'none';
  if(!flight) return;
  const on = !!R.engOn;
  if(engBtn.dataset.on !== String(on)){
    engBtn.dataset.on = String(on);
    engBtn.textContent = on? '🔥 ENGINE ON' : '⏻ ENGINE CUT';
    engBtn.classList.toggle('off', !on);
  }
}
engBtn.addEventListener('click', ()=>{ toggleEngine(); });

/* ---------------- pilot name + local leaderboard ---------------------- */
const BOARD_KEY = 'rocket_ascent_board_v1';
function loadBoard(){ try{ return JSON.parse(localStorage.getItem(BOARD_KEY)||'[]'); }catch(e){ return []; } }
function pushBoard(){
  const b = loadBoard();
  b.push({ n:(P.name||'PILOT'), rp:Math.round(P.rp), rs:Math.round(P.rs),
           d:Math.round(run.dist||0), a:Math.round(run.maxAlt||0), t:Date.now() });
  b.sort((x,y)=>y.d-x.d);
  try{ localStorage.setItem(BOARD_KEY, JSON.stringify(b.slice(0,10))); }catch(e){}
  P.distBest = Math.max(P.distBest||0, Math.round(run.dist||0)); save();
}
function renderBoard(){
  const el = document.getElementById('board-rows'); if(!el) return;
  let b = loadBoard();
  if(!b.length) b = [{ n:(P.name||'PILOT'), rp:Math.round(P.rp), rs:Math.round(P.rs),
                       d:Math.round(P.distBest||0), a:Math.round(P.best||0), live:true }];
  el.innerHTML = b.slice(0,8).map((e,i)=>
    '<div class="brow'+(e.live?' live':'')+'"><span class="brk">'+(i+1)+'</span>'+
    '<span class="bn">'+(e.n||'PILOT')+'</span><span class="brp">'+fmt(e.rp)+' RP</span>'+
    '<span class="brs">'+fmt(e.rs)+' RS</span><span class="bd">'+fmt(e.d)+' m</span></div>').join('');
}
const _showBase = show;
show = function(s){ _showBase(s); if(s==='title') renderBoard(); };
const inpName = document.getElementById('inp-name');
inpName.value = P.name||'';
inpName.addEventListener('input', ()=>{
  P.name = inpName.value.replace(/[<>]/g,'').slice(0,14);
  if(inpName.value !== P.name) inpName.value = P.name;
  save(); renderBoard();
});
inpName.addEventListener('keydown', e=>{ if(e.key==='Enter') inpName.blur(); });

/* ---------------- developer console (F1) ------------------------------- */
const devBox = document.getElementById('devbox');
function devGrantParts(){
  P.devGranted = P.devGranted || [];
  P.devSnap = P.owned.slice();          // remember the real inventory for revoke
  Object.keys(PARTS).forEach(id=>{ if(!P.owned.includes(id)){ P.owned.push(id); P.devGranted.push(id); } });
  if(typeof SKINS!=='undefined'){ P.skinsOwned = SKINS.map(s=>s.id); }
  P.ammo = { heavy:3, velocity:3, feed:3, ap:2, split:2, frag:2, seeker:1 };
}
function devRevokeParts(){
  const snap = Array.isArray(P.devSnap) && P.devSnap.length ? P.devSnap : null;
  const g = P.devGranted || [];
  if(snap){ P.owned = snap.slice(); P.devSnap = []; }
  else if(g.length){ P.owned = P.owned.filter(id=>!g.includes(id)); }
  else return;
  const d = defaultProfile();
  for(const c of ['nose','tank','engine','fins','weapon','module','hull','chute'])
    if(P.build[c] && !P.owned.includes(P.build[c])) P.build[c] = d.build[c];
  for(const sl of ['a','b']){
    if(P.stages[sl] && !P.owned.includes(P.stages[sl])) P.stages[sl] = null;
    P.sguns[sl] = (P.sguns[sl]||[]).filter(x=>x && P.owned.includes(x));
  }
  P.devGranted = [];
}
function renderDevBox(){
  devBox.querySelectorAll('[data-dev]').forEach(b=>{
    const on = !!(P.dev && P.dev[b.dataset.dev]);
    b.textContent = on? 'ON':'OFF';
    b.classList.toggle('on', on);
  });
}
function toggleDevPanel(){
  const open = devBox.style.display === 'block';
  devBox.style.display = open? 'none':'block';
  if(!open){ renderDevBox(); Snd.tone(880,0.07,'square',0.06); }
}
function syncDevUI(){   // repaint whatever is on screen, instantly (hangar id is 'build')
  refreshAllUI();
  if(curScreen==='title') renderBoard();
}
devBox.querySelectorAll('[data-dev]').forEach(b=>{
  b.addEventListener('click', ()=>{
    const k = b.dataset.dev;
    P.dev = P.dev || { parts:false, nodmg:false, fuel:false, rp:false, rs:false };
    const nv = !P.dev[k]; P.dev[k] = nv;
    if(k==='parts'){
      if(nv){ devGrantParts(); toast('🔓 <b>ALL PARTS UNLOCKED</b> — ammo maxed'); }
      else { devRevokeParts(); toast('🔒 Dev parts revoked — back to your real inventory'); }
    }
    if(k==='rp'){ P.rp = nv? 999999 : 0; toast(nv? '💰 Infinite RP pinned':'💰 RP reset to 0'); }
    if(k==='rs'){ P.rs = nv? 99999 : 0; toast(nv? '🔬 Infinite RS pinned':'🔬 RS reset to 0'); }
    save(); renderDevBox(); syncDevUI();
  });
});
document.getElementById('dev-zero').addEventListener('click', ()=>{
  P.dev.rp = false; P.dev.rs = false;   // drop the pins first…
  P.rp = 0; P.rs = 0;                   // …then zero the balances and nothing else
  save(); renderDevBox(); syncDevUI();
  toast('🧹 Points cleared — parts, missions and records untouched');
});
if(!Store.ok) setTimeout(()=>toast('⚠ <b>Storage is blocked here</b> — progress lasts only this session. Download index.html or use the desktop app to keep it.'), 900);

function draw(dt){
  const t = performance.now()/1000;
  syncEngBtn();
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0,0,W,H);
  if(mode==='title' || mode==='summary' || !R || !cam){ drawAttract(); return; }
  if(mode==='build'){ drawPreview(t); return; }
  if(mode==='shop'){ return; }
  drawWorld(t, dt);
  if(mode==='paused'){ ctx.fillStyle='rgba(3,6,14,.55)'; ctx.fillRect(0,0,W,H); }
}
function drawWorld(t, dt){
  const alt = run ? altitudeOf(R.y) : 0;
  ctx.save();
  const sx = shake>0 ? rnd(-shake,shake) : 0, sy = shake>0 ? rnd(-shake,shake) : 0;
  drawSpaceBG(run?run.maxAlt:0, t);
  drawEarthLimb(alt);
  ctx.translate(W/2 + sx, H/2 + sy);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
  drawCloudLayer();
  drawGroundLayer();
  drawEntities(t);
  if(R && !R.dead){
    ctx.save();
    ctx.translate(R.x, R.y); ctx.rotate(R.angle);
    if(R.invuln>0 && Math.floor(R.invuln*22)%2===0) ctx.globalAlpha=0.45;
    const act = R.stages.find(s=>s.attached);
    if(R.chute){   // drawn in rocket-local coords (context is translated+rotated)
      const cp = PARTS[R.chute], cw = 40 + (150-cp.limit)*0.35;
      const cy = -stackH()/2 - 74;
      ctx.save(); ctx.rotate(-R.angle);
      ctx.fillStyle = R.chute==='chute-feather'? '#ffd0e2' : R.chute==='chute-brake'? '#bfe3ff' : '#ffe9b8';
      ctx.beginPath(); ctx.arc(0, cy, cw, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(18,24,38,.75)'; ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(-cw, cy); ctx.lineTo(-5, cy+72);
      ctx.moveTo(cw, cy); ctx.lineTo(5, cy+72);
      ctx.moveTo(0, cy); ctx.lineTo(0, cy+72);
      ctx.stroke(); ctx.restore();
    }
    drawRocket(ctx, P.build, t, {flame:R.thrust, shield:R.maxshield>0?1:0,
                                 shieldFlash:R.invuln>0?0.16:0, hitFlash:R.hitFlash*0.5,
                                 stages: R.stages.filter(s=>s.attached).map(s=>({
                                   id:s.id, active:s===act, frac:s.fuel/s.max,
                                   guns:s.guns.map(g=>g.id) }))});
    ctx.restore();
  }
  ctx.restore();
  if(flash>0){ ctx.fillStyle='rgba(255,240,220,'+clamp(flash*0.5,0,0.6)+')'; ctx.fillRect(0,0,W,H); }
  // atmosphere tint when very fast / low
  if(run && alt<700){ ctx.fillStyle='rgba(120,180,255,'+(0.05*(1-alt/700))+')'; ctx.fillRect(0,0,W,H); }
  if(run) drawHUD(t);
  if(mode==='countdown') drawCountdown(t);
}

/* =========================================================================
   END OF FLIGHT / REWARDS
   ========================================================================= */
function endFlight(reason){
  if(run && !run.tutorial && !run.over) pushBoard();
  if(mode==='summary') return;
  mode='summary'; Snd.thrustOff(); Snd.thrustLevel(0);
  const alt = run.maxAlt;
  const mult = STATS.rpMult, smult = STATS.rsMult;
  const recovered = /TOUCHDOWN|COMPLETE/.test(reason);
  const altRP = run.tutorial ? 0 : Math.round(alt/6 * mult);
  const altRS = run.tutorial ? 0 : Math.round(alt/28 * smult);
  const recBonus = (recovered && !run.tutorial) ? Math.round((run.rp + altRP)*0.25) : 0;
  run.rp += altRP + recBonus; run.rs += altRS;
  P.rp += run.rp; P.rs += run.rs; P.totalRP += run.rp; P.totalRS += run.rs;
  P.flights++; P.kills += run.kills;
  P.best = Math.max(P.best, Math.round(alt));
  save();

  const mm = run.missions.length;
  const goal = MISSIONS.find(x=>!P.missions.includes(x.id));
  document.getElementById('sum-panel').innerHTML =
    '<h2>'+(run.tutorial?'FLIGHT SCHOOL COMPLETE':(recovered?'FLIGHT COMPLETE':'VEHICLE LOST'))+'</h2>'+
    '<div class="muted" style="font-size:12.5px;letter-spacing:.1em;text-transform:uppercase">'+(run.tutorial?'TRAINING SORTIE · NO DAMAGE SUSTAINED':reason)+'</div>'+
    '<div class="sumgrid">'+
      s('Altitude', fmt(alt)+' m', alt>=P.best && alt>0 ? ' ★ NEW BEST':'')+
      s('Targets', fmt(run.kills), '')+
      s('Flight time', run.t.toFixed(1)+' s', '')+
      s('Damage taken', fmt(run.dmgTaken), '')+
      s('Fuel collected', run.fuelGot, '')+
      s('Shots fired', run.shots, run.shots? ' · '+Math.round(run.hits/run.shots*100)+'% hit':'')+
      (run.stagesDropped? s('Stages dropped', run.stagesDropped, ' · clean separations'):'')+
    '</div>'+
    '<div class="reward"><i class="dot rp"></i><div style="flex:1"><b class="rp-c">'+fmt(run.rp)+' Rocket Points</b>'+
      '<div class="muted" style="font-size:11.5px">targets + pickup haul '+fmt(run.rp-altRP-recBonus)+' · altitude '+fmt(altRP)+
      (recBonus? ' · recovery bonus '+fmt(recBonus):'')+'</div></div></div>'+
    '<div class="reward" style="background:linear-gradient(90deg,rgba(192,123,255,.12),transparent);border-color:#3d2a5a">'+
      '<i class="dot rs"></i><div style="flex:1"><b class="rs-c">'+fmt(run.rs)+' Rocket Science</b>'+
      '<div class="muted" style="font-size:11.5px">science multiplier x'+smult.toFixed(2)+' from your module &amp; nose</div></div></div>'+
    (mm? '<div class="reward" style="background:linear-gradient(90deg,rgba(89,224,138,.12),transparent);border-color:#1e4a33">'+
      '<span style="font-size:18px">✅</span><div style="flex:1"><b style="color:#7cf0a8">'+mm+' contract'+(mm>1?'s':'')+' completed</b>'+
      '<div class="muted" style="font-size:11.5px">'+run.missions.map(x=>x.name).join(', ')+'</div></div></div>':'')+
    (run.tutorial? '<div class="reward"><span style="font-size:18px">🎓</span><div style="flex:1"><b>Graduation bonus</b>'+
      '<div class="muted" style="font-size:11.5px">+220 RP · +12 Rocket Science added to your account</div></div></div>':'')+
    (goal? '<div class="muted" style="margin-top:12px;font-size:12.5px">Next contract: <b style="color:#ffd782">'+goal.name+
      '</b> — '+goal.desc+'</div>':'')+
    '<div class="rowBtns">'+
    (run.level
      ? (run.levelDone && run.level<100 ? '<button class="btn primary" id="sum-next">▶ NEXT LEVEL '+(run.level+1)+'</button>' : '')
        + '<button class="btn '+(run.levelDone?'ghost':'primary')+'" id="sum-retry">'+(run.levelDone?'RETRY LEVEL':'RETRY LEVEL '+run.level)+'</button>'
        + '<button class="btn ghost" id="sum-hangar">Back to Hangar</button>'
      : '<button class="btn primary" id="sum-again">Fly Again</button>'+
        '<button class="btn ghost" id="sum-hangar">Back to Hangar</button>')+
    '</div>';
  if(document.getElementById('sum-again'))
    document.getElementById('sum-again').onclick = ()=>{ Snd.init(); newRun(run.tutorial && !P.tutDone); };
  if(document.getElementById('sum-next'))
    document.getElementById('sum-next').onclick = ()=>{ Snd.init(); startLevel(run.level+1); };
  if(document.getElementById('sum-retry'))
    document.getElementById('sum-retry').onclick = ()=>{ Snd.init(); startLevel(run.level); };
  document.getElementById('sum-hangar').onclick = ()=>gotoBuild();
  show('sum');
  if(!run.tutorial) Snd.tone(recovered?520:180, 0.5, recovered?'triangle':'sawtooth', 0.12, recovered?880:70);
}
function s(lbl,val,note){ return '<div><div class="lbl">'+lbl+'</div><div class="val">'+val+
  (note?'<span style="font-size:11px;color:#ffd782">'+note+'</span>':'')+'</div></div>'; }

/* =========================================================================
   NAVIGATION
   ========================================================================= */
function gotoBuild(){
  mode='build'; Snd.thrustOff(); show('build'); renderHangar();
  const r = pv.getBoundingClientRect();
  pv.width = Math.max(2,Math.floor(r.width*DPR)); pv.height = Math.max(2,Math.floor(r.height*DPR));
  pvx.setTransform(DPR,0,0,DPR,0,0);
  initAttract();
}
function gotoTitle(){
  mode='title'; Snd.thrustOff(); show('title'); renderTitleBest(); initAttract();
}
function renderTitleBest(){
  document.getElementById('title-best').innerHTML =
    '<div class="chip">BEST ALTITUDE <b>'+fmt(P.best)+' m</b></div>'+
    '<div class="chip"><i class="dot rp"></i><b class="rp-c">'+fmt(P.rp)+'</b></div>'+
    '<div class="chip"><i class="dot rs"></i><b class="rs-c">'+fmt(P.rs)+'</b></div>'+
    '<div class="chip">FLIGHTS <b>'+P.flights+'</b></div>'+
    '<div class="chip">KILLS <b>'+fmt(P.kills)+'</b></div>'+
    (isApp?'<div class="chip" style="border-color:#1e4a33;color:#7cf0a8">🖥 DESKTOP APP · OFFLINE</div>':'');
}

/* ---------------- tutorial slides ---------------- */
const SLIDES = [
  { t:'Welcome to Rocket Ascent', b:`
    <p>You are the <b>chief engineer</b> of a two-person space programme (you, and a very patient cat).
    Every flight earns two currencies:</p>
    <ul>
      <li><b class="rp-c">◆ Rocket Points (RP)</b> — money. Destroy targets, grab canisters, fly high.</li>
      <li><b class="rs-c">✦ Rocket Science (RS)</b> — research. Rarer. Unlocks the exotic hardware.</li>
    </ul>
    <p>Spend them in the <b>Hangar</b> to unlock parts, then bolt them to your rocket. What you equip
    is exactly what flies — the rocket is drawn from your loadout.</p>` },
  { t:'The Hangar', b:`
    <p>Seven racks of hardware: <b>Nose · Tank · Engine · Fins · Weapon · Module · Hull</b>.</p>
    <ul>
      <li><b>Locked</b> parts show a price in RP and/or RS. Click <b>Unlock</b> when you can afford it — it auto-installs.</li>
      <li><b>Engine</b> gives thrust, <b>Tank</b> gives fuel, and both add <b>mass</b>.</li>
      <li>Watch the <b>TWR</b> bar: below <b>1.00</b> your rocket is too heavy to lift off. Upgrade the engine or drop mass.</li>
      <li><b>Fins</b> = agility, <b>Nose</b> = drag, <b>Hull</b> = hit points &amp; shield, <b>Module</b> = reward multipliers.</li>
    </ul>` },
  { t:'Flying', b:`
    <div class="keyhint">
      <div class="kh"><span class="kbd">A</span> tilt left</div>
      <div class="kh"><span class="kbd">D</span> tilt right</div>
      <div class="kh"><span class="kbd">SHIFT</span> throttle up</div>
      <div class="kh"><span class="kbd">CTRL</span> throttle down</div>
      <div class="kh"><span class="kbd">E</span> engine on / cut</div>
      <div class="kh"><span class="kbd">SPACE</span> fire weapon</div>
      <div class="kh"><span class="kbd">P</span> pause</div>
      <div class="kh"><span class="kbd">M</span> mute</div>
    </div>
    <ul>
      <li>Your <b>engine burns automatically</b> while fuel lasts — you only steer. Tilt to change direction;
        the <b>throttle</b> (bottom-right gauge) sets how hard it burns: hold <b>SHIFT</b> for more thrust,
        <b>CTRL</b> for less. High throttle climbs faster but drinks fuel — and
          thrust always pushes along the nose. Press <b>E</b> (or the bottom-center button)
          to cut the engine completely and coast — handy for diving and soft landings.</li>
      <li><b>Fuel</b> is your clock. Grab blue canisters to extend the burn.</li>
      <li>Thin air up high means less drag — you get <i>fast</i>. Don't hit the ground fast.</li>
      <li>Land gently (low speed) after passing 120 m for a <b>+25% recovery bonus</b>.</li>
    </ul>` },
  { t:'Hazards &amp; Loot', b:`
    <ul>
      <li>🪨 <b>Asteroids</b> — thick, slow, drop RP. Shooting them beats ramming them.</li>
      <li>🛸 <b>Drones &amp; saucers</b> — they shoot back. Strafe and lead your shots.</li>
      <li>👁 <b>The Warden</b> — a boss that appears above <b>12,000 m</b>. Big payout.</li>
      <li>Pickups: <span style="color:#54d8ff">fuel</span>, <span style="color:#59e08a">repair</span>,
          <span style="color:#ffb03a">RP</span>, <span style="color:#c07bff">RS</span>. They drift toward you when close.</li>
      <li>Contracts on the right of the HUD pay big one-time bonuses.</li>
    </ul>` },
  { t:'Practice Flight', b:`
    <p>Let's do it for real — in a <b>safe training corridor</b>.</p>
    <ul>
      <li>Four short objectives: steer, climb, shoot, refuel.</li>
      <li><b>You cannot be destroyed</b> during training.</li>
      <li>Graduating pays <b class="rp-c">220 RP</b> and <b class="rs-c">12 RS</b> — enough to start upgrading.</li>
    </ul>
    <p class="muted">Prefer to just fly? Skip it — the tutorial is always available from the hangar.</p>` }
];
let slide = 0;
function renderSlide(){
  document.getElementById('tut-title').innerHTML = SLIDES[slide].t;
  document.getElementById('tut-body').innerHTML = SLIDES[slide].b;
  document.getElementById('tut-step').textContent = (slide+1)+'/'+SLIDES.length;
  document.getElementById('tut-dots').innerHTML = SLIDES.map((s,i)=>'<i class="'+(i<=slide?'on':'')+'"></i>').join('');
  document.getElementById('btn-tut-prev').style.visibility = slide===0?'hidden':'visible';
  document.getElementById('btn-tut-next').textContent = slide===SLIDES.length-1 ? '🚀 Start Practice' : 'Next →';
}
function startTutorial(){ slide=0; mode='title'; show('tut'); renderSlide(); }

/* =========================================================================
   WIRING
   ========================================================================= */
document.getElementById('btn-play').onclick = ()=>{
  Snd.init(); Snd.tone(520,0.1,'triangle',0.1,780);
  if(!P.seenIntro && !P.tutDone){ P.seenIntro=true; save(); show('first'); mode='title'; }
  else gotoBuild();
};
document.getElementById('btn-tut-title').onclick = ()=>{ Snd.init(); startTutorial(); };
document.getElementById('btn-first-tut').onclick = ()=>{ startTutorial(); };
document.getElementById('btn-first-skip').onclick = ()=>{ P.tutDone = P.tutDone; P.seenIntro=true; save(); gotoBuild(); };
document.getElementById('btn-tut2').onclick = ()=>{ startTutorial(); };
document.getElementById('btn-shop').onclick = ()=>{ Snd.init(); gotoShop(); };
document.getElementById('btn-shop-hangar').onclick = ()=>gotoBuild();
document.getElementById('stab-buy').onclick = ()=>{ shopTab='buy'; renderShop(); Snd.tone(520,0.06,'triangle',0.07); };
document.getElementById('stab-up').onclick  = ()=>{ shopTab='up';  renderShop(); Snd.tone(520,0.06,'triangle',0.07); };
document.getElementById('stab-stage').onclick= ()=>{ shopTab='stage'; renderShop(); Snd.tone(520,0.06,'triangle',0.07); };
document.getElementById('stab-ammo').onclick = ()=>{ shopTab='ammo'; renderShop(); Snd.tone(520,0.06,'triangle',0.07); };
document.getElementById('stab-chute').onclick= ()=>{ shopTab='chute'; renderShop(); Snd.tone(520,0.06,'triangle',0.07); };
document.getElementById('stab-ship').onclick = ()=>{ shopTab='ship'; renderShop(); Snd.tone(520,0.06,'triangle',0.07); };
document.getElementById('btn-title').onclick = ()=>{ gotoTitle(); };
document.getElementById('btn-tut-prev').onclick = ()=>{ if(slide>0){ slide--; renderSlide(); Snd.tone(420,0.06,'triangle',0.07);} };
document.getElementById('btn-tut-next').onclick = ()=>{
  Snd.tone(660,0.08,'triangle',0.09);
  if(slide < SLIDES.length-1){ slide++; renderSlide(); }
  else { P.seenIntro=true; save(); newRun(true); show('none'); }
};
document.getElementById('btn-tut-quit').onclick = ()=>{ P.seenIntro=true; save(); gotoBuild(); };
document.getElementById('btn-launch').onclick = ()=>{
  Snd.init();
  refreshStats();
  const ltwr = launchTWR();
  if(ltwr < 1.0){
    Snd.deny();
    toast('⚠ Liftoff <b>TWR '+ltwr.toFixed(2)+'</b> — too heavy to leave the pad. Fit a booster, a stronger engine, or shed mass.');
    return;
  }
  newRun(false); show('none');
};
document.getElementById('btn-resume').onclick = ()=>togglePause();
document.getElementById('btn-abort').onclick = ()=>{ mode='play'; show('none'); endFlight('FLIGHT ABORTED BY PILOT'); };
document.getElementById('btn-mute').onclick = ()=>{ Snd.init(); Snd.setMuted(!P.muted); };
document.getElementById('btn-reset').onclick = ()=>{
  if(confirm('Reset all progress, parts and currency?')){
    P = defaultProfile(); P.seenIntro=true; P.tutDone=true; save(); renderHangar(); toast('Save reset');
  }
};

/* =========================================================================
   FULLSCREEN (browser Fullscreen API, or the desktop app's native window)
   ========================================================================= */
const isApp = !!(window.electronAPI && window.electronAPI.isApp);
let appFs = false;
function fsActive(){ return isApp ? appFs : !!(document.fullscreenElement || document.webkitFullscreenElement); }
function toggleFullscreen(){
  Snd.init();
  if(isApp){ window.electronAPI.toggleFullscreen(); return; }
  const el = document.documentElement;
  if(fsActive()){
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    if(ex) ex.call(document);
  } else {
    const rq = el.requestFullscreen || el.webkitRequestFullscreen;
    if(rq){ const pr = rq.call(el); if(pr && pr.catch) pr.catch(()=>toast('Fullscreen was blocked by the browser')); }
  }
}
function syncFs(){
  const on = fsActive();
  document.querySelectorAll('[data-fsbtn]').forEach(b2=>{
    b2.textContent = b2.hasAttribute('data-fsicon') ? (on?'🗗':'⛶') : (on?'🗗 Exit Fullscreen':'⛶ Fullscreen');
  });
}
document.addEventListener('fullscreenchange', syncFs);
document.addEventListener('webkitfullscreenchange', syncFs);
if(isApp) window.electronAPI.onFullscreenChange(v=>{ appFs = v; syncFs(); });
document.querySelectorAll('[data-fsbtn]').forEach(b2=>{ b2.onclick = ()=>toggleFullscreen(); });

/* =========================================================================
   BOOT
   ========================================================================= */
resize(); makeStars(); makeClouds(); initAttract(); renderTitleBest(); renderHangar();
Snd.setMuted(!!P.muted);
syncFs();
document.getElementById('btn-mute').textContent = P.muted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
requestAnimationFrame(frame);
