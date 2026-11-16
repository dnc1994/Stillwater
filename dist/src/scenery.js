// scenery.js — puts the countryside together: the land itself, the town, boats and people, and everything that grows.
import * as THREE from 'three';
import { SIZE, N, rng, smooth, zoneWeight, zoneAt } from './world.js';
import { Builder, T, box, cyl, cone, ball, matte, instanced, setBuildRandom } from './build.js';
import { createTextures } from './tex.js';
import { setDuckTextures } from './duck.js';
import { townKit, buildTown } from './town.js';
import * as plants from './plants.js';

const TAU = Math.PI * 2;

function createTerrain(world, tex) {
  const g = new THREE.PlaneGeometry(2 * SIZE, 2 * SIZE, N - 1, N - 1);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), k = new THREE.Color();
  const FIELD = ['#8fb45c', '#93aa98', '#a8a44e', '#ab9d6c'];
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
  tex.ground.repeat.set(230, 230);
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, map: tex.ground }));
  mesh.receiveShadow = true;
  mesh.position.y = 0.02;
  // beyond the mapped square the land simply carries on, flat, into the mist
  const far = new THREE.Mesh(new THREE.RingGeometry(SIZE - 2, 2400, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#8fae62' }));
  far.position.y = 0.4;
  const group = new THREE.Group(); group.add(mesh, far);
  return group;
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
  const tex = createTextures(rng(world.seed + ':paint'));
  setDuckTextures(tex.feathers);
  const H = world.height, sdf = world.sdf, land = (o) => ({ x: o.x, y: H(o.x, o.z), z: o.z, ry: o.rot, s: o.s });
  scene.add(createTerrain(world, tex));
  const leaves = plants.leafMaterials(tex);

  // --- the old town: one mesh per material
  const K = townKit(plants.SOLID);
  buildTown(K, world, rand);
  const both = THREE.DoubleSide;
  const glassMat = new THREE.MeshBasicMaterial({ vertexColors: true, map: tex.lattice });
  const lampMat = new THREE.MeshBasicMaterial({ color: '#b3261c' });
  const parts = [
    [K.P, matte({ map: tex.plaster, side: both })], [K.R, matte({ map: tex.tiles, bumpMap: tex.tiles, bumpScale: 1.6, side: both })],
    [K.S, matte({ map: tex.stone, bumpMap: tex.stone, bumpScale: 1.1, side: both })], [K.W, matte({ map: tex.wood, side: both })],
    [K.X, matte({ side: both })], [K.C, matte({ side: both, sway: 1 })], [K.N, matte({ map: tex.signs, side: both, sway: 1 })],
    [K.V, leaves.material], [K.G, glassMat],
  ];
  for (const [b, mat] of parts) { if (b.empty) continue; const m = new THREE.Mesh(b.build(), mat); m.castShadow = b !== K.G && b !== K.V; m.receiveShadow = b !== K.G; m.frustumCulled = false; scene.add(m); }

  // lanterns: a red paper body always, and after dark a light that the lens lets bloom
  const lamps = K.lamps, lampB = new Builder();
  for (const p of lamps) lampB.add(ball(0.2, 10, 8), T(p.x, p.y, p.z, 0, 0, 0, 1, 1.25, 1), '#ffffff', { jit: 0 });
  scene.add(new THREE.Mesh(lampB.build(), lampMat));
  const haloMat = new THREE.PointsMaterial({ map: glowTexture(), color: '#ff9a4a', size: 3.4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const halos = new THREE.Points(new THREE.BufferGeometry().setFromPoints(lamps), haloMat); halos.frustumCulled = false;
  scene.add(halos);

  // chimney smoke at breakfast and supper
  const PUFFS = 12, puffs = K.smoke.flatMap((src) => Array.from({ length: PUFFS }, (_, i) => ({ src, age: i / PUFFS, ph: rand() * 9 })));
  const smokeGeo = new THREE.BufferGeometry(), smokePos = new Float32Array(puffs.length * 3), smokeCol = new Float32Array(puffs.length * 3);
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3)); smokeGeo.setAttribute('color', new THREE.BufferAttribute(smokeCol, 3));
  const smokeMat = new THREE.PointsMaterial({ map: haloMat.map, size: 2.4, vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false, fog: true });
  const smoke = new THREE.Points(smokeGeo, smokeMat); smoke.frustumCulled = false; scene.add(smoke);

  // --- props: moored boats, people, the buffalo
  const pb = new Builder();
  world.boats.forEach((o, i) => {
    boat(pb, T(o.x, 0, o.z, 0, o.rot, 0), i !== 4);
    pb.add(cyl(0.035, 0.045, 2.6, 5), T(o.x + Math.cos(o.rot) * 0.95, 0.4, o.z - Math.sin(o.rot) * 0.95, 0.06, 0, 0.05), '#6b5a44');     // the pole it is tied to
  });
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
      pb.add(ball(0.11, 8, 6), C.clone().multiply(T(0, 0.13, 0, 0, 0, 0, 1, 1.5, 1.2)), '#1f2224');
      pb.add(cyl(0.03, 0.045, 0.24, 6), C.clone().multiply(T(0, 0.36, 0.05, 0.3, 0, 0)), '#1f2224');
      pb.add(cone(0.025, 0.14, 5), C.clone().multiply(T(0, 0.47, 0.14, 1.6, 0, 0)), '#d9a23a');
    }
  }
  const props = new THREE.Mesh(pb.build(), matte({ side: both }));
  props.castShadow = true;
  scene.add(props);

  // --- plants
  const tint = () => 0.86 + rand() * 0.28, third = (k) => world.trees.filter((_, i) => i % 3 === k);
  // extra ground cover along every natural bank, and the crops in the fields
  const tufts = [...world.grass], blooms = [], rocks = [], rape = [], paddy = [];
  for (let i = 0; i < 7000; i++) {
    const u = 0.215 + rand() * 0.79, L = world.loop(u), s = rand() < 0.5 ? 1 : -1, off = s * (L.hw - 0.5 + rand() * rand() * 7), x = L.x + L.nx * off, z = L.z + L.nz * off, d = sdf(x, z), k = rand();
    if (d > 0.25 && d < 6) { if (k < 0.62) tufts.push({ x, z, rot: rand() * TAU, s: 0.7 + rand() * 0.9 }); else if (k < 0.86) blooms.push({ x, z, rot: rand() * TAU, s: 0.6 + rand() * 0.7, color: ['#ffe45c', '#ffffff', '#c9a8f0', '#ffb7c8'][Math.floor(rand() * 4)] }); }
    if (d > -0.5 && d < 0.7 && k > 0.86) rocks.push({ x, z, rot: rand() * TAU, s: 0.5 + rand() * 1.1 });
  }
  for (let x = -SIZE + 4; x < SIZE - 4; x += 1.3) for (let z = -SIZE + 4; z < SIZE - 4; z += 1.3) {
    const d = sdf(x, z);
    if (d < 4 || d >= 36) continue;
    const f = world.fieldAt(x, z);
    if (f.w < 0.95 || f.ridge) continue;
    const px = x + (rand() - 0.5) * 0.7, pz = z + (rand() - 0.5) * 0.7;
    if (f.kind === 2) rape.push({ x: px, z: pz, rot: rand() * TAU, s: 0.8 + rand() * 0.45 });
    else if (f.kind === 0 && d < 22) paddy.push({ x: px, z: pz, rot: rand() * TAU, s: 0.8 + rand() * 0.5 });
  }
  const weeds = [];
  for (let i = 0; i < 1600; i++) {
    const u = rand(), L = world.loop(u), s = rand() < 0.5 ? 1 : -1, off = s * (L.hw - 0.4 - rand() * 2.4), x = L.x + L.nx * off, z = L.z + L.nz * off, depth = -H(x, z);
    if (depth > 0.55) weeds.push({ x, z, rot: rand() * TAU, s: Math.min(0.6 + rand() * 0.9, depth / 1.15) });
  }
  for (const sn of world.snacks) for (let k = 0; k < 6; k++) { const x = sn.x + (rand() - 0.5) * 1.6, z = sn.z + (rand() - 0.5) * 1.6; weeds.push({ x, z, rot: rand() * TAU, s: Math.max(0.1, Math.min(0.7 + rand(), -H(x, z) / 1.15)) }); }
  // things afloat: peach petals under the blossom, duckweed in the still corners
  const petals = [], duckweed = [];
  for (let i = 0; i < 2600; i++) { const u = 0.225 + rand() * 0.135, L = world.loop(u), off = (rand() - 0.5) * 2 * L.hw, x = L.x + L.nx * off, z = L.z + L.nz * off; if (sdf(x, z) < -0.15) petals.push({ x, z, rot: rand() * TAU, s: 0.7 + rand() * 0.8 }); }
  for (let i = 0; i < 900; i++) {
    const u = 0.36 + rand() * 0.64, L = world.loop(u), s = rand() < 0.5 ? 1 : -1, off = s * (L.hw - 0.3 - rand() * 1.4), cx = L.x + L.nx * off, cz = L.z + L.nz * off;
    if (sdf(cx, cz) > -0.2 || world.noise(cx * 0.05, cz * 0.05) < 0.5) continue;
    for (let k = 0; k < 9; k++) { const x = cx + (rand() - 0.5) * 1.5, z = cz + (rand() - 0.5) * 1.5; if (sdf(x, z) < -0.12) duckweed.push({ x, z, rot: rand() * TAU, s: 0.6 + rand() * 0.9 }); }
  }
  const afloat = (o) => ({ x: o.x, y: 0, z: o.z, ry: o.rot, s: o.s }), flowersOf = (k) => world.flowers.filter((_, i) => i % 5 === (k === 0 ? 9 : k === 1 ? 1 : 3) || (k === 0 && i % 5 !== 1 && i % 5 !== 3));
  // [geometry, list, placement, casts shadows, left out of the reflection]
  const sets = [
    [plants.willow(rand), world.willows, (o) => ({ ...land(o), tint: tint() }), true],
    [plants.tree(rand, '#4c7c47', '#86b45e'), third(0), (o) => ({ ...land(o), tint: tint() }), true],
    [plants.tree(rand, '#5c8648', '#a6c266', 0.8), third(1), (o) => ({ ...land(o), tint: tint() }), true],
    [plants.tree(rand, '#527f52', '#8dbb70', 2.2), third(2), (o) => ({ ...land(o), s: o.s * 0.9, tint: tint() }), true],
    [plants.peach(rand), world.peaches, (o) => ({ ...land(o), tint: 0.96 + rand() * 0.08 }), true],
    [plants.bamboo(rand), world.bamboo, (o) => ({ ...land(o), rz: (rand() - 0.5) * 0.22, rx: (rand() - 0.5) * 0.22, tint: tint() })],
    [plants.reeds(), world.reeds, (o) => ({ ...land(o), y: Math.max(H(o.x, o.z), -0.4), tint: tint() })],
    [plants.grass(), tufts, (o) => ({ ...land(o), tint: tint() }), false, true],
    [plants.wildflower(), blooms, (o) => ({ ...land(o), color: o.color }), false, true],
    [plants.rock(rand), rocks, (o) => ({ ...land(o), y: H(o.x, o.z) - 0.05, sy: o.s * (0.6 + rand() * 0.6), tint: tint() }), false],
    [plants.rapeseed(), rape, (o) => ({ ...land(o), tint: 0.92 + rand() * 0.16 })],
    [plants.rice(), paddy, land, false, true],
    [plants.lotusPad(), world.pads, (o) => ({ ...afloat(o), s: o.s * 1.2, tint: tint() }), false, true],
    [plants.lotusLeaf(), world.leaves, (o) => ({ ...afloat(o), s: o.s * 1.25, sy: o.s * (0.6 + rand() * 0.9), tint: tint() })],
    [plants.lotusFlower(0), flowersOf(0), (o) => ({ ...afloat(o), s: 0.95 + o.s * 0.3, tint: 0.96 + rand() * 0.08 })],
    [plants.lotusFlower(1), flowersOf(1), (o) => ({ ...afloat(o), s: 0.9 + o.s * 0.3 })],
    [plants.lotusFlower(2), flowersOf(2), (o) => ({ ...afloat(o), s: 0.9 + o.s * 0.3 })],
    [plants.waterweed(), weeds, land, false, true],
    [plants.petal(), petals, afloat, false, true],
    [plants.duckweed(), duckweed, (o) => ({ ...afloat(o), tint: tint() }), false, true],
  ];
  const small = [halos, smoke];       // too small or too flat to matter in the water's reflection
  for (const [geom, list, place, shadow, skip] of sets) {
    if (!list.length) continue;
    const mesh = instanced(geom, leaves.material, list, place, !!shadow);
    if (shadow) mesh.customDepthMaterial = leaves.depth;
    mesh.receiveShadow = false;
    scene.add(mesh);
    if (skip) small.push(mesh);
  }

  const paper = new THREE.Color('#5d574c'), lit = new THREE.Color(2.6, 1.5, 0.62), red = new THREE.Color('#b3261c'), redLit = new THREE.Color(3.4, 0.95, 0.4), grey = new THREE.Color(), white = new THREE.Color(1, 1, 1);
  return {
    lamps, small,
    update(env, dt = 0) {
      const n = smooth(0.25, 0.9, env.night);
      glassMat.color.lerpColors(paper, lit, n);
      lampMat.color.lerpColors(red, redLit, n);
      haloMat.opacity = n * 0.6;
      // smoke rises, leans with the wind and thins out; thickest around breakfast and supper
      const h = env.hour, meal = Math.max(smooth(5.2, 6.2, h) * (1 - smooth(8, 9.5, h)), smooth(16.3, 17.2, h) * (1 - smooth(19.3, 20.3, h)));
      smokeMat.opacity = 0.06 + meal * 0.2;
      grey.copy(env.fogColor).lerp(env.hemi.color, 0.5).lerp(white, 0.45).multiplyScalar(0.75 + 0.5 * (1 - env.night));
      puffs.forEach((p, i) => {
        p.age = (p.age + dt * 0.11) % 1;
        const a = p.age, k = Math.sin(a * Math.PI) * (0.5 + a);
        smokePos.set([p.src.x + a * a * 4.5 + Math.sin(p.ph + a * 5) * 0.3 * a, p.src.y + a * 5.5, p.src.z + a * 1.6 + Math.cos(p.ph + a * 4) * 0.3 * a], i * 3);
        smokeCol.set([grey.r * k, grey.g * k, grey.b * k], i * 3);
      });
      smokeGeo.attributes.position.needsUpdate = smokeGeo.attributes.color.needsUpdate = true;
    },
  };
}
