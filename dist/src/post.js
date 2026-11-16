// post.js — what the lens does to the picture: mist lying on the water, light shafts from a low sun,
// a soft bloom on bright things, then tone, colour, vignette and a little grain.
import * as THREE from 'three';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const DOWN = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThresh; varying vec2 vUv;
vec3 s(vec2 o){ return texture2D(tSrc, vUv + o * uTexel).rgb; }
void main(){
  vec3 c = (s(vec2(-1., -1.)) + s(vec2(1., -1.)) + s(vec2(-1., 1.)) + s(vec2(1., 1.))) * .25;
  if (uThresh > 0.) { float l = max(c.r, max(c.g, c.b)); c = min(c * smoothstep(uThresh, uThresh + .9, l), vec3(10.)); }
  gl_FragColor = vec4(c, 1.);
}`;
const UP = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
vec3 s(float x, float y){ return texture2D(tSrc, vUv + vec2(x, y) * uTexel).rgb; }
void main(){
  vec3 c = s(0., 0.) * 4. + (s(-1., 0.) + s(1., 0.) + s(0., -1.) + s(0., 1.)) * 2. + s(-1., -1.) + s(1., -1.) + s(-1., 1.) + s(1., 1.);
  gl_FragColor = vec4(c / 16., 1.);
}`;
const RAYS = /* glsl */ `
uniform sampler2D tColor, tDepth; uniform vec2 uSun; varying vec2 vUv;
void main(){
  vec2 stp = (uSun - vUv) / 30. * .92, uv = vUv; float acc = 0., w = 1.;
  for (int i = 0; i < 30; i++) {
    uv += stp;
    float sky = step(.99999, texture2D(tDepth, uv).r);
    acc += sky * min(dot(texture2D(tColor, uv).rgb, vec3(.3, .6, .1)), 3.) * w; w *= .965;
  }
  gl_FragColor = vec4(vec3(acc / 30.), 1.);
}`;
const FINAL = /* glsl */ `
uniform sampler2D tColor, tDepth, tBloom, tRays;
uniform mat4 uProjInv, uCamWorld;
uniform vec3 uCamPos, uMistCol, uSunCol, uSunDir;
uniform vec2 uSun, uRes;
uniform float uMist, uMistH, uBloom, uRay, uTime, uUnder, uExposure;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 neutral(vec3 c){      // Khronos PBR Neutral: keeps hues, rolls off highlights
  float x = min(c.r, min(c.g, c.b)), off = x < .08 ? x - 6.25 * x * x : .04; c -= off;
  float peak = max(c.r, max(c.g, c.b)); if (peak < .76) return c;
  float d = .24, np = 1. - d * d / (peak + d - .76); c *= np / peak;
  return mix(c, vec3(np), 1. - 1. / (.15 * (peak - np) + 1.));
}
void main(){
  vec3 col = texture2D(tColor, vUv).rgb;
  float depth = texture2D(tDepth, vUv).r;
  vec4 v = uProjInv * vec4(vUv * 2. - 1., depth * 2. - 1., 1.); v /= v.w;
  vec3 ray = (uCamWorld * v).xyz - uCamPos; float L = length(ray); vec3 dir = ray / L;
  if (depth > .99999) L = 650.;
  // mist that thins with height: thick over the water, gone by the rooftops
  float y0 = max(uCamPos.y, 0.), y1 = max(y0 + dir.y * L, 0.), dy = (y1 - y0) / uMistH;
  float e0 = exp(-y0 / uMistH), e1 = exp(-y1 / uMistH);
  float mist = (1. - exp(-uMist * L * (abs(dy) > .001 ? (e0 - e1) / dy : e0))) * (1. - uUnder);
  float toSun = max(dot(dir, uSunDir), 0.);
  col = mix(col, uMistCol + uSunCol * (pow(toSun, 5.) * .3 + pow(toSun, 36.) * .5), mist);
  col += texture2D(tBloom, vUv).rgb * uBloom;
  col += texture2D(tRays, vUv).r * uSunCol * uRay * (1. - .6 * smoothstep(0., .9, distance(vUv, uSun)));
  col = neutral(col * uExposure);
  float l = dot(col, vec3(.2126, .7152, .0722));
  col = mix(vec3(l), col, 1.12);
  col = mix(col, col * col * (3. - 2. * col), .22);
  col += vec3(-.004, .008, .016) * (1. - l) + vec3(.016, .008, -.012) * l;      // cool shadows, warm lights
  vec2 q = vUv - .5; col *= 1. - dot(q, q) * .5;
  col += (hash(vUv * uRes + fract(uTime) * 91.7) - .5) * (.006 + .018 * l);
  col = clamp(col, 0., 1.);
  gl_FragColor = vec4(mix(col * 12.92, 1.055 * pow(col, vec3(1. / 2.4)) - .055, step(.0031308, col)), 1.);
}`;

