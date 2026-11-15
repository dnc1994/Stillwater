// sky.js — light, mist and time. One slow day that loops: misty dawn, clear noon,
// golden evening, lantern-lit night. Everything else reads its colours from here.
import * as THREE from 'three';

const C = (hex) => new THREE.Color(hex);
// hour, sky top, horizon, fog, sunlight colour, sun strength, ambient strength, fog density
const KEYS = [
  [0.0, '#0e1a34', '#24364f', '#1c2c42', '#9db4e0', 0.5, 0.9, 0.0075],
  [4.6, '#18233e', '#394862', '#2a384e', '#8ea6d6', 0.4, 0.9, 0.0095],
  [5.8, '#6c84a6', '#f1b79c', '#c8b2b4', '#ffae88', 0.7, 0.95, 0.0135],
  [7.2, '#8db2cf', '#f4e2c8', '#dde0d6', '#ffe1ba', 1.15, 1.1, 0.0105],
  [10.0, '#7bb0dc', '#dbe9ea', '#d2e2e2', '#fff4e0', 1.5, 1.15, 0.0056],
  [14.0, '#76acde', '#d6e6ec', '#cee0e6', '#fff6e6', 1.55, 1.15, 0.005],
  [17.0, '#7c9dc8', '#f7d8a4', '#e6d1ae', '#ffd096', 1.4, 1.05, 0.006],
  [18.6, '#56598c', '#f89866', '#c88d7c', '#ff8a58', 0.8, 0.82, 0.0075],
  [19.8, '#1d284c', '#48486c', '#333a56', '#8ea6d6', 0.3, 0.85, 0.0078],
  [24.0, '#0e1a34', '#24364f', '#1c2c42', '#9db4e0', 0.5, 0.9, 0.0075],
].map((k) => ({ h: k[0], top: C(k[1]), hor: C(k[2]), fog: C(k[3]), sun: C(k[4]), sunI: k[5], amb: k[6], dens: k[7] }));

