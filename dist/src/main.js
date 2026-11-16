// main.js — you are the duck. Paddling, flying, diving, the camera on your back, and the loop that ties it together.
import * as THREE from 'three';
import { makeWorld, rng } from './world.js';
import { Env } from './sky.js';
import { createWater } from './water.js';
import { createScenery } from './scenery.js';
import { makeDuck, poseWings } from './duck.js';
import { createLife } from './life.js';
import { createAudio } from './audio.js';
import { createPost } from './post.js';
import { windTime } from './build.js';
import { STR, JOURNAL, STAMPS, CURIOS } from './text.js';

const $ = (s) => document.querySelector(s);
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('stillwater.' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('stillwater.' + k, JSON.stringify(v)); } catch { /* private mode: play on without saving */ } },
};

// ---- language ---------------------------------------------------------------------------------
let lang = store.get('lang', (navigator.language || 'zh').startsWith('zh') ? 'zh' : 'en');
let S = STR[lang];
const zh = () => lang === 'zh';
const audio = createAudio();
function applyLang() {
  S = STR[lang];
  document.documentElement.lang = zh() ? 'zh-Hans' : 'en';
  document.querySelectorAll('[data-t]').forEach((el) => { if (el.id !== 'start' || !el.disabled) el.textContent = S[el.dataset.t]; });
  document.querySelectorAll('[data-act]').forEach((el) => (el.textContent = S.btn[el.dataset.act]));
  document.querySelectorAll('[data-hold]').forEach((el) => (el.textContent = S.btn[el.dataset.hold]));
  $('#camLabel').textContent = S.cam;
  $('#bSound').textContent = S.sound[audio.muted ? 1 : 0];
  $('#bMusic').textContent = S.music[musicOn ? 0 : 1];
  $('#keys').innerHTML = S.keys.map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join('');
  renderJournal();
}

// ---- world -----------------------------------------------------------------------------------
const seed = decodeURIComponent(location.hash.slice(1)) || 'jiangnan';
const world = makeWorld(seed);
const coarse = matchMedia('(pointer: coarse)').matches;
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch (err) { $('#start').textContent = 'WebGL is unavailable in this browser.'; throw err; }
const hdr = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
let quality = !hdr ? 0 : coarse ? 1 : 2;      // without float render targets there is no lens pass at all
let water, post;
// Three steps of quality. The lowest drops the lens effects and shadows altogether.
const applyQuality = () => { renderer.setPixelRatio(Math.min(devicePixelRatio, [1, 1.25, 2][quality])); env.sun.castShadow = quality > 0; if (water) water.half = quality < 2; post?.setSize(); };
const draw = (under) => (quality > 0 ? post.render(scene, camera, env, under) : (renderer.setRenderTarget(null), renderer.render(scene, camera)));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('#game').append(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.03, 2600);
camera.rotation.order = 'YXZ';
const env = new Env(scene, rng(seed + ':weather'));
applyQuality();
water = createWater(world, scene, quality);
post = createPost(renderer);
const scenery = createScenery(world, scene);
water.skip.push(...scenery.small);

const p = {
  x: world.spawn.x, z: world.spawn.z, heading: world.spawn.heading, speed: 0, turn: 0, drift: true, live: false, dashing: false,
  alt: 0, vy: 0, air: false, runT: 0, flapPh: 0,            // flight
  under: false, dive: 0, breath: 0, lunge: 0, lungeCool: 0,  // diving
  stroke: 0, wake: 0, quack: 0, snails: 0, fishes: 0, bread: 0,
};
const me = makeDuck('drake'); scene.add(me);
const look = { yaw: 0, pitch: 0, idle: 9 }, glance = { yaw: 0, t: 3 };
let started = false, musicOn = true, time = 0, roll = 0, hintCool = 20;

// Where a sound sits relative to your ears.
const hear = (x, z, range) => {
  const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz, p.alt), h = p.heading + look.yaw;
  return { vol: Math.pow(clamp(1 - d / range, 0, 1), 1.4), pan: d > 0.01 ? ((dx * -Math.cos(h) + dz * Math.sin(h)) / d) * 0.8 : 0 };
};

