// audio.js — every sound is synthesised here: water, quacks, birds, frogs, rain,
// and a sparse pentatonic melody on a plucked string. No audio files.

const NOTES = [146.83, 220, 293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880];

export function createAudio() {
  let ctx, master, wet, low, sfx, amb, music, noiseBuf, waterGain, rainGain, windGain, echoSend, strings = [];
  let muted = false, musicOn = true, timers = { bird: 2, cricket: 1, frog: 4, note: 5, phrase: 0 }, step = 5, state = {};
  const R = Math.random;

  function start() {
    if (ctx) { ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 20000;
    master.connect(low); low.connect(ctx.destination);
    sfx = ctx.createGain(); amb = ctx.createGain(); music = ctx.createGain(); music.gain.value = 0.5;
    // a little space: one feedback delay shared by the melody and the voices
    wet = ctx.createDelay(1); wet.delayTime.value = 0.31;
    const fb = ctx.createGain(); fb.gain.value = 0.36;
    const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2200;
    wet.connect(damp); damp.connect(fb); fb.connect(wet); damp.connect(master);
    for (const g of [sfx, amb, music]) g.connect(master);
    const send = ctx.createGain(); send.gain.value = 0.3; music.connect(send); send.connect(wet);
    const send2 = ctx.createGain(); send2.gain.value = 0.12; sfx.connect(send2); send2.connect(wet);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1;
    const loop = (type, freq, q) => {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(amb); src.start();
      return g;
    };
    waterGain = loop('bandpass', 420, 0.5);
    rainGain = loop('highpass', 2600, 0.3);
    windGain = loop('bandpass', 620, 0.4);
    echoSend = ctx.createGain(); echoSend.gain.value = 0.9; echoSend.connect(wet);

    // plucked strings, Karplus–Strong, rendered once
    strings = NOTES.map((f) => {
      const len = Math.floor(ctx.sampleRate * 2.6), buf = ctx.createBuffer(1, len, ctx.sampleRate), y = buf.getChannelData(0), n = Math.round(ctx.sampleRate / f);
      let prev = 0;
      for (let i = 0; i < n; i++) { prev = prev * 0.5 + (R() * 2 - 1) * 0.5; y[i] = prev; }
      for (let i = n; i < len; i++) y[i] = (y[i - n] + y[i - n + 1]) * 0.4985;
      return buf;
    });
  }

  const out = (pan = 0, vol = 1, bus = sfx) => {
    const g = ctx.createGain(); g.gain.value = vol;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(bus); } else g.connect(bus);
    return g;
  };
  const ok = () => ctx && !muted && ctx.state === 'running';
  const burst = (dest, t, dur, type, f0, f1, q = 1, vol = 1) => {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t, R()); src.stop(t + dur + 0.02);
  };
  const tone = (dest, t, dur, type, f0, f1, vol = 1, attack = 0.008) => {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
    return o;
  };

  function quack({ pan = 0, vol = 1, pitch = 1, n = 2, echo = false } = {}) {
    if (!ok() || vol < 0.01) return;
    const dest = out(pan, vol * 0.5), t0 = ctx.currentTime + 0.01;
    if (echo) dest.connect(echoSend);      // under a stone arch the call comes back to you
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.2, f = 470 * pitch * (1 - i * 0.04), dur = i === 0 ? 0.19 : 0.15;
      // a reedy source through two formants: the nasal "waak"
      const mix = ctx.createGain(); mix.gain.value = 1;
      for (const [fc, q, g] of [[1050 * pitch, 3, 1], [2350 * pitch, 5, 0.55], [640 * pitch, 2, 0.5]]) {
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fc; bp.Q.value = q;
        const gg = ctx.createGain(); gg.gain.value = g; mix.connect(bp); bp.connect(gg); gg.connect(dest);
      }
      tone(mix, t, dur, 'sawtooth', f * 1.14, f * 0.8, 1, 0.012);
      tone(mix, t, dur, 'square', f * 0.57, f * 0.4, 0.5, 0.012);
      burst(mix, t, dur * 0.8, 'bandpass', 1500, 900, 1, 0.5);
    }
  }
  function peep({ pan = 0, vol = 1, n = 2 } = {}) {
    if (!ok() || vol < 0.01) return;
    const dest = out(pan, vol * 0.16), t0 = ctx.currentTime + 0.01;
    for (let i = 0; i < n; i++) { const f = 3000 + R() * 500; tone(dest, t0 + i * 0.13, 0.085, 'sine', f, f * 1.28, 1, 0.01); }
  }
  function plop({ pan = 0, vol = 1 } = {}) {
    if (!ok() || vol < 0.01) return;
    const dest = out(pan, vol * 0.5), t = ctx.currentTime + 0.01;
    tone(dest, t, 0.13, 'sine', 430, 105, 0.9); burst(dest, t, 0.1, 'bandpass', 1200, 700, 1, 0.25);
  }
  function splash(vol = 1, pan = 0) {
    if (!ok()) return;
    const dest = out(pan, vol * 0.4), t = ctx.currentTime + 0.01;
    burst(dest, t, 0.42, 'bandpass', 2400, 500, 0.7, 0.8); burst(dest, t + 0.05, 0.3, 'highpass', 3000, 2000, 0.5, 0.25);
  }
  function wing(vol = 1, pan = 0) { if (ok()) burst(out(pan, vol * 0.16), ctx.currentTime, 0.13, 'lowpass', 1100, 260, 0.6, 1); }
  function skid(vol = 1) { if (ok()) { const d = out(0, vol * 0.5), t = ctx.currentTime; burst(d, t, 1.1, 'bandpass', 2600, 700, 0.5, 1); burst(d, t, 0.25, 'lowpass', 500, 120, 0.8, 0.9); } }
  function nom() { if (ok()) { const d = out(0, 0.22), t = ctx.currentTime; tone(d, t, 0.06, 'triangle', 520, 760, 0.8); } }
  function stroke(vol = 1) { if (ok()) burst(out((R() - 0.5) * 0.5, vol * 0.07), ctx.currentTime, 0.22, 'lowpass', 900, 300, 0.7, 1); }
  function flap({ pan = 0, vol = 1 } = {}) {
    if (!ok() || vol < 0.01) return;
    const dest = out(pan, vol * 0.3), t = ctx.currentTime;
    for (let i = 0; i < 7; i++) burst(dest, t + i * 0.13, 0.09, 'lowpass', 700, 300, 0.7, 1 - i * 0.1);
  }
  function gulp() { if (ok()) { const t = ctx.currentTime; const d = out(0, 0.3); tone(d, t, 0.09, 'sine', 240, 520, 0.8); tone(d, t + 0.11, 0.09, 'sine', 300, 640, 0.6); } }
  function pluck(i, vol = 1, when = 0, pan = 0) {
    if (!ok() || !musicOn) return;
    const src = ctx.createBufferSource(); src.buffer = strings[i];
    src.connect(out(pan, vol, music)); src.start(ctx.currentTime + when);
  }
  function chime(big = false) { (big ? [2, 4, 5, 7, 8, 9] : [5, 7, 8]).forEach((n, i) => pluck(n, 0.55, i * (big ? 0.16 : 0.12), (i - 1) * 0.2)); }
  function shutter() { if (ok()) { const d = out(0, 0.25), t = ctx.currentTime; burst(d, t, 0.03, 'highpass', 3000, 2500, 1, 1); burst(d, t + 0.07, 0.04, 'highpass', 2500, 2000, 1, 0.8); } }

  function bird() {
    const dest = out((R() - 0.5) * 1.6, 0.03 + R() * 0.05, amb), t0 = ctx.currentTime + 0.02, kind = Math.floor(R() * 3), base = 2400 + R() * 1800;
    const n = kind === 0 ? 2 + Math.floor(R() * 4) : kind === 1 ? 6 + Math.floor(R() * 5) : 2;
    for (let i = 0; i < n; i++) {
      if (kind === 0) tone(dest, t0 + i * 0.17, 0.1, 'sine', base, base * (1.25 + R() * 0.2), 1, 0.01);        // swallow-like chips
      else if (kind === 1) tone(dest, t0 + i * 0.065, 0.05, 'sine', base * 1.3, base * 1.1, 0.8, 0.005);      // a quick trill
      else tone(dest, t0 + i * 0.34, 0.26, 'sine', base * (i ? 0.62 : 0.78), base * (i ? 0.6 : 0.76), 1, 0.03); // cuckoo's two notes
    }
  }
  function cricket() { const dest = out((R() - 0.5) * 1.8, 0.012 + R() * 0.012, amb), t0 = ctx.currentTime, f = 4100 + R() * 500; for (let i = 0; i < 3; i++) tone(dest, t0 + i * 0.055, 0.04, 'sine', f, f, 1, 0.004); }
  function frog(vol) {
    const dest = out((R() - 0.5) * 1.6, vol, amb), t0 = ctx.currentTime, f = 150 + R() * 60, n = 2 + Math.floor(R() * 3);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700 + R() * 300; bp.Q.value = 2.5; bp.connect(dest);
    for (let i = 0; i < n; i++) tone(bp, t0 + i * 0.2, 0.12, 'square', f, f * 0.9, 1, 0.01);
  }

  // Called every frame with what the world is like right now.
  function update(dt, s) {
    state = s;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(muted ? 0 : 0.9, t, 0.1);
    waterGain.gain.setTargetAtTime(0.02 + Math.min(0.09, s.speed * 0.028), t, 0.3);
    rainGain.gain.setTargetAtTime(s.rain * 0.09, t, 0.5);
    windGain.gain.setTargetAtTime(s.air ? Math.min(0.16, s.speed * 0.014) : 0, t, 0.25);
    low.frequency.setTargetAtTime(s.under ? 420 : 20000, t, 0.06);
    if (muted) return;
    const day = 1 - s.night;
    if ((timers.bird -= dt) < 0) { timers.bird = (1.5 + R() * 5) / Math.max(0.15, day * (1 - s.rain * 0.7)); if (day > 0.25) bird(); }
    if ((timers.cricket -= dt) < 0) { timers.cricket = 0.35 + R() * 0.9; if (s.night > 0.4 && s.rain < 0.5) cricket(); }
    if ((timers.frog -= dt) < 0) { timers.frog = 2 + R() * 6; const v = (s.night * 0.05 + s.rain * 0.03) * (s.lotus ? 2 : 1); if (v > 0.01) frog(v); }
    if (!musicOn) return;
    // the melody: short wandering phrases with long breaths between them
    if ((timers.note -= dt) < 0) {
      if (timers.phrase <= 0) { timers.phrase = 5 + Math.floor(R() * 8); timers.note = 7 + R() * 12; if (R() < 0.6) pluck(R() < 0.5 ? 0 : 1, 0.5); return; }
      timers.phrase--;
      step = Math.max(2, Math.min(NOTES.length - 1, step + [-2, -1, -1, 1, 1, 2][Math.floor(R() * 6)]));
      pluck(step, 0.3 + R() * 0.2, 0, (R() - 0.5) * 0.6);
      if (R() < 0.15) pluck(Math.max(2, step - 2), 0.2, 0.02);
      timers.note = [0.42, 0.42, 0.84, 0.84, 1.26, 1.68][Math.floor(R() * 6)] * (s.night > 0.5 ? 1.3 : 1);
    }
  }

  return {
    start, update, quack, peep, plop, splash, stroke, flap, gulp, chime, shutter, wing, skid, nom,
    get muted() { return muted; },
    toggleMute() { muted = !muted; return muted; },
    toggleMusic() { musicOn = !musicOn; return musicOn; },
  };
}
