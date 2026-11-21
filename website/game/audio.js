/* OMAN: THE DARK SIDE — audio engine v2 (Web Audio).
 *
 * Goals: natural, quiet, never harsh.
 *  - Footsteps use granular synthesis (many tiny grains per step: heel + roll + toe),
 *    pre-rendered into buffers per surface (sand, gravel, asphalt, floor).
 *  - Ambience: soft wind bed, distant crickets, light leaf rustle. No whistles, no buzzing tones.
 *  - A master limiter keeps peaks gentle.
 *  - REAL RECORDINGS: if files exist in game/sounds/ (see README there), they replace
 *    the synthesised versions automatically: wind.mp3, night.mp3, step_sand_1..4.mp3,
 *    step_gravel_1..4.mp3, step_floor_1..4.mp3, step_asphalt_1..4.mp3, engine.mp3.
 */
(function () {
  'use strict';
  const A = {};
  let ctx = null, master, limiter, amb, sfx, rev, revSend, droneG, engine = null;
  let noise = null, brown = null;
  const steps = { sand: [], gravel: [], asphalt: [], floor: [] };
  const real = {};
  const rnd = (a, b) => a + Math.random() * (b - a);

  function buf(seconds, fill, ch = 1) {
    const n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(ch, n, ctx.sampleRate);
    for (let c = 0; c < ch; c++) fill(b.getChannelData(c), ctx.sampleRate, c);
    return b;
  }
  function setPos(node, x, y, z) { if (node.positionX) { node.positionX.value = x; node.positionY.value = y; node.positionZ.value = z; } else node.setPosition(x, y, z); }
  function panner(x, y, z, ref) { const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref || 2; p.rolloffFactor = 1; p.maxDistance = 120; setPos(p, x, y, z); return p; }
  function env(g, t, a, peak, hold, r) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + r); }

  /** One granular footstep. Each surface has its own grain density, brightness and length. */
  function renderStep(surface, seed) {
    const P = {
      sand: { len: 0.32, heel: 70, toe: 55, hp: 0.55, body: 0.25, bright: 0.35, tail: 0.11 },
      gravel: { len: 0.30, heel: 110, toe: 80, hp: 0.25, body: 0.18, bright: 0.75, tail: 0.08 },
      asphalt: { len: 0.20, heel: 30, toe: 26, hp: 0.15, body: 0.35, bright: 0.55, tail: 0.04 },
      floor: { len: 0.22, heel: 24, toe: 18, hp: 0.4, body: 0.5, bright: 0.3, tail: 0.05 },
    }[surface];
    let s = seed * 9301 + 49297; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    return buf(P.len, (d, sr) => {
      const grains = (t0, count, spread) => {
        for (let g = 0; g < count; g++) {
          const start = Math.floor((t0 + Math.pow(r(), 1.6) * spread) * sr);
          const glen = Math.floor(sr * (0.0015 + r() * 0.006 * (1.2 - P.bright)));
          const amp = (0.15 + r() * 0.85) * Math.exp(-(start / sr - t0) / (spread * 0.6));
          let prev = 0;
          for (let i = 0; i < glen && start + i < d.length; i++) {
            const w = Math.sin(Math.PI * i / glen);               // Hann-like window
            let v = Math.random() * 2 - 1;
            v = v * P.bright + prev * (1 - P.bright); prev = v;    // brightness = one-pole low-pass
            d[start + i] += v * w * amp * 0.5;
          }
        }
      };
      grains(0.004, P.heel, P.tail);          // heel strike
      grains(0.085 + r() * 0.03, P.toe, P.tail * 1.2); // roll to toe
      // soft low "body" of the foot landing
      for (let i = 0; i < sr * 0.05; i++) { const t = i / sr; d[i] += Math.sin(2 * Math.PI * (95 + r() * 10) * t) * Math.exp(-t * 60) * P.body * 0.35; }
      // gentle high-pass to remove rumble
      let x1 = 0, y1 = 0; const a = P.hp;
      for (let i = 0; i < d.length; i++) { const y = a * (y1 + d[i] - x1); x1 = d[i]; y1 = y; d[i] = d[i] * (1 - a) + y * a; }
      // normalise
      let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
      if (m > 0) for (let i = 0; i < d.length; i++) d[i] /= m;
    });
  }

  async function tryLoad(name) {
    try {
      const res = await fetch('sounds/' + name, { cache: 'force-cache' });
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      return await new Promise((ok, no) => ctx.decodeAudioData(ab, ok, no));
    } catch (e) { return null; }
  }
  async function loadReal() {
    // Only files listed in sounds/manifest.json are requested (no failed requests on phones).
    let files = [];
    try { const r = await fetch('sounds/manifest.json', { cache: 'no-cache' }); if (r.ok) files = (await r.json()).files || []; } catch (e) { files = []; }
    await Promise.all(files.map((f) => tryLoad(f).then((b) => {
      if (!b) return;
      const m = /^step_(sand|gravel|asphalt|floor)_\d+\./.exec(f);
      if (m) (real['step_' + m[1]] = real['step_' + m[1]] || []).push(b);
      else real[f.replace(/\.[a-z0-9]+$/i, '')] = b;
    })));
    if (real.wind) startLoop(real.wind, 0.5, amb); else synthWind();
    if (real.night) startLoop(real.night, 0.45, amb);
  }
  function startLoop(b, vol, dest) { const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(dest); s.start(); return { s, g }; }

  function synthWind() {
    // brown-noise body, slowly breathing low-pass. No resonant whistle.
    const s = ctx.createBufferSource(); s.buffer = brown; s.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 0.3;
    const g = ctx.createGain(); g.gain.value = 0.16;
    const l1 = ctx.createOscillator(); l1.frequency.value = 0.05; const l1a = ctx.createGain(); l1a.gain.value = 160; l1.connect(l1a); l1a.connect(lp.frequency);
    const l2 = ctx.createOscillator(); l2.frequency.value = 0.031; const l2a = ctx.createGain(); l2a.gain.value = 0.06; l2.connect(l2a); l2a.connect(g.gain);
    s.connect(lp); lp.connect(g); g.connect(amb); s.start(); l1.start(); l2.start();
    // faint airy layer (broad, not tonal)
    const s2 = ctx.createBufferSource(); s2.buffer = noise; s2.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.5;
    const g2 = ctx.createGain(); g2.gain.value = 0.012; s2.connect(bp); bp.connect(g2); g2.connect(amb); s2.start();
  }

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    noise = buf(2, (d) => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; });
    brown = buf(4, (d) => { let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } });
    limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -14; limiter.knee.value = 10; limiter.ratio.value = 6; limiter.attack.value = 0.004; limiter.release.value = 0.25;
    master = ctx.createGain(); master.gain.value = 0.85; master.connect(limiter); limiter.connect(ctx.destination);
    amb = ctx.createGain(); amb.gain.value = 1; amb.connect(master);
    sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
    rev = ctx.createConvolver(); rev.buffer = buf(1.6, (d) => { for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); }, 2);
    revSend = ctx.createGain(); revSend.gain.value = 0.06; revSend.connect(rev); rev.connect(master);
    droneG = ctx.createGain(); droneG.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    [55, 82.5].forEach((f) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const og = ctx.createGain(); og.gain.value = 0.5; o.connect(og); og.connect(lp); o.start(); });
    lp.connect(droneG); droneG.connect(master);
    Object.keys(steps).forEach((s, si) => { for (let i = 0; i < 6; i++) steps[s].push(renderStep(s, si * 31 + i * 7 + 3)); });
    loadReal();
  };
  A.ready = () => !!ctx;
  A.suspend = () => ctx && ctx.suspend();
  A.resume = () => ctx && ctx.resume();
  A.setVolume = (v) => { if (master) master.gain.setTargetAtTime(0.85 * v, ctx.currentTime, 0.05); };
  A.hasReal = () => Object.keys(real);

  A.setListener = function (pos, fwd) {
    if (!ctx) return; const L = ctx.listener;
    if (L.positionX) { L.positionX.value = pos.x; L.positionY.value = pos.y; L.positionZ.value = pos.z; L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
    else { L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0); }
  };
  A.setIndoor = (on) => { if (ctx) revSend.gain.setTargetAtTime(on ? 0.32 : 0.06, ctx.currentTime, 0.4); };
  A.fadeAmbience = (to, sec) => { if (!ctx) return; amb.gain.cancelScheduledValues(ctx.currentTime); amb.gain.setValueAtTime(amb.gain.value, ctx.currentTime); amb.gain.linearRampToValueAtTime(to, ctx.currentTime + sec); };
  A.drone = (to, sec) => { if (ctx) droneG.gain.setTargetAtTime(to * 0.6, ctx.currentTime, sec / 3); };

  A.footstep = function (surface, running) {
    if (!ctx) return;
    const list = (real['step_' + surface] && real['step_' + surface].length) ? real['step_' + surface] : steps[surface] || steps.gravel;
    const s = ctx.createBufferSource(); s.buffer = list[Math.floor(Math.random() * list.length)];
    s.playbackRate.value = rnd(0.92, 1.08) * (running ? 1.06 : 1);
    const g = ctx.createGain(); g.gain.value = (running ? 0.32 : 0.22) * rnd(0.85, 1.05);
    s.connect(g); g.connect(sfx); g.connect(revSend); s.start();
  };

  /** Distant crickets: short, soft, irregular. */
  A.addCricket = function (x, y, z) {
    if (!ctx) return;
    const p = panner(x, y, z, 4); const pg = ctx.createGain(); pg.gain.value = 0.5; p.connect(pg); pg.connect(amb);
    const base = rnd(3900, 4500);
    (function chirp() {
      if (real.night) return;
      const t = ctx.currentTime + 0.02, pulses = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < pulses; i++) {
        const o = ctx.createOscillator(); o.frequency.value = base + rnd(-30, 30);
        const g = ctx.createGain(); env(g, t + i * 0.055, 0.008, 0.018, 0.018, 0.025);
        o.connect(g); g.connect(p); o.start(t + i * 0.055); o.stop(t + i * 0.055 + 0.08);
      }
      setTimeout(chirp, rnd(600, 2200));
    })();
  };

  A.click = function () { if (!ctx) return; const t = ctx.currentTime; const s = ctx.createBufferSource(); s.buffer = noise; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 2; const g = ctx.createGain(); env(g, t, 0.001, 0.12, 0.004, 0.02); s.connect(bp); bp.connect(g); g.connect(sfx); s.start(t, Math.random(), 0.05); };

  A.pickup = function () {
    if (!ctx) return; const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noise; const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3500; hp.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); for (let i = 0; i < 5; i++) g.gain.linearRampToValueAtTime(rnd(0.03, 0.08), t + 0.03 + i * 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    s.connect(hp); hp.connect(g); g.connect(sfx); s.start(t, Math.random(), 0.4);
    [220, 330].forEach((f, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const og = ctx.createGain(); env(og, t + 0.05 + i * 0.12, 0.02, 0.05, 0.15, 0.9); o.connect(og); og.connect(sfx); og.connect(revSend); o.start(t); o.stop(t + 2); });
  };
  A.success = function () {
    if (!ctx) return; const t = ctx.currentTime;
    [261.6, 329.6, 392, 523.2].forEach((f, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const og = ctx.createGain(); env(og, t + i * 0.11, 0.02, 0.06, 0.3, 1.4); o.connect(og); og.connect(sfx); og.connect(revSend); o.start(t); o.stop(t + 3); });
  };
  A.wrong = function () { if (!ctx) return; const t = ctx.currentTime; const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 180; const g = ctx.createGain(); env(g, t, 0.01, 0.06, 0.1, 0.3); o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.6); };

  A.heartbeat = function () { if (!ctx) return; const t = ctx.currentTime; [0, 0.27].forEach((d, i) => { const o = ctx.createOscillator(); o.frequency.setValueAtTime(58, t + d); o.frequency.exponentialRampToValueAtTime(38, t + d + 0.12); const g = ctx.createGain(); env(g, t + d, 0.01, i ? 0.12 : 0.18, 0.02, 0.14); o.connect(g); g.connect(sfx); o.start(t + d); o.stop(t + d + 0.25); }); };

  const FORM = [[700, 1220], [390, 2300], [300, 870], [640, 1190], [450, 1750], [520, 1500]];
  function whisperInto(dest, start, syl, loud) {
    let t = start;
    for (let i = 0; i < syl; i++) {
      const dur = rnd(0.12, 0.26), s = ctx.createBufferSource(); s.buffer = noise;
      const g = ctx.createGain(); env(g, t, 0.04, loud * rnd(0.6, 1), dur, 0.09);
      const [f1, f2] = FORM[Math.floor(Math.random() * FORM.length)];
      [f1, f2].forEach((f) => { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * rnd(0.95, 1.05); bp.Q.value = 5; s.connect(bp); bp.connect(g); });
      g.connect(dest); s.start(t, Math.random() * 1.4, dur + 0.2);
      t += dur + rnd(0.05, 0.14) + (Math.random() < 0.2 ? rnd(0.25, 0.5) : 0);
    }
    return t;
  }
  A.whisperAt = function (x, y, z) { if (!ctx) return 0; const p = panner(x, y, z, 2.5); const g = ctx.createGain(); g.gain.value = 2.2; p.connect(g); g.connect(sfx); g.connect(revSend); const t0 = ctx.currentTime + 0.05; return whisperInto(p, t0, 7 + Math.floor(Math.random() * 4), 0.45) - t0; };
  A.voice = function (seconds, lofi) {
    if (!ctx) return; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = lofi ? 1500 : 1100; bp.Q.value = lofi ? 0.9 : 0.5;
    const g = ctx.createGain(); g.gain.value = lofi ? 1.6 : 1.1; bp.connect(g); g.connect(sfx);
    let t = ctx.currentTime + 0.05; const end = t + seconds; while (t < end - 0.3) t = whisperInto(bp, t, 3, 0.4) + rnd(0.05, 0.2);
  };
  /** Footsteps that follow the player (horror event). */
  A.followSteps = function (getPos, count) {
    if (!ctx) return; let n = 0;
    (function one() {
      if (n++ >= count) return; const p = getPos(); const pn = panner(p.x, p.y, p.z, 2);
      const s = ctx.createBufferSource(); s.buffer = steps.floor[n % steps.floor.length]; s.playbackRate.value = 0.85;
      const g = ctx.createGain(); g.gain.value = 0.5; s.connect(g); g.connect(pn); pn.connect(sfx); pn.connect(revSend); s.start();
      setTimeout(one, 560 + Math.random() * 80);
    })();
  };

  // ---- vehicle ----
  A.engineStart = function () {
    if (!ctx || engine) return;
    const g = ctx.createGain(); g.gain.value = 0; g.connect(sfx);
    if (real.engine) { const s = ctx.createBufferSource(); s.buffer = real.engine; s.loop = true; s.connect(g); s.start(); engine = { g, s, real: true }; }
    else {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 38;
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 19;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 0.4;
      const og = ctx.createGain(); og.gain.value = 0.25; const o2g = ctx.createGain(); o2g.gain.value = 0.4;
      o.connect(og); og.connect(lp); o2.connect(o2g); o2g.connect(lp); lp.connect(g); o.start(); o2.start();
      engine = { g, o, o2, lp };
    }
    const tn = ctx.createBufferSource(); tn.buffer = noise; tn.loop = true; const tbp = ctx.createBiquadFilter(); tbp.type = 'lowpass'; tbp.frequency.value = 700; const tg = ctx.createGain(); tg.gain.value = 0; tn.connect(tbp); tbp.connect(tg); tg.connect(sfx); tn.start();
    engine.tire = tg; engine.g.gain.setTargetAtTime(0.16, ctx.currentTime, 0.3);
  };
  A.engineUpdate = function (speed01, offroad) {
    if (!engine) return; const t = ctx.currentTime;
    if (engine.real) engine.s.playbackRate.setTargetAtTime(0.8 + speed01 * 0.8, t, 0.1);
    else { engine.o.frequency.setTargetAtTime(36 + speed01 * 55, t, 0.12); engine.o2.frequency.setTargetAtTime(18 + speed01 * 27, t, 0.12); engine.lp.frequency.setTargetAtTime(240 + speed01 * 520, t, 0.12); }
    engine.tire.gain.setTargetAtTime(speed01 * (offroad ? 0.06 : 0.025), t, 0.15);
  };
  A.engineStop = function () {
    if (!engine) return; const e = engine, t = ctx.currentTime; engine = null;
    e.g.gain.setTargetAtTime(0, t, 0.2); e.tire.gain.setTargetAtTime(0, t, 0.2);
    setTimeout(() => { try { if (e.o) { e.o.stop(); e.o2.stop(); } if (e.s) e.s.stop(); } catch (x) { /* already stopped */ } }, 1200);
  };
  A.door = function () { if (!ctx) return; const t = ctx.currentTime; const s = ctx.createBufferSource(); s.buffer = noise; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; const g = ctx.createGain(); env(g, t, 0.002, 0.4, 0.02, 0.12); s.connect(lp); lp.connect(g); g.connect(sfx); s.start(t, Math.random(), 0.3); };

  window.OTDAudio = A;
})();