export function createPost(renderer) {
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const quad = new THREE.Mesh(tri), stage = new THREE.Scene(), cam = new THREE.Camera();
  quad.frustumCulled = false; stage.add(quad);
  const pass = (frag, uniforms, extra = {}) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, ...extra });
  const draw = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(stage, cam); };

  const down = pass(DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThresh: { value: 0 } });
  const up = pass(UP, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } }, { blending: THREE.AdditiveBlending, transparent: true });
  const rays = pass(RAYS, { tColor: { value: null }, tDepth: { value: null }, uSun: { value: new THREE.Vector2() } });
  const U = {
    tColor: { value: null }, tDepth: { value: null }, tBloom: { value: null }, tRays: { value: null },
    uProjInv: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
    uMistCol: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() },
    uSun: rays.uniforms.uSun, uRes: { value: new THREE.Vector2() },
    uMist: { value: 0 }, uMistH: { value: 2.4 }, uBloom: { value: 0.5 }, uRay: { value: 0 }, uTime: { value: 0 }, uUnder: { value: 0 }, uExposure: { value: 1.0 },
  };
  const final = pass(FINAL, U);

  let main, mips = [], rayRT, levels = 5;
  const half = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  function setSize() {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2()), w = size.x, h = size.y;
    main?.dispose(); mips.forEach((m) => m.dispose()); rayRT?.dispose();
    main = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(w, h, THREE.FloatType) });
    mips = Array.from({ length: levels }, (_, i) => new THREE.WebGLRenderTarget(Math.max(2, w >> (i + 1)), Math.max(2, h >> (i + 1)), half));
    rayRT = new THREE.WebGLRenderTarget(Math.max(2, w >> 2), Math.max(2, h >> 2), half);
    U.uRes.value.set(w, h);
  }
  setSize();

  const sunPos = new THREE.Vector3(), fwd = new THREE.Vector3();
  return {
    setSize,
    // Draw the scene through the lens. `env` supplies the light and mist of the hour.
    render(scene, camera, env, under) {
      const keep = renderer.autoClear;
      renderer.setRenderTarget(main); renderer.render(scene, camera);

      // bloom: bright parts, blurred wider and wider, then gathered back up
      let src = main;
      mips.forEach((m, i) => { down.uniforms.tSrc.value = src.texture; down.uniforms.uTexel.value.set(1 / src.width, 1 / src.height); down.uniforms.uThresh.value = i ? 0 : 0.95; draw(down, m); src = m; });
      renderer.autoClear = false;
      for (let i = levels - 1; i > 0; i--) { up.uniforms.tSrc.value = mips[i].texture; up.uniforms.uTexel.value.set(1 / mips[i].width, 1 / mips[i].height); draw(up, mips[i - 1]); }
      renderer.autoClear = keep;

      // where the sun sits on screen, and whether shafts are worth drawing
      camera.getWorldDirection(fwd);
      sunPos.copy(camera.position).addScaledVector(env.lightDir, 1000).project(camera);
      const facing = fwd.dot(env.lightDir), moon = env.lightDir === env.moonDir || env.night > 0.5;
      const shafts = under ? 0 : Math.max(0, Math.min(1, facing * 2.5)) * (moon ? 0.25 : 0.5 + 0.9 * (1 - Math.min(1, env.sunDir.y * 2.2))) * (1 - env.rain * 0.8);
      rays.uniforms.uSun.value.set(sunPos.x * 0.5 + 0.5, sunPos.y * 0.5 + 0.5);
      if (shafts > 0.01) { rays.uniforms.tColor.value = main.texture; rays.uniforms.tDepth.value = main.depthTexture; draw(rays, rayRT); }

      U.tColor.value = main.texture; U.tDepth.value = main.depthTexture; U.tBloom.value = mips[0].texture; U.tRays.value = rayRT.texture;
      U.uProjInv.value.copy(camera.projectionMatrixInverse); U.uCamWorld.value.copy(camera.matrixWorld); U.uCamPos.value.copy(camera.position);
      U.uMistCol.value.copy(env.mistColor); U.uSunCol.value.copy(env.sunCol).multiplyScalar(Math.min(1, env.sun.intensity)); U.uSunDir.value.copy(env.lightDir);
      U.uMist.value = env.mist; U.uRay.value = shafts > 0.01 ? shafts : 0; U.uTime.value = env.time; U.uUnder.value = under ? 1 : 0;
      U.uBloom.value = 0.38 + env.night * 0.3;
      draw(final, null);
    },
  };
}
