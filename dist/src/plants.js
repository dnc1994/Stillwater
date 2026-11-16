// plants.js — everything that grows. Trunks and stems are solid; the leaves are painted cards cut out
// of one sheet (see tex.js), lit softly and swaying, which gives fine silhouettes for very few triangles.
import * as THREE from 'three';
import { Builder, T, cyl, cone, ball, blob, card, matte } from './build.js';
import { LEAF, region } from './tex.js';

const TAU = Math.PI * 2;
const R = Object.fromEntries(Object.keys(LEAF).map((k) => [k, region(LEAF[k])]));
export const SOLID = [R.solid[0] + R.solid[2] / 2, R.solid[1] + R.solid[3] / 2];
const mk = () => new Builder(SOLID);
const up = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const mix = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

export function leafMaterials(tex) {
  const common = { map: tex.leaves.color, alphaMap: tex.leaves.alpha, alphaTest: 0.36, side: THREE.DoubleSide };
  const material = matte({ ...common, alphaToCoverage: true, sway: 1, soft: true });
  const still = matte({ ...common, alphaToCoverage: true, soft: true });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: tex.leaves.alpha, alphaTest: 0.36 });
  return { material, still, depth };
}

export function willow(rand) {
  const b = mk(), bark = '#6a5c48';
  b.add(cyl(0.17, 0.33, 3.4, 8), T(0.15, 1.7, 0, 0, 0, -0.1), bark);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + rand(); b.add(cyl(0.06, 0.14, 2.6, 5), T(0.3 + Math.cos(a) * 0.65, 4.0, Math.sin(a) * 0.65, 0, -a, -0.55), bark); }
  for (let i = 0; i < 16; i++) {        // the crown
    const a = rand() * TAU, q = rand() * 2.3, y = 5.2 - q * 0.3 + rand() * 0.7;
    b.add(card(2.7, 2.7, 'center'), T(0.3 + Math.cos(a) * q, y, Math.sin(a) * q, -0.9 + rand() * 0.6, rand() * TAU, 0), rand() < 0.5 ? '#9cc45c' : '#86b250', { uv: 'own', rect: R.clump, normal: up(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3), sway: 0.1 });
  }
  for (let i = 0; i < 40; i++) {        // the hanging withes
    const a = rand() * TAU, q = 0.5 + rand() * 2.9, top = 5.5 - q * 0.33 + rand() * 0.4, len = Math.min(top - 0.3, 2.6 + rand() * 2.8);
    b.add(card(len * 0.29, len, 'top'), T(0.3 + Math.cos(a) * q, top, Math.sin(a) * q, 0, rand() * TAU, 0), rand() < 0.5 ? '#b2d468' : '#98c058', { uv: 'own', rect: R.willow, normal: up(Math.cos(a) * 0.5, 0.85, Math.sin(a) * 0.5), sway: (t) => 0.06 + (1 - t) * 0.5 });
  }
  return b.build();
}

export function tree(rand, lo, hi, tall = 0) {
  const b = mk(), bark = '#6e5a40', base = 3.3 + tall;
  b.add(cyl(0.14, 0.27, base + 0.4, 7), T(0, (base + 0.4) / 2, 0), bark);
  const cores = [];
  for (let i = 0; i < 4; i++) {
    const a = rand() * TAU, q = i ? 0.9 + rand() * 0.8 : 0, c = [Math.cos(a) * q, base + 0.4 + rand() * 1.7, Math.sin(a) * q, 1.15 + rand() * 0.6];
    cores.push(c);
    b.add(blob(c[3] * 0.82, 1), T(c[0], c[1], c[2], 0, rand() * 3, 0, 1, 0.85, 1), mix(lo, '#20301c', 0.25), { top: lo, sway: 0.04, jit: 0.05 });
    if (i) b.add(cyl(0.04, 0.09, 1.9, 4), T(c[0] * 0.5, base + 0.2, c[2] * 0.5, 0, -a, -0.7), bark);
  }
  for (let i = 0; i < 30; i++) {        // leaves all over the outside
    const c = cores[i % 4], th = rand() * TAU, ph = Math.acos(1 - rand() * 1.35), d = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
    b.add(card(2.0, 2.0, 'center'), T(c[0] + d[0] * c[3] * 0.85, c[1] + d[1] * c[3] * 0.8, c[2] + d[2] * c[3] * 0.85, -Math.asin(d[1]) * 0.7 + (rand() - 0.5) * 0.5, Math.atan2(d[0], d[2]), rand() * 3),
      mix(lo, hi, 0.25 + 0.75 * Math.max(0, d[1])), { uv: 'own', rect: R.clump, normal: up(d[0], d[1] + 0.9, d[2]), sway: 0.07, jit: 0.07 });
  }
  return b.build();
}

