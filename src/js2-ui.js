
/* =========================================================================
   CANVAS / SCREEN PLUMBING
   ========================================================================= */
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const pv = document.getElementById('pv');
const pvx = pv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize(){
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.floor(W*DPR); cv.height = Math.floor(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const r = pv.getBoundingClientRect();
  pv.width = Math.max(2,Math.floor(r.width*DPR)); pv.height = Math.max(2,Math.floor(r.height*DPR));
  pvx.setTransform(DPR,0,0,DPR,0,0);
  makeStars();
}
window.addEventListener('resize', resize);

const SCR = {
  title:  document.getElementById('scr-title'),
  first:  document.getElementById('scr-first'),
  tut:    document.getElementById('scr-tut'),
  build:  document.getElementById('scr-build'),
  pause:  document.getElementById('scr-pause'),
  sum:    document.getElementById('scr-sum'),
  shop:   document.getElementById('scr-shop')
};
let curScreen = 'title';
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

let toastT = 0;
function toast(msg, ms){
  const el = document.getElementById('toast');
  el.innerHTML = msg; el.classList.add('on');
  toastT = (ms||2200)/1000;
}

/* =========================================================================
   ROCKET LAYOUT + DRAWING (procedural from equipped parts)
   ========================================================================= */
function layout(b){
  const V = id => (PARTS[id] && typeof PARTS[id].vis !== 'undefined') ? PARTS[id].vis : {};
  let nose=V(b.nose)||{}, tank=V(b.tank)||{}, eng=V(b.engine)||{},
      fin=V(b.fins)||{}, mod=V(b.module), hull=V(b.hull)||{}, mis=V(b.missile)||{};
  /* ship skin: recolour the airframe (livery only — stats never change) */
  const SK = skinOf();
  if(SK){
    const pt = SK.paint || {};
    nose = Object.assign({}, nose, pt.nose?{color:pt.nose}:null, pt.tip?{tip:pt.tip}:null);
    tank = Object.assign({}, tank, pt.tank?{color:pt.tank}:null, pt.stripe?{stripe:pt.stripe}:null);
    fin  = Object.assign({}, fin,  pt.fin?{color:pt.fin}:null);
    eng  = Object.assign({}, eng,  pt.flame?{flame:pt.flame}:null);
    hull = Object.assign({}, hull, pt.hull?{color:pt.hull}:null);
  }
  const msl = mis;
  const R = 13 + (tank.w||0)*1.6;
  const modH = mod ? (mod.h||0) : 0;              // vis:null (Empty Bay) = no module, not NaN
  const H = (nose.h||0) + modH + (tank.h||0) + (eng.h||0) || 80;
  return { R, H, nose, tank, eng, fin, mod, hull, msl, modH,
           yNose:-H/2, yMod:-H/2+nose.h, yTank:-H/2+nose.h+modH, yEng:-H/2+nose.h+modH+tank.h, yBot:H/2 };
}
function skinOf(id){
  const want = id || (typeof P!=='undefined' && P.skin);
  return (typeof SKINS!=='undefined') && (SKINS.find(s=>s.id===want) || SKINS[0]) || null;
}
function rr(c,x,y,w,h,r){
  r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);
  c.beginPath();
  c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
  c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
  c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath();
}
/* draws rocket centred at origin, nose up (-y). flame 0..1, t = time */
function drawRocket(c, b, t, opt){
  opt = opt || {};
  const L = layout(b);
  const flame = opt.flame === undefined ? 1 : opt.flame;
  const coreFlame = (opt.stages && opt.stages.length) ? 0 : flame;
  const R = L.R;
  const SK = (typeof skinOf === 'function') ? skinOf() : null;
  const SHUTTLE = !!(SK && SK.shape === 'shuttle');
  /* Shuttle stack: orbiter sits on the LEFT, big tank on the RIGHT,
     boosters straddle the tank's middle. (All in local coords, nose up.) */
  const ETC = SHUTTLE ? (R + 26) : 0;        // external-tank centre
  const SX  = SHUTTLE ? -(ETC + 3) : 0;      // orbiter pushed to the left

  c.save();
  if(SHUTTLE) c.translate(SX, 0);            // slide the orbiter over
  /* ---- exhaust flame ---- */
  if(coreFlame > 0.02){
    const fc = L.eng.flame || '#ffbe5c', n = L.eng.nozzles || 1, sz = L.eng.size || 1;
    for(let i=0;i<n;i++){
      const off = n===1 ? 0 : (i-(n-1)/2) * (R*1.05/Math.max(1,n-1))*1.15;
      const flick = 0.82 + Math.sin(t*41 + i*2.1)*0.1 + Math.random()*0.12;
      const len = (26 + 46*coreFlame) * sz * flick;
      const w = (6.5*sz) * (0.85+0.3*coreFlame);
      const x0 = off, y0 = L.yBot - 1;
      const g = c.createLinearGradient(0,y0,0,y0+len);
      g.addColorStop(0,'#ffffff'); g.addColorStop(0.2,fc);
      g.addColorStop(0.6, shade(fc,-0.35));
      g.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=g;
      c.beginPath(); c.moveTo(x0-w,y0);
      c.quadraticCurveTo(x0-w*0.55, y0+len*0.55, x0, y0+len);
      c.quadraticCurveTo(x0+w*0.55, y0+len*0.55, x0+w, y0);
      c.closePath(); c.fill();
      c.globalAlpha=0.5; c.fillStyle='#fff';
      c.beginPath(); c.ellipse(x0, y0+len*0.16, w*0.42, len*0.16, 0,0,TAU); c.fill();
      c.globalAlpha=1;
    }
  }

  /* ---- fins (behind body) ---- */
  const fv = L.fin;
  for(const s of (SHUTTLE ? [-1] : [-1,1])){       // shuttle: single fin, left side
    c.save(); c.scale(s,1);
    c.beginPath();
    c.moveTo(R*0.72, L.yEng - fv.h*0.2);
    c.lineTo(R + fv.w, L.yBot + fv.h*0.55 - (fv.sweep||0)*4);
    c.lineTo(R + fv.w*0.92, L.yBot + fv.h*0.62);
    c.lineTo(R*0.7, L.yBot + 1);
    c.closePath();
    const fvc = fv.color || '#c8384a';
    const g = c.createLinearGradient(R,0,R+(fv.w||0),0);
    g.addColorStop(0, fvc); g.addColorStop(1, shade(fvc,-0.42));
    c.fillStyle=g; c.fill();
    c.strokeStyle='rgba(0,0,0,.45)'; c.lineWidth=1.1; c.stroke();
    if(fv.glow){
      c.strokeStyle='rgba(90,255,230,'+(0.45+0.35*Math.sin(t*6))+')'; c.lineWidth=1.6;
      c.beginPath(); c.moveTo(R*0.9, L.yEng+2); c.lineTo(R+fv.w*0.75, L.yBot+fv.h*0.35); c.stroke();
    }
    c.restore();
  }

  /* ---- shuttle: delta wings + vertical stabiliser (behind the body) ---- */
  if(SHUTTLE){
    const hc = (L.hull && L.hull.color) || '#0a2a3c';
    const wc = shade(hc, 0.18), wd = shade(hc, -0.45), acc = '#e44b4b';
    for(const sgn of [-1]){                            // ONE delta wing, left side
      c.save(); c.scale(sgn,1);
      c.beginPath();
      c.moveTo(R*0.35, L.yTank - L.tank.h*0.02);      // root, forward
      c.lineTo(R + 66, L.yEng + 16);                  // wing tip (leading edge)
      c.lineTo(R + 58, L.yBot + 30);                  // tip trailing edge
      c.lineTo(R*0.45, L.yBot + 12);                  // root, aft
      c.closePath();
      c.fillStyle=wc; c.fill();
      c.strokeStyle='rgba(198,214,235,.55)'; c.lineWidth=1.8; c.stroke();   // rim light vs space
      c.strokeStyle=acc; c.lineWidth=2.4;              // orange leading edge
      c.beginPath(); c.moveTo(R*0.35, L.yTank - L.tank.h*0.02); c.lineTo(R + 66, L.yEng + 16); c.stroke();
      c.restore();
    }
    c.fillStyle=shade(hc,-0.2);                        // vertical stabiliser
    c.beginPath(); c.moveTo(R*0.10, L.yTank + L.tank.h*0.30);
    c.lineTo(R*0.95, L.yBot + 22); c.lineTo(R*0.10, L.yBot + 14); c.closePath(); c.fill();
    c.strokeStyle='rgba(0,0,0,.4)'; c.lineWidth=1.2; c.stroke();
  }

  /* ---- engine block ---- */
  const hullTrim = L.hull.trim || shade(L.hull.color||'#8b95a8', -0.25);
  c.fillStyle = shade(hullTrim,-0.15);
  rr(c,-R-1, L.yEng-2, (R+1)*2, L.eng.h+3, 3); c.fill();
  c.fillStyle = '#2a3242';
  const n = L.eng.nozzles||1, sz = L.eng.size||1;
  for(let i=0;i<n;i++){
    const off = n===1 ? 0 : (i-(n-1)/2)*(R*1.05/Math.max(1,n-1))*1.15;
    const nw = 6.2*sz;
    c.beginPath();
    c.moveTo(off-nw*0.55, L.yBot-3); c.lineTo(off+nw*0.55, L.yBot-3);
    c.lineTo(off+nw, L.yBot+2.5*sz); c.lineTo(off-nw, L.yBot+2.5*sz);
    c.closePath();
    c.fillStyle='#39414f'; c.fill();
    c.strokeStyle='#1b2029'; c.lineWidth=1; c.stroke();
  }

  /* ---- shuttle: three orange main engines at the tail ---- */
  if(SHUTTLE){
    for(let i=-1;i<=1;i++){
      c.fillStyle='#2b3644';
      c.beginPath(); c.moveTo(i*8-4.5, L.yBot-4); c.lineTo(i*8+4.5, L.yBot-4);
      c.lineTo(i*8+6, L.yBot+5); c.lineTo(i*8-6, L.yBot+5); c.closePath(); c.fill();
      c.fillStyle='#e44b4b'; c.globalAlpha=0.55+0.35*Math.sin(t*9+i);
      c.beginPath(); c.arc(i*8, L.yBot+5, 3.2, 0, TAU); c.fill(); c.globalAlpha=1;
    }
  }

  /* ---- booster stages stacked beneath the core ---- */
  const stgList = opt.stages || [];
  if(stgList.length){
    let yy = L.yBot;
    const top2bottom = stgList.slice().reverse();      // slot b hugs the core, slot a hangs lowest
    for(const s of top2bottom){
      const sv = PARTS[s.id].vis || {}, rw = 13 + (sv.w||6)*1.6, hh = sv.h||50;
      if(SHUTTLE && (sv.pair || sv.big)){          // tank right, SRBs at its middle
        const ex = ETC - SX;                       // undo the orbiter shift
        if(sv.big){                                // ---- external tank (right) ----
          const etw = 15 + (sv.w||9)*1.5, top = L.yNose - 6, eh = (L.yBot + 14) - top;
          c.save(); c.translate(ex, 0);
          const tg = c.createLinearGradient(-etw,0,etw,0);
          const tc = sv.color || '#c96a1e';
          tg.addColorStop(0, shade(tc,-0.38)); tg.addColorStop(0.35, tc);
          tg.addColorStop(0.7, shade(tc,0.10)); tg.addColorStop(1, shade(tc,-0.48));
          c.fillStyle=tg; rr(c,-etw, top, etw*2, eh, etw*0.9); c.fill();
          c.fillStyle=shade(tc,0.12);              // ogive nose
          c.beginPath(); c.moveTo(0, top-24); c.quadraticCurveTo(etw, top+etw*0.9, etw, top+etw*1.6);
          c.lineTo(-etw, top+etw*1.6); c.quadraticCurveTo(-etw, top+etw*0.9, 0, top-24); c.fill();
          c.fillStyle=sv.stripe||'#5a4029'; c.fillRect(-etw, top+eh*0.30, etw*2, 7);   // intertank
          c.fillStyle='rgba(0,0,0,.25)'; c.fillRect(-etw, top+eh*0.74, etw*2, 4);
          c.fillStyle='rgba(84,216,255,.9)';
          c.fillRect(-etw+3, top+eh*0.44, (etw*2-6)*clamp(s.frac===undefined?1:s.frac,0,1), 3);
          c.fillStyle='#39414f';                   // feedline
          c.fillRect(etw*0.55, top+eh*0.16, 4, eh*0.7);
          if(s.active && flame>0.02){
            const len=(30+46*flame)*(0.85+0.15*Math.sin(t*30)), w2=6*(0.85+0.3*flame);
            const g2=c.createLinearGradient(0,top+eh,0,top+eh+len);
            g2.addColorStop(0,'#ffffff'); g2.addColorStop(0.2,sv.flame||'#ff8b3c');
            g2.addColorStop(0.6, shade(sv.flame||'#ff8b3c',-0.35)); g2.addColorStop(1,'rgba(0,0,0,0)');
            c.fillStyle=g2; c.beginPath(); c.moveTo(-w2,top+eh);
            c.quadraticCurveTo(-w2*0.5, top+eh+len*0.55, 0, top+eh+len);
            c.quadraticCurveTo(w2*0.5, top+eh+len*0.55, w2, top+eh); c.closePath(); c.fill();
          }
          c.restore(); continue;
        }
        // ---- SRB pair, straddling the tank's middle ----
        const etw = 15 + 9*1.5, bh = hh*0.86, top = L.yTank - bh*0.18, bx = etw + rw + 5;
        for(const sgn of [-1,1]){
          c.save(); c.translate(ex + sgn*bx, 0);
          const bg2 = c.createLinearGradient(-rw,0,rw,0);
          const pc = sv.color || '#eef2f7';
          bg2.addColorStop(0, shade(pc,-0.34)); bg2.addColorStop(0.35, pc);
          bg2.addColorStop(0.7, shade(pc,0.08)); bg2.addColorStop(1, shade(pc,-0.45));
          c.fillStyle=bg2; rr(c,-rw, top, rw*2, bh, 6); c.fill();
          c.strokeStyle=sv.stripe||'#c8384a'; c.lineWidth=2; c.stroke();
          c.fillStyle=sv.stripe||'#c8384a'; c.fillRect(-rw, top+bh*0.58, rw*2, 4);
          c.fillStyle=shade(pc,0.14);
          c.beginPath(); c.moveTo(0, top-16); c.lineTo(rw, top+3); c.lineTo(-rw, top+3); c.closePath(); c.fill();
          c.strokeStyle='rgba(0,0,0,.35)'; c.lineWidth=1; c.stroke();
          c.fillStyle='#39414f';
          c.beginPath(); c.moveTo(-5, top+bh-2); c.lineTo(5, top+bh-2);
          c.lineTo(7.5, top+bh+6); c.lineTo(-7.5, top+bh+6); c.closePath(); c.fill();
          c.fillStyle='rgba(84,216,255,.9)';
          c.fillRect(-rw+2, top+5, (rw*2-4)*clamp(s.frac===undefined?1:s.frac,0,1), 3);
          if(s.active && flame>0.02){
            const flick=0.82+Math.sin(t*44+sgn)*0.12+Math.random()*0.1;
            const len=(34+58*flame)*flick, w2=7*(0.85+0.3*flame);
            const g2=c.createLinearGradient(0,top+bh,0,top+bh+len);
            g2.addColorStop(0,'#ffffff'); g2.addColorStop(0.2,sv.flame||'#ffcf6b');
            g2.addColorStop(0.6, shade(sv.flame||'#ffcf6b',-0.35)); g2.addColorStop(1,'rgba(0,0,0,0)');
            c.fillStyle=g2; c.beginPath(); c.moveTo(-w2, top+bh);
            c.quadraticCurveTo(-w2*0.5, top+bh+len*0.55, 0, top+bh+len);
            c.quadraticCurveTo(w2*0.5, top+bh+len*0.55, w2, top+bh); c.closePath(); c.fill();
          }
          c.restore();
        }
        continue;
      }
      if(sv.pair){                                  // SRB pair: bolted to the flanks
        const bx = R + rw*0.95 + 7, top = L.yTank - 10, bh = (L.yBot + hh*0.42) - top;
        for(const sgn of [-1,1]){
          c.save(); c.translate(sgn*bx, 0);
          const bg2 = c.createLinearGradient(-rw,0,rw,0);
          const pc = sv.color || '#eef2f7';
          bg2.addColorStop(0, shade(pc,-0.34)); bg2.addColorStop(0.35, pc);
          bg2.addColorStop(0.7, shade(pc,0.08)); bg2.addColorStop(1, shade(pc,-0.45));
          c.fillStyle=bg2; rr(c,-rw, top, rw*2, bh, 6); c.fill();
          c.strokeStyle=sv.stripe||'#c8384a'; c.lineWidth=2; c.stroke();
          c.fillStyle=sv.stripe||'#c8384a'; c.fillRect(-rw, top+bh*0.55, rw*2, 4);
          c.fillStyle=shade(pc,0.14);                // conical nose
          c.beginPath(); c.moveTo(0, top-18); c.lineTo(rw, top+3); c.lineTo(-rw, top+3); c.closePath(); c.fill();
          c.strokeStyle='rgba(0,0,0,.35)'; c.lineWidth=1; c.stroke();
          c.fillStyle='#39414f';                     // nozzle
          c.beginPath(); c.moveTo(-5, top+bh-2); c.lineTo(5, top+bh-2);
          c.lineTo(7.5, top+bh+6); c.lineTo(-7.5, top+bh+6); c.closePath(); c.fill();
          c.fillStyle='rgba(84,216,255,.9)';
          c.fillRect(-rw+2, top+5, (rw*2-4)*clamp(s.frac===undefined?1:s.frac,0,1), 3);
          if(s.active && flame>0.02){
            const flick=0.82+Math.sin(t*44)*0.12+Math.random()*0.1;
            const len=(36+62*flame)*flick, w2=7.5*(0.85+0.3*flame);
            const g2=c.createLinearGradient(0,top+bh,0,top+bh+len);
            g2.addColorStop(0,'#ffffff'); g2.addColorStop(0.2,sv.flame||'#ffcf6b');
            g2.addColorStop(0.6, shade(sv.flame||'#ffcf6b',-0.35)); g2.addColorStop(1,'rgba(0,0,0,0)');
            c.fillStyle=g2;
            c.beginPath(); c.moveTo(-w2, top+bh);
            c.quadraticCurveTo(-w2*0.5, top+bh+len*0.55, 0, top+bh+len);
            c.quadraticCurveTo(w2*0.5, top+bh+len*0.55, w2, top+bh);
            c.closePath(); c.fill();
          }
          c.restore();
        }
        continue;                                    // never adds to the stack height
      }
      c.fillStyle='#2a3242'; c.fillRect(-rw*0.92, yy-3, rw*1.84, 4);
      const bg = c.createLinearGradient(-rw,0,rw,0);
      const svc = sv.color || '#d8dde6';
      bg.addColorStop(0, shade(svc,-0.34)); bg.addColorStop(0.35, svc);
      bg.addColorStop(0.7, shade(svc,0.08)); bg.addColorStop(1, shade(svc,-0.45));
      c.fillStyle=bg; rr(c,-rw, yy, rw*2, hh, 4); c.fill();
      const svs = sv.stripe || '#c8384a';
      c.strokeStyle=svs; c.lineWidth=2; c.stroke();
      c.fillStyle=svs; c.fillRect(-rw, yy+hh*0.52, rw*2, 5);
      c.fillStyle='rgba(84,216,255,.9)';
      c.fillRect(-rw+2, yy+3, (rw*2-4)*clamp(s.frac===undefined?1:s.frac,0,1), 3);
      const n = sv.nozzles||1;
      for(let i=0;i<n;i++){
        const off = n===1?0:(i-(n-1)/2)*(rw*1.5/Math.max(1,n-1));
        c.fillStyle='#39414f';
        c.beginPath(); c.moveTo(off-4.5, yy+hh-2); c.lineTo(off+4.5, yy+hh-2);
        c.lineTo(off+6.5, yy+hh+4); c.lineTo(off-6.5, yy+hh+4); c.closePath(); c.fill();
      }
      if(s.active && flame>0.02){
        for(let i=0;i<n;i++){
          const off = n===1?0:(i-(n-1)/2)*(rw*1.5/Math.max(1,n-1));
          const flick = 0.82 + Math.sin(t*44+i*1.7)*0.12 + Math.random()*0.1;
          const len = (30+54*flame)*flick, w2 = 7*(0.85+0.3*flame);
          const g2 = c.createLinearGradient(0,yy+hh,0,yy+hh+len);
          g2.addColorStop(0,'#ffffff'); g2.addColorStop(0.2,sv.flame);
          g2.addColorStop(0.6, shade(sv.flame,-0.35)); g2.addColorStop(1,'rgba(0,0,0,0)');
          c.fillStyle=g2;
          c.beginPath(); c.moveTo(off-w2,yy+hh);
          c.quadraticCurveTo(off-w2*0.5, yy+hh+len*0.55, off, yy+hh+len);
          c.quadraticCurveTo(off+w2*0.5, yy+hh+len*0.55, off+w2, yy+hh);
          c.closePath(); c.fill();
        }
      }
      (s.guns||[]).forEach((gid,gi)=>{
        const gv = PARTS[gid].vis || {}, side = (gi%2===0)?-1:1;
        c.save(); c.translate(side*(rw+4), yy+9);
        c.fillStyle=shade(gv.color,-0.15); rr(c,-3.4,-gv.len,6.8,gv.len+5,2); c.fill();
        c.strokeStyle='rgba(0,0,0,.4)'; c.lineWidth=1; c.stroke();
        c.fillStyle=gv.shot; c.globalAlpha=0.5+0.5*Math.sin(t*9+gi);
        c.beginPath(); c.arc(0,-gv.len+1.5,1.8,0,TAU); c.fill(); c.globalAlpha=1;
        c.restore();
      });
      yy += hh;
    }
  }

  /* ---- main tank body ---- */
  const bodyG = c.createLinearGradient(-R,0,R,0);
  bodyG.addColorStop(0, shade(L.tank.color,-0.34));
  bodyG.addColorStop(0.32, L.tank.color);
  bodyG.addColorStop(0.62, shade(L.tank.color,0.1));
  bodyG.addColorStop(1, shade(L.tank.color,-0.45));
  c.fillStyle = bodyG;
  rr(c,-R, L.yTank-1, R*2, L.tank.h+3, 4); c.fill();
  // hull plating tint
  c.save(); rr(c,-R, L.yTank-1, R*2, L.tank.h+3, 4); c.clip();
  c.globalAlpha=0.32; c.fillStyle=L.hull.color; c.fillRect(-R, L.yTank, R*2, L.tank.h);
  c.globalAlpha=1;
  // stripe + rivets
  c.fillStyle=(L.tank.stripe||'#c8384a'); c.fillRect(-R, L.yTank + L.tank.h*0.42, R*2, 5);
  c.fillStyle='rgba(255,255,255,.5)'; c.fillRect(-R, L.yTank + L.tank.h*0.42, R*2, 1.4);
  c.strokeStyle='rgba(0,0,0,.22)'; c.lineWidth=1;
  for(let i=1;i<Math.max(1,Math.floor(L.tank.h/18));i++){
    const y=L.yTank+i*18; c.beginPath(); c.moveTo(-R,y); c.lineTo(R,y); c.stroke();
  }
  // window
  c.fillStyle='#0d2438'; c.beginPath(); c.arc(0, L.yTank+13, R*0.34, 0, TAU); c.fill();
  c.fillStyle='rgba(120,220,255,.75)'; c.beginPath(); c.arc(-R*0.09, L.yTank+11.5, R*0.19, 0, TAU); c.fill();
  c.restore();
  c.strokeStyle = SHUTTLE ? 'rgba(198,214,235,.5)' : hullTrim;
  c.lineWidth = SHUTTLE ? 1.8 : 1.6; rr(c,-R, L.yTank-1, R*2, L.tank.h+3, 4); c.stroke();

  /* ---- science module ---- */
  if(L.mod){
    const mv=L.mod;
    c.fillStyle=shade(mv.color,-0.12);
    rr(c,-R*0.86, L.yMod, R*1.72, mv.h, 3); c.fill();
    c.strokeStyle='rgba(0,0,0,.4)'; c.lineWidth=1; c.stroke();
    if(mv.kind==='dish'){
      c.strokeStyle='#7f8aa0'; c.lineWidth=2;
      c.beginPath(); c.moveTo(R*0.86, L.yMod+mv.h*0.5); c.lineTo(R*1.5, L.yMod-4); c.stroke();
      c.fillStyle='#9fb0cc'; c.beginPath(); c.ellipse(R*1.55, L.yMod-6, 7, 4.5, -0.5, 0, TAU); c.fill();
    } else if(mv.kind==='ring'){
      c.strokeStyle=mv.color; c.lineWidth=2.4;
      c.beginPath(); c.ellipse(0, L.yMod+mv.h*0.5, R*1.5, mv.h*0.34, 0, 0, TAU); c.stroke();
      c.fillStyle='rgba(150,255,220,'+(0.5+0.4*Math.sin(t*4))+')';
      c.beginPath(); c.arc(0, L.yMod+mv.h*0.5, 3, 0, TAU); c.fill();
    } else if(mv.kind==='dome'){
      c.fillStyle='rgba(190,160,255,.5)';
      c.beginPath(); c.arc(0, L.yMod+mv.h*0.35, R*0.7, Math.PI, TAU); c.fill();
      c.strokeStyle=mv.color; c.lineWidth=1.6; c.stroke();
    }
  }

  /* ---- weapons ---- */
  const wv = (PARTS[b.weapon] && PARTS[b.weapon].vis) || {}, wp = PARTS[b.weapon] || {};
  if(wp.dmg){
    const pods = wv.pods || 1;   // a missing pod count must never blank the guns
    const wvc = wv.color || '#9aa3b5';
    for(let i=0;i<pods;i++){
      const side = pods===1 ? 0 : (i%2===0?-1:1);
      const layer = pods===3 ? (i===2?0:1) : 0;
      const px = side*(R + 3 + layer*0) ;
      const py = L.yTank + L.tank.h*0.55 + (pods===3 && i===2 ? -14 : 0);
      if(pods===1){
        c.fillStyle=wv.color; rr(c,-3, py-wv.len, 6, wv.len+4, 2); c.fill();
        c.fillStyle='#2a3242'; c.fillRect(-2, py-wv.len-2, 4, 4);
      } else {
        c.save(); c.translate(px, py);
        c.fillStyle=shade(wv.color,-0.2); rr(c,-3.6, -wv.len, 7.2, wv.len+5, 2); c.fill();
        c.strokeStyle='rgba(0,0,0,.4)'; c.lineWidth=1; c.stroke();
        c.fillStyle=wv.shot; c.globalAlpha=0.55+0.45*Math.sin(t*8+i);
        c.beginPath(); c.arc(0,-wv.len+1.5,1.9,0,TAU); c.fill(); c.globalAlpha=1;
        c.fillStyle='#39414f'; c.fillRect(side>0?-4.5:-1.5, -2, 6, 5);
        c.restore();
      }
    }
  }

  /* ---- shuttle: nose cap, cockpit glass, payload-bay doors ---- */
  if(SHUTTLE){
    c.fillStyle='#1a1f2b';
    c.beginPath(); c.moveTo(0, L.yNose);
    c.lineTo(R*0.46, L.yNose + L.nose.h*0.30); c.lineTo(-R*0.46, L.yNose + L.nose.h*0.30);
    c.closePath(); c.fill();
    c.fillStyle='rgba(120,205,255,.9)';
    for(let i=-1;i<=1;i++) c.fillRect(i*5-2.2, L.yNose + L.nose.h*0.34, 4.4, 3.6);
    c.strokeStyle='rgba(166,170,169,.55)'; c.lineWidth=1.2;        // payload-bay spine
    c.beginPath(); c.moveTo(-R*0.16, L.yNose + L.nose.h*0.55); c.lineTo(-R*0.16, L.yTank + L.tank.h*0.86);
    c.moveTo(R*0.16, L.yNose + L.nose.h*0.55); c.lineTo(R*0.16, L.yTank + L.tank.h*0.86); c.stroke();
    c.strokeStyle='rgba(0,0,0,.32)'; c.lineWidth=1.2;
    c.beginPath(); c.moveTo(-R*0.72, L.yTank + L.tank.h*0.28); c.lineTo(R*0.72, L.yTank + L.tank.h*0.28); c.stroke();
    c.fillStyle='rgba(0,0,0,.18)'; c.fillRect(-R*0.72, L.yTank + L.tank.h*0.28, R*1.44, 3);
  }

  /* ---- missile pods ---- */
  const mv2 = L.msl || {};
  if(mv2.len > 0){
    const pods = mv2.pods || 1;
    for(let i=0;i<pods;i++){
      const side = pods===1 ? 1 : (i%2===0 ? -1 : 1);
      const layer = pods>2 ? (i<2 ? 0 : 1) : 0;
      c.save(); c.translate(side*(R*0.62 + layer*7), L.yTank + L.tank.h*0.22 + layer*10);
      c.fillStyle = (typeof shade==='function') ? shade(mv2.color||'#9aa3b5', -0.12) : (mv2.color||'#9aa3b5');
      rr(c,-3.2,-mv2.len,6.4,mv2.len+4,2); c.fill();
      c.strokeStyle='rgba(0,0,0,.4)'; c.lineWidth=1; c.stroke();
      c.fillStyle = mv2.shot || '#ffb03a';
      c.beginPath(); c.arc(0,-mv2.len+2,2.2,0,TAU); c.fill();
      c.restore();
    }
  }

  /* ---- nose cone ---- */
  const nv = L.nose;
  c.beginPath();
  if(nv.shape==='cone'){
    c.moveTo(0, L.yNose); c.lineTo(R, L.yMod+1); c.lineTo(-R, L.yMod+1);
  } else if(nv.shape==='ogive'){
    c.moveTo(0, L.yNose);
    c.bezierCurveTo(R*0.55, L.yNose+nv.h*0.25, R, L.yNose+nv.h*0.7, R, L.yMod+1);
    c.lineTo(-R, L.yMod+1);
    c.bezierCurveTo(-R, L.yNose+nv.h*0.7, -R*0.55, L.yNose+nv.h*0.25, 0, L.yNose);
  } else if(nv.shape==='spike'){
    c.moveTo(0, L.yNose); c.lineTo(R*0.42, L.yNose+nv.h*0.5);
    c.lineTo(R, L.yMod+1); c.lineTo(-R, L.yMod+1); c.lineTo(-R*0.42, L.yNose+nv.h*0.5);
  } else { // crystal
    c.moveTo(0, L.yNose); c.lineTo(R*0.8, L.yNose+nv.h*0.55);
    c.lineTo(R, L.yMod+1); c.lineTo(-R, L.yMod+1); c.lineTo(-R*0.8, L.yNose+nv.h*0.55);
  }
  c.closePath();
  const nvc = nv.color || '#dfe4ee';
  const ng = c.createLinearGradient(-R,0,R,0);
  ng.addColorStop(0, shade(nvc,-0.4)); ng.addColorStop(0.4, nvc);
  ng.addColorStop(0.75, shade(nvc,0.12)); ng.addColorStop(1, shade(nvc,-0.5));
  c.fillStyle=ng; c.fill();
  c.strokeStyle = SHUTTLE ? 'rgba(198,214,235,.5)' : hullTrim;
  c.lineWidth = SHUTTLE ? 1.6 : 1.4; c.stroke();
  // tip accent
  c.fillStyle=(nv.tip||'#ffffff'); c.globalAlpha=0.9;
  c.beginPath(); c.arc(0, L.yNose+3.5, 2.6, 0, TAU); c.fill(); c.globalAlpha=1;
  if(nv.shape!=='cone' && nv.shape!=='ogive' && nv.shape!=='spike'){
    c.globalAlpha=0.35+0.3*Math.sin(t*3);
    c.fillStyle=(nv.tip||'#ffffff'); c.beginPath();
    c.moveTo(0,L.yNose+4); c.lineTo(R*0.5,L.yNose+nv.h*0.6); c.lineTo(-R*0.5,L.yNose+nv.h*0.6);
    c.closePath(); c.fill(); c.globalAlpha=1;
  }

  /* ---- shield bubble ---- */
  const sh = PARTS[b.hull].shield;
  if(sh>0 && opt.shield!==0){
    const a = 0.10 + 0.09*Math.sin(t*2.6) + (opt.shieldFlash||0);
    c.strokeStyle='rgba(120,200,255,'+(a*2.4)+')'; c.lineWidth=2;
    c.beginPath(); c.ellipse(0,0, R+13, L.H/2+15, 0,0,TAU); c.stroke();
    c.fillStyle='rgba(90,180,255,'+(a*0.5)+')'; c.fill();
  }
  if(opt.hitFlash){
    c.globalCompositeOperation='lighter'; c.fillStyle='rgba(255,90,90,'+opt.hitFlash+')';
    rr(c,-R-2, L.yNose, R*2+4, L.H, 8); c.fill();
    c.globalCompositeOperation='source-over';
  }
  c.restore();
}
function shade(hex, amt){
  if(typeof hex !== 'string' || !hex) return '#8b95a8';          // never let a missing colour kill the frame
  let r,g,b;
  if(hex[0] === '#'){
    const h = hex.replace('#','');
    const n = parseInt(h.length===3 ? h.split('').map(x=>x+x).join('') : h, 16);
    if(!isFinite(n)) return '#8b95a8';
    r=(n>>16)&255; g=(n>>8)&255; b=n&255;
  } else {                                                       // rgb() / named colour: read the numbers back
    const m = hex.match(/[\d.]+/g);
    if(!m || m.length < 3) return hex;
    r=+m[0]; g=+m[1]; b=+m[2];
  }
  if(amt>0){ r+=(255-r)*amt; g+=(255-g)*amt; b+=(255-b)*amt; }
  else { r*=(1+amt); g*=(1+amt); b*=(1+amt); }
  return 'rgb('+Math.round(clamp(r,0,255))+','+Math.round(clamp(g,0,255))+','+Math.round(clamp(b,0,255))+')';
}

