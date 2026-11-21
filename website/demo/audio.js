/* OMAN: THE DARK SIDE — web demo
 * Procedural audio engine (Web Audio API). Every sound is synthesised at runtime:
 * no audio files. Positional sounds use HRTF panning; indoor reverb via a generated impulse.
 */
(function () {
  'use strict';

  const OTDAudio = {};
  let ctx = null, master, ambBus, sfxBus, revSend, reverb, droneGain;
  let noiseBuf = null, brownBuf = null;
  const rand = (a, b) => a + Math.random() * (b - a);

  function makeNoise(seconds, brown) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }

  function makeImpulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function setPos(node, x, y, z) {
    if (node.positionX) { node.positionX.value = x; node.positionY.value = y; node.positionZ.value = z; }
    else node.setPosition(x, y, z);
  }

  function panner(x, y, z, ref) {
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = ref || 1.5;
    p.rolloffFactor = 1.1;
    p.maxDistance = 80;
    setPos(p, x, y, z);
    return p;
  }

  function noiseSource(buf, loop) {
    const s = ctx.createBufferSource();
    s.buffer = buf || noiseBuf;
    s.loop = !!loop;
    return s;
  }

  function env(gainNode, t, a, peak, hold, r) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(peak, t + a);
    g.setValueAtTime(peak, t + a + hold);
    g.exponentialRampToValueAtTime(0.0001, t + a + hold + r);
  }

  OTDAudio.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    noiseBuf = makeNoise(2, false);
    brownBuf = makeNoise(4, true);

    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    ambBus = ctx.createGain(); ambBus.gain.value = 1; ambBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(1.9, 2.6);
    revSend = ctx.createGain(); revSend.gain.value = 0.12;
    revSend.connect(reverb); reverb.connect(master);

    startWind();
    startDrone();
  };

  OTDAudio.ready = () => !!ctx;
  OTDAudio.suspend = () => ctx && ctx.suspend();
  OTDAudio.resume = () => ctx && ctx.resume();

  OTDAudio.setListener = function (pos, fwd) {
    if (!ctx) return;
    const L = ctx.listener;
    if (L.positionX) {
      L.positionX.value = pos.x; L.positionY.value = pos.y; L.positionZ.value = pos.z;
      L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z;
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else {
      L.setPosition(pos.x, pos.y, pos.z);
      L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
  };

  /** Indoors = more reverb. Smoothly ramps. */
  OTDAudio.setIndoor = function (indoor) {
    if (!ctx) return;
    revSend.gain.setTargetAtTime(indoor ? 0.55 : 0.12, ctx.currentTime, 0.4);
  };

  OTDAudio.fadeAmbience = function (to, seconds) {
    if (!ctx) return;
    ambBus.gain.cancelScheduledValues(ctx.currentTime);
    ambBus.gain.setValueAtTime(ambBus.gain.value, ctx.currentTime);
    ambBus.gain.linearRampToValueAtTime(to, ctx.currentTime + seconds);
  };

  OTDAudio.drone = function (to, seconds) {
    if (!ctx) return;
    droneGain.gain.setTargetAtTime(to, ctx.currentTime, seconds / 3);
  };

  // ---------- Ambience ----------
  function startWind() {
    // Low body of the wind
    const src = noiseSource(brownBuf, true);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = ctx.createGain(); g.gain.value = 0.32;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 260;
    lfo.connect(lfoAmt); lfoAmt.connect(lp.frequency);
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.043;
    const lfo2Amt = ctx.createGain(); lfo2Amt.gain.value = 0.16;
    lfo2.connect(lfo2Amt); lfo2Amt.connect(g.gain);
    src.connect(lp); lp.connect(g); g.connect(ambBus);
    src.start(); lfo.start(); lfo2.start();

    // Thin whistle through gaps in ruined walls
    const s2 = noiseSource(noiseBuf, true);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 9;
    const g2 = ctx.createGain(); g2.gain.value = 0.0;
    const l3 = ctx.createOscillator(); l3.frequency.value = 0.031;
    const l3a = ctx.createGain(); l3a.gain.value = 0.05;
    l3.connect(l3a); l3a.connect(g2.gain);
    const l4 = ctx.createOscillator(); l4.frequency.value = 0.11;
    const l4a = ctx.createGain(); l4a.gain.value = 220;
    l4.connect(l4a); l4a.connect(bp.frequency);
    s2.connect(bp); bp.connect(g2); g2.connect(ambBus);
    s2.start(); l3.start(); l4.start();
  }

  function startDrone() {
    droneGain = ctx.createGain(); droneGain.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
    [55, 55.6, 82.4].forEach((f) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const og = ctx.createGain(); og.gain.value = 0.25;
      o.connect(og); og.connect(lp); o.start();
    });
    lp.connect(droneGain); droneGain.connect(master);
  }

  /** A cricket that chirps forever at a world position (stops when ambience is faded). */
  OTDAudio.addCricket = function (x, y, z) {
    if (!ctx) return;
    const p = panner(x, y, z, 2.5);
    p.connect(ambBus);
    const base = rand(4100, 4700);
    function chirp() {
      const t = ctx.currentTime + 0.02;
      const pulses = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < pulses; i++) {
        const o = ctx.createOscillator(); o.frequency.value = base + rand(-40, 40);
        const g = ctx.createGain();
        env(g, t + i * 0.06, 0.006, 0.05, 0.022, 0.02);
        o.connect(g); g.connect(p);
        o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.07);
      }
      setTimeout(chirp, rand(380, 1400));
    }
    setTimeout(chirp, rand(0, 1200));
  };

  // ---------- One-shot SFX ----------
  OTDAudio.footstep = function (indoor, running) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const s = noiseSource();
    s.playbackRate.value = rand(0.8, 1.2);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = indoor ? rand(600, 800) : rand(950, 1300); bp.Q.value = 0.9;
    const g = ctx.createGain();
    const peak = (running ? 0.32 : 0.22) * rand(0.8, 1.1);
    env(g, t, 0.004, peak, 0.02, indoor ? 0.1 : 0.14);
    s.connect(bp); bp.connect(g); g.connect(sfxBus); g.connect(revSend);
    s.start(t, rand(0, 1.5), 0.25);
    // low heel thump
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.07);
    const og = ctx.createGain(); env(og, t, 0.003, 0.18, 0.0, 0.08);
    o.connect(og); og.connect(sfxBus); o.start(t); o.stop(t + 0.12);
  };

  OTDAudio.click = function () {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1900;
    const g = ctx.createGain(); env(g, t, 0.001, 0.08, 0.004, 0.02);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.05);
  };

  OTDAudio.pickup = function () {
    if (!ctx) return;
    const t = ctx.currentTime;
    // paper / cloth rustle
    const s = noiseSource();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 6; i++) g.gain.linearRampToValueAtTime(rand(0.05, 0.14), t + 0.04 + i * 0.045);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    s.connect(hp); hp.connect(g); g.connect(sfxBus); g.connect(revSend);
    s.start(t, rand(0, 1), 0.45);
    // low minor-second sting
    [196, 207.65].forEach((f) => {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const og = ctx.createGain(); env(og, t + 0.1, 0.5, 0.06, 0.6, 1.4);
      o.connect(og); og.connect(sfxBus); og.connect(revSend); o.start(t + 0.1); o.stop(t + 3);
    });
  };

  OTDAudio.creak = function (x, y, z) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const p = panner(x, y, z, 2); p.connect(sfxBus); p.connect(revSend);
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const curve = new Float32Array(32);
    for (let i = 0; i < 32; i++) curve[i] = 70 + Math.sin(i * 0.7) * 12 + Math.random() * 30;
    o.frequency.setValueCurveAtTime(curve, t, 1.3);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 3.5;
    const g = ctx.createGain(); env(g, t, 0.08, 0.22, 0.9, 0.3);
    o.connect(bp); bp.connect(g); g.connect(p); o.start(t); o.stop(t + 1.5);
  };

  OTDAudio.heartbeat = function () {
    if (!ctx) return;
    const t = ctx.currentTime;
    [0, 0.26].forEach((d, i) => {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(62, t + d); o.frequency.exponentialRampToValueAtTime(38, t + d + 0.12);
      const g = ctx.createGain(); env(g, t + d, 0.008, i ? 0.22 : 0.32, 0.02, 0.14);
      o.connect(g); g.connect(sfxBus); o.start(t + d); o.stop(t + d + 0.25);
    });
  };

  // Vowel-ish formant pairs for whisper synthesis
  const FORMANTS = [[700, 1220], [390, 2300], [300, 870], [640, 1190], [450, 1750], [520, 1500]];

  function whisperInto(dest, start, syllables, loud) {
    let t = start;
    for (let i = 0; i < syllables; i++) {
      const dur = rand(0.11, 0.26);
      const s = noiseSource();
      const g = ctx.createGain();
      env(g, t, 0.03, loud * rand(0.6, 1), dur, 0.07);
      const [f1, f2] = FORMANTS[Math.floor(Math.random() * FORMANTS.length)];
      [f1, f2, 2600].forEach((f, k) => {
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * rand(0.95, 1.05); bp.Q.value = k === 2 ? 2 : 7;
        const fg = ctx.createGain(); fg.gain.value = k === 2 ? 0.35 : 1;
        s.connect(bp); bp.connect(fg); fg.connect(g);
      });
      g.connect(dest);
      s.start(t, rand(0, 1.5), dur + 0.15);
      t += dur + rand(0.04, 0.12) + (Math.random() < 0.18 ? rand(0.25, 0.5) : 0);
    }
    return t;
  }

  /** A whispered phrase from a world position. Returns its duration. */
  OTDAudio.whisperAt = function (x, y, z) {
    if (!ctx) return 0;
    const p = panner(x, y, z, 2.2);
    const g = ctx.createGain(); g.gain.value = 3.2;
    p.connect(g); g.connect(sfxBus); g.connect(revSend);
    const t0 = ctx.currentTime + 0.05;
    return whisperInto(p, t0, 7 + Math.floor(Math.random() * 4), 0.5) - t0;
  };

  let staticNode = null;
  OTDAudio.startStatic = function (x, y, z) {
    if (!ctx || staticNode) return;
    const p = panner(x, y, z, 1.2); p.connect(sfxBus); p.connect(revSend);
    const s = noiseSource(noiseBuf, true);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = 0.05;
    const crackle = ctx.createOscillator(); crackle.type = 'square'; crackle.frequency.value = 7.3;
    const ca = ctx.createGain(); ca.gain.value = 0.025;
    crackle.connect(ca); ca.connect(g.gain);
    s.connect(bp); bp.connect(g); g.connect(p); s.start(); crackle.start();
    staticNode = { s, crackle, g };
  };
  OTDAudio.stopStatic = function () {
    if (!staticNode) return;
    const t = ctx.currentTime;
    staticNode.g.gain.cancelScheduledValues(t);
    staticNode.g.gain.setTargetAtTime(0, t, 0.05);
    staticNode.s.stop(t + 0.4); staticNode.crackle.stop(t + 0.4);
    staticNode = null;
  };

  /** The recorder's playback: band-limited, slightly distorted "voice" bed for a line of subtitles. */
  OTDAudio.recordedVoice = function (seconds) {
    if (!ctx) return;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.9;
    const shaper = ctx.createWaveShaper();
    const c = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * 2.5); }
    shaper.curve = c;
    const g = ctx.createGain(); g.gain.value = 2.4;
    bp.connect(shaper); shaper.connect(g); g.connect(sfxBus);
    let t = ctx.currentTime + 0.05; const end = t + seconds;
    while (t < end - 0.3) t = whisperInto(bp, t, 3, 0.55) + rand(0.05, 0.2);
    // tape hiss under it
    const s = noiseSource(noiseBuf, true);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const hg = ctx.createGain(); env(hg, ctx.currentTime, 0.05, 0.035, seconds, 0.2);
    s.connect(hp); hp.connect(hg); hg.connect(sfxBus); s.start(); s.stop(ctx.currentTime + seconds + 0.5);
  };

  window.OTDAudio = OTDAudio;
})();