// ---- messages, journal, seals -------------------------------------------------------------------
const seen = new Set(store.get('journal', [])), stamps = new Set(store.get('stamps', [])), curiosFound = new Set(store.get('curios', [])), told = new Set(store.get('told', []));
const queue = []; let showing = 0, toastTimer;
function pump() {
  const el = $('#toast');
  if (!queue.length) { el.classList.remove('show'); showing = 0; return; }
  const [title, line, hold, seal] = queue.shift();
  el.classList.toggle('seal', !!seal);
  const b = el.querySelector('b'); b.textContent = title; b.dataset.seal = seal || '';
  el.querySelector('span').textContent = line;
  el.classList.add('show'); showing = performance.now();
  clearTimeout(toastTimer); toastTimer = setTimeout(pump, queue.length ? Math.min(hold, 2600) : hold);
}
function toast([title, line], hold = 4200, seal) {
  if (!started) return;
  queue.push([title, line, hold, seal]);
  if (!showing) pump();
  else if (queue.length === 1) { clearTimeout(toastTimer); toastTimer = setTimeout(pump, Math.max(300, 2400 - (performance.now() - showing))); }   // let the current one be read first
}
function discover(id) {
  if (!started || seen.has(id)) return;
  const e = JOURNAL.find((j) => j[0] === id); if (!e) return;
  seen.add(id); store.set('journal', [...seen]);
  toast(zh() ? [e[1], e[2]] : [e[3], e[4]], 5600);
  audio.chime(id === 'family'); renderJournal();
}
function stamp(id) {
  if (!started || stamps.has(id)) return;
  const e = STAMPS.find((j) => j[0] === id); if (!e) return;
  stamps.add(id); store.set('stamps', [...stamps]);
  toast([zh() ? e[2] : e[4], S.stampGot], 5200, e[1]);
  audio.chime(true); renderJournal();
}
function tellOnce(key, msg) { if (told.has(key)) return; told.add(key); store.set('told', [...told]); toast(msg, 7000); }
let life;
function renderJournal() {
  if (!life) return;
  const t = (e, a, b) => (zh() ? e[a] : e[b]);
  $('#journalSub').textContent = S.journalSub(seen.size, JOURNAL.length);
  $('#tally').textContent = S.tally(life.found, life.ducklings.length, p.snails);
  $('#bag').textContent = p.snails + p.fishes + p.bread ? S.bag(p.snails, p.fishes, p.bread) : '';
  $('#stampsHead').textContent = S.stampsHead(stamps.size, STAMPS.length);
  $('#stamps').innerHTML = STAMPS.map((e) => `<li class="${stamps.has(e[0]) ? 'on' : ''}"><i>${e[1]}</i><b>${t(e, 2, 4)}</b><span>${t(e, 3, 5)}</span></li>`).join('');
  $('#curiosHead').textContent = S.curiosHead(curiosFound.size, CURIOS.length);
  $('#curios').innerHTML = CURIOS.map((e) => curiosFound.has(e[0]) ? `<li>${t(e, 1, 3)}<span>${t(e, 2, 4)}</span></li>` : `<li class="no">· · ·</li>`).join('');
  $('#entries').innerHTML = JOURNAL.map((e) => seen.has(e[0])
    ? `<li><b>${t(e, 1, 3)}</b><span>${t(e, 2, 4)}</span></li>`
    : `<li class="no"><b>· · ·</b><span>${S.unknown}</span></li>`).join('');
}
life = createLife({
  world, scene, water, env, audio, hear, discover, curiosFound,
  onDuckling(n, m) {
    $('#pips').children[n - 1]?.classList.add('on');
    toast(S.duckling(n, m), 5000); audio.chime(false);
    if (n === m) setTimeout(() => discover('family'), 5200);
    renderJournal();
  },
  onBread(mine, n) {
    p.bread += mine; toast(S.bread(mine, n), 3600);
    if (mine === n && n >= 3) stamp('bread');
    renderJournal();
  },
});
$('#pips').innerHTML = life.ducklings.map(() => '<i></i>').join('');
applyLang();

