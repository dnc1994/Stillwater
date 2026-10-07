// Seeded layout is independent of rendering, so collision, map and scenery agree.
export function randomFor(seed) {
  let state=2166136261;
  for(const c of String(seed)) state=Math.imul(state^c.charCodeAt(0),16777619);
  return ()=>{state=(state+0x6D2B79F5)|0;let t=Math.imul(state^(state>>>15),1|state);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}
const TAU=Math.PI*2;
export function shoreRadius(world,a) {
  return world.radius+Math.sin(a*3+world.phases[0])*15+Math.sin(a*5+world.phases[1])*8+Math.cos(a*2+world.phases[2])*12;
}
export function islandRadius(q,a) {
  return q.r*(1+.075*Math.sin(a*3+q.phase)+.04*Math.cos(a*5-q.phase));
}
export function islandDistance(q,x,z) {
  const dx=x-q.x,dz=z-q.z,c=Math.cos(q.rotation),s=Math.sin(q.rotation);
  const lx=dx*c+dz*s,lz=(-dx*s+dz*c)/q.aspect;
  return Math.hypot(lx,lz)/islandRadius(q,Math.atan2(lz,lx));
}
export function isWater(world,x,z,margin=1) {
  if(Math.hypot(x,z)>shoreRadius(world,Math.atan2(z,x))-margin)return false;
  if(world.islands.some(q=>islandDistance(q,x,z)<1+margin/(q.r*q.aspect)))return false;
  return !world.obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+margin);
}
export function groundHeight(world,x,z) {
  for(const q of world.islands){const u=islandDistance(q,x,z);if(u<=1)return .08+q.height*Math.pow(1-u*u,1.2);}
  const d=Math.hypot(x,z)-shoreRadius(world,Math.atan2(z,x));
  return d>=0 ? .08+Math.min(d*.2,9)+Math.sin(x*.065)*Math.sin(z*.055)*Math.min(d*.025,2) : -.5;
}
export function generateWorld(seed) {
  const rng=randomFor(seed),between=(a,b)=>a+rng()*(b-a);
  const world={seed:String(seed),radius:between(171,190),phases:[rng()*TAU,rng()*TAU,rng()*TAU],islands:[],obstacles:[],spawn:{x:0,z:0,yaw:between(-Math.PI,Math.PI)}};
  const count=5+Math.floor(rng()*4);
  for(let attempts=0;world.islands.length<count&&attempts<1200;attempts++){
    const a=rng()*TAU,r=between(55,125),q={x:Math.cos(a)*r,z:Math.sin(a)*r,r:between(13,25),aspect:between(.65,.95),rotation:rng()*TAU,phase:rng()*TAU,height:between(2,5),density:between(.65,1.2)};
    if(r-q.r<36||r+q.r+22>shoreRadius(world,a))continue;
    if(world.islands.some(o=>Math.hypot(q.x-o.x,q.z-o.z)<q.r+o.r+24))continue;
    world.islands.push(q);
  }
  function beside(q){for(let i=0;i<300;i++){const a=rng()*TAU,r=q.r+between(13,23),x=q.x+Math.cos(a)*r,z=q.z+Math.sin(a)*r;if(isWater(world,x,z,10))return{x,z};}throw new Error('Unable to place a waterfront landmark');}
  const a=rng()*TAU,shore=shoreRadius(world,a);
  world.cabin={x:Math.cos(a)*(shore+3),z:Math.sin(a)*(shore+3),rotation:Math.atan2(-Math.cos(a),-Math.sin(a))};
  const dock={x:Math.cos(a)*(shore-20),z:Math.sin(a)*(shore-20)};
  // Other landmarks occupy open water adjacent to different islands.
  const lily=beside(world.islands[0]),arch=beside(world.islands[1]),hide=beside(world.islands[2]),shallow=beside(world.islands[3]);
  world.arch={...arch,rotation:rng()*TAU};
  for(const side of [-1,1])world.obstacles.push({x:arch.x+side*6*Math.cos(world.arch.rotation),z:arch.z-side*6*Math.sin(world.arch.rotation),r:1.4});
  world.obstacles.push({x:world.cabin.x,z:world.cabin.z,r:6});
  world.places=[
    {...lily,name:'The lily garden',r:13,note:'Little islands of green. A whole world underneath.'},
    {...dock,name:'The old boathouse',r:13,note:'The boards creak. Nobody’s in a hurry here.'},
    {...arch,name:'The stone passage',r:9,note:'A secret shortcut, just your size.'},
    {...hide,name:'Willow hideaway',r:13,note:'A sheltered pocket, out of the breeze.'},
    {...shallow,name:'Sunset shallows',r:13,note:'The last of the sunlight, caught on the water.'}
  ];
  return world;
}
