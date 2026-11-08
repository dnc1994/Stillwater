import * as THREE from 'three';
import {isWater} from './world.js';

export function createWildlife(scene,template,world,ripple){
 const root=new THREE.Group();scene.add(root);
 const guide=template.clone(true);guide.scale.setScalar(1.12);root.add(guide);
 const sphere=new THREE.SphereGeometry(1,16,10),gold=new THREE.MeshStandardMaterial({color:0xbca45e,roughness:.95}),brown=new THREE.MeshStandardMaterial({color:0x4b3a24,roughness:.9}),bill=new THREE.MeshStandardMaterial({color:0xa77840,roughness:.65});
 function part(parent,m,x,y,z,sx,sy,sz){const mesh=new THREE.Mesh(sphere,m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 const babies=[];
 for(let i=0;i<3;i++){const g=new THREE.Group();part(g,gold,0,.09,0,.11,.1,.17);part(g,brown,0,.15,.035,.078,.045,.11);part(g,gold,0,.22,-.09,.09,.09,.09);part(g,bill,0,.2,-.18,.05,.015,.065);for(const s of[-1,1])part(g,brown,s*.075,.235,-.12,.012,.013,.014);root.add(g);babies.push(g);}
 const silver=new THREE.MeshStandardMaterial({color:0xa0b7a4,metalness:.45,roughness:.28});
 const fishes=[];for(let i=0;i<16;i++){const g=new THREE.Group();part(g,silver,0,0,0,.035,.055,.16);const tail=new THREE.Mesh(new THREE.ConeGeometry(.065,.12,3),silver);tail.rotation.x=Math.PI/2;tail.position.z=.18;g.add(tail);g.visible=false;root.add(g);fishes.push({mesh:g,age:10,duration:1});}
 let answer=0,time=0;
 return {
  answer(){answer=1.4;},
  scatter(x,z){for(let i=0;i<fishes.length;i++){const a=i*2.39996,r=.7+(i%5)*.3,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
   const f=fishes[i];if(!isWater(world,px,pz,.3))continue;
   Object.assign(f,{x:px,z:pz,dx:Math.cos(a),dz:Math.sin(a),age:-i*.045,duration:.7+(i%4)*.12});}
  },
  update(dt,model,origin){
   time+=dt;answer=Math.max(0,answer-dt);
   guide.position.set(model.guide.x-origin.x,Math.sin(time*2)*.012,model.guide.z-origin.z);guide.rotation.y=model.guide.yaw;
   const head=guide.getObjectByName('duck-head');head.rotation.x=answer?Math.sin(answer*18)*.12:Math.sin(time*.8)*.035;
   for(let i=0;i<babies.length;i++){const b=babies[i],data=model.children[i];b.visible=!!data;if(data){b.position.set(data.x-origin.x,Math.sin(time*4+i)*.012,data.z-origin.z);b.rotation.y=data.yaw;b.rotation.z=Math.sin(time*4+i)*.035;}}
   for(const f of fishes){f.age+=dt;f.mesh.visible=f.age>=0&&f.age<f.duration;if(!f.mesh.visible)continue;
    const t=f.age/f.duration,travel=t*1.3,x=f.x+f.dx*travel,z=f.z+f.dz*travel;
    if(!isWater(world,x,z,.15)){f.age=f.duration;f.mesh.visible=false;continue;}
    f.mesh.position.set(x-origin.x,-.07+Math.sin(t*Math.PI)*(.13+(f.duration-.7)*.7),z-origin.z);f.mesh.rotation.set(-Math.cos(t*Math.PI)*.65,Math.atan2(-f.dx,-f.dz),Math.sin(t*20)*.2);
    if(f.age+dt>=f.duration)ripple(x,z);
   }
  }
 };
}