// ---- what stands in the way of a flying duck -------------------------------------------------------
const roofs = world.houses.map((h) => ({ x: h.x, z: h.z, c: Math.cos(h.rot), s: Math.sin(h.rot), hw: h.w / 2 + 0.7, hd: h.d / 2 + 0.9, top: 0.82 + (h.st === 2 ? 5.3 : 3.1) + h.d * 0.27 + 1.0 }));
const spans = world.bridges.map((b) => ({ b, arch: b.kind === 'arch', x: b.x, z: b.z, c: Math.cos(b.rot), s: Math.sin(b.rot), R: b.hw - 0.35, L: b.kind === 'arch' ? b.hw + 5.5 : b.hw + 1.75, top: b.hw + 0.7, side: 0 }));
const fly = { arches: new Set(), dusk: 0, skid: 0, skidding: false, ceil: null, roofGap: 9 };
// Lowest height the duck may be at (x, z), given it is currently at height y. With `here`, also notes
// the ceiling when inside an arch and how closely a roof is being skimmed.
function clearance(x, z, y, here) {
  let g = world.sdf(x, z) <= 0 ? 0 : world.height(x, z) + 0.45;
  for (const r of roofs) {
    const dx = x - r.x, dz = z - r.z;
    if (Math.abs(dx) + Math.abs(dz) > 16) continue;
    if (Math.abs(dx * r.c - dz * r.s) < r.hw && Math.abs(dx * r.s + dz * r.c) < r.hd) { g = Math.max(g, r.top); if (here) fly.roofGap = y - r.top; }
  }
  for (const sp of spans) {
    const dx = x - sp.x, dz = z - sp.z;
    if (Math.abs(dx) + Math.abs(dz) > 40) continue;
    const lx = dx * sp.c - dz * sp.s, lz = dx * sp.s + dz * sp.c;
    if (Math.abs(lx) > sp.L) continue;
    if (!sp.arch) { if (Math.abs(lz) < 1.5 && y > 0.6) g = Math.max(g, 2.8); continue; }
    const vault = Math.abs(lx) < sp.R ? Math.sqrt(sp.R * sp.R - lx * lx) - 0.5 : -1;
    if (Math.abs(lz) < 2.2) {
      if (y > vault) g = Math.max(g, sp.top - (sp.top - 0.85) * (lx / sp.L) ** 2 + 0.8);      // over the hump
      else if (here) fly.ceil = vault;                                                         // through the hole
    }
    if (here && p.air) {       // did we just pass under it?
      const side = Math.sign(lz);
      if (sp.side && side && side !== sp.side && y <= vault) {
        fly.arches.add(sp); stamp('arch'); audio.wing(1.6);
        if (fly.arches.size === 3) stamp('three');
      }
      if (side) sp.side = side;
    }
  }
  return g;
}
const underArch = () => spans.find((sp) => { if (!sp.arch) return false; const dx = p.x - sp.x, dz = p.z - sp.z; return Math.abs(dx * sp.c - dz * sp.s) < sp.R && Math.abs(dx * sp.s + dz * sp.c) < 2.4; });

function takeOff() {
  p.air = true; p.alt = 0.06; p.vy = 1.5; p.drift = false; p.runT = 0;
  fly.arches.clear(); fly.dusk = 0; life.stats.flushed = 0;
  for (const sp of spans) sp.side = 0;
  audio.flap({ vol: 0.8 }); life.splash(p.x, p.z, 10, 1);
  stamp('fly'); tellOnce('flight', S.flight);
}
function touchDown() {
  p.air = false; p.alt = 0; p.vy = 0;
  fly.skid = 0; fly.skidding = p.speed > 3;
  life.splash(p.x, p.z, 16, 1.3); audio.skid(clamp(p.speed / 9, 0.4, 1));
  life.landed(p);
}
function goUnder() {
  if (p.air) return;
  if (p.under) return comeUp();
  if (world.height(p.x, p.z) > -0.75) return toast(S.shallow, 2600);
  p.under = true; p.breath = 8; p.drift = false;
  life.dive(p); life.splash(p.x + Math.sin(p.heading) * 0.3, p.z + Math.cos(p.heading) * 0.3, 6, 0.6); audio.splash(0.5);
  tellOnce('dive', S.dive);
}
function comeUp() { p.under = false; water.ring(p.x, p.z, 0.8); audio.plop({ vol: 0.7 }); }

