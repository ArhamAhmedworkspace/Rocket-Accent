/* =========================================================================
   MOBILE EDITION — touch controls. Only present in mobile.html.
   Left  : analogue joystick  → steer (A / D)
   Right : throttle strip     → swipe up / down to set throttle
   Buttons: FIRE (hold), AUTO-FIRE toggle, ENGINE (E), PAUSE
   ========================================================================= */
const IS_TOUCH = (typeof window !== 'undefined') &&
  (('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer:coarse)').matches));

if(IS_TOUCH){
  document.body.classList.add('mobile');

  const mctrl = document.getElementById('mctrl');
  const joy   = document.getElementById('mjoy');
  const knob  = document.getElementById('mjoy-knob');
  const thr   = document.getElementById('mthr');
  const fill  = document.getElementById('mthr-fill');
  const tknob = document.getElementById('mthr-knob');
  const tlbl  = document.getElementById('mthr-lbl');
  let autoFire = false, fireHeld = false, joyDX = 0;

  /* ---------- show controls only while flying ---------- */
  setInterval(()=>{
    const flying = (typeof mode !== 'undefined') && (mode==='play' || mode==='tutplay' || mode==='countdown');
    if(mctrl) mctrl.classList.toggle('on', !!flying);
    document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth);
    if(autoFire && typeof keys !== 'undefined') keys.fire = true;      // AUTO-FIRE keeps the guns hot
    else if(typeof keys !== 'undefined' && !fireHeld) keys.fire = false;
  }, 120);

  /* ---------- joystick -------------------------------------------------- */
  const JR = 56;
  function joyMove(dx){
    joyDX = Math.max(-1, Math.min(1, dx/JR));
    if(knob) knob.style.transform = 'translate('+(joyDX*JR*0.62)+'px,0)';
    if(typeof keys !== 'undefined'){ keys.left = joyDX < -0.28; keys.right = joyDX > 0.28; }
  }
  function joyEnd(){
    joyDX = 0; if(knob) knob.style.transform = 'translate(0,0)';
    if(typeof keys !== 'undefined'){ keys.left = false; keys.right = false; }
  }
  if(joy){
    let jid = null, jx = 0;
    const rect = el => el.getBoundingClientRect();
    joy.addEventListener('pointerdown', e=>{ jid = e.pointerId; jx = e.clientX; joyMove(0);
      joy.setPointerCapture && joy.setPointerCapture(e.pointerId); e.preventDefault(); Snd.init && Snd.init(); }, {passive:false});
    joy.addEventListener('pointermove', e=>{ if(e.pointerId !== jid) return;
      joyMove(e.clientX - jx); e.preventDefault(); }, {passive:false});
    ['pointerup','pointercancel','pointerleave'].forEach(ev =>
      joy.addEventListener(ev, e=>{ if(e.pointerId !== jid) return; jid = null; joyEnd(); }, {passive:false}));
  }

  /* ---------- throttle strip (absolute + swipe) ------------------------- */
  if(thr){
    let tid = null, lastY = 0;
    const setThr = v=>{
      v = Math.max(0, Math.min(1, v));
      if(typeof R !== 'undefined' && R) R.thr = v;
      if(fill)  fill.style.height = (v*100)+'%';
      if(tknob) tknob.style.bottom = 'calc('+(v*100)+'% - 4px)';
      if(tlbl)  tlbl.textContent = 'THR '+Math.round(v*100)+'%';
    };
    const fromY = y=>{ const r = thr.getBoundingClientRect(); return 1 - (y - r.top)/r.height; };
    thr.addEventListener('pointerdown', e=>{ tid = e.pointerId; lastY = e.clientY; setThr(fromY(e.clientY));
      thr.setPointerCapture && thr.setPointerCapture(e.pointerId); e.preventDefault(); Snd.init && Snd.init(); }, {passive:false});
    thr.addEventListener('pointermove', e=>{
      if(e.pointerId !== tid) return;
      const dy = lastY - e.clientY; lastY = e.clientY;                 // relative swipe…
      const cur = (typeof R!=='undefined' && R) ? R.thr : 0;
      setThr(Math.abs(dy) > 3 ? cur + dy/thr.getBoundingClientRect().height : fromY(e.clientY));
      e.preventDefault();
    }, {passive:false});
    ['pointerup','pointercancel','pointerleave'].forEach(ev =>
      thr.addEventListener(ev, e=>{ if(e.pointerId !== tid) return; tid = null; }, {passive:false}));
  }

  /* ---------- buttons --------------------------------------------------- */
  const hook = (id, down, up)=>{
    const b = document.getElementById(id); if(!b) return;
    const on = e=>{ e.preventDefault(); down && down(); };
    const off = e=>{ if(e) e.preventDefault(); up && up(); };
    b.addEventListener('pointerdown', on, {passive:false});
    ['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev, off, {passive:false}));
  };
  hook('mb-fire', ()=>{ fireHeld = true; if(typeof keys!=='undefined') keys.fire = true; Snd.init && Snd.init(); },
                  ()=>{ fireHeld = false; if(typeof keys!=='undefined' && !autoFire) keys.fire = false; });
  const mbAuto = document.getElementById('mb-auto');
  if(mbAuto) mbAuto.addEventListener('click', e=>{
    e.preventDefault(); autoFire = !autoFire; mbAuto.classList.toggle('on', autoFire);
    toast && toast(autoFire ? '✸ <b>AUTO-FIRE ON</b> — guns keep talking' : '✸ Auto-fire off');
    if(typeof keys!=='undefined') keys.fire = autoFire || fireHeld;
  });
  const mbEng = document.getElementById('mb-eng');
  if(mbEng) mbEng.addEventListener('click', e=>{ e.preventDefault(); toggleEngine();
    mbEng.classList.toggle('on', !!(typeof R!=='undefined' && R && R.engOn)); });
  const mbPause = document.getElementById('mb-pause');
  if(mbPause) mbPause.addEventListener('click', e=>{ e.preventDefault(); togglePause(); });

  /* ---------- kill browser gestures on the play area -------------------- */
  ['gesturestart','gesturechange','contextmenu'].forEach(ev=>
    document.addEventListener(ev, e=>e.preventDefault(), {passive:false}));
  document.addEventListener('touchmove', e=>{ if(e.touches.length > 1) e.preventDefault(); }, {passive:false});
  document.addEventListener('dblclick', e=>e.preventDefault(), {passive:false});

  /* ---------- double-tap the canvas = dev console (no F1 on phones) ----- */
  let lastTap = 0;
  document.addEventListener('touchend', e=>{
    const now = Date.now();
    if(now - lastTap < 300){ toggleDevPanel && toggleDevPanel(); lastTap = 0; }
    else lastTap = now;
  }, {passive:true});
}
