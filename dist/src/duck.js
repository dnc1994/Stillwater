// duck.js — ducks, ducklings and the other small animals, built from a few soft shapes.
import * as THREE from 'three';
import { Builder, T, ball, cyl, cone, box, matte } from './build.js';

const PALETTE = {
  white: { body: '#f3f0e6', tint: '#ffffff', wing: '#e3dfd2', head: '#f6f3ea', sheen: '#ffffff', bill: '#f0a23a', nail: '#d98a2a' },
  hen: { body: '#94724d', tint: '#f0e2cc', wing: '#735638', head: '#8b6b49', sheen: '#b3946a', bill: '#c08a3e', nail: '#5a3c22', stripe: '#3c2a1c' },
  drake: { body: '#aa9d88', tint: '#d6d0c6', wing: '#7d6b55', head: '#17543c', sheen: '#46b482', bill: '#dcc24a', nail: '#3a3020', ring: '#f4f1e8', chest: '#8b5642', curl: '#1d1f22' },
  duckling: { body: '#f1d568', tint: '#f1d568', wing: '#dcbc52', head: '#f4de7c', sheen: '#fbeea0', bill: '#c77a5c', nail: '#a85c44', cap: '#b08a4c' },
};
let shared, headMat, feathers = null;
const wingMats = {};
const bodyMats = {};
const mat = () => (shared ??= matte());
// Feather textures arrive once the scenery has painted them.
export function setDuckTextures(t) { feathers = t; for (const f of [t.brown, t.white]) f.repeat.set(5, 3); }
const bodyMat = (kind) => (bodyMats[kind] ??= matte(feathers && kind !== 'duckling' ? { map: kind === 'white' ? feathers.white : feathers.brown } : {}));
const headMaterial = () => (headMat ??= new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 48, specular: new THREE.Color('#33443c') }));