/* =========================================================================
   HANGAR UI
   ========================================================================= */
let activeCat = 'engine';
function ownedIn(cat){ return Object.keys(PARTS).filter(k=>PARTS[k].cat===cat && P.owned.includes(k)).length; }
function totalIn(cat){ return Object.keys(PARTS).filter(k=>PARTS[k].cat===cat).length; }

function renderHangar(){
  refreshStats();
  document.getElementById('hud-rp').textContent = fmt(P.rp);
  document.getElementById('hud-rs').textContent = fmt(P.rs);

  // tabs
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = CATS.map(c=>{
    const locked = totalIn(c.id) - ownedIn(c.id);
    return '<div class="tab'+(c.id===activeCat?' on':'')+'" data-cat="'+c.id+'">'+c.label+
           (locked>0?'<span class="lockn">🔒'+locked+'</span>':'')+'</div>';
  }).join('');
  tabs.querySelectorAll('.tab').forEach(el=>el.onclick=()=>{ activeCat=el.dataset.cat; renderHangar(); });

  // part cards
  const box = document.getElementById('parts');
  const ids = Object.keys(PARTS).filter(k=>PARTS[k].cat===activeCat);
  box.innerHTML = ids.map(id=>cardHTML(id)).join('');
  bindCardActions(box);

  // stats panel
  const s = STATS;
  const rows = [
    ['Thrust', clamp((s.twr-0.6)/2.6,0,1), s.twr.toFixed(2)+' TWR', s.twr<1.02?'warn':(s.twr>1.7?'good':'')],
    ['Fuel',   clamp(s.fuel/400,0,1),      fmt(s.fuel)+' u', ''],
    ['Endur.', clamp(s.endurance/140,0,1), s.endurance.toFixed(0)+' s', s.endurance<18?'warn':''],
    ['Agility',clamp(s.turn/6.5,0,1),      s.turn.toFixed(1)+' r/s', ''],
    ['Firepwr',clamp(s.dps/200,0,1),       fmt(s.dps)+' dps', ''],
    ['Hull',   clamp(s.hp/280,0,1),        fmt(s.hp)+' hp', ''],
    ['Shield', clamp(s.shield/16,0,1),     s.shield? s.shield+'/s':'none', s.shield?'good':''],
    ['Top spd',clamp(s.maxV/1120,0,1),     Math.round(s.maxV/PX_PER_M)+' m/s', s.maxV>700?'good':''],
    ['Science',clamp((s.rsMult-1)/1.4,0,1),'x'+s.rsMult.toFixed(2), s.rsMult>1.2?'good':''],
    ['Mass',   clamp(s.mass/140,0,1),      fmt(s.mass)+' t', s.mass>90?'warn':'']
  ];
  if(stageSlots().length) rows.push(['Liftoff', clamp((launchTWR()-0.6)/2.6,0,1), launchTWR().toFixed(2)+' TWR', launchTWR()<1.05?'warn':'good']);
  const lvTotal = Object.keys(s.lv).reduce((a,k)=>a+s.lv[k],0);
  rows.push(['Upgrades', lvTotal/(7*MAXLVL), 'Mk '+(lvTotal+7), lvTotal?'good':'']);
  document.getElementById('statbox').innerHTML = rows.map(r=>
    '<div class="stat"><span>'+r[0]+'</span><div class="bar"><i class="'+r[3]+'" style="width:'+Math.round(r[1]*100)+'%"></i></div><b>'+r[2]+'</b></div>'
  ).join('');

  // mission box
  const m = MISSIONS.find(x=>!P.missions.includes(x.id));
  document.getElementById('missionbox').innerHTML = m
    ? '<div class="mn">◆ CONTRACT: '+m.name+'</div><div class="md">'+m.desc+'</div>'+
      '<div class="mr"><span class="rp-c">+'+fmt(m.rp)+' RP</span><span class="rs-c">+'+fmt(m.rs)+' RS</span></div>'
    : '<div class="mn">◆ ALL CONTRACTS COMPLETE</div><div class="md">Fly for the record book — best altitude: '+fmt(P.best)+' m</div>';
}
function cardHTML(id){
  const p = PARTS[id], owned = P.owned.includes(id); let eq = P.build[p.cat]===id;
  const cur = PARTS[P.build[p.cat]];
  const canRP = P.rp >= (p.cost.rp||0), canRS = P.rs >= (p.cost.rs||0);
  const kv = [];
  const push=(label,val,delta)=>{
    let cls='';
    if(delta!==undefined && cur){ const d = val - (cur[delta.key]||0); cls = d>0.001?'up':(d<-0.001?'dn':''); }
    kv.push('<span class="'+cls+'">'+label+' '+(typeof val==='number'?(Math.round(val*100)/100):val)+'</span>');
  };
  if(p.thrust!==undefined){
    push('THRUST',p.thrust); push('BURN',p.burn);
    if(p.vmax!==undefined) push('VMAX',p.vmax);
    if(p.cat!=='stage') push('TWR~',(p.thrust/(STATS.mass - (cur?cur.mass:0) + p.mass)*96/G_ACC).toFixed(2));
  }
  if(p.mounts!==undefined) push('MOUNTS',p.mounts);
  if(p.drag!==undefined && p.cat==='nose') push('VMAX x',(1.6-0.6*p.drag).toFixed(2));
  if(p.fuel!==undefined) push('FUEL',p.fuel);
  if(p.turn!==undefined){ push('TURN',p.turn); push('STAB',p.stab); }
  if(p.drag!==undefined) push('DRAG',p.drag);
  if(p.dmg!==undefined){ push('DMG',p.dmg); push('RATE',p.rate); push('DPS',Math.round(p.dmg*p.shots*p.rate)); if(p.pierce)push('PIERCE',p.pierce); if(p.splash)push('SPLASH',p.splash); if(p.seek)push('SEEK',p.seek); }
  if(p.hp!==undefined){ push('HULL',p.hp); if(p.shield)push('SHIELD',p.shield+'/s'); }
  if(p.rpMult!==undefined){ push('RP x',p.rpMult); push('RS x',p.rsMult); }
  if(p.mass!==undefined) push('MASS',p.mass);
  const price = [];
  if(p.cost.rp) price.push('<span class="rp-c">'+fmt(p.cost.rp)+' RP</span>');
  if(p.cost.rs) price.push('<span class="rs-c">'+fmt(p.cost.rs)+' RS</span>');

  let act;
  if(p.cat==='stage' || p.cat==='sgun'){
    const fitted = isFitted(id);
    eq = fitted;
    if(fitted) act = '<div class="chip" style="border-color:#1a5a35;color:#7cf0a8">IN BAY</div>';
    else if(owned) act = '<div class="chip">OWNED · fit it in the Stage Bay</div>';
    else act = '<div class="price">'+(price.join('')||'FREE')+'</div>'+
               '<button class="btn small '+(canRP&&canRS?'primary':'')+'" data-buy="'+id+'" '+((canRP&&canRS)?'':'disabled')+'>Unlock</button>';
  }
  else if(eq) act = '<div class="chip" style="border-color:#1a5a35;color:#7cf0a8">EQUIPPED</div>';
  else if(owned) act = '<button class="btn small" data-eq="'+id+'">Equip</button>';
  else act = '<div class="price">'+(price.join('')||'FREE')+'</div>'+
             '<button class="btn small '+(canRP&&canRS?'primary':'')+'" data-buy="'+id+'" '+((canRP&&canRS)?'':'disabled')+'>Unlock</button>';

  return '<div class="card '+(eq?'eq':'')+' '+(owned?'':'locked')+'">'+
    (eq?'<div class="eqbadge">IN USE</div>':(owned?'':'<div class="lockbadge">LOCKED</div>'))+
    '<div class="top"><div><h4>'+p.name+'</h4><div class="tier">'+p.tier+
      (owned&&lvlOf(id)>0?'<span class="mkchip">MK '+(lvlOf(id)+1)+'</span>':'')+
      '</div></div></div>'+
    '<div class="desc">'+p.desc+'</div>'+
    '<div class="kv">'+kv.join('')+'</div>'+
    '<div class="act">'+act+'</div></div>';
}
function buyPart(id){
  const p = PARTS[id];
  if(P.owned.includes(id)) return;
  if(P.rp < (p.cost.rp||0) || P.rs < (p.cost.rs||0)){
    Snd.deny(); toast('Not enough funds — fly a sortie to earn <b class="rp-c">RP</b> and <b class="rs-c">RS</b>'); return;
  }
  P.rp -= p.cost.rp||0; P.rs -= p.cost.rs||0;
  P.owned.push(id); P.build[p.cat] = id; save(); Snd.buy();
  toast('🔓 Unlocked <b>'+p.name+'</b> — installed!');
  refreshAllUI();
}
/* re-render whatever UI is on screen after any purchase / equip / upgrade */
function refreshAllUI(){
  refreshStats();
  if(curScreen==='build') renderHangar();
  else if(curScreen==='shop') renderShop();
  renderTitleBest();
  if(typeof renderLevelStrip==='function') renderLevelStrip();
  if(typeof renderAchRow==='function') renderAchRow();
}
function bindCardActions(root){
  root.querySelectorAll('[data-eq]').forEach(el=>el.onclick=()=>{
    const id = el.dataset.eq;
    if(P.owned.includes(id)){ P.build[PARTS[id].cat] = id; save(); Snd.tone(660,0.07,'triangle',0.09); refreshAllUI(); }
  });
  root.querySelectorAll('[data-buy]').forEach(el=>el.onclick=()=>buyPart(el.dataset.buy));
}

