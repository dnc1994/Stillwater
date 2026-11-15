// Checks on the generated countryside. Run with: node tests/world.test.mjs
import assert from 'node:assert/strict';
import { makeWorld, SIZE, zoneAt, ZONES } from '../dist/src/world.js';

const seeds = ['jiangnan', 'wuzhen', 'a-very-different-seed', '42'];
for (const seed of seeds) {
  const w = makeWorld(seed);

  // Same seed, same place.
  const again = makeWorld(seed);
  assert.deepEqual(w.spawn, again.spawn);
  assert.equal(w.houses.length, again.houses.length);
  assert.deepEqual(w.ducklings, again.ducklings);

  // The river is one unbroken loop of open water, wide enough for a duck everywhere.
  for (let i = 0; i < 2000; i++) {
    const L = w.loop(i / 2000);
    assert.ok(w.sdf(L.x, L.z) < -2, `${seed}: centreline is afloat at u=${i / 2000}`);
    assert.ok(Math.abs(L.x) < SIZE - 30 && Math.abs(L.z) < SIZE - 30, `${seed}: river stays on the map`);
    assert.equal(w.height(L.x, L.z) < 0, true);
  }
  // ...and the back creek really connects the old town to the lotus pond.
  for (const c of w.creek) assert.ok(w.sdf(c.x, c.z) < -1.5, `${seed}: creek is navigable`);

  // No water leaks off the edge of the map.
  for (let t = -SIZE; t <= SIZE; t += 4) for (const [x, z] of [[t, -SIZE + 1], [t, SIZE - 1], [-SIZE + 1, t], [SIZE - 1, t]]) assert.ok(w.sdf(x, z) > 3, `${seed}: dry at the border`);

  // You start afloat, and so does everything you are meant to reach by water.
  assert.ok(w.sdf(w.spawn.x, w.spawn.z) < -2);
  assert.equal(w.ducklings.length, 6);
  for (const d of w.ducklings) assert.ok(w.sdf(d.x, d.z) < -0.5, `${seed}: duckling is in the water`);
  for (const s of w.snacks) assert.ok(w.sdf(s.x, s.z) < -0.5);
  for (const b of w.boats) assert.ok(w.sdf(b.x, b.z) < 0, `${seed}: boats are moored in water`);
  assert.ok(w.sdf(w.fisher.x, w.fisher.z) < -1);
  assert.ok(w.egrets.length >= 5, `${seed}: there are egrets to meet`);

  // Buildings and trees stand on dry land.
  assert.ok(w.houses.length > 40, `${seed}: the old town has houses (${w.houses.length})`);
  for (const h of w.houses) assert.ok(w.sdf(h.x, h.z) > 1, `${seed}: house on land`);
  for (const t of [...w.trees, ...w.willows, ...w.peaches, ...w.bamboo]) assert.ok(w.sdf(t.x, t.z) > 0.4, `${seed}: tree on land`);
  assert.ok(w.sdf(w.pavilion.x, w.pavilion.z) > 2);
  assert.ok(w.pads.length > 150 && w.flowers.length > 20, `${seed}: the pond has lotus`);
  for (const p of w.pads) assert.ok(w.sdf(p.x, p.z) < 0);

  // Arch bridges span the main river inside the old town.
  const arches = w.bridges.filter((b) => b.kind === 'arch');
  assert.equal(arches.length, 3);
  for (const b of arches) { assert.equal(zoneAt(b.u), 'village'); assert.ok(w.sdf(b.x, b.z) < -3); }

  // Heights are finite everywhere and the terrain meets the water at the bank.
  for (let i = 0; i < 4000; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453 % 1) * SIZE, z = (Math.sin(i * 78.233) * 12345.678 % 1) * SIZE, h = w.height(x, z);
    assert.ok(Number.isFinite(h));
    assert.equal(h < 0, w.sdf(x, z) <= 0, 'land is above the waterline, riverbed below');
  }
}

// The six stretches tile the loop exactly.
const spans = Object.values(ZONES).sort((a, b) => a[0] - b[0]);
assert.equal(spans[0][0], 0); assert.equal(spans.at(-1)[1], 1);
for (let i = 1; i < spans.length; i++) assert.equal(spans[i][0], spans[i - 1][1]);

console.log(`world checks passed for ${seeds.length} seeds`);
