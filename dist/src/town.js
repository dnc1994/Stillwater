// town.js — the old water town: lime-washed houses under grey tile, stepped gable walls, shopfronts,
// stone bridges and quays, a covered walk along the water, and the small clutter of people living there.
import * as THREE from 'three';
import { smooth } from './world.js';
import { Builder, T, box, cyl, cone, ball, card, matte } from './build.js';
import { SIGNS, LEAF, region } from './tex.js';

const TAU = Math.PI * 2;
export const WALL = '#f2f0e9', STAIN = '#c3c5bd', TILE = '#5d6268', RIDGE = '#494e54', EAVE = '#8f959a', WOOD = '#74503a', DARK = '#3b281e', STONE = '#c4c0b3', MOSS = '#7c886a';
const UV = { plaster: 0.25, tile: 1 / 1.6, stone: 1 / 2.4, wood: 1 / 1.2 };
const sign = (k) => region(SIGNS[k], 256, 1), leaf = (k) => region(LEAF[k]);
const CLOTH = ['#4a6590', '#f0ece0', '#f0ece0', '#a8554a', '#d9b4b8', '#8a9cae', '#e4dab6', '#5d7a6a', '#33435c'];
const GREEN = ['#7fae56', '#93bd62', '#6d9c50'];

function prism(w, rise, d) {       // triangular gable ends, ridge along x
  const hw = w / 2, hd = d / 2, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-hw, 0, hd, -hw, 0, -hd, -hw, rise, 0, hw, 0, -hd, hw, 0, hd, hw, rise, 0], 3));
  g.computeVertexNormals();
  return g;
}

// The set of builders a town is assembled into, one per material.
export function townKit(solid) {
  return { P: new Builder(), R: new Builder(), S: new Builder(), W: new Builder(), X: new Builder(), G: new Builder(), N: new Builder(), C: new Builder(), V: new Builder(solid), lamps: [], smoke: [] };
}