/* =========================================================================
   THE DEPOT — one buying place: catalogue + upgrade bench
   ========================================================================= */
let shopTab='buy', shopFilter='all';
function gotoShop(){ mode='shop'; Snd.thrustOff(); show('shop'); renderShop(); }
function renderShop(){
  refreshStats();
  document.getElementById('shop-rp').textContent = fmt(P.rp);
  document.getElementById('shop-rs').textContent = fmt(P.rs);
  ['buy','up','stage','ammo','chute','ship'].forEach(t=>{
    const el=document.getElementById('stab-'+t); if(el) el.classList.toggle('on', shopTab===t);
  });
  const grid = document.getElementById('shop-grid'),
        up   = document.getElementById('shop-up'),
        stg  = document.getElementById('shop-stage'),
        amm  = document.getElementById('shop-ammo'),
        fil  = document.getElementById('shop-filters');
  stg.style.display='none'; amm.style.display='none';
  const shp = document.getElementById('shop-ship');
  if(shp) shp.style.display='none';
  if(shopTab==='stage'){ grid.style.display='none'; fil.style.display='none'; up.style.display='none';
    stg.style.display='flex'; renderStageBay(); return; }
  if(shopTab==='ammo'){ grid.style.display='none'; fil.style.display='none'; up.style.display='none';
    amm.style.display='flex'; renderAmmoLab(); return; }
  if(shopTab==='chute'){ grid.style.display='none'; fil.style.display='none'; up.style.display='none';
    document.getElementById('shop-chute').style.display='flex'; renderChuteTab(); return; }
  if(shopTab==='ship'){ grid.style.display='none'; fil.style.display='none'; up.style.display='none';
    if(shp){ shp.style.display='flex'; renderShipyard(); } return; }
  document.getElementById('shop-chute').style.display='none';
  if(shopTab==='buy'){
    grid.style.display=''; fil.style.display=''; up.style.display='none';
    fil.innerHTML = ['all'].concat(CATS.map(c=>c.id)).map(id=>{
      const label = id==='all' ? 'ALL PARTS' : CATS.find(c=>c.id===id).label.toUpperCase();
      const locked = id==='all' ? Object.keys(PARTS).filter(k=>!P.owned.includes(k)).length
                                : totalIn(id)-ownedIn(id);
      return '<div class="tab'+(shopFilter===id?' on':'')+'" data-f="'+id+'">'+label+
             (locked?'<span class="lockn">🔒'+locked+'</span>':'')+'</div>';
    }).join('');
    fil.querySelectorAll('[data-f]').forEach(el=>el.onclick=()=>{ shopFilter=el.dataset.f; renderShop(); });
    const ids = Object.keys(PARTS).filter(k=> shopFilter==='all' || PARTS[k].cat===shopFilter);
    grid.innerHTML = '<div class="shopNote" style="grid-column:1/-1">Everything on the market in one aisle. '+
      '<b class="rp-c">RP</b> buys hardware, <b class="rs-c">RS</b> unlocks the exotic end of each rack. '+
      'Buying a part installs it immediately; use <b>Equip</b> to swap back any time.</div>'+
      ids.map(cardHTML).join('');
    bindCardActions(grid);
  } else {
    grid.style.display='none'; fil.style.display='none'; up.style.display='flex';
    up.innerHTML = '<div class="shopNote">Everything you fly can be pushed to <b>Mk IV</b> — core parts, boosters and '+
      'stage guns alike. Upgrades stay with the part, so a levelled engine keeps its levels if you swap tanks around it. Costs rise ×1.9 per mark.</div>'+
      benchItems().map(upRowHTML).join('');
    up.querySelectorAll('[data-up]').forEach(el=>el.onclick=()=>upgradePart(el.dataset.up));
  }
}
function burnOrder(){
  const seq=[];
  if(P.stages.a) seq.push(PARTS[P.stages.a].name);
  if(P.stages.b) seq.push(PARTS[P.stages.b].name);
  seq.push('Core');
  return seq.join(' → ');
}
function renderShipyard(){
  const el = document.getElementById('shop-ship'); if(!el) return;
  const owned = P.skinsOwned || (P.skinsOwned = ['skin-dawn']);
  const chips = sk => ['nose','tank','stripe','fin','flame'].map(k=>
      '<i style="display:inline-block;width:20px;height:12px;border-radius:3px;margin-right:4px;background:'+sk.paint[k]+';border:1px solid #0b1221"></i>').join('');
  el.innerHTML = '<div class="shopNote">Every hull is the same airframe under a different coat — a <b>skin</b> repaints the ship in flight '+
    'and in the hangar, and each one ships with <b>its own staging</b>: a booster layout and stage-gun set its pilots swear by. '+
    'Hit <b>APPLY STAGING</b> to bolt that loadout on (you keep whatever you already own).</div>'+
    SKINS.map(sk=>{
      const on = P.skin===sk.id, has = owned.includes(sk.id);
      const stg = [sk.stages.a, sk.stages.b].filter(Boolean).map(id=>PARTS[id]?PARTS[id].name:id).join(' + ') || 'no boosters';
      const guns = [].concat(sk.sguns.a||[], sk.sguns.b||[]).filter(Boolean).map(id=>PARTS[id]?PARTS[id].name:id);
      const price = sk.cost.rp? '<span class="rp-c">'+fmt(sk.cost.rp)+' RP</span>' : 'free';
      const price2 = sk.cost.rs? ' + <span class="rs-c">'+fmt(sk.cost.rs)+' RS</span>' : '';
      return '<div class="upRow" style="grid-template-columns:1fr">'+
        '<div class="upHead"><h4>'+(on?'▶ ':'')+sk.name+'</h4><span class="cat">'+sk.tier+'</span></div>'+
        '<div class="muted" style="font-size:12px;margin:4px 0 6px">'+sk.desc+'</div>'+
        '<div class="kv" style="margin:4px 0"><span>LIVERY '+chips(sk)+'</span></div>'+
        '<div class="kv"><span>STAGING '+stg+'</span>'+(guns.length?'<span>GUNS '+guns.join(', ')+'</span>':'')+'</div>'+
        '<div class="kv" style="margin-top:8px">'+
          (has? '<button class="btn small '+(on?'primary':'ghost')+'" data-skin="'+(on?'':'')+'" data-skin-equip="'+sk.id+'">'+(on?'FLYING':'Equip')+'</button>'
              : '<button class="btn small primary" data-skin-buy="'+sk.id+'">Buy — '+price+price2+'</button>')+
          '<button class="btn small ghost" data-skin-staging="'+sk.id+'">Apply Staging</button>'+
          (has?'':'<span class="dn">🔒 locked</span>')+
        '</div></div>';
    }).join('');
  el.querySelectorAll('[data-skin-equip]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.skinEquip;
    if(!id) return;
    P.skin=id; save(); Snd.buy(); toast('🎨 <b>'+skinOf(id).name+'</b> — livery applied'); renderShipyard(); refreshAllUI();
  });
  el.querySelectorAll('[data-skin-buy]').forEach(b=>b.onclick=()=>{
    const sk = SKINS.find(x=>x.id===b.dataset.skinBuy); if(!sk) return;
    if(P.rp < (sk.cost.rp||0) || P.rs < (sk.cost.rs||0)){ Snd.deny(); return toast('Not enough funds for <b>'+sk.name+'</b>'); }
    P.rp -= sk.cost.rp||0; P.rs -= sk.cost.rs||0;
    if(!(P.skinsOwned||[]).includes(sk.id)) P.skinsOwned.push(sk.id);
    P.skin = sk.id; save(); Snd.buy();
    toast('🎨 <b>'+sk.name+'</b> purchased — now flying');
    renderShipyard(); refreshAllUI();
  });
  el.querySelectorAll('[data-skin-staging]').forEach(b=>b.onclick=()=>{
    const sk = SKINS.find(x=>x.id===b.dataset.skinStaging); if(!sk) return;
    const need = [sk.stages.a, sk.stages.b].filter(Boolean)
      .concat([].concat(sk.sguns.a||[], sk.sguns.b||[]).filter(Boolean));
    const missing = need.filter(id => !PARTS[id] || !P.owned.includes(id));
    if(missing.length){
      const cost = missing.reduce((a,id)=>({ rp:a.rp+(PARTS[id]?(PARTS[id].cost.rp||0):0),
                                             rs:a.rs+(PARTS[id]?(PARTS[id].cost.rs||0):0) }), {rp:0, rs:0});
      // second click = buy the missing hardware and fit the lot
      if(P.pendingStaging === sk.id){
        if(P.rp < cost.rp || P.rs < cost.rs){
          Snd.deny(); P.pendingStaging = null;
          return toast('Not enough funds — <b>'+sk.name+'</b> staging needs '+fmt(cost.rp)+' RP'+(cost.rs?' / '+fmt(cost.rs)+' RS':''), 3600);
        }
        P.rp -= cost.rp; P.rs -= cost.rs;
        missing.forEach(id=>{ if(PARTS[id] && !P.owned.includes(id)) P.owned.push(id); });
        P.pendingStaging = null;
      } else {
        P.pendingStaging = sk.id; Snd.deny();
        return toast('🚧 <b>'+sk.name+'</b> staging needs: '+missing.map(id=>PARTS[id]?PARTS[id].name:id).join(', ')+
                     ' — <b>click APPLY STAGING again</b> to buy it ('+fmt(cost.rp)+' RP'+(cost.rs?' / '+fmt(cost.rs)+' RS':'')+')', 5200);
      }
    }
    ['a','b'].forEach(sl=>{
      const id = sk.stages[sl];
      if(id && P.owned.includes(id)) P.stages[sl] = id; else if(!id) P.stages[sl] = null;
      P.sguns[sl] = (sk.sguns[sl]||[]).filter(g=>P.owned.includes(g));
    });
    save(); refreshStats(); Snd.buy(); renderShipyard(); refreshAllUI();
    toast('🚀 <b>'+sk.name+'</b> staging fitted — boosters and stage guns swapped', 3600);
  });
}
function renderStageBay(){
  const el = document.getElementById('shop-stage');
  const ownedStages = Object.keys(PARTS).filter(k=>PARTS[k].cat==='stage'&&P.owned.includes(k));
  const ownedGuns   = Object.keys(PARTS).filter(k=>PARTS[k].cat==='sgun'&&P.owned.includes(k));
  let html = '<div class="shopNote">Boosters hang <b>below</b> the core and burn from the bottom up: '+
    '<b>Stage 1</b> lights on the pad, and when its tank runs dry it <b>separates</b> and tumbles away — '+
    'shedding dead mass so the next engine, then your core, flies lighter. Guns bolted to a stage mount fire '+
    'with <span class="kbd">SPACE</span> for as long as that stage is attached. Buy stages &amp; guns in the Buy Parts aisle.</div>'+
    '<div class="upRow" style="grid-template-columns:1fr"><div class="kv">'+
      '<span>LAUNCH MASS '+fmt(launchMass())+' t</span>'+
      '<span class="up">LIFTOFF THRUST '+fmt(launchThrust())+'</span>'+
      '<span class="'+(launchTWR()<1.05?'dn':'up')+'">TWR '+launchTWR().toFixed(2)+'</span>'+
      '<span>TOTAL FUEL '+fmt(totalFuel())+' u</span>'+
      '<span>BURN ORDER '+burnOrder()+'</span></div></div>';
  ['a','b'].forEach((sl,si)=>{
    const id = P.stages[sl];
    html += '<div class="upRow" style="grid-template-columns:1fr;gap:10px">'+
      '<div class="upHead"><h4>'+(si===0?'STAGE 1 · ignites on the pad':'STAGE 2 · lights after stage 1')+'</h4>'+
      '<span class="cat">slot '+sl.toUpperCase()+'</span></div>'+
      '<div class="kv" style="margin:6px 0">'+
        (id ? '<span class="up">'+PARTS[id].name+(lvlOf(id)?' · MK '+(lvlOf(id)+1):'')+'</span>'+
              '<span>THRUST '+fmt(PARTS[id].thrust*(1+0.09*lvlOf(id)))+'</span>'+
              '<span>BURN '+PARTS[id].burn+' u/s</span>'+
              '<span>FUEL '+fmt(PARTS[id].fuel*(1+0.12*lvlOf(id)))+' u</span>'+
              '<span>MOUNTS '+(PARTS[id].mounts||0)+'</span>'+
              '<span>MASS '+(PARTS[id].mass+slotGunMass(sl))+' t</span>'
            : '<span>— empty slot —</span>')+
      '</div>'+
      '<div class="kv"><button class="btn small '+(id===null?'primary':'ghost')+'" data-stage="-" data-slot="'+sl+'">Empty</button>'+
        ownedStages.map(s2=>'<button class="btn small '+(id===s2?'primary':'')+'" data-stage="'+s2+'" data-slot="'+sl+'">'+PARTS[s2].name+'</button>').join('')+
        (ownedStages.length===0?'<span class="dn">no stages owned — buy one in Buy Parts</span>':'')+
      '</div>';
    if(id){
      const mounts = PARTS[id].mounts||0;
      html += '<div class="muted" style="font-size:11px;margin:10px 0 4px;font-weight:800;letter-spacing:.12em">GUN MOUNTS ON THIS STAGE</div>';
      if(!mounts) html += '<div class="muted" style="font-size:12px">This stage carries no gun mounts.</div>';
      for(let m=0;m<mounts;m++){
        const cur = (P.sguns[sl]||[])[m]||null;
        html += '<div class="kv" style="margin:5px 0"><span style="min-width:56px">M'+(m+1)+'</span>'+
          '<button class="btn small '+(cur===null?'primary':'ghost')+'" data-sgun="-" data-slot="'+sl+'" data-mount="'+m+'">empty</button>'+
          ownedGuns.map(g=>'<button class="btn small '+(cur===g?'primary':'')+'" data-sgun="'+g+'" data-slot="'+sl+'" data-mount="'+m+'">'+PARTS[g].name+'</button>').join('')+
          (ownedGuns.length===0?'<span class="dn">no stage guns owned</span>':'')+
          (cur?'<span class="up">DMG '+PARTS[cur].dmg+' · RATE '+PARTS[cur].rate+' · '+PARTS[cur].shots+'x</span>':'')+
          '</div>';
      }
    }
    html += '</div>';
  });
  el.innerHTML = html;
  el.querySelectorAll('[data-stage]').forEach(b2=>b2.onclick=()=>assignStage(b2.dataset.slot, b2.dataset.stage==='-'?null:b2.dataset.stage));
  el.querySelectorAll('[data-sgun]').forEach(b2=>b2.onclick=()=>assignStageGun(b2.dataset.slot, +b2.dataset.mount, b2.dataset.sgun==='-'?null:b2.dataset.sgun));
}
function renderChuteTab(){
  const el = document.getElementById('shop-chute');
  el.innerHTML = '<div class="upHead"><h4>🪂 PARACHUTE BAY</h4>'+
    '<p>Canopies <b>auto-deploy the moment every tank runs dry</b> — no button, no panic. '+
    'Bigger silk = slower fall = softer touchdowns. One equipped at a time; it adds a little mass.</p></div>' +
    ['chute-daisy','chute-brake','chute-feather'].map(id=>{
      const p = PARTS[id], owned = P.owned.includes(id), eq = P.build.chute===id;
      return '<div class="upCard"><div class="upHead"><h4>'+p.name+' <span class="mut">'+p.tier+'</span>'+
        (eq?' <span class="eq">FITTED</span>':'')+'</h4>'+
        '<div class="muted">'+p.desc+' Mass '+p.mass+' t · fall speed '+Math.round(p.limit/4)+' m/s.</div></div>'+
        (owned ? (eq ? '<button class="btn ghost small" disabled>EQUIPPED</button>'
                     : '<button class="btn ghost small" onclick="equipChute(\''+id+'\')">EQUIP</button>')
               : '<button class="btn primary small" onclick="buyPart(\''+id+'\')">'+
                 ((p.cost.rp||0) ? 'UNLOCK '+fmt(p.cost.rp)+' RP' : ' CLAIM FREE')+'</button>')+
        '</div>';
    }).join('');
}
function equipChute(id){ P.build.chute=id; save(); Snd.buy(); renderShop(); }
function renderAmmoLab(){
  const el = document.getElementById('shop-ammo');
  el.innerHTML = '<div class="shopNote">Permanent bullet technology. Every mark applies to <b>all</b> of your guns — '+
    'the core weapon and every stage mount — for the rest of your career.</div>'+
    AMMO.map(a=>{
      const L=ammoLvl(a.id), maxed=L>=a.max, c=a.cost(L), can=P.rp>=c.rp&&P.rs>=c.rs;
      const pips=Array.from({length:a.max},(_,i)=>'<i class="'+(i<L?'on':'')+'"></i>').join('');
      return '<div class="upRow">'+
        '<div><div class="upHead"><h4>'+a.name+'</h4><span class="cat">ammo tech</span></div>'+
          '<div class="pips" style="margin-top:7px">'+pips+'</div>'+
          '<div class="muted" style="font-size:11.5px;margin-top:6px">'+a.desc+'</div></div>'+
        '<div class="kv"><span class="up">NOW: '+ammoNow(a.id)+'</span></div>'+
        '<div style="text-align:right">'+
          (maxed?'<div class="chip" style="border-color:#1a5a35;color:#7cf0a8">MAXED</div>':
            '<div class="price" style="justify-content:flex-end;margin-bottom:7px">'+
              (c.rp?'<span class="rp-c">'+fmt(c.rp)+' RP</span>':'')+
              (c.rs?'<span class="rs-c">'+fmt(c.rs)+' RS</span>':'')+'</div>'+
            '<button class="btn small '+(can?'primary':'')+'" data-ammo="'+a.id+'" '+(can?'':'disabled')+'>⬆ Buy mark</button>')+
        '</div></div>';
    }).join('');
  el.querySelectorAll('[data-ammo]').forEach(b2=>b2.onclick=()=>buyAmmo(b2.dataset.ammo));
}
function upPreviewHTML(id){
  const p = PARTS[id], L = lvlOf(id), N = Math.min(MAXLVL, L+1);
  const a = upStat(id,L), b = upStat(id,N);
  const rows = [];
  const row = (label, key, d, lowerBetter)=>{
    if(a[key]===undefined) return;
    const good = lowerBetter ? (b[key]<a[key]) : (b[key]>a[key]);
    const f = v => Math.round(v*Math.pow(10,d))/Math.pow(10,d);
    rows.push('<span'+(good?' class="up"':'')+'>'+label+' '+f(a[key])+' → '+f(b[key])+'</span>');
  };
  row('THRUST','thrust',0); row('VMAX','vmax',0); row('FUEL','fuel',0);
  row('DMG','dmg',1); row('RATE','rate',2); row('HULL','hp',0); row('SHLD','shield',1);
  row('TURN','turn',2); row('DRAG','drag',2,true); row('RP x','rpMult',2); row('RS x','rsMult',2);
  return rows.join('') || '<span>—</span>';
}
function upRowHTML(c){
  const id = c.id, p = PARTS[id], L = lvlOf(id), maxed = L>=MAXLVL;
  const cost = upCost(id), can = P.rp>=cost.rp && P.rs>=cost.rs;
  const pips = [0,1,2].map(i=>'<i class="'+(i<L?'on':'')+'"></i>').join('');
  return '<div class="upRow">'+
    '<div><div class="upHead"><h4>'+p.name+'</h4><span class="cat">'+c.label+'</span></div>'+
      '<div class="pips" style="margin-top:7px">'+pips+'</div>'+
      '<div class="muted" style="font-size:11.5px;margin-top:6px">Mark '+(L+1)+' of '+(MAXLVL+1)+
      (maxed?' · fully developed':'')+'</div></div>'+
    '<div class="kv">'+upPreviewHTML(id)+'</div>'+
    '<div style="text-align:right">'+
      (maxed ? '<div class="chip" style="border-color:#1a5a35;color:#7cf0a8">MAXED</div>'
             : '<div class="price" style="justify-content:flex-end;margin-bottom:7px">'+
                 (cost.rp?'<span class="rp-c">'+fmt(cost.rp)+' RP</span>':'')+
                 (cost.rs?'<span class="rs-c">'+fmt(cost.rs)+' RS</span>':'')+'</div>'+
               '<button class="btn small '+(can?'primary':'')+'" data-up="'+id+'" '+((can)?'':'disabled')+'>⬆ Upgrade</button>')+
    '</div></div>';
}
function isFitted(id){
  const c = PARTS[id].cat;
  if(c==='stage') return P.stages.a===id || P.stages.b===id;
  if(c==='sgun')  return ['a','b'].some(sl=>(P.sguns[sl]||[]).includes(id));
  return false;
}
function assignStage(sl, id){
  if(id && !P.owned.includes(id)) return;
  P.stages[sl] = id; save(); Snd.tone(560,0.08,'triangle',0.09);
  refreshStats(); refreshAllUI();
}
function assignStageGun(sl, mount, id){
  if(id && !P.owned.includes(id)) return;
  const arr = (P.sguns[sl]||[]).slice();
  arr[mount] = id;
  P.sguns[sl] = arr; save(); Snd.tone(620,0.07,'triangle',0.08);
  refreshStats(); refreshAllUI();
}
function buyAmmo(id){
  const a = AMMO.find(x=>x.id===id), L = ammoLvl(id);
  if(L>=a.max) return;
  const c = a.cost(L);
  if(P.rp<c.rp || P.rs<c.rs){ Snd.deny(); toast('Not enough funds for <b>'+a.name+'</b>'); return; }
  P.rp-=c.rp; P.rs-=c.rs; P.ammo[id]=L+1; save(); Snd.buy();
  toast('💥 <b>'+a.name+'</b> mark '+(L+1)+' installed — all guns benefit');
  refreshAllUI();
}
function ammoNow(id){
  const L=ammoLvl(id);
  const m=ammoMods();
  switch(id){
    case 'heavy': return 'x'+m.dmg.toFixed(2)+' damage';
    case 'velocity': return 'x'+m.spd.toFixed(2)+' speed';
    case 'feed': return 'x'+m.rate.toFixed(2)+' rate';
    case 'ap': return '+'+m.pierce+' pierce';
    case 'split': return '+'+m.shots+' projectile'+(m.shots===1?'':'s');
    case 'frag': return m.splash? m.splash+' blast':'no blast';
    case 'seeker': return m.seek? 'homing ON':'no homing';
  }
  return 'Mk '+(L+1);
}
function benchItems(){
  const items = BUILD_CATS.map(c=>({label:c.label, id:P.build[c.id]}));
  ['a','b'].forEach((sl,i)=>{
    const id=P.stages[sl]; if(id) items.push({label:'Stage '+(i+1), id});
    stageGunList(sl).forEach((g,gi)=>items.push({label:'S'+(i+1)+'·gun '+(gi+1), id:g}));
  });
  return items;
}
function upgradePart(id){
  const L = lvlOf(id);
  if(L>=MAXLVL || !P.owned.includes(id)) return;
  const c = upCost(id);
  if(P.rp < c.rp || P.rs < c.rs){
    Snd.deny(); toast('Not enough funds to develop <b>'+PARTS[id].name+'</b> further'); return;
  }
  P.rp -= c.rp; P.rs -= c.rs;
  P.lvl[id] = L+1; save(); Snd.buy();
  toast('⬆ <b>'+PARTS[id].name+'</b> developed to Mark '+(L+2));
  refreshAllUI();
}

