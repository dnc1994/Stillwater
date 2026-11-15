// build.js — a tiny kit for assembling low-poly models out of coloured primitives.
import * as THREE from 'three';

const _c = new THREE.Color(), _c2 = new THREE.Color(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();
let _rand = Math.random;
export const setBuildRandom = (fn) => { _rand = fn; };

export function T(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));
}
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt, rb, h, seg = 7, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
export const cone = (r, h, seg = 6) => new THREE.ConeGeometry(r, h, seg);
export const ball = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
export const blob = (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail);

export class Builder {
  constructor() { this.p = []; this.n = []; this.c = []; this.s = []; }
  // opts: jit (colour jitter), top (colour at the top of the piece), sway (number or fn(localY 0..1)), speckle (per-vertex jitter)
  add(geom, matrix, color, opts = {}) {
    const g = geom.index ? geom.toNonIndexed() : geom;
    const pos = g.attributes.position, nor = g.attributes.normal;
    g.computeBoundingBox();
    const y0 = g.boundingBox.min.y, yr = Math.max(1e-6, g.boundingBox.max.y - y0);
    _c.set(color);
    const j = opts.jit ?? 0.04, k = 1 + (_rand() - 0.5) * 2 * j;
    _c.multiplyScalar(k);
    if (opts.top) _c2.set(opts.top).multiplyScalar(k);
    if (matrix) _nm.getNormalMatrix(matrix);
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i); _n.fromBufferAttribute(nor, i);
      const t = (_v.y - y0) / yr;
      if (matrix) { _v.applyMatrix4(matrix); _n.applyMatrix3(_nm).normalize(); }
      this.p.push(_v.x, _v.y, _v.z); this.n.push(_n.x, _n.y, _n.z);
      let r = _c.r, gg = _c.g, b = _c.b;
      if (opts.top) { r += (_c2.r - r) * t; gg += (_c2.g - gg) * t; b += (_c2.b - b) * t; }
      if (opts.speckle) { const q = 1 + (_rand() - 0.5) * 2 * opts.speckle; r *= q; gg *= q; b *= q; }
      this.c.push(r, gg, b);
      this.s.push(typeof opts.sway === 'function' ? opts.sway(t) : opts.sway ?? 0);
    }
    geom.dispose(); if (g !== geom) g.dispose();
    return this;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('sway', new THREE.Float32BufferAttribute(this.s, 1));
    return g;
  }
}

// Shared matte material. With `sway`, vertices carrying a sway weight drift in the breeze.
export const windTime = { value: 0 };
export function matte(opts = {}) {
  const { sway = 0, ...rest } = opts;
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, ...rest });
  if (sway) {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uWind = windTime;
      sh.vertexShader = 'uniform float uWind; attribute float sway;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3].x * .37 + instanceMatrix[3].z * .23;
        #else
          float ph = position.x * .37 + position.z * .23;
        #endif
        transformed.x += sin(uWind * 1.15 + ph + position.y * .5) * sway * ${sway.toFixed(3)};
        transformed.z += cos(uWind * .9 + ph * 1.3) * sway * ${(sway * 0.7).toFixed(3)};`);
    };
    m.customProgramCacheKey = () => 'sway' + sway;
  }
  return m;
}

export function instanced(geom, material, list, place, shadow = true) {
  const mesh = new THREE.InstancedMesh(geom, material, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
  list.forEach((o, i) => {
    const t = place(o, i);
    e.set(t.rx ?? 0, t.ry ?? 0, t.rz ?? 0, 'YXZ'); q.setFromEuler(e);
    s.set(t.s ?? 1, t.sy ?? t.s ?? 1, t.s ?? 1); v.set(t.x, t.y, t.z);
    mesh.setMatrixAt(i, m.compose(v, q, s));
    if (t.tint) mesh.setColorAt(i, _c.setScalar(t.tint));
  });
  mesh.castShadow = shadow; mesh.frustumCulled = false;
  return mesh;
}
