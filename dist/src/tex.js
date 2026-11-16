// tex.js — every surface texture, painted onto canvases at start-up: lime plaster with rain streaks,
// courses of grey roof tile, quay stone, old planks, lattice windows, and a sheet of leaves.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const sheet = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c.getContext('2d'); };
function finish(ctx, { repeat = true, srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(ctx.canvas);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
const grey = (v, a = 1) => `rgba(${(v * 255) | 0},${(v * 255) | 0},${(v * 255) | 0},${a})`;
// Draw something so that it wraps cleanly round all four edges.
function tiled(ctx, x, y, fn) {
  const { width: w, height: h } = ctx.canvas;
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { ctx.save(); ctx.translate(x + dx, y + dy); fn(); ctx.restore(); }
}

function plaster(R) {       // about 4 m square
  const c = sheet(512), S = 512;
  c.fillStyle = '#f3f1ea'; c.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {       // uneven limewash
    const r = 30 + R() * 110, v = R() < 0.5 ? 'rgba(120,124,112,' : 'rgba(255,255,250,', al = 0.05 + R() * 0.06;
    tiled(c, R() * S, R() * S, () => { const g = c.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, v + al + ')'); g.addColorStop(1, v + '0)'); c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r); });
  }
  for (let i = 0; i < 110; i++) {      // rain streaks running down the wall
    const x = R() * S, y = R() * S, len = 60 + R() * 330, w = 1.5 + R() * 9, a = 0.03 + R() * 0.09;
    tiled(c, x, y, () => { const g = c.createLinearGradient(0, 0, 0, len); g.addColorStop(0, `rgba(86,92,84,${a})`); g.addColorStop(1, 'rgba(86,92,84,0)'); c.fillStyle = g; c.fillRect(-w / 2, 0, w, len); });
  }
  for (let i = 0; i < 2600; i++) { c.fillStyle = grey(R() < 0.5 ? 0.35 : 1, 0.05); c.fillRect(R() * S, R() * S, 1 + R() * 2, 1 + R() * 2); }
  c.strokeStyle = 'rgba(70,70,64,.22)'; c.lineWidth = 0.8;
  for (let i = 0; i < 7; i++) { let x = R() * S, y = R() * S; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 9; k++) { x += (R() - 0.5) * 26; y += 8 + R() * 22; c.lineTo(x, y); } c.stroke(); }
  return finish(c);
}

function tiles(R) {         // 1.6 m square: eight rows of half-pipe tiles running down the slope
  const c = sheet(512), S = 512, col = 64, course = 46;
  c.fillStyle = grey(0.3); c.fillRect(0, 0, S, S);
  for (let i = 0; i < S / col; i++) {
    const x = i * col, g = c.createLinearGradient(x, 0, x + col, 0);        // a lit ridge between two dark gutters
    g.addColorStop(0, grey(0.28)); g.addColorStop(0.2, grey(0.5)); g.addColorStop(0.5, grey(0.95)); g.addColorStop(0.8, grey(0.55)); g.addColorStop(1, grey(0.28));
    c.fillStyle = g; c.fillRect(x, 0, col, S);
    for (let y = -course; y < S + course; y += course) {
      const oy = y + (i % 2) * course * 0.5, v = 0.8 + R() * 0.4;
      c.fillStyle = grey(v > 1 ? 1 : 0, Math.abs(v - 1) * 0.5); c.fillRect(x + col * 0.14, oy, col * 0.72, course);      // each tile a little lighter or darker
      c.strokeStyle = grey(0.1, 0.75); c.lineWidth = 3; c.beginPath(); c.ellipse(x + col / 2, oy, col * 0.37, 7, 0, 0, Math.PI); c.stroke();
      c.strokeStyle = grey(1, 0.35); c.lineWidth = 1.5; c.beginPath(); c.ellipse(x + col / 2, oy + 4, col * 0.34, 6, 0, 0.3, Math.PI - 0.3); c.stroke();
    }
  }
  for (let i = 0; i < 26; i++) { const r = 8 + R() * 26; tiled(c, R() * S, R() * S, () => { const g = c.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, 'rgba(96,112,70,.3)'); g.addColorStop(1, 'rgba(96,112,70,0)'); c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r); }); }
  return finish(c);
}