function house(K, H, M, rand, lane) {
  const { w, d } = H, h = H.st === 2 ? 5.4 : 3.2, rise = d * 0.3, ang = Math.atan2(rise, d / 2), z = d / 2, at = (m) => M.clone().multiply(m);
  const P = (g, m, c = WALL, o = {}) => K.P.add(g, at(m), c, { uv: UV.plaster, jit: 0.025, ...o });
  const R = (g, m, c = TILE, o = {}) => K.R.add(g, at(m), c, { uv: UV.tile, jit: 0.07, ...o });
  const S = (g, m, c = STONE, o = {}) => K.S.add(g, at(m), c, { uv: UV.stone, jit: 0.06, ...o });
  const W = (g, m, c = WOOD, o = {}) => K.W.add(g, at(m), c, { uv: UV.wood, jit: 0.1, ...o });
  const X = (g, m, c, o = {}) => K.X.add(g, at(m), c, o);
  const lantern = (x, y, zz) => { K.lamps.push(new THREE.Vector3(x, y, zz).applyMatrix4(M)); X(box(0.025, 0.36, 0.025), T(x, y + 0.36, zz), '#1c1a18'); X(cyl(0.02, 0.05, 0.16, 5), T(x, y - 0.3, zz), '#d9a53a'); };

  S(box(w + 0.16, 0.6, d + 0.16), T(0, 0.3, 0));
  P(box(w, h, d), T(0, h / 2, 0), STAIN, { top: WALL });
  P(prism(w, rise, d), T(0, h, 0));

  // the roof: two tiled slopes, a pale drip edge, a ridge with upturned ends
  const run = d / 2 + 0.6, sl = run / Math.cos(ang), rw = w + (H.horse ? 0.12 : 1.0);
  for (const s of [1, -1]) {
    R(box(rw, 0.16, sl), T(0, h + rise - (run / 2) * Math.tan(ang) + 0.1, (s * run) / 2, s * ang, 0, 0));
    R(box(rw, 0.1, 0.18), T(0, h + rise - run * Math.tan(ang) + 0.14, s * (run - 0.05), s * ang, 0, 0), EAVE);
  }
  R(box(rw + 0.1, 0.24, 0.34), T(0, h + rise + 0.17, 0), RIDGE);
  for (const e of [1, -1]) R(box(0.62, 0.14, 0.3), T(e * (rw / 2 + 0.2), h + rise + 0.31, 0, 0, 0, e * 0.45), RIDGE);
  if (H.horse) for (const e of [1, -1]) for (let k = 0; k < 3; k++) {       // stepped "horse-head" gable walls, each step capped in tile
    const dk = (d + 1) * (1 - k * 0.33), top = h + rise * (0.08 + k * 0.42) + 0.55, x = e * (w / 2 + 0.02);
    P(box(0.32, top - h + 1, dk), T(x, (top + h - 1) / 2, 0));
    R(box(0.52, 0.14, dk + 0.36), T(x, top + 0.07, 0), RIDGE);
    for (const f of [1, -1]) R(box(0.52, 0.1, 0.32), T(x, top + 0.2, f * (dk / 2 + 0.24), -f * 0.5, 0, 0), RIDGE);
  }

  const dx = (rand() - 0.5) * (w - 3.4), shop = lane && H.seed < 0.34;
  const win = (x, y, zz, ww = 0.95, hh = 1.15) => { W(box(ww + 0.2, hh + 0.2, 0.08), T(x, y, zz), DARK); K.G.add(box(ww, hh, 0.04), at(T(x, y, zz + Math.sign(zz) * 0.045)), '#ffffff', { uv: 'own', jit: 0.18 }); };
  if (shop) {
    // a shopfront: plank shutters, an open doorway, a tiled awning on posts, a banner
    W(box(w * 0.92, 2.5, 0.12), T(0, 1.55, z + 0.03));
    X(box(1.7, 2.0, 0.06), T(dx, 1.35, z + 0.08), '#17120f', { jit: 0 });
    R(box(w * 0.98, 0.09, 1.4), T(0, 2.82, z + 0.62, 0.32, 0, 0));
    for (const x of [-w * 0.44, w * 0.44]) W(cyl(0.055, 0.055, 2.2, 6), T(x, 1.5, z + 1.2), DARK);
    W(box(w * 0.9, 0.1, 0.1), T(0, 2.56, z + 1.2), DARK);
    if (rand() < 0.75) {
      const kind = rand() < 0.5 ? 'wine' : 'tea', fx = (rand() < 0.5 ? 1 : -1) * w * 0.3;
      X(cyl(0.02, 0.02, 1.3, 4), T(fx, 2.5, z + 1.75, 1.2, 0, 0), '#6a5a40');
      K.N.add(card(0.52, 0.95, 'top'), at(T(fx, 2.7, z + 2.3, 0, Math.PI / 2, 0)), '#ffffff', { uv: 'own', rect: sign(kind), jit: 0, sway: (t) => (1 - t) * 0.16 });
    }
    lantern(-w * 0.44, 2.3, z + 1.35); lantern(w * 0.44, 2.3, z + 1.35);
  } else {
    W(box(1.25, 2.1, 0.1), T(dx, 1.35, z + 0.03), DARK);
    X(box(0.035, 2.1, 0.12), T(dx, 1.35, z + 0.035), '#140e0a', { jit: 0 });
    S(box(1.7, 0.16, 0.6), T(dx, 0.38, z + 0.3));
    R(box(1.8, 0.08, 0.6), T(dx, 2.62, z + 0.24, 0.32, 0, 0));                 // a little tiled hood over the door
    for (const x of [-w / 2 + 1.15, w / 2 - 1.15]) if (Math.abs(x - dx) > 1.5) win(x, 1.95, z);
    if (lane && H.seed > 0.5) {                                                // red paper couplets, and a blessing on the door
      K.N.add(box(0.2, 1.45, 0.02), at(T(dx - 0.78, 1.5, z + 0.04)), '#ffffff', { uv: 'own', rect: sign('coupletA'), jit: 0 });
      K.N.add(box(0.2, 1.45, 0.02), at(T(dx + 0.78, 1.5, z + 0.04)), '#ffffff', { uv: 'own', rect: sign('coupletB'), jit: 0 });
      K.N.add(box(0.44, 0.44, 0.02), at(T(dx + 0.31, 1.75, z + 0.1)), '#ffffff', { uv: 'own', rect: sign('fu'), jit: 0 });
    }
    if (H.lantern) lantern(dx + (rand() < 0.5 ? 1 : -1), 2.25, z + 0.45);
  }
  win((rand() - 0.5) * (w - 2.6), 2.0, -z, 0.7, 0.8);

  if (H.st === 2) {     // upstairs: a skirt of tiles, a timber front with lattice windows, sometimes a balcony
    R(box(w * 0.98, 0.1, 1.05), T(0, 3.08, z + 0.42, 0.36, 0, 0));
    W(box(w * 0.95, 1.8, 0.14), T(0, h - 1.2, z + 0.06));
    const n = w > 8 ? 3 : 2;
    for (let i = 0; i < n; i++) win(((i + 0.5) / n - 0.5) * w * 0.8, h - 1.15, z + 0.13, 1.15, 1.0);
    if (rand() < 0.55) {
      W(box(w * 0.95, 0.06, 0.5), T(0, h - 2.06, z + 0.36), DARK); W(box(w * 0.95, 0.06, 0.06), T(0, h - 1.5, z + 0.58), DARK);
      for (let x = -w * 0.46; x <= w * 0.46; x += 0.3) W(box(0.035, 0.54, 0.035), T(x, h - 1.78, z + 0.58), DARK);
    }
  }
  if (H.seed > 0.62 && H.seed < 0.8) {     // a chimney, for the breakfast and supper smoke
    const cx = w * 0.22, cy = h + rise * 0.55;
    P(box(0.5, 1.0, 0.5), T(cx, cy + 0.4, -d * 0.22)); R(box(0.66, 0.1, 0.66), T(cx, cy + 0.95, -d * 0.22), RIDGE);
    K.smoke.push(new THREE.Vector3(cx, cy + 1.1, -d * 0.22).applyMatrix4(M));
  }
  // creeper climbing an end wall
  if (rand() < 0.3) { const e = rand() < 0.5 ? 1 : -1; for (let i = 0; i < 5; i++) K.V.add(card(1.7, 1.7, 'center'), at(T(e * (w / 2 + (H.horse ? 0.2 : 0.04)), 0.8 + rand() * 1.9, (rand() - 0.5) * d * 0.8, 0, (e * Math.PI) / 2, rand() * 3)), GREEN[i % 3], { uv: 'own', rect: leaf('clump'), sway: 0.02 }); }

  if (!lane) return;
  // life on the lane in front of the house
  const spot = () => [(rand() - 0.5) * (w - 1), z + 0.9 + rand() * 1.1];
  if (rand() < 0.45) {                                                         // washing hung on a bamboo pole
    const [px, pz] = spot(), len = 1.8 + rand() * 0.8;
    for (const e of [-1, 1]) X(cyl(0.025, 0.03, 2.0, 5), T(px + (e * len) / 2, 1.6, pz), '#b9a36a');
    X(cyl(0.02, 0.02, len + 0.3, 5), T(px, 2.52, pz, 0, 0, Math.PI / 2), '#c9b47a');
    for (let x = -len / 2 + 0.3; x < len / 2 - 0.2; x += 0.42 + rand() * 0.2) { const ch = 0.55 + rand() * 0.45; K.C.add(card(0.36 + rand() * 0.16, ch, 'top'), at(T(px + x, 2.5, pz, 0, (rand() - 0.5) * 0.3, 0)), CLOTH[Math.floor(rand() * CLOTH.length)], { sway: (t) => (1 - t) * 0.14, jit: 0.05 }); }
  }
  if (rand() < 0.5) {                                                          // pickle jars
    const [px, pz] = spot();
    for (let i = 0; i < 2 + Math.floor(rand() * 2); i++) { const s = 0.75 + rand() * 0.5, x = px + i * 0.5; X(cyl(0.16 * s, 0.13 * s, 0.5 * s, 9), T(x, 0.6 + 0.25 * s, z + 0.45), '#5c4130'); X(cyl(0.19 * s, 0.19 * s, 0.05, 9), T(x, 0.6 + 0.52 * s, z + 0.45), '#7a5a40'); }
  }
  if (rand() < 0.6) {                                                          // potted plants by the door
    for (let i = 0; i < 1 + Math.floor(rand() * 3); i++) { const x = dx + (rand() < 0.5 ? 1 : -1) * (1.1 + i * 0.4), flower = rand() < 0.4;
      X(cyl(0.15, 0.11, 0.26, 8), T(x, 0.73, z + 0.5), '#a8614a');
      for (let k = 0; k < 2; k++) K.V.add(card(0.75, 0.75, 'bottom'), at(T(x, 0.82, z + 0.5, 0, k * 1.57 + rand(), 0)), flower ? '#ffffff' : GREEN[i % 3], { uv: 'own', rect: leaf(flower ? 'blossom' : 'clump'), sway: (t) => t * 0.03 }); }
  }
  if (rand() < 0.3) { const [px, pz] = spot(); W(box(1.3, 0.07, 0.32), T(px, 1.03, pz), WOOD); for (const e of [-1, 1]) W(box(0.07, 0.42, 0.28), T(px + e * 0.52, 0.82, pz), DARK); }
}

