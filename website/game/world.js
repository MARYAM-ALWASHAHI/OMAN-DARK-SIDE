/* OMAN: THE DARK SIDE — open world builder (three.js r128).
 * Terrain, roads, locations, buildings, vegetation, props, characters and vehicles.
 * All geometry and textures are generated in code. Places are fictional, inspired by Oman's interior.
 */
(function () {
  'use strict';
  const OTD = (window.OTD = window.OTD || {});

  // ---------------- math helpers ----------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function mulberry(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, z) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += a * vnoise(x * f, z * f); f *= 2.03; a *= 0.5; } return s; }
  OTD.math = { clamp, smooth, mulberry, fbm };

  // ---------------- locations ----------------
  const L = {
    town: { x: 0, z: 0, name: 'وادي السكون', r: 70 },
    grove: { x: -150, z: 75, name: 'بستان الفلج', r: 35 },
    harat: { x: -262, z: -192, name: 'حارة الرماد', r: 40 },
    well: { x: -212, z: -128, name: 'البئر القديمة', r: 12 },
    clinic: { x: 212, z: -205, name: 'المستوصف القديم', r: 25 },
    crossing: { x: 62, z: 122, name: 'معبر الوادي', r: 18 },
    wadi: { x: 150, z: 205, name: 'برك الوادي', r: 25 },
    farm: { x: -112, z: 248, name: 'المزرعة', r: 25 },
    mountain: { x: -292, z: 302, name: 'قرية الجبل', r: 30 },
    cave: { x: -338, z: -32, name: 'الكهف', r: 14 },
    tower: { x: 58, z: -352, name: 'برج المراقبة', r: 15 },
    station: { x: 382, z: -70, name: 'المحطة المهجورة', r: 22 },
    camp: { x: 300, z: 262, name: 'مخيم الرمال', r: 22 },
  };
  OTD.L = L;

  // ---------------- roads ----------------
  const ROADS = [
    { kind: 'asphalt', w: 7, pts: [[470, -44], [382, -40], [250, -34], [120, -16], [40, -4], [0, 2], [-80, 10], [-150, 52]] },
    { kind: 'gravel', w: 4.6, pts: [[-80, 10], [-150, -42], [-208, -108], [-240, -158], [-252, -172]] },
    { kind: 'gravel', w: 4.2, pts: [[-150, -42], [-250, -40], [-318, -32]] },
    { kind: 'gravel', w: 4.6, pts: [[120, -16], [168, -110], [202, -180]] },
    { kind: 'gravel', w: 4.2, pts: [[40, -4], [48, -150], [54, -290], [57, -334]] },
    { kind: 'gravel', w: 4.8, pts: [[0, 2], [28, 62], [60, 116], [108, 178], [140, 192]] },
    { kind: 'gravel', w: 4.2, pts: [[108, 178], [210, 228], [286, 254]] },
    { kind: 'gravel', w: 4.6, pts: [[-80, 10], [-90, 128], [-104, 232]] },
    { kind: 'gravel', w: 4.6, pts: [[-104, 232], [-168, 252], [-228, 282], [-276, 296]] },
  ];
  OTD.ROADS = ROADS;
  const SEGS = [];
  ROADS.forEach((r, ri) => { for (let i = 0; i < r.pts.length - 1; i++) SEGS.push({ a: r.pts[i], b: r.pts[i + 1], w: r.w, kind: r.kind, ri }); });
  function roadInfo(x, z) {
    let best = 1e9, kind = null;
    for (const s of SEGS) {
      const ax = s.a[0], az = s.a[1], bx = s.b[0], bz = s.b[1];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1);
      const px = ax + dx * t - x, pz = az + dz * t - z;
      const d = Math.sqrt(px * px + pz * pz) - s.w / 2;
      if (d < best) { best = d; kind = s.kind; }
    }
    return { d: best, kind };
  }
  OTD.roadInfo = roadInfo;

  // ---------------- terrain ----------------
  function bigShape(x, z) {
    const r = Math.hypot(x, z);
    let h = smooth(420, 500, r) * (55 + 50 * fbm(x * 0.008 + 3, z * 0.008));               // mountain wall at map edge
    h += 40 * Math.exp(-((x + 335) ** 2 + (z - 335) ** 2) / (2 * 85 * 85));               // Jebel massif (mountain village)
    h += 34 * Math.exp(-((x + 392) ** 2 + (z + 30) ** 2) / (2 * 38 * 38));                // cave ridge
    h += 22 * Math.exp(-((x - 58) ** 2 + (z + 372) ** 2) / (2 * 42 * 42));                // watchtower hill
    h += 9 * Math.exp(-((x + 270) ** 2 + (z + 215) ** 2) / (2 * 40 * 40));                // slope of the abandoned quarter
    const dz = smooth(170, 260, x) * smooth(150, 230, z);                                    // dune field (south-east)
    h += dz * (5 + 5 * Math.sin(x * 0.045 + Math.sin(z * 0.02) * 3) * Math.cos(z * 0.03));
    // wadi bed: a shallow channel crossing the map
    const wd = Math.abs(z - (120 + 60 * Math.sin(x * 0.006)) - x * 0.55);
    h -= 2.2 * (1 - smooth(6, 26, wd)) * smooth(-80, 40, x) * (1 - smooth(260, 330, x));
    return h;
  }
  function detail(x, z) { return 1.4 * (fbm(x * 0.02, z * 0.02) - 0.5) + 0.35 * (vnoise(x * 0.15, z * 0.15) - 0.5); }
  const flatten = []; // building plots: {x,z,r,h}
  function terrainH(x, z) {
    let h = bigShape(x, z);
    const rd = roadInfo(x, z);
    const wRoad = 1 - smooth(0, 7, rd.d);
    h += detail(x, z) * (1 - wRoad);
    for (const f of flatten) {
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < f.r + 10) { const w = 1 - smooth(f.r, f.r + 10, d); h = h * (1 - w) + f.h * w; }
    }
    return h;
  }
  OTD.terrainH = terrainH;
  function plot(x, z, r) { const h = bigShape(x, z); flatten.push({ x, z, r, h }); return h; }

  // ---------------- textures ----------------
  let Q, renderer, MAX_TEX = 2048;
  function tex(size, draw, srgb = true, detailAmt = 0) {
    const real = Math.min(MAX_TEX, size * Q.tex);
    const c = document.createElement('canvas'); c.width = c.height = real;
    const g = c.getContext('2d'); g.scale(real / size, real / size); draw(g, size);
    if (detailAmt && real > size) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      const r = mulberry(real + size), n = Math.floor(real * real / 30);
      for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(255,240,215,${r() * detailAmt})` : `rgba(0,0,0,${r() * detailAmt * 1.3})`; g.fillRect(r() * real, r() * real, 1, 1); }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (srgb) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  /** Normal map from a texture's luminance (Sobel). Gives surfaces real relief under the torch. */
  function normalFrom(srcTex, strength) {
    const src = srcTex.image, w = Math.min(src.width, 1024);
    const c = document.createElement('canvas'); c.width = c.height = w;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0, w, w);
    const d = g.getImageData(0, 0, w, w), p = d.data, out = g.createImageData(w, w), o = out.data;
    const L = new Float32Array(w * w);
    for (let i = 0; i < w * w; i++) L[i] = (p[i * 4] * 0.3 + p[i * 4 + 1] * 0.59 + p[i * 4 + 2] * 0.11) / 255;
    const at = (x, y) => L[((y + w) % w) * w + ((x + w) % w)];
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      let nx = -dx * strength, ny = -dy * strength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const i = (y * w + x) * 4; o[i] = (nx * 0.5 + 0.5) * 255; o[i + 1] = (ny * 0.5 + 0.5) * 255; o[i + 2] = (nz * 0.5 + 0.5) * 255; o[i + 3] = 255;
    }
    g.putImageData(out, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = srcTex.anisotropy; return t;
  }
  function speckle(g, s, r, n, light, dark, maxSize) { for (let i = 0; i < n; i++) { const lit = r() < 0.5; g.fillStyle = lit ? `rgba(${light},${r() * 0.18})` : `rgba(${dark},${r() * 0.22})`; const sz = r() * maxSize + 0.6; g.fillRect(r() * s, r() * s, sz, sz); } }
  function blotches(g, s, r, n, rgb, maxA, maxR) { for (let i = 0; i < n; i++) { const x = r() * s, y = r() * s, rad = r() * maxR + 10; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${rgb},${r() * maxA})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); } }
  function cracks(g, s, r, n, alpha) { g.strokeStyle = `rgba(28,18,10,${alpha})`; for (let i = 0; i < n; i++) { let x = r() * s, y = r() * s; g.lineWidth = r() * 1.4 + 0.4; g.beginPath(); g.moveTo(x, y); const st = 6 + r() * 14; for (let k = 0; k < st; k++) { x += (r() - 0.5) * 18; y += r() * 14; g.lineTo(x, y); } g.stroke(); } }

  function makeTextures() {
    const T = {};
    T.plaster = tex(512, (g, s) => {
      const r = mulberry(7); g.fillStyle = '#8f7152'; g.fillRect(0, 0, s, s);
      blotches(g, s, r, 40, '165,132,96', 0.45, 90); blotches(g, s, r, 34, '70,50,34', 0.3, 70);
      for (let p = 0; p < 4; p++) {
        const px = r() * s, py = r() * s, pw = 50 + r() * 110, ph = 36 + r() * 70;
        g.save(); g.beginPath(); g.ellipse(px, py, pw / 2, ph / 2, r(), 0, Math.PI * 2); g.clip();
        g.fillStyle = '#6a4f38'; g.fillRect(px - pw, py - ph, pw * 2, ph * 2);
        for (let by = py - ph; by < py + ph; by += 14) { const off = ((by / 14) | 0) % 2 ? 14 : 0; for (let bx = px - pw - off; bx < px + pw; bx += 28) { const v = r() * 26; g.fillStyle = `rgb(${108 + v},${80 + v * 0.75},${56 + v * 0.55})`; g.fillRect(bx + 1.5, by + 1.5, 25, 11); } }
        g.restore();
      }
      speckle(g, s, r, 9000, '230,210,180', '30,20,10', 2.2); cracks(g, s, r, 18, 0.5);
    }, true, 0.12);
    T.plasterWhite = tex(256, (g, s) => { const r = mulberry(9); g.fillStyle = '#c9bca6'; g.fillRect(0, 0, s, s); blotches(g, s, r, 30, '120,100,80', 0.25, 50); speckle(g, s, r, 3000, '255,250,240', '60,50,40', 1.6); cracks(g, s, r, 4, 0.25); }, true, 0.08);
    T.ground = tex(512, (g, s) => {
      const r = mulberry(21); g.fillStyle = '#7e7e7e'; g.fillRect(0, 0, s, s);
      blotches(g, s, r, 60, '200,200,200', 0.35, 80); blotches(g, s, r, 50, '60,60,60', 0.3, 60);
      speckle(g, s, r, 16000, '240,240,240', '20,20,20', 2);
      for (let i = 0; i < 300; i++) { const x = r() * s, y = r() * s, w = r() * 4 + 1.2, pv = 110 + r() * 90; g.fillStyle = `rgb(${pv},${pv * 0.95},${pv * 0.88})`; g.beginPath(); g.ellipse(x, y, w, w * (0.6 + r() * 0.4), r() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + 1, y + 1.2, w, w * 0.5, 0, 0, 7); g.fill(); }
    }, true, 0.1);
    T.rock = tex(256, (g, s) => {
      const r = mulberry(33); g.fillStyle = '#6d625a'; g.fillRect(0, 0, s, s);
      blotches(g, s, r, 40, '140,125,110', 0.4, 50); blotches(g, s, r, 40, '35,30,28', 0.35, 40);
      g.strokeStyle = 'rgba(20,16,14,0.6)'; for (let i = 0; i < 30; i++) { g.lineWidth = r() * 2 + 0.5; g.beginPath(); let x = r() * s, y = r() * s; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.3) * 30; y += (r() - 0.5) * 12; g.lineTo(x, y); } g.stroke(); }
      speckle(g, s, r, 5000, '220,210,200', '0,0,0', 2);
    }, true, 0.1);
    T.asphalt = tex(256, (g, s) => {
      const r = mulberry(41); g.fillStyle = '#2b2b2d'; g.fillRect(0, 0, s, s); speckle(g, s, r, 9000, '200,200,200', '0,0,0', 1.6);
      blotches(g, s, r, 12, '15,15,15', 0.4, 40);
      g.fillStyle = 'rgba(220,200,120,0.85)'; for (let y = 0; y < s; y += 64) g.fillRect(s / 2 - 2, y, 4, 34);  // dashed centre line
      g.fillStyle = 'rgba(230,230,230,0.7)'; g.fillRect(8, 0, 3, s); g.fillRect(s - 11, 0, 3, s);             // edge lines
    }, true, 0.06);
    T.gravel = tex(256, (g, s) => { const r = mulberry(43); g.fillStyle = '#7d6f60'; g.fillRect(0, 0, s, s); blotches(g, s, r, 20, '150,135,118', 0.4, 40); speckle(g, s, r, 12000, '220,205,185', '25,18,12', 2.5); for (let x = s * 0.3; x < s * 0.75; x += s * 0.4) { g.fillStyle = 'rgba(40,30,22,0.25)'; g.fillRect(x, 0, s * 0.1, s); } }, true, 0.1);
    T.stone = tex(256, (g, s) => { const r = mulberry(31); g.fillStyle = '#4a4038'; g.fillRect(0, 0, s, s); for (let y = 0; y < s; y += 32) for (let x = -(y % 64 ? 24 : 0); x < s; x += 48) { const sv = r() * 36; g.fillStyle = `rgb(${92 + sv},${83 + sv * 0.9},${70 + sv * 0.8})`; g.fillRect(x + 2, y + 2, 44 + r() * 4, 28); } speckle(g, s, r, 4000, '220,200,180', '0,0,0', 2); }, true, 0.1);
    T.wood = tex(256, (g, s) => { const r = mulberry(45); g.fillStyle = '#4b3524'; g.fillRect(0, 0, s, s); for (let x = 0; x < s; x += 2) { g.fillStyle = `rgba(${r() < 0.5 ? '120,90,60' : '20,12,6'},${r() * 0.35})`; g.fillRect(x, 0, 1 + r() * 2, s); } speckle(g, s, r, 1500, '200,170,130', '0,0,0', 1.5); }, true, 0.08);
    T.door = tex(256, (g, s) => {
      const r = mulberry(51); g.fillStyle = '#2f5652'; g.fillRect(0, 0, s, s);
      for (let x = 0; x < s; x += 32) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 2, s); }
      g.strokeStyle = 'rgba(15,25,22,0.7)'; g.lineWidth = 4; [[24, 24], [136, 24], [24, 136], [136, 136]].forEach(([x, y]) => g.strokeRect(x, y, 96, 96));
      g.fillStyle = 'rgba(200,190,160,0.5)'; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { g.beginPath(); g.arc(20 + i * 43, 20 + j * 43, 3, 0, 7); g.fill(); }
      blotches(g, s, r, 30, '140,110,80', 0.6, 40); speckle(g, s, r, 3000, '200,200,180', '0,0,0', 2);
    });
    T.frond = tex(256, (g, s) => {
      g.clearRect(0, 0, s, s); g.strokeStyle = '#3a3a22'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, s / 2); g.lineTo(s - 4, s / 2); g.stroke();
      const r = mulberry(55);
      for (let x = 14; x < s - 8; x += 4) { const len = 52 * Math.sin((x / s) * Math.PI) + 6; g.strokeStyle = `rgb(${46 + r() * 30},${56 + r() * 30},30)`; g.lineWidth = 2; g.beginPath(); g.moveTo(x, s / 2); g.lineTo(x + 14, s / 2 - len); g.stroke(); g.beginPath(); g.moveTo(x, s / 2); g.lineTo(x + 14, s / 2 + len); g.stroke(); }
    });
    T.foot = tex(128, (g, s) => {
      g.clearRect(0, 0, s, s); g.fillStyle = 'rgba(25,17,10,0.85)';
      g.beginPath(); g.ellipse(64, 78, 22, 40, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(64, 30, 18, 14, 0, 0, 7); g.fill();
      g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(44, 50 + i * 7, 40, 2); }
    });
    T.paper = tex(128, (g, s) => { g.fillStyle = '#d9cfb8'; g.fillRect(0, 0, s, s); g.strokeStyle = 'rgba(60,70,110,0.45)'; for (let y = 14; y < s; y += 9) { g.beginPath(); g.moveTo(6, y); g.lineTo(s - 6, y); g.stroke(); } g.fillStyle = 'rgba(30,30,40,0.7)'; g.font = '10px monospace'; ['23°0..', '57°3..', 'N 7 ?', '8 / 7'].forEach((t, i) => g.fillText(t, 10, 22 + i * 18)); });
    T.pole = tex(64, (g, s) => { for (let y = 0; y < s; y += 16) { g.fillStyle = (y / 16) % 2 ? '#e8e2d4' : '#d35a1e'; g.fillRect(0, y, s, 16); } });
    T.cloth = tex(128, (g, s) => { const r = mulberry(61); for (let y = 0; y < s; y += 16) { g.fillStyle = ['#6b2f2a', '#c8b48c', '#2c4a5a', '#c8b48c'][(y / 16) % 4]; g.fillRect(0, y, s, 16); } speckle(g, s, r, 2000, '255,255,255', '0,0,0', 1.5); });
    T.sign = tex(256, (g, s) => { g.fillStyle = '#e9e4d8'; g.fillRect(0, 0, s, s / 2); g.fillStyle = '#1d3f6e'; g.fillRect(0, s / 2, s, s / 2); });
    T.plasterN = normalFrom(T.plaster, 2.2); T.groundN = normalFrom(T.ground, 2.6); T.rockN = normalFrom(T.rock, 3); T.stoneN = normalFrom(T.stone, 2.5);
    return T;
  }

  function makeMaterials(T) {
    const S = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.95, metalness: 0 }, o));
    const M = {
      plaster: S({ map: T.plaster, normalMap: T.plasterN, normalScale: new THREE.Vector2(0.9, 0.9) }),
      plasterDark: S({ map: T.plaster, normalMap: T.plasterN, color: 0x9a8a7a }),
      white: S({ map: T.plasterWhite, roughness: 0.9 }),
      ground: S({ map: T.ground, normalMap: T.groundN, normalScale: new THREE.Vector2(1, 1), vertexColors: true }),
      rock: S({ map: T.rock, normalMap: T.rockN, normalScale: new THREE.Vector2(1.2, 1.2) }),
      asphalt: S({ map: T.asphalt, roughness: 0.85, side: THREE.DoubleSide }),
      gravel: S({ map: T.gravel, roughness: 1, side: THREE.DoubleSide }),
      stone: S({ map: T.stone, normalMap: T.stoneN }),
      wood: S({ map: T.wood, roughness: 0.9 }),
      door: S({ map: T.door, roughness: 0.85 }),
      hole: new THREE.MeshBasicMaterial({ color: 0x050505 }),
      lit: new THREE.MeshBasicMaterial({ color: 0xffb56a }),
      litDim: new THREE.MeshBasicMaterial({ color: 0xb87a3e }),
      paper: S({ map: T.paper, roughness: 0.8 }),
      pole: S({ map: T.pole, roughness: 0.6 }),
      plastic: S({ color: 0x1a1c1f, roughness: 0.45, metalness: 0.2 }),
      metal: S({ color: 0x6b6f73, roughness: 0.5, metalness: 0.7 }),
      rust: S({ color: 0x5a3a26, roughness: 0.9, metalness: 0.3 }),
      red: new THREE.MeshBasicMaterial({ color: 0xff2a1a }),
      foot: S({ map: T.foot, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }),
      frond: S({ map: T.frond, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9 }),
      deadFrond: S({ map: T.frond, color: 0x8a7050, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1 }),
      clay: S({ color: 0x3e2316, roughness: 0.9 }),
      cloth: S({ map: T.cloth, side: THREE.DoubleSide, roughness: 1 }),
      sign: S({ map: T.sign, roughness: 0.7 }),
      water: new THREE.MeshStandardMaterial({ color: 0x0b1620, roughness: 0.05, metalness: 0.85 }),
      shrub: S({ color: 0x3a3f2a, roughness: 1 }),
      glass: S({ color: 0x0c1218, roughness: 0.15, metalness: 0.6 }),
      tire: S({ color: 0x111111, roughness: 0.9 }),
      robeWhite: S({ color: 0xe4e1da, roughness: 0.85 }),
      robeBlack: S({ color: 0x121214, roughness: 0.7 }),
      robeGrey: S({ color: 0x5c6066, roughness: 0.85 }),
      uniform: S({ color: 0x1d2836, roughness: 0.75 }),
      jacket: S({ color: 0x5e1d22, roughness: 0.8 }),
      skin: S({ color: 0x7a4b31, roughness: 0.65 }),
      kumma: S({ color: 0xe9e3d3, roughness: 0.8 }),
      ghost: new THREE.MeshBasicMaterial({ color: 0xcfd8e8, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }),
      gold: S({ color: 0xc8a040, roughness: 0.3, metalness: 1 }),
    };
    M.plaster.userData.ts = 2.2;
    return M;
  }

  // ---------------- geometry batching ----------------
  function boxGeo(w, h, d, ts = 2.2) {
    const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / ts + f * 0.37, uv.getY(k) * dims[f][1] / ts); }
    uv.needsUpdate = true; return g;
  }
  /** Collects many small meshes into one draw call per material (essential for phones). */
  class Batch {
    constructor() { this.parts = new Map(); }
    add(geo, matrix, mat) {
      const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(matrix);
      if (!this.parts.has(mat)) this.parts.set(mat, []);
      this.parts.get(mat).push(g);
    }
    flush(scene, shadow = true) {
      const meshes = [];
      this.parts.forEach((list, mat) => {
        let n = 0; list.forEach((g) => { n += g.attributes.position.count; });
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
        let o = 0; list.forEach((g) => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); });
        const bg = new THREE.BufferGeometry();
        bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        bg.computeBoundingSphere();
        const m = new THREE.Mesh(bg, mat); m.castShadow = shadow && !(mat.isMeshBasicMaterial); m.receiveShadow = true; scene.add(m); meshes.push(m);
      });
      this.parts.clear(); return meshes;
    }
  }

  // ---------------- colliders (spatial grid) ----------------
  const CELL = 16, grid = new Map();
  const key = (i, j) => i * 100000 + j;
  function addCollider(minX, maxX, minZ, maxZ, tag) {
    const c = { minX, maxX, minZ, maxZ, tag };
    for (let i = Math.floor(minX / CELL); i <= Math.floor(maxX / CELL); i++) for (let j = Math.floor(minZ / CELL); j <= Math.floor(maxZ / CELL); j++) {
      const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c);
    }
    return c;
  }
  function blocked(x, z, r) {
    if (Math.abs(x) > 478 || Math.abs(z) > 478) return true;
    const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const list = grid.get(key(i, j)); if (!list) continue;
      for (const c of list) if (!c.off && x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return c;
    }
    return null;
  }
  OTD.blocked = blocked;
  OTD.addCollider = addCollider;

  // ---------------- world construction ----------------
  OTD.buildWorld = function (scene, quality, rend) {
    Q = quality; renderer = rend; MAX_TEX = Math.min(4096, renderer.capabilities.maxTextureSize || 4096);
    const T = makeTextures(), M = makeMaterials(T);
    OTD.M = M; OTD.T = T;
    const interiors = []; OTD.interiors = interiors;
    const anchors = {}; OTD.anchors = anchors;
    const lamps = []; OTD.lamps = lamps;
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
    const geoCache = new Map();
    function cachedBox(w, h, d, ts) { const k = [w, h, d, ts].map((v) => v.toFixed(3)).join(','); if (!geoCache.has(k)) geoCache.set(k, boxGeo(w, h, d, ts)); return geoCache.get(k); }

    // Plots: flatten the ground where buildings stand (must happen before the terrain mesh is generated)
    const base = {};
    base.town = plot(0, 0, 78); base.harat = plot(L.harat.x, L.harat.z, 38); base.clinic = plot(L.clinic.x, L.clinic.z, 26);
    base.station = plot(L.station.x, L.station.z, 24); base.farm = plot(L.farm.x, L.farm.z, 22); base.mountain = plot(L.mountain.x, L.mountain.z, 26);
    base.tower = plot(L.tower.x, L.tower.z, 9); base.camp = plot(L.camp.x, L.camp.z, 18); base.well = plot(L.well.x, L.well.z, 7);
    base.crossing = plot(L.crossing.x, L.crossing.z, 10); base.grove = plot(L.grove.x, L.grove.z, 30); base.cave = plot(L.cave.x + 8, L.cave.z, 10);
    OTD.base = base;

    // ---- terrain mesh with vertex colours (sand / gravel / rock / dunes) ----
    const SEG = Q.tex >= 4 ? 220 : Q.tex >= 2 ? 180 : 140;
    const tg = new THREE.PlaneGeometry(1000, 1000, SEG, SEG); tg.rotateX(-Math.PI / 2);
    const pa = tg.attributes.position, cols = new Float32Array(pa.count * 3);
    for (let i = 0; i < pa.count; i++) pa.setY(i, terrainH(pa.getX(i), pa.getZ(i)));
    tg.computeVertexNormals();
    const na = tg.attributes.normal;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), z = pa.getZ(i), y = pa.getY(i), slope = 1 - na.getY(i);
      const n = fbm(x * 0.03, z * 0.03);
      let r = 0.32 + n * 0.08, g = 0.235 + n * 0.06, b = 0.155 + n * 0.04;                     // gravel plain: warm Omani earth
      const rock = clamp(slope * 4 + smooth(14, 40, y) * 0.8, 0, 1);
      r = r * (1 - rock) + 0.34 * rock; g = g * (1 - rock) + 0.30 * rock; b = b * (1 - rock) + 0.27 * rock;
      const dune = smooth(170, 260, x) * smooth(150, 230, z);
      r = r * (1 - dune) + 0.72 * dune; g = g * (1 - dune) + 0.46 * dune; b = b * (1 - dune) + 0.26 * dune;
      const wd = Math.abs(z - (120 + 60 * Math.sin(x * 0.006)) - x * 0.55);
      const bed = (1 - smooth(4, 18, wd)) * smooth(-80, 40, x) * (1 - smooth(260, 330, x));
      r = r * (1 - bed * 0.3) + 0.5 * bed * 0.3; g = g * (1 - bed * 0.3) + 0.47 * bed * 0.3; b = b * (1 - bed * 0.3) + 0.43 * bed * 0.3;
      cols[i * 3] = r; cols[i * 3 + 1] = g; cols[i * 3 + 2] = b;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const uvA = tg.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, pa.getX(i) / 6, pa.getZ(i) / 6);
    const terrain = new THREE.Mesh(tg, M.ground); terrain.receiveShadow = true; scene.add(terrain);

    // ---- road ribbons ----
    ROADS.forEach((r) => {
      const pos = [], uv = [], idx = []; let vlen = 0;
      for (let s = 0; s < r.pts.length - 1; s++) {
        const [ax, az] = r.pts[s], [bx, bz] = r.pts[s + 1];
        const len = Math.hypot(bx - ax, bz - az), steps = Math.ceil(len / 3);
        const nx = -(bz - az) / len, nz = (bx - ax) / len;
        for (let k = (s === 0 ? 0 : 1); k <= steps; k++) {
          const t = k / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
          for (const side of [-1, 1]) { const px = x + nx * side * r.w / 2, pz = z + nz * side * r.w / 2; pos.push(px, terrainH(px, pz) + 0.06, pz); uv.push(side < 0 ? 0 : 1, vlen / r.w); }
          if (pos.length > 6) { const n = pos.length / 3; idx.push(n - 4, n - 2, n - 3, n - 3, n - 2, n - 1); }
          vlen += len / steps;
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      const m = new THREE.Mesh(g, r.kind === 'asphalt' ? M.asphalt : M.gravel); m.receiveShadow = true; scene.add(m);
    });

    // ---- building helpers (all write into a Batch) ----
    let B = new Batch();
    function box(w, h, d, x, y, z, mat, o = {}) {
      _e.set(o.rx || 0, o.ry || 0, o.rz || 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(1, 1, 1);
      _m.compose(_p, _q, _s); B.add(cachedBox(w, h, d, o.ts || 2.2), _m, mat);
      if (o.collide) {
        if (o.ry) { const c = Math.abs(Math.cos(o.ry)), s = Math.abs(Math.sin(o.ry)); const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2; addCollider(x - hw, x + hw, z - hd, z + hd); }
        else addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      }
    }
    function geom(g, x, y, z, mat, o = {}) { _e.set(o.rx || 0, o.ry || 0, o.rz || 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(o.sx || 1, o.sy || 1, o.sz || 1); _m.compose(_p, _q, _s); B.add(g, _m, mat); }

    function wall(x1, z1, x2, z2, y0, h, t, mat, opt = {}) {
      const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
      const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
      const sx = Math.min(x1, x2), sz = Math.min(z1, z2);
      const segs = [];
      if (opt.gapAt != null) {
        const gw = opt.gapW || 1.2, gh = opt.gapH || 2.1; segs.push([0, opt.gapAt - gw / 2], [opt.gapAt + gw / 2, len]);
        const lx = alongX ? sx + opt.gapAt : x1, lz = alongX ? z1 : sz + opt.gapAt;
        if (h - gh > 0.05) box(alongX ? gw + 0.3 : t, h - gh, alongX ? t : gw + 0.3, lx, y0 + gh + (h - gh) / 2, lz, mat);
      } else segs.push([0, len]);
      const r = mulberry(Math.floor((x1 * 13 + z1 * 7) * 100));
      segs.forEach(([a, b]) => {
        const Lw = b - a; if (Lw <= 0.05) return;
        let hh = h; if (opt.ruin && r() < opt.ruin) hh = h * (0.35 + r() * 0.45);
        const cx = alongX ? sx + (a + b) / 2 : x1, cz = alongX ? z1 : sz + (a + b) / 2;
        box(alongX ? Lw : t, hh, alongX ? t : Lw, cx, y0 + hh / 2, cz, mat, { collide: true });
        if (hh === h && !opt.noCren) for (let p = 0.35; p < Lw - 0.2; p += 0.9) { const px = alongX ? sx + a + p : x1, pz = alongX ? z1 : sz + a + p; box(alongX ? 0.45 : t, 0.42, alongX ? t : 0.45, px, y0 + h + 0.21, pz, mat); }
        if (opt.windows && Lw > 2.2 && hh > 3) for (let p = 1.1; p < Lw - 0.8; p += 2.4) {
          const px = alongX ? sx + a + p : x1, pz = alongX ? z1 : sz + a + p;
          const wm = opt.lit && r() < opt.lit ? M.lit : M.hole;
          box(alongX ? 0.55 : t + 0.04, 0.75, alongX ? t + 0.04 : 0.55, px, y0 + hh - 1.4, pz, wm);
        }
        if (hh < h) for (let k = 0; k < 5; k++) { const s = 0.15 + r() * 0.35; box(s, s * 0.7, s, cx + (alongX ? (r() - 0.5) * Lw : (r() - 0.5) * 1.6), y0 + s * 0.35, cz + (alongX ? (r() - 0.5) * 1.6 : (r() - 0.5) * Lw), mat, { rx: r(), ry: r() * 3, rz: r() }); }
      });
    }
    /** Mud-brick / plastered house. door: n|s|e|w. Returns its rectangle. */
    function house(x, z, y0, w, d, h, o = {}) {
      const t = 0.45, mat = o.mat || M.plaster;
      const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
      const c = { ruin: o.ruin || 0, windows: true, lit: o.lit || 0, noCren: o.noCren };
      wall(x0, z0, x1, z0, y0, h, t, mat, Object.assign({}, c, o.door === 'n' ? { gapAt: w / 2, ruin: 0 } : {}));
      wall(x0, z1, x1, z1, y0, h, t, mat, Object.assign({}, c, o.door === 's' ? { gapAt: w / 2, ruin: 0 } : {}));
      wall(x0, z0, x0, z1, y0, h, t, mat, Object.assign({}, c, o.door === 'w' ? { gapAt: d / 2, ruin: 0 } : {}));
      wall(x1, z0, x1, z1, y0, h, t, mat, Object.assign({}, c, o.door === 'e' ? { gapAt: d / 2, ruin: 0 } : {}));
      if (o.interior !== false) interiors.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, name: o.name || '' });
      box(w - t, 0.04, d - t, x, y0 + 0.02, z, M.plasterDark, { ts: 3 });
      if (o.roof) {
        const n = Math.floor(d / 0.7), r = mulberry(Math.floor(x * 31 + z * 17));
        for (let i = 1; i < n; i++) {
          const bz = z0 + i * (d / n), broken = o.collapse && bz > z0 + d * o.collapse[0] && bz < z0 + d * o.collapse[1];
          if (broken && r() < 0.5) box(0.18, 0.18, w, x, y0 + h * 0.5, bz, M.wood, { ry: Math.PI / 2, rz: (r() - 0.5) * 0.9 });
          else if (!broken) box(w, 0.16, 0.16, x, y0 + h - 0.15, bz, M.wood);
        }
        const slab = (za, zb) => { if (zb - za > 0.1) box(w, 0.28, zb - za, x, y0 + h + 0.02, (za + zb) / 2, M.plasterDark); };
        if (o.collapse) { slab(z0, z0 + d * o.collapse[0]); slab(z0 + d * o.collapse[1], z1); } else slab(z0, z1);
      }
      if (o.doorLeaf) { // closed carved door (decorative)
        const dx = o.door === 'e' ? x1 + 0.05 : o.door === 'w' ? x0 - 0.05 : x, dz = o.door === 'n' ? z0 - 0.05 : o.door === 's' ? z1 + 0.05 : z;
        const along = o.door === 'n' || o.door === 's';
        box(along ? 1.2 : 0.08, 2.08, along ? 0.08 : 1.2, dx, y0 + 1.04, dz, M.door);
        if (o.closed) addCollider(dx - 0.7, dx + 0.7, dz - 0.7, dz + 0.7);
      }
      return { x0, x1, z0, z1, y0 };
    }

    // ---- instanced vegetation & rocks ----
    const palms = [], shrubs = [], rocks = [];
    function palm(x, z, h, dead, seed) { if (roadInfo(x, z).d < 2.5 || blocked(x, z, 0.8)) return; palms.push({ x, z, h, dead, seed }); addCollider(x - 0.3, x + 0.3, z - 0.3, z + 0.3); }

    // ================= TOWN: Wadi Al-Sukoon =================
    {
      const y = base.town;
      // Fort: square enclosure with round corner towers (exterior only)
      const fx = -42, fz = -34, fw = 30;
      [[fx - fw / 2, fz - fw / 2, fx + fw / 2, fz - fw / 2], [fx - fw / 2, fz + fw / 2, fx + fw / 2, fz + fw / 2], [fx - fw / 2, fz - fw / 2, fx - fw / 2, fz + fw / 2], [fx + fw / 2, fz - fw / 2, fx + fw / 2, fz + fw / 2]].forEach(([a, b, c, d], i) => wall(a, b, c, d, y, 9, 1.4, M.plaster, i === 1 ? { gapAt: fw / 2, gapW: 3, gapH: 4.2 } : {}));
      box(3.1, 4.1, 0.25, fx, y + 2.05, fz + fw / 2 + 0.6, M.door, { collide: true }); // closed fort gate
      [[fx - fw / 2, fz - fw / 2], [fx + fw / 2, fz - fw / 2], [fx - fw / 2, fz + fw / 2], [fx + fw / 2, fz + fw / 2]].forEach(([tx, tz]) => {
        geom(new THREE.CylinderGeometry(4.2, 4.8, 13, 20), tx, y + 6.5, tz, M.plaster); addCollider(tx - 4.6, tx + 4.6, tz - 4.6, tz + 4.6);
        for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; box(0.8, 0.9, 0.5, tx + Math.cos(a) * 4.1, y + 13.4, tz + Math.sin(a) * 4.1, M.plaster, { ry: -a }); }
      });
      anchors.fortGate = [fx, fz + fw / 2 + 3];
      // Mosque (exterior only, never used for horror)
      const mx = 46, mz = -44;
      house(mx, mz, y, 14, 12, 6, { mat: M.white, noCren: false, interior: false, door: 'n', doorLeaf: true, closed: true });
      geom(new THREE.SphereGeometry(4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mx, y + 6.2, mz, M.white);
      geom(new THREE.CylinderGeometry(1.1, 1.3, 18, 12), mx + 8, y + 9, mz - 5, M.white); addCollider(mx + 6.8, mx + 9.2, mz - 6.2, mz - 3.8);
      geom(new THREE.ConeGeometry(1.2, 2.5, 12), mx + 8, y + 19.2, mz - 5, M.white);
      lamps.push({ x: mx + 8, y: y + 15, z: mz - 5, glow: 0x9fd4ff, size: 3 });
      // Souq lane: stalls with cloth awnings along the main street
      for (let i = 0; i < 7; i++) {
        const sx = 6 + i * 6.5;
        [-1, 1].forEach((side) => {
          const sz = 16 + side * 5.5;
          box(5.6, 3, 3.2, sx, y + 1.5, sz + side * 1.6, M.plaster, { collide: true });
          box(5.8, 0.06, 2.4, sx, y + 2.85, sz - side * 0.6, M.cloth, { rx: side * 0.18 });
          box(3.6, 0.9, 0.6, sx, y + 0.45, sz - side * 0.2, M.wood, { collide: true });
          if ((i + (side > 0 ? 1 : 0)) % 3 === 0) box(0.5, 0.4, 0.06, sx - 1, y + 2.2, sz - side * 0.05, M.lit);
        });
      }
      anchors.saif = [16, 16]; anchors.souqEnd = [48, 16];
      lamps.push({ x: 25, y: y + 3.2, z: 16, glow: 0xffb060, size: 4, light: 1.2 });
      // Coffee shop with plastic chairs
      house(30, 34, y, 9, 7, 3.6, { mat: M.white, door: 's', lit: 1, noCren: true });
      box(9.4, 0.12, 3, 30, y + 3.2, 39.2, M.wood);
      for (let i = 0; i < 4; i++) { box(0.45, 0.45, 0.45, 26 + i * 2.6, y + 0.22, 41.2, M.robeWhite); }
      anchors.coffee = [31, 41.5];
      lamps.push({ x: 30, y: y + 3, z: 39.5, glow: 0xffc070, size: 3, light: 1.1 });
      // Police post
      house(64, 30, y, 12, 9, 4.2, { mat: M.white, door: 'w', lit: 0.8, noCren: true, name: 'police' });
      box(4, 1, 0.1, 57.8, y + 3.5, 30, M.sign, { ry: Math.PI / 2 });
      anchors.nasser = [56.5, 28]; anchors.policeBoard = [65, 33.8];
      lamps.push({ x: 57.5, y: y + 3.6, z: 30, glow: 0xdfe8ff, size: 3, light: 0.9 });
      // Houses of the town (inhabited: some lit windows)
      const R = mulberry(404);
      const homes = [[-20, 52, 9, 8, 'n'], [-34, 30, 8, 8, 'e'], [-8, 34, 8, 7, 's'], [-58, 26, 9, 8, 'e'], [12, 54, 8, 8, 's'], [-46, 52, 10, 8, 'e'], [72, 4, 8, 8, 'w'], [86, 22, 9, 8, 'w'], [-12, -24, 8, 8, 'n'], [10, -28, 9, 8, 'n'], [74, -20, 8, 7, 'w'], [-66, -6, 8, 8, 'e']];
      homes.forEach(([hx, hz, w, d, door], i) => house(hx, hz, y, w, d, 4.2 + R() * 2.2, { door, lit: 0.5, doorLeaf: true, closed: i !== 0, name: i === 0 ? 'maryamHouse' : '' }));
      anchors.maryam = [-20, 46.2];
      for (let i = 0; i < 8; i++) palm(-75 + R() * 160, -60 + R() * 130 > 20 ? 70 + R() * 10 : -60 - R() * 8, 6 + R() * 3, false, 900 + i);
      // Street lamps along the main street
      const roadZ = (x) => x < 0 ? 2 + 8 * (-x / 80) : x < 40 ? 2 - 6 * (x / 40) : -4 - 12 * ((x - 40) / 80);
      for (let x = -70; x <= 110; x += 30) { const lz = roadZ(x) - 5.5; box(0.14, 5, 0.14, x, y + 2.5, lz, M.metal, { collide: true }); box(0.9, 0.08, 0.1, x, y + 5, lz + 0.4, M.metal); lamps.push({ x, y: y + 4.9, z: lz + 0.8, glow: 0xffa860, size: 2.5 }); }
      anchors.playerStart = [-14, 42]; anchors.carStart = [-6, 44];
    }

    // ================= Palm grove and falaj =================
    {
      const y = base.grove, cx = L.grove.x, cz = L.grove.z, R = mulberry(5);
      const fx = cx - 12; // falaj channel runs north-south, west of the road end
      for (let z = cz - 30; z < cz + 34; z += 4) { box(0.22, 0.55, 4, fx - 0.4, terrainH(fx, z + 2) + 0.27, z + 2, M.stone, { collide: true, ts: 1.2 }); box(0.22, 0.55, 4, fx + 0.4, terrainH(fx, z + 2) + 0.27, z + 2, M.stone, { collide: true, ts: 1.2 }); box(0.58, 0.05, 4, fx, terrainH(fx, z + 2) + 0.03, z + 2, M.stone); }
      house(cx + 14, cz + 14, y, 4, 4, 2.6, { door: 'n', noCren: true });
      for (let i = 0; i < 70; i++) { const x = cx + (R() - 0.5) * 70, z = cz + (R() - 0.5) * 70; if (Math.abs(x - fx) < 3) continue; palm(x, z, 5 + R() * 5, R() < 0.15, 100 + i); }
      anchors.groveFalaj = [fx + 1.6, cz - 4]; anchors.groveShed = [cx + 14, cz + 13];
    }

    // ================= Harat Al-Ramad (abandoned quarter) =================
    {
      const y = base.harat, X = L.harat.x, Z = L.harat.z;
      // gate
      box(1.2, 4.2, 1.2, X - 3.6, y + 2.1, Z + 22.5, M.plaster, { collide: true }); box(1.2, 4.2, 1.2, X + 3.6, y + 2.1, Z + 22.5, M.plaster, { collide: true });
      box(8.4, 0.9, 1.2, X, y + 4.4, Z + 22.5, M.plaster);
      house(X - 8, Z + 15, y, 8, 7, 5.2, { door: 'e', ruin: 0.6 });
      const H2 = house(X - 8, Z + 4, y, 8, 8, 5.8, { door: 'e', roof: true, collapse: [0.62, 0.95], name: 'blueDoor' });
      box(0.08, 2.08, 1.18, H2.x1 + 0.35, y + 1.04, Z + 4 + 0.9, M.door, { ry: -1.1 });
      house(X - 8, Z - 7.5, y, 8, 8, 4.6, { door: 'e', ruin: 0.85 });
      house(X + 8, Z + 14.5, y, 8, 7, 4.8, { door: 'w', ruin: 0.7 });
      const H5 = house(X + 8, Z + 1, y, 8, 8, 6.2, { door: 'w', roof: true, collapse: [0.05, 0.25], name: 'voiceHouse' });
      box(0.7, 0.5, 4.5, H5.x1 - 0.6, y + 0.25, Z + 0.5, M.plasterDark, { collide: true });
      house(X + 8, Z - 10.5, y, 8, 7, 5, { door: 'w', ruin: 0.5 });
      house(X - 8, Z - 18, y, 7, 6, 4.4, { door: 'e', ruin: 0.4 });
      // The "eighth house": newer blocks, plastered to look old, with a padlocked cellar hatch
      const H8 = house(X + 7, Z - 21, y, 7, 6, 3.6, { door: 'w', roof: true, name: 'eighth' });
      box(1.2, 0.08, 1.2, X + 8.5, y + 0.06, Z - 21.5, M.rust);
      anchors.eighthHatch = [X + 8.5, Z - 21.5]; anchors.eighthDoor = [X + 2.5, Z - 21];
      // watch tower and rubble barricade
      geom(new THREE.CylinderGeometry(3.1, 3.6, 13, 20), X, y + 6.5, Z - 38, M.plaster); addCollider(X - 3.6, X + 3.6, Z - 41.6, Z - 34.4);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; box(0.7, 0.8, 0.45, X + Math.cos(a) * 3.05, y + 13.4, Z - 38 + Math.sin(a) * 3.05, M.plaster, { ry: -a }); }
      const R = mulberry(77); for (let i = 0; i < 26; i++) { const s = 0.3 + R() * 0.7; box(s, s * 0.6, s, X - 4 + R() * 8, y + s * 0.3, Z - 30 - R() * 2, M.plaster, { rx: R(), ry: R() * 3, rz: R() }); }
      addCollider(X - 4.5, X + 4.5, Z - 32.5, Z - 29.2);
      [[X + 2.9, Z + 18], [X - 3.1, Z - 13], [X + 3.2, Z - 4.5]].forEach(([px, pz], i) => palm(px, pz, 4 + i, true, 300 + i));
      Object.assign(anchors, { haratGate: [X, Z + 24], haratNote: [X - 10.9, Z + 2.4], haratBench: [H5.x1 - 0.6, Z + 0.2], haratPole: [X + 2.75, Z + 21.7], haratLane: [X, Z + 6], haratH5Door: [X + 3, Z + 1], haratH2Door: [X - 3, Z + 4], haratTower: [X, Z - 28] });
    }

    // ================= Old well =================
    {
      const y = base.well, X = L.well.x, Z = L.well.z;
      geom(new THREE.CylinderGeometry(1.4, 1.5, 0.9, 16, 1, true), X, y + 0.45, Z, M.stone); addCollider(X - 1.5, X + 1.5, Z - 1.5, Z + 1.5);
      geom(new THREE.CircleGeometry(1.3, 16), X, y + 0.05, Z, M.hole, { rx: -Math.PI / 2 });
      box(0.15, 2.4, 0.15, X - 1.3, y + 1.2, Z, M.wood); box(0.15, 2.4, 0.15, X + 1.3, y + 1.2, Z, M.wood); box(2.9, 0.15, 0.15, X, y + 2.35, Z, M.wood);
      anchors.well = [X, Z + 2.2];
    }

    // ================= Abandoned clinic =================
    {
      const y = base.clinic, X = L.clinic.x, Z = L.clinic.z, w = 30, d = 12, h = 3.8, t = 0.3;
      const x0 = X - w / 2, x1 = X + w / 2, z0 = Z - d / 2, z1 = Z + d / 2;
      wall(x0, z0, x1, z0, y, h, t, M.white, { noCren: true, windows: true });
      wall(x0, z1, x1, z1, y, h, t, M.white, { noCren: true, windows: true, gapAt: w / 2, gapW: 2 });
      wall(x0, z0, x0, z1, y, h, t, M.white, { noCren: true }); wall(x1, z0, x1, z1, y, h, t, M.white, { noCren: true });
      // corridor along z = Z, rooms on the north side
      for (let i = 0; i < 5; i++) { const rx = x0 + 3 + i * 6; wall(x0 + i * 6, Z - 1.2, x0 + i * 6 + 6, Z - 1.2, y, h, t, M.white, { noCren: true, gapAt: 3, gapW: 1.1 }); if (i > 0) wall(x0 + i * 6, z0, x0 + i * 6, Z - 1.2, y, h, t, M.white, { noCren: true }); box(0.9, 0.5, 2, rx, y + 0.45, z0 + 1.6, M.metal); }
      box(w, 0.2, d, X, y + h + 0.1, Z, M.plasterDark);
      box(w - t, 0.04, d - t, X, y + 0.02, Z, M.white, { ts: 1 });
      box(5, 0.9, 0.1, X, y + h - 0.2, z1 + 0.25, M.sign);
      interiors.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, name: 'clinic' });
      Object.assign(anchors, { clinicDoor: [X, z1 + 2], clinicRoom: [x0 + 3 + 4 * 6, z0 + 2.6], clinicDesk: [x0 + 3, z0 + 2.4], clinicCorridor: [X - 8, Z + 1], clinicRoom2: [x0 + 3 + 2 * 6, z0 + 3] });
    }

    // ================= Wadi crossing & pools =================
    {
      const y = base.crossing, X = L.crossing.x, Z = L.crossing.z;
      anchors.khalfanCar = [X + 8, Z - 8];
      for (let i = 0; i < 6; i++) box(1.2, 0.7, 1.2, X - 8 + i * 3.2, y + 0.3, Z + 6, M.stone);
      const W = L.wadi;
      [[W.x - 6, W.z, 9], [W.x + 10, W.z + 8, 6], [W.x + 2, W.z - 10, 5]].forEach(([px, pz, r]) => { geom(new THREE.CircleGeometry(r, 24), px, terrainH(px, pz) + 0.12, pz, M.water, { rx: -Math.PI / 2 }); addCollider(px - r * 0.7, px + r * 0.7, pz - r * 0.7, pz + r * 0.7); });
      box(14, 2.2, 1.6, W.x - 14, terrainH(W.x - 14, W.z + 14) + 1, W.z + 14, M.stone, { collide: true, ry: 0.5 });
      box(1.8, 0.8, 0.5, W.x + 16, terrainH(W.x + 16, W.z - 4) + 1.4, W.z - 4, M.rock);
      Object.assign(anchors, { floodMark: [W.x + 16, W.z - 2.6], tinBox: [W.x - 18, W.z + 4], wadiPool: [W.x - 6, W.z + 11] });
      for (let i = 0; i < 18; i++) { const r = mulberry(800 + i); palm(W.x - 30 + r() * 60, W.z - 25 + r() * 50, 5 + r() * 4, r() < 0.2, 820 + i); }
    }

    // ================= Farm =================
    {
      const y = base.farm, X = L.farm.x, Z = L.farm.z;
      house(X, Z, y, 10, 8, 4.4, { door: 's', lit: 0.6, noCren: true, doorLeaf: true, closed: true });
      for (let i = 0; i < 18; i++) { const r = mulberry(700 + i); palm(X - 25 + r() * 50, Z - 30 + r() * 20, 5 + r() * 3, false, 700 + i); }
      for (let x = X - 14; x < X + 14; x += 2) { if (Math.abs(x + 1 - X) < 2.5) continue; box(1.9, 1.6, 0.25, x + 1, y + 0.8, Z + 12, M.wood, { collide: true }); }
      anchors.juma = [X + 5, Z + 6]; anchors.pickup = [X - 6, Z + 7]; anchors.farmGate = [X, Z + 16];
      lamps.push({ x: X, y: y + 3.6, z: Z + 4.3, glow: 0xffb060, size: 3, light: 1 });
    }

    // ================= Mountain village (terraces) =================
    {
      const y = base.mountain, X = L.mountain.x, Z = L.mountain.z;
      for (let i = 0; i < 6; i++) { const ty = terrainH(X - 20, Z + 30 + i * 5); box(36, 1.1, 0.6, X - 10, ty + 0.4, Z + 28 + i * 5, M.stone, { collide: true }); }
      [[X - 8, Z - 6, 7, 6, 'e'], [X + 6, Z - 10, 8, 6, 'w'], [X + 2, Z + 10, 7, 7, 'n'], [X - 14, Z + 8, 6, 6, 'e'], [X + 14, Z + 4, 7, 6, 'w']].forEach(([hx, hz, w, d, door], i) => house(hx, hz, y, w, d, 4, { mat: M.stone, door, lit: i < 3 ? 0.6 : 0, doorLeaf: true, closed: true, noCren: true }));
      anchors.salem = [X - 2, Z + 2]; anchors.mountainView = [X + 18, Z - 18];
      lamps.push({ x: X + 2, y: y + 3.5, z: Z + 6, glow: 0xffb060, size: 3, light: 0.9 });
    }

    // ================= Cave =================
    {
      const y = base.cave, X = L.cave.x, Z = L.cave.z;
      for (let i = 0; i < 7; i++) {
        const zz = Z - 6 + i * 2; box(1.6, 4.2, 2.1, X - 3.2, y + 2.1, zz, M.rock, { collide: true, ts: 3 }); box(1.6, 4.2, 2.1, X + 3.2 - 0.4, y + 2.1, zz, M.rock, { collide: true, ts: 3 });
      }
      box(8, 1.6, 15, X, y + 4.8, Z, M.rock, { ts: 3 }); box(8, 4.4, 1.6, X, y + 2.2, Z - 7.6, M.rock, { collide: true, ts: 3 });
      for (let i = 0; i < 8; i++) { const r = mulberry(950 + i); const side = i % 2 ? 1 : -1; box(1 + r() * 2, 1 + r() * 2.5, 1 + r() * 2, X + side * (4.5 + r() * 3), y + 1, Z + 8 + r() * 5, M.rock, { rx: r(), ry: r() * 3, collide: true }); }
      interiors.push({ minX: X - 2.4, maxX: X + 2.4, minZ: Z - 7, maxZ: Z + 7, name: 'cave' });
      anchors.caveMouth = [X, Z + 9]; anchors.caveBack = [X, Z - 5.5]; anchors.caveWall = [X - 2.2, Z - 2];
    }

    // ================= Watchtower on the hill =================
    {
      const X = L.tower.x, Z = L.tower.z, y = base.tower;
      geom(new THREE.CylinderGeometry(3.2, 3.9, 11, 20), X, y + 5.5, Z, M.plaster); addCollider(X - 3.8, X + 3.8, Z - 3.8, Z + 3.8);
      box(1.2, 2.1, 0.1, X, y + 1.05, Z + 3.85, M.door);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; box(0.7, 0.8, 0.45, X + Math.cos(a) * 3.2, y + 11.4, Z + Math.sin(a) * 3.2, M.plaster, { ry: -a }); }
      anchors.towerIn = [X, Z]; anchors.towerDoor = [X, Z + 5];
    }

    // ================= Abandoned petrol station =================
    {
      const y = base.station, X = L.station.x, Z = L.station.z;
      for (const [px, pz] of [[X - 6, Z + 4], [X + 6, Z + 4], [X - 6, Z + 12], [X + 6, Z + 12]]) { box(0.4, 4.6, 0.4, px, y + 2.3, pz, M.metal, { collide: true }); }
      box(16, 0.5, 12, X, y + 4.8, Z + 8, M.white);
      box(0.8, 1.6, 0.5, X - 2, y + 0.8, Z + 8, M.rust, { collide: true }); box(0.8, 1.6, 0.5, X + 2, y + 0.8, Z + 8, M.rust, { collide: true });
      house(X, Z - 6, y, 9, 6, 3.6, { mat: M.white, door: 's', noCren: true, name: 'stationShop' });
      box(0.3, 7, 0.3, X + 12, y + 3.5, Z + 16, M.metal); box(3.2, 2, 0.2, X + 12, y + 7.5, Z + 16, M.rust);
      anchors.cctv = [X - 3, Z - 7.6]; anchors.stationRadio = [X + 3, Z - 7.6]; anchors.stationPump = [X, Z + 8];
    }

    // ================= Desert camp =================
    {
      const y = base.camp, X = L.camp.x, Z = L.camp.z;
      [[X - 6, Z - 4], [X + 6, Z - 5], [X, Z + 6]].forEach(([tx, tz], i) => { geom(new THREE.ConeGeometry(2.6, 2.6, 4), tx, y + 1.3, tz, M.cloth, { ry: 0.6 + i }); addCollider(tx - 1.9, tx + 1.9, tz - 1.9, tz + 1.9); });
      geom(new THREE.CylinderGeometry(0.8, 0.9, 0.25, 12), X, y + 0.12, Z, M.stone);
      lamps.push({ x: X, y: y + 0.5, z: Z, glow: 0xff7a2a, size: 3, light: 1.6, flicker: true });
      anchors.nora = [X + 2, Z + 2]; anchors.campRecorder = [X + 40, Z + 22]; anchors.dune = [X + 40, Z + 22];
    }

    B.flush(scene);

    // ---- instanced palms ----
    const trunkG = new THREE.CylinderGeometry(0.17, 0.25, 1, 7, 4); trunkG.translate(0, 0.5, 0);
    const frondG = new THREE.PlaneGeometry(3.2, 0.9); frondG.translate(1.6, 0, 0); frondG.rotateX(Math.PI / 2);
    const trunks = new THREE.InstancedMesh(trunkG, M.wood, palms.length);
    let liveF = 0, deadF = 0; palms.forEach((p) => { if (p.dead) deadF += 6; else liveF += 13; });
    const fl = new THREE.InstancedMesh(frondG, M.frond, Math.max(1, liveF)), fd = new THREE.InstancedMesh(frondG, M.deadFrond, Math.max(1, deadF));
    let li = 0, di = 0; const o3 = new THREE.Object3D();
    palms.forEach((p, i) => {
      const r = mulberry(p.seed), gy = terrainH(p.x, p.z), lean = (r() - 0.5) * 0.25, yaw = r() * 6;
      o3.position.set(p.x, gy, p.z); o3.rotation.set(0, yaw, lean, 'XYZ'); o3.scale.set(1, p.h, 1); o3.updateMatrix(); trunks.setMatrixAt(i, o3.matrix);
      const top = new THREE.Vector3(0, p.h, 0).applyEuler(new THREE.Euler(0, yaw, lean, 'XYZ')).add(new THREE.Vector3(p.x, gy, p.z));
      const n = p.dead ? 6 : 13;
      for (let k = 0; k < n; k++) {
        o3.position.copy(top); o3.scale.set(1, 1, 1);
        o3.rotation.set(0, (k / n) * Math.PI * 2 + r() * 0.4, p.dead ? -0.9 - r() * 0.6 : -0.15 - r() * 0.6, 'YZX'); o3.updateMatrix();
        if (p.dead) fd.setMatrixAt(di++, o3.matrix); else fl.setMatrixAt(li++, o3.matrix);
      }
    });
    [trunks, fl, fd].forEach((m) => { m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; scene.add(m); });

    // ---- instanced rocks & shrubs on the plains and slopes ----
    {
      const R = mulberry(4242), rockG = new THREE.DodecahedronGeometry(1, 0), shrubG = new THREE.IcosahedronGeometry(0.6, 0);
      const nR = Q.tex >= 2 ? 520 : 300, nS = Q.tex >= 2 ? 420 : 240;
      const rk = new THREE.InstancedMesh(rockG, M.rock, nR), sh = new THREE.InstancedMesh(shrubG, M.shrub, nS);
      let ri = 0, si = 0;
      while (ri < nR || si < nS) {
        const x = (R() - 0.5) * 940, z = (R() - 0.5) * 940;
        if (roadInfo(x, z).d < 4) continue;
        let near = false; for (const k in L) { const l = L[k]; if (Math.hypot(x - l.x, z - l.z) < l.r + 8) { near = true; break; } } if (near) continue;
        const y = terrainH(x, z);
        if (ri < nR && R() < 0.55) { const s = 0.3 + R() * R() * 2.6; o3.position.set(x, y + s * 0.3, z); o3.rotation.set(R() * 3, R() * 3, R() * 3); o3.scale.set(s, s * (0.6 + R() * 0.5), s); o3.updateMatrix(); rk.setMatrixAt(ri++, o3.matrix); if (s > 1.4) addCollider(x - s * 0.7, x + s * 0.7, z - s * 0.7, z + s * 0.7); }
        else if (si < nS) { const s = 0.5 + R() * 0.9; o3.position.set(x, y + s * 0.3, z); o3.rotation.set(0, R() * 3, 0); o3.scale.set(s, s * 0.7, s); o3.updateMatrix(); sh.setMatrixAt(si++, o3.matrix); }
      }
      [rk, sh].forEach((m) => { m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; scene.add(m); });
    }

    // ---- lamp glows (sprites) + a few real point lights ----
    const glowTex = tex(64, (g, s) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
    lamps.forEach((l) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: l.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.position.set(l.x, l.y, l.z); sp.scale.set(l.size, l.size, 1); scene.add(sp); l.sprite = sp;
      if (l.light) { const pl = new THREE.PointLight(l.glow, l.light, 18, 2); pl.position.set(l.x, l.y - 0.3, l.z); scene.add(pl); l.point = pl; }
    });

    return { terrain, M, T };
  };

  // ---------------- characters ----------------
  /** Simple robed figure. kind: dishdasha | abaya | uniform | jacket | worker | mussar */
  OTD.makePerson = function (kind) {
    const M = OTD.M, g = new THREE.Group();
    const robe = { dishdasha: M.robeWhite, abaya: M.robeBlack, uniform: M.uniform, jacket: M.jacket, worker: M.robeGrey, mussar: M.robeWhite }[kind] || M.robeWhite;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.38, 12), robe); body.position.y = 0.69; g.add(body);
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.25, 12), robe); chest.position.y = 1.43; g.add(chest);
    [-1, 1].forEach((s) => { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.62, 8), robe); arm.position.set(s * 0.25, 1.22, 0); arm.rotation.z = s * 0.08; g.add(arm); });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), kind === 'abaya' ? M.robeBlack : M.skin); head.scale.set(1, 1.15, 1.05); head.position.y = 1.66; g.add(head);
    if (kind === 'abaya') { const scarf = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), M.robeBlack); scarf.position.y = 1.68; g.add(scarf); const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), M.skin); face.position.set(0, 1.65, 0.05); face.scale.set(0.85, 1.05, 0.7); g.add(face); }
    else if (kind === 'mussar') { const t = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.05, 8, 16), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 })); t.rotation.x = Math.PI / 2; t.position.y = 1.76; g.add(t); }
    else if (kind === 'uniform') { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.08, 14), M.uniform); cap.position.y = 1.79; g.add(cap); }
    else if (kind !== 'jacket' && kind !== 'worker') { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.118, 0.09, 16), M.kumma); k.position.y = 1.77; g.add(k); }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  };

  OTD.makeGhost = function () {
    const mat = OTD.M.ghost.clone(), g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 1.55, 12, 1, true), mat); body.position.y = 0.85; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat); head.position.y = 1.72; g.add(head);
    g.userData.mat = mat;
    return g;
  };

  /** Generic original 4x4 (no real brand likeness). */
  OTD.makeCar = function (color) {
    const M = OTD.M, g = new THREE.Group(), paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
    const body = new THREE.Mesh(boxGeo(1.9, 0.75, 4.5, 1), paint); body.position.y = 0.85; g.add(body);
    const cab = new THREE.Mesh(boxGeo(1.75, 0.7, 2.6, 1), paint); cab.position.set(0, 1.55, -0.25); g.add(cab);
    const glassF = new THREE.Mesh(boxGeo(1.6, 0.58, 0.05, 1), M.glass); glassF.position.set(0, 1.56, 1.06); glassF.rotation.x = -0.25; g.add(glassF);
    [-1, 1].forEach((s) => { const gs = new THREE.Mesh(boxGeo(0.05, 0.5, 2.3, 1), M.glass); gs.position.set(s * 0.89, 1.58, -0.25); g.add(gs); });
    const bumper = new THREE.Mesh(boxGeo(1.95, 0.25, 0.25, 1), M.plastic); bumper.position.set(0, 0.55, 2.3); g.add(bumper);
    const bumper2 = bumper.clone(); bumper2.position.z = -2.3; g.add(bumper2);
    const hl = new THREE.MeshBasicMaterial({ color: 0xfff2d8 }), tl = new THREE.MeshBasicMaterial({ color: 0x8a0d0d });
    [-0.7, 0.7].forEach((x) => { const h = new THREE.Mesh(boxGeo(0.35, 0.15, 0.05, 1), hl); h.position.set(x, 0.98, 2.26); g.add(h); const t = new THREE.Mesh(boxGeo(0.3, 0.18, 0.05, 1), tl); t.position.set(x, 1.0, -2.26); g.add(t); });
    const wheels = [];
    const wg = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 18); wg.rotateZ(Math.PI / 2);
    [[-0.92, 1.45], [0.92, 1.45], [-0.92, -1.45], [0.92, -1.45]].forEach(([x, z]) => { const w = new THREE.Mesh(wg, M.tire); w.position.set(x, 0.42, z); g.add(w); wheels.push(w); });
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.userData.wheels = wheels; g.userData.tail = tl;
    return g;
  };

  // ---------------- props for clues ----------------
  OTD.makeProp = function (kind) {
    const M = OTD.M, g = new THREE.Group();
    const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
    switch (kind) {
      case 'notebook': add(boxGeo(0.24, 0.035, 0.32, 1), M.paper, 0, 0.02); add(boxGeo(0.245, 0.01, 0.325, 1), new THREE.MeshStandardMaterial({ color: 0x2b3d5a }), 0, 0); break;
      case 'paper': add(boxGeo(0.22, 0.005, 0.3, 1), M.paper, 0, 0.01, 0, 0, 0.4); break;
      case 'photo': add(boxGeo(0.15, 0.005, 0.1, 1), new THREE.MeshStandardMaterial({ color: 0xb8a888 }), 0, 0.01); break;
      case 'recorder': add(boxGeo(0.07, 0.025, 0.14, 1), M.plastic, 0, 0.012); add(new THREE.SphereGeometry(0.008, 6, 6), M.red, 0.015, 0.03, -0.05); break;
      case 'phone': add(boxGeo(0.075, 0.01, 0.155, 1), M.plastic, 0, 0.006); add(boxGeo(0.068, 0.002, 0.145, 1), new THREE.MeshBasicMaterial({ color: 0x2a4a7a }), 0, 0.012); break;
      case 'pole': add(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 8), M.pole, 0, 1.05, 0, 0, 0, 0.32); break;
      case 'cap': add(new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a4a3a }), 0, 0); add(boxGeo(0.12, 0.01, 0.1, 1), new THREE.MeshStandardMaterial({ color: 0x3a4a3a }), 0, 0.005, 0.12); break;
      case 'rope': add(new THREE.TorusGeometry(0.22, 0.03, 6, 20), new THREE.MeshStandardMaterial({ color: 0x8a7350 }), 0, 0.03, 0, Math.PI / 2); break;
      case 'box': add(boxGeo(0.35, 0.18, 0.25, 1), M.rust, 0, 0.09); break;
      case 'register': add(boxGeo(0.3, 0.06, 0.42, 1), new THREE.MeshStandardMaterial({ color: 0x5a2a20 }), 0, 0.03); break;
      case 'cctv': add(boxGeo(0.4, 0.12, 0.3, 1), M.plastic, 0, 0.9); add(boxGeo(0.6, 0.9, 0.4, 1), M.wood, 0, 0.42); break;
      case 'lantern': add(new THREE.CylinderGeometry(0.08, 0.1, 0.25, 10), M.metal, 0, 0.13); add(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffc060 }), 0, 0.15); break;
      case 'ring': add(new THREE.TorusGeometry(0.02, 0.006, 8, 16), M.gold, 0, 0.02, 0, Math.PI / 2); break;
      case 'letter': add(boxGeo(0.2, 0.004, 0.11, 1), new THREE.MeshStandardMaterial({ color: 0xe8e0cc }), 0, 0.01); break;
      case 'radio': add(boxGeo(0.3, 0.18, 0.12, 1), new THREE.MeshStandardMaterial({ color: 0x4a3a2a }), 0, 0.09); break;
      case 'shovel': add(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), M.wood, 0, 0.05, 0, Math.PI / 2 - 0.05, 0.3); add(boxGeo(0.22, 0.02, 0.28, 1), M.metal, 0.4, 0.04, 0.55); break;
      case 'marker': add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), M.pole, 0, 0.25); break;
      case 'tracks': for (let i = 0; i < 6; i++) add(boxGeo(0.25, 0.005, 0.6, 1), M.foot, i % 2 ? 0.9 : -0.9, 0.01, i * 0.9 - 2.2); break;
      case 'footprints': for (let i = 0; i < 10; i++) { const f = add(new THREE.PlaneGeometry(0.16, 0.3), M.foot, (i % 2 ? 0.17 : -0.05), 0.015, -i * 0.72, -Math.PI / 2); f.castShadow = false; } break;
      case 'symbol': add(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0xd8c8a8, transparent: true, opacity: 0.55 }), 0, 1.4, 0, 0, Math.PI / 2); break;
      case 'map': add(new THREE.PlaneGeometry(1.2, 0.8), M.paper, 0, 1.6, 0); break;
      case 'hatch': add(boxGeo(1.2, 0.1, 1.2, 1), M.rust, 0, 0.05); add(boxGeo(0.12, 0.12, 0.05, 1), M.metal, 0, 0.12, 0.4); break;
      case 'tire': add(new THREE.TorusGeometry(0.36, 0.13, 8, 18), M.tire, 0, 0.13, 0, Math.PI / 2); break;
      default: add(boxGeo(0.2, 0.2, 0.2, 1), M.paper, 0, 0.1);
    }
    return g;
  };
})();