function stone(R) {         // 2.4 m square of coursed blocks
  const c = sheet(512), S = 512, row = 64;
  c.fillStyle = grey(0.55); c.fillRect(0, 0, S, S);
  for (let j = 0; j < S / row; j++) {
    let x = -R() * 90;
    while (x < S) {
      const w = 70 + R() * 120, v = 0.86 + R() * 0.14, warm = (R() - 0.5) * 12;
      for (const ox of [0, S]) {
        c.fillStyle = `rgb(${v * 255 + warm},${v * 255 + warm * 0.4},${v * 255 - warm})`;
        c.fillRect(x + 2 - ox + (x + w > S ? 0 : ox), j * row + 2, w - 4, row - 4);
      }
      const g = c.createLinearGradient(0, j * row, 0, (j + 1) * row); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(0.2, 'rgba(255,255,255,0)'); g.addColorStop(0.85, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.2)');
      c.fillStyle = g; c.fillRect(x + 2, j * row + 2, w - 4, row - 4);
      if (R() < 0.3) { c.fillStyle = 'rgba(92,110,72,.14)'; c.fillRect(x + 2, j * row + row * 0.55, w - 4, row * 0.45 - 2); }
      x += w;
    }
  }
  for (let i = 0; i < 5000; i++) { c.fillStyle = grey(R() < 0.6 ? 0.2 : 1, 0.07); c.fillRect(R() * S, R() * S, 1 + R() * 2.5, 1 + R() * 2.5); }
  return finish(c);
}

function wood(R) {          // 1.2 m square of upright planks
  const c = sheet(256), S = 256, n = 8;
  for (let i = 0; i < n; i++) {
    const x = (i * S) / n, v = 0.62 + R() * 0.38;
    c.fillStyle = `rgb(${v * 255},${v * 236},${v * 214})`; c.fillRect(x, 0, S / n, S);
    for (let k = 0; k < 14; k++) { c.strokeStyle = grey(0, 0.05 + R() * 0.12); c.lineWidth = 0.6 + R(); const gx = x + R() * (S / n); c.beginPath(); c.moveTo(gx, 0); c.bezierCurveTo(gx + (R() - 0.5) * 6, S * 0.3, gx + (R() - 0.5) * 6, S * 0.7, gx, S); c.stroke(); }
    c.fillStyle = grey(0, 0.6); c.fillRect(x, 0, 2, S);
  }
  return finish(c);
}

function lattice() {        // one window: wooden lattice over paper
  const c = sheet(128, 160), W = 128, H = 160;
  c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 100); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(120,90,60,.45)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#1c130d'; c.lineCap = 'square';
  c.lineWidth = 9; c.strokeRect(4, 4, W - 8, H - 8);
  c.lineWidth = 4;
  for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo((i * W) / 4, 6); c.lineTo((i * W) / 4, H - 6); c.stroke(); }
  for (let j = 1; j < 5; j++) { c.beginPath(); c.moveTo(6, (j * H) / 5); c.lineTo(W - 6, (j * H) / 5); c.stroke(); }
  c.lineWidth = 3; c.strokeRect(W * 0.25 + 9, H * 0.2 + 9, W * 0.5 - 18, H * 0.6 - 18);
  return finish(c, { repeat: false });
}

function ground(R) {        // short pale flecks, to break up flat grass and earth
  const c = sheet(256), S = 256;
  c.fillStyle = grey(0.9); c.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = R() * S, y = R() * S, l = 3 + R() * 9, a = R() * TAU;
    c.strokeStyle = grey(R() < 0.5 ? 1 : 0.62, 0.3 + R() * 0.4); c.lineWidth = 0.8 + R() * 0.8;
    tiled(c, x, y, () => { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.stroke(); });
  }
  return finish(c);
}

