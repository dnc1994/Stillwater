import * as THREE from 'three';

// Keep Three's planar reflections, with metre-scale ripples and a duck-sized wake.
export function waterGeometry(){
 const positions=[0,0,0],indices=[],rings=112,segments=160;
 for(let ring=0;ring<rings;ring++){
  const radius=.08*Math.pow(40000,ring/(rings-1));
  for(let j=0;j<segments;j++){const a=j/segments*Math.PI*2;positions.push(Math.cos(a)*radius,Math.sin(a)*radius,0);}
 }
 for(let j=0;j<segments;j++)indices.push(0,1+j,1+(j+1)%segments);
 for(let ring=1;ring<rings;ring++)for(let j=0;j<segments;j++){
  const a=1+(ring-1)*segments+j,b=1+(ring-1)*segments+(j+1)%segments,c=a+segments,d=b+segments;
  indices.push(a,c,b,b,c,d);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}

export function refineWater(water){
 const m=water.material;
 Object.assign(m.uniforms,{
  worldOffset:{value:new THREE.Vector2()},
  duckPosition:{value:new THREE.Vector2()},
  duckDirection:{value:new THREE.Vector2(0,-1)},
  paddleStrength:{value:0},
 });
 m.vertexShader=m.vertexShader.replace('uniform float time;', 'uniform float time; uniform vec2 worldOffset;')
 .replace('worldPosition = mirrorCoord.xyzw;', `worldPosition = mirrorCoord.xyzw;
 vec2 p=worldPosition.xz+worldOffset;
 float wave=.014*sin(dot(p,vec2(2.1,1.4))-time*1.7)+.005*sin(dot(p,vec2(-6.2,4.3))+time*2.2);
 worldPosition.y+=wave;`)
 .replace('modelViewMatrix * vec4( position, 1.0 )','viewMatrix * worldPosition');
 m.fragmentShader=m.fragmentShader.replace('uniform float size;',`uniform float size;
 uniform vec2 worldOffset;
 uniform vec2 duckPosition;
 uniform vec2 duckDirection;
 uniform float paddleStrength;`);
 m.fragmentShader=m.fragmentShader.replace('vec4 noise = getNoise( worldPosition.xz * size );',`
 vec2 p=worldPosition.xz+worldOffset;
 vec4 noise=getNoise(p*7.0);
 `).replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',`
 vec2 slope=vec2(
  .035*cos(dot(p,vec2(2.1,1.4))-time*1.7)+.017*cos(dot(p,vec2(-6.2,4.3))+time*2.2),
  .025*cos(dot(p,vec2(2.1,1.4))-time*1.7)+.021*cos(dot(p,vec2(3.7,7.1))-time*2.6));
 vec2 relative=worldPosition.xz-duckPosition;
 float behind=-dot(relative,duckDirection);
 float across=dot(relative,vec2(-duckDirection.y,duckDirection.x));
 float wakeMask=smoothstep(0.0,.35,behind)*exp(-max(behind,0.0)*.34)*paddleStrength;
 float wakeEdge=abs(across)-(.20+max(behind,0.0)*.34);
 float wake=exp(-wakeEdge*wakeEdge*20.0)*sin(wakeEdge*24.0-time*4.0)*wakeMask;
 slope+=vec2(-duckDirection.y,duckDirection.x)*sign(across)*wake*.12;
 vec3 surfaceNormal=normalize(vec3(noise.x*.65+slope.x,1.0,noise.y*.65+slope.y));
 `).replace('float rf0 = 0.3;','float rf0 = 0.02037;')
 .replace('( 0.001 + 1.0 / distance )','( 0.001 + 0.35 / max(distance, 0.5) )')
 .replace('100.0, 2.0, 0.5','160.0, 1.2, 0.5');
 m.needsUpdate=true;
 return m.uniforms;
}
