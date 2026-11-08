export const CHUNK_SIZE=160;
export function randomFor(seed){let s=2166136261;for(const c of String(seed))s=Math.imul(s^c.charCodeAt(0),16777619);return()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
const TAU=Math.PI*2;
function bounded(cache,key,create,limit=256){if(cache.has(key))return cache.get(key);const v=create();cache.set(key,v);if(cache.size>limit)cache.delete(cache.keys().next().value);return v;}
export function channel(world,index,t,vertical=false){
 const p=bounded(world.lines,(vertical?'v':'h')+index,()=>{const r=randomFor(world.seed+':channel:'+vertical+':'+index);return[r()*TAU,r()*TAU,r()];});
 const center=index*CHUNK_SIZE+Math.sin(t*.013+p[0])*24+Math.sin(t*.031+p[1])*7;
 const width=(vertical?4.5:8)+(vertical?4.5:8)*(.5+.5*Math.sin(t*.008+p[1]))+(!vertical&&index%4===0?7:0);
 return {center,width,slope:.312*Math.cos(t*.013+p[0])+.217*Math.cos(t*.031+p[1])};
}
export function pondAt(world,cx,cz){return bounded(world.ponds,cx+','+cz,()=>{const r=randomFor(world.seed+':pond:'+cx+','+cz),biome=Math.floor(randomFor(world.seed+':district:'+Math.floor(cx/2)+','+Math.floor(cz/2))()*6),x=cx*160+62+r()*36,z=cz*160+62+r()*36,active=biome===1||biome===5||r()<.43;return{x,z,active,loop:biome===1||biome===5||r()<.4,rx:Math.min(biome===5?38+r()*16:19+r()*22,(Math.min(x-cx*160,(cx+1)*160-x)-4)/1.16),rz:Math.min(biome===5?31+r()*19:15+r()*19,(Math.min(z-cz*160,(cz+1)*160-z)-4)/1.16),bend:(r()-.5)*34,phase:r()*TAU};});}
export function waterDistance(world,x,z){
 const cx=Math.floor(x/160),cz=Math.floor(z/160);let d=Infinity;
 for(let i=-1;i<=1;i++){const h=channel(world,cz+i,x),v=channel(world,cx+i,z,true);d=Math.min(d,Math.abs(z-h.center)-h.width,Math.abs(x-v.center)-v.width);}
 for(let i=0;i<=1;i++)for(let j=0;j<=1;j++){
  const p=pondAt(world,cx+i,cz+j);if(!p.active)continue;const dx=(x-p.x)/p.rx,dz=(z-p.z)/p.rz,angle=Math.atan2(dz,dx);
  d=Math.min(d,(Math.hypot(dx,dz)-1-.10*Math.sin(angle*3+p.phase)-.06*Math.cos(angle*5))*Math.min(p.rx,p.rz));
  const base=channel(world,cz+j,p.x).center,t=(z-base)/(p.z-base);
  if(t>=0&&t<=1){const center=p.x+Math.sin(t*Math.PI)*p.bend;d=Math.min(d,Math.abs(x-center)-(4.5+Math.sin(t*Math.PI)*1.8));}
  if(p.loop){const baseX=channel(world,cx+i,p.z,true).center,u=(x-baseX)/(p.x-baseX);if(u>=0&&u<=1)d=Math.min(d,Math.abs(z-p.z-Math.sin(u*Math.PI)*p.bend*.7)-4.2);}
 }

 return d;
}
export function terrainHeight(world,x,z){const d=waterDistance(world,x,z);if(d<0)return Math.max(-2.5,d*.36);return .04+Math.min(d,7)*.24+Math.max(0,d-10)*(.035+.075*(.5+.5*Math.sin(x*.023+z*.017)))+Math.floor(Math.max(0,d-10)/8)*.12;}
export const BIOMES=['Canal village','Lotus backwaters','Old freight reach','Bamboo creek','Rice-paddy country','Reed marsh'];
export function generateChunk(seed,cx,cz,field=null){
 const world=field||makeField(seed),rng=randomFor(seed+':countryside:'+cx+','+cz),range=(a,b)=>a+rng()*(b-a),ox=cx*160,oz=cz*160;
 const biome=Math.floor(randomFor(seed+':district:'+Math.floor(cx/2)+','+Math.floor(cz/2))()*6);
 const c={id:cx+','+cz,cx,cz,x:ox,z:oz,biome,region:BIOMES[biome],places:[],obstacles:[],bridge:null,barge:null,houses:[],fields:[],pond:pondAt(world,cx,cz)};
 const px=ox+range(45,115),h=channel(world,cz,px);
 // Every region offers a distinct destination; props use the same banks as collision.
 const titles=['Whitewall landing','Lotus backwater','The abandoned barge','Bamboo footbridge','Paddy irrigation creek','The reed maze'];
 const notes=['Old plaster, tiled roofs, and steps worn down to the water.','Pink flowers above, small fish below.','Rust, rope, and a deck slowly returning to the reeds.','A little shade beneath the bamboo.','Follow the channels between the green fields.','Listen to the reeds brushing against one another.'];
 const p={id:c.id+':main',type:biome,name:titles[biome],note:notes[biome],x:biome===1||biome===5?c.pond.x:px,z:biome===1||biome===5?c.pond.z:h.center,r:12};c.places.push(p);
 if(rng()<.65||biome===3||cx===0&&cz===0){
  const t=oz+range(48,118),v=channel(world,cx,t,true),stone=rng()<.55;
  c.bridge={x:v.center,z:t,rotation:0,half:v.width+5,height:stone?4.8:3.1,stone};
  c.places.push({id:c.id+':bridge',type:6,name:stone?'The moon bridge':'The timber crossing',note:'A cool arch of shade, with room to drift underneath.',x:v.center,z:t,r:8});
 }
 if(cx===0&&cz===0){const h=channel(world,0,96);c.bridge={x:96,z:h.center,rotation:Math.PI/2,half:h.width+5,height:4.8,stone:true};const p=c.places.find(p=>p.type===6);if(p){p.x=96;p.z=h.center;p.name='The moon bridge';}}
 if(biome===2||rng()<.26||cx===0&&cz===0){
  const bx=ox+range(45,115),b=channel(world,cz,bx);c.barge={x:bx,z:b.center+b.width*.63,rotation:Math.atan2(1,b.slope),length:range(17,24),rust:rng(),tilt:range(-.07,.07)};
  c.obstacles.push({...c.barge,halfX:2.3,halfZ:c.barge.length/2});
  if(biome===2){p.x=bx;p.z=b.center-b.width*.2;}
 }
 if(biome===0||rng()<.25||cx===0&&cz===0){
  for(let i=0;i<3+Math.floor(rng()*3);i++){const x=ox+28+i*19,h=channel(world,cz,x);const z=h.center+h.width+range(7,12);if(waterDistance(world,x,z)>3)c.houses.push({x,z,y:terrainHeight(world,x,z),rotation:Math.PI,width:range(6,10),height:range(4,7),length:range(7,11),warm:rng()});}
 }
 if(biome===4||biome===0||rng()<.35){
  for(let z=oz+35;z<oz+150;z+=19)for(let x=ox+25;x<ox+150;x+=24){const corners=[[-9,-6],[9,-6],[-9,6],[9,6],[0,0]];if(corners.every(([dx,dz])=>waterDistance(world,x+dx,z+dz)>4)){const y=terrainHeight(world,x,z);c.fields.push({x,z,y,width:18,length:12,gold:rng()<.28});}}
 }
 return c;
}
function makeField(seed){return{seed:String(seed),lines:new Map(),ponds:new Map()};}
export function generateWorld(seed){const cache=new Map(),w=makeField(seed);Object.assign(w,{getChunk(cx,cz){return bounded(cache,cx+','+cz,()=>generateChunk(String(seed),cx,cz,w),128);}});Object.defineProperty(w,'cacheSize',{get:()=>cache.size});const x=26,h=channel(w,0,x);w.spawn={x,z:h.center,yaw:Math.atan2(-1,-h.slope)};return w;}
export function isWater(world,x,z,margin=.65){if(waterDistance(world,x,z)>-margin)return false;const cx=Math.floor(x/160),cz=Math.floor(z/160);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){for(const o of world.getChunk(cx+dx,cz+dz).obstacles){const xx=x-o.x,zz=z-o.z,c=Math.cos(o.rotation),s=Math.sin(o.rotation);if(Math.abs(xx*c-zz*s)<o.halfX+margin&&Math.abs(xx*s+zz*c)<o.halfZ+margin)return false;}}return true;}
export class WorldStreamer{
 constructor(world,create,dispose,radius=2){Object.assign(this,{world,create,dispose,radius,active:new Map(),pending:[],center:null});}
 update(x,z,budget=1){const cx=Math.floor(x/160),cz=Math.floor(z/160),center=cx+','+cz;if(center!==this.center){this.center=center;const wanted=new Map();for(let dx=-this.radius;dx<=this.radius;dx++)for(let dz=-this.radius;dz<=this.radius;dz++)wanted.set((cx+dx)+','+(cz+dz),{cx:cx+dx,cz:cz+dz,d:dx*dx+dz*dz});for(const[key,item]of this.active)if(!wanted.has(key)){this.dispose(item);this.active.delete(key);}this.pending=[...wanted.entries()].filter(([key])=>!this.active.has(key)).sort((a,b)=>a[1].d-b[1].d);}for(let i=0;i<budget&&this.pending.length;i++){const[key,p]=this.pending.shift();this.active.set(key,this.create(this.world.getChunk(p.cx,p.cz)));}}
 clear(){for(const item of this.active.values())this.dispose(item);this.active.clear();this.pending=[];this.center=null;}
}
