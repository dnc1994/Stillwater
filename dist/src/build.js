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
// A flat card for leaves, cloth and signs, pivoting at its bottom edge, top edge or centre.
export const card = (w, h, pivot = 'bottom') => new THREE.PlaneGeometry(w, h).translate(0, pivot === 'bottom' ? h / 2 : pivot === 'top' ? -h / 2 : 0, 0);

export class Builder {
  // `solid` is the UV used by pieces that carry no texture of their own (a plain white texel on an atlas).
  constructor(solid = [0, 0]) { this.p = []; this.n = []; this.c = []; this.s = []; this.u = []; this.solid = solid; }
  // opts: jit (colour jitter), top (colour at the top of the piece), speckle (per-vertex jitter),
  //       sway (number or fn(localY 0..1)),
  //       uv: a number = repeats per metre, projected along each face's own axes (so roof tiles follow the slope);
  //           'own' = use the geometry's UVs, mapped into `rect` [u0, v0, w, h] if given,
  //       normal: [x, y, z] to light the whole piece as if it faced that way (soft foliage).
  add(geom, matrix, color, opts = {}) {
    const g = geom.index ? geom.toNonIndexed() : geom;
    const pos = g.attributes.position, nor = g.attributes.normal, guv = g.attributes.uv;
    g.computeBoundingBox();
    const y0 = g.boundingBox.min.y, yr = Math.max(1e-6, g.boundingBox.max.y - y0);
    _c.set(color);
    const j = opts.jit ?? 0.04, k = 1 + (_rand() - 0.5) * 2 * j;
    _c.multiplyScalar(k);
    if (opts.top) _c2.set(opts.top).multiplyScalar(k);
    if (matrix) _nm.getNormalMatrix(matrix);
    const proj = typeof opts.uv === 'number' ? opts.uv : 0, ou = proj ? _rand() : 0, ov = proj ? _rand() : 0, rect = opts.rect;
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i); _n.fromBufferAttribute(nor, i);
      const t = (_v.y - y0) / yr;
      if (proj) {
        const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
        if (ay >= ax && ay >= az) this.u.push(_v.x * proj + ou, _v.z * proj + ov);
        else if (ax >= az) this.u.push(_v.z * proj + ou, _v.y * proj + ov);
        else this.u.push(_v.x * proj + ou, _v.y * proj + ov);
      } else if (opts.uv === 'own' && guv) {
        const a = guv.getX(i), b = guv.getY(i);
        if (rect) this.u.push(rect[0] + a * rect[2], rect[1] + b * rect[3]); else this.u.push(a, b);
      } else this.u.push(this.solid[0], this.solid[1]);
      if (matrix) { _v.applyMatrix4(matrix); _n.applyMatrix3(_nm).normalize(); }
      this.p.push(_v.x, _v.y, _v.z);
      if (opts.normal) this.n.push(opts.normal[0], opts.normal[1], opts.normal[2]); else this.n.push(_n.x, _n.y, _n.z);
      let r = _c.r, gg = _c.g, bl = _c.b;
      if (opts.top) { r += (_c2.r - r) * t; gg += (_c2.g - gg) * t; bl += (_c2.b - bl) * t; }
      if (opts.speckle) { const q = 1 + (_rand() - 0.5) * 2 * opts.speckle; r *= q; gg *= q; bl *= q; }
      this.c.push(r, gg, bl);
      this.s.push(typeof opts.sway === 'function' ? opts.sway(t) : opts.sway ?? 0);
    }
    geom.dispose(); if (g !== geom) g.dispose();
    return this;
  }
  // A free-standing quad a-b-c-d with UVs running 0..1 across it (scaled by uv = [su, sv]).
  quad(a, b, c, d, color, uv = [1, 1], off = [0, 0], jit = 0.06) {
    _c.set(color).multiplyScalar(1 + (_rand() - 0.5) * 2 * jit);
    const nx = (b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]), ny = (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]), nz = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]), l = Math.hypot(nx, ny, nz) || 1;
    const pts = [a, b, c, a, c, d], uvs = [[0, 0], [uv[0], 0], [uv[0], uv[1]], [0, 0], [uv[0], uv[1]], [0, uv[1]]];
    pts.forEach((v, i) => { this.p.push(v[0], v[1], v[2]); this.n.push(nx / l, ny / l, nz / l); this.c.push(_c.r, _c.g, _c.b); this.s.push(0); this.u.push(off[0] + uvs[i][0], off[1] + uvs[i][1]); });
    return this;
  }
  get empty() { return this.p.length === 0; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('sway', new THREE.Float32BufferAttribute(this.s, 1));
    return g;
  }
}

// Shared matte material. With `sway`, vertices carrying a sway weight drift in the breeze.
export const windTime = { value: 0 };
export function matte(opts = {}) {
  const { sway = 0, soft = false, ...rest } = opts;
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, ...rest });
  if (sway || soft) {
    m.onBeforeCompile = (sh) => {
      // `soft`: light both sides of a leaf card the same, instead of flipping the normal on the back
      if (soft) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);');
      if (!sway) return;
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
    m.customProgramCacheKey = () => 'sway' + sway + soft;
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
    if (t.color) mesh.setColorAt(i, _c.set(t.color).multiplyScalar(t.tint ?? 1));
    else if (t.tint) mesh.setColorAt(i, _c.setScalar(t.tint));
  });
  mesh.castShadow = shadow; mesh.frustumCulled = false;
  return mesh;
}
