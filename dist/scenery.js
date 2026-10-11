import * as THREE from 'three';
import {randomFor,islandRadius,islandPoint,islandDistance,isWater} from './world.js';
// Shared assets stay alive; each unloaded chunk frees only its own GPU buffers.
export function createScenery(world,materials,duckTemplate){
 const {earth,bark,stone,wood}=materials,mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.9});
 const sphere=new THREE.SphereGeometry(1,12,8),box=new THREE.BoxGeometry(1,1,1),trunkGeo=new THREE.CylinderGeometry(.3,.6,1,6),reedGeo=new THREE.CylinderGeometry(.02,.04,1,4);
 const leafGeo=new THREE.BufferGeometry();leafGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-1,-.35,0,-.4,-.42,0,.2,0,.15,0,.42,0,.2,.35,0,-.4,0,0,1],3));leafGeo.setIndex([0,1,3,1,2,3,2,6,3,6,4,3,4,5,3,5,0,3]);leafGeo.computeVertexNormals();
 const leafMat=mat(0x758350);leafMat.side=THREE.DoubleSide;
 const padGeo=new THREE.CircleGeometry(1,20,.1,Math.PI*2-.25);padGeo.rotateX(-Math.PI/2);const padMat=mat(0x496f37),reedMat=mat(0x697347),wallMat=mat(0x6b776b),roofMat=mat(0x494b42),darkMat=mat(0x172d28),windowMat=mat(0xbcb088),petalMat=mat(0xf6edc6);
 const dummy=new THREE.Object3D(),color=new THREE.Color();
 function make(g,m,x,y,z,sx,sy,sz,parent){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 return {build(data){
  const group=new THREE.Group(),owned=[],birds=[],rng=randomFor(world.seed+':scenery:'+data.id),range=(a,b)=>a+rng()*(b-a);
  const local=p=>({x:p.x-data.x,z:p.z-data.z});
  const batch=(geo,material,count)=>{const o=new THREE.InstancedMesh(geo,material,count);o.castShadow=o.receiveShadow=true;group.add(o);return o;};
  const set=(batch,index,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>{dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();batch.setMatrixAt(index,dummy.matrix);};
  for(const q of data.islands){
   const v=[],uv=[],indices=[],segments=64,rings=10;
   for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){const p=local(islandPoint(q,i/segments*Math.PI*2,j/rings));v.push(p.x,.06+q.height*Math.pow(1-(j/rings)**2,1.2),p.z);uv.push(p.x/100,p.z/100);}
   for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();owned.push(geo);make(geo,earth,0,0,0,1,1,1,group);
   const trees=Math.floor(q.r*q.density),leavesPerTree=420,leaves=batch(leafGeo,leafMat,trees*leavesPerTree),trunks=batch(trunkGeo,bark,trees*4),rocks=batch(sphere,stone,36),reeds=batch(reedGeo,reedMat,260);
   for(let i=0;i<trees;i++){const p=local(islandPoint(q,range(0,Math.PI*2),Math.sqrt(rng())*.8)),u=islandDistance(q,p.x+data.x,p.z+data.z),base=.06+q.height*Math.pow(1-u*u,1.2),h=range(7,15);
    set(trunks,i*4,p.x,base+h/2,p.z,.7,h,.7);
    for(let b=1;b<4;b++){const a=range(0,6.28);set(trunks,i*4+b,p.x+Math.sin(a)*h*.1,base+h*.65,p.z+Math.cos(a)*h*.1,.22,h*.4,.22,Math.cos(a)*.65,0,Math.sin(a)*.65);}
    for(let j=0;j<leavesPerTree;j++){const a=range(0,6.28),v=range(-1,1),r=Math.cbrt(rng()),w=Math.sqrt(1-v*v),idx=i*leavesPerTree+j;set(leaves,idx,p.x+Math.cos(a)*w*r*h*.4,base+h*.8+v*r*h*.34,p.z+Math.sin(a)*w*r*h*.4,range(.25,.55),range(.3,.7),range(.3,.65),rng()*3,rng()*3,rng()*3);color.setHSL(range(.19,.28),range(.23,.45),range(.18,.38));leaves.setColorAt(idx,color);}
   }
   for(let i=0;i<36;i++){const p=local(islandPoint(q,range(0,6.28),range(.99,1.025)));set(rocks,i,p.x,-.12,p.z,range(.5,1.4),range(.35,.7),range(.5,1.3),rng(),rng(),rng());}
   for(let i=0;i<260;i++){const p=local(islandPoint(q,range(0,6.28),range(1.01,1.07))),h=range(.8,2);set(reeds,i,p.x,h/2-.15,p.z,1,h,1,range(-.15,.15),0,range(-.15,.15));}
  }
  for(const p of data.places){
   if(p.type===0||p.type===3||p.type===4){const count=p.type===0?110:35,pads=batch(padGeo,padMat,count);for(let i=0;i<count;i++){const x=p.x+range(-12,12),z=p.z+range(-10,10),s=range(.25,.65);set(pads,i,x-data.x,.04,z-data.z,isWater(world,x,z,.5)?s:0,1,s,0,rng()*6.28);if(i%12===0&&isWater(world,x,z,1))make(sphere,petalMat,x-data.x,.14,z-data.z,.18,.08,.18,group);}}
  }
  if(data.cabin){const c=new THREE.Group(),p=local(data.cabin);c.position.set(p.x,0,p.z);c.rotation.y=data.cabin.rotation;group.add(c);
   make(box,wood,0,1.1,3,11,.35,13,c);make(box,wallMat,0,3.2,2,8,4,7,c);make(box,darkMat,0,2.8,5.6,2.2,3,.08,c);
   for(let i=0;i<23;i++)make(box,wood,0,.65,12+i*.43,3.1,.15,.4,c);
   for(let i=0;i<6;i++)for(const side of[-1,1])make(box,bark,side*1.8,.5,13+i*1.7,.2,2,.2,c);
   for(const side of[-1,1]){make(box,roofMat,side*2.15,5.85,2,5.3,.22,8.5,c).rotation.z=-side*.4;make(box,windowMat,side*2.65,3.5,5.63,1.15,1.2,.1,c);}
  }
  if(data.arch){const a=new THREE.Group(),p=local(data.arch);a.position.set(p.x,0,p.z);a.rotation.y=data.arch.rotation;group.add(a);for(let i=0;i<15;i++){const t=i/14*Math.PI;make(box,stone,Math.cos(t)*6,Math.sin(t)*5+.4,0,1.45,1.25,3,a).rotation.z=t-Math.PI/2;}for(const side of[-1,1])make(box,stone,side*6,.8,0,2,2,3,a);}
  for(let i=0;i<2;i++){const obj=duckTemplate.clone(true),x=range(8,20),z=range(8,20);group.add(obj);birds.push({obj,x,z,phase:rng()*6.28});}
  // Force bounds once, before the frame budget is spent on rendering/reflection.
  group.traverse(o=>{if(o.isInstancedMesh){o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();}});
  return {data,group,birds,dispose(){group.removeFromParent();group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});for(const g of owned)g.dispose();}};
 },dispose(item){item.dispose();}};
}