function feathers(R, pale) {    // overlapping scalloped feathers for a duck's back and flanks
  const c = sheet(256), S = 256;
  c.fillStyle = pale ? '#f2efe6' : '#a98a66'; c.fillRect(0, 0, S, S);
  for (let j = -1; j < 14; j++) for (let i = -1; i < 11; i++) {
    const x = i * 26 + (j % 2) * 13 + (R() - 0.5) * 5, y = S - j * 20 + (R() - 0.5) * 4, v = R();
    c.beginPath(); c.ellipse(x, y, 14, 19, 0, 0, TAU);
    c.fillStyle = pale ? `rgb(${238 + v * 14},${236 + v * 14},${226 + v * 16})` : `rgb(${150 + v * 60},${118 + v * 50},${84 + v * 40})`; c.fill();
    c.strokeStyle = pale ? 'rgba(150,150,140,.5)' : 'rgba(60,40,24,.7)'; c.lineWidth = 1.6; c.stroke();
    if (!pale) { c.strokeStyle = 'rgba(232,206,160,.55)'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 10, 15, 0, 0.2, Math.PI - 0.2); c.stroke(); }
  }
  return finish(c);
}

// Painted signs: door couplets, the blessing over the door, shop banners.
export const SIGNS = { coupletA: [0, 0, 44, 256], coupletB: [44, 0, 44, 256], fu: [88, 0, 100, 100], wine: [88, 100, 84, 156], tea: [172, 100, 84, 156], plain: [190, 2, 60, 60] };
function signs() {
  const c = sheet(256), font = (px) => `${px}px "Kaiti SC","STKaiti","KaiTi","Songti SC","Noto Serif CJK SC","Source Han Serif SC",serif`;
  c.fillStyle = '#b22a20'; c.fillRect(0, 0, 256, 256);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  [['风调雨顺', 22], ['国泰民安', 66]].forEach(([s, x]) => { c.fillStyle = '#1a1410'; c.font = font(34); [...s].forEach((ch, i) => c.fillText(ch, x, 34 + i * 62)); });
  c.save(); c.translate(138, 50); c.rotate(Math.PI / 4); c.fillStyle = '#c4281e'; c.fillRect(-34, -34, 68, 68); c.rotate(-Math.PI / 4); c.fillStyle = '#e8c15a'; c.font = font(44); c.fillText('福', 0, 2); c.restore();
  c.fillStyle = '#2f4a78'; c.fillRect(88, 100, 84, 156); c.fillStyle = '#f2ece0'; c.beginPath(); c.arc(130, 178, 32, 0, TAU); c.fill(); c.fillStyle = '#2f4a78'; c.font = font(44); c.fillText('酒', 130, 180);
  c.fillStyle = '#e6dcc0'; c.fillRect(172, 100, 84, 156); c.fillStyle = '#3c5a3a'; c.font = font(50); c.fillText('茶', 214, 180);
  c.fillStyle = '#fff'; c.fillRect(188, 0, 68, 68);
  return finish(c, { repeat: false });
}