export function peach(rand) {
  const b = mk(), bark = '#3e2e2a';
  b.add(cyl(0.07, 0.14, 1.5, 6), T(0, 0.75, 0, 0, 0, 0.15), bark);
  const tips = [];
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + rand(), l = 1.3 + rand() * 0.6; b.add(cyl(0.03, 0.07, l, 4), T(Math.cos(a) * 0.4, 1.4 + l * 0.38, Math.sin(a) * 0.4, 0, -a, -0.75), bark); tips.push([Math.cos(a) * (0.4 + l * 0.33), 1.4 + l * 0.75, Math.sin(a) * (0.4 + l * 0.33)]); }
  for (let i = 0; i < 18; i++) { const t = tips[i % 5]; b.add(card(1.45, 1.45, 'center'), T(t[0] + (rand() - 0.5) * 0.9, t[1] + (rand() - 0.6) * 0.9, t[2] + (rand() - 0.5) * 0.9, (rand() - 0.5) * 1.4, rand() * TAU, rand() * 3), rand() < 0.6 ? '#ffffff' : '#ffe6ec', { uv: 'own', rect: R.blossom, normal: up(0, 1, 0), sway: 0.04, jit: 0.03 }); }
  return b.build();
}

export function bamboo(rand) {
  const b = mk(), h = 7.8;
  b.add(cyl(0.032, 0.06, h, 6), T(0, h / 2, 0), '#7fa152', { top: '#b9cf78', sway: (t) => t * t * 0.3 });
  for (let y = 0.9; y < h - 1; y += 0.85) b.add(cyl(0.062 - y * 0.003, 0.062 - y * 0.003, 0.035, 6), T(0, y, 0), '#5d7a3e', { sway: (y / h) ** 2 * 0.3, jit: 0 });
  for (let i = 0; i < 10; i++) {
    const a = rand() * TAU, y = 3.0 + i * 0.5 + rand() * 0.3, q = 0.5 + rand() * 0.35, sw = 0.08 + (y / h) ** 2 * 0.3;
    b.add(card(1.7, 1.7, 'center'), T(Math.cos(a) * q, y, Math.sin(a) * q, 0.35 + rand() * 0.4, -a + Math.PI / 2, (rand() - 0.5) * 0.6), rand() < 0.5 ? '#8fb85a' : '#a8cb68', { uv: 'own', rect: R.bamboo, normal: up(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3), sway: sw, jit: 0.06 });
  }
  return b.build();
}

const crossed = (b, w, h, rect, color, sway, n = 2, y = 0) => { for (let k = 0; k < n; k++) b.add(card(w, h, 'bottom'), T(0, y, 0, 0, (k / n) * Math.PI + 0.3, 0), color, { uv: 'own', rect, normal: up(0, 1, 0), sway, jit: 0.05 }); return b; };
export const reeds = () => crossed(mk(), 0.75, 2.1, R.reed, '#b9c48a', (t) => t * 0.24, 3).build();
export const grass = () => crossed(mk(), 0.6, 0.46, R.grass, '#8fb85c', (t) => t * 0.06).build();
export const waterweed = () => crossed(mk(), 0.55, 1.0, R.grass, '#4c7a4a', (t) => t * 0.26).build();
export const wildflower = () => crossed(mk(), 0.55, 0.55, R.flower, '#ffffff', (t) => t * 0.05).build();
export const rapeseed = () => crossed(mk(), 1.1, 1.25, R.rape, '#ffffff', (t) => t * 0.07).build();
export const rice = () => crossed(mk(), 0.45, 0.36, R.grass, '#a4d45e', (t) => t * 0.04).build();

