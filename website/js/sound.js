/* Minimal, quiet sound layer. Real recordings listed in sounds/manifest.json replace
 * the synthesised versions (wind.mp3, night.mp3, clue.mp3, page.mp3, whisper.mp3, steps.mp3).
 */
(function () {
  'use strict';
  const S = (window.SND = {});
  let ctx = null, master, amb, noise, real = {}, on = true;
  const env = (g, t, a, p, h, r) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(p, t + a); g.gain.setValueAtTime(p, t + a + h); g.gain.exponentialRampToValueAtTime(0.0001, t + a + h + r); };
  const play = (b, vol, rate = 1) => { const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start(); return s; };

  S.init = function () {
    if (ctx) { ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = on ? 0.8 : 0; master.connect(comp);
    amb = ctx.createGain(); amb.gain.value = 0; amb.connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate); const d = noise.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.2; }
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 340; const g = ctx.createGain(); g.gain.value = 0.11;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.04; const la = ctx.createGain(); la.gain.value = 120; lfo.connect(la); la.connect(lp.frequency); lfo.start();
    s.connect(lp); lp.connect(g); g.connect(amb); s.start();
    fetch('sounds/manifest.json').then((r) => (r.ok ? r.json() : { files: [] })).then((m) => Promise.all((m.files || []).map((f) => fetch('sounds/' + f).then((r) => r.arrayBuffer()).then((ab) => new Promise((ok) => ctx.decodeAudioData(ab, (b) => { real[f.replace(/\.[^.]+$/, '')] = b; ok(); }, ok))).catch(() => {})))).then(() => { if (real.wind) { const w = ctx.createBufferSource(); w.buffer = real.wind; w.loop = true; const wg = ctx.createGain(); wg.gain.value = 0.6; w.connect(wg); wg.connect(amb); w.start(); g.gain.value = 0; } if (real.night) { const n = ctx.createBufferSource(); n.buffer = real.night; n.loop = true; const ng = ctx.createGain(); ng.gain.value = 0.5; n.connect(ng); ng.connect(amb); n.start(); } }).catch(() => {});
  };
  S.toggle = () => { on = !on; if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.1); return on; };
  S.isOn = () => on;
  S.ambience = (level) => { if (ctx) amb.gain.setTargetAtTime(level, ctx.currentTime, 1.2); };

  S.clue = () => {
    if (!ctx) return; if (real.clue) return play(real.clue, 0.6);
    const t = ctx.currentTime; [392, 587.3].forEach((f, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ctx.createGain(); env(g, t + i * 0.09, 0.01, 0.07, 0.12, 1.1); o.connect(g); g.connect(master); o.start(t); o.stop(t + 2); });
  };
  S.page = () => {
    if (!ctx) return; if (real.page) return play(real.page, 0.6);
    const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noise; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2200; const g = ctx.createGain(); env(g, t, 0.02, 0.05, 0.06, 0.12); s.connect(hp); hp.connect(g); g.connect(master); s.start(t, Math.random(), 0.3);
  };
  S.click = () => { if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 1200; const g = ctx.createGain(); env(g, t, 0.001, 0.04, 0.005, 0.03); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.08); };
  S.wrong = () => { if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 170; const g = ctx.createGain(); env(g, t, 0.01, 0.06, 0.12, 0.3); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.6); };
  S.solve = () => { if (!ctx) return; const t = ctx.currentTime; [261.6, 329.6, 392, 523.2].forEach((f, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ctx.createGain(); env(g, t + i * 0.12, 0.02, 0.05, 0.3, 1.5); o.connect(g); g.connect(master); o.start(t); o.stop(t + 3); }); };
  /** A breathy whisper from the left or right (pan -1..1). */
  S.whisper = (pan = 0.6, syl = 8) => {
    if (!ctx) return; if (real.whisper) { const p = ctx.createStereoPanner(); p.pan.value = pan; const s = ctx.createBufferSource(); s.buffer = real.whisper; const g = ctx.createGain(); g.gain.value = 0.5; s.connect(g); g.connect(p); p.connect(master); s.start(); return; }
    const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(master); let t = ctx.currentTime + 0.05;
    for (let i = 0; i < syl; i++) { const dur = 0.12 + Math.random() * 0.14, s = ctx.createBufferSource(); s.buffer = noise; const g = ctx.createGain(); env(g, t, 0.04, 0.08 + Math.random() * 0.05, dur, 0.09); [[700, 1200], [390, 2300], [300, 870], [640, 1190]][i % 4].forEach((f) => { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2.2; bp.Q.value = 4; s.connect(bp); bp.connect(g); }); g.connect(p); s.start(t, Math.random() * 2, dur + 0.2); t += dur + 0.08 + Math.random() * 0.12 + (Math.random() < 0.2 ? 0.35 : 0); }
  };
  /** Slow footsteps that pass behind the listener, left to right. */
  S.steps = (n = 6) => {
    if (!ctx) return; if (real.steps) { play(real.steps, 0.6); return; }
    for (let i = 0; i < n; i++) { const t = ctx.currentTime + i * 0.62, p = ctx.createStereoPanner(); p.pan.value = -0.8 + (1.6 * i) / n; p.connect(master); const s = ctx.createBufferSource(); s.buffer = noise; const lp = ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 600; lp.Q.value = 0.8; const g = ctx.createGain(); env(g, t, 0.004, 0.25, 0.02, 0.14); s.connect(lp); lp.connect(g); g.connect(p); s.start(t, Math.random() * 2, 0.3); }
  };
})();