// A duck is two meshes: the body, and a head that pivots at the base of the neck.
export function makeDuck(kind = 'white', scale = 1) {
  const p = PALETTE[kind], baby = kind === 'duckling', own = { uv: 'own', jit: 0 };
  const b = new Builder();
  // the body: a teardrop, fuller at the breast, narrowing and lifting towards the tail
  const hull = ball(0.5, 24, 16), hp = hull.attributes.position;
  for (let i = 0; i < hp.count; i++) { const back = Math.max(0, -hp.getZ(i)) * 2; hp.setX(i, hp.getX(i) * (1 - back * 0.45)); hp.setY(i, hp.getY(i) + back * back * 0.22); }
  hull.computeVertexNormals();
  b.add(hull, T(0, 0.075, 0, 0, 0, 0, 0.25, 0.2, baby ? 0.34 : 0.44), p.tint, { ...own, speckle: baby ? 0.04 : 0 });
  if (p.chest) b.add(ball(0.5, 14, 10), T(0, 0.066, 0.125, 0, 0, 0, 0.222, 0.178, 0.2), p.chest, own);
  for (const s of [1, -1]) {       // folded wings lying along the flanks, with the bright wing-patch showing
    b.add(ball(0.5, 12, 8), T(s * 0.102, 0.112, -0.03, 0, s * 0.08, 0, 0.075, 0.105, 0.31), new THREE.Color(p.tint).multiplyScalar(0.82), own);
    if (!baby && kind !== 'white') { b.add(box(0.012, 0.034, 0.1), T(s * 0.143, 0.118, -0.1, 0, s * 0.08, 0), '#3b6fae', { jit: 0 }); for (const e of [-1, 1]) b.add(box(0.013, 0.036, 0.012), T(s * 0.143, 0.118, -0.1 + e * 0.056, 0, s * 0.08, 0), '#f1eee4', { jit: 0 }); }
  }
  for (const [x, r] of baby ? [[0, 0]] : [[0, 0], [0.035, 0.25], [-0.035, -0.25]]) b.add(cone(0.06, 0.2, 6), T(x, 0.165, baby ? -0.17 : -0.235, -1.15, r, 0, 1, 1, 0.3), p.wing, { jit: 0 });
  if (p.curl) b.add(new THREE.TorusGeometry(0.03, 0.009, 5, 10, 4.2), T(0, 0.21, -0.215, 0, Math.PI / 2, 0.6), p.curl, { jit: 0 });
  const body = new THREE.Mesh(b.build(), bodyMat(kind));

  // neck and head turned as one smooth shape, then leaned forward
  const h = new Builder(), k = baby ? 0.72 : 0.88;
  const prof = (baby ? [[0.03, 0], [0.03, 0.03], [0.05, 0.075], [0.058, 0.115], [0.048, 0.155], [0.02, 0.175], [0, 0.18]] : [[0.047, 0], [0.041, 0.03], [0.035, 0.075], [0.039, 0.112], [0.053, 0.145], [0.058, 0.178], [0.05, 0.208], [0.028, 0.228], [0, 0.234]]).map(([r, y]) => new THREE.Vector2(r, y * k));
  const top = prof.at(-1).y, skull = (baby ? 0.07 : 0.12) * k, lathe = new THREE.LatheGeometry(prof, 22), lp = lathe.attributes.position;
  const lean = (y) => (y / top) ** 2 * 0.05;
  for (let i = 0; i < lp.count; i++) { const y = lp.getY(i), up = Math.min(1, Math.max(0, (y - skull) / 0.03)); lp.setZ(i, lp.getZ(i) * (1 + up * 0.26) + lean(y) + up * 0.008); lp.setX(i, lp.getX(i) * (1 - up * 0.06)); }
  lathe.computeVertexNormals();
  const first = h.p.length / 3;
  h.add(lathe, null, '#ffffff', { jit: 0 });
  const cHead = new THREE.Color(p.head), cSheen = new THREE.Color(p.sheen), cRing = new THREE.Color(p.ring ?? p.head), cBase = new THREE.Color(p.chest ?? p.body), c = new THREE.Color();
  for (let i = first; i < h.p.length / 3; i++) {
    const y = h.p[i * 3 + 1], x = h.p[i * 3];
    if (p.ring && y < 0.024) c.copy(cBase); else if (p.ring && y < 0.046) c.copy(cRing);
    else c.lerpColors(cHead, cSheen, Math.max(0, Math.min(1, (y - skull) / (top - skull))) * 0.55 + Math.abs(x) * 3);
    h.c[i * 3] = c.r; h.c[i * 3 + 1] = c.g; h.c[i * 3 + 2] = c.b;
  }
  const hy = skull + (top - skull) * 0.42, hz = lean(hy) + 0.01;
  if (p.cap) h.add(ball(0.04, 8, 6), T(0, top - 0.02, hz + 0.005, 0, 0, 0, 1.25, 0.6, 1.5), p.cap, { jit: 0 });
  // the bill: broad and flat, a touch upturned, darker at the nail
  h.add(ball(0.5, 12, 8), T(0, hy - 0.016, hz + 0.082, -0.1, 0, 0, 0.05, 0.02, 0.1), p.bill, { jit: 0 });
  h.add(ball(0.5, 8, 6), T(0, hy - 0.006, hz + 0.058, -0.25, 0, 0, 0.04, 0.022, 0.05), p.bill, { jit: 0 });
  h.add(ball(0.5, 6, 5), T(0, hy - 0.02, hz + 0.128, 0, 0, 0, 0.02, 0.012, 0.014), p.nail, { jit: 0 });
  for (const s of [1, -1]) {
    h.add(ball(0.0095, 8, 6), T(s * 0.046, hy + 0.014, hz + 0.036), '#0c0c0c', { jit: 0 });
    h.add(ball(0.003, 5, 4), T(s * 0.052, hy + 0.019, hz + 0.04), '#ffffff', { jit: 0 });
    if (p.stripe) h.add(ball(0.5, 8, 5), T(s * 0.05, hy + 0.014, hz + 0.02, 0, s * 0.2, 0, 0.008, 0.014, 0.085), p.stripe, { jit: 0 });
  }
  const head = new THREE.Mesh(h.build(), headMaterial());
  head.position.set(0, 0.125, baby ? 0.1 : 0.14);

  const g = new THREE.Group();
  g.add(body, head);
  // Wings stay folded away (hidden) on the water and open only for running take-offs and flight.
  let wings = [];
  if (!baby) {
    // an open wing: a curved leading edge, a trailing edge of separate feather tips, darker towards the primaries
    const shape = new THREE.Shape(), tips = 11;
    shape.moveTo(0, 0.07); shape.quadraticCurveTo(0.3, 0.11, 0.5, 0.05); shape.quadraticCurveTo(0.56, 0.02, 0.55, -0.02);
    for (let k = 0; k < tips; k++) { const x1 = 0.55 * (1 - (k + 0.5) / tips), x2 = 0.55 * (1 - (k + 1) / tips), len = 0.085 + 0.04 * Math.sin(((k + 0.5) / tips) * Math.PI); shape.quadraticCurveTo(x1 + 0.02, -len - 0.025, x1, -len); shape.lineTo(x2, -len + 0.022); }
    const geo = new THREE.ShapeGeometry(shape, 6).rotateX(Math.PI / 2), gp = geo.attributes.position, col = [], uv = [];
    const root = new THREE.Color(p.tint), tip = new THREE.Color(p.wing).multiplyScalar(kind === 'white' ? 1 : 0.62), c = new THREE.Color();
    for (let k = 0; k < gp.count; k++) {
      const x = gp.getX(k), z = gp.getZ(k), t = Math.min(1, x / 0.5), rear = z > 0.035;
      c.lerpColors(root, tip, t * t * 0.9 + (rear ? 0.25 : 0));
      if (kind !== 'white' && rear && z < 0.08 && x > 0.06 && x < 0.3) c.set(z < 0.045 || z > 0.07 ? '#f1eee4' : '#35639f');      // the bright wing-patch between two white bars
      col.push(c.r, c.g, c.b); uv.push(x * 7, z * 7);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('sway', new THREE.Float32BufferAttribute(new Float32Array(gp.count), 1));
    geo.computeVertexNormals();
    wingMats[kind] ??= matte({ side: THREE.DoubleSide, ...(feathers ? { map: kind === 'white' ? feathers.white : feathers.brown } : {}) });
    wings = [1, -1].map((s) => { const m = new THREE.Mesh(geo, wingMats[kind]); m.scale.x = s; m.position.set(s * 0.085, 0.15, 0.05); m.visible = false; m.castShadow = true; g.add(m); return m; });
  }
  g.scale.setScalar(scale * (baby ? 0.46 : 1));
  body.castShadow = head.castShadow = true;
  g.userData = { head, body, wings };
  return g;
}

export function makeEgret() {
  const b = new Builder(), W = '#f6f5ef';
  for (const s of [1, -1]) b.add(cyl(0.012, 0.012, 0.6, 4), T(s * 0.05, 0.3, 0), '#2a2a28', { jit: 0 });
  b.add(ball(0.5, 9, 7), T(0, 0.68, -0.03, -0.5, 0, 0, 0.17, 0.16, 0.36), W, { jit: 0 });
  b.add(cyl(0.028, 0.04, 0.3, 5), T(0, 0.86, 0.14, 0.75, 0, 0), W, { jit: 0 });
  b.add(cyl(0.022, 0.028, 0.3, 5), T(0, 1.06, 0.2, -0.3, 0, 0), W, { jit: 0 });
  b.add(ball(0.045, 7, 5), T(0, 1.2, 0.2, 0, 0, 0, 1, 1, 1.3), W, { jit: 0 });
  b.add(cone(0.015, 0.2, 4), T(0, 1.19, 0.34, Math.PI / 2, 0, 0), '#e2b23c', { jit: 0 });
  const g = new THREE.Group(), body = new THREE.Mesh(b.build(), mat());
  body.castShadow = true;
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.16, 0, 0, -0.2, 0.72, 0, -0.05, 0, 0, 0.16, 0.72, 0, -0.05, 0.5, 0, 0.2], 3));
  wingGeo.computeVertexNormals();
  const wm = new THREE.MeshLambertMaterial({ color: W, side: THREE.DoubleSide });
  const wings = [1, -1].map((s) => { const w = new THREE.Mesh(wingGeo, wm); w.scale.x = s; w.position.set(s * 0.1, 0.76, 0); w.visible = false; g.add(w); return w; });
  g.add(body);
  g.userData = { wings, body };
  return g;
}

