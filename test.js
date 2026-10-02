// Headless smoke-test harness: stubs DOM + canvas and drives the game loop.
const fs = require('fs');
const src = fs.readFileSync('/home/user/nova-ascent/index.html', 'utf8');
const js = src.slice(src.indexOf('<script>') + 8, src.lastIndexOf('</script>'));

let rafCb = null;
const ctxStub = new Proxy({}, {
  get(t, p) {
    if (p === 'measureText') return () => ({ width: 60 });
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (p === 'canvas') return { width: 1280, height: 720 };
    if (typeof p === 'string' && p in t) return t[p];
    return () => undefined;
  },
  set(t, p, v) { t[p] = v; return true; }
});
function mkEl(id) {
  const el = {
    id, _cls: new Set(id === 'scr-title' ? ['screen', 'on'] : ['screen']),
    style: {}, dataset: {}, children: [], innerHTML: '', textContent: '', value: '',
    width: 0, height: 0, onclick: null, visibility: 'visible',
    classList: {
      add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); },
      toggle(c, on) { if (on === undefined) { el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); } else { on ? el._cls.add(c) : el._cls.delete(c); } return on; },
      contains(c) { return el._cls.has(c); }
    },
    getContext: () => ctxStub,
    getBoundingClientRect: () => ({ width: 400, height: 300, top: 0, left: 0 }),
    addEventListener() {}, removeEventListener() {},
    querySelectorAll: () => [],
    appendChild(c) { el.children.push(c); return c; },
    focus() {}, click() { if (el.onclick) el.onclick({}); }
  };
  return el;
}
const els = {};
function get(id) { return els[id] || (els[id] = mkEl(id)); }
global.window = global;
global.document = {
  getElementById: get,
  querySelectorAll: (sel) => [],
  addEventListener() {},
  createElement: (t) => mkEl('created-' + t),
  body: mkEl('body')
};
global.navigator = { maxTouchPoints: 0, userAgent: 'node' };
global.innerWidth = 1280; global.innerHeight = 720;
global.devicePixelRatio = 1;
let VCLOCK = 1000;
global.performance = { now: () => VCLOCK };
global.requestAnimationFrame = (cb) => { rafCb = cb; return 1; };
global.confirm = () => true;
global.alert = () => {};
// force localStorage to throw -> exercises the sandboxed-iframe fallback path
Object.defineProperty(global, 'localStorage', {
  get() { throw new Error('SecurityError: storage blocked'); }
});
const listeners = {};
global.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };


const errors = [];
process.on('uncaughtException', e => { errors.push('UNCAUGHT: ' + e.stack); });

// ---- run the game script ----
const vm = require('vm');
const sandbox = Object.assign(global, {});
try { vm.runInThisContext(js, { filename: 'game.js' }); }
catch (e) { console.log('BOOT ERROR:', e.stack); process.exit(1); }

function step(frames, keyState) {
  for (let i = 0; i < frames; i++) {
    if (keyState) for (const k in keyState) keys[k] = keyState[k];
    const cb = rafCb; rafCb = null;
    if (!cb) { errors.push('no rAF scheduled at frame ' + i); return; }
    VCLOCK += 16.7;
    try { cb(VCLOCK); }
    catch (e) { errors.push('FRAME ' + i + ': ' + e.stack); return; }
  }
}
function key(code, down) {
  (listeners['keydown' === 'x' ? '' : (down ? 'keydown' : 'keyup')] || []).forEach(f => f({ code, preventDefault() {} }));
}

console.log('boot OK · mode =', mode, '· parts =', Object.keys(PARTS).length, '· stats TWR =', STATS.twr.toFixed(2));

// title attract
step(60);
console.log('title frames OK, mode =', mode);

// open tutorial slides
get('btn-tut-title').onclick();
for (let i = 0; i < 5; i++) { get('btn-tut-next').onclick(); step(3); }
console.log('slides OK, slide =', slide);

// practice flight (tutorial)
get('btn-tut-next').onclick();   // -> Start Practice
console.log('tutorial mode =', mode, 'run.tutorial =', run.tutorial);
step(240);                       // countdown + flight
console.log('after 4s: mode=', mode, 'tutStep=', tutStep, 'alt=', Math.round(altitudeOf(R.y)), 'fuel=', Math.round(R.fuel));
keys.right = true; step(30); keys.right = false;
keys.left = true; step(30); keys.left = false;
console.log('steer flags:', JSON.stringify({ l: tutFlags.left, r: tutFlags.right }), 'tutStep=', tutStep);
step(400);
console.log('tutStep now', tutStep, 'alt', Math.round(run.maxAlt), 'enemies', enemies.length, 'pickups', pickups.length);
keys.fire = true; step(300); keys.fire = false;
console.log('after firing: tutStep', tutStep, 'kills', tutFlags.kills, 'bullets', bullets.length);
step(600);
console.log('tutStep final', tutStep, 'mode', mode);

// hangar
if (typeof gotoBuild === 'function') gotoBuild();
step(20);
console.log('hangar OK, mode =', mode, 'rp =', P.rp, 'rs =', P.rs);

// try buying something affordable
P.rp = 99999; P.rs = 9999; renderHangar();
buyPart('eng-nuke'); buyPart('tank-cryo'); buyPart('wpn-nova'); buyPart('hull-aegis');
buyPart('mod-obs'); buyPart('nose-quantum'); buyPart('fin-mag');
refreshStats();
console.log('after purchases: TWR =', STATS.twr.toFixed(2), 'fuel =', STATS.fuel, 'dps =', Math.round(STATS.dps), 'hp =', STATS.hp);

// real flight
get('btn-launch').onclick();
console.log('launch -> mode', mode);
step(220);
console.log('flight start: mode', mode, 'alt', Math.round(altitudeOf(R.y)), 'hp', R.hp);
keys.fire = true; keys.right = true; step(300); keys.right = false; keys.left = true; step(300); keys.left = false;
console.log('mid: alt', Math.round(run.maxAlt), 'kills', run.kills, 'enemies', enemies.length, 'rp', run.rp, 'rs', run.rs, 'hp', Math.round(R.hp), 'fuel', Math.round(R.fuel));
step(1200);
console.log('late: alt', Math.round(run.maxAlt), 'kills', run.kills, 'mode', mode, 'boss', enemies.filter(e => e.type === 'warden').length);
step(1200);
console.log('end: mode', mode, 'P.rp', P.rp, 'P.best', P.best, 'missions', P.missions.join(','));
if (mode === 'summary') { step(30); console.log('summary html len', get('sum-panel').innerHTML.length); }

// pause / resume during a fresh flight
gotoBuild(); get('btn-launch').onclick(); step(250);
togglePause(); console.log('paused mode =', mode); step(5);
togglePause(); console.log('resumed mode =', mode); step(20);
keys.fire = true; step(400);
// crash test
R.hp = 1; damageRocket(500, R.x, R.y); step(140);
console.log('after death: mode =', mode, 'reason =', run.reason);

console.log(errors.length ? '\nERRORS:\n' + errors.join('\n') : '\nNO RUNTIME ERRORS ✔');
