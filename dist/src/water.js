// water.js — still, jade-green river water: a true planar reflection, softened by slow
// ripples, with rings that spread from anything that touches the surface.
import * as THREE from 'three';
import { Water } from '../vendor/Water.js';
import { SIZE, N } from './world.js';

const RINGS = 32;
const FRAG = /* glsl */ `
uniform sampler2D mirrorSampler, normalSampler, uSdf;
uniform float time, uRain, uNight, uMirror;
uniform vec3 eye, sunDirection, sunColor, uDeep, uShallow, uLight;
uniform vec4 uRing[${RINGS}];
varying vec4 mirrorCoord, worldPosition;
#include <common>
#include <fog_pars_fragment>
void main(){
  vec2 p = worldPosition.xz;
  vec3 toEye = eye - worldPosition.xyz;
  float dist = length(toEye);
  vec3 V = toEye / dist;
  float near = smoothstep(26., 2., dist);
  vec2 n = (texture2D(normalSampler, p * .043 + vec2(time * .011, time * .007)).xy - .5) * .9
         + (texture2D(normalSampler, p * .13 - vec2(time * .017, -time * .012)).xy - .5) * .6
         + (texture2D(normalSampler, p * .55 + vec2(-time * .03, time * .04)).xy - .5) * (.5 * near + uRain * 1.6 * smoothstep(60., 4., dist));
  n *= .3 + uRain * .25;
  float glint = 0.;
  for (int i = 0; i < ${RINGS}; i++) {
    vec4 R = uRing[i];
    float age = time - R.z;
    if (age < 0. || age > 6.) continue;
    vec2 dv = p - R.xy; float r = length(dv);
    if (r > 8.) continue;
    float front = age * .85 + .12;
    float off = (r - front) * 1.5;
    float env = R.w * exp(-age * .62) * exp(-off * off);
    float wave = cos((r - front) * 9.5);
    n += dv / max(r, .02) * wave * env * .16;
    glint += wave * env;
  }
  vec3 Nw = normalize(vec3(n.x, 1., n.y));
  float fres = .1 + .9 * pow(1. - max(dot(V, normalize(vec3(n.x * .45, 1., n.y * .45))), 0.), 4.);
  vec2 uv = clamp(mirrorCoord.xy / mirrorCoord.w + Nw.xz * (.012 + .22 / (dist + 3.)), .002, .998);
  vec3 refl = texture2D(mirrorSampler, uv).rgb * vec3(.9, .97, .93);
  float d = (texture2D(uSdf, (p + ${SIZE.toFixed(1)}) / ${(2 * SIZE).toFixed(1)}).r * 255. - 128.) / 12.;
  float shallow = smoothstep(-3.2, -.1, d);
  vec3 body = mix(uDeep, uShallow, shallow * .8) * uLight;
  vec3 col = mix(body, refl, clamp(fres * .9 * uMirror, 0., 1.));
  vec3 Rv = reflect(-sunDirection, Nw);
  col += sunColor * pow(max(dot(Rv, V), 0.), 140.) * .55 * (1. - uNight);
  col += uLight * (glint * .05 + smoothstep(-.32, -.04, d) * .07);
  gl_FragColor = vec4(col, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function createWater(world, scene, quality) {
  const normals = new THREE.TextureLoader().load('./assets/waternormals.jpg');
  normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
  const res = quality > 1 ? 1024 : 512;
  const water = new Water(new THREE.PlaneGeometry(2400, 2400), { textureWidth: res, textureHeight: res, waterNormals: normals, fog: true });
  water.rotation.x = -Math.PI / 2;
  water.frustumCulled = false;

  const bytes = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) bytes[i] = Math.max(0, Math.min(255, world.grid[i] * 12 + 128));
  const sdfTex = new THREE.DataTexture(bytes, N, N, THREE.RedFormat);
  sdfTex.magFilter = sdfTex.minFilter = THREE.LinearFilter; sdfTex.unpackAlignment = 1; sdfTex.needsUpdate = true;

  const rings = Array.from({ length: RINGS }, () => new THREE.Vector4(0, 0, -99, 0));
  const u = water.material.uniforms;
  Object.assign(u, {
    uSdf: { value: sdfTex }, uRing: { value: rings }, uRain: { value: 0 }, uNight: { value: 0 }, uMirror: { value: 1 },
    uDeep: { value: new THREE.Color('#44695e') }, uShallow: { value: new THREE.Color('#96ad8e') }, uLight: { value: new THREE.Color(1, 1, 1) },
  });
  water.material.fragmentShader = FRAG;
  water.material.needsUpdate = true;
  scene.add(water);

  // Seen from below, the surface is a pale, bright ceiling.
  const under = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: '#b9d8b0', side: THREE.BackSide, transparent: true, opacity: 0.85, fog: true }));
  under.rotation.x = -Math.PI / 2; under.position.y = -0.005;
  scene.add(under);

  // The mirror pass draws the whole scene a second time. Leave out what would never be noticed,
  // and on modest hardware refresh the reflection every other frame.
  const mirror = water.onBeforeRender, skip = [];
  let frame = 0, half = quality < 2;
  water.onBeforeRender = (renderer, sc, cam) => {
    if (half && frame++ % 2) return;
    for (const o of skip) o.visible = false;
    mirror(renderer, sc, cam);
    for (const o of skip) o.visible = true;
  };

  let next = 0;
  return {
    mesh: water, under, skip,
    set half(v) { half = v; },
    ring(x, z, strength = 1) { rings[next].set(x, z, u.time.value, strength); next = (next + 1) % RINGS; },
    update(env, focus, dt) {
      u.time.value += dt;
      u.sunDirection.value.copy(env.lightDir); u.sunColor.value.copy(env.sunCol);
      u.uRain.value = env.rain; u.uNight.value = env.night;
      const L = u.uLight.value.copy(env.hemi.color).multiplyScalar(env.hemi.intensity * 0.8), k = env.sun.intensity * 0.12;
      L.r += env.sunCol.r * k; L.g += env.sunCol.g * k; L.b += env.sunCol.b * k;
      water.position.set(Math.round(focus.x / 40) * 40, 0, Math.round(focus.z / 40) * 40);
      under.position.x = focus.x; under.position.z = focus.z;
    },
  };
}