function archBridge(K, M, hw, rand) {
  const R = hw - 0.35, L = hw + 5.5, top = R + 1.05, base = 0.85, Wd = 3.3, at = (m) => M.clone().multiply(m);
  const sh = new THREE.Shape();
  sh.moveTo(-L, -1.4); sh.lineTo(-L, base); sh.quadraticCurveTo(-L * 0.5, top, 0, top); sh.quadraticCurveTo(L * 0.5, top, L, base);
  sh.lineTo(L, -1.4); sh.lineTo(R, -1.4); sh.lineTo(R, 0); sh.absarc(0, 0, R, 0, Math.PI, false); sh.lineTo(-R, -1.4);
  const g = new THREE.ExtrudeGeometry(sh, { depth: Wd, bevelEnabled: false, curveSegments: 20 });
  g.translate(0, 0, -Wd / 2);
  K.S.add(g, M, MOSS, { top: STONE, uv: UV.stone, speckle: 0.04, jit: 0.02 });
  const deck = (x) => top - (top - base) * (x / L) ** 2;
  const N = 26;
  for (let i = 0; i < N; i++) {
    const x0 = -L + (2 * L * i) / N, x1 = -L + (2 * L * (i + 1)) / N, y0 = deck(x0), y1 = deck(x1), len = Math.hypot(x1 - x0, y1 - y0), rz = Math.atan2(y1 - y0, x1 - x0);
    for (const s of [1, -1]) K.S.add(box(len + 0.05, 0.52, 0.24), at(T((x0 + x1) / 2, (y0 + y1) / 2 + 0.24, s * (Wd / 2 - 0.12), 0, 0, rz)), STONE, { uv: UV.stone, jit: 0.07 });
    if (i % 2 === 0 && Math.abs(x0 + x1) > 1.6) K.S.add(box(len * 0.55, 0.09, Wd - 0.6), at(T((x0 + x1) / 2, (y0 + y1) / 2 + 0.03, 0, 0, 0, rz)), '#d6d2c4', { uv: UV.stone, jit: 0.05 });   // worn steps
  }
  for (const sx of [1, -1]) for (const s of [1, -1]) K.S.add(cyl(0.16, 0.18, 0.95, 7), at(T(sx * (L - 0.2), base + 0.42, s * (Wd / 2 - 0.12))), STONE, { uv: UV.stone });
  K.S.add(box(1.1, 0.42, 0.06), at(T(0, R + 0.5, Wd / 2 + 0.02)), '#e0dccd', { uv: UV.stone, jit: 0 });      // the name stone over the crown
  for (const s of [1, -1]) for (let i = 0; i < 7; i++) {      // creeper trailing over the edge
    const x = (rand() - 0.5) * 2 * (R + 1.5), wv = 1.2 + rand() * 0.9;
    K.V.add(card(wv, wv * 0.75, 'top'), at(T(x, deck(x) - 0.02 - rand() * 0.2, s * (Wd / 2 + 0.03))), GREEN[i % 3], { uv: 'own', rect: leaf('vine'), sway: (t) => (1 - t) * 0.06 });
  }
}