// ---- input -----------------------------------------------------------------------------------
const keys = new Set(), stick = { x: 0, y: 0 }, touch = { flap: false };
const act = {
  quack() {
    if (p.quack > 0 || p.under) return;
    const arch = p.alt < 1.5 && underArch();
    p.quack = 0.55; audio.quack({ n: 2, echo: !!arch }); life.quacked(p);
    if (arch) stamp('echo');
    if (!p.air) water.ring(p.x + Math.sin(p.heading) * 0.3, p.z + Math.cos(p.heading) * 0.3, 0.5);
  },
  dive: goUnder,
  drift() { if (p.air || p.under) return; p.drift = !p.drift; toast(p.drift ? S.driftOn : S.driftOff, 2600); },
  photo() {
    draw(camera.position.y < 0);
    const src = renderer.domElement, c = document.createElement('canvas'), w = Math.min(1600, src.width), h = Math.round((w * src.height) / src.width);
    c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(src, 0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,.9)'; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 6;
    x.font = `${Math.round(h * 0.026)}px ui-monospace, Menlo, monospace`; x.fillText(`● DUCK CAM  ${clock()}`, w * 0.03, h * 0.065);
    x.font = `${Math.round(h * 0.03)}px "Songti SC", "Noto Serif CJK SC", serif`; x.textAlign = 'right'; x.fillText('止水 STILLWATER', w * 0.97, h * 0.95);
    const url = c.toDataURL('image/jpeg', 0.9), fig = $('#photo');
    fig.querySelector('img').src = url; fig.querySelector('a').href = url; fig.hidden = false;
    document.body.classList.add('flash'); setTimeout(() => document.body.classList.remove('flash'), 90);
    audio.shutter(); clearTimeout(fig.t); fig.t = setTimeout(() => (fig.hidden = true), 9000);
  },
  time() { env.skipAhead(); },
  journal() { const j = $('#journal'); j.hidden = !j.hidden; if (!j.hidden) renderJournal(); },
  help() { $('#keys').classList.toggle('faded'); },
};
const KEYMAP = { Space: 'quack', KeyE: 'dive', KeyF: 'drift', KeyC: 'photo', KeyT: 'time', KeyJ: 'journal', Tab: 'journal' };
addEventListener('keydown', (e) => {
  if (!started) { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); begin(); } return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (KEYMAP[e.code]) { e.preventDefault(); if (!e.repeat) act[KEYMAP[e.code]](); return; }
  if (e.code === 'KeyH') document.body.classList.toggle('clean');
  if (e.code === 'KeyM') $('#bSound').click();
  if (e.code === 'Escape') $('#journal').hidden = true;
  if (e.code.startsWith('Arrow')) e.preventDefault();
  keys.add(e.code);
  if (p.drift && ['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'ShiftLeft', 'ShiftRight'].includes(e.code)) p.drift = false;
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); touch.flap = false; });

const canvas = renderer.domElement;
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  look.yaw = clamp(look.yaw - (e.clientX - drag.x) * 0.0042, -2.5, 2.5);
  look.pitch = clamp(look.pitch - (e.clientY - drag.y) * 0.0036, -0.8, 0.75);
  drag.x = e.clientX; drag.y = e.clientY; look.idle = 0;
});
const endDrag = (e) => { if (drag && drag.id === e.pointerId) drag = null; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

const stickEl = $('#stick'), knob = stickEl.firstElementChild;
const moveStick = (e) => {
  const r = stickEl.getBoundingClientRect(), x = clamp((e.clientX - r.left - r.width / 2) / (r.width / 2), -1, 1), y = clamp((e.clientY - r.top - r.height / 2) / (r.height / 2), -1, 1);
  stick.x = x; stick.y = -y; knob.style.transform = `translate(${x * 36}px, ${y * 36}px)`;
  if (Math.abs(y) > 0.3) p.drift = false;
};
stickEl.addEventListener('pointerdown', (e) => { stickEl.setPointerCapture(e.pointerId); moveStick(e); });
stickEl.addEventListener('pointermove', (e) => { if (stickEl.hasPointerCapture(e.pointerId)) moveStick(e); });
const dropStick = () => { stick.x = stick.y = 0; knob.style.transform = ''; };
stickEl.addEventListener('pointerup', dropStick); stickEl.addEventListener('pointercancel', dropStick);

document.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act[b.dataset.act]()));
document.querySelectorAll('[data-hold]').forEach((b) => {
  b.addEventListener('pointerdown', (e) => { b.setPointerCapture(e.pointerId); touch.flap = true; p.drift = false; });
  for (const ev of ['pointerup', 'pointercancel']) b.addEventListener(ev, () => (touch.flap = false));
});
$('#bJournal').onclick = act.journal; $('#bTime').onclick = act.time; $('#bHelp').onclick = act.help;
$('#journal .close').onclick = () => ($('#journal').hidden = true);
$('#bSound').onclick = () => { audio.toggleMute(); applyLang(); };
$('#bMusic').onclick = () => { musicOn = audio.toggleMusic(); applyLang(); };
$('#bLang').onclick = () => { lang = zh() ? 'en' : 'zh'; store.set('lang', lang); applyLang(); };
$('#photo img').onclick = () => ($('#photo').hidden = true);
if (window.top !== window.self) $('#photo a').hidden = true;      // embedded pages cannot start downloads; the picture can still be saved by hand

