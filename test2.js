// Headless smoke-test: stubs DOM + canvas, drives the loop, flags NaN draw coords.
const fs = require('fs');
const src = fs.readFileSync('/home/user/nova-ascent/index.html', 'utf8');
const js = src.slice(src.indexOf('<script>') + 8, src.lastIndexOf('</script>'));

let rafCb = null, VCLOCK = 1000;
const nanCalls = new Map();
function scan(name, args) {
  for (const a of args) {
    if (typeof a === 'number' && !Number.isFinite(a)) {
      nanCalls.set(name, (nanCalls.get(name) || 0) + 1); return;
    }
  }
}
const ctxStub = new Proxy({}, {
  get(t, p) {
    if (p === 'measureText') return (s) => ({ width: String(s).length * 7 });
    if (p === 'createLinearGradient' || p === 'createRadialGradient')
      return (...a) => { scan(p, a); return { addColorStop(...b) { scan('addColorStop', b); } }; };
    if (p === 'canvas') return { width: 1280, height: 720 };
    if (typeof p === 'string' && p in t) return t[p];
    return (...a) => { scan(String(p), a); };
  },
  set(t, p, v) { if (typeof v === 'number' && !Number.isFinite(v)) nanCalls.set('set:' + String(p), (nanCalls.get('set:' + String(p)) || 0) + 1); t[p] = v; return true; }
});
function mkEl(id) {
  const el = {
    id, _cls: new Set(id === 'scr-title' ? ['screen', 'on'] : ['screen']),
    style: {}, dataset: {}, children: [], innerHTML: '', textContent: '',
    width: 0, height: 0, onclick: null,
    classList: {
      add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); },
      toggle(c, on) { on ? el._cls.add(c) : el._cls.delete(c); return on; },
      contains(c) { return el._cls.has(c); }
    },
    getContext: () => ctxStub,
    getBoundingClientRect: () => ({ width: 400, height: 300, top: 0, left: 0 }),
    addEventListener() {}, querySelectorAll: () => [], appendChild(c) { return c; },
    click() { if (el.onclick) el.onclick({}); }
  };
  return el;
}
const els = {}; const get = id => els[id] || (els[id] = mkEl(id));
global.window = global;
global.document = { getElementById: get, querySelectorAll: () => [], addEventListener() {}, createElement: t => mkEl('c' + t), body: mkEl('body') };
global.navigator = { maxTouchPoints: 0 };
global.innerWidth = 1280; global.innerHeight = 720; global.devicePixelRatio = 1;
global.performance = { now: () => VCLOCK };
global.requestAnimationFrame = cb => { rafCb = cb; return 1; };
global.confirm = () => true;
Object.defineProperty(global, 'localStorage', { get() { throw new Error('blocked'); } });
const listeners = {};
global.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };
const errors = [];
const vm = require('vm');
try { vm.runInThisContext(js, { filename: 'game.js' }); } catch (e) { console.log('BOOT ERROR:', e.stack); process.exit(1); }

function step(n, auto) {
  for (let i = 0; i < n; i++) {
    if (auto) auto(i);
    const cb = rafCb; rafCb = null;
    if (!cb) { errors.push('no rAF at frame ' + i); return; }
    VCLOCK += 16.7;
    try { cb(VCLOCK); } catch (e) { errors.push('FRAME ' + i + ': ' + e.stack); return; }
  }
}
const setK = (k, v) => { keys[k] = v; };

/* ---------- 1. TUTORIAL, played by an autopilot ---------- */
get('btn-tut-title').onclick();
for (let i = 0; i < 5; i++) get('btn-tut-next').onclick();
console.log('practice start: mode =', mode, 'tutorial =', run.tutorial);

let frames = 0;
step(4000, () => {
  frames++;
  if (mode !== 'tutplay') return;
  const st = TUT_STEPS[tutStep] ? TUT_STEPS[tutStep].id : 'end';
  keys.left = keys.right = keys.fire = false;
  if (st === 'steer') { (Math.floor(frames / 40) % 2) ? setK('left', true) : setK('right', true); }
  else if (st === 'climb') { /* auto-thrust climbs; keep level */ setK(R.angle > 0.05 ? 'left' : 'right', Math.abs(R.angle) > 0.05); }
  else if (st === 'shoot') {
    const tgt = enemies.find(e => e.tut) || enemies[0];
    setK('fire', true);
    if (tgt) { const d = tgt.x - R.x; setK(d > 14 ? 'right' : (d < -14 ? 'left' : false), d > 14 || d < -14); }
  } else if (st === 'fuel') {
    const p = pickups.find(x => x.kind === 'fuel');
    if (p) { const d = p.x - R.x; setK(d > 12 ? 'right' : (d < -12 ? 'left' : false), d > 12 || d < -12); }
  }
});
console.log('tutorial result: tutStep =', tutStep + '/' + TUT_STEPS.length, 'mode =', mode,
            'maxAlt =', Math.round(run.maxAlt), 'flags =', JSON.stringify(tutFlags),
            'frames =', frames);

