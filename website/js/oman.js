/* Stylised night map of Oman. Outline from approximate coordinates
 * (illustrative, not survey-accurate). Musandam is drawn as a separate peninsula.
 */
(function () {
  'use strict';
  const O = (window.OMAN = {});
  const LON0 = 51.6, LON1 = 60.2, LAT0 = 16.3, LAT1 = 26.7, K = Math.cos(21 * Math.PI / 180);
  O.aspect = ((LON1 - LON0) * K) / (LAT1 - LAT0);
  O.project = (lon, lat) => [((lon - LON0) * K) / ((LON1 - LON0) * K), (LAT1 - lat) / (LAT1 - LAT0)];

  const MAIN = [[56.37, 24.98], [56.6, 24.6], [56.75, 24.35], [57.1, 24.0], [57.5, 23.8], [57.9, 23.68], [58.2, 23.65], [58.55, 23.62], [58.75, 23.5], [58.92, 23.25], [59.2, 22.9], [59.53, 22.57], [59.82, 22.5], [59.75, 22.2], [59.58, 21.85], [59.45, 21.6], [59.15, 21.2], [58.8, 20.85], [58.4, 20.5], [58.2, 20.4], [57.9, 20.05], [57.7, 19.65], [57.75, 19.2], [57.82, 18.95], [57.4, 18.9], [56.9, 18.6], [56.6, 18.3], [56.2, 18.0], [55.6, 17.9], [55.3, 17.55], [55.0, 17.2], [54.7, 17.0], [54.3, 17.0], [54.08, 17.0], [53.8, 16.85], [53.3, 16.72], [52.82, 16.65], [52.0, 19.0], [55.0, 20.0], [55.67, 22.0], [55.2, 22.7], [55.6, 23.5], [55.78, 24.2], [56.0, 24.5], [56.2, 24.8]];
  const MUSANDAM = [[56.08, 26.06], [56.18, 26.28], [56.37, 26.38], [56.45, 26.2], [56.4, 25.95], [56.37, 25.65], [56.18, 25.62], [56.1, 25.85]];
  const MASIRAH = [[58.72, 20.72], [58.95, 20.55], [58.9, 20.15], [58.62, 20.3]];
  const HAJAR = [[56.15, 24.75], [56.55, 24.05], [57.1, 23.45], [57.65, 23.12], [58.2, 23.15], [58.8, 22.95], [59.35, 22.62]];
  const DHOFAR = [[53.3, 17.35], [54.0, 17.25], [54.6, 17.3], [55.2, 17.5]];
  O.ROADS = [
    [[56.37, 24.98], [56.75, 24.35], [57.5, 23.8], [58.2, 23.65], [58.55, 23.6]],
    [[58.55, 23.6], [58.15, 23.4], [57.53, 22.93], [57.53, 22.38], [56.28, 19.95], [54.03, 17.67], [54.09, 17.02]],
    [[58.55, 23.6], [58.53, 22.69], [59.53, 22.57]],
    [[57.53, 22.93], [57.66, 23.08]],
  ];
  O.REGIONS = {
    musandam: [56.25, 26.18], sohar: [56.75, 24.35], muscat: [58.55, 23.6], nizwa: [57.53, 22.93], jabal: [57.72, 23.15], sharqiya: [58.75, 22.05], salalah: [54.09, 17.02],
  };

  O.draw = function (cv) {
    const c = cv.getContext('2d'), W = cv.width, H = cv.height;
    const P = (lon, lat) => { const [x, y] = O.project(lon, lat); return [x * W, y * H]; };
    const path = (pts) => { c.beginPath(); pts.forEach(([lo, la], i) => { const [x, y] = P(lo, la); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.closePath(); };
    // sea
    const sg = c.createRadialGradient(W * 0.6, H * 0.4, 10, W * 0.5, H * 0.5, Math.max(W, H)); sg.addColorStop(0, '#0d2230'); sg.addColorStop(1, '#050b12'); c.fillStyle = sg; c.fillRect(0, 0, W, H);
    // faint lat/long grid
    c.strokeStyle = 'rgba(160,190,210,0.06)'; c.lineWidth = 1;
    for (let lo = 52; lo <= 60; lo++) { const [x] = P(lo, 20); c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let la = 17; la <= 26; la++) { const [, y] = P(55, la); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    // land
    const landFill = () => { const lg = c.createLinearGradient(0, 0, W, H); lg.addColorStop(0, '#4a3a29'); lg.addColorStop(0.6, '#3a2c1f'); lg.addColorStop(1, '#2d2218'); c.fillStyle = lg; c.fill(); };
    [MAIN, MUSANDAM, MASIRAH].forEach((pts) => { path(pts); c.save(); c.shadowColor = 'rgba(120,200,220,0.35)'; c.shadowBlur = W * 0.02; landFill(); c.restore(); });
    // clip to land for terrain colour
    c.save(); path(MAIN); c.clip();
    const sand = (lo, la, rx, ry, col) => { const [x, y] = P(lo, la); const g = c.createRadialGradient(x, y, 0, x, y, rx * W); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y); c.fillStyle = g; c.fillRect(x - rx * W, y - rx * W, rx * W * 2, rx * W * 2); c.restore(); };
    sand(58.75, 21.95, 0.1, 0.13, 'rgba(210,120,50,0.55)');        // Sharqiya sands
    sand(53.6, 20.2, 0.28, 0.24, 'rgba(190,140,80,0.28)');         // western sands
    sand(54.2, 17.3, 0.12, 0.05, 'rgba(70,140,70,0.55)');          // Dhofar green
    // grain
    for (let i = 0; i < W * H / 60; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,230,200,0.05)' : 'rgba(0,0,0,0.08)'; c.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
    c.restore();
    // mountains: layered ridge strokes
    const ridge = (pts, col, wd) => { for (let k = 0; k < 3; k++) { c.strokeStyle = col[k]; c.lineWidth = wd * (1 - k * 0.3); c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); pts.forEach(([lo, la], i) => { const [x, y] = P(lo, la); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke(); } for (let i = 0; i < pts.length - 1; i++) { for (let t = 0; t < 1; t += 0.12) { const lo = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, la = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t; const [x, y] = P(lo, la); const s = wd * (0.25 + Math.random() * 0.25); c.fillStyle = 'rgba(230,215,190,0.25)'; c.beginPath(); c.moveTo(x - s, y + s * 0.4); c.lineTo(x, y - s * 0.7); c.lineTo(x + s * 0.8, y + s * 0.4); c.fill(); } } };
    ridge(HAJAR, ['rgba(20,14,10,0.7)', 'rgba(70,55,42,0.9)', 'rgba(120,98,76,0.6)'], W * 0.028);
    ridge(DHOFAR, ['rgba(15,30,15,0.7)', 'rgba(50,85,50,0.9)', 'rgba(90,140,90,0.5)'], W * 0.02);
    // roads (glow)
    O.ROADS.forEach((r) => { c.strokeStyle = 'rgba(255,190,110,0.18)'; c.lineWidth = W * 0.008; c.beginPath(); r.forEach(([lo, la], i) => { const [x, y] = P(lo, la); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke(); c.strokeStyle = 'rgba(255,205,140,0.75)'; c.lineWidth = Math.max(1, W * 0.0018); c.stroke(); });
    // coast line
    [MAIN, MUSANDAM, MASIRAH].forEach((pts) => { path(pts); c.strokeStyle = 'rgba(160,220,230,0.4)'; c.lineWidth = Math.max(1, W * 0.0015); c.stroke(); });
    // city lights
    Object.values(O.REGIONS).forEach(([lo, la]) => { const [x, y] = P(lo, la); const g = c.createRadialGradient(x, y, 0, x, y, W * 0.03); g.addColorStop(0, 'rgba(255,200,120,0.5)'); g.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = g; c.fillRect(x - W * 0.03, y - W * 0.03, W * 0.06, W * 0.06); });
    // compass
    const cx = W * 0.12, cy = H * 0.9, cr = W * 0.035; c.strokeStyle = 'rgba(207,168,120,0.6)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, cr, 0, 7); c.stroke(); c.fillStyle = '#cfa878'; c.beginPath(); c.moveTo(cx, cy - cr * 1.2); c.lineTo(cx - cr * 0.25, cy); c.lineTo(cx + cr * 0.25, cy); c.fill(); c.fillStyle = 'rgba(207,168,120,0.4)'; c.beginPath(); c.moveTo(cx, cy + cr * 1.2); c.lineTo(cx - cr * 0.25, cy); c.lineTo(cx + cr * 0.25, cy); c.fill();
  };
})();
