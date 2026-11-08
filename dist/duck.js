import * as THREE from 'three';

// Generated photographic-style feather texture is bundled for offline/static hosting.
function plumage(){
 const texture=new THREE.TextureLoader().load('./assets/duck-feathers.jpg');
 texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(2,2);texture.anisotropy=8;return texture;
}

export function createDuck(){
 const g=new THREE.Group(),tex=plumage();
 const feather=new THREE.MeshStandardMaterial({map:tex,bumpMap:tex,bumpScale:.003,roughness:.87,color:0xf0e4d2});
 const wing=feather.clone();wing.color.set(0x9d896d);
 const sphere=new THREE.SphereGeometry(1,32,24),back=sphere.clone();
 // Project along the back so the feathers do not converge at a sphere's pole.
 const vertices=back.attributes.position,uv=back.attributes.uv;
 for(let i=0;i<vertices.count;i++)uv.setXY(i,vertices.getX(i)*.5+.5,vertices.getZ(i)*.5+.5);
 const part=(geometry,material,x,y,z,sx=1,sy=1,sz=1,parent=g)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 part(back,feather,0,.12,.06,.22,.17,.37);
 for(const side of [-1,1]){
  part(back,wing,side*.16,.16,.1,.095,.12,.29);
  // Layered primary feathers give the wing a real silhouette when looking down.
  for(let i=0;i<7;i++){const f=part(sphere,wing,side*(.13+i*.011),.19-i*.009,.22+i*.018,.023,.025,.17);f.rotation.y=side*(.1+i*.035);}
 }
 const head=new THREE.Group();head.position.set(0,.24,-.18);g.add(head);
 const profile=[[.087,0],[.083,.06],[.064,.14],[.057,.23],[.07,.29],[.089,.33]].map(([x,y])=>new THREE.Vector2(x,y));
 part(new THREE.LatheGeometry(profile,32),feather,0,0,0,1,1,1,head);
 part(sphere,feather,0,.34,-.018,.091,.101,.12,head);
 const bill=new THREE.MeshStandardMaterial({color:0x8d7343,roughness:.55});
 part(sphere,bill,0,.305,-.155,.066,.019,.095,head);
 const eye=new THREE.MeshStandardMaterial({color:0x100e09,roughness:.13});
 for(const side of [-1,1])part(sphere,eye,side*.079,.365,-.06,.012,.013,.012,head);
 head.name='duck-head';
 return g;
}