/* ---------- 2. REAL FLIGHT, full auto-pilot to the top ---------- */
if (mode !== 'build') gotoBuild();
step(10);
P.rp = 60000; P.rs = 4000; renderHangar();
['eng-dual', 'tank-std', 'fin-swept', 'wpn-twin', 'hull-titan', 'mod-probe', 'nose-aero'].forEach(buyPart);
refreshStats();
console.log('build: TWR', STATS.twr.toFixed(2), 'fuel', STATS.fuel, 'endur', STATS.endurance.toFixed(0) + 's', 'dps', Math.round(STATS.dps), 'hp', STATS.hp);
get('btn-launch').onclick();

let guard = 0;
step(9000, () => {
  guard++;
  if (mode !== 'play') return;
  keys.left = keys.right = false;
  // dodge + aim at nearest threat, keep nose roughly up
  let tgt = null, best = 1e9;
  for (const e of enemies) { const d = Math.hypot(e.x - R.x, e.y - R.y); if (e.y < R.y && d < best) { best = d; tgt = e; } }
  if (tgt && best < 620) {
    const want = Math.atan2(tgt.x - R.x, -(tgt.y - R.y));
    const d = want - R.angle;
    setK(d > 0.05 ? 'right' : 'left', Math.abs(d) > 0.05);
    keys.fire = best < 520;
  } else {
    const d = -R.angle;                       // self-level and climb
    setK(d > 0.05 ? 'right' : (d < -0.05 ? 'left' : false), Math.abs(d) > 0.05);
    keys.fire = false;
  }
  if (R.hp < R.maxhp * 0.3 && R.vy > 0) { /* dive away */ }
  if (guard % 900 === 0) console.log('   t=' + (guard / 60).toFixed(0) + 's alt=' + Math.round(run.maxAlt) +
    'm hp=' + Math.round(R.hp) + ' fuel=' + Math.round(R.fuel) + ' kills=' + run.kills +
    ' rp=' + run.rp + ' rs=' + run.rs + ' enemies=' + enemies.length + ' mode=' + mode);
});
console.log('flight end: mode =', mode, 'reason =', run.reason, 'maxAlt =', Math.round(run.maxAlt),
            'kills =', run.kills, 'rp =', run.rp, 'rs =', run.rs, 'missions =', run.missions.map(m => m.id).join(','));
if (mode === 'summary') console.log('summary ok, html', get('sum-panel').innerHTML.length, 'chars; P.best =', P.best, 'P.rp =', P.rp, 'P.rs =', P.rs);

/* ---------- 3. boss reachability ---------- */
gotoBuild(); step(5);
P.rp = 999999; P.rs = 99999; renderHangar();
['eng-sing', 'tank-cryo', 'fin-mag', 'wpn-rail', 'hull-aegis', 'mod-obs', 'nose-quantum'].forEach(buyPart);
refreshStats(); get('btn-launch').onclick();
let sawBoss = 0, bossKilled = 0;
step(14000, () => {
  if (mode !== 'play') return;
  keys.left = keys.right = false; keys.fire = true;
  const w = enemies.find(e => e.type === 'warden');
  if (w) { sawBoss = 1; const d = (w.x - R.x); setK(d > 10 ? 'right' : (d < -10 ? 'left' : false), Math.abs(d) > 10); }
  else { const d = -R.angle; setK(d > 0.05 ? 'right' : (d < -0.05 ? 'left' : false), Math.abs(d) > 0.05); }
});
console.log('endgame: maxAlt =', Math.round(run.maxAlt), 'bossSeen =', sawBoss, 'bossKilled =', run.bossKilled,
            'mode =', mode, 'reason =', run.reason, 'missions =', P.missions.join(','));

console.log('\nNaN draw calls:', nanCalls.size ? [...nanCalls].map(([k, v]) => k + '×' + v).join(', ') : 'none ✔');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO RUNTIME ERRORS ✔');
