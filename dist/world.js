// Deterministic, unbounded archipelago. All coordinates here are world coordinates.
export const CHUNK_SIZE=160;
export function randomFor(seed){let state=2166136261;for(const c of String(seed))state=Math.imul(state^c.charCodeAt(0),16777619);return()=>{state=(state+0x6D2B79F5)|0;let t=Math.imul(state^(state>>>15),1|state);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
export function islandRadius(q,a){return q.r*(1+.075*Math.sin(a*3+q.phase)+.04*Math.cos(a*5-q.phase));}
export function islandDistance(q,x,z){const dx=x-q.x,dz=z-q.z,c=Math.cos(q.rotation),s=Math.sin(q.rotation),lx=dx*c+dz*s,lz=(-dx*s+dz*c)/q.aspect;return Math.hypot(lx,lz)/islandRadius(q,Math.atan2(lz,lx));}
export function islandPoint(q,a,t=1){const r=islandRadius(q,a)*t,x=Math.cos(a)*r,z=Math.sin(a)*r*q.aspect,c=Math.cos(q.rotation),s=Math.sin(q.rotation);return{x:q.x+x*c-z*s,z:q.z+x*s+z*c};}
const types=[['The lily garden','Little islands of green. A whole world underneath.'],['The old boathouse','The boards creak. Nobody’s in a hurry here.'],['The stone passage','A secret shortcut, just your size.'],['Willow hideaway','A sheltered pocket, out of the breeze.'],['Sunset shallows','The light dances across a quiet shore.']];
export function generateChunk(seed,cx,cz){
 const rng=randomFor(seed+':region:'+cx+','+cz),between=(a,b)=>a+rng()*(b-a),ox=cx*CHUNK_SIZE,oz=cz*CHUNK_SIZE;
 const chunk={id:cx+','+cz,cx,cz,x:ox,z:oz,islands:[],places:[],obstacles:[],cabin:null,arch:null};
 // Some regions are open water; island footprints never seal the passages between regions.
 if(rng()<.12&&(cx!==0||cz!==0))return chunk;
 const q={x:ox+between(62,98),z:oz+between(62,98),r:between(19,40),aspect:between(.58,.98),rotation:rng()*Math.PI*2,phase:rng()*Math.PI*2,height:between(2,7),density:between(.65,1.2)};chunk.islands.push(q);
 const type=Math.floor(rng()*types.length),a=rng()*Math.PI*2;
 // Place landmarks on varied shores while preserving open inter-region passages.
 const r=q.r*1.12+12;let direction=Math.atan2(oz+15-q.z,ox+15-q.x);
 for(let i=0;i<40;i++){const candidate=rng()*Math.PI*2,x=q.x+Math.cos(candidate)*r-ox,z=q.z+Math.sin(candidate)*r-oz;if(x>14&&x<146&&z>14&&z<146){direction=candidate;break;}}
 const place={id:chunk.id+':place',type,name:types[type][0],note:types[type][1],x:q.x+Math.cos(direction)*r,z:q.z+Math.sin(direction)*r,r:13};
 if(type===1){
   const localAngle=direction-q.rotation;const edge=islandPoint(q,Math.atan2(Math.sin(localAngle)/q.aspect,Math.cos(localAngle)),.82);
   chunk.cabin={...edge,rotation:Math.atan2(Math.cos(direction),Math.sin(direction))};
   place.x=edge.x+Math.cos(direction)*23;place.z=edge.z+Math.sin(direction)*23;
 }else if(type===2){chunk.arch={x:place.x,z:place.z,rotation:a};for(const side of [-1,1])chunk.obstacles.push({x:place.x+side*6*Math.cos(a),z:place.z-side*6*Math.sin(a),r:1.4});}
 chunk.places.push(place);return chunk;
}
export function generateWorld(seed){
 const cache=new Map();
 return {seed:String(seed),spawn:{x:0,z:0,yaw:-Math.PI*.75},get cacheSize(){return cache.size;},getChunk(cx,cz){
   const key=cx+','+cz;if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
   const value=generateChunk(String(seed),cx,cz);cache.set(key,value);if(cache.size>128)cache.delete(cache.keys().next().value);return value;
 }};
}
export function isWater(world,x,z,margin=1){
 const cx=Math.floor(x/CHUNK_SIZE),cz=Math.floor(z/CHUNK_SIZE);
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const chunk=world.getChunk(cx+dx,cz+dz);
  if(chunk.islands.some(q=>islandDistance(q,x,z)<1+margin/(q.r*q.aspect)))return false;
  if(chunk.obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+margin))return false;
 }return true;
}
// Rendering owns only a moving 5×5 window. Generation order never affects geography.
export class WorldStreamer{
 constructor(world,create,dispose,radius=2){this.world=world;this.create=create;this.dispose=dispose;this.radius=radius;this.active=new Map();this.pending=[];this.center=null;}
 update(x,z,budget=1){const cx=Math.floor(x/CHUNK_SIZE),cz=Math.floor(z/CHUNK_SIZE),center=cx+','+cz;
  if(center!==this.center){this.center=center;const wanted=new Map();for(let dx=-this.radius;dx<=this.radius;dx++)for(let dz=-this.radius;dz<=this.radius;dz++)wanted.set((cx+dx)+','+(cz+dz),{cx:cx+dx,cz:cz+dz,d:dx*dx+dz*dz});
   for(const [key,item]of this.active)if(!wanted.has(key)){this.dispose(item);this.active.delete(key);}
   this.pending=[...wanted.entries()].filter(([key])=>!this.active.has(key)).sort((a,b)=>a[1].d-b[1].d);
  }
  for(let i=0;i<budget&&this.pending.length;i++){const[key,q]=this.pending.shift(),data=this.world.getChunk(q.cx,q.cz);this.active.set(key,this.create(data));}
 }
 clear(){for(const item of this.active.values())this.dispose(item);this.active.clear();this.pending=[];this.center=null;}
}
