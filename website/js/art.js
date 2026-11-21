/* OMAN: THE DARK SIDE — scene painter.
 * Hand-built night scenes drawn on canvas at 1600x900 (logical units).
 * Every scene is painted once in full "torch-lit" colour; the game derives a dark,
 * moonlit version from it and reveals the lit version only where the torch points.
 * Emissive things (windows, lamps, moon) are recorded with A.emit and re-drawn on top.
 */
(function () {
  'use strict';
  const A = (window.ART = {});
  A.W = 1600; A.H = 900;
  A.rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  let emitList = null;
  A.emit = (c, fn) => { fn(c); if (emitList) emitList.push(fn); };

  // ---------- atmosphere ----------
  A.sky = (c, r, o = {}) => {
    const g = c.createLinearGradient(0, 0, 0, o.h || 620);
    g.addColorStop(0, o.top || '#050913'); g.addColorStop(0.65, o.mid || '#0e1628'); g.addColorStop(1, o.bot || '#22304a');
    c.fillStyle = g; c.fillRect(0, 0, A.W, o.h || 620);
    A.emit(c, (k) => {
      const rr = A.rng(o.seed || 7);
      for (let i = 0; i < (o.stars || 260); i++) { const x = rr() * A.W, y = rr() * (o.h || 620) * 0.8, s = rr() < 0.08 ? 1.8 : 1; k.globalAlpha = 0.35 + rr() * 0.6; k.fillStyle = '#dfe6ff'; k.fillRect(x, y, s, s); }
      k.globalAlpha = 1;
      if (o.moon) { const [mx, my, mr] = o.moon; const mg = k.createRadialGradient(mx, my, mr * 0.2, mx, my, mr * 5); mg.addColorStop(0, 'rgba(220,228,255,0.35)'); mg.addColorStop(1, 'rgba(220,228,255,0)'); k.fillStyle = mg; k.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10); k.fillStyle = '#eef1ff'; k.beginPath(); k.arc(mx, my, mr, 0, 7); k.fill(); k.fillStyle = 'rgba(160,170,200,0.25)'; k.beginPath(); k.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.25, 0, 7); k.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.18, 0, 7); k.fill(); }
    });
  };
  A.ridge = (c, r, o) => {
    const step = o.step || 14; let y = o.y; c.fillStyle = o.color; c.beginPath(); c.moveTo(-10, A.H);
    let v = 0, vel = 0;
    for (let x = -10; x <= A.W + step; x += step) { vel += (r() - 0.5) * (o.rough || 0.9); vel *= 0.86; v += vel; v = Math.max(-1, Math.min(1, v)); const peak = Math.sin(x * (o.freq || 0.004) + (o.phase || 0)) * 0.5 + 0.5; y = o.y - (peak * 0.6 + 0.4) * o.amp * (0.65 + v * 0.35); c.lineTo(x, y); }
    c.lineTo(A.W + 20, A.H); c.closePath(); c.fill();
    if (o.rim) { c.strokeStyle = o.rim; c.lineWidth = 1.2; c.globalAlpha = 0.35; c.stroke(); c.globalAlpha = 1; }
  };
  A.fog = (c, y, h, a, col = '150,165,195') => { const g = c.createLinearGradient(0, y - h, 0, y + h); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(0, y - h, A.W, h * 2); };
  A.ground = (c, r, y, top, bot) => { const g = c.createLinearGradient(0, y, 0, A.H); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, y, A.W, A.H - y); A.grain(c, r, 0, y, A.W, A.H - y, 2600, 0.12); };
  A.grain = (c, r, x, y, w, h, n, a) => { for (let i = 0; i < n; i++) { c.fillStyle = r() < 0.5 ? `rgba(255,240,215,${r() * a})` : `rgba(0,0,0,${r() * a * 1.4})`; const s = r() * 2.2 + 0.6; c.fillRect(x + r() * w, y + r() * h, s, s); } };
  A.light = (c, x, y, rad, col, a = 0.6) => A.emit(c, (k) => { const g = k.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); k.save(); k.globalCompositeOperation = 'lighter'; k.fillStyle = g; k.fillRect(x - rad, y - rad, rad * 2, rad * 2); k.restore(); });

  // ---------- architecture ----------
  /** Plastered mud-brick house. base = ground line. */
  A.house = (c, r, x, base, w, h, o = {}) => {
    const col = o.color || '#8a6a4c', top = base - h;
    c.save(); c.beginPath();
    c.moveTo(x, base); c.lineTo(x, top);
    if (o.ruin) { const n = 6; for (let i = 1; i <= n; i++) c.lineTo(x + (w * i) / n, top + (r() * o.ruin * h * 0.45)); }
    else if (o.crenel !== false) { const n = Math.max(3, Math.floor(w / 26)); for (let i = 0; i < n; i++) { const a = x + (w * i) / n, b = x + (w * (i + 1)) / n, m = (a + b) / 2; c.lineTo(a, top); c.lineTo(a + 2, top - 14); c.lineTo(m - 2, top - 14); c.lineTo(m, top); } c.lineTo(x + w, top); }
    else c.lineTo(x + w, top);
    c.lineTo(x + w, base); c.closePath();
    const g = c.createLinearGradient(x, top, x + w, base); g.addColorStop(0, A.shade(col, 1.12)); g.addColorStop(1, A.shade(col, 0.78)); c.fillStyle = g; c.fill();
    c.clip();
    A.grain(c, r, x, top - 20, w, h + 20, Math.floor(w * h / 70), 0.16);
    // fallen plaster patches revealing bricks
    for (let p = 0; p < (o.patches == null ? 2 : o.patches); p++) {
      const px = x + r() * w, py = top + 20 + r() * (h - 40), pw = 30 + r() * 60, ph = 18 + r() * 36;
      c.save(); c.beginPath(); c.ellipse(px, py, pw / 2, ph / 2, r(), 0, 7); c.clip(); c.fillStyle = A.shade(col, 0.7); c.fillRect(px - pw, py - ph, pw * 2, ph * 2);
      c.strokeStyle = 'rgba(30,20,12,0.45)'; c.lineWidth = 1; for (let by = py - ph; by < py + ph; by += 8) { c.beginPath(); c.moveTo(px - pw, by); c.lineTo(px + pw, by); c.stroke(); for (let bx = px - pw + ((by / 8) % 2) * 9; bx < px + pw; bx += 18) { c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by + 8); c.stroke(); } }
      c.restore();
    }
    // cracks
    c.strokeStyle = 'rgba(25,15,8,0.5)'; c.lineWidth = 1.1;
    for (let k = 0; k < 3; k++) { let cx = x + r() * w, cy = top + r() * h * 0.5; c.beginPath(); c.moveTo(cx, cy); for (let s = 0; s < 8; s++) { cx += (r() - 0.5) * 12; cy += 6 + r() * 8; c.lineTo(cx, cy); } c.stroke(); }
    // roof beams
    if (o.beams) for (let bx = x + 14; bx < x + w - 6; bx += 22) { c.fillStyle = '#3b2a1c'; c.fillRect(bx, top + 10, 7, 9); }
    c.restore();
    // windows
    (o.windows || []).forEach(([fx, fy, lit]) => {
      const wx = x + fx * w, wy = top + fy * h, ww = 18, wh = 26;
      if (lit) A.emit(c, (k) => { k.fillStyle = '#ffb764'; k.fillRect(wx, wy, ww, wh); k.fillStyle = 'rgba(80,40,10,0.6)'; k.fillRect(wx + ww / 2 - 1, wy, 2, wh); });
      else { c.fillStyle = '#0a0806'; c.fillRect(wx, wy, ww, wh); c.fillStyle = 'rgba(70,50,30,0.8)'; c.fillRect(wx - 2, wy - 3, ww + 4, 3); }
      if (lit) A.light(c, wx + ww / 2, wy + wh / 2, 70, '255,170,90', 0.35);
    });
    if (o.door) {
      const d = o.door, dx = x + d.x * w, dw = d.w || 36, dh = d.h || 64;
      c.fillStyle = '#0b0806'; c.fillRect(dx, base - dh, dw, dh);
      if (!d.open) { c.fillStyle = d.color || '#3f2c1d'; c.fillRect(dx + 2, base - dh + 2, dw - 4, dh - 2); c.fillStyle = 'rgba(210,190,150,0.55)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) c.fillRect(dx + 6 + i * ((dw - 12) / 3), base - dh + 8 + j * ((dh - 14) / 5), 2, 2); }
      else { c.fillStyle = d.color || '#2e5450'; c.beginPath(); c.moveTo(dx, base - dh); c.lineTo(dx - dw * 0.45, base - dh + 6); c.lineTo(dx - dw * 0.45, base - 4); c.lineTo(dx, base); c.fill(); }
    }
  };
  A.shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const r = Math.min(255, ((n >> 16) & 255) * f), g = Math.min(255, ((n >> 8) & 255) * f), b = Math.min(255, (n & 255) * f); return `rgb(${r | 0},${g | 0},${b | 0})`; };
  A.tower = (c, r, x, base, w, h, col = '#86684b') => {
    const top = base - h; const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, A.shade(col, 0.7)); g.addColorStop(0.45, A.shade(col, 1.15)); g.addColorStop(1, A.shade(col, 0.6));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - w / 2, base); c.lineTo(x - w * 0.44, top); c.lineTo(x + w * 0.44, top); c.lineTo(x + w / 2, base); c.fill();
    const n = 7; for (let i = 0; i < n; i++) { const a = x - w * 0.44 + (w * 0.88 * i) / n; c.fillRect(a + 2, top - 16, (w * 0.88) / n - 6, 16); }
    for (let i = 0; i < 3; i++) { c.fillStyle = '#0b0806'; c.fillRect(x - 3 + (i - 1) * w * 0.22, top + h * (0.25 + i * 0.18), 6, 18); }
    c.save(); c.beginPath(); c.rect(x - w / 2, top - 16, w, h + 16); c.clip(); A.grain(c, r, x - w / 2, top, w, h, Math.floor(w * h / 80), 0.15); c.restore();
  };
  A.palm = (c, r, x, base, h, lean = 0, dead = false) => {
    c.save(); c.strokeStyle = '#2b1f15'; c.lineCap = 'round';
    const tx = x + lean * h, ty = base - h;
    for (let i = 0; i < 12; i++) { const t = i / 12; c.lineWidth = 11 - t * 5; c.beginPath(); c.moveTo(x + lean * h * t, base - h * t); c.lineTo(x + lean * h * (t + 1 / 12), base - h * (t + 1 / 12)); c.stroke(); c.strokeStyle = i % 2 ? '#2b1f15' : '#34261a'; }
    const n = dead ? 6 : 13;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.3, len = h * (0.32 + r() * 0.12), droop = dead ? 1.4 : 0.55 + r() * 0.35;
      const ex = tx + Math.cos(a) * len, ey = ty + Math.abs(Math.sin(a)) * len * droop * 0.6 + len * (dead ? 0.6 : 0.15);
      const mx = tx + Math.cos(a) * len * 0.55, my = ty - len * 0.22 * (dead ? 0 : 1);
      c.strokeStyle = dead ? '#5a4632' : '#2f3a22'; c.lineWidth = 3; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
      c.lineWidth = 1.4; for (let k = 2; k < 14; k++) { const t = k / 14, px = (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * mx + t * t * ex, py = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * my + t * t * ey, l = 22 * Math.sin(t * Math.PI); c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a + 1.2) * l, py + l * 0.7); c.moveTo(px, py); c.lineTo(px + Math.cos(a - 1.2) * l, py + l * 0.7); c.stroke(); }
    }
    c.restore();
  };
  /** Silhouette figure. kind: dishdasha | abaya | uniform | worker | elder */
  A.figure = (c, x, base, h, kind = 'dishdasha', face = 0) => {
    const robe = { dishdasha: '#d9d4c8', abaya: '#0d0d10', uniform: '#1d2734', worker: '#4b5560', elder: '#cfc9bc', jacket: '#5a1c22' }[kind] || '#d9d4c8';
    const sh = h * 0.2, w = h * 0.24;
    c.save(); c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x, base, w * 0.9, h * 0.03, 0, 0, 7); c.fill();
    const g = c.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, A.shade(robe.startsWith('#') ? robe : '#cccccc', 0.75)); g.addColorStop(0.4, robe); g.addColorStop(1, A.shade(robe.startsWith('#') ? robe : '#cccccc', 0.6));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - w * 0.62, base); c.quadraticCurveTo(x - w * 0.55, base - h * 0.55, x - w * 0.5, base - h + sh * 1.05); c.quadraticCurveTo(x, base - h + sh * 0.75, x + w * 0.5, base - h + sh * 1.05); c.quadraticCurveTo(x + w * 0.55, base - h * 0.55, x + w * 0.62, base); c.closePath(); c.fill();
    const hy = base - h + sh * 0.55;
    c.fillStyle = kind === 'abaya' ? '#0d0d10' : '#6e4630'; c.beginPath(); c.ellipse(x, hy, w * 0.22, sh * 0.45, 0, 0, 7); c.fill();
    if (kind === 'abaya') { c.fillStyle = '#7a5038'; c.beginPath(); c.ellipse(x + face * w * 0.05, hy + sh * 0.05, w * 0.13, sh * 0.27, 0, 0, 7); c.fill(); }
    else if (kind === 'uniform') { c.fillStyle = '#16202c'; c.fillRect(x - w * 0.25, hy - sh * 0.55, w * 0.5, sh * 0.25); }
    else if (kind === 'elder') { c.fillStyle = '#8a6a4a'; c.beginPath(); c.ellipse(x, hy - sh * 0.35, w * 0.27, sh * 0.2, 0, 0, 7); c.fill(); }
    else if (kind !== 'worker' && kind !== 'jacket') { c.fillStyle = '#ece6d8'; c.fillRect(x - w * 0.22, hy - sh * 0.5, w * 0.44, sh * 0.22); c.fillStyle = 'rgba(150,120,80,0.6)'; for (let i = 0; i < 5; i++) c.fillRect(x - w * 0.2 + i * w * 0.09, hy - sh * 0.45, 2, 2); }
    if (kind === 'dishdasha' || kind === 'elder') { c.strokeStyle = 'rgba(120,110,95,0.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, base - h + sh * 1.1); c.lineTo(x, base - h + sh * 1.9); c.stroke(); c.fillStyle = '#b9ad94'; c.beginPath(); c.arc(x, base - h + sh * 1.95, 2.5, 0, 7); c.fill(); }
    c.restore();
  };
  A.car = (c, x, base, s = 1, col = '#a7aab0', o = {}) => {
    c.save(); c.translate(x, base); c.scale(o.flip ? -s : s, s);
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.ellipse(0, 0, 150, 12, 0, 0, 7); c.fill();
    const g = c.createLinearGradient(0, -120, 0, -20); g.addColorStop(0, A.shade(col, 1.15)); g.addColorStop(1, A.shade(col, 0.6));
    c.fillStyle = g; c.beginPath(); c.moveTo(-140, -28); c.lineTo(-140, -70); c.lineTo(-100, -78); c.lineTo(-70, -122); c.lineTo(70, -124); c.lineTo(100, -80); c.lineTo(140, -72); c.lineTo(142, -28); c.closePath(); c.fill();
    c.fillStyle = '#0b1016'; c.beginPath(); c.moveTo(-60, -114); c.lineTo(-88, -80); c.lineTo(-6, -80); c.lineTo(-6, -114); c.fill(); c.beginPath(); c.moveTo(4, -114); c.lineTo(4, -80); c.lineTo(88, -80); c.lineTo(64, -116); c.fill();
    c.fillStyle = '#121212'; [[-92, -26], [94, -26]].forEach(([wx, wy]) => { c.beginPath(); c.arc(wx, wy, 26, 0, 7); c.fill(); c.fillStyle = '#5c6066'; c.beginPath(); c.arc(wx, wy, 11, 0, 7); c.fill(); c.fillStyle = '#121212'; });
    if (o.door) { c.fillStyle = A.shade(col, 0.85); c.beginPath(); c.moveTo(4, -114); c.lineTo(60, -150); c.lineTo(62, -60); c.lineTo(4, -36); c.fill(); }
    const sx = o.flip ? -s : s, lightsFn = (k) => { k.fillStyle = o.lights ? '#fff1d0' : '#6a5a3a'; k.fillRect(132, -70, 9, 12); k.fillStyle = '#7a1010'; k.fillRect(-142, -68, 6, 12); };
    lightsFn(c); if (emitList) emitList.push((k) => { k.save(); k.translate(x, base); k.scale(sx, s); lightsFn(k); k.restore(); });
    c.restore();
  };

  // ---------- clue objects drawn inside scenes (small, subtle) ----------
  A.object = (c, type, x, y, s = 1) => {
    c.save(); c.translate(x, y); c.scale(s, s);
    const em = (f) => { f(c); if (emitList) emitList.push((k) => { k.save(); k.translate(x, y); k.scale(s, s); f(k); k.restore(); }); };
    const shadow = () => { c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(0, 3, 22, 5, 0, 0, 7); c.fill(); };
    switch (type) {
      case 'notebook': shadow(); c.rotate(-0.3); c.fillStyle = '#26364f'; c.fillRect(-16, -11, 32, 22); c.fillStyle = '#d8ceb6'; c.fillRect(-14, -10, 29, 19); c.strokeStyle = 'rgba(60,70,110,0.5)'; for (let i = -6; i < 9; i += 4) { c.beginPath(); c.moveTo(-12, i); c.lineTo(13, i); c.stroke(); } break;
      case 'paper': case 'receipt': case 'letter': case 'map': shadow(); c.rotate(0.25); c.fillStyle = '#e6dcc6'; c.fillRect(-13, -16, 26, 32); c.fillStyle = 'rgba(40,40,50,0.5)'; for (let i = -10; i < 12; i += 5) c.fillRect(-9, i, 16 + (i % 3), 1.5); break;
      case 'photo': shadow(); c.rotate(-0.2); c.fillStyle = '#efe9dc'; c.fillRect(-15, -12, 30, 24); c.fillStyle = '#6b5a44'; c.fillRect(-12, -9, 24, 15); break;
      case 'footprints': for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(20,14,8,0.75)'; c.beginPath(); c.ellipse(i * 26 - 60, (i % 2) * 10 - 5, 5, 10, 1.3, 0, 7); c.fill(); } break;
      case 'tracks': c.strokeStyle = 'rgba(20,14,8,0.7)'; c.lineWidth = 9; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(-90, -6); c.lineTo(90, 6); c.moveTo(-90, 20); c.lineTo(90, 32); c.stroke(); c.setLineDash([]); break;
      case 'rope': shadow(); c.strokeStyle = '#b39662'; c.lineWidth = 4; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, -2, 16 - i * 3, 6 - i, 0, 0, 7); c.stroke(); } break;
      case 'phone': shadow(); c.fillStyle = '#111'; c.fillRect(-7, -13, 14, 26); em((k) => { k.fillStyle = '#3a6ab0'; k.fillRect(-5, -11, 10, 20); }); break;
      case 'recorder': shadow(); c.fillStyle = '#1a1c1f'; c.fillRect(-6, -12, 12, 24); em((k) => { k.fillStyle = '#ff2a1a'; k.beginPath(); k.arc(2, -8, 1.8, 0, 7); k.fill(); }); break;
      case 'pole': c.rotate(0.3); for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#e8e2d4' : '#d35a1e'; c.fillRect(-3, -110 + i * 14, 6, 14); } break;
      case 'marker': c.fillStyle = '#d35a1e'; c.fillRect(-3, -34, 6, 34); c.fillStyle = '#e8e2d4'; c.fillRect(-3, -34, 6, 8); break;
      case 'cap': shadow(); c.fillStyle = '#3c4c3c'; c.beginPath(); c.arc(0, 0, 13, Math.PI, 0); c.fill(); c.fillRect(0, -2, 20, 4); break;
      case 'battery': shadow(); c.fillStyle = '#c9a32a'; c.fillRect(-12, -5, 22, 10); c.fillStyle = '#222'; c.fillRect(-12, -5, 8, 10); break;
      case 'register': shadow(); c.fillStyle = '#5a2a20'; c.fillRect(-18, -13, 36, 26); c.fillStyle = '#e2d6bc'; c.fillRect(-16, -11, 32, 20); break;
      case 'shovel': c.rotate(-0.5); c.fillStyle = '#4a3523'; c.fillRect(-3, -70, 6, 70); c.fillStyle = '#7b7f84'; c.beginPath(); c.moveTo(-12, 0); c.lineTo(12, 0); c.lineTo(8, 22); c.lineTo(-8, 22); c.fill(); c.fillStyle = '#7a2c18'; c.fillRect(-9, 8, 18, 12); break;
      case 'lock': c.fillStyle = '#c8c8c8'; c.fillRect(-9, -4, 18, 16); c.strokeStyle = '#c8c8c8'; c.lineWidth = 3; c.beginPath(); c.arc(0, -4, 6, Math.PI, 0); c.stroke(); break;
      case 'hatch': c.fillStyle = '#4b3324'; c.fillRect(-40, -10, 80, 20); c.fillStyle = '#8a8f94'; c.fillRect(-4, -4, 8, 8); break;
      case 'symbol': c.strokeStyle = 'rgba(230,215,180,0.7)'; c.lineWidth = 2; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(-30 + i * 8, -14); c.lineTo(-30 + i * 8, 14); c.stroke(); } c.strokeStyle = 'rgba(230,120,90,0.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(30, -16); c.lineTo(30, 16); c.stroke(); break;
      case 'mud': shadow(); c.fillStyle = '#7a2c18'; c.beginPath(); c.ellipse(0, -2, 16, 7, 0.2, 0, 7); c.fill(); break;
      case 'cctv': c.fillStyle = '#1d1f22'; c.fillRect(-22, -14, 44, 28); em((k) => { k.fillStyle = '#7fd0a0'; k.fillRect(-16, -9, 32, 16); }); break;
      case 'board': c.fillStyle = '#6b4a2c'; c.fillRect(-90, -60, 180, 120); c.fillStyle = '#efe6d2'; for (let i = 0; i < 6; i++) c.fillRect(-80 + (i % 3) * 56, -50 + Math.floor(i / 3) * 54, 44, 40); c.strokeStyle = '#b3241a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-58, -30); c.lineTo(54, 24); c.lineTo(-2, -30); c.stroke(); break;
      default: shadow(); c.fillStyle = '#ddd'; c.fillRect(-8, -8, 16, 16);
    }
    c.restore();
  };

  /** Large clue thumbnail for the evidence card (painted fresh, warm torch light). */
  A.thumb = (type, cv) => {
    const c = cv.getContext('2d'), w = cv.width, h = cv.height;
    const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7); g.addColorStop(0, '#5a4a3a'); g.addColorStop(1, '#16120e'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    A.grain(c, A.rng(w + h + type.length), 0, 0, w, h, 900, 0.18);
    emitList = null; A.object(c, type, w / 2, h / 2 + (type === 'pole' ? 50 : type === 'shovel' ? 20 : 0), type === 'board' ? 0.8 : type === 'tracks' || type === 'footprints' ? 1.1 : 3);
  };

  /** Paints a scene. Returns {lit, dark} canvases at the given pixel scale. */
  A.render = (sceneFn, scale, hotspots) => {
    const make = () => { const cv = document.createElement('canvas'); cv.width = Math.round(A.W * scale); cv.height = Math.round(A.H * scale); const c = cv.getContext('2d'); c.scale(scale, scale); return [cv, c]; };
    const [lit, lc] = make(); emitList = [];
    const r = A.rng(sceneFn.seed || 11);
    sceneFn(lc, r);
    (hotspots || []).forEach((h) => { if (!h.hidden) A.object(lc, h.obj, h.x, h.y, h.s || 1); });
    const emits = emitList; emitList = null;
    const [dark, dc] = make();
    dc.drawImage(lit, 0, 0, A.W, A.H);
    dc.globalCompositeOperation = 'multiply'; dc.fillStyle = '#5d6a94'; dc.fillRect(0, 0, A.W, A.H);
    dc.globalCompositeOperation = 'source-over'; dc.fillStyle = 'rgba(3,5,12,0.2)'; dc.fillRect(0, 0, A.W, A.H);
    emits.forEach((fn) => fn(dc));
    return { lit, dark };
  };

  // =====================================================================
  // SCENES — case 1 (Nizwa-inspired interior: fictional town Wadi Al-Sukoon)
  // =====================================================================
  const S = (A.scenes = {});
  const horizon = 560;

  S.maryamHouse = (c, r) => { // courtyard of Maryam's family house at evening
    A.sky(c, r, { moon: [1320, 140, 28], top: '#0a0f1d', bot: '#3a3550' });
    A.ridge(c, r, { y: 470, amp: 150, color: '#1a1c2a', freq: 0.003 }); A.fog(c, 470, 60, 0.12);
    A.ground(c, r, horizon, '#4d3f31', '#1c160f');
    A.house(c, r, 80, 740, 520, 330, { windows: [[0.12, 0.3, true], [0.4, 0.3, false], [0.8, 0.3, true]], door: { x: 0.55, w: 60, h: 120, color: '#2e5450' }, beams: true });
    A.house(c, r, 980, 760, 560, 380, { windows: [[0.15, 0.25, true], [0.55, 0.25, true]], door: { x: 0.78, w: 54, h: 118 }, beams: true });
    A.palm(c, r, 720, 760, 360, 0.08); A.palm(c, r, 860, 780, 300, -0.12);
    c.fillStyle = '#6b2f2a'; c.fillRect(300, 780, 420, 60); c.fillStyle = 'rgba(200,170,110,0.4)'; for (let i = 0; i < 20; i++) c.fillRect(310 + i * 20, 790, 8, 40); // carpet
    A.light(c, 640, 650, 260, '255,170,90', 0.25);
    A.figure(c, 640, 800, 250, 'abaya');
  };
  S.maryamHouse.seed = 21;

  S.souq = (c, r) => { // covered souq lane at night
    c.fillStyle = '#0d0a08'; c.fillRect(0, 0, A.W, A.H);
    const g = c.createLinearGradient(0, 200, 0, 900); g.addColorStop(0, '#2a1f17'); g.addColorStop(1, '#120d09'); c.fillStyle = g; c.fillRect(0, 200, A.W, 700);
    for (let i = 0; i < 6; i++) { const x = 20 + i * 270; c.fillStyle = '#7d6146'; c.fillRect(x, 120, 34, 640); c.beginPath(); c.moveTo(x, 200); c.quadraticCurveTo(x + 135, 90, x + 270, 200); c.lineTo(x + 270, 230); c.quadraticCurveTo(x + 135, 130, x, 230); c.fill(); }
    A.grain(c, r, 0, 100, A.W, 700, 9000, 0.14);
    for (let i = 0; i < 5; i++) { const x = 70 + i * 270; c.fillStyle = '#3b2a1c'; c.fillRect(x, 470, 200, 260); c.fillStyle = ['#6b2f2a', '#c8b48c', '#2c4a5a', '#7a6a3a', '#5a2a20'][i]; c.beginPath(); c.moveTo(x - 10, 450); c.lineTo(x + 210, 450); c.lineTo(x + 190, 500); c.lineTo(x + 10, 500); c.fill(); c.fillStyle = '#4a3523'; c.fillRect(x + 10, 640, 180, 90); for (let k = 0; k < 4; k++) { c.fillStyle = ['#b07a3a', '#8a5a2a', '#c49a5a', '#6a4a2a'][k]; c.beginPath(); c.arc(x + 40 + k * 40, 630, 16, Math.PI, 0); c.fill(); } }
    A.light(c, 420, 330, 300, '255,170,90', 0.4); A.emit(c, (k) => { k.fillStyle = '#ffd28a'; k.beginPath(); k.arc(420, 330, 8, 0, 7); k.fill(); });
    A.light(c, 1180, 330, 260, '255,160,80', 0.32); A.emit(c, (k) => { k.fillStyle = '#ffd28a'; k.beginPath(); k.arc(1180, 330, 7, 0, 7); k.fill(); });
    c.fillStyle = '#2a2018'; c.fillRect(0, 760, A.W, 140); A.grain(c, r, 0, 760, A.W, 140, 1500, 0.18);
    A.figure(c, 560, 800, 260, 'dishdasha');
  };
  S.souq.seed = 22;

  S.wadiCrossing = (c, r) => { // dawn, Khalfan's car on the gravel track
    A.sky(c, r, { top: '#0c1426', mid: '#2a3550', bot: '#b0785a', stars: 60 });
    A.ridge(c, r, { y: 430, amp: 190, color: '#2a2638', freq: 0.0025 }); A.fog(c, 450, 50, 0.18, '230,180,150');
    A.ridge(c, r, { y: 520, amp: 110, color: '#3a2f2c', freq: 0.004, phase: 2 });
    A.ground(c, r, 540, '#6e5a45', '#2a2018');
    c.fillStyle = '#7d6a55'; c.beginPath(); c.moveTo(0, 700); c.quadraticCurveTo(700, 600, 1600, 640); c.lineTo(1600, 720); c.quadraticCurveTo(700, 690, 0, 800); c.fill(); // track
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(${90 + r() * 40},${80 + r() * 30},${70 + r() * 20},0.9)`; c.beginPath(); c.ellipse(r() * 1600, 760 + r() * 140, 10 + r() * 26, 6 + r() * 12, 0, 0, 7); c.fill(); } // wadi stones
    A.car(c, 760, 700, 1.25, '#9aa0a6', { door: true });
    A.palm(c, r, 1380, 640, 260, 0.1, true);
  };
  S.wadiCrossing.seed = 23;

  S.grove = (c, r) => { // palm grove with falaj at night
    A.sky(c, r, { moon: [260, 120, 24] });
    A.ridge(c, r, { y: 500, amp: 160, color: '#141a28' });
    A.ground(c, r, 600, '#3d3426', '#15110c');
    for (let i = 0; i < 14; i++) A.palm(c, r, 60 + i * 115 + r() * 40, 640 + r() * 30, 280 + r() * 160, (r() - 0.5) * 0.2, r() < 0.12);
    c.fillStyle = '#5e5446'; c.beginPath(); c.moveTo(0, 820); c.lineTo(1600, 700); c.lineTo(1600, 722); c.lineTo(0, 850); c.fill(); // falaj wall
    c.fillStyle = '#1b2636'; c.beginPath(); c.moveTo(0, 850); c.lineTo(1600, 722); c.lineTo(1600, 732); c.lineTo(0, 868); c.fill();
    A.emit(c, (k) => { k.strokeStyle = 'rgba(170,190,230,0.35)'; k.lineWidth = 2; k.beginPath(); k.moveTo(0, 859); k.lineTo(1600, 727); k.stroke(); });
    A.fog(c, 690, 70, 0.1);
  };
  S.grove.seed = 24;

  S.haratGate = (c, r) => { // abandoned quarter gate and lane
    A.sky(c, r, { moon: [1250, 110, 26] });
    A.ridge(c, r, { y: 470, amp: 170, color: '#151a28' }); A.fog(c, 500, 60, 0.12);
    A.ground(c, r, 600, '#4a3c2c', '#17120d');
    A.house(c, r, -40, 760, 420, 300, { ruin: 0.8, windows: [[0.5, 0.35, false]], beams: true });
    A.house(c, r, 1220, 770, 440, 320, { ruin: 0.6, windows: [[0.2, 0.3, false]], door: { x: 0.12, open: true } });
    A.house(c, r, 470, 640, 200, 180, { windows: [[0.4, 0.3, false]] }); A.house(c, r, 930, 650, 220, 190, { ruin: 0.4 });
    A.tower(c, r, 800, 610, 110, 260);
    c.fillStyle = '#86684b'; c.fillRect(560, 400, 60, 380); c.fillRect(980, 400, 60, 380); c.fillRect(540, 360, 520, 60); // gate
    A.grain(c, r, 540, 360, 520, 420, 3000, 0.15);
    A.palm(c, r, 470, 790, 300, 0.05, true);
    A.emit(c, (k) => { k.fillStyle = '#ffb764'; k.fillRect(845, 470, 10, 14); }); A.light(c, 850, 477, 50, '255,170,90', 0.4); // the one lit window
  };
  S.haratGate.seed = 25;

  S.upperRoom = (c, r) => { // interior of the blue-door house, upper room
    c.fillStyle = '#5c4532'; c.fillRect(0, 0, A.W, A.H);
    const g = c.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, '#6e5440'); g.addColorStop(1, '#4a3626'); c.fillStyle = g; c.fillRect(0, 0, A.W, 640);
    A.grain(c, r, 0, 0, A.W, 640, 14000, 0.16);
    c.fillStyle = '#2c1f15'; c.fillRect(0, 640, A.W, 260); A.grain(c, r, 0, 640, A.W, 260, 4000, 0.2);
    for (let i = 0; i < 9; i++) { c.fillStyle = '#2a1c12'; c.fillRect(i * 190, 0, 34, 50); }
    c.fillStyle = '#0b0b14'; c.beginPath(); c.moveTo(980, 0); c.lineTo(1340, 0); c.lineTo(1300, 90); c.lineTo(1010, 110); c.fill(); // collapsed roof hole
    A.emit(c, (k) => { const gg = k.createLinearGradient(1150, 0, 1050, 700); gg.addColorStop(0, 'rgba(170,190,240,0.35)'); gg.addColorStop(1, 'rgba(170,190,240,0)'); k.fillStyle = gg; k.beginPath(); k.moveTo(1000, 100); k.lineTo(1300, 90); k.lineTo(1250, 720); k.lineTo(860, 720); k.fill(); });
    c.fillStyle = '#100c0a'; c.fillRect(220, 280, 110, 150); c.fillStyle = '#0a0706'; c.fillRect(640, 240, 170, 400); // niche & doorway
    c.save(); c.translate(500, 600); c.rotate(-0.35); c.fillStyle = '#3b2a1c'; c.fillRect(-300, -14, 600, 28); c.restore(); // fallen beam
    c.fillStyle = '#3e2316'; c.beginPath(); c.ellipse(1400, 760, 40, 60, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(1470, 790, 50, 26, 1.2, 0, 7); c.fill(); // broken pots
  };
  S.upperRoom.seed = 26;

  S.voiceHouse = (c, r) => {
    S.upperRoom(c, r);
    c.fillStyle = '#4a3828'; c.fillRect(900, 620, 560, 90); A.grain(c, r, 900, 620, 560, 90, 1200, 0.2); // mud bench
  };
  S.voiceHouse.seed = 27;

  S.clinic = (c, r) => { // abandoned clinic corridor (one-point perspective)
    c.fillStyle = '#9aa39a'; c.fillRect(0, 0, A.W, A.H);
    const vx = 800, vy = 430;
    const quad = (pts, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(...pts[0]); pts.slice(1).forEach((p) => c.lineTo(...p)); c.fill(); };
    quad([[0, 0], [A.W, 0], [vx + 120, vy - 90], [vx - 120, vy - 90]], '#8e968c');
    quad([[0, A.H], [A.W, A.H], [vx + 120, vy + 90], [vx - 120, vy + 90]], '#5a5a52');
    quad([[0, 0], [vx - 120, vy - 90], [vx - 120, vy + 90], [0, A.H]], '#a7ae9f');
    quad([[A.W, 0], [vx + 120, vy - 90], [vx + 120, vy + 90], [A.W, A.H]], '#9aa294');
    c.fillStyle = 'rgba(70,110,90,0.35)'; quad([[0, 560], [vx - 120, vy + 40], [vx - 120, vy + 90], [0, A.H]], 'rgba(70,110,90,0.35)'); quad([[A.W, 560], [vx + 120, vy + 40], [vx + 120, vy + 90], [A.W, A.H]], 'rgba(70,110,90,0.35)');
    c.fillStyle = '#05070a'; c.fillRect(vx - 120, vy - 90, 240, 180);
    [[160, 0.9], [420, 0.65], [600, 0.45]].forEach(([x, s]) => { c.fillStyle = '#0d0f12'; c.fillRect(x, vy - 220 * s, 120 * s, 420 * s); c.fillStyle = '#0d0f12'; c.fillRect(A.W - x - 120 * s, vy - 220 * s, 120 * s, 420 * s); });
    c.fillStyle = 'rgba(30,25,20,0.5)'; for (let i = 0; i < 26; i++) { c.save(); c.translate(200 + r() * 1200, 700 + r() * 180); c.rotate(r() * 3); c.fillRect(-14, -10, 28, 20); c.restore(); } // papers
    A.grain(c, r, 0, 0, A.W, A.H, 16000, 0.15);
    for (let i = 0; i < 8; i++) { c.strokeStyle = 'rgba(40,40,35,0.4)'; c.lineWidth = 1; let x = r() * 1600, y = r() * 300; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 10; k++) { x += (r() - 0.5) * 20; y += 12; c.lineTo(x, y); } c.stroke(); }
    A.emit(c, (k) => { k.fillStyle = 'rgba(200,220,255,0.08)'; k.fillRect(vx - 120, vy - 90, 240, 180); });
  };
  S.clinic.seed = 28;

  S.farm = (c, r) => { // farmyard with the white pickup
    A.sky(c, r, { moon: [300, 130, 22] });
    A.ridge(c, r, { y: 500, amp: 120, color: '#151a26' });
    A.ground(c, r, 600, '#5a4a36', '#1c160f');
    for (let i = 0; i < 8; i++) A.palm(c, r, 900 + i * 95, 620, 240 + r() * 100, (r() - 0.5) * 0.2);
    A.house(c, r, 120, 720, 520, 260, { crenel: false, windows: [[0.2, 0.35, true], [0.7, 0.35, false]], door: { x: 0.45 } });
    A.light(c, 380, 520, 120, '255,170,90', 0.35); A.emit(c, (k) => { k.fillStyle = '#ffd28a'; k.beginPath(); k.arc(380, 510, 6, 0, 7); k.fill(); });
    A.car(c, 1100, 790, 1.35, '#e3e0d8', { flip: true });
    for (let x = 0; x < 1600; x += 46) { c.fillStyle = '#3b2a1c'; c.fillRect(x, 800, 8, 70); } c.fillRect(0, 812, 1600, 6); c.fillRect(0, 846, 1600, 6);
    A.figure(c, 760, 760, 230, 'dishdasha');
  };
  S.farm.seed = 29;

  S.police = (c, r) => { // town police office at night
    c.fillStyle = '#d8d3c6'; c.fillRect(0, 0, A.W, A.H);
    const g = c.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, '#c9c2b2'); g.addColorStop(1, '#a8a090'); c.fillStyle = g; c.fillRect(0, 0, A.W, 640);
    c.fillStyle = '#4a4036'; c.fillRect(0, 640, A.W, 260);
    A.grain(c, r, 0, 0, A.W, A.H, 9000, 0.1);
    c.fillStyle = '#0b1324'; c.fillRect(120, 140, 300, 300); A.emit(c, (k) => { k.fillStyle = '#0d1830'; k.fillRect(120, 140, 300, 300); k.fillStyle = '#e8eeff'; k.beginPath(); k.arc(330, 220, 14, 0, 7); k.fill(); }); // window
    c.strokeStyle = '#6a5a48'; c.lineWidth = 8; c.strokeRect(120, 140, 300, 300); c.beginPath(); c.moveTo(270, 140); c.lineTo(270, 440); c.stroke();
    c.fillStyle = '#5b3d25'; c.fillRect(380, 600, 700, 40); c.fillRect(420, 640, 30, 160); c.fillRect(1010, 640, 30, 160); // desk
    A.light(c, 980, 560, 220, '255,200,130', 0.4); A.emit(c, (k) => { k.fillStyle = '#ffe0a0'; k.beginPath(); k.moveTo(950, 560); k.lineTo(1010, 560); k.lineTo(990, 530); k.lineTo(970, 530); k.fill(); });
    c.fillStyle = '#c8a040'; c.fillRect(600, 570, 26, 30); c.fillStyle = '#b8862e'; c.beginPath(); c.moveTo(680, 600); c.quadraticCurveTo(700, 540, 720, 560); c.lineTo(712, 600); c.fill(); // dallah and cup
    A.figure(c, 1300, 800, 270, 'uniform');
  };
  S.police.seed = 30;

  S.well = (c, r) => {
    A.sky(c, r, { moon: [1300, 120, 25] });
    A.ridge(c, r, { y: 470, amp: 180, color: '#141927' }); A.fog(c, 560, 90, 0.16);
    A.ground(c, r, 580, '#4b3e2e', '#15100b');
    A.house(c, r, 1100, 640, 300, 140, { ruin: 0.9 }); A.house(c, r, 140, 630, 260, 130, { ruin: 0.7 });
    c.fillStyle = '#6e6454'; c.beginPath(); c.ellipse(800, 740, 170, 46, 0, 0, 7); c.fill(); c.fillRect(630, 740, 340, 70); c.beginPath(); c.ellipse(800, 810, 170, 40, 0, 0, Math.PI); c.fill();
    A.grain(c, r, 630, 700, 340, 150, 1500, 0.2);
    c.fillStyle = '#050505'; c.beginPath(); c.ellipse(800, 740, 140, 34, 0, 0, 7); c.fill();
    c.fillStyle = '#3b2a1c'; c.fillRect(640, 520, 18, 230); c.fillRect(942, 520, 18, 230); c.fillRect(630, 515, 340, 18);
    c.strokeStyle = '#b39662'; c.lineWidth = 3; c.beginPath(); c.moveTo(800, 533); c.lineTo(800, 745); c.stroke();
  };
  S.well.seed = 31;

  S.eighth = (c, r) => { // the eighth house, front
    A.sky(c, r, { moon: [240, 110, 24] });
    A.ridge(c, r, { y: 470, amp: 170, color: '#141927' }); A.fog(c, 640, 80, 0.18);
    A.ground(c, r, 600, '#4a3c2c', '#15100b');
    A.house(c, r, 60, 700, 300, 210, { ruin: 0.9 }); A.house(c, r, 1250, 710, 330, 230, { ruin: 0.8 });
    A.house(c, r, 480, 800, 640, 360, { color: '#9a7a58', patches: 0, crenel: true, door: { x: 0.46, w: 64, h: 130, color: '#3a2a1a' }, windows: [[0.15, 0.3, false], [0.8, 0.3, false]] });
    c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 1; for (let y = 450; y < 800; y += 22) { c.beginPath(); c.moveTo(480, y); c.lineTo(1120, y); c.stroke(); } // too-regular new blocks
  };
  S.eighth.seed = 32;

  S.cellar = (c, r) => {
    c.fillStyle = '#120c08'; c.fillRect(0, 0, A.W, A.H);
    const g = c.createRadialGradient(800, 120, 20, 800, 400, 900); g.addColorStop(0, '#4a3624'); g.addColorStop(1, '#0d0906'); c.fillStyle = g; c.fillRect(0, 0, A.W, A.H);
    A.grain(c, r, 0, 0, A.W, A.H, 16000, 0.2);
    A.emit(c, (k) => { const gg = k.createLinearGradient(800, 0, 800, 600); gg.addColorStop(0, 'rgba(230,220,200,0.5)'); gg.addColorStop(1, 'rgba(230,220,200,0)'); k.fillStyle = gg; k.beginPath(); k.moveTo(740, 0); k.lineTo(860, 0); k.lineTo(980, 640); k.lineTo(620, 640); k.fill(); });
    for (let i = 0; i < 6; i++) { c.fillStyle = '#3a2a1c'; c.fillRect(700 - i * 18, 120 + i * 70, 200 + i * 36, 22); }
    c.fillStyle = '#2a1d12'; c.beginPath(); c.ellipse(1200, 760, 260, 70, 0, 0, 7); c.fill(); // dug pit
    c.fillStyle = '#4a3a20'; c.fillRect(1120, 720, 160, 60); c.fillStyle = '#6a5a3a'; c.fillRect(1120, 712, 160, 12); // old chest
    A.light(c, 300, 600, 220, '255,190,110', 0.4); A.emit(c, (k) => { k.fillStyle = '#ffe2a8'; k.fillRect(290, 590, 20, 26); });
    A.figure(c, 420, 840, 220, 'worker');
  };
  S.cellar.seed = 33;
})();
