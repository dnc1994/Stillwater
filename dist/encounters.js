import {isWater,channel,randomFor} from './world.js';

export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function clearWater(world,a,b,margin=.48){
 const steps=Math.max(1,Math.ceil(distance(a,b)/.65));
 for(let i=0;i<=steps;i++){const t=i/steps;if(!isWater(world,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,margin))return false;}
 return true;
}
export function nearbyWater(world,p,radius=8){
 if(isWater(world,p.x,p.z,.8))return {x:p.x,z:p.z};
 for(let r=1;r<=radius;r++)for(let i=0;i<16;i++){const a=i*Math.PI/8,q={x:p.x+Math.cos(a)*r,z:p.z+Math.sin(a)*r};if(isWater(world,q.x,q.z,.8))return q;}
 return null;
}

// Bounded A*: every edge is tested against the same banks and hulls as the player.
export function waterRoute(world,start,goal,maxNodes=4500){
 if(!isWater(world,start.x,start.z,.45)||!isWater(world,goal.x,goal.z,.45))return null;
 if(clearWater(world,start,goal))return [{...goal}];
 const step=2.5,key=(x,z)=>x+','+z,open=[],best=new Map(),closed=new Set();
 function push(n){open.push(n);let i=open.length-1;while(i){const p=(i-1)>>1;if(open[p].f<=n.f)break;open[i]=open[p];i=p;}open[i]=n;}
 function pop(){const top=open[0],end=open.pop();if(open.length){let i=0;while(i*2+1<open.length){let j=i*2+1;if(j+1<open.length&&open[j+1].f<open[j].f)j++;if(open[j].f>=end.f)break;open[i]=open[j];i=j;}open[i]=end;}return top;}
 const first={x:0,z:0,p:{x:start.x,z:start.z},g:0,f:distance(start,goal),parent:null};push(first);best.set('0,0',0);
 let visits=0;
 while(open.length&&visits++<maxNodes){
  const n=pop(),id=key(n.x,n.z);if(closed.has(id))continue;closed.add(id);
  if(distance(n.p,goal)<step*1.5&&clearWater(world,n.p,goal)){
   const points=[{...goal}];for(let at=n;at.parent;at=at.parent)points.push(at.p);points.reverse();
   // String pulling keeps the duck's route smooth while preserving collision clearance.
   const result=[];let from=start;
   for(let i=0;i<points.length;){let j=Math.min(points.length-1,i+10);while(j>i&&!clearWater(world,from,points[j]))j--;result.push(points[j]);from=points[j];i=j+1;}
   return result;
  }
  for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const x=n.x+dx,z=n.z+dz,id=key(x,z);if(Math.abs(x)>64||Math.abs(z)>64||closed.has(id))continue;
   const p={x:start.x+x*step,z:start.z+z*step},g=n.g+Math.hypot(dx,dz)*step;
   if(g>=(best.get(id)??Infinity)||!clearWater(world,n.p,p))continue;
   best.set(id,g);push({x,z,p,g,f:g+distance(p,goal),parent:n});
  }
 }
 return null;
}

