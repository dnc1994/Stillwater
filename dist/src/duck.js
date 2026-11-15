// duck.js — ducks, ducklings and the other small animals, built from a few soft shapes.
import * as THREE from 'three';
import { Builder, T, ball, cyl, cone, box, matte } from './build.js';

const PALETTE = {
  white: { body: '#f3f0e6', wing: '#e3dfd2', head: '#f3f0e6', bill: '#f0a23a' },
  hen: { body: '#94724d', wing: '#735638', head: '#7a5c3e', bill: '#a8964a', speckle: 0.2 },
  drake: { body: '#aa9d88', wing: '#7d6b55', head: '#1f6248', sheen: '#3f9d72', bill: '#dcbb3c', ring: '#f2efe6', chest: '#6b4131', speckle: 0.1 },
  duckling: { body: '#f1d568', wing: '#dcbc52', head: '#f4de7c', bill: '#c77a5c', cap: '#b08a4c' },
};
let shared, wingMat;
const mat = () => (shared ??= matte());

// A duck is two meshes: the body, and a head that pivots at the base of the neck.
export function makeDuck(kind = 'white', scale = 1) {
  const p = PALETTE[kind], baby = kind === 'duckling';
  const b = new Builder();
  b.add(ball(0.5, 14, 10), T(0, 0.075, 0, 0, 0, 0, 0.24, 0.19, baby ? 0.34 : 0.42), p.body, { speckle: p.speckle ?? 0, jit: 0 });
  if (p.chest) b.add(ball(0.5, 10, 8), T(0, 0.068, 0.12, 0, 0, 0, 0.215, 0.175, 0.2), p.chest, { jit: 0 });
  b.add(cone(0.075, 0.2, 6), T(0, 0.145, baby ? -0.17 : -0.215, -1.1, 0, 0, 1, 1, 0.45), p.wing, { jit: 0 });
  for (const s of [1, -1]) b.add(ball(0.5, 8, 6), T(s * 0.1, 0.105, -0.02, 0, 0, 0, 0.07, 0.115, 0.3), p.wing, { speckle: p.speckle ?? 0, jit: 0 });
  const body = new THREE.Mesh(b.build(), mat());

  const h = new Builder(), hs = baby ? 1.3 : 1;
  h.add(cyl(0.032, 0.043, baby ? 0.08 : 0.12, 9), T(0, baby ? 0.035 : 0.055, 0.01, 0.16, 0, 0), p.head, { jit: 0 });
  if (p.ring) h.add(cyl(0.041, 0.044, 0.028, 7), T(0, 0.03, 0.004, 0.16, 0, 0), p.ring, { jit: 0 });
  const hy = baby ? 0.1 : 0.14;
  h.add(ball(0.058, 18, 12), T(0, hy, 0.035, 0, 0, 0, hs * 0.9, hs * 0.92, hs * 1.3), p.head, { top: p.sheen ?? p.head, jit: 0 });
  if (p.cap) h.add(ball(0.04, 7, 5), T(0, hy + 0.035, 0.02, 0, 0, 0, 1.3, 0.7, 1.5), p.cap, { jit: 0 });
  h.add(box(0.048, 0.017, 0.07), T(0, hy - 0.014, 0.105 * (baby ? 0.95 : 1)), p.bill, { jit: 0 });
  h.add(ball(0.024, 6, 4), T(0, hy - 0.014, 0.14 * (baby ? 0.95 : 1), 0, 0, 0, 1, 0.36, 0.7), p.bill, { jit: 0 });
  for (const s of [1, -1]) h.add(ball(0.0085, 5, 4), T(s * 0.047 * hs, hy + 0.012, 0.062), '#111111', { jit: 0 });
  const head = new THREE.Mesh(h.build(), mat());
  head.position.set(0, 0.13, baby ? 0.1 : 0.14);

  const g = new THREE.Group();
  g.add(body, head);
  // Wings stay folded away (hidden) on the water and open only for running take-offs and flight.
  let wings = [];
  if (!baby) {
    // a flat, tapered wing: pale at the shoulder, darker flight feathers at the tip
    const pts = [[0, 0.075], [0.26, 0.085], [0.47, 0.04], [0.52, -0.005], [0.3, -0.075], [0, -0.07]], pos = [], col = [];
    const root = new THREE.Color(p.body), tip = new THREE.Color(p.wing).multiplyScalar(0.8), c = new THREE.Color();
    for (let k = 1; k < pts.length - 1; k++) for (const q of [pts[0], pts[k], pts[k + 1]]) { pos.push(q[0], 0, q[1]); c.lerpColors(root, tip, Math.min(1, q[0] / 0.45)); col.push(c.r, c.g, c.b); }
    if (kind === 'drake') for (const q of [[0.08, -0.03], [0.3, -0.035], [0.3, -0.072], [0.08, -0.03], [0.3, -0.072], [0.08, -0.068]]) { pos.push(q[0], 0.004, q[1]); col.push(0.2, 0.42, 0.68); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('sway', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3), 1));
    geo.computeVertexNormals();
    wingMat ??= matte({ side: THREE.DoubleSide });
    wings = [1, -1].map((s) => { const m = new THREE.Mesh(geo, wingMat); m.scale.x = s; m.position.set(s * 0.085, 0.15, 0.05); m.visible = false; m.castShadow = true; g.add(m); return m; });
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
  const a = flapping ? 0.02 + Math.sin(phase) * 0.55 : 0.1 + Math.sin(phase * 0.3) * 0.03;
  duck.userData.wings.forEach((w, i) => { w.visible = open; w.rotation.z = i ? -a : a; });
}
export const fishMaterial = () => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