/* ---------------- hangar preview canvas ---------------- */
function drawPreview(t){
  const r = pv.getBoundingClientRect();
  const w = r.width, h = r.height;
  if(w<4||h<4) return;
  pvx.clearRect(0,0,w,h);
  // backdrop
  const g = pvx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#070c18'); g.addColorStop(1,'#0d1526');
  pvx.fillStyle=g; pvx.fillRect(0,0,w,h);
  pvx.save();
  for(let i=0;i<46;i++){
    const x=((i*97.13)%1)*w, y=((i*57.7+t*4)%h);
    pvx.globalAlpha=0.25+0.5*((i*13)%7)/7;
    pvx.fillStyle='#cfe0ff'; pvx.fillRect((i*173)%w, y, 1.4, 1.4);
  }
  pvx.restore();
  // pad glow
  const pg = pvx.createRadialGradient(w/2,h*0.94,4,w/2,h*0.94,w*0.5);
  pg.addColorStop(0,'rgba(255,170,60,.30)'); pg.addColorStop(1,'rgba(255,170,60,0)');
  pvx.fillStyle=pg; pvx.fillRect(0,h*0.6,w,h*0.4);

  const L = layout(P.build);
  const shut = !!(skinOf() && skinOf().shape==='shuttle');   // the shuttle stack is much wider
  const sc = clamp(Math.min(w/(L.R*(shut?20:7.5)), (h*0.70)/L.H), 0.45, 2.2);
  pvx.save();
  pvx.translate(w/2, h*0.45 + Math.sin(t*1.4)*3);
  pvx.rotate(Math.sin(t*0.7)*0.045);
  pvx.scale(sc,sc);
  const pvStages = ['a','b'].map(sl=>P.stages[sl]).filter(id=>id&&P.owned.includes(id))
    .map((id,i)=>({ id, active:i===0, frac:1, guns:stageGunList(id===P.stages.a?'a':'b') }));
  drawRocket(pvx, P.build, t, {flame: 0.35 + 0.2*Math.sin(t*3), shield:1, stages: pvStages});
  pvx.restore();
  // name plate
  pvx.fillStyle='rgba(220,230,255,.85)'; pvx.font='700 11px ui-monospace,Consolas,monospace';
  pvx.textAlign='center';
  pvx.fillStyle='rgba(5,9,18,.72)';
  const cap='SCALE MODEL · LIFTOFF TWR '+launchTWR().toFixed(2)+' · '+fmt(totalFuel())+'u FUEL';
  const cw = pvx.measureText(cap).width;
  pvx.fillRect(w/2-cw/2-8, h-22, cw+16, 17);
  pvx.fillStyle='rgba(220,230,255,.9)'; pvx.fillText(cap, w/2, h-10);
}
