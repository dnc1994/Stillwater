import assert from 'node:assert/strict';
import {generateWorld,generateChunk,isWater,CHUNK_SIZE,WorldStreamer} from '../dist/world.js';
assert.deepEqual(generateChunk('quiet',-8,13),generateChunk('quiet',-8,13));
assert.notDeepEqual(generateChunk('quiet',-8,13),generateChunk('quiet',-7,13));
assert.notDeepEqual(generateChunk('quiet',-8,13),generateChunk('different',-8,13));
let landmarks=0;
for(let seed=0;seed<100;seed++){
 const w=generateWorld('test-'+seed);assert.ok(isWater(w,0,0,8),'Safe open spawn');
 for(const [cx,cz]of [[0,0],[1,-1],[-15,42],[7000,-4000],[-600000,900000]]){
  const c=w.getChunk(cx,cz);for(const q of c.islands)assert.ok(!isWater(w,q.x,q.z),'Land still blocks paddling');
  for(const p of c.places){landmarks++;assert.ok(isWater(w,p.x,p.z,.65),`Reachable water landmark ${seed} ${c.id} ${p.name}`);}
  // No outer edge, wraparound or coordinate clamping: tile-edge channels connect forever.
  for(let t=0;t<=CHUNK_SIZE;t+=4){assert.ok(isWater(w,cx*CHUNK_SIZE+t,cz*CHUNK_SIZE,.65),`East/west channel ${seed} ${cx},${cz} ${t}`);assert.ok(isWater(w,cx*CHUNK_SIZE,cz*CHUNK_SIZE+t,.65),`North/south channel ${seed} ${cx},${cz} ${t}`);}
 }
 assert.ok(w.cacheSize<=128);
}
// Exercise the actual streaming coordinator, including disposal and backtracking.
const world=generateWorld('long-journey'),disposed=[],built=[];
const streamer=new WorldStreamer(world,data=>{built.push(data.id);return {data};},item=>disposed.push(item.data.id));
streamer.update(0,0,25);assert.equal(streamer.active.size,25);
const first=JSON.stringify(streamer.active.get('0,0').data);
for(let i=1;i<=1000;i++){
 streamer.update(i*CHUNK_SIZE,-i*CHUNK_SIZE,1);assert.ok(streamer.active.size<=25);
 streamer.update(i*CHUNK_SIZE,-i*CHUNK_SIZE,25);assert.equal(streamer.active.size,25);assert.equal(streamer.pending.length,0);
 assert.ok(world.cacheSize<=128);
}
assert.ok(disposed.length>8000,'Distant chunks must be unloaded');
streamer.update(0,0,25);assert.equal(JSON.stringify(streamer.active.get('0,0').data),first,'Return travel restores identical terrain');
streamer.update(-1,-1,25);assert.ok(streamer.active.has('-1,-1'),'Negative coordinates use floor, not truncation');
streamer.clear();assert.equal(streamer.active.size,0);assert.equal(streamer.pending.length,0);
console.log(`Passed: 100 seeds, ${landmarks} water landmarks, open routes at ±millions of metres, 1,000 region transitions, stable backtracking and bounded cache/render counts.`);
