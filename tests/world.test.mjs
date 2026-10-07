import assert from 'node:assert/strict';
import {generateWorld,isWater,shoreRadius,islandDistance} from '../dist/world.js';
assert.deepEqual(generateWorld('quiet-lake'),generateWorld('quiet-lake'),'Seeds must be repeatable');
assert.notDeepEqual(generateWorld('quiet-lake'),generateWorld('another-lake'),'Different seeds must change the layout');
const islandCounts=new Set();
for(let seed=0;seed<250;seed++){
 const w=generateWorld('test-'+seed);islandCounts.add(w.islands.length);
 assert.ok(w.islands.length>=5&&w.islands.length<=8,`island count ${seed}`);
 assert.ok(isWater(w,0,0,10),`safe spawn ${seed}`);
 for(const q of w.islands)assert.ok(!isWater(w,q.x,q.z),`island collision ${seed}`);
 for(let i=0;i<60;i++){let a=i/60*Math.PI*2,r=shoreRadius(w,a);assert.ok(!isWater(w,Math.cos(a)*(r+2),Math.sin(a)*(r+2)),`shore collision ${seed}`);}
 // Flood fill the swimmable lake, not just individual landmark coordinates.
 const step=3,size=151,mid=75,visited=new Uint8Array(size*size),queue=[[mid,mid]];visited[mid*size+mid]=1;
 for(let at=0;at<queue.length;at++){const [x,z]=queue[at];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=size||nz>=size)continue;const index=nz*size+nx;if(visited[index]||!isWater(w,(nx-mid)*step,(nz-mid)*step,1))continue;visited[index]=1;queue.push([nx,nz]);}}
 for(const p of w.places){assert.ok(isWater(w,p.x,p.z,.65),`landmark is water: ${seed} ${p.name}`);assert.ok(queue.some(([x,z])=>Math.hypot((x-mid)*step-p.x,(z-mid)*step-p.z)<p.r-2),`reachable landmark: ${seed} ${p.name}`);}
 for(const q of w.islands)assert.equal(islandDistance(q,q.x,q.z),0);
}
assert.ok(islandCounts.size>=3,'Island counts should vary');
console.log('250 seeds passed: repeatability, varied layouts, safe spawn, shore/island collision, all landmarks reachable.');