const disc = (r, bowl) => {         // a lotus leaf: flat on the water, or a shallow bowl with a wavy rim held up on a stalk
  const g = new THREE.CircleGeometry(r, 18).rotateX(-Math.PI / 2), p = g.attributes.position;
  if (bowl) for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), q = Math.hypot(x, z) / r; p.setY(i, q * q * bowl + Math.sin(Math.atan2(z, x) * 5) * 0.035 * q); }
  g.computeVertexNormals();
  return g;
};
export const lotusPad = () => mk().add(disc(0.5, 0), T(0, 0.014, 0), '#a4d68e', { uv: 'own', rect: R.lotus, jit: 0 }).build();
export const lotusLeaf = () => mk().add(cyl(0.013, 0.013, 0.62, 5), T(0, 0.31, 0), '#5f8f4e').add(disc(0.56, 0.16), T(0, 0.62, 0, 0.16, 0, 0), '#9ccf86', { uv: 'own', rect: R.lotus, sway: 0.07, jit: 0 }).build();
export function lotusFlower(kind) {     // 0 open flower, 1 bud, 2 seed pod
  const b = mk(), h = 0.78 + kind * 0.06;
  b.add(cyl(0.013, 0.013, h, 5), T(0, h / 2, 0), '#5f8f4e');
  if (kind === 0) {
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + ring * 0.4, tilt = [1.15, 0.7, 0.3][ring], q = [0.1, 0.06, 0.03][ring];
      b.add(cone(0.085, 0.36, 5), T(Math.cos(a) * q, h + 0.13 - ring * 0.02, Math.sin(a) * q, tilt, -a + Math.PI / 2, 0, 1, 1, 0.42), '#ec8fae', { top: '#fff4f6', sway: 0.07, jit: 0.03 });
    }
    b.add(cone(0.06, 0.07, 8), T(0, h + 0.04, 0, Math.PI, 0, 0), '#e6cf52', { sway: 0.07 });
  } else if (kind === 1) b.add(ball(0.05, 8, 7), T(0, h + 0.07, 0, 0, 0, 0, 1, 1.8, 1), '#f6c3d2', { top: '#e26f92', sway: 0.07, jit: 0.03 });
  else { b.add(cone(0.09, 0.12, 9), T(0, h + 0.05, 0, Math.PI, 0, 0), '#7fa25a', { sway: 0.07 }); b.add(cyl(0.09, 0.09, 0.012, 9), T(0, h + 0.112, 0), '#a8bf6a', { sway: 0.07 }); }
  return b.build();
}
export const rock = (rand) => { const g = new THREE.IcosahedronGeometry(0.42, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.8 + 0.4 * Math.sin(p.getX(i) * 9.1 + p.getY(i) * 7.3 + p.getZ(i) * 5.7); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.62, p.getZ(i) * k); } g.computeVertexNormals(); return mk().add(g, null, '#8f8c80', { top: '#b9b6a8', speckle: 0.06 }).build(); };
// Things lying flat on the water: fallen petals, duckweed.
const flat = (size, rect, color) => mk().add(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), T(0, 0.012, 0), color, { uv: 'own', rect, sway: 0.25, jit: 0 }).build();
export const petal = () => flat(0.045, R.petal, '#fbd3dc');
export const duckweed = () => flat(0.16, R.weed, '#9cc85e');