function begin() {
  if (started) return;
  started = true; p.live = true; p.drift = false;
  audio.start();
  document.body.classList.remove('title');
  setTimeout(() => $('#keys').classList.add('faded'), 30000);
  setTimeout(() => toast(S.intro, 7000), 2500);
  setTimeout(() => { if (!stamps.has('fly')) toast(S.flyTip, 7000); }, 14000);
}
$('#start').onclick = begin;

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight); post.setSize();
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});

const clock = () => `${String(Math.floor(env.hour)).padStart(2, '0')}:${String(Math.floor((env.hour % 1) * 60)).padStart(2, '0')}`;

// ---- moving ----------------------------------------------------------------------------------
let wasFlap = false, patter = 0, skim = 0, fogTold = 0, lapU = world.uAt(p.x, p.z), lapSum = 0;
function move(dt) {
  const down = (...codes) => codes.some((c) => keys.has(c));
  const flap = started && (down('ShiftLeft', 'ShiftRight') || touch.flap);
  let fwd = clamp((down('KeyW', 'ArrowUp') ? 1 : 0) - (down('KeyS', 'ArrowDown') ? 1 : 0) + stick.y, -1, 1);
  let steer = (down('KeyA', 'ArrowLeft') ? 1 : 0) - (down('KeyD', 'ArrowRight') ? 1 : 0) - stick.x;
  if (p.drift && !p.air && !p.under) {
    // let the river carry us: aim a little way down the centreline
    const L = world.loop(world.uAt(p.x, p.z)), T = world.loop(L.u + 15 / L.sp);
    steer += clamp(wrap(Math.atan2(T.x - p.x, T.z - p.z) - p.heading) * 1.6, -1, 1); fwd = started ? 0.5 : 0.35;
  }
  steer = clamp(steer, -1, 1);
  p.lunge -= dt; p.lungeCool -= dt;
  const ease = (rate) => 1 - Math.exp(-dt * rate);

  if (p.air) {
    // flap to climb and keep speed, let go to glide, push forward to dive, pull back to slow
    const target = clamp((flap ? 9 : 6.6) + fwd * 2.6, 4.6, 11.5);
    p.speed += (target - p.speed) * ease(0.9);
    let vy = (flap ? 2.5 : -1.15) - Math.max(0, fwd) * 2.4 + Math.max(0, -fwd) * 0.5;
    if (p.alt > 14 && vy > 0) vy *= clamp(1 - (p.alt - 14) / 3, 0, 1);
    p.vy += (vy - p.vy) * ease(2.6);
    p.turn += (steer * 1.1 - p.turn) * ease(3);
  } else if (p.under) {
    if (flap && !wasFlap && p.lungeCool <= 0) { p.lunge = 0.4; p.lungeCool = 1.1; audio.stroke(2); }
    p.speed += ((p.lunge > 0 ? 3.9 : clamp(fwd, -0.5, 1) * 1.35) - p.speed) * ease(p.lunge > 0 ? 9 : 2.5);
    p.turn += (steer * 1.3 - p.turn) * ease(4.5);
    if ((p.breath -= dt) <= 0) comeUp();
  } else {
    // on the surface. Holding Shift is a flapping run across the water; keep it up and you lift off.
    p.runT = flap ? p.runT + dt : 0;
    const target = flap ? 6.4 : clamp(fwd, -0.55, 1) * 1.8;
    p.speed += (target - p.speed) * ease(flap ? 2.4 : Math.abs(target) > Math.abs(p.speed) ? 1.7 : p.speed > 3 ? 0.8 : 0.6);
    p.turn += (steer * (1.3 - Math.min(0.5, Math.abs(p.speed) * 0.1)) - p.turn) * ease(4.5);
    if (flap && p.runT > 0.75 && p.speed > 4.3) takeOff();
  }
  wasFlap = flap;
  p.dashing = p.air || p.speed > 3.2;
  p.heading += p.turn * dt;
  if (Math.hypot(p.x, p.z) > 306) {       // the edge of the map is just mist; ease the duck back round
    p.heading += clamp(wrap(Math.atan2(-p.x, -p.z) - p.heading), -1, 1) * dt * 1.6;
    if (time - fogTold > 30) { fogTold = time; toast(S.fog, 3200); }
  }

  const sh = Math.sin(p.heading), ch = Math.cos(p.heading);
  let nx = p.x + sh * p.speed * dt, nz = p.z + ch * p.speed * dt;
  if (p.air) {
    p.alt += p.vy * dt;
    fly.ceil = null; fly.roofGap = 9;
    let need = clearance(nx, nz, p.alt, true);
    for (const t of [0.35, 0.8]) need = Math.max(need, clearance(nx + sh * p.speed * t, nz + ch * p.speed * t, p.alt, false));
    if (p.alt < need) { p.alt += (need - p.alt) * Math.min(1, dt * 7); p.vy = Math.max(p.vy, 0); }
    if (fly.ceil !== null && p.alt > fly.ceil) { p.alt = Math.max(0, fly.ceil); p.vy = Math.min(p.vy, 0); }
    if (fly.roofGap < 1.4) stamp('roof');
    if (life.stats.flushed >= 3) stamp('egret');
    if (env.night > 0.8 && world.uAt(nx, nz) < 0.22 && Math.abs(world.sdf(nx, nz)) < 25) stamp('night');
    if (env.hour > 17.3 && env.hour < 19.4 && (fly.dusk += dt) > 10) stamp('dusk');
    if (p.alt < 0.7 && world.sdf(nx, nz) < 0 && (skim -= dt) < 0) { skim = 0.16; water.ring(nx, nz, 0.5); }     // wingbeats ruffle the water when you skim it
    p.x = nx; p.z = nz;
    if (p.alt <= 0) { if (world.sdf(nx, nz) < -0.35) touchDown(); else p.alt = 0.05; }
  } else {
    const d = world.sdf(nx, nz), margin = 0.34;
    if (d > -margin) {      // slide along the bank
      const gx = world.sdf(nx + 0.3, nz) - world.sdf(nx - 0.3, nz), gz = world.sdf(nx, nz + 0.3) - world.sdf(nx, nz - 0.3), gl = Math.hypot(gx, gz) || 1;
      nx -= (gx / gl) * (d + margin); nz -= (gz / gl) * (d + margin); p.speed *= 1 - dt * 1.5;
    }
    if (!p.under) for (const o of life.obstacles) {
      const ox = nx - o.x, oz = nz - o.z, od = Math.hypot(ox, oz), min = o.r + 0.25;
      if (od < min && od > 1e-4) { nx = o.x + (ox / od) * min; nz = o.z + (oz / od) * min; p.speed *= 1 - dt * 2; }
    }
    const moved = Math.hypot(nx - p.x, nz - p.z);
    p.x = nx; p.z = nz;

    if (p.under) {
      const got = life.peck(p, p.lunge > 0);
      if (got.snails) { p.snails += got.snails; audio.gulp(); discover('snail'); renderJournal(); }
      if (got.fish) { p.fishes += got.fish; audio.gulp(); stamp('fish'); toast(S.fish(p.fishes), 2800); renderJournal(); }
      if (got.curio) {
        const e = CURIOS.find((c) => c[0] === got.curio);
        curiosFound.add(got.curio); store.set('curios', [...curiosFound]);
        toast(zh() ? [e[1], e[2]] : [e[3], e[4]], 6000); audio.chime(true); renderJournal();
        if (curiosFound.size === CURIOS.length) stamp('relic');
      }
    } else {
      // feet: one soft splash per stroke, a ring left behind every so often, spray when running or skidding
      const before = p.stroke;
      p.stroke += (Math.abs(p.speed) * 3.4 + (Math.abs(p.turn) > 0.3 ? 1.2 : 0)) * dt;
      if (Math.floor(p.stroke / Math.PI) !== Math.floor(before / Math.PI) && Math.abs(p.speed) > 0.25 && p.speed < 3) audio.stroke(clamp(Math.abs(p.speed) / 1.5, 0.3, 1.6));
      if ((p.wake += moved) > 0.6) { p.wake = 0; water.ring(p.x - sh * 0.18, p.z - ch * 0.18, 0.3 + Math.min(1, Math.abs(p.speed) * 0.14)); }
      if (p.speed > 3 && (patter -= dt) < 0) { patter = 0.09; life.splash(p.x - sh * 0.2 + (Math.random() - 0.5) * 0.3, p.z - ch * 0.2 + (Math.random() - 0.5) * 0.3, 3, 0.9); if (flap) audio.stroke(1.4); }
      if (fly.skidding) { fly.skid += moved; if (fly.skid >= 8) stamp('skid'); if (p.speed < 3) fly.skidding = false; }
    }
  }

  // once round the whole river
  const u = world.uAt(p.x, p.z);
  if (Math.abs(world.sdf(p.x, p.z)) < 12) { let du = u - lapU; if (du > 0.5) du -= 1; if (du < -0.5) du += 1; lapSum += du; if (Math.abs(lapSum) >= 1) stamp('lap'); }
  lapU = u;
  p.quack = Math.max(0, p.quack - dt);
}

