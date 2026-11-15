// life.js — everything that moves on its own: your two companions, the lost ducklings,
// egrets, frogs, fish, the boatman, rain, petals and fireflies.
import * as THREE from 'three';
import { makeDuck, makeEgret, makeFrog, fishGeometry, fishMaterial, poseWings } from './duck.js';
import { Builder, T, ball, cyl, box, matte } from './build.js';
import { boat, person } from './scenery.js';
import { zoneWeight, zoneAt } from './world.js';

const R = Math.random, TAU = Math.PI * 2;
const turnTo = (a, b, max) => { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + Math.max(-max, Math.min(max, d)); };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function glow() {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export function createLife({ world, scene, water, env, audio, hear, discover, onDuckling, onBread, curiosFound }) {
  const sdf = world.sdf, stats = { flushed: 0 };
  // Move a swimmer towards a target, sliding along the bank instead of climbing it.
  const swim = (d, tx, tz, speed, dt, margin = 0.3) => {
    const dx = tx - d.x, dz = tz - d.z, l = Math.hypot(dx, dz);
    if (l < 1e-3) return 0;
    const st = Math.min(l, speed * dt);
    let nx = d.x + (dx / l) * st, nz = d.z + (dz / l) * st;
    const dd = sdf(nx, nz);
    if (dd > -margin) {
      const gx = sdf(nx + 0.3, nz) - sdf(nx - 0.3, nz), gz = sdf(nx, nz + 0.3) - sdf(nx, nz - 0.3), gl = Math.hypot(gx, gz) || 1;
      nx -= (gx / gl) * (dd + margin); nz -= (gz / gl) * (dd + margin);
    }
    if (st > 1e-4) d.heading = turnTo(d.heading, Math.atan2(nx - d.x, nz - d.z), dt * 6);
    d.x = nx; d.z = nz;
    return st / dt;
  };
  const float = (d, t, amp = 0.012) => {
    d.obj.position.set(d.x, Math.sin(t * 1.7 + d.ph) * amp - (d.dip ?? 0), d.z);
    d.obj.rotation.y = d.heading;
  };

  // ---- companions ---------------------------------------------------------------------------
  const sp = world.spawn, sh = Math.sin(sp.heading), ch = Math.cos(sp.heading);
  const flock = [['hen', -1.4, -1.9], ['white', 1.6, -3.0]].map(([kind, sx, sz]) => {
    const obj = makeDuck(kind); scene.add(obj);
    return { obj, sx, sz, x: sp.x + sx * ch + sz * sh, z: sp.z - sx * sh + sz * ch, heading: sp.heading, ph: R() * 6, reply: -1, dab: 0, idle: 3 + R() * 6, wake: 0, nod: 0, alt: 0, fl: R() * 6 };
  });
  const trail = [{ x: sp.x, z: sp.z }];
  const behind = (need) => {
    let acc = 0;
    for (let i = trail.length - 1; i > 0; i--) { acc += dist(trail[i], trail[i - 1]); if (acc >= need) return trail[i - 1]; }
    return trail[0];
  };

  // ---- ducklings ----------------------------------------------------------------------------
  const ducklings = world.ducklings.map((h) => {
    const obj = makeDuck('duckling'); scene.add(obj);
    return { obj, home: h, x: h.x, z: h.z, heading: R() * TAU, ph: R() * 6, found: false, order: -1, peep: 1 + R() * 3, join: -1, wake: 0, hop: null, lift: 0 };
  });
  let foundCount = 0;
  const adopt = (d) => {
    if (d.found) return;
    d.found = true; d.order = foundCount++;
    audio.peep({ ...hear(d.x, d.z, 30), n: 4 });
    water.ring(d.x, d.z, 0.5);
    onDuckling(foundCount, ducklings.length);
  };

  // ---- egrets ------------------------------------------------------------------------------
  const perches = world.egrets.map((e) => ({ x: e.x, z: e.z, taken: true }));
  const egrets = world.egrets.map((e, i) => {
    const obj = makeEgret(); scene.add(obj);
    obj.position.set(e.x, world.height(e.x, e.z), e.z); obj.rotation.y = e.rot;
    return { obj, perch: i, fly: null, ph: R() * 6 };
  });
  const flush = (e) => {
    const from = perches[e.perch], options = perches.filter((p, i) => i !== e.perch && dist(p, from) > 25);
    const to = options[Math.floor(R() * options.length)] ?? from;
    e.fly = { t: 0, dur: 5 + dist(from, to) / 14, from: { x: from.x, z: from.z }, to, wob: (R() - 0.5) * 30 };
    e.perch = perches.indexOf(to);
    e.obj.userData.wings.forEach((w) => (w.visible = true));
    audio.flap(hear(from.x, from.z, 40));
    water.ring(from.x, from.z, 0.6);
    stats.flushed++;
    discover('egret');
  };

  // ---- frogs and snails --------------------------------------------------------------------
  const frogs = world.frogs.map((f) => { const obj = makeFrog(); obj.position.set(f.x, 0.02, f.z); obj.rotation.y = R() * TAU; scene.add(obj); return { obj, x: f.x, z: f.z, away: 0 }; });
  const snailGeo = new Builder().add(ball(0.045, 7, 5), T(0, 0.04, 0, 0, 0, 0, 1, 0.9, 1.25), '#6b4a2c', { top: '#c9a468', jit: 0 }).build();
  const snails = [], sm = new THREE.Matrix4(), sq = new THREE.Quaternion(), sv = new THREE.Vector3(), ss = new THREE.Vector3();
  for (const s of world.snacks) for (let k = 0; k < 5; k++) {
    const a = R() * TAU, q = R() * 1.4, x = s.x + Math.cos(a) * q, z = s.z + Math.sin(a) * q;
    if (sdf(x, z) < -0.5) snails.push({ x, z, back: 0 });
  }
  const snailMesh = new THREE.InstancedMesh(snailGeo, matte(), snails.length); snailMesh.frustumCulled = false; scene.add(snailMesh);
  const placeSnail = (i) => { const n = snails[i]; snailMesh.setMatrixAt(i, sm.compose(sv.set(n.x, world.height(n.x, n.z), n.z), sq.identity(), ss.setScalar(n.back > 0 ? 0 : 1.5))); snailMesh.instanceMatrix.needsUpdate = true; };
  snails.forEach((_, i) => placeSnail(i));
  const bubbles = world.snacks.map((s) => ({ x: s.x, z: s.z, t: R() * 3 }));

  // ---- things lost on the riverbed, for a diving duck to find ------------------------------------
  const afloat = (x, z, tx, tz, margin = 1.4) => { const l = Math.hypot(tx - x, tz - z) || 1; for (let k = 0; k < 90 && sdf(x, z) > -margin; k++) { x += ((tx - x) / l) * 0.4; z += ((tz - z) / l) * 0.4; } return { x, z }; };
  const mid = (o) => { const L = world.loop(world.uAt(o.x, o.z)); return [L.x, L.z]; };
  const B = world.bridges, F = world.fisher;
  const curioSpots = {
    coin: B[0], hairpin: B[1], shard: B[2], marble: B[3], flute: world.loop(0.6),
    thimble: afloat(world.auntie.x, world.auntie.z, ...mid(world.auntie), 1.7),
    jade: afloat(world.pavilion.x, world.pavilion.z, world.pond.x, world.pond.z, 1.5),
    bell: afloat(F.x + Math.cos(F.rot) * 2.4, F.z - Math.sin(F.rot) * 2.4, world.lake.x, world.lake.z, 1.2),
  };
  const curioShape = {
    coin: (b) => b.add(cyl(0.06, 0.06, 0.012, 10), T(0, 0.01, 0), '#dcb44c', { jit: 0 }),
    hairpin: (b) => b.add(cyl(0.008, 0.008, 0.22, 4), T(0, 0.012, 0, 0, 0, 1.57), '#dfe3e8', { jit: 0 }).add(ball(0.02, 6, 4), T(0.11, 0.015, 0), '#e06a5a', { jit: 0 }),
    shard: (b) => b.add(box(0.11, 0.012, 0.07), T(0, 0.01, 0, 0, 0.4, 0.1), '#eef2f8', { jit: 0 }).add(box(0.05, 0.014, 0.03), T(0.01, 0.012, 0, 0, 0.4, 0.1), '#3f6fb8', { jit: 0 }),
    thimble: (b) => b.add(cyl(0.02, 0.03, 0.045, 8), T(0, 0.025, 0), '#cfa85c', { jit: 0 }),
    jade: (b) => b.add(new THREE.TorusGeometry(0.05, 0.017, 6, 12), T(0, 0.02, 0, 1.57, 0, 0), '#86d0a6', { jit: 0 }),
    flute: (b) => b.add(cyl(0.014, 0.014, 0.36, 6), T(0, 0.016, 0, 0, 0.5, 1.57), '#c2aa6e', { jit: 0 }),
    bell: (b) => b.add(ball(0.05, 8, 6), T(0, 0.05, 0), '#bd8e3e', { jit: 0 }).add(cyl(0.012, 0.012, 0.03, 5), T(0, 0.105, 0), '#8a682c', { jit: 0 }),
    marble: (b) => b.add(ball(0.036, 8, 6), T(0, 0.036, 0), '#74baea', { jit: 0 }),
  };
  const curios = Object.entries(curioSpots).map(([id, q]) => {
    const b = new Builder(); curioShape[id](b);
    const obj = new THREE.Mesh(b.build(), matte()); obj.scale.setScalar(1.7); obj.position.set(q.x, world.height(q.x, q.z) + 0.02, q.z); obj.rotation.y = R() * 6;
    const got = curiosFound.has(id); obj.visible = !got; scene.add(obj);
    return { id, x: q.x, z: q.z, y: obj.position.y, got, obj, ph: R() * 6 };
  });

  // ---- people who feed ducks ------------------------------------------------------------------
  const kidTop = B[1].hw - 0.35 + 1.05, P = world.pavilion, folk = new Builder();
  person(folk, T(B[1].x, kidTop, B[1].z, 0, B[1].rot + 1.57, 0, 0.68), '#c8553a', false);
  person(folk, T(P.x, Math.max(0.45, world.height(P.x, P.z)) + 0.25, P.z, 0, P.rot, 0, 0.95), '#73849a', false);
  const folkMesh = new THREE.Mesh(folk.build(), matte({ side: THREE.DoubleSide })); folkMesh.castShadow = true; scene.add(folkMesh);
  const kidSpot = world.loop(B[1].u + 7 / world.loop(B[1].u).sp);
  const feeders = [
    { ...world.auntie, at: afloat(world.auntie.x, world.auntie.z, ...mid(world.auntie), 2) },
    { x: B[1].x, z: B[1].z, at: { x: kidSpot.x, z: kidSpot.z } },
    { x: P.x, z: P.z, at: afloat(P.x, P.z, world.pond.x, world.pond.z, 2.5) },
    { ...world.farmer, at: afloat(world.farmer.x, world.farmer.z, ...mid(world.farmer), 2) },
    { x: F.x, z: F.z, at: afloat(F.x - Math.cos(F.rot) * 2.6, F.z + Math.sin(F.rot) * 2.6, world.lake.x, world.lake.z, 1.5) },
  ].map((f) => ({ ...f, cool: 6 + R() * 10 }));
  const CRUMBS = 12, crumbs = Array.from({ length: CRUMBS }, () => ({ x: 0, z: 0, life: 0, delay: 0, toss: null }));
  const crumbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 7, 5), new THREE.MeshLambertMaterial({ color: "#f3e2b8" }), CRUMBS); crumbMesh.frustumCulled = false; scene.add(crumbMesh);
  let toss = null;
  const throwBread = (f) => {
    toss = { n: 0, mine: 0, left: 0 };
    for (const c of crumbs) {
      if (toss.n >= 5) break;
      const x = f.at.x + (R() - 0.5) * 2.6, z = f.at.z + (R() - 0.5) * 2.6;
      if (sdf(x, z) > -0.6) continue;
      Object.assign(c, { x, z, life: 26, delay: 0.5 + toss.n * 0.28, toss }); toss.n++; toss.left++;
    }
    f.cool = 38 + R() * 30;
    if (toss.n) discover('bread'); else toss = null;
  };
  const gone = (c, mine) => { c.life = 0; const t = c.toss; if (mine) t.mine++; if (--t.left === 0) { onBread(t.mine, t.n); toss = null; } };
  const nearestCrumb = (o, range) => { let best = null, bd = range; for (const c of crumbs) if (c.life > 0 && c.delay <= 0) { const q = dist(c, o); if (q < bd) { bd = q; best = c; } } return best; };

  // ---- fish --------------------------------------------------------------------------------
  const FISH = 26, fish = new THREE.InstancedMesh(fishGeometry(), fishMaterial(), FISH), fm = new THREE.Matrix4(), fq = new THREE.Quaternion(), fe = new THREE.Euler(), fv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  fish.frustumCulled = false; scene.add(fish);
  const shoal = Array.from({ length: FISH }, (_, i) => ({ x: sp.x + (R() - 0.5) * 10, z: sp.z + (R() - 0.5) * 10, y: -0.3 - (i % 5) * 0.13, heading: R() * TAU, speed: 0.3 + R() * 0.3, burst: 0, s: 0.7 + R() * 0.8 }));
  const leaper = new THREE.Mesh(fishGeometry(), fishMaterial()); leaper.visible = false; leaper.scale.setScalar(1.5); scene.add(leaper);
  let leap = null, nextLeap = 14;

  // ---- the boatman -------------------------------------------------------------------------
  const bb = new Builder();
  boat(bb, T(), true); person(bb, T(0, 0.32, -2.1), '#3f5068', true, 0.12);
  bb.add(cyl(0.025, 0.025, 3.6, 4), T(0.25, 0.9, -2.9, -0.9, 0.15, 0), '#7a6a4a');
  const ferry = { obj: new THREE.Mesh(bb.build(), matte({ side: THREE.DoubleSide })), u: 0.33, x: 0, z: 0, heading: 0, wake: 0 };
  ferry.obj.castShadow = true; scene.add(ferry.obj);

  const obstacles = [];
  const hull = (x, z, rot, list) => { for (const k of [-1.9, 0, 1.9]) list.push({ x: x + Math.sin(rot) * k, z: z + Math.cos(rot) * k, r: 0.8 }); };
  for (const o of world.boats) hull(o.x, o.z, o.rot, obstacles);
  hull(world.fisher.x, world.fisher.z, world.fisher.rot, obstacles);
  obstacles.push({ x: world.buffalo.x, z: world.buffalo.z, r: 1.1 });
  const ferryHull = []; hull(0, 0, 0, ferryHull); obstacles.push(...ferryHull);

  // ---- particles ---------------------------------------------------------------------------
  const tex = glow();
  const RAIN = 520, rainPos = new Float32Array(RAIN * 6), drops = Array.from({ length: RAIN }, () => ({ x: (R() - 0.5) * 34, y: R() * 13, z: (R() - 0.5) * 34 }));
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#e8eef0', transparent: true, opacity: 0, depthWrite: false }));
  rain.frustumCulled = false; scene.add(rain);

  const points = (n, opts) => {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3).fill(-999), col = new Float32Array(n * 3).fill(1);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, ...opts }));
    m.frustumCulled = false; scene.add(m);
    return { m, pos, col, g };
  };
  const FLY = 64, flies = points(FLY, { size: 0.3, color: '#d9ff7c', blending: THREE.AdditiveBlending, opacity: 0 });
  const flyState = Array.from({ length: FLY }, () => ({ x: 0, y: -99, z: 0, ph: R() * 40, ok: false }));
  const PETAL = 60, petals = points(PETAL, { size: 0.1, color: '#f8c6d3', opacity: 0 });
  const petalState = Array.from({ length: PETAL }, () => ({ x: (R() - 0.5) * 20, y: R() * 5, z: (R() - 0.5) * 20, ph: R() * 9 }));
  const glints = points(16, { size: 0.42, color: '#ffe9a8', blending: THREE.AdditiveBlending, opacity: 0.95 });
  const SPRAY = 96, spray = points(SPRAY, { size: 0.085, color: '#ffffff', opacity: 0.8 });
  const sprayState = Array.from({ length: SPRAY }, () => ({ life: 0, x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0 }));
  let sprayNext = 0, time = 0, placeTimer = 0, rainRing = 0;

  const splash = (x, z, n = 10, power = 1) => {
    for (let i = 0; i < n; i++) {
      const s = sprayState[sprayNext = (sprayNext + 1) % SPRAY], a = R() * TAU, v = (0.5 + R()) * power;
      Object.assign(s, { life: 0.5 + R() * 0.3, x, y: 0.03, z, vx: Math.cos(a) * v, vy: 1.4 + R() * 1.6 * power, vz: Math.sin(a) * v });
    }
    water.ring(x, z, 0.6 + power * 0.5);
  };

  // What this stretch of water is, for the journal.
  const places = (p) => {
    const u = world.uAt(p.x, p.z), zone = zoneAt(u), near = (o, r) => dist(o, p) < r, onLoop = Math.abs(sdf(p.x, p.z)) < 12 && dist(world.loop(u), p) < 14;
    if (onLoop && zone === 'village' && u > 0.02) discover(env.night > 0.8 ? 'lantern' : 'town');
    if (world.bridges.some((b) => b.kind === 'arch' && near(b, 2.2))) discover('bridge');
    if (near(world.auntie, 8)) discover('wash');
    if (near(ferry, 11)) discover('boat');
    if (onLoop && zone === 'willow' && u > 0.25) discover('willow');
    if (near(world.creek[22], 14)) discover('creek');
    if (near(world.pond, 26)) discover('lotus');
    if (near(world.pavilion, 15)) discover('pavilion');
    if (onLoop && u > 0.55 && u < 0.64) discover('bamboo');
    if (near(world.lake, 45)) discover('marsh');
    if (near(world.fisher, 12)) discover('cormorant');
    if (onLoop && u > 0.87 && u < 0.97) discover('paddy');
    if (near(world.buffalo, 8)) discover('buffalo');
    if (env.rain > 0.7) discover('rain');
    if (env.night > 0.9 && env.rain < 0.2 && flyState.some((f) => f.ok)) discover('firefly');
  };

  return {
    obstacles, ducklings, flock, splash, stats, curios,
    get found() { return foundCount; },
    // The nearest duckling still waiting to be found (used to turn your head towards it).
    lostNear(p, range) {
      let best = null, bd = range;
      for (const d of ducklings) if (!d.found) { const q = dist(d, p); if (q < bd) { bd = q; best = d; } }
      return best;
    },
    quacked(p) {
      flock.forEach((f, i) => { if (dist(f, p) < 45) f.reply = 0.45 + i * 0.35 + R() * 0.3; });
      for (const d of ducklings) if (!d.found && dist(d, p) < 17) d.join = 0.5 + R() * 0.4;
      for (const d of ducklings) if (d.found) d.peep = Math.min(d.peep, 0.5 + R() * 0.8);
      for (const e of egrets) if (!e.fly && dist(perches[e.perch], p) < 11) flush(e);
      for (const f of feeders) if (dist(f, p) < 16 && f.cool < 30) f.cool = Math.min(f.cool, 0.8);     // quacking at people works
    },
    dive(p) {         // as your head goes under, the shoal happens to be right there
      shoal.forEach((f, i) => {
        if (i % 2) return;
        const a = p.heading + (R() - 0.5) * 1.3, q = 1.4 + R() * 3.2, x = p.x + Math.sin(a) * q, z = p.z + Math.cos(a) * q;
        if (sdf(x, z) < -0.9) { f.x = x; f.z = z; f.heading = a + Math.PI / 2 + (R() - 0.5); }
      });
    },
    // Called while your head is under water: what did the bill close on?
    peck(p, lunging) {
      const fx = p.x + Math.sin(p.heading) * 0.3, fz = p.z + Math.cos(p.heading) * 0.3, got = { snails: 0, fish: 0, curio: null };
      snails.forEach((n, i) => { if (!n.back && Math.hypot(n.x - fx, n.z - fz) < 0.7) { n.back = 150; placeSnail(i); got.snails++; } });
      if (lunging) for (const f of shoal) if (Math.hypot(f.x - fx, f.z - fz) < 0.5) { got.fish++; const a = R() * TAU; f.x = p.x + Math.cos(a) * 12.5; f.z = p.z + Math.sin(a) * 12.5; }
      for (const cu of curios) if (!cu.got && Math.hypot(cu.x - fx, cu.z - fz) < 0.8) { cu.got = true; cu.obj.visible = false; got.curio = cu.id; }
      return got;
    },
    // You have just come down on the water: start the following line afresh from here.
    landed(p) { trail.length = 0; trail.push({ x: p.x - Math.sin(p.heading) * 3, z: p.z - Math.cos(p.heading) * 3 }, { x: p.x, z: p.z }); },
    update(dt, p) {
      time += dt;
      const last = trail[trail.length - 1];
      if (p.alt === 0 && dist(last, p) > 0.22) { trail.push({ x: p.x, z: p.z }); if (trail.length > 500) trail.splice(0, 200); }

      // companions keep loose station behind you, answer when you call, and feed when you rest
      const s = Math.sin(p.heading), c = Math.cos(p.heading), airborne = p.alt > 0.25;
      flock.forEach((f, i) => {
        const wide = airborne ? 1.7 : 1;
        let tx = p.x + f.sx * wide * c + f.sz * wide * s, tz = p.z - f.sx * wide * s + f.sz * wide * c, v = 0;
        if (airborne || f.alt > 0) {
          // on the wing: hold a loose V behind you, and come down only over open water beside you
          if (!airborne) { tx = p.x - s * (1.4 + i * 1.2); tz = p.z - c * (1.4 + i * 1.2); }
          const dx = tx - f.x, dz = tz - f.z, q = Math.hypot(dx, dz), st = Math.min(q, (airborne ? Math.max(9, p.speed + 3) : 7) * dt);
          if (q > 0.05) { f.x += (dx / q) * st; f.z += (dz / q) * st; }
          f.heading = turnTo(f.heading, q > 1.5 ? Math.atan2(dx, dz) : p.heading, dt * 5);
          const want = airborne ? Math.max(0.5, p.alt + (i ? 0.35 : -0.25)) : sdf(f.x, f.z) < -0.5 && q < 2.5 ? 0 : Math.max(1.2, world.height(f.x, f.z) + 1);
          f.alt = Math.max(0, f.alt + Math.max(-2.6 * dt, Math.min(3.4 * dt, want - f.alt)));
          if (f.alt === 0) { const h = hear(f.x, f.z, 30); splash(f.x, f.z, 7, 0.8); audio.splash(h.vol * 0.6, h.pan); }
          f.fl += dt * 13;
          float(f, time); f.obj.position.y += f.alt; f.obj.rotation.x = 0;
          poseWings(f.obj, f.alt > 0, f.fl, true);
          return;
        }
        const crumb = nearestCrumb(f, 26);      // your friends are not above stealing your bread
        if (crumb) { tx = crumb.x; tz = crumb.z; if (dist(crumb, f) < 0.34) gone(crumb, false); }
        const q = Math.hypot(tx - f.x, tz - f.z);
        if (crumb) { f.dab = 0; v = swim(f, tx, tz, 2.25, dt); }
        else if (f.dab > 0) f.dab -= dt;
        else if (q > 0.9) v = swim(f, tx, tz, q > 9 ? 3.6 : Math.min(2.2, 0.5 + q * 0.8), dt);
        else { f.heading = turnTo(f.heading, p.heading, dt * 0.8); if ((f.idle -= dt) < 0) { f.idle = 7 + R() * 12; if (p.speed < 0.3) { f.dab = 2.2; water.ring(f.x, f.z, 0.5); } } }
        const k = f.dab > 0 ? Math.sin(Math.min(1, (2.2 - f.dab) / 0.4) * Math.min(1, f.dab / 0.4) * Math.PI / 2) : 0;
        float(f, time); f.obj.rotation.x = k * 1.25; f.obj.position.y -= k * 0.05;
        if ((f.wake += v * dt) > 1.2) { f.wake = 0; water.ring(f.x, f.z, 0.3); }
        if (f.reply > 0 && (f.reply -= dt) <= 0) { audio.quack({ ...hear(f.x, f.z, 45), pitch: f.sx < 0 ? 0.92 : 1.12, n: 1 + Math.floor(R() * 3) }); f.nod = 0.5; }
        f.nod = Math.max(0, f.nod - dt);
        f.obj.userData.head.rotation.x = -Math.sin(f.nod * TAU) * 0.35 + Math.sin(time * 2 + f.ph) * 0.03;
      });

      for (const d of ducklings) {
        if (d.join > 0 && (d.join -= dt) <= 0) adopt(d);
        if (!d.found) {
          if (dist(d, p) < 3) adopt(d);
          d.heading += dt * 0.5; d.x = d.home.x + Math.sin(time * 0.4 + d.ph) * 0.3; d.z = d.home.z + Math.cos(time * 0.33 + d.ph) * 0.3;
          if ((d.peep -= dt) < 0) { d.peep = 2 + R() * 2.6; const h = hear(d.x, d.z, 46); if (h.vol > 0.01) { audio.peep({ ...h, n: 2 + Math.floor(R() * 2) }); water.ring(d.x, d.z, 0.22); } }
        } else if (d.hop) {
          const h = d.hop; h.t += dt;
          if (h.t > 0) {
            const k = Math.min(1, h.t / h.dur);
            d.x = h.from.x + (h.to.x - h.from.x) * k; d.z = h.from.z + (h.to.z - h.from.z) * k; d.lift = Math.sin(k * Math.PI) * h.h;
            d.heading = Math.atan2(h.to.x - h.from.x, h.to.z - h.from.z);
            if (k >= 1) { d.hop = null; d.lift = 0; splash(d.x, d.z, 3, 0.45); audio.plop({ ...hear(d.x, d.z, 25), vol: 0.6 }); audio.peep({ ...hear(d.x, d.z, 25), n: 2 }); }
          }
        } else if (airborne) {     // left behind for a moment, and saying so
          if ((d.peep -= dt * 3) < 0) { d.peep = 2 + R() * 3; audio.peep({ ...hear(d.x, d.z, 40), n: 3 }); }
        } else if (dist(d, p) > 15) {     // you landed somewhere else: they come pattering and flapping after you, one by one
          const back = 1 + d.order * 0.55, q = dist(d, p);
          d.hop = { t: -0.4 - d.order * 0.3, dur: Math.min(2.2, 1.1 + q / 45), h: Math.min(6, 1.6 + q * 0.035), from: { x: d.x, z: d.z }, to: { x: p.x - s * back, z: p.z - c * back } };
        } else {
          const t = behind(0.8 + d.order * 0.62), q = dist(t, d);
          const v = q > 0.1 ? swim(d, t.x + Math.sin(d.ph + time) * 0.12, t.z + Math.cos(d.ph + time) * 0.12, Math.min(3.2, q * 2.4), dt, 0.15) : 0;
          if ((d.wake += v * dt) > 0.9) { d.wake = 0; water.ring(d.x, d.z, 0.16); }
          if ((d.peep -= dt) < 0) { d.peep = 6 + R() * 12; audio.peep({ ...hear(d.x, d.z, 20), n: 1 + Math.floor(R() * 2), vol: 0.35 }); }
        }
        float(d, time * 2.2, 0.008); d.obj.position.y += d.lift;
        d.obj.userData.head.rotation.y = Math.sin(time * 0.8 + d.ph * 3) * 0.5;
      }

      for (const e of egrets) {
        const f = e.fly, o = e.obj;
        if (!f) {
          const pp = perches[e.perch], q = dist(pp, p);
          if (p.live && (q < 8.5 || (p.dashing && q < 16))) flush(e);
          o.userData.body.rotation.x = Math.max(0, Math.sin(time * 0.3 + e.ph) - 0.93) * 6;
          continue;
        }
        f.t += dt;
        const k = Math.min(1, f.t / f.dur), ease = k * k * (3 - 2 * k), dx = f.to.x - f.from.x, dz = f.to.z - f.from.z, l = Math.hypot(dx, dz) || 1, side = Math.sin(k * Math.PI) * f.wob;
        const x = f.from.x + dx * ease - (dz / l) * side, z = f.from.z + dz * ease + (dx / l) * side;
        const ground = world.height(f.to.x, f.to.z) * ease + world.height(f.from.x, f.from.z) * (1 - ease);
        o.rotation.y = turnTo(o.rotation.y, Math.atan2(x - o.position.x, z - o.position.z), dt * 3);
        o.position.set(x, ground + Math.sin(k * Math.PI) * (5 + l * 0.05), z);
        const flap = Math.sin(f.t * 8.5) * (k > 0.85 ? 0.9 : 0.6);
        o.userData.wings[0].rotation.z = flap; o.userData.wings[1].rotation.z = -flap;
        o.userData.body.rotation.x = Math.sin(k * Math.PI) * 0.9;
        if (k >= 1) { e.fly = null; o.userData.wings.forEach((w) => (w.visible = false)); o.userData.body.rotation.x = 0; water.ring(f.to.x, f.to.z, 0.4); }
      }

      for (const f of frogs) {
        if (f.away > 0) { if ((f.away -= dt) <= 0) f.obj.visible = true; continue; }
        if (p.live && p.alt < 1 && dist(f, p) < 2.7) { f.away = 45; f.obj.visible = false; audio.plop(hear(f.x, f.z, 14)); splash(f.x, f.z, 4, 0.5); discover('frog'); }
      }
      snails.forEach((n, i) => { if (n.back > 0 && (n.back -= dt) <= 0) placeSnail(i); });
      for (const b of bubbles) if ((b.t -= dt) < 0) { b.t = 1.6 + R() * 2.4; if (dist(b, p) < 30) water.ring(b.x + (R() - 0.5) * 0.5, b.z + (R() - 0.5) * 0.5, 0.2); }
      curios.forEach((cu, i) => {
        const on = !cu.got, tw = Math.max(0, Math.sin(time * 2.1 + cu.ph)) ** 6;
        glints.pos.set(on ? [cu.x, 0.04, cu.z, cu.x, cu.y + 0.16, cu.z] : [0, -99, 0, 0, -99, 0], i * 6);
        glints.col.set([tw, tw, tw, 0.5 + tw * 0.5, 0.5 + tw * 0.5, 0.5 + tw * 0.5], i * 6);
      });
      glints.g.attributes.position.needsUpdate = glints.g.attributes.color.needsUpdate = true;

      // bread: thrown from the bank, floating, first come first served
      for (const f of feeders) if ((f.cool -= dt) < 0 && !toss && p.live && env.night < 0.7 && dist(f, p) < 24) throwBread(f);
      crumbs.forEach((cr, i) => {
        if (cr.life > 0) {
          if (cr.delay > 0) { if ((cr.delay -= dt) <= 0) { water.ring(cr.x, cr.z, 0.4); audio.plop({ ...hear(cr.x, cr.z, 30), vol: 0.5 }); } }
          else if (p.alt < 0.1 && !p.under && dist(cr, p) < 0.45) { gone(cr, true); audio.nom(); water.ring(cr.x, cr.z, 0.3); }
          else if ((cr.life -= dt) <= 0) gone(cr, false);
        }
        const show = cr.life > 0 && cr.delay <= 0;
        crumbMesh.setMatrixAt(i, sm.compose(sv.set(cr.x, show ? 0.02 + Math.sin(time * 2 + i) * 0.006 : -9, cr.z), sq.identity(), ss.set(1, 0.6, 1)));
      });
      crumbMesh.instanceMatrix.needsUpdate = true;

      // fish idle under the surface near you; one leaps now and then
      shoal.forEach((f, i) => {
        f.burst = Math.max(0, f.burst - dt);
        f.heading += Math.sin(time * 0.7 + i * 1.7) * dt * 0.8;
        if (p.under && dist(f, p) < 1.7) { f.heading = turnTo(f.heading, Math.atan2(f.x - p.x, f.z - p.z), dt * 9); f.burst = Math.max(f.burst, 0.5); }
        const v = f.speed + f.burst * 2.6, nx = f.x + Math.sin(f.heading) * v * dt, nz = f.z + Math.cos(f.heading) * v * dt;
        if (sdf(nx, nz) > -0.8) f.heading += Math.PI * 0.6; else { f.x = nx; f.z = nz; }
        if (dist(f, p) > 13) { const a = R() * TAU, q = 4 + R() * 7, x = p.x + Math.cos(a) * q, z = p.z + Math.sin(a) * q; if (sdf(x, z) < -1) { f.x = x; f.z = z; } }
        fe.set(0, f.heading + Math.sin(time * 9 + i) * 0.15, 0); fq.setFromEuler(fe);
        fv.set(f.x, Math.max(world.height(f.x, f.z) + 0.12, f.y), f.z);
        fish.setMatrixAt(i, fm.compose(fv, fq, one.setScalar(f.s)));
      });
      fish.instanceMatrix.needsUpdate = true;
      if ((nextLeap -= dt) < 0 && !leap) {
        nextLeap = 22 + R() * 40;
        const a = p.heading + (R() - 0.5) * 1.6, q = 5 + R() * 9, x = p.x + Math.sin(a) * q, z = p.z + Math.cos(a) * q;
        if (sdf(x, z) < -1.2) { leap = { x, z, t: 0, dir: R() * TAU }; water.ring(x, z, 0.8); audio.plop({ ...hear(x, z, 30), vol: 0.5 }); }
      }
      if (leap) {
        leap.t += dt; const k = leap.t / 0.62, d = k * 0.7;
        leaper.visible = k < 1;
        leaper.position.set(leap.x + Math.sin(leap.dir) * d, Math.sin(k * Math.PI) * 0.42 - 0.03, leap.z + Math.cos(leap.dir) * d);
        leaper.rotation.set(-(0.5 - k) * 2.4, leap.dir, 0, 'YXZ');
        if (k >= 1) { splash(leaper.position.x, leaper.position.z, 5, 0.6); audio.plop(hear(leap.x, leap.z, 30)); discover('fishjump'); leap = null; }
      }

      // the boatman sculls slowly round the loop, against your drift
      {
        const L = world.loop(ferry.u); ferry.u = (ferry.u - (1.2 * dt) / L.sp + 1) % 1;
        ferry.x = L.x + L.nx * L.hw * 0.34; ferry.z = L.z + L.nz * L.hw * 0.34; ferry.heading = Math.atan2(-L.tx, -L.tz);
        ferry.obj.position.set(ferry.x, Math.sin(time * 0.9) * 0.015, ferry.z);
        ferry.obj.rotation.set(0, ferry.heading, Math.sin(time * 1.1) * 0.03, 'YXZ');
        ferryHull.forEach((h, i) => { const k = (i - 1) * 1.9; h.x = ferry.x + Math.sin(ferry.heading) * k; h.z = ferry.z + Math.cos(ferry.heading) * k; });
        if ((ferry.wake += dt) > 1.1 && dist(ferry, p) < 60) { ferry.wake = 0; water.ring(ferry.x + Math.sin(ferry.heading) * 2.6, ferry.z + Math.cos(ferry.heading) * 2.6, 0.9); }
      }

      // rain
      const wet = env.rain;
      rain.visible = wet > 0.02; rain.material.opacity = wet * 0.26;
      if (rain.visible) {
        const n = Math.floor(RAIN * Math.min(1, wet * 1.2));
        for (let i = 0; i < n; i++) {
          const d = drops[i]; d.y -= dt * 14;
          if (d.y < 0) { d.y += 13; d.x = (R() - 0.5) * 34; d.z = (R() - 0.5) * 34; }
          rainPos.set([p.x + d.x, d.y, p.z + d.z, p.x + d.x + 0.05, d.y + 0.5, p.z + d.z], i * 6);
        }
        rainGeo.setDrawRange(0, n * 2); rainGeo.attributes.position.needsUpdate = true;
        if ((rainRing -= dt) < 0) { rainRing = 0.22 / wet; const a = R() * TAU, q = 1 + R() * 6; water.ring(p.x + Math.cos(a) * q, p.z + Math.sin(a) * q, 0.18); }
      }

      // fireflies over the banks at night
      const dusk = Math.max(0, env.night * 1.4 - 0.4) * (1 - wet);
      flies.m.material.opacity = dusk; flies.m.visible = dusk > 0.01;
      if (flies.m.visible) flyState.forEach((f, i) => {
        if (!f.ok || Math.hypot(f.x - p.x, f.z - p.z) > 30) {
          const a = R() * TAU, q = 5 + R() * 22, x = p.x + Math.cos(a) * q, z = p.z + Math.sin(a) * q, d = sdf(x, z);
          f.ok = d > -2 && d < 9;
          if (f.ok) { f.x = x; f.z = z; f.y = Math.max(world.height(x, z), 0) + 0.3 + R() * 1.7; }
        }
        const b = f.ok ? Math.max(0, Math.sin(time * 1.6 + f.ph)) ** 2 : 0;
        flies.pos.set([f.x + Math.sin(time * 0.5 + f.ph) * 0.9, f.y + Math.sin(time * 0.8 + f.ph * 2) * 0.3, f.z + Math.cos(time * 0.4 + f.ph) * 0.9], i * 3);
        flies.col.set([b, b, b], i * 3);
      });
      flies.g.attributes.position.needsUpdate = flies.g.attributes.color.needsUpdate = true;

      // peach petals on the willow bank
      const bloom = zoneWeight(world.uAt(p.x, p.z), 'willow', 0.03) * (1 - env.night * 0.7);
      petals.m.visible = bloom > 0.02; petals.m.material.opacity = bloom * 0.9;
      if (petals.m.visible) petalState.forEach((f, i) => {
        f.y -= dt * (0.35 + (i % 5) * 0.06);
        if (f.y < 0) { f.y = 3 + R() * 3; f.x = (R() - 0.5) * 22; f.z = (R() - 0.5) * 22; }
        petals.pos.set([p.x + f.x + Math.sin(time + f.ph) * 0.5, f.y, p.z + f.z + Math.cos(time * 0.8 + f.ph) * 0.5], i * 3);
      });
      petals.g.attributes.position.needsUpdate = true;

      sprayState.forEach((f, i) => {
        if (f.life > 0) { f.life -= dt; f.vy -= 7 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; if (f.y < 0) f.life = 0; }
        spray.pos.set(f.life > 0 ? [f.x, f.y, f.z] : [0, -99, 0], i * 3);
      });
      spray.g.attributes.position.needsUpdate = true;

      if ((placeTimer -= dt) < 0) { placeTimer = 0.5; places(p); }
    },
  };
}