const SKY_FRAG = /* glsl */ `
uniform vec3 uTop, uHor, uSunCol, uSunDir, uMoonDir; uniform float uNight, uTime, uCloud;
varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for(int i=0;i<4;i++){ s += a*vnoise(p); p = p*2.03+7.1; a *= .5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float e = max(d.y, 0.);
  vec3 col = mix(uHor, uTop, pow(e, .5));
  float sd = max(dot(d, uSunDir), 0.);
  col += uSunCol * (pow(sd, 10.) * .16 + pow(sd, 260.) * .5) * (1. - uNight);
  vec2 cp = d.xz / (d.y + .22) * 1.1 + vec2(uTime * .004, 0.);
  float cl = smoothstep(.5 - uCloud * .3, .82, fbm(cp * vec2(1., 2.2))) * smoothstep(.02, .3, d.y);
  vec3 cloud = mix(uHor, vec3(1.), .45 * (1. - uNight)) + uSunCol * pow(sd, 4.) * .25 * (1. - uNight);
  col = mix(col, cloud, cl * (.55 + uCloud * .4));
  col += uSunCol * smoothstep(.9993, .9997, sd) * 2.5 * (1. - cl);
  float md = max(dot(d, uMoonDir), 0.);
  col += vec3(.95, .94, .82) * (smoothstep(.9991, .9995, md) * 1.4 + pow(md, 60.) * .1) * uNight * (1. - cl * .8);
  vec3 q = d * 260.; vec3 cell = floor(q);
  float star = step(.9965, hash(cell.xy + cell.z * 17.3)) * smoothstep(.45, .1, length(fract(q) - .5));
  col += vec3(.9, .95, 1.) * star * uNight * (1. - cl) * step(.03, d.y) * (.6 + .4 * sin(uTime * 2. + cell.x));
  gl_FragColor = vec4(col, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Env {
  constructor(scene, seedRandom) {
    this.scene = scene;
    this.hour = 6.9;
    this.rain = 0;            // 0..1 current drizzle
    this.rainTarget = 0;
    this.nextWeather = 150 + seedRandom() * 120;
    this.night = 0;
    this.time = 0;
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.lightDir = new THREE.Vector3(0, 1, 0);
    this.fogColor = C('#dde0d6');
    this.top = C(0); this.hor = C(0); this.sunCol = C(0);
    this.moonDir = new THREE.Vector3(0.45, 0.5, -0.6).normalize();

    scene.fog = new THREE.FogExp2(0xdde0d6, 0.01);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x777766, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 260 });
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.06;
    scene.add(this.hemi, this.sun, this.sun.target);

    this.skyU = {
      uTop: { value: this.top }, uHor: { value: this.hor }, uSunCol: { value: this.sunCol }, uSunDir: { value: this.sunDir },
      uMoonDir: { value: this.moonDir }, uNight: { value: 0 }, uTime: { value: 0 }, uCloud: { value: 0 },
    };
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1900, 32, 16), new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: SKY_FRAG,
    }));
    this.dome.renderOrder = -10; this.dome.frustumCulled = false;
    scene.add(this.dome);

    // Far hills: three paper-cut ridgelines that dissolve into the mist at their feet.
    this.hillU = { uFog: { value: this.fogColor }, uInk: { value: C(0) } };
    this.hills = new THREE.Group();
    [[820, 70, 0.55, 5], [1080, 120, 0.36, 3.2], [1400, 190, 0.2, 2.1]].forEach(([rad, hgt, ink, freq], ri) => {
      const seg = 240, pos = [], k = [];
      const ridge = (a) => {
        let h = 0.35 + 0.3 * Math.sin(a * freq + ri * 2.1) + 0.2 * Math.sin(a * freq * 2.7 + ri) + 0.1 * Math.sin(a * freq * 6.3 + 1.7 * ri) + 0.05 * Math.sin(a * freq * 14.1);
        return Math.max(0.04, h) * hgt;
      };
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        const p0 = [Math.cos(a0) * rad, Math.sin(a0) * rad], p1 = [Math.cos(a1) * rad, Math.sin(a1) * rad], h0 = ridge(a0), h1 = ridge(a1);
        pos.push(p0[0], -8, p0[1], p1[0], -8, p1[1], p1[0], h1, p1[1], p0[0], -8, p0[1], p1[0], h1, p1[1], p0[0], h0, p0[1]);
        k.push(0, 0, h1 / hgt, 0, h1 / hgt, h0 / hgt);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('k', new THREE.Float32BufferAttribute(k, 1));
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
        uniforms: { ...this.hillU, uAmt: { value: ink } }, side: THREE.DoubleSide, fog: false, depthWrite: false,
        vertexShader: 'attribute float k; varying float vK; void main(){ vK = k; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
        fragmentShader: `uniform vec3 uFog, uInk; uniform float uAmt; varying float vK;
          void main(){ gl_FragColor = vec4(mix(uFog, uInk, uAmt * smoothstep(0., .55, vK)), 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          }`,
      }));
      m.renderOrder = -9 + (2 - ri); m.frustumCulled = false;
      this.hills.add(m);
    });
    scene.add(this.hills);
    this.update(0, new THREE.Vector3());
  }

  phaseName() {
    const h = this.hour;
    return h < 4.8 ? 'night' : h < 7 ? 'dawn' : h < 11 ? 'morning' : h < 15.5 ? 'noon' : h < 17.8 ? 'afternoon' : h < 19.6 ? 'dusk' : 'night';
  }
  skipAhead() {
    const stops = [6.3, 9, 13, 17.4, 18.7, 21.5];
    this.hour = stops.find((s) => s > this.hour + 0.4) ?? stops[0];
  }

  update(dt, focus) {
    this.time += dt;
    const nightSpeed = this.hour > 21.5 || this.hour < 4.2 ? 2.6 : 1;
    this.hour = (this.hour + (dt * nightSpeed * 24) / 1080) % 24;     // a full day in ~15 minutes
    this.nextWeather -= dt;
    if (this.nextWeather < 0) { this.rainTarget = this.rainTarget ? 0 : 1; this.nextWeather = this.rainTarget ? 70 + Math.random() * 60 : 240 + Math.random() * 240; }
    this.rain += Math.sign(this.rainTarget - this.rain) * Math.min(Math.abs(this.rainTarget - this.rain), dt / 9);

    let i = 0; while (KEYS[i + 1].h <= this.hour) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = (this.hour - a.h) / (b.h - a.h), wet = this.rain;
    const grey = C('#aab3b6').multiplyScalar(0.25 + 0.75 * Math.min(1, a.amb + (b.amb - a.amb) * t));
    this.top.lerpColors(a.top, b.top, t).lerp(grey, wet * 0.75);
    this.hor.lerpColors(a.hor, b.hor, t).lerp(grey, wet * 0.6);
    this.fogColor.lerpColors(a.fog, b.fog, t).lerp(grey, wet * 0.6);
    this.sunCol.lerpColors(a.sun, b.sun, t);
    const sunI = (a.sunI + (b.sunI - a.sunI) * t) * (1 - wet * 0.7), amb = a.amb + (b.amb - a.amb) * t;
    this.scene.fog.color.copy(this.fogColor);
    this.scene.fog.density = a.dens + (b.dens - a.dens) * t + wet * 0.0045;

    const day = (this.hour - 5.4) / 13.8, el = Math.sin(day * Math.PI), az = -0.5 + day * (Math.PI + 1);
    this.sunDir.set(Math.cos(az) * Math.cos(el * 0.95), Math.sin(el * 0.95), Math.sin(az) * Math.cos(el * 0.95) * 0.8 - 0.35).normalize();
    this.night = 1 - Math.min(1, Math.max(0, (el + 0.08) / 0.2));
    this.lightDir.copy(el > 0.02 ? this.sunDir : this.moonDir);
    if (this.lightDir.y < 0.3) { this.lightDir.y = 0.3; this.lightDir.normalize(); }

    this.sun.color.copy(this.sunCol); this.sun.intensity = sunI;
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(this.lightDir, 120);
    this.hemi.color.copy(this.top).lerp(C('#ffffff'), 0.45);
    this.hemi.groundColor.copy(this.fogColor).lerp(C('#8c8f78'), 0.35);
    this.hemi.intensity = amb * (1 - wet * 0.15);

    this.skyU.uNight.value = this.night; this.skyU.uTime.value = this.time; this.skyU.uCloud.value = wet;
    this.hillU.uInk.value.copy(this.fogColor).multiply(C('#5a7084')).lerp(C('#1c2b3a'), 0.25);
    this.dome.position.copy(focus); this.hills.position.set(focus.x, 0, focus.z);
  }
}