// ---- frame -----------------------------------------------------------------------------------
const focus = new THREE.Vector3(), underFog = new THREE.Color('#7fb08a');
let last = performance.now(), slow = 0, frames = 0, clockTimer = 0, beat = 0, air = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - last) / 1000, 0, 0.05); last = now;      // the first timestamp can predate start-up
  time += dt; windTime.value += dt;
  move(dt);
  focus.set(p.x, 0, p.z);
  env.update(started ? dt : dt * 0.3, focus);
  water.update(env, focus, dt);
  scenery.update(env, dt);
  life.update(dt, p);

  // the duck: bobbing, rocking with each stroke, banking in the air, head held steady the way birds do
  const sp = clamp(Math.abs(p.speed) / 1.5, 0, 1.6), ph = p.stroke, running = !p.air && !p.under && p.speed > 3.2;
  const flapping = (p.air && wasFlap) || running;
  const prevBeat = Math.floor(p.flapPh / TAU);
  p.flapPh += dt * (flapping ? 15 : 2.5);
  if (flapping && Math.floor(p.flapPh / TAU) !== prevBeat && (beat = 1 - beat)) audio.wing(p.air ? 1 : 0.6);
  const bob = p.air ? Math.sin(p.flapPh) * (flapping ? -0.014 : 0) : Math.sin(time * 1.1) * 0.006 + Math.sin(ph * 2) * 0.004 * sp;
  roll += ((p.air ? -p.turn * 0.4 : Math.sin(ph) * 0.034 * Math.min(sp, 1.2) - p.turn * 0.05) - roll) * Math.min(1, dt * (p.air ? 4 : 8));
  p.dive += ((p.under ? 1 : 0) - p.dive) * Math.min(1, dt * 5);
  const kk = p.dive * p.dive * (3 - 2 * p.dive);
  me.position.set(p.x, p.alt + bob + (running ? 0.04 : 0), p.z);
  me.rotation.set(kk * 1.2 + (p.air ? clamp(-p.vy * 0.07, -0.3, 0.3) : running ? -0.14 : 0), p.heading, roll, 'YXZ');
  poseWings(me, p.air || running, p.flapPh, flapping);
  const head = me.userData.head;
  if ((glance.t -= dt) < 0) { glance.t = 2.5 + Math.random() * 6; glance.yaw = Math.random() < 0.55 || p.air ? 0 : (Math.random() - 0.5) * 1.5; }
  let hy = p.turn * 0.5 + glance.yaw;
  const lost = started && !p.air ? life.lostNear(p, 26) : null;
  if (lost) {     // a duckling is peeping somewhere near: the head keeps turning that way
    hy = clamp(wrap(Math.atan2(lost.x - p.x, lost.z - p.z) - p.heading), -1.25, 1.25);
    if ((hintCool -= dt) < 0) { hintCool = 50; toast(S.hint, 4200); }
  }
  head.rotation.y += (hy - head.rotation.y) * Math.min(1, dt * (lost ? 2.2 : 3.5));
  const q = p.quack > 0 ? Math.sin((1 - p.quack / 0.55) * Math.PI * 2) : 0;
  head.rotation.x = -Math.abs(q) * 0.28 + Math.sin(ph * 2) * 0.03 * Math.min(sp, 1) + (p.air ? 0.25 : 0);
  head.rotation.z = -roll * 0.85;
  head.position.z = 0.14 + (p.air ? 0.03 : Math.sin(ph * 2 + 0.6) * 0.006 * sp);
  me.visible = kk < 0.2;

  // the camera, strapped between the wings (it rides a little higher and further back in the air)
  air += ((p.air ? 1 : 0) - air) * Math.min(1, dt * 3);
  if (!drag && (look.idle += dt) > 2.5 && Math.abs(p.speed) > 0.2) { const e = Math.min(1, dt * 0.9); look.yaw -= look.yaw * e; look.pitch -= look.pitch * e; }
  let cy = p.alt + 0.43 + bob * 1.5 - kk * 0.88 + air * 0.1;
  if (kk > 0.5) cy = Math.max(cy, world.height(p.x, p.z) + 0.22);
  const cz = -0.27 + kk * 0.45 - air * 0.1, cx = p.air ? 0 : Math.sin(ph) * 0.004 * sp;
  const sh = Math.sin(p.heading), ch = Math.cos(p.heading);
  camera.position.set(p.x + sh * cz - ch * cx, cy, p.z + ch * cz + sh * cx);
  const titleYaw = started ? 0 : 0.42;
  camera.rotation.set(-0.075 + look.pitch - kk * 0.06 + (p.air ? clamp(p.vy * 0.03, -0.14, 0.1) - 0.05 : 0), p.heading + Math.PI + look.yaw + titleYaw + (p.air ? 0 : Math.sin(ph) * 0.008 * sp), roll * 0.9 + Math.sin(time * 0.7) * 0.004);
  const fov = (camera.aspect < 0.8 ? 92 : 74) + (p.air ? 5 + p.speed * 0.9 : running ? 6 : p.lunge > 0 ? 6 : 0);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }

  const under = camera.position.y < 0;
  if (under) { scene.fog.color.copy(underFog).multiplyScalar(0.35 + 0.65 * (1 - env.night)); scene.fog.density = 0.13; }
  env.dome.visible = env.hills.visible = !under;
  const u = world.uAt(p.x, p.z);
  audio.update(dt, { speed: Math.abs(p.speed), rain: env.rain, night: env.night, under, air: p.air, lotus: u > 0.38 && u < 0.5 });
  $('#breath').classList.toggle('on', p.under);
  if (p.under) $('#breath i').style.transform = `scaleX(${clamp(p.breath / 8, 0, 1)})`;

  draw(under);

  if ((clockTimer -= dt) < 0) {
    clockTimer = 0.5; $('#clock').textContent = clock();
    $('#phase').textContent = S.phase[env.phaseName()] + (env.rain > 0.4 ? ' · ' + S.rain : '');
  }
  // if the machine is struggling, quietly trade resolution and shadows for smoothness
  if (started && quality > 0) {
    frames++; if (dt > 1 / 34) slow++;
    if (frames >= 150) { if (slow > 90) { quality--; applyQuality(); } frames = slow = 0; }
  }
}

$('#start').disabled = false; $('#start').textContent = S.start;
requestAnimationFrame(frame);
// A handle for debugging and tests: `step` advances the game without drawing.
window.__stillwater = { p, env, world, life, begin, act, look, camera, renderer, fly, keys, stamps, seen, step(dt) { move(dt); life.update(dt, p); } };