export class Encounters{
 constructor(world,emit=()=>{}){this.world=world;this.emit=emit;this.time=0;this.memories=new Map();this.children=[];this.completed=0;this.lastCall=-10;this.lastDabble=-10;this.serial=0;this.reset(world.spawn,world.spawn.yaw);}
 reset(player,yaw){
  const ahead={x:player.x-Math.sin(yaw)*7+Math.cos(yaw)*2.5,z:player.z-Math.cos(yaw)*7-Math.sin(yaw)*2.5};
  const p=nearbyWater(this.world,ahead)||nearbyWater(this.world,player);
  this.guide={...p,yaw:Math.atan2(-(player.x-p.x),-(player.z-p.z)),path:[],repath:0};
  this.mode='wild';this.target=null;this.children=[];this.childrenJoined=false;this.arrived=false;this.hint='A duck nearby seems curious. Say hello.';
 }
 remember(id,text){if(this.memories.has(id))return;this.memories.set(id,text);if(this.memories.size>64)this.memories.delete(this.memories.keys().next().value);this.emit({type:'memory',text});}
 chooseDestination(player,places){
  const candidates=places.filter(p=>distance(player,p)>13&&distance(player,p)<105&&!this.memories.has(p.id)).sort((a,b)=>distance(player,a)-distance(player,b)).slice(0,4);
  // When landmarks are distant, an intimate riverside encounter keeps the first invitation short.
  const x=player.x+22,h=channel(this.world,Math.round(player.z/160),x),p=nearbyWater(this.world,{x,z:h.center-3});
  if(p&&distance(player,p)<45)candidates.push({id:'eddy:'+Math.floor(x/24)+','+Math.floor(p.z/24),name:'A sheltered bend',...p,type:1});
  candidates.sort((a,b)=>distance(player,a)-distance(player,b));
  for(const place of candidates){
   if(this.memories.has(place.id))continue;
   const path=waterRoute(this.world,this.guide,place);
   if(!path)continue;
   const r=randomFor(this.world.seed+':encounter:'+place.id);
   this.target={...place,kind:this.childrenJoined?'fish':this.completed===0?'ducklings':r()<.5?'fish':'ducklings'};
   this.guide.path=path;this.mode='leading';this.arrived=false;
   this.emit({type:'invitation',text:'Your new friend knows a quiet place. Follow if you like.'});return true;
  }
  this.mode='following';this.target=null;this.emit({type:'response',text:'A little company for the journey.'});return false;
 }
 quack(player,places){
  if(this.time-this.lastCall<1.2)return false;this.lastCall=this.time;
  if(distance(player,this.guide)>20){this.emit({type:'call',text:'Your call carries across the water.'});return true;}
  this.emit({type:'answer',x:this.guide.x,z:this.guide.z});
  if(this.mode==='wild'){this.remember('friend','A stranger answered your quack.');this.chooseDestination(player,places);}
  else if(this.mode==='gathering'&&distance(player,this.target)<8){
   this.mode='following';this.childrenJoined=true;this.completed++;this.nextInvitation=this.time+12;this.remember(this.target.id,'Three little shadows followed you from '+this.target.name+'.');
   this.emit({type:'joined',text:'Three ducklings fall in behind you. You have company.'});
  }else if(this.mode==='following'&&this.time>(this.nextInvitation||0))this.chooseDestination(player,places);
  else this.emit({type:'response',text:this.mode==='leading'?'An answering quack. Your friend waits for you.':'A soft answer from the reeds.'});
  return true;
 }
 dabble(player){
  if(this.time-this.lastDabble<2.5)return false;this.lastDabble=this.time;
  const encounter=this.mode==='watching'&&distance(player,this.target)<8;
  this.emit({type:'fish',x:player.x,z:player.z,special:encounter});
  if(encounter){this.mode='following';this.completed++;this.nextInvitation=this.time+12;this.remember(this.target.id,'Silver fish flashed beneath '+this.target.name+'.');}
  return true;
 }
 move(actor,dt,speed){
  if(!actor.path.length)return;
  let remaining=dt*speed;
  while(remaining>0&&actor.path.length){const p=actor.path[0],d=distance(actor,p);if(d<.02){actor.path.shift();continue;}
   const step=Math.min(d,remaining),next={x:actor.x+(p.x-actor.x)/d*step,z:actor.z+(p.z-actor.z)/d*step};
   if(!clearWater(this.world,actor,next,.4)){actor.path=[];return;}
   const desired=Math.atan2(-(p.x-actor.x),-(p.z-actor.z));actor.yaw+=Math.atan2(Math.sin(desired-actor.yaw),Math.cos(desired-actor.yaw))*Math.min(1,dt*5);
   actor.x=next.x;actor.z=next.z;remaining-=step;if(step>=d)actor.path.shift();
  }
 }
 follow(actor,leader,dt,gap){
  actor.repath-=dt;const d=distance(actor,leader);if(d<gap){actor.path=[];return;}
  if(actor.repath<=0){actor.path=waterRoute(this.world,actor,leader,1600)||[];actor.repath=1.8;}
  this.move(actor,dt,d>7?3:2.35);
 }
 update(dt,player,yaw){
  this.time+=dt;
  if(distance(player,this.guide)>145){this.reset(player,yaw);return;}
  const d=distance(player,this.guide);
  if(this.mode==='leading'){
   if(d<9)this.move(this.guide,dt,d<3?2.3:1.55);
   if(distance(this.guide,this.target)<1.5&&distance(player,this.target)<6){
    this.arrived=true;this.mode=this.target.kind==='ducklings'?'gathering':'watching';
    if(this.target.kind==='ducklings'){
     // Keep the flock bounded: the previous family has settled before a new one joins.
     this.children=[];for(let i=0;i<3;i++){const p=nearbyWater(this.world,{x:this.target.x+1.4+i*.55,z:this.target.z+1.2});if(p)this.children.push({...p,yaw:0,path:[],repath:0});}
     this.emit({type:'arrival',text:'Little peeps from the reeds. Quack to invite them along.'});
    }else this.emit({type:'arrival',text:'Something silver moves below. Dabble to take a look.'});
   }
  }else if(this.mode==='following')this.follow(this.guide,player,dt,2.4);
  if(this.childrenJoined)for(let i=0;i<this.children.length;i++)this.follow(this.children[i],i?this.children[i-1]:player,dt,1+i*.1);
  this.hint=(this.mode==='gathering'||this.mode==='watching')&&distance(player,this.target)>10?'Your friend is waiting at the discovery. Check the map.':this.mode==='wild'?'A duck nearby seems curious. Space · say hello':this.mode==='leading'?(d>10?'Your friend is waiting. Follow the duck or check the map.':'Follow your friend. There’s something around the bend.'):this.mode==='gathering'?'Little peeps in the reeds. Space · invite them along':this.mode==='watching'?'A silver flicker below. E · dabble':this.children.length?'A little procession. E · dabble together · Space · another adventure':'A friend beside you. Space · see where they lead';
 }
 getState(){return {mode:this.mode,guide:{x:this.guide.x,z:this.guide.z},target:this.target?{...this.target}:null,ducklings:this.children.length,followingDucklings:this.childrenJoined?this.children.length:0,memories:[...this.memories.values()],hint:this.hint};}
}