// One sheet of foliage, cut out by a matching alpha sheet. Regions are [x, y, w, h] in pixels from the top-left.
export const LEAF = {
  solid: [4, 4, 24, 24], willow: [32, 0, 224, 768], clump: [256, 0, 384, 384], bamboo: [640, 0, 384, 384], blossom: [256, 384, 384, 384],
  reed: [640, 384, 192, 640], grass: [832, 384, 192, 256], rape: [832, 640, 192, 384], lotus: [0, 768, 256, 256], flower: [256, 768, 128, 128],
  petal: [384, 768, 64, 64], weed: [448, 768, 64, 64], vine: [384, 832, 256, 192],
};
function foliage(R) {
  const col = sheet(1024), alp = sheet(1024);
  col.fillStyle = '#e4efc6'; col.fillRect(0, 0, 1024, 1024);
  alp.fillStyle = '#000'; alp.fillRect(0, 0, 1024, 1024);
  const both = (fn) => { fn(col, false); fn(alp, true); };
  const within = ([x, y, w, h], fn) => both((c, a) => { c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.translate(x, y); fn(c, a, w, h); c.restore(); });
  const tone = () => { const v = R(); return v < 0.33 ? '#f6ffd8' : v < 0.66 ? '#d2ecc0' : '#c0dcae'; };
  const leaf = (c, a, x, y, len, wid, ang, fill) => { c.save(); c.translate(x, y); c.rotate(ang); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.45, -wid, len, 0); c.quadraticCurveTo(len * 0.45, wid, 0, 0); c.fillStyle = a ? '#fff' : fill; c.fill(); if (!a) { c.strokeStyle = 'rgba(70,96,56,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 0); c.lineTo(len, 0); c.stroke(); } c.restore(); };
  const picks = (n) => Array.from({ length: n }, () => [R(), R(), R(), R(), R(), tone()]);

  within(LEAF.solid.map((v, i) => (i < 2 ? v - 4 : v + 8)), (c, a, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); });

  { const strands = Array.from({ length: 7 }, (_, i) => ({ x: 18 + i * 31 + R() * 8, len: 520 + R() * 240, wob: R() * 6, leaves: picks(46) }));     // hanging willow withes
    within(LEAF.willow, (c, a, w, h) => strands.forEach((s) => {
      const X = (t) => s.x + Math.sin(t * 5 + s.wob) * 7;
      c.strokeStyle = a ? '#fff' : '#b9c890'; c.lineWidth = 2.6; c.beginPath(); for (let t = 0; t <= 1; t += 0.05) c.lineTo(X(t), t * s.len); c.stroke();
      s.leaves.forEach((l, i) => { const t = i / s.leaves.length, side = i % 2 ? 1 : -1; leaf(c, a, X(t), t * s.len, 26 + l[0] * 16, 4.5, Math.PI / 2 + side * (0.35 + l[1] * 0.3), l[5]); });
    })); }
  { const ls = picks(150);                                                        // a round mass of broad leaves
    within(LEAF.clump, (c, a, w, h) => ls.forEach((l) => { const ang = l[0] * TAU, r = Math.sqrt(l[1]) * w * 0.4; leaf(c, a, w / 2 + Math.cos(ang) * r, h / 2 + Math.sin(ang) * r, 34 + l[2] * 30, 13 + l[3] * 6, ang + (l[4] - 0.5) * 1.6, l[5]); })); }
  { const stems = Array.from({ length: 7 }, () => ({ a: -Math.PI / 2 + (R() - 0.5) * 2.2, len: 110 + R() * 70, ls: picks(9) }));                   // bamboo: thin stems, long blades
    within(LEAF.bamboo, (c, a, w, h) => stems.forEach((s) => {
      const ex = w / 2 + Math.cos(s.a) * s.len, ey = h * 0.62 + Math.sin(s.a) * s.len;
      c.strokeStyle = a ? '#fff' : '#b4c486'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(w / 2, h * 0.62); c.lineTo(ex, ey); c.stroke();
      s.ls.forEach((l, i) => { const t = 0.3 + (i / 9) * 0.7; leaf(c, a, w / 2 + (ex - w / 2) * t, h * 0.62 + (ey - h * 0.62) * t, 62 + l[0] * 40, 8, s.a + (i % 2 ? 1 : -1) * (0.5 + l[1] * 0.5) + 0.9 * (l[2] - 0.3), l[5]); });
    })); }
  { const twigs = Array.from({ length: 9 }, () => ({ a: R() * TAU, len: 80 + R() * 90, fl: picks(13) }));                                           // peach blossom on dark twigs
    within(LEAF.blossom, (c, a, w, h) => twigs.forEach((s) => {
      const ex = w / 2 + Math.cos(s.a) * s.len, ey = h / 2 + Math.sin(s.a) * s.len;
      c.strokeStyle = a ? '#fff' : '#6a4a44'; c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2, h / 2); c.quadraticCurveTo((w / 2 + ex) / 2 + 14, (h / 2 + ey) / 2 - 14, ex, ey); c.stroke();
      s.fl.forEach((l) => { const t = 0.25 + l[0] * 0.8, x = w / 2 + (ex - w / 2) * t + (l[1] - 0.5) * 44, y = h / 2 + (ey - h / 2) * t + (l[2] - 0.5) * 44, r = 9 + l[3] * 8;
        for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos((k / 5) * TAU) * r * 0.55, y + Math.sin((k / 5) * TAU) * r * 0.55, r * 0.55, 0, TAU); c.fillStyle = a ? '#fff' : l[4] < 0.5 ? '#fff4f6' : '#ffd9e2'; c.fill(); }
        if (!a) { c.beginPath(); c.arc(x, y, r * 0.25, 0, TAU); c.fillStyle = '#e88aa4'; c.fill(); } });
    })); }
  { const blades = Array.from({ length: 13 }, (_, i) => ({ x: 20 + R() * 150, top: 60 + R() * 260, bend: (R() - 0.5) * 90, wid: 5 + R() * 5, plume: i < 5, f: tone() }));     // reeds and their plumes
    within(LEAF.reed, (c, a, w, h) => blades.forEach((b) => {
      c.beginPath(); c.moveTo(b.x - b.wid, h); c.quadraticCurveTo(b.x + b.bend * 0.2, (h + b.top) / 2, b.x + b.bend, b.top); c.quadraticCurveTo(b.x + b.bend * 0.3, (h + b.top) / 2, b.x + b.wid, h); c.fillStyle = a ? '#fff' : b.f; c.fill();
      if (b.plume) for (let k = 0; k < 22; k++) { c.strokeStyle = a ? '#fff' : '#fff6dc'; c.lineWidth = 3; c.beginPath(); const y = b.top - 10 + k * 5; c.moveTo(b.x + b.bend, y); c.lineTo(b.x + b.bend + (k % 2 ? 1 : -1) * (16 - k * 0.5), y + 16); c.stroke(); }
    })); }
  { const blades = Array.from({ length: 42 }, () => ({ x: 96 + (R() - 0.5) * 70, tip: 96 + (R() - 0.5) * 190, top: 20 + R() * 150, wid: 3 + R() * 4, f: tone() }));           // a tuft of grass
    within(LEAF.grass, (c, a, w, h) => blades.forEach((b) => { c.beginPath(); c.moveTo(b.x - b.wid, h); c.quadraticCurveTo(b.x, (h + b.top) / 2, b.tip, b.top); c.quadraticCurveTo(b.x + b.wid, (h + b.top) / 2, b.x + b.wid, h); c.fillStyle = a ? '#fff' : b.f; c.fill(); })); }
  { const stems = Array.from({ length: 9 }, () => ({ x: 20 + R() * 150, top: 40 + R() * 90, fl: picks(16) }));                                       // rapeseed: green stalks under a cloud of yellow
    within(LEAF.rape, (c, a, w, h) => stems.forEach((s) => {
      c.strokeStyle = a ? '#fff' : '#b9d68c'; c.lineWidth = 5; c.beginPath(); c.moveTo(s.x, h); c.lineTo(s.x + 6, s.top); c.stroke();
      for (let k = 0; k < 4; k++) leaf(c, a, s.x + 3, h - 60 - k * 50, 46, 11, (k % 2 ? -0.5 : Math.PI + 0.5), '#bfe090');
      s.fl.forEach((l) => { c.beginPath(); c.arc(s.x + 6 + (l[0] - 0.5) * 58, s.top + (l[1] - 0.35) * 110, 6 + l[2] * 6, 0, TAU); c.fillStyle = a ? '#fff' : l[3] < 0.5 ? '#ffe94a' : '#ffd61f'; c.fill(); });
    })); }
  within(LEAF.lotus, (c, a, w, h) => {                                             // a lotus leaf from above: veins, a pale centre, one notch
    c.beginPath(); c.moveTo(w / 2, h / 2); c.arc(w / 2, h / 2, w * 0.48, 0.18, TAU - 0.18); c.closePath();
    if (a) { c.fillStyle = '#fff'; c.fill(); return; }
    const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * 0.48); g.addColorStop(0, '#f4ffe0'); g.addColorStop(0.25, '#d4ecc0'); g.addColorStop(1, '#b6d6a6'); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(244,255,224,.8)'; c.lineWidth = 2;
    for (let k = 0; k < 18; k++) { const an = (k / 18) * TAU; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + Math.cos(an) * w * 0.46, h / 2 + Math.sin(an) * w * 0.46); c.stroke(); }
  });
  { const fl = picks(11); within(LEAF.flower, (c, a, w, h) => fl.forEach((l) => { const x = 14 + l[0] * 100, y = 12 + l[1] * 70, r = 5 + l[2] * 4;
      c.strokeStyle = a ? '#fff' : '#b9d68c'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(64 + (x - 64) * 0.3, h); c.stroke();
      for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos((k / 5) * TAU) * r * 0.6, y + Math.sin((k / 5) * TAU) * r * 0.6, r * 0.6, 0, TAU); c.fillStyle = '#fff'; c.fill(); } })); }
  within(LEAF.petal, (c, a, w, h) => { c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.42, h * 0.26, 0.5, 0, TAU); c.fillStyle = '#fff'; c.fill(); });
  { const dots = picks(9); within(LEAF.weed, (c, a, w, h) => dots.forEach((l) => { c.beginPath(); c.arc(10 + l[0] * 44, 10 + l[1] * 44, 6 + l[2] * 5, 0, TAU); c.fillStyle = a ? '#fff' : l[5]; c.fill(); })); }
  { const runs = Array.from({ length: 8 }, (_, i) => ({ x: 16 + i * 30 + R() * 10, len: 60 + R() * 120, ls: picks(12) }));                          // creeper hanging off stone
    within(LEAF.vine, (c, a, w, h) => runs.forEach((s) => {
      c.strokeStyle = a ? '#fff' : '#a9be84'; c.lineWidth = 2; c.beginPath(); c.moveTo(s.x, 0); c.lineTo(s.x + 5, s.len); c.stroke();
      s.ls.forEach((l, i) => leaf(c, a, s.x + (i % 2 ? 4 : -2), (i / 12) * s.len, 20 + l[0] * 10, 9, (i % 2 ? 0.5 : Math.PI - 0.5) + (l[1] - 0.5) * 0.6, l[5]));
    })); }

  return { color: finish(col, { repeat: false, aniso: 4 }), alpha: Object.assign(finish(alp, { repeat: false, srgb: false, aniso: 1 }), { generateMipmaps: false, minFilter: THREE.LinearFilter }) };      // no mipmaps: averaged alpha would turn distant cards into solid slabs
}

// Convert a pixel region of a sheet into a UV rectangle [u0, v0, width, height].
export const region = ([x, y, w, h], size = 1024, inset = 1.5) => [(x + inset) / size, 1 - (y + h - inset) / size, (w - 2 * inset) / size, (h - 2 * inset) / size];

export function createTextures(rand) {
  return { plaster: plaster(rand), tiles: tiles(rand), stone: stone(rand), wood: wood(rand), lattice: lattice(), ground: ground(rand), signs: signs(), leaves: foliage(rand), feathers: { brown: feathers(rand, false), white: feathers(rand, true) } };
}
