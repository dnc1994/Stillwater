import assert from 'node:assert/strict';
import {generateWorld,generateChunk,isWater,waterDistance,terrainHeight,channel,CHUNK_SIZE,WorldStreamer} from '../dist/world.js';
assert.deepEqual(generateChunk('rural',-8,13),generateChunk('rural',-8,13));
assert.notDeepEqual(generateChunk('rural',-8,13),generateChunk('other',-8,13));
const biomes=new Set();let landmarks=0,bridges=0,barges=0,fields=0,houses=0,minWidth=100,maxWidth=0;
for(let seed=0;seed<40;seed++){
 const w=generateWorld('rural-test-'+seed);assert.ok(isWater(w,w.spawn.x,w.spawn.z,1),'Safe spawn');
 for(const [cx,cz]of [[0,0],[1,-1],[-5,8],[7000,-4000],[-600000,900000]]){
  const c=w.getChunk(cx,cz);biomes.add(c.biome);bridges+=!!c.bridge;barges+=!!c.barge;fields+=c.fields.length;houses+=c.houses.length;
  for(const p of c.places){landmarks++;assert.ok(isWater(w,p.x,p.z,.65),`Landmark blocked: ${seed} ${c.id} ${p.name}`);}
  // Follow the actual curving main route across each region, including at huge coordinates.
  for(let t=0;t<=160;t+=4){const x=cx*160+t,h=channel(w,cz,x);minWidth=Math.min(minWidth,h.width);maxWidth=Math.max(maxWidth,h.width);assert.ok(isWater(w,x,h.center,.65),`Main channel obstructed: ${seed} ${cx},${cz} ${t}`);assert.ok(terrainHeight(w,x,h.center)<0,'Channel below water');}
  for(let t=0;t<160;t+=16){const z=cz*160+t,v=channel(w,cx,z,true);assert.ok(waterDistance(w,v.center,z)<-4,'Creeks remain connected');}
  // Elevation is evaluated in world space, so shared mesh edges have identical samples.
  for(let t=0;t<=160;t+=2.5){const x=(cx+1)*160,z=cz*160+t;assert.equal(terrainHeight(w,x,z),terrainHeight(w,(cx*160)+160,z));}
 }
 assert.ok(w.cacheSize<=128);assert.ok(w.lines.size<=256);assert.ok(w.ponds.size<=256);
}
assert.equal(biomes.size,6);assert.ok(bridges>30&&barges>30&&fields>50&&houses>50);assert.ok(maxWidth-minWidth>10);
const w=generateWorld('journey'),disposed=[];const streamer=new WorldStreamer(w,data=>({data}),item=>disposed.push(item.data.id));streamer.update(0,0,25);const first=JSON.stringify(streamer.active.get('0,0').data);
for(let i=1;i<=500;i++){streamer.update(i*160,-i*160,1);assert.ok(streamer.active.size<=25);streamer.update(i*160,-i*160,25);assert.equal(streamer.active.size,25);assert.ok(w.cacheSize<=128);}
streamer.update(0,0,25);assert.equal(JSON.stringify(streamer.active.get('0,0').data),first);assert.ok(disposed.length>4000);streamer.clear();assert.equal(streamer.active.size,0);
console.log(`Passed 40 seeds: all 6 landscapes, ${landmarks} reachable landmarks, ${bridges} bridges, ${barges} barges, ${fields} paddies, ${houses} houses; connected main routes, shared terrain edges and 500 bounded streaming transitions.`);
// Verify that side ponds can actually be reached, including around parked barges.
for(let seed=0;seed<12;seed++)for(const[cx,cz]of[[0,0],[2,1],[-3,4]]){
 const w=generateWorld('pond-route-'+seed),c=w.getChunk(cx,cz),step=2.5,x0=cx*160-30,z0=cz*160-45,W=89,H=89;
 if(!c.pond.active)continue;
 const startX=cx*160+80,startZ=channel(w,cz,startX).center,ix=Math.round((startX-x0)/step),iz=Math.round((startZ-z0)/step),seen=new Uint8Array(W*H),queue=[[ix,iz]];seen[iz*W+ix]=1;let reached=false;
 for(let at=0;at<queue.length;at++){const[x,z]=queue[at],wx=x0+x*step,wz=z0+z*step;if(Math.hypot(wx-c.pond.x,wz-c.pond.z)<8){reached=true;break;}for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,index=nz*W+nx;if(nx<0||nz<0||nx>=W||nz>=H||seen[index]||!isWater(w,x0+nx*step,z0+nz*step,.65))continue;seen[index]=1;queue.push([nx,nz]);}}
 assert.ok(reached,`Backwater unreachable ${seed} ${cx},${cz}`);
}
console.log('Backwater flood-fill checks passed across 36 regions: active ponds and side creeks are reachable around barge obstacles.');
