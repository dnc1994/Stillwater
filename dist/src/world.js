// world.js — the shape of the countryside. Pure data, no three.js, so it can be tested in Node.
//
// One closed river loop runs through six stretches (old town, willow bank, lotus pond,
// bamboo creek, reed marsh, rice paddies). Because it is a loop, there is never a dead end:
// drifting forward always brings you somewhere, and eventually back home.

export const SIZE = 340;          // half extent of the mapped world, metres
export const CELL = 2;            // resolution of the water-distance grid
export const N = (2 * SIZE) / CELL + 1;
const MAXD = 40;
const TAU = Math.PI * 2;
const SQUASH = 0.86;

export function rng(seed) {
  let s = 2166136261;
  for (const c of String(seed)) s = Math.imul(s ^ c.charCodeAt(0), 16777619);
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const smooth = (a, b, x) => {
  x = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
const lerp = (a, b, t) => a + (b - a) * t;

export const ZONES = {
  village: [0.0, 0.22],
  willow: [0.22, 0.36],
  lotus: [0.36, 0.52],
  bamboo: [0.52, 0.66],
  marsh: [0.66, 0.84],
  paddy: [0.84, 1.0],
};
const HALF_WIDTH = { village: 4.6, willow: 6.4, lotus: 7, bamboo: 3.5, marsh: 9, paddy: 6 };

export function zoneAt(u) {
  u = ((u % 1) + 1) % 1;
  for (const id in ZONES) if (u >= ZONES[id][0] && u < ZONES[id][1]) return id;
  return 'paddy';
}

// Soft membership of loop position u in a zone (1 inside, fading over `soft` at the ends).
export function zoneWeight(u, id, soft = 0.012) {
  const [a, b] = ZONES[id];
  const c = (a + b) / 2;
  if (u - c > 0.5) u -= 1;
  if (c - u > 0.5) u += 1;
  return smooth(a - soft, a + soft, u) * (1 - smooth(b - soft, b + soft, u));
}

export function makeWorld(seed = 'jiangnan') {
  const r = rng(seed + ':layout');
  const ph = [r() * TAU, r() * TAU, r() * TAU];
  const radius = (a) => 215 + 38 * Math.sin(2 * a + ph[0]) + 20 * Math.sin(3 * a + ph[1]) + 9 * Math.sin(5 * a + ph[2]);
  const dRadius = (a) => 76 * Math.cos(2 * a + ph[0]) + 60 * Math.cos(3 * a + ph[1]) + 45 * Math.cos(5 * a + ph[2]);

  const halfWidth = (u) => {
    let sum = 0, w = 0;
    for (const id in ZONES) { const k = zoneWeight(u, id, 0.02); sum += k * HALF_WIDTH[id]; w += k; }
    return sum / w;
  };

  // Point on the river centreline. t = downstream tangent, n = outward normal, sp = metres per unit u.
  const loop = (u) => {
    u = ((u % 1) + 1) % 1;
    const a = u * TAU, rr = radius(a), dr = dRadius(a);
    const x = rr * Math.cos(a), z = SQUASH * rr * Math.sin(a);
    let tx = dr * Math.cos(a) - rr * Math.sin(a), tz = SQUASH * (dr * Math.sin(a) + rr * Math.cos(a));
    const len = Math.hypot(tx, tz);
    tx /= len; tz /= len;
    return { u, x, z, tx, tz, nx: tz, nz: -tx, hw: halfWidth(u), sp: len * TAU };
  };
  const uAt = (x, z) => (((Math.atan2(z / SQUASH, x) / TAU) % 1) + 1) % 1;
  const outside = (x, z) => Math.hypot(x, z / SQUASH) > radius(Math.atan2(z / SQUASH, x));
  const at = (u, off = 0) => { const L = loop(u); return { x: L.x + L.nx * off, z: L.z + L.nz * off, L }; };
  const face = (dx, dz) => Math.atan2(dx, dz);

  // ---- water bodies -------------------------------------------------------------------------
  const lc = loop(0.44);
  const pond = { x: lc.x - lc.nx * (lc.hw + 24), z: lc.z - lc.nz * (lc.hw + 24), rx: 40, rz: 27, rot: Math.atan2(lc.tz, lc.tx), ph: r() * TAU };
  const lm = loop(0.75);
  const lake = { x: lm.x, z: lm.z, rx: 70, rz: 42, rot: Math.atan2(lm.tz, lm.tx), ph: r() * TAU };
  const local = (b, x, z) => {
    const c = Math.cos(b.rot), s = Math.sin(b.rot), dx = x - b.x, dz = z - b.z;
    return [dx * c + dz * s, -dx * s + dz * c];
  };
  const globalOf = (b, lx, lz) => {
    const c = Math.cos(b.rot), s = Math.sin(b.rot);
    return { x: b.x + lx * c - lz * s, z: b.z + lx * s + lz * c };
  };
  const islands = [];
  for (let i = 0; i < 7; i++) {
    const side = i % 2 ? 1 : -1, lx = (r() - 0.5) * 100, lz = side * (17 + r() * 14);
    islands.push({ ...globalOf(lake, lx, lz), r: 3.5 + r() * 4.5 });
  }
  // The back creek: a narrow lane of water from the old town to the lotus pond.
  const creek = [];
  {
    const a = loop(0.14), mx = (a.x + pond.x) / 2, mz = (a.z + pond.z) / 2, ml = Math.hypot(mx, mz);
    const cx = mx - (mx / ml) * 34, cz = mz - (mz / ml) * 34;
    for (let i = 0; i <= 44; i++) {
      const t = i / 44, k = 1 - t;
      creek.push({ x: k * k * a.x + 2 * k * t * cx + t * t * pond.x, z: k * k * a.z + 2 * k * t * cz + t * t * pond.z, hw: 2.5 + 0.9 * Math.sin(t * Math.PI) });
    }
  }
  const ring = [];
  for (let i = 0; i <= 360; i++) { const L = loop(i / 360); ring.push({ x: L.x, z: L.z, hw: L.hw }); }
  const loopLen = ring.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - ring[i - 1].x, p.z - ring[i - 1].z) : 0), 0);

  // ---- signed distance to the bank (negative = water) ------------------------------------------
  const grid = new Float32Array(N * N).fill(MAXD);
  const cellOf = (v) => Math.round((v + SIZE) / CELL);
  const stamp = (x0, z0, x1, z1, f) => {
    const i0 = Math.max(0, cellOf(x0)), i1 = Math.min(N - 1, cellOf(x1)), j0 = Math.max(0, cellOf(z0)), j1 = Math.min(N - 1, cellOf(z1));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * N + i;
      grid[k] = f(i * CELL - SIZE, j * CELL - SIZE, grid[k]);
    }
  };
  for (const path of [ring, creek]) for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz, pad = MAXD + 10;
    stamp(Math.min(a.x, b.x) - pad, Math.min(a.z, b.z) - pad, Math.max(a.x, b.x) + pad, Math.max(a.z, b.z) + pad, (x, z, d) => {
      const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / l2));
      return Math.min(d, Math.hypot(x - a.x - dx * t, z - a.z - dz * t) - lerp(a.hw, b.hw, t));
    });
  }
  for (const b of [pond, lake]) {
    const pad = Math.max(b.rx, b.rz) + MAXD;
    stamp(b.x - pad, b.z - pad, b.x + pad, b.z + pad, (x, z, d) => {
      const [lx, lz] = local(b, x, z), ang = Math.atan2(lz / b.rz, lx / b.rx);
      const q = Math.hypot(lx / b.rx, lz / b.rz) - 1 - 0.08 * Math.sin(3 * ang + b.ph) - 0.05 * Math.sin(5 * ang);
      return Math.min(d, q * Math.min(b.rx, b.rz));
    });
  }
  for (const s of islands) stamp(s.x - 20, s.z - 20, s.x + 20, s.z + 20, (x, z, d) => Math.max(d, s.r - Math.hypot(x - s.x, z - s.z)));

  const sdf = (x, z) => {
    const fx = (x + SIZE) / CELL, fz = (z + SIZE) / CELL;
    if (fx < 0 || fz < 0 || fx >= N - 1 || fz >= N - 1) return MAXD;
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j, k = j * N + i;
    return lerp(lerp(grid[k], grid[k + 1], tx), lerp(grid[k + N], grid[k + N + 1], tx), tz);
  };

  // ---- terrain ------------------------------------------------------------------------------
  const nr = rng(seed + ':noise');
  const lattice = new Float32Array(4096).map(() => nr());
  const hash = (i, j) => lattice[((i * 73856093) ^ (j * 19349663)) & 4095];
  const noise = (x, z) => {
    const i = Math.floor(x), j = Math.floor(z), tx = x - i, tz = z - j, sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
    return lerp(lerp(hash(i, j), hash(i + 1, j), sx), lerp(hash(i, j + 1), hash(i + 1, j + 1), sx), sz);
  };
  const FX = 16, FZ = 12;
  // Farmland outside the loop: kind 0 young rice, 1 flooded, 2 rapeseed in flower, 3 fallow.
  const fieldAt = (x, z) => {
    const u = uAt(x, z), d = sdf(x, z);
    const zone = 1 - zoneWeight(u, 'bamboo', 0.02) - zoneWeight(u, 'marsh', 0.02);
    const town = zoneWeight(u, 'village') * (1 - smooth(34, 50, d));
    const w = outside(x, z) ? Math.max(0, zone - town) * smooth(3.5, 7, d) : 0;
    const ix = Math.floor(x / FX), iz = Math.floor(z / FZ);
    const ridge = Math.abs(x - Math.round(x / FX) * FX) < 0.1 || Math.abs(z - Math.round(z / FZ) * FZ) < 0.1;
    return { w, kind: Math.floor(hash(ix * 7 + 3, iz * 13 + 1) * 4), ridge };
  };
  const height = (x, z) => {
    const d = sdf(x, z);
    if (d <= 0) return -0.12 + Math.max(-1.5, d * 0.42);
    const u = uAt(x, z), f = fieldAt(x, z);
    const rough = (noise(x * 0.045, z * 0.045) - 0.5) * 2.6 + (noise(x * 0.16, z * 0.16) - 0.5) * 0.5;
    let h = 0.1 + 0.5 * smooth(0, 4.5, d) + 0.55 * smooth(4, 30, d) + rough * smooth(7, 38, d);
    if (!outside(x, z)) h += 2.2 * smooth(20, 40, d);
    h = lerp(h, 0.82, zoneWeight(u, 'village') * (1 - smooth(30, 55, d)) * smooth(0, 0.6, d));
    h = lerp(h, f.ridge ? 0.62 : [0.5, 0.36, 1.3, 0.42][f.kind], f.w);
    return Math.max(0.1, h) + 15 * Math.exp(-(x * x + z * z) / 2600);     // land never dips below the waterline
  };

  // ---- things in the world --------------------------------------------------------------------
  const p = rng(seed + ':things');
  const bridgeU = [0.048, 0.112, 0.178];
  const bridges = bridgeU.map((u) => { const L = loop(u); return { kind: 'arch', x: L.x, z: L.z, rot: Math.atan2(-L.nz, L.nx), hw: L.hw, u }; });
  { const L = loop(0.925); bridges.push({ kind: 'slab', x: L.x, z: L.z, rot: Math.atan2(-L.nz, L.nx), hw: L.hw, u: 0.925 }); }
  for (const i of [9, 27]) {
    const a = creek[i - 1], b = creek[i + 1], l = Math.hypot(b.x - a.x, b.z - a.z), nx = (b.z - a.z) / l, nz = -(b.x - a.x) / l;
    bridges.push({ kind: 'slab', x: creek[i].x, z: creek[i].z, rot: Math.atan2(-nz, nx), hw: creek[i].hw });
  }

  const houses = [], steps = [];
  for (const s of [1, -1]) {
    let u = 0.012, k = s > 0 ? 2 : 0;
    while (u < 0.208) {
      const w = 6 + p() * 4.5, d = 5 + p() * 2.2, L = loop(u), uc = u + w / 2 / L.sp, C = loop(uc);
      if (bridgeU.some((b) => Math.abs(uc - b) * L.sp < 6 + w / 2)) { u += 3 / L.sp; continue; }
      if (k++ % 5 === 4) {
        const S = loop(u + 2.1 / L.sp);
        steps.push({ x: S.x + S.nx * s * S.hw, z: S.z + S.nz * s * S.hw, rot: face(-s * S.nx, -s * S.nz), s, u: S.u });
        u += 4.4 / L.sp; continue;
      }
      const lane = s > 0 ? 3 : 0.3, off = s * (C.hw + lane + d / 2);
      const H = { x: C.x + C.nx * off, z: C.z + C.nz * off, rot: face(-s * C.nx, -s * C.nz), w, d, st: p() < 0.42 ? 2 : 1, horse: p() < 0.62, lantern: p() < 0.5, seed: p() };
      if (sdf(H.x, H.z) > d / 2 + 0.2) houses.push(H);
      if (p() < 0.6) {
        const d2 = 5 + p() * 2, o2 = off + s * (d / 2 + 3.4 + d2 / 2);
        const B = { x: C.x + C.nx * o2, z: C.z + C.nz * o2, rot: H.rot, w: w * 0.9, d: d2, st: p() < 0.3 ? 2 : 1, horse: p() < 0.5, lantern: false, seed: p() };
        if (sdf(B.x, B.z) > d2 / 2 + 1) houses.push(B);
      }
      u += (w + (p() < 0.25 ? 1.6 : 0.15)) / L.sp;
    }
  }
  const clearOfHouses = (x, z, m) => houses.every((h) => Math.hypot(h.x - x, h.z - z) > m + Math.max(h.w, h.d) * 0.6);

  const willows = [], peaches = [], trees = [], bamboo = [], reeds = [], grass = [];
  const bankRow = (list, from, to, gap, off, spread, sides = [1, -1]) => {
    for (const s of sides) for (let u = from + p() * 0.004; u < to;) {
      const L = loop(u), q = at(u, s * (L.hw + off + p() * spread));
      const d = sdf(q.x, q.z);
      if (d > 0.5 && d < off + spread + 2 && clearOfHouses(q.x, q.z, 1.5)) list.push({ x: q.x, z: q.z, rot: p() * TAU, s: 0.8 + p() * 0.45 });
      u += (gap * (0.7 + p() * 0.6)) / L.sp;
    }
  };
  bankRow(willows, 0.215, 0.37, 10, 1.3, 1.5);
  bankRow(willows, 0.84, 1.0, 17, 1.3, 2);
  bankRow(willows, 0.37, 0.52, 20, 1.5, 2, [1]);
  bankRow(willows, 0.02, 0.2, 34, 1.2, 0.6, [1]);
  bankRow(peaches, 0.225, 0.36, 9, 3.5, 5);
  bankRow(peaches, 0.86, 0.99, 30, 3.5, 4, [-1]);
  for (let i = 0; i < 26; i++) {           // willows and a few peach trees round the lotus pond
    const a = p() * TAU, q = globalOf(pond, Math.cos(a) * (pond.rx + 5), Math.sin(a) * (pond.rz + 5)), d = sdf(q.x, q.z);
    if (d > 1 && d < 5) (i % 4 ? willows : peaches).push({ x: q.x, z: q.z, rot: p() * TAU, s: 0.8 + p() * 0.4 });
  }
  for (let i = 0; i < 900; i++) {          // bamboo crowds both banks of the creek
    const u = 0.525 + p() * 0.13, s = p() < 0.5 ? 1 : -1, L = loop(u), q = at(u, s * (L.hw + 0.7 + p() * p() * 20));
    if (sdf(q.x, q.z) > 0.5) bamboo.push({ x: q.x, z: q.z, rot: p() * TAU, s: 0.75 + p() * 0.6 });
  }
  for (let i = 0; trees.length < 400 && i < 6000; i++) {
    const x = (p() - 0.5) * 2 * (SIZE - 20), z = (p() - 0.5) * 2 * (SIZE - 20), d = sdf(x, z);
    if (d < 6 || fieldAt(x, z).w > 0.3 || !clearOfHouses(x, z, 3) || (zoneAt(uAt(x, z)) === 'bamboo' && d < 30)) continue;
    if (Math.hypot(x, z) < 9) continue;
    const inside = !outside(x, z);
    if (!inside && p() < 0.55) continue;
    trees.push({ x, z, rot: p() * TAU, s: 0.8 + p() * 0.7 });
  }
  const shore = (list, tries, cx, cz, rad, lo, hi) => {
    for (let i = 0; i < tries; i++) {
      const a = p() * TAU, q = Math.sqrt(p()) * rad, x = cx + Math.cos(a) * q, z = cz + Math.sin(a) * q, d = sdf(x, z);
      if (d > lo && d < hi) list.push({ x, z, rot: p() * TAU, s: 0.7 + p() * 0.7 });
    }
  };
  shore(reeds, 9000, lake.x, lake.z, 105, -1.3, 1.6);
  shore(reeds, 1500, pond.x, pond.z, 52, -0.6, 1.2);
  for (let i = 0; i < 300 && reeds.length < 4200; i++) {     // reed beds standing out in the shallows of the marsh
    const g = globalOf(lake, (p() - 0.5) * 2 * lake.rx, (p() - 0.5) * 2 * lake.rz), [, lz] = local(lake, g.x, g.z), d = sdf(g.x, g.z);
    if (d > -1.5 || Math.abs(lz) < 13) continue;
    for (let k = 0; k < 26; k++) { const a = p() * TAU, q = Math.sqrt(p()) * 3.4; reeds.push({ x: g.x + Math.cos(a) * q, z: g.z + Math.sin(a) * q, rot: p() * TAU, s: 0.8 + p() * 0.6 }); }
  }
  for (let i = 0; i < 2600; i++) {         // reeds and grass along every natural bank
    const u = 0.215 + p() * 0.79, s = p() < 0.5 ? 1 : -1, L = loop(u), q = at(u, s * (L.hw - 0.9 + p() * 3.4)), d = sdf(q.x, q.z);
    if (d > -0.8 && d < 0.9 && p() < 0.5) reeds.push({ x: q.x, z: q.z, rot: p() * TAU, s: 0.6 + p() * 0.6 });
    else if (d > 0.3) grass.push({ x: q.x, z: q.z, rot: p() * TAU, s: 0.7 + p() * 0.8 });
  }
  for (const c of creek) for (let k = 0; k < 5; k++) {
    const x = c.x + (p() - 0.5) * 2 * (c.hw + 2), z = c.z + (p() - 0.5) * 2 * (c.hw + 2), d = sdf(x, z);
    if (d > -0.5 && d < 1.2 && clearOfHouses(x, z, 0.5)) (p() < 0.6 ? reeds : grass).push({ x, z, rot: p() * TAU, s: 0.6 + p() * 0.6 });
  }

  const pads = [], leaves = [], flowers = [], frogs = [];
  for (let i = 0; i < 2600; i++) {
    const a = p() * TAU, q = Math.sqrt(p()), g = globalOf(pond, Math.cos(a) * q * pond.rx, Math.sin(a) * q * pond.rz), d = sdf(g.x, g.z);
    const [, lz] = local({ ...pond, x: lc.x, z: lc.z }, g.x, g.z);
    if (d > -1 || Math.abs(lz) < 3.2 || noise(g.x * 0.09, g.z * 0.09) < 0.42) continue;   // keep the main channel and a few lanes open
    const o = { x: g.x, z: g.z, rot: p() * TAU, s: 0.7 + p() * 0.7 };
    const k = p();
    if (k < 0.5) { pads.push(o); if (frogs.length < 12 && p() < 0.06) frogs.push({ x: o.x, z: o.z }); }
    else if (k < 0.88) leaves.push(o);
    else flowers.push(o);
  }

  const into = (x, z, tx, tz, margin = 0.8) => {     // walk from (x,z) towards (tx,tz) until properly afloat
    const l = Math.hypot(tx - x, tz - z) || 1;
    for (let k = 0; k < 60 && sdf(x, z) > -margin; k++) { x += ((tx - x) / l) * 0.5; z += ((tz - z) / l) * 0.5; }
    return { x, z };
  };
  const moor = (u, s) => { const L = loop(u), q = at(u, s * (L.hw - 1.15)); return { x: q.x, z: q.z, rot: face(L.tx, L.tz) + (p() - 0.5) * 0.2 }; };
  const boats = [moor(0.03, 1), moor(0.09, -1), moor(0.15, 1), moor(0.29, -1), moor(0.47, 1), moor(0.88, 1)];
  const st = steps[Math.min(3, steps.length - 1)];
  const auntie = { x: st.x - Math.sin(st.rot) * -0.2, z: st.z - Math.cos(st.rot) * -0.2, rot: st.rot };
  const buffalo = (() => { const L = loop(0.885), q = at(0.885, L.hw - 1.4); return { x: q.x, z: q.z, rot: face(L.tx, L.tz) + 0.5 }; })();
  const farmer = (() => { const q = at(0.9, loop(0.9).hw + 6); return { x: q.x, z: q.z, rot: p() * TAU }; })();
  const pavilion = (() => {      // on the far shore of the pond, looking back across the lotus to the river
    const dx = pond.x - lc.x, dz = pond.z - lc.z, l = Math.hypot(dx, dz);
    let x = pond.x, z = pond.z;
    for (let k = 0; k < 120 && sdf(x, z) < 3.2; k++) { x += (dx / l) * 0.5; z += (dz / l) * 0.5; }
    return { x, z, rot: face(-dx, -dz) };
  })();
  const fisher = (() => { const g = into(...Object.values(globalOf(lake, -18, 14)), lake.x, lake.z, 3); return { x: g.x, z: g.z, rot: lake.rot + 0.6 }; })();
  const egrets = [];
  for (let i = 0; egrets.length < 9 && i < 4000; i++) {
    const marsh = egrets.length < 6, c = marsh ? lake : at(0.86 + p() * 0.12, 0), rad = marsh ? 95 : 12;
    const a = p() * TAU, q = Math.sqrt(p()) * rad, x = c.x + Math.cos(a) * q, z = c.z + Math.sin(a) * q, d = sdf(x, z);
    if (d > -0.45 && d < -0.12 && egrets.every((e) => Math.hypot(e.x - x, e.z - z) > 14)) egrets.push({ x, z, rot: p() * TAU });
  }

  const ducklings = [
    into(st.x, st.z, loop(st.u).x, loop(st.u).z, 1.2),
    { x: creek[22].x, z: creek[22].z },
    into(...Object.values(globalOf(pond, 12, -8)), pond.x, pond.z, 1.5),
    into(...Object.values(at(0.6, -(loop(0.6).hw - 0.9))).slice(0, 2), loop(0.6).x, loop(0.6).z),
    into(islands[0].x, islands[0].z + islands[0].r, lake.x, lake.z, 1),
    into(...Object.values(at(0.905, -(loop(0.905).hw - 1))).slice(0, 2), loop(0.905).x, loop(0.905).z),
  ];
  const snacks = [];
  for (let i = 0; i < 30; i++) {
    const u = (i + 0.2 + p() * 0.6) / 30, s = p() < 0.5 ? 1 : -1, L = loop(u), q = at(u, s * (L.hw - 1.3 - p()));
    if (sdf(q.x, q.z) < -0.7) snacks.push({ x: q.x, z: q.z });
  }

  const start = loop(0.972);
  return {
    seed, loop, uAt, outside, sdf, height, fieldAt, noise, grid, loopLen,
    pond, lake, islands, creek, bridges, houses, steps, willows, peaches, trees, bamboo, reeds, grass,
    pads, leaves, flowers, frogs, boats, auntie, buffalo, farmer, pavilion, fisher, egrets, ducklings, snacks,
    villageRange: [0.008, 0.212],
    spawn: { x: start.x, z: start.z, heading: face(start.tx, start.tz) },
  };
}
