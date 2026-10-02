// Tuning sim: replicates the flight physics and reports max altitude per build.
const G = 250;
function sim(cfg, b) {
  const accel = b.thrust / b.mass * cfg.K;
  let y = 0, vy = 0, fuel = b.fuel, maxPx = 0, t = 0;
  const dt = 1 / 120;
  for (let i = 0; i < 60 * 400; i++) {
    t += dt;
    if (fuel > 0) { fuel -= b.burn * dt; vy -= accel * dt; }
    vy += G * dt;
    const alt = Math.max(0, -y / cfg.PPM);
    const dens = Math.exp(-alt / cfg.DSCALE);
    const sp = Math.abs(vy);
    if (sp > 1) {
      const decel = Math.min(sp / dt * 0.9, b.drag * cfg.DK * dens * sp);
      vy -= Math.sign(vy) * decel * dt;
    }
    const maxV = b.vmax * (1.6 - 0.6 * b.noseDrag) * cfg.NF * (1 + 0.35 * (1 - dens));
    if (Math.abs(vy) > maxV) { const k = 1 - Math.min(0.5, (Math.abs(vy) - maxV) / Math.abs(vy) * dt * 3.5); vy *= k; }
    y += vy * dt;
    maxPx = Math.max(maxPx, -y);
    if (y > 0 && i > 60) break;
  }
  return { alt: maxPx / cfg.PPM, t, endur: b.fuel / b.burn };
}
const P = {
  'nose-basic': { mass: 4, drag: 1.00 }, 'nose-aero': { mass: 5, drag: 0.80 },
  'nose-hyper': { mass: 6, drag: 0.62 }, 'nose-quantum': { mass: 5, drag: 0.45 },
  'tank-small': { mass: 8, fuel: 90 }, 'tank-std': { mass: 14, fuel: 160 },
  'tank-ext': { mass: 23, fuel: 260 }, 'tank-cryo': { mass: 31, fuel: 400 },
  'eng-tiny': { mass: 10, thrust: 270, burn: 6.0, vmax: 265 }, 'eng-dual': { mass: 14, thrust: 450, burn: 9.5, vmax: 385 },
  'eng-ion': { mass: 12, thrust: 420, burn: 6.5, vmax: 430 }, 'eng-nuke': { mass: 22, thrust: 740, burn: 16.0, vmax: 560 },
  'eng-sing': { mass: 26, thrust: 1010, burn: 13.0, vmax: 720 },
  'fin-basic': { mass: 4 }, 'fin-swept': { mass: 5 }, 'fin-delta': { mass: 7 }, 'fin-mag': { mass: 8 },
  'wpn-pulse': { mass: 6 }, 'wpn-twin': { mass: 9 }, 'wpn-plasma': { mass: 11 }, 'wpn-rail': { mass: 15 }, 'wpn-nova': { mass: 17 },
  'mod-none': { mass: 2 }, 'mod-probe': { mass: 6 }, 'mod-lab': { mass: 9 }, 'mod-obs': { mass: 12 },
  'hull-alloy': { mass: 12 }, 'hull-titan': { mass: 17 }, 'hull-nano': { mass: 18 }, 'hull-aegis': { mass: 24 }
};
function build(parts) {
  let mass = 0, drag = 1, fuel = 0, thrust = 0, burn = 1, vmax = 300;
  parts.forEach(id => {
    const p = P[id]; mass += p.mass;
    if (p.drag !== undefined) drag = p.drag * (1 + 0); // drag mult applied later
    if (p.fuel !== undefined) fuel = p.fuel;
    if (p.thrust !== undefined) { thrust = p.thrust; burn = p.burn; vmax = p.vmax; }
  });
  const noseId = parts[0];
  drag = P[noseId].drag * (1 + mass / 260);
  return { mass, drag, fuel, thrust, burn, vmax, noseDrag: P[noseId].drag };
}
const BUILDS = {
  'STARTER  (tiny/pony/basic/stubby/pulse/none/alloy)': ['nose-basic', 'tank-small', 'eng-tiny', 'fin-basic', 'wpn-pulse', 'mod-none', 'hull-alloy'],
  'TIER2    (aero/std/dual/swept/twin/probe/titan)': ['nose-aero', 'tank-std', 'eng-dual', 'fin-swept', 'wpn-twin', 'mod-probe', 'hull-titan'],
  'TIER3    (hyper/ext/ion/delta/plasma/lab/nano)': ['nose-hyper', 'tank-ext', 'eng-ion', 'fin-delta', 'wpn-plasma', 'mod-lab', 'hull-nano'],
  'TIER4    (hyper/cryo/nuke/delta/rail/lab/aegis)': ['nose-hyper', 'tank-cryo', 'eng-nuke', 'fin-delta', 'wpn-rail', 'mod-lab', 'hull-aegis'],
  'TIER5    (quantum/cryo/sing/mag/nova/obs/aegis)': ['nose-quantum', 'tank-cryo', 'eng-sing', 'fin-mag', 'wpn-nova', 'mod-obs', 'hull-aegis']
};
const cfgs = {
  'A': { K: 96, PPM: 4, DSCALE: 2600, DK: 0.0022, NF: 1.0 },
  'B': { K: 96, PPM: 5, DSCALE: 2600, DK: 0.0022, NF: 1.0 },
  'C': { K: 104, PPM: 4, DSCALE: 2600, DK: 0.0026, NF: 0.92 }
};
for (const [cn, cfg] of Object.entries(cfgs)) {
  console.log('\n=== ' + cn + '  ' + JSON.stringify(cfg));
  for (const [bn, parts] of Object.entries(BUILDS)) {
    const b = build(parts);
    const r = sim(cfg, b);
    const twr = (b.thrust / b.mass * cfg.K) / G;
    console.log('  ' + bn.padEnd(52) + ' TWR ' + twr.toFixed(2) +
      '  endur ' + r.endur.toFixed(0).padStart(3) + 's  t=' + r.t.toFixed(0).padStart(3) + 's  mass ' + String(b.mass).padStart(3) +
      '  MAX ALT ' + Math.round(r.alt).toLocaleString().padStart(8) + ' m');
  }
}