export function makeFrog() {
  const b = new Builder();
  b.add(ball(0.5, 8, 6), T(0, 0.03, 0, 0, 0, 0, 0.08, 0.055, 0.1), '#5d9a3e', { jit: 0 });
  for (const s of [1, -1]) {
    b.add(ball(0.014, 5, 4), T(s * 0.022, 0.06, 0.03), '#e8e0a0', { jit: 0 });
    b.add(ball(0.5, 5, 4), T(s * 0.04, 0.015, -0.03, 0, 0, 0, 0.035, 0.02, 0.06), '#4c8636', { jit: 0 });
  }
  return new THREE.Mesh(b.build(), mat());
}

export function fishGeometry() {
  const b = new Builder();
  b.add(ball(0.5, 7, 5), T(0, 0, 0, 0, 0, 0, 0.035, 0.06, 0.16), '#6f7d70', { top: '#b9c4b4', jit: 0 });
  b.add(cone(0.045, 0.07, 3), T(0, 0, -0.1, -Math.PI / 2, 0, 0, 0.3, 1, 1), '#8a9788', { jit: 0 });
  return b.build();
}
// Pose a duck's wings: beat > 0 flaps (phase in radians), otherwise they are held out in a glide.
export function poseWings(duck, open, phase, flapping) {
  const a = flapping ? -0.12 + Math.sin(phase) * 0.5 : 0.06 + Math.sin(phase * 0.3) * 0.03;
  duck.userData.wings.forEach((w, i) => { w.visible = open; w.rotation.z = i ? -a : a; });
}
export const fishMaterial = () => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
