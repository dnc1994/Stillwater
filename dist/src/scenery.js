// scenery.js — land, white walls and black tiles, bridges, boats and everything that grows.
import * as THREE from 'three';
import { SIZE, N, rng, smooth, zoneWeight } from './world.js';
import { Builder, T, box, cyl, cone, ball, blob, matte, instanced, setBuildRandom } from './build.js';

const TAU = Math.PI * 2;
const WALL = '#eeece4', STAIN = '#b4b5ae', TILE = '#33373a', WOOD = '#5a3b2b', STONE = '#bcb8ab', MOSS = '#8d9478';

function createTerrain(world) {
  const g = new THREE.PlaneGeometry(2 * SIZE, 2 * SIZE, N - 1, N - 1);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), k = new THREE.Color();
  const FIELD = ['#9dc163', '#93aa98', '#e8cd3c', '#ab9d6c'];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), d = world.sdf(x, z);
    pos.setY(i, world.height(x, z));
    const n1 = world.noise(x * 0.06, z * 0.06), n2 = world.noise(x * 0.33, z * 0.33);
    if (d <= 0) c.set('#8f8a66').lerp(k.set('#7b8a68'), smooth(0, -3, d));
    else {
      const u = world.uAt(x, z), f = world.fieldAt(x, z), town = zoneWeight(u, 'village');
      c.set('#7da159').lerp(k.set('#a5be6c'), n1).lerp(k.set('#5d8a54'), n2 * 0.35 + (world.outside(x, z) ? 0 : 0.25) * smooth(18, 40, d));
      c.lerp(k.set('#857e5d'), 1 - smooth(0.2, 1.4, d));
      c.lerp(k.set('#9a9278'), town * (1 - smooth(22, 48, d)) * 0.8);
      c.lerp(k.set('#a6a298').multiplyScalar(0.92 + n2 * 0.16), town * (1 - smooth(9, 15, d)));
      c.lerp(k.set(f.ridge ? '#737d4c' : FIELD[f.kind]).multiplyScalar(0.94 + n2 * 0.12), f.w);
      c.lerp(k.set('#4f7f4c'), Math.exp(-(x * x + z * z) / 3200));
    }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  mesh.position.y = 0.02;
  // beyond the mapped square the land simply carries on, flat, into the mist
  const far = new THREE.Mesh(new THREE.RingGeometry(SIZE - 2, 2400, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#8fae62' }));
  far.position.y = 0.4;
  const group = new THREE.Group(); group.add(mesh, far);
  return group;
}

// ---- built things -------------------------------------------------------------------------
function prism(w, rise, d) {       // triangular gable, ridge along x
  const hw = w / 2, hd = d / 2, v = [
    -hw, 0, hd, -hw, 0, -hd, -hw, rise, 0, hw, 0, -hd, hw, 0, hd, hw, rise, 0,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

function house(b, glass, lamps, H, M, rand) {
  const { w, d } = H, h = H.st === 2 ? 5.3 : 3.1, rise = d * 0.27, ang = Math.atan2(rise, d / 2), add = (g, m, c, o) => b.add(g, M.clone().multiply(m), c, o);
  add(box(w + 0.12, 0.5, d + 0.12), T(0, 0.25, 0), STONE);
  add(box(w, h, d), T(0, h / 2, 0), STAIN, { top: WALL, jit: 0.03 });
  add(prism(w, rise, d), T(0, h, 0), WALL, { jit: 0.03 });
  const over = 0.55, run = d / 2 + over, sl = run / Math.cos(ang), rw = w + (H.horse ? 0.1 : 0.9);
  for (const s of [1, -1]) add(box(rw, 0.14, sl), T(0, h + rise - (run / 2) * Math.tan(ang) + 0.09, (s * run) / 2, s * ang, 0, 0), TILE, { jit: 0.08 });
  add(box(rw + 0.2, 0.2, 0.34), T(0, h + rise + 0.14, 0), TILE);
  if (H.horse) for (const e of [1, -1]) for (let k = 0; k < 3; k++) {       // stepped "horse-head" gable walls
    const dk = (d + 0.9) * (1 - k * 0.33), top = h + rise * (0.08 + k * 0.42) + 0.5, x = e * (w / 2 + 0.02);
    add(box(0.3, top - h + 1, dk), T(x, (top + h - 1) / 2, 0), WALL, { jit: 0.02 });
    add(box(0.46, 0.13, dk + 0.3), T(x, top + 0.06, 0), TILE);
  }
  const z = d / 2, dx = (rand() - 0.5) * (w - 3);
  add(box(1.15, 2.05, 0.1), T(dx, 1.03, z + 0.03), WOOD, { jit: 0.1 });
  add(box(1.5, 0.14, 0.5), T(dx, 0.07, z + 0.3), STONE);
  const win = (x, y, zz, ww = 0.9, hh = 0.95) => { add(box(ww + 0.18, hh + 0.18, 0.06), T(x, y, zz), WOOD); glass.add(box(ww, hh, 0.05), M.clone().multiply(T(x, y, zz + Math.sign(zz) * 0.04)), '#ffffff', { jit: 0.25 }); };
  for (const x of [-w / 2 + 1.1, w / 2 - 1.1]) if (Math.abs(x - dx) > 1.3) win(x, 1.75, z);
  win((rand() - 0.5) * (w - 2.5), 1.8, -z);
  if (H.st === 2) {
    add(box(w * 0.94, 1.55, 0.14), T(0, h - 1.25, z + 0.05), WOOD, { jit: 0.1 });
    const n = w > 8 ? 3 : 2;
    for (let i = 0; i < n; i++) win(((i + 0.5) / n - 0.5) * w * 0.8, h - 1.2, z + 0.1, 1.1, 0.9);
    add(box(w * 0.98, 0.1, 0.7), T(0, h - 2.15, z + 0.3), TILE);
  }
  if (H.lantern) {
    const lx = dx + (rand() < 0.5 ? 0.95 : -0.95), p = new THREE.Vector3(lx, 2.3, z + 0.42).applyMatrix4(M);
    lamps.push(p);
    add(box(0.03, 0.4, 0.03), T(lx, 2.65, z + 0.42), '#222');
  }
}

function archBridge(b, M, hw) {
  const R = hw - 0.35, L = hw + 5.5, top = R + 1.05, base = 0.85, W = 3.3;
  const sh = new THREE.Shape();
  sh.moveTo(-L, -1.4); sh.lineTo(-L, base); sh.quadraticCurveTo(-L * 0.5, top, 0, top); sh.quadraticCurveTo(L * 0.5, top, L, base);
  sh.lineTo(L, -1.4); sh.lineTo(R, -1.4); sh.lineTo(R, 0); sh.absarc(0, 0, R, 0, Math.PI, false); sh.lineTo(-R, -1.4);
  const g = new THREE.ExtrudeGeometry(sh, { depth: W, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -W / 2);
  b.add(g, M, MOSS, { top: STONE, speckle: 0.07, jit: 0.02 });
  const deck = (t) => { const k = 1 - t, x = t < 0.5 ? -1 : 1, tt = t < 0.5 ? t * 2 : (1 - t) * 2; return [x * (L * (1 - tt) * (1 - tt) + 2 * (1 - tt) * tt * L * 0.5), base * (1 - tt) * (1 - tt) + 2 * (1 - tt) * tt * top + tt * tt * top, k]; };
  for (let i = 0; i < 20; i++) {
    const [x0, y0] = deck(i / 20), [x1, y1] = deck((i + 1) / 20), len = Math.hypot(x1 - x0, y1 - y0);
    for (const s of [1, -1]) b.add(box(len + 0.05, 0.5, 0.24), M.clone().multiply(T((x0 + x1) / 2, (y0 + y1) / 2 + 0.22, s * (W / 2 - 0.12), 0, 0, Math.atan2(y1 - y0, x1 - x0))), STONE, { jit: 0.07 });
  }
}

function slabBridge(b, M, hw) {
  const L = 2 * hw + 3.5;
  b.add(box(L, 0.28, 2.1), M.clone().multiply(T(0, 1.32, 0)), STONE, { speckle: 0.05 });
  for (const s of [1, -1]) {
    b.add(box(L, 0.08, 0.08), M.clone().multiply(T(0, 2.05, s)), WOOD);
    for (let x = -L / 2 + 0.3; x < L / 2; x += 1.6) b.add(box(0.08, 0.7, 0.08), M.clone().multiply(T(x, 1.75, s)), WOOD);
    b.add(box(1.6, 2.4, 2.3), M.clone().multiply(T(s * (hw + 1), 0.05, 0)), STONE, { jit: 0.06 });
  }
  if (hw > 4) for (const s of [1, -1]) b.add(box(0.5, 2.6, 1.7), M.clone().multiply(T(s * hw * 0.4, 0, 0)), STONE, { jit: 0.06 });
}

export function person(b, M, cloth, hat = true, lean = 0) {
  const add = (g, m, c) => b.add(g, M.clone().multiply(T(0, 0, 0, lean, 0, 0)).multiply(m), c);
  add(cyl(0.15, 0.2, 0.75, 6), T(0, 0.4, 0), '#3a3b44');
  add(cyl(0.17, 0.2, 0.6, 6), T(0, 1.05, 0), cloth);
  add(ball(0.125, 7, 6), T(0, 1.5, 0), '#e3b895');
  if (hat) add(cone(0.36, 0.2, 9), T(0, 1.68, 0), '#c9ae6c');
  else add(ball(0.09, 6, 5), T(0, 1.6, -0.08), '#26221f');
}

export function boat(b, M, canopy = true) {
  const hull = new THREE.BoxGeometry(1.3, 0.5, 5.8, 2, 1, 10), p = hull.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = Math.abs(p.getZ(i)) / 2.9, low = p.getY(i) < 0;
    p.setX(i, p.getX(i) * (1 - Math.pow(t, 2.4) * 0.88) * (low ? 0.62 : 1));
    p.setY(i, p.getY(i) + Math.pow(t, 2.2) * 0.42 + 0.14);
  }
  hull.computeVertexNormals();
  b.add(hull, M, '#2b2622', { top: '#4a4038', jit: 0.05 });
  b.add(box(0.95, 0.04, 4.2), M.clone().multiply(T(0, 0.3, 0)), '#6b5a48');
  if (canopy) {
    const arc = new THREE.CylinderGeometry(0.66, 0.66, 2.3, 10, 1, true, -Math.PI / 2, Math.PI);
    b.add(arc, M.clone().multiply(T(0, 0.3, -0.2, -Math.PI / 2, 0, 0)), '#35332e', { jit: 0.05 });
    for (const z of [-1.2, -0.2, 0.8]) b.add(new THREE.CylinderGeometry(0.685, 0.685, 0.1, 10, 1, true, -Math.PI / 2, Math.PI), M.clone().multiply(T(0, 0.3, z, -Math.PI / 2, 0, 0)), '#8a7a58');
  }
}

function buffalo(b, M) {
  const add = (g, m, c) => b.add(g, M.clone().multiply(m), c ?? '#3b3836', { jit: 0.03 });
  add(ball(0.5, 10, 8), T(0, 0.02, 0, 0, 0, 0, 0.8, 0.55, 1.5));
  add(ball(0.5, 8, 6), T(0, 0.22, 1.0, 0.25, 0, 0, 0.42, 0.4, 0.62));
  add(ball(0.2, 6, 5), T(0, 0.14, 1.36, 0, 0, 0, 0.9, 0.7, 0.8), '#2a2726');
  for (const s of [1, -1]) {
    add(cone(0.06, 0.55, 5), T(s * 0.3, 0.46, 0.86, -0.5, 0, -s * 1.15), '#4e4a44');
    add(cone(0.05, 0.3, 5), T(s * 0.56, 0.6, 0.72, -0.7, 0, -s * 0.2), '#4e4a44');
    add(ball(0.09, 5, 4), T(s * 0.24, 0.3, 0.84, 0, 0, 0, 1.5, 0.6, 0.8));
  }
}

// ---- growing things (each returns one geometry for instancing) -------------------------------
const spike = (r, h) => new THREE.ConeGeometry(r, h, 3, 1, true);

function willow(rand) {
  const b = new Builder();
  b.add(cyl(0.16, 0.3, 3.3, 6), T(0.15, 1.65, 0, 0, 0, -0.1), '#4b4233');
  for (let i = 0; i < 3; i++) { const a = rand() * TAU; b.add(cyl(0.07, 0.14, 2.4, 5), T(0.3 + Math.cos(a) * 0.6, 3.9, Math.sin(a) * 0.6, 0, -a, -0.55), '#4b4233'); }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + rand(), q = 0.9 + rand() * 0.8; b.add(blob(1.2 + rand() * 0.5, 1), T(0.3 + Math.cos(a) * q, 4.9 + rand() * 0.5, Math.sin(a) * q, 0, rand() * 3, 0, 1.15, 0.5, 1.15), '#8fb85c', { top: '#bdd676', sway: 0.12 }); }
  for (let i = 0; i < 96; i++) {
    const a = rand() * TAU, q = 0.7 + rand() * 2.8, top = 5.3 - q * 0.33 + rand() * 0.4, len = Math.min(top - 0.5, 2.2 + rand() * 2.8);
    b.add(spike(0.06 + rand() * 0.05, len), T(0.3 + Math.cos(a) * q, top - len / 2, Math.sin(a) * q, Math.PI, rand() * 3, 0), rand() < 0.5 ? '#b3d470' : '#93bb5c', { sway: (t) => 0.1 + t * 0.45 });
  }
  return b.build();
}
function roundTree(rand, lo, hi) {
  const b = new Builder();
  b.add(cyl(0.13, 0.24, 2.6, 6), T(0, 1.3, 0), '#51422f');
  for (let i = 0; i < 4; i++) { const a = rand() * TAU, q = i ? 0.9 + rand() * 0.6 : 0; b.add(blob(1.35 + rand() * 0.7, 1), T(Math.cos(a) * q, 3.4 + rand() * 1.6, Math.sin(a) * q, 0, rand() * 3, 0, 1, 0.82, 1), lo, { top: hi, sway: 0.05, jit: 0.07 }); }
  return b.build();
}
function fir(rand) {       // dawn redwood: the tall feathery cones that line Jiangnan field roads
  const b = new Builder();
  b.add(cyl(0.08, 0.2, 7, 5), T(0, 3.5, 0), '#5a4634');
  for (let i = 0; i < 5; i++) b.add(cone(1.5 - i * 0.24, 2.5, 7), T(0, 2.6 + i * 1.5, 0, 0, rand() * 3, 0), '#5f9450', { top: '#93bf68', sway: 0.04 + i * 0.02 });
  return b.build();
}
function peach(rand) {
  const b = new Builder();
  b.add(cyl(0.07, 0.13, 1.5, 5), T(0, 0.75, 0, 0, 0, 0.15), '#3c2c27');
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + rand(); b.add(cyl(0.035, 0.07, 1.4, 4), T(Math.cos(a) * 0.4, 1.9, Math.sin(a) * 0.4, 0, -a, -0.7), '#3c2c27'); }
  for (let i = 0; i < 14; i++) { const a = rand() * TAU, q = rand() * 1.3; b.add(blob(0.36 + rand() * 0.32, 1), T(Math.cos(a) * q, 2.1 + rand() * 0.9, Math.sin(a) * q, rand() * 3, rand() * 3, 0, 1, 0.75, 1), '#f0a9bc', { top: '#fbdbe2', sway: 0.04, jit: 0.06 }); }
  return b.build();
}
function bambooStalk(rand) {
  const b = new Builder();
  b.add(cyl(0.035, 0.06, 7.8, 5), T(0, 3.9, 0), '#8fae5e', { top: '#b9cf78', sway: (t) => t * t * 0.3 });
  for (let i = 0; i < 6; i++) {     // soft sprays of leaf rather than single blades
    const a = rand() * TAU, y = 3.4 + i * 0.85, q = 0.3 + rand() * 0.5;
    b.add(blob(0.62 + rand() * 0.3, 0), T(Math.cos(a) * q, y, Math.sin(a) * q, (rand() - 0.5) * 0.9, rand() * 3, (rand() - 0.5) * 0.9, 1, 0.2, 0.62), '#86b057', { top: '#c4da80', sway: 0.1 + i * 0.05, jit: 0.1 });
  }
  return b.build();
}
function reedClump(rand) {
  const b = new Builder();
  for (let i = 0; i < 5; i++) {
    const a = rand() * TAU, q = rand() * 0.28, h = 1.1 + rand() * 0.8, lean = 0.06 + rand() * 0.22;
    b.add(spike(0.04, h), T(Math.cos(a) * q, h / 2, Math.sin(a) * q, lean, a, 0), '#8ea160', { top: '#cdc88c', sway: (t) => t * 0.22 });
    if (i < 2) b.add(new THREE.OctahedronGeometry(0.05), T(Math.cos(a) * q + Math.sin(a) * lean * h, h * 0.97, Math.sin(a) * q + Math.cos(a) * lean * h, lean, a, 0, 1, 3.4, 1), '#e2d4ac', { sway: 0.22 });
  }
  return b.build();
}
function grassTuft(rand) {
  const b = new Builder();
  for (let i = 0; i < 6; i++) { const a = rand() * TAU, h = 0.2 + rand() * 0.3; b.add(spike(0.035, h), T(Math.cos(a) * 0.15, h / 2, Math.sin(a) * 0.15, 0.3, a, 0), '#7fa456', { top: '#b4cc74', sway: (t) => t * 0.06 }); }
  return b.build();
}
function weed(rand) {
  const b = new Builder();
  for (let i = 0; i < 5; i++) { const a = rand() * TAU, h = 0.5 + rand() * 0.7; b.add(spike(0.05, h), T(Math.cos(a) * 0.12, h / 2, Math.sin(a) * 0.12, 0.2, a, 0), '#3f6a42', { top: '#7fa85c', sway: (t) => t * 0.25 }); }
  return b.build();
}
const lotusPad = () => new Builder().add(new THREE.CircleGeometry(0.46, 10, 0.25, TAU - 0.5).rotateX(-Math.PI / 2), T(0, 0.012, 0), '#5a9658', { jit: 0 }).build();
const lotusLeaf = () => new Builder().add(cyl(0.012, 0.012, 0.62, 4), T(0, 0.3, 0), '#5c8a4c').add(cone(0.5, 0.15, 11), T(0, 0.62, 0, Math.PI + 0.18, 0, 0), '#4f8d50', { top: '#86b868', sway: 0.07, jit: 0 }).build();
function lotusFlower() {
  const b = new Builder();
  b.add(cyl(0.012, 0.012, 0.8, 4), T(0, 0.4, 0), '#5c8a4c');
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + ring * 0.4, tilt = ring ? 0.35 : 0.85, q = ring ? 0.04 : 0.09;
    b.add(cone(0.075, 0.3, 4), T(Math.cos(a) * q, 0.9 + (ring ? 0.05 : 0), Math.sin(a) * q, tilt, -a + Math.PI / 2, 0, 1, 1, 0.45), '#ee9bb6', { top: '#fff0f3', sway: 0.07, jit: 0.03 });
  }
  b.add(ball(0.05, 6, 4), T(0, 0.83, 0), '#e8c84a', { sway: 0.07 });
  return b.build();
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createScenery(world, scene) {
  const rand = rng(world.seed + ':scenery');
  setBuildRandom(rand);
  const H = world.height, land = (o) => ({ x: o.x, y: H(o.x, o.z), z: o.z, ry: o.rot, s: o.s });
  scene.add(createTerrain(world));

  // --- the old town, in one merged mesh
  const b = new Builder(), glass = new Builder(), lamps = [];
  for (const h of world.houses) house(b, glass, lamps, h, T(h.x, Math.max(0.8, H(h.x, h.z) - 0.05), h.z, 0, h.rot, 0), rand);
  for (const br of world.bridges) (br.kind === 'arch' ? archBridge : slabBridge)(b, T(br.x, 0, br.z, 0, br.rot, 0), br.hw);
  // stone quays and the waterside lane
  const [u0, u1] = world.villageRange, col = new THREE.Color();
  const quad = (a, c, d, e, color, jit = 0.07) => {
    col.set(color).multiplyScalar(1 + (rand() - 0.5) * 2 * jit);
    const nx = (c[1] - a[1]) * (e[2] - a[2]) - (c[2] - a[2]) * (e[1] - a[1]), ny = (c[2] - a[2]) * (e[0] - a[0]) - (c[0] - a[0]) * (e[2] - a[2]), nz = (c[0] - a[0]) * (e[1] - a[1]) - (c[1] - a[1]) * (e[0] - a[0]), l = Math.hypot(nx, ny, nz) || 1;
    for (const v of [a, c, d, a, d, e]) { b.p.push(...v); b.n.push(nx / l, ny / l, nz / l); b.c.push(col.r, col.g, col.b); b.s.push(0); }
  };
  const stepU = 1.7 / world.loop(0.1).sp;
  for (const s of [1, -1]) for (let u = u0; u < u1; u += stepU) {
    const A = world.loop(u), B = world.loop(u + stepU), fade = (v) => 0.25 + 0.67 * smooth(u0, u0 + 0.01, v) * (1 - smooth(u1 - 0.01, u1, v));
    const pt = (L, off, y) => [L.x + L.nx * s * off, y, L.z + L.nz * s * off], ya = fade(u), yb = fade(u + stepU);
    const ma = Math.min(0.3, ya), mb = Math.min(0.3, yb);
    quad(pt(A, A.hw, -0.9), pt(B, B.hw, -0.9), pt(B, B.hw, mb), pt(A, A.hw, ma), MOSS, 0.09);
    quad(pt(A, A.hw, ma), pt(B, B.hw, mb), pt(B, B.hw, yb + 0.02), pt(A, A.hw, ya + 0.02), STONE, 0.09);
    quad(pt(A, A.hw - 0.06, ya + 0.02), pt(B, B.hw - 0.06, yb + 0.02), pt(B, B.hw + 3.1, yb + 0.02), pt(A, A.hw + 3.1, ya + 0.02), '#aaa69c', 0.06);
  }
  for (const st of world.steps) for (let k = 0; k < 5; k++) b.add(box(2.6, 0.24, 0.5), T(st.x, 0, st.z, 0, st.rot, 0).multiply(T(0, 0.86 - k * 0.22, -0.4 + k * 0.42)), STONE, { jit: 0.07 });
  // pavilion by the lotus pond
  {
    const P = world.pavilion, M = T(P.x, Math.max(0.45, H(P.x, P.z)), P.z, 0, P.rot, 0), add = (g, m, c, o) => b.add(g, M.clone().multiply(m), c, o);
    add(cyl(3.1, 3.3, 0.5, 6), T(0, 0, 0), STONE);
    for (let i = 0; i < 6; i++) add(cyl(0.11, 0.11, 2.7, 6), T(Math.cos((i / 6) * TAU) * 2.4, 1.6, Math.sin((i / 6) * TAU) * 2.4), '#8a3a2c');
    add(cyl(0.25, 3.5, 1.35, 6), T(0, 3.6, 0), TILE); add(cyl(3.5, 3.85, 0.14, 6), T(0, 2.95, 0), TILE); add(ball(0.22), T(0, 4.4, 0), '#8a3a2c');
  }
  // pagoda on the hill: a landmark you can steer by on a clear day
  {
    const y0 = H(0, 0) - 0.3;
    for (let i = 0; i < 7; i++) {
      const rr = 3.3 - i * 0.33;
      b.add(cyl(rr * 0.8, rr * 0.86, 2.5, 8), T(0, y0 + i * 3 + 1.25, 0), '#d8ccb6', { jit: 0.03 });
      b.add(cyl(rr * 0.7, rr * 1.6, 0.75, 8), T(0, y0 + i * 3 + 2.8, 0), TILE);
    }
    b.add(cone(0.4, 3.4, 6), T(0, y0 + 22.6, 0), '#6a5a3a');
  }
  const town = new THREE.Mesh(b.build(), matte({ side: THREE.DoubleSide }));
  town.castShadow = town.receiveShadow = true;
  const glassMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: '#2b2622' });
  const windows = new THREE.Mesh(glass.build(), glassMat);
  scene.add(town, windows);

  // lanterns: a small red body always, a soft halo after dark
  const lampB = new Builder();
  for (const p of lamps) lampB.add(ball(0.2, 8, 6), T(p.x, p.y, p.z, 0, 0, 0, 1, 1.25, 1), '#ffffff', { jit: 0 });
  const lampMat = new THREE.MeshBasicMaterial({ color: '#b3261c' });
  scene.add(new THREE.Mesh(lampB.build(), lampMat));
  const haloGeo = new THREE.BufferGeometry().setFromPoints(lamps);
  const haloMat = new THREE.PointsMaterial({ map: glowTexture(), color: '#ff9a4a', size: 3.2, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const halos = new THREE.Points(haloGeo, haloMat); halos.frustumCulled = false;
  scene.add(halos);

  // --- props: moored boats, people, the buffalo
  const pb = new Builder();
  world.boats.forEach((o, i) => boat(pb, T(o.x, 0, o.z, 0, o.rot, 0), i !== 4));
  person(pb, T(world.auntie.x, 0.15, world.auntie.z, 0, world.auntie.rot, 0, 0.92), '#6e7fa3', false, 0.5);
  person(pb, T(world.farmer.x, H(world.farmer.x, world.farmer.z), world.farmer.z, 0, world.farmer.rot, 0), '#8a9a8c', true, 0.25);
  buffalo(pb, T(world.buffalo.x, 0, world.buffalo.z, 0, world.buffalo.rot, 0));
  {   // the cormorant fisherman's skiff
    const F = world.fisher, M = T(F.x, 0, F.z, 0, F.rot, 0);
    boat(pb, M, false);
    person(pb, M.clone().multiply(T(0, 0.32, -1.5)), '#4c5c6c', true);
    pb.add(cyl(0.02, 0.02, 4.6, 4), M.clone().multiply(T(0.3, 1.1, -0.2, 1.2, 0.2, 0)), '#8a7a50');
    for (const z of [0.6, 1.3, 1.9]) {
      const C = M.clone().multiply(T(z > 1 ? -0.3 : 0.3, 0.42, z));
      pb.add(ball(0.11, 6, 5), C.clone().multiply(T(0, 0.13, 0, 0, 0, 0, 1, 1.5, 1.2)), '#1f2224');
      pb.add(cyl(0.03, 0.045, 0.24, 5), C.clone().multiply(T(0, 0.36, 0.05, 0.3, 0, 0)), '#1f2224');
      pb.add(cone(0.025, 0.14, 4), C.clone().multiply(T(0, 0.47, 0.14, 1.6, 0, 0)), '#d9a23a');
    }
  }
  const props = new THREE.Mesh(pb.build(), matte({ side: THREE.DoubleSide }));
  props.castShadow = true;
  scene.add(props);

  // --- plants
  const plant = matte({ sway: 1 }), flat = matte({ sway: 1, side: THREE.DoubleSide });
  const tint = () => 0.86 + rand() * 0.28;
  const sets = [
    [willow(rand), plant, world.willows, (o) => ({ ...land(o), tint: tint() })],
    [roundTree(rand, '#4c7c47', '#80b05c'), plant, world.trees.filter((_, i) => i % 3 === 0), (o) => ({ ...land(o), tint: tint() })],
    [roundTree(rand, '#5a8448', '#a1bd62'), plant, world.trees.filter((_, i) => i % 3 === 1), (o) => ({ ...land(o), tint: tint() })],
    [fir(rand), plant, world.trees.filter((_, i) => i % 3 === 2), (o) => ({ ...land(o), tint: tint() })],
    [peach(rand), plant, world.peaches, (o) => ({ ...land(o), tint: 0.95 + rand() * 0.1 })],
    [bambooStalk(rand), plant, world.bamboo, (o) => ({ ...land(o), rz: (rand() - 0.5) * 0.22, rx: (rand() - 0.5) * 0.22, tint: tint() }), false],
    [reedClump(rand), flat, world.reeds, (o) => ({ ...land(o), y: Math.max(H(o.x, o.z), -0.4), tint: tint() }), false],
    [grassTuft(rand), flat, world.grass, (o) => ({ ...land(o), tint: tint() }), false],
    [lotusPad(), flat, world.pads, (o) => ({ x: o.x, y: 0, z: o.z, ry: o.rot, s: o.s * 1.2, tint: tint() }), false],
    [lotusLeaf(), flat, world.leaves, (o) => ({ x: o.x, y: 0, z: o.z, ry: o.rot, s: o.s * 1.25, sy: o.s * (0.6 + rand() * 0.9), tint: tint() }), false],
    [lotusFlower(), flat, world.flowers, (o) => ({ x: o.x, y: 0, z: o.z, ry: o.rot, s: 0.9 + o.s * 0.3, tint: 0.95 + rand() * 0.1 }), false],
  ];
  const weeds = [];
  for (let i = 0; i < 1400; i++) {
    const u = rand(), L = world.loop(u), s = rand() < 0.5 ? 1 : -1, off = s * (L.hw - 0.4 - rand() * 2.2), x = L.x + L.nx * off, z = L.z + L.nz * off;
    const depth = -H(x, z);
    if (depth > 0.55) weeds.push({ x, z, rot: rand() * TAU, s: Math.min(0.6 + rand() * 0.9, depth / 1.35) });
  }
  for (const sn of world.snacks) for (let k = 0; k < 6; k++) { const x = sn.x + (rand() - 0.5) * 1.6, z = sn.z + (rand() - 0.5) * 1.6; weeds.push({ x, z, rot: rand() * TAU, s: Math.max(0.1, Math.min(0.7 + rand(), -H(x, z) / 1.35)) }); }
  sets.push([weed(rand), flat, weeds, (o) => land(o), false]);
  const small = [];       // too small or too flat to matter in the water's reflection
  sets.forEach(([geom, mat, list, place, shadow], i) => {
    if (!list.length) return;
    const mesh = instanced(geom, mat, list, place, shadow !== false && i !== 1 && i !== 2 && i !== 3);
    scene.add(mesh);
    if (i === 7 || i === 8 || i === 11) small.push(mesh);
  });

  const dark = new THREE.Color('#2b2622'), lit = new THREE.Color('#ffb45a'), red = new THREE.Color('#b3261c'), redLit = new THREE.Color('#ff5a2c');
  return {
    lamps, small,
    update(env) {
      const n = smooth(0.25, 0.9, env.night);
      glassMat.color.lerpColors(dark, lit, n);
      lampMat.color.lerpColors(red, redLit, n);
      haloMat.opacity = n * 0.85;
    },
  };
}
