import assert from 'node:assert/strict';
import {generateWorld,isWater,channel} from '../dist/world.js';
import {Encounters,waterRoute,clearWater,distance} from '../dist/encounters.js';

for(let seed=0;seed<12;seed++){
 const world=generateWorld('friends-'+seed),events=[],e=new Encounters(world,event=>events.push(event));
 const player={...world.spawn};const places=world.getChunk(0,0).places;
 assert.ok(isWater(world,e.guide.x,e.guide.z,.4));
 assert.equal(e.quack(player,places),true);assert.equal(e.mode,'leading');assert.ok(e.target);assert.equal(e.quack(player,places),false,'Repeated key presses are debounced');
 // Follow the guide rather than teleporting: every actor must remain in navigable water.
 for(let i=0;i<3500&&e.mode==='leading';i++){
  e.update(.05,player,world.spawn.yaw);
  const d=distance(player,e.guide);if(d>2){const n={x:player.x+(e.guide.x-player.x)/d*.1,z:player.z+(e.guide.z-player.z)/d*.1};if(clearWater(world,player,n))Object.assign(player,n);}
  assert.ok(isWater(world,e.guide.x,e.guide.z,.4));
 }
 assert.equal(e.mode,'gathering','First guide leads to reachable ducklings');
 assert.equal(e.children.length,3);e.quack(player,places);assert.equal(e.mode,'following');assert.equal(e.completed,1);
 assert.equal(e.getState().followingDucklings,3);
 if(seed===0){
  for(let frame=0;frame<1000;frame++){
   const next={x:player.x+.08,z:channel(world,0,player.x+.08).center};
   if(clearWater(world,player,next))Object.assign(player,next);
   e.update(.05,player,world.spawn.yaw);
   for(const actor of [e.guide,...e.children])assert.ok(isWater(world,actor.x,actor.z,.4),'Followers stay in navigable water');
  }
  assert.ok(distance(e.guide,player)<8);assert.ok(distance(e.children[2],player)<12,'Ducklings keep up over a long swim');
 }
 const count=e.memories.size;e.update(.5,player,0);assert.equal(e.memories.size,count,'Memories do not duplicate');
 assert.ok(e.dabble(player));assert.equal(e.dabble(player),false);assert.ok(events.some(v=>v.type==='fish'));
 // Reset discards local actors but retains the session journal.
 e.reset(world.spawn,world.spawn.yaw);assert.equal(e.children.length,0);assert.equal(e.memories.size,count);
}
// Route through a curved channel and ensure every smoothed edge clears shore/hulls.
for(const seed of ['jiangnan','barge','lotus']){
 const w=generateWorld(seed),start=w.spawn,x=start.x+90,end={x,z:channel(w,0,x).center},route=waterRoute(w,start,end);
 assert.ok(route);let previous=start;for(const p of route){assert.ok(clearWater(w,previous,p));previous=p;}
 assert.equal(waterRoute(w,start,{x:50,z:50},0),null,'Invalid or unsearched routes fail safely');
}
const w=generateWorld('fish-test'),e=new Encounters(w),p={...w.spawn};e.mode='watching';e.target={...p,id:'fish',name:'The moon bridge'};assert.ok(e.dabble(p));assert.equal(e.mode,'following');assert.equal(e.completed,1);assert.ok(e.memories.has('fish'));
for(let i=0;i<100;i++)e.remember('memory-'+i,'A moment');assert.equal(e.memories.size,64);
console.log('Encounters passed: 12 playable greeting → guiding → duckling journeys, safe routes, fish interaction, cooldowns, reset, and bounded memories.');
