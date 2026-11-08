import * as THREE from 'three';
import {randomFor,waterDistance,terrainHeight,channel,isWater} from './world.js';
export function createScenery(world,materials,duckTemplate){
 const {earth,bark,stone,wood}=materials;
 const mat=(c,r=.9)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
 const sphere=new THREE.SphereGeometry(1,12,8),box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,7),cone=new THREE.ConeGeometry(1,1,6);
 const leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-1,-.4,0,-.3,-.32,0,.5,0,.12,0,.32,0,.5,.4,0,-.3,0,0,1],3));leaf.setIndex([0,1,3,1,2,3,2,6,3,6,4,3,4,5,3,5,0,3]);leaf.computeVertexNormals();
 const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.05,0,0,.05,0,0,.13,.8,.03,0,0,-.05,0,0,.05,-.04,.65,.12],3));blade.computeVertexNormals();
 const pad=new THREE.CircleGeometry(1,20,.08,Math.PI*2-.2);pad.rotateX(-Math.PI/2);
 const foliage=mat(0x638348),bamboo=mat(0x637e3b),reed=mat(0x6f8641),seedMat=mat(0x53402b),rice=mat(0x7ea43d),gold=mat(0xb4a64a),padMat=mat(0x456c38),duckweed=mat(0x90a848),flower=mat(0xeab8bc),purple=mat(0x9c8cc4);
 for(const m of [foliage,reed,rice,gold,padMat,duckweed])m.side=THREE.DoubleSide;
 const soil=mat(0x746747),waterPaddy=mat(0x718675,.22),plaster=mat(0xc6c5af),plasterWarm=mat(0xb9ac90),tiles=mat(0x3c4645),dark=mat(0x25332d),red=mat(0x85453a),glass=mat(0x4b655e,.25),rust=mat(0x795140),metal=mat(0x455955),ropeMat=mat(0x867958),mud=mat(0x6b7052);
 // Shared, seeded surface weathering: peeling hull paint and damp plaster.
 function weatherTexture(kind){const size=128,pixels=new Uint8Array(size*size*4),noise=randomFor('stillwater-'+kind);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,n=noise(),patch=Math.sin(x*.11+Math.sin(y*.08)*2)*Math.cos(y*.16),damp=Math.max(0,1-y/45);let rgb;if(kind==='rust')rgb=patch>.25?[70+n*27,90+n*22,77+n*20]:[105+n*60,65+n*35,40+n*30];else rgb=[225-damp*55+n*15,224-damp*48+n*14,205-damp*42+n*13];pixels.set([...rgb,255],i);}const t=new THREE.DataTexture(pixels,size,size);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
 rust.map=weatherTexture('rust');rust.color.set(0xffffff);rust.bumpMap=rust.map;rust.bumpScale=.025;plaster.map=weatherTexture('plaster');plasterWarm.map=plaster.map;
 const terrainMat=earth.clone();terrainMat.vertexColors=true;terrainMat.color.set(0xd1d7bd);
 const dummy=new THREE.Object3D(),color=new THREE.Color();
 const transform=(x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>[x,y,z,sx,sy,sz,rx,ry,rz];
 function make(g,m,t,parent){const o=new THREE.Mesh(g,m);o.position.set(...t.slice(0,3));o.scale.set(...t.slice(3,6));o.rotation.set(...t.slice(6,9));o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 return {build(data){
  const group=new THREE.Group(),owned=[],birds=[],r=randomFor(world.seed+':rural-art:'+data.id),range=(a,b)=>a+r()*(b-a),lx=x=>x-data.x,lz=z=>z-data.z;
  const inst=(geo,material,arr)=>{if(!arr.length)return;const b=new THREE.InstancedMesh(geo,material,arr.length);b.castShadow=b.receiveShadow=true;arr.forEach((t,i)=>{dummy.position.set(...t.slice(0,3));dummy.scale.set(...t.slice(3,6));dummy.rotation.set(...t.slice(6,9));dummy.updateMatrix();b.setMatrixAt(i,dummy.matrix);});b.computeBoundingSphere();group.add(b);return b;};
  const add=(g,m,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,parent=group)=>make(g,m,transform(x,y,z,sx,sy,sz,rx,ry,rz),parent);
  // One continuous elevation field; adjacent chunks sample identical edges.
  const vertices=[],uv=[],colors=[],indices=[],n=64,step=160/n;
  for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){const x=data.x+i*step,z=data.z+j*step,d=waterDistance(world,x,z);let h=terrainHeight(world,x,z);for(const f of data.fields){const blend=Math.max(0,Math.min(1,(11-Math.abs(x-f.x))/2,(8-Math.abs(z-f.z))/2));h+=(f.y-.12-h)*blend;}vertices.push(i*step,h,j*step);uv.push(i*step/100,j*step/100);color.set(d<1.5?0x8e8963:d<5?0x8e9a64:0x96ae71);const shade=1+Math.sin(x*.18)*Math.cos(z*.13)*.065;color.multiplyScalar(shade);colors.push(color.r,color.g,color.b);}
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const terrain=new THREE.BufferGeometry();terrain.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));terrain.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(vertices.length),3));terrain.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));terrain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrain.setIndex(indices);terrain.computeVertexNormals();owned.push(terrain);add(terrain,terrainMat,0,0,0);
  const trunks=[],leaves=[],canes=[],nodes=[],reeds=[],heads=[],shoreRocks=[],grassTufts=[],pads=[],lotusStems=[],petals=[],weed=[],arrowLeaves=[];
  // Sample bank vegetation in clumps, with a clear central navigation lane.
  for(let i=0;i<1500;i++){
   const x=data.x+range(1,159),z=data.z+range(1,159),d=waterDistance(world,x,z);if(d>-.3&&d<2.3){const y=Math.max(0,terrainHeight(world,x,z));if(i%7===0)shoreRocks.push(transform(lx(x),y-.13,lz(z),range(.3,.9),range(.2,.5),range(.4,1),r(),r(),r()));
    const density=data.biome===5?7:4;for(let k=0;k<density;k++){const h=range(.6,2.1),xx=lx(x)+range(-.7,.7),zz=lz(z)+range(-.7,.7);reeds.push(transform(xx,y+h/2-.12,zz,.022,h,.022,range(-.12,.12),r()*6.28,range(-.1,.1)));if(k===0)heads.push(transform(xx,y+h-.2,zz,.065,.32,.065));grassTufts.push(transform(xx,y,zz,range(.5,1.4),range(.6,1.5),1,0,r()*6.28,range(-.25,.25)));}
   }
  }
  // Trees concentrate along water and leave cultivated ground open.
  let treeCount=0;const maxTrees=data.biome===4?10:data.biome===3?22:25;
  for(let i=0;i<500&&treeCount<maxTrees;i++){
   const x=data.x+range(8,152),z=data.z+range(8,152),d=waterDistance(world,x,z);if(d<3||d>18||data.houses.some(h=>Math.hypot(x-h.x,z-h.z)<12)||data.fields.some(f=>Math.abs(x-f.x)<13&&Math.abs(z-f.z)<10))continue;
   const base=terrainHeight(world,x,z),willow=data.biome!==3&&r()<.65,h=range(7,14),xx=lx(x),zz=lz(z);treeCount++;
   if(data.biome===3){for(let j=0;j<6;j++){const ax=xx+range(-1.8,1.8),az=zz+range(-1.8,1.8),bh=range(7,13);canes.push(transform(ax,base+bh/2,az,.09,bh,.09,range(-.07,.07),0,range(-.07,.07)));for(let k=1;k<bh;k+=.8)nodes.push(transform(ax,base+k,az,.115,.08,.115));for(let k=0;k<70;k++){const a=r()*6.28,rad=range(.4,2.2);leaves.push(transform(ax+Math.cos(a)*rad,base+bh-range(0,4),az+Math.sin(a)*rad,.18,.4,range(.3,.65),r()*2,r()*6.28,r()*2));}}}
   else{trunks.push(transform(xx,base+h*.4,zz,.32,h*.8,.32,0,0,.05));for(let j=0;j<5;j++){const a=j/5*6.28;trunks.push(transform(xx+Math.cos(a)*1.2,base+h*.68,zz+Math.sin(a)*1.2,.13,h*.35,.13,Math.sin(a)*.7,0,Math.cos(a)*.7));}
    for(let j=0;j<360;j++){const a=r()*6.28,t=Math.cbrt(r()),v=range(-1,1),w=Math.sqrt(1-v*v),rad=h*.36*t;const y=willow?base+h*.88-(rad/(h*.36))**2*h*.44+v*h*.14:base+h*.8+v*t*h*.3;leaves.push(transform(xx+Math.cos(a)*w*rad,y,zz+Math.sin(a)*w*rad,willow?.18:.38,.4,willow?.75:.48,willow?1.1:r()*3,r()*6.28,r()*3));}
    if(willow)for(let j=0;j<28;j++){const a=r()*6.28,rad=range(h*.2,h*.33),length=range(1.5,4);canes.push(transform(xx+Math.cos(a)*rad,base+h*.65-length/2,zz+Math.sin(a)*rad,.018,length,.018));}
   }
  }
  // Lotus, arrowhead leaves and duckweed fill sheltered margins and backwaters.
  const p=data.pond;
  for(let i=0;i<(data.biome===1?230:85);i++){const a=r()*6.28,rr=Math.sqrt(r()),x=p.x+Math.cos(a)*rr*p.rx*.94,z=p.z+Math.sin(a)*rr*p.rz*.92;if(waterDistance(world,x,z)>-1)continue;const s=range(.3,.8);pads.push(transform(lx(x),.04,lz(z),s,1,s,0,r()*6.28));if(i%9===0){const h=range(.2,.7);lotusStems.push(transform(lx(x),h/2,lz(z),.018,h,.018));for(let j=0;j<8;j++){const a=j/8*6.28;petals.push(transform(lx(x)+Math.cos(a)*.12,h,lz(z)+Math.sin(a)*.12,.09,.065,.23,.4,a,0));}}if(i%4===0){arrowLeaves.push(transform(lx(x),.35,lz(z),.28,.8,.7,1.0,r()*6.28));}}
  if(data.biome===5||data.biome===1)for(let i=0;i<450;i++){const a=r()*6.28,rr=range(.65,1),x=p.x+Math.cos(a)*rr*p.rx,z=p.z+Math.sin(a)*rr*p.rz;if(waterDistance(world,x,z)<-.3)weed.push(transform(lx(x),.025,lz(z),range(.08,.24),1,range(.08,.24),0,r()*6.28));}
  inst(cylinder,bark,trunks);inst(leaf,foliage,leaves);inst(cylinder,bamboo,canes);inst(cylinder,foliage,nodes);inst(cylinder,reed,reeds);inst(cylinder,seedMat,heads);inst(sphere,stone,shoreRocks);inst(blade,reed,grassTufts);inst(pad,padMat,pads);inst(cylinder,reed,lotusStems);inst(sphere,flower,petals);inst(leaf,foliage,arrowLeaves);inst(pad,duckweed,weed);
  // Flooded paddies, planted rows, and raised earth bunds.
  const greenRice=[],goldRice=[];
  for(const f of data.fields){const x=lx(f.x),z=lz(f.z),y=f.y+.1;add(box,soil,x,y-.1,z,20,.35,14);add(box,waterPaddy,x,y+.09,z,18,.06,12);
   for(const side of[-1,1]){add(box,soil,x+side*9.5,y+.2,z,.6,.3,14);add(box,soil,x,y+.2,z+side*6.5,20,.3,.6);}
   const arr=f.gold?goldRice:greenRice;for(let ix=-8;ix<=8;ix+=.8)for(let iz=-5;iz<=5;iz+=.8)arr.push(transform(x+ix+range(-.1,.1),y+.12,z+iz+range(-.1,.1),1,range(.45,.85),1,0,r()*6.28));
  }inst(blade,rice,greenRice);inst(blade,gold,goldRice);
  // Whitewashed waterside houses, tiled curved eaves, timber doors and mooring steps.
  for(const h of data.houses){const house=new THREE.Group();house.position.set(lx(h.x),h.y,lz(h.z));house.rotation.y=h.rotation;group.add(house);const w=h.width,l=h.length,H=h.height;
   add(box,stone,0,.3,0,w+.5,.6,l+.5,0,0,0,house);add(box,h.warm>.5?plaster:plasterWarm,0,H/2+.5,0,w,H,l,0,0,0,house);
   add(box,wood,0,1.8,l/2+.04,1.7,2.8,.12,0,0,0,house);for(const side of[-1,1]){add(box,dark,side*w*.3,H*.55,l/2+.06,1.3,1.5,.1,0,0,0,house);for(let k=-1;k<=1;k++)add(box,wood,side*w*.3+k*.35,H*.55,l/2+.13,.045,1.5,.1,0,0,0,house);}
   // Each roof half has a rising eave and a pitched tiled surface.
   for(const side of[-1,1])for(let j=0;j<8;j++){const t=(j+.5)/8,x=side*t*(w/2+1),y=H+2.2-t*1.65+Math.max(0,t-.7)**2*5;add(box,tiles,x,y,0,(w/2+1)/8+.07,.18,l+1.5,0,0,-side*.25,house);for(let k=-Math.floor(l);k<=Math.floor(l);k++)add(cylinder,tiles,x,y+.09,k*.5,.07,(w/2+1)/8+.1,.07,0,0,Math.PI/2,house);}
   add(cylinder,tiles,0,H+2.25,0,.19,l+1.7,.19,Math.PI/2,0,0,house);
   for(let j=0;j<6;j++)add(box,stone,0,.15-j*.16,l/2+1+j*.6,3,.3,.7,0,0,0,house);
   add(cylinder,red,w*.35,H*.7,l/2+.6,.25,.6,.25,0,0,0,house);
  }
  // Actual traversable bridge arches, railings and abutments.
  if(data.bridge){const b=data.bridge,g=new THREE.Group();g.position.set(lx(b.x),0,lz(b.z));g.rotation.y=b.rotation;group.add(g);const deck=b.stone?stone:wood,segments=30;
   for(let i=0;i<segments;i++){const u=(i+.5)/segments*2-1,x=u*b.half,y=b.stone?1.1+b.height*Math.sqrt(Math.max(0,1-u*u)):b.height;const angle=b.stone?Math.atan(-b.height*u/(b.half*Math.sqrt(Math.max(.02,1-u*u)))):0;
    add(box,deck,x,y,0,b.half*2/segments+.1,.6,3.6,0,0,angle,g);
    if(i%3===0)for(const side of[-1,1]){add(box,deck,x,y+.65,side*1.65,.22,1.1,.22,0,0,0,g);add(box,deck,x,y+1.1,side*1.65,b.half*6/segments+.12,.15,.18,0,0,angle,g);}
   }
   for(const side of[-1,1]){add(box,stone,side*(b.half-.9),.7,0,2.5,1.8,4.5,0,0,0,g);if(!b.stone)for(let z of[-1.5,1.5])add(cylinder,wood,side*(b.half-1),1.4,z,.18,3.5,.18,0,0,0,g);}
  }
  // Abandoned freight barge: open hold, sloping bow, rusty ribs, cabin, rope and cargo.
  if(data.barge){const b=data.barge,g=new THREE.Group();g.position.set(lx(b.x),.08,lz(b.z));g.rotation.set(b.tilt,b.rotation,b.tilt*.5);group.add(g);const L=b.length;
   add(box,rust,0,.06,0,4,.5,L,0,0,0,g);add(box,dark,0,.34,0,3.6,.08,L-1,0,0,0,g);
   for(const side of[-1,1]){add(box,rust,side*1.95,.75,0,.18,1.4,L,0,0,0,g);for(let j=-L/2+1;j<L/2;j+=2)add(box,metal,side*1.83,.75,j,.16,1.1,.15,0,0,.12*side,g);}
   for(const end of[-1,1])add(box,rust,0,.55,end*L/2,4,1.1,.2,.25*end,0,0,g);
   add(box,metal,0,1.6,-L*.31,3.2,2.3,3.3,0,0,0,g);add(box,plasterWarm,0,2.8,-L*.31,3.7,.22,3.8,0,0,0,g);add(box,glass,0,2,-L*.31+1.69,2.4,.8,.08,0,0,0,g);add(cylinder,metal,1.1,3.5,-L*.34,.16,1.5,.16,0,0,.1,g);
   for(let i=0;i<6;i++)add(box,wood,range(-1,1),.8,range(-L*.1,L*.35),range(.7,1.3),range(.4,.9),range(.7,1.4),0,r()*.6,0,g);
   const coil=new THREE.TorusGeometry(.48,.055,5,24);owned.push(coil);for(let j=0;j<4;j++)add(coil,ropeMat,-.9,.5+j*.06,L*.35,1,1,1,Math.PI/2,0,0,g);
  }
  // Small skiff and fishing stakes on occasional banks.
  if(data.biome===0||data.biome===2){const x=data.x+35,h=channel(world,data.cz,x),z=h.center-h.width*.7,g=new THREE.Group();g.position.set(lx(x),.06,lz(z));g.rotation.y=Math.PI/2;group.add(g);add(sphere,wood,0,.08,0,.75,.28,2.8,0,0,0,g);add(box,dark,0,.22,0,1.1,.1,4.5,0,0,0,g);for(let j=-1;j<=1;j++)add(box,wood,0,.3,j*1.2,1.25,.12,.3,0,0,0,g);add(cylinder,wood,.8,.65,0,.035,4,.035,0,0,.75,g);}
  const dynamicMeshes=new Set();
  for(let i=0;i<2;i++){const x=data.x+range(15,145),h=channel(world,data.cz,x),z=h.center-h.width*.3,obj=duckTemplate.clone(true);group.add(obj);obj.traverse(o=>dynamicMeshes.add(o));birds.push({obj,x:lx(x),z:lz(z),phase:r()*6.28,radius:1.2});}
  // Batch static prop parts after composing them in local groups.
  group.updateMatrixWorld(true);const batches=new Map();group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!dynamicMeshes.has(o)){const key=o.geometry.uuid+':'+o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);}});
  for(const list of batches.values()){if(list.length<4)continue;const batch=new THREE.InstancedMesh(list[0].geometry,list[0].material,list.length);list.forEach((o,i)=>{batch.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});batch.castShadow=batch.receiveShadow=true;batch.computeBoundingSphere();group.add(batch);}
  return{data,group,birds,dispose(){group.removeFromParent();group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});for(const geo of owned)geo.dispose();}};
 },dispose(item){item.dispose();}};
}