function slabBridge(K, M, hw) {
  const L = 2 * hw + 3.5, at = (m) => M.clone().multiply(m), S = { uv: UV.stone, jit: 0.06 }, Wd = { uv: UV.wood };
  K.S.add(box(L, 0.28, 2.1), at(T(0, 1.32, 0)), STONE, { ...S, speckle: 0.04 });
  for (const s of [1, -1]) {
    K.W.add(box(L, 0.08, 0.08), at(T(0, 2.05, s)), WOOD, Wd);
    for (let x = -L / 2 + 0.3; x < L / 2; x += 1.6) K.W.add(box(0.08, 0.7, 0.08), at(T(x, 1.75, s)), WOOD, Wd);
    K.S.add(box(1.6, 2.4, 2.3), at(T(s * (hw + 1), 0.05, 0)), STONE, S);
  }
  if (hw > 4) for (const s of [1, -1]) K.S.add(box(0.5, 2.6, 1.7), at(T(s * hw * 0.4, 0, 0)), STONE, S);
}

export function buildTown(K, world, rand) {
  const H = world.height, sdf = world.sdf;
  for (const h of world.houses) {
    const fx = h.x + Math.sin(h.rot) * (h.d / 2 + 1.6), fz = h.z + Math.cos(h.rot) * (h.d / 2 + 1.6);
    house(K, h, T(h.x, Math.max(0.8, H(h.x, h.z) - 0.05), h.z, 0, h.rot, 0), rand, sdf(fx, fz) > 0.9);
  }
  for (const br of world.bridges) br.kind === 'arch' ? archBridge(K, T(br.x, 0, br.z, 0, br.rot, 0), br.hw, rand) : slabBridge(K, T(br.x, 0, br.z, 0, br.rot, 0), br.hw);

  // stone quays, the paved lane, mooring posts
  const [u0, u1] = world.villageRange, seg = 1.7, stepU = seg / world.loop(0.1).sp, su = seg / 2.4;
  const arches = world.bridges.filter((b) => b.kind === 'arch');
  let run = 0;
  for (const s of [1, -1]) for (let u = u0, i = 0; u < u1; u += stepU, i++) {
    const A = world.loop(u), B = world.loop(u + stepU), fade = (v) => 0.25 + 0.67 * smooth(u0, u0 + 0.01, v) * (1 - smooth(u1 - 0.01, u1, v));
    const pt = (L, off, y) => [L.x + L.nx * s * off, y, L.z + L.nz * s * off], ya = fade(u), yb = fade(u + stepU), ma = Math.min(0.25, ya), mb = Math.min(0.25, yb);
    run += su;
    K.S.quad(pt(A, A.hw, -0.9), pt(B, B.hw, -0.9), pt(B, B.hw, mb), pt(A, A.hw, ma), '#6f7a60', [su, 0.48], [run, 0], 0.08);        // below the tide line: dark, green
    K.S.quad(pt(A, A.hw, ma), pt(B, B.hw, mb), pt(B, B.hw, yb + 0.02), pt(A, A.hw, ya + 0.02), STONE, [su, 0.3], [run, 0.48], 0.08);
    K.S.quad(pt(A, A.hw - 0.08, ya + 0.02), pt(B, B.hw - 0.08, yb + 0.02), pt(B, B.hw + 3.2, yb + 0.02), pt(A, A.hw + 3.2, ya + 0.02), '#b4b0a4', [su, 1.37], [run, 0], 0.05);
    K.S.quad(pt(A, A.hw - 0.08, ya + 0.02), pt(B, B.hw - 0.08, yb + 0.02), pt(B, B.hw - 0.08, yb - 0.12), pt(A, A.hw - 0.08, ya - 0.12), '#d0ccbe', [su, 0.06], [run, 0.8], 0.04); // coping edge
    if (i % 5 === 2 && ya > 0.85) K.S.add(cyl(0.1, 0.12, 0.5, 7), T(...pt(A, A.hw + 0.25, ya + 0.25)), '#a8a498', { uv: UV.stone });
    if (i % 7 === 3 && ya > 0.85 && rand() < 0.5) for (let k = 0; k < 2; k++) K.V.add(card(1.3, 1.0, 'top'), T(...pt(A, A.hw - 0.1, ya - 0.02), 0, Math.atan2(A.tx, A.tz) + (s > 0 ? Math.PI / 2 : -Math.PI / 2), 0), GREEN[k], { uv: 'own', rect: leaf('vine'), sway: (t) => (1 - t) * 0.05 });
  }
  for (const st of world.steps) for (let k = 0; k < 5; k++) K.S.add(box(2.6, 0.24, 0.5), T(st.x, 0, st.z, 0, st.rot, 0).multiply(T(0, 0.86 - k * 0.22, -0.4 + k * 0.42)), STONE, { uv: UV.stone, jit: 0.07 });

  // the covered walk: a tiled lean-to on timber posts along the outer bank, with a bench rail to sit on
  const c0 = 0.123, c1 = 0.167, gap = 2.5, cu = gap / world.loop(0.14).sp;
  for (let u = c0, i = 0; u < c1; u += cu, i++) {
    const A = world.loop(u), B = world.loop(u + cu), pt = (L, off, y) => [L.x + L.nx * off, y, L.z + L.nz * off], ry = Math.atan2(B.x - A.x, B.z - A.z);
    if (arches.some((b) => Math.abs(u - b.u) * A.sp < 7)) continue;
    const nearStep = world.steps.some((st) => st.s > 0 && Math.hypot(st.x - A.x - A.nx * A.hw, st.z - A.z - A.nz * A.hw) < 2.6);
    K.R.quad(pt(A, A.hw + 0.05, 2.62), pt(B, B.hw + 0.05, 2.62), pt(B, B.hw + 3.25, 3.3), pt(A, A.hw + 3.25, 3.3), TILE, [gap / 1.6, 2.1], [i * (gap / 1.6), 0], 0.06);
    K.R.quad(pt(A, A.hw + 0.05, 2.62), pt(B, B.hw + 0.05, 2.62), pt(B, B.hw + 0.05, 2.5), pt(A, A.hw + 0.05, 2.5), EAVE, [gap / 1.6, 0.06]);
    K.W.add(box(0.1, 0.14, gap + 0.1), T(...pt(A, A.hw + 0.4, 2.52), 0, ry, 0).multiply(T(0, 0, gap / 2)), DARK, { uv: UV.wood });
    if (nearStep) continue;
    K.W.add(cyl(0.085, 0.095, 1.62, 7), T(...pt(A, A.hw + 0.4, 1.74)), DARK, { uv: UV.wood });
    K.S.add(box(0.3, 0.14, 0.3), T(...pt(A, A.hw + 0.4, 0.99)), STONE, { uv: UV.stone });
    K.W.add(box(0.07, 0.06, gap), T(...pt(A, A.hw + 0.4, 1.42), 0, ry, 0).multiply(T(0, 0, gap / 2)), WOOD, { uv: UV.wood });
    K.W.add(box(0.34, 0.05, gap), T(...pt(A, A.hw + 0.55, 1.2), 0, ry, 0).multiply(T(0, 0, gap / 2)), WOOD, { uv: UV.wood });
    if (i % 3 === 1) { const p = pt(A, A.hw + 0.4, 2.2); K.lamps.push(new THREE.Vector3(...p)); K.X.add(box(0.025, 0.3, 0.025), T(p[0], p[1] + 0.3, p[2]), '#1c1a18'); }
  }

  // the pavilion by the lotus pond
  {
    const P = world.pavilion, M = T(P.x, Math.max(0.45, H(P.x, P.z)), P.z, 0, P.rot, 0), at = (m) => M.clone().multiply(m);
    K.S.add(cyl(3.1, 3.3, 0.5, 6), at(T()), STONE, { uv: UV.stone });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU, a2 = ((i + 0.5) / 6) * TAU;
      K.X.add(cyl(0.11, 0.12, 2.7, 8), at(T(Math.cos(a) * 2.4, 1.6, Math.sin(a) * 2.4)), '#8a3a2c');
      K.R.add(box(1.1, 0.12, 0.34), at(T(Math.cos(a) * 3.75, 3.12, Math.sin(a) * 3.75, 0, -a, 0.42)), RIDGE, { uv: UV.tile });      // upturned corners
      if (i !== 0 && i !== 3) K.W.add(box(2.3, 0.06, 0.3), at(T(Math.cos(a2) * 2.1, 0.85, Math.sin(a2) * 2.1, 0, -a2 + Math.PI / 2, 0)), '#7a3a2c', { uv: UV.wood });
    }
    K.R.add(cyl(0.25, 3.5, 1.4, 6), at(T(0, 3.62, 0)), TILE, { uv: UV.tile }); K.R.add(cyl(3.5, 3.9, 0.14, 6), at(T(0, 2.95, 0)), EAVE, { uv: UV.tile });
    K.X.add(ball(0.24, 10, 8), at(T(0, 4.45, 0)), '#8a3a2c'); K.X.add(cone(0.08, 0.5, 6), at(T(0, 4.85, 0)), '#8a3a2c');
  }
  // the pagoda on the hill: a landmark you can steer by on a clear day
  {
    const y0 = H(0, 0) - 0.3;
    for (let i = 0; i < 7; i++) {
      const rr = 3.3 - i * 0.33, y = y0 + i * 3;
      K.P.add(cyl(rr * 0.8, rr * 0.86, 2.5, 8), T(0, y + 1.25, 0), '#e2d8c4', { uv: UV.plaster, jit: 0.03 });
      K.R.add(cyl(rr * 0.7, rr * 1.62, 0.78, 8), T(0, y + 2.8, 0), TILE, { uv: UV.tile });
      K.R.add(cyl(rr * 1.62, rr * 1.72, 0.08, 8), T(0, y + 2.4, 0), EAVE, { uv: UV.tile });
      for (let k = 0; k < 4; k++) K.X.add(box(0.5, 0.9, 0.06), T(Math.cos((k / 4) * TAU) * rr * 0.83, y + 1.2, Math.sin((k / 4) * TAU) * rr * 0.83, 0, -(k / 4) * TAU + Math.PI / 2, 0), '#3a2c22', { jit: 0 });
    }
    K.X.add(cone(0.4, 3.4, 8), T(0, y0 + 22.6, 0), '#7a6a44');
  }
}
