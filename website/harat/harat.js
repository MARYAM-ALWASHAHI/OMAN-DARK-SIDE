/* OMAN: THE DARK SIDE — «حارة الرماد», walkable third-person investigation.
 * Character: Mixamo-animated human (three.js example "Xbot"), dressed in code as an Omani man
 * (white dishdasha + kumma). Quarter, textures and lighting are generated in code.
 * Clue texts, people and dialogue come from ../js/case1.js; progress is shared with the main game.
 */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s), C = window.CASE1, SND = window.SND;
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const fmt = (n) => n.toLocaleString('ar-OM');
  const KEY = 'otd-case1-v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const S = Object.assign({ clues: [], talked: {}, deductions: [], flags: {}, seen: {}, ended: false }, load() || {});
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } };
  const clueData = {}; Object.values(C.scenes).forEach((sc) => sc.clues.forEach((c) => { clueData[c.id] = c; }));
  clueData.receipt = { id: 'receipt', title: 'إيصال الساعة ٦:٤٠ مساءً', text: 'من محل سيف: بطاريات مصباح وماء. قال خلفان لسيف: «الليلة أكمل العدّ».' };
  const TOTAL = Object.keys(clueData).length;

  // ================= renderer =================
  const canvas = $('#c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isTouch ? 2 : 1.75));
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const FOG = 0x56677b; scene.background = new THREE.Color(FOG); scene.fog = new THREE.FogExp2(FOG, 0.038);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);

  // ================= procedural textures =================
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function tex(size, draw, rep = 1, srgb = true) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); if (srgb) t.encoding = THREE.sRGBEncoding; return t; }
  function normalOf(t, k) { const src = t.image, w = src.width, c = document.createElement('canvas'); c.width = c.height = w; const g = c.getContext('2d'); g.drawImage(src, 0, 0); const d = g.getImageData(0, 0, w, w).data, out = g.createImageData(w, w), o = out.data, L = new Float32Array(w * w); for (let i = 0; i < w * w; i++) L[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 765; const at = (x, y) => L[((y + w) % w) * w + ((x + w) % w)]; for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { const dx = at(x + 1, y) - at(x - 1, y), dy = at(x, y + 1) - at(x, y - 1); let nx = -dx * k, ny = -dy * k; const l = Math.hypot(nx, ny, 1); const i = (y * w + x) * 4; o[i] = (nx / l * 0.5 + 0.5) * 255; o[i + 1] = (ny / l * 0.5 + 0.5) * 255; o[i + 2] = (1 / l * 0.5 + 0.5) * 255; o[i + 3] = 255; } g.putImageData(out, 0, 0); const n = new THREE.CanvasTexture(c); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.copy(t.repeat); return n; }
  const speck = (g, s, r, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(255,245,230,${r() * a})` : `rgba(0,0,0,${r() * a * 1.4})`; const z = r() * 2.4 + 0.5; g.fillRect(r() * s, r() * s, z, z); } };
  // dry-stacked stone with moss (like the mountain village reference)
  const stoneT = tex(512, (g, s) => { const r = rng(3); g.fillStyle = '#3c3b36'; g.fillRect(0, 0, s, s); let y = 0; while (y < s) { const h = 22 + r() * 26; let x = -r() * 40; while (x < s) { const w = 34 + r() * 60, v = 70 + r() * 50; g.fillStyle = `rgb(${v},${v * 0.96},${v * 0.88})`; g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + w - 2, y + 2 + r() * 4); g.lineTo(x + w - 4, y + h - 2); g.lineTo(x + 2, y + h - 3 - r() * 3); g.closePath(); g.fill(); if (r() < 0.25) { g.fillStyle = `rgba(${60 + r() * 30},${90 + r() * 40},${40},0.45)`; g.fillRect(x + 4, y + h * 0.55, w * 0.7, h * 0.4); } x += w; } y += h; } speck(g, s, r, 12000, 0.2); });
  const stoneN = normalOf(stoneT, 3);
  const plasterT = tex(512, (g, s) => { const r = rng(7); g.fillStyle = '#8b765e'; g.fillRect(0, 0, s, s); for (let i = 0; i < 50; i++) { const x = r() * s, y = r() * s, rad = 20 + r() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${r() < 0.5 ? '170,140,105' : '60,48,36'},${r() * 0.35})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); } speck(g, s, r, 14000, 0.16); g.strokeStyle = 'rgba(30,20,12,0.5)'; for (let i = 0; i < 16; i++) { let x = r() * s, y = r() * s; g.lineWidth = r() + 0.4; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 12; k++) { x += (r() - 0.5) * 16; y += 8 + r() * 8; g.lineTo(x, y); } g.stroke(); } });
  const plasterN = normalOf(plasterT, 2);
  const flagT = tex(512, (g, s) => { const r = rng(11); g.fillStyle = '#1e1f21'; g.fillRect(0, 0, s, s); for (let i = 0; i < 70; i++) { const x = r() * s, y = r() * s, w = 40 + r() * 70, h = 30 + r() * 50, v = 55 + r() * 45; g.fillStyle = `rgb(${v},${v},${v * 0.95})`; g.beginPath(); g.ellipse(x, y, w / 2, h / 2, r() * 3, 0, 7); g.fill(); } speck(g, s, r, 9000, 0.2); }, 1);
  const flagN = normalOf(flagT, 3);
  const dirtT = tex(512, (g, s) => { const r = rng(13); g.fillStyle = '#4e4436'; g.fillRect(0, 0, s, s); speck(g, s, r, 26000, 0.22); for (let i = 0; i < 400; i++) { const v = 70 + r() * 60; g.fillStyle = `rgb(${v},${v * 0.9},${v * 0.78})`; g.beginPath(); g.ellipse(r() * s, r() * s, 2 + r() * 4, 2 + r() * 3, r() * 3, 0, 7); g.fill(); } }, 1);
  const dirtN = normalOf(dirtT, 2.5);
  const woodT = tex(256, (g, s) => { const r = rng(17); g.fillStyle = '#3d2a1b'; g.fillRect(0, 0, s, s); for (let x = 0; x < s; x += 2) { g.fillStyle = `rgba(${r() < 0.5 ? '110,80,52' : '15,8,4'},${r() * 0.4})`; g.fillRect(x, 0, 1 + r() * 2, s); } });
  const doorT = tex(256, (g, s) => { g.fillStyle = '#2e5450'; g.fillRect(0, 0, s, s); for (let x = 0; x < s; x += 32) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 2, s); } g.strokeStyle = 'rgba(15,25,22,0.7)'; g.lineWidth = 4; [[24, 24], [136, 24], [24, 136], [136, 136]].forEach(([x, y]) => g.strokeRect(x, y, 96, 96)); g.fillStyle = 'rgba(210,195,160,0.6)'; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { g.beginPath(); g.arc(20 + i * 43, 20 + j * 43, 3, 0, 7); g.fill(); } speck(g, s, rng(5), 3000, 0.25); });
  const kummaT = tex(256, (g, s) => { g.fillStyle = '#ece6d6'; g.fillRect(0, 0, s, s); g.strokeStyle = '#8a6f4a'; g.lineWidth = 2; for (let x = 0; x < s; x += 22) { g.beginPath(); g.moveTo(x, 40); for (let k = 0; k < 8; k++) g.lineTo(x + (k % 2 ? 11 : 0), 40 + k * 22); g.stroke(); } g.fillStyle = '#5a7a6a'; for (let x = 6; x < s; x += 22) for (let y = 50; y < 210; y += 22) g.fillRect(x, y, 3, 3); });
  const frondT = tex(256, (g, s) => { g.clearRect(0, 0, s, s); g.strokeStyle = '#2f3820'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, s / 2); g.lineTo(s - 4, s / 2); g.stroke(); const r = rng(19); for (let x = 14; x < s - 8; x += 4) { const l = 52 * Math.sin((x / s) * Math.PI) + 6; g.strokeStyle = `rgb(${42 + r() * 25},${54 + r() * 25},28)`; g.lineWidth = 2; g.beginPath(); g.moveTo(x, s / 2); g.lineTo(x + 14, s / 2 - l); g.moveTo(x, s / 2); g.lineTo(x + 14, s / 2 + l); g.stroke(); } });

  const MAT = {
    stone: new THREE.MeshStandardMaterial({ map: stoneT, normalMap: stoneN, normalScale: new THREE.Vector2(1.3, 1.3), roughness: 0.9 }),
    plaster: new THREE.MeshStandardMaterial({ map: plasterT, normalMap: plasterN, roughness: 0.95 }),
    flag: new THREE.MeshStandardMaterial({ map: flagT, normalMap: flagN, roughness: 0.32, metalness: 0.05, color: 0xe4e8ef }),
    dirt: new THREE.MeshStandardMaterial({ map: dirtT, normalMap: dirtN, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ map: woodT, roughness: 0.85 }),
    door: new THREE.MeshStandardMaterial({ map: doorT, roughness: 0.8 }),
    dark: new THREE.MeshBasicMaterial({ color: 0x080706 }),
    lit: new THREE.MeshBasicMaterial({ color: 0xffb35e }),
    water: new THREE.MeshStandardMaterial({ color: 0x1b2a33, roughness: 0.05, metalness: 0.6 }),
    frond: new THREE.MeshStandardMaterial({ map: frondT, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x55595e, roughness: 0.5, metalness: 0.6 }),
  };
  dirtT.repeat.set(60, 60); dirtN.repeat.set(60, 60);

  // ================= geometry helpers =================
  const colliders = [], interiors = [];
  const addCol = (x0, x1, z0, z1, h = 9) => colliders.push({ x0, x1, z0, z1, h });
  function blocked(x, z, r = 0.3, y = 1) { for (const c of colliders) if (!c.off && y < c.h && x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return c; return null; }
  function uvBox(w, h, d, ts) { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / ts + f * 0.31, uv.getY(k) * dims[f][1] / ts); } return g; }
  const parts = new Map();
  function box(w, h, d, x, y, z, mat, o = {}) {
    const g = uvBox(w, h, d, o.ts || 2.5); const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0)), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m); const ng = g.toNonIndexed(); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(ng);
    if (o.col) addCol(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y + h / 2);
  }
  function flush() {
    parts.forEach((list, mat) => {
      let n = 0; list.forEach((g) => { n += g.attributes.position.count; });
      const p = new Float32Array(n * 3), nr = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
      list.forEach((g) => { p.set(g.attributes.position.array, o * 3); nr.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; });
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(p, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nr, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); bg.computeBoundingSphere();
      const m = new THREE.Mesh(bg, mat); m.castShadow = !mat.isMeshBasicMaterial; m.receiveShadow = true; scene.add(m);
    });
    parts.clear();
  }
  /** House along a lane. side: +1 = door faces +x, -1 = door faces -x. */
  function house(cx, cz, w, d, h, o = {}) {
    const t = 0.5, mat = o.mat || MAT.stone, x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, R = rng(Math.floor(cx * 31 + cz * 7 + 99));
    const wallZ = (z, hh) => box(w, hh, t, cx, hh / 2, z, mat, { col: true });
    wallZ(z0, h * (o.ruin ? 0.6 + R() * 0.3 : 1)); wallZ(z1, h * (o.ruin ? 0.5 + R() * 0.4 : 1));
    const doorX = o.side > 0 ? x1 : x0, backX = o.side > 0 ? x0 : x1, dw = 1.2, dh = 2.2;
    box(t, h * (o.ruin ? 0.7 : 1), d, backX, h * (o.ruin ? 0.35 : 0.5), cz, mat, { col: true });
    const a = (d - dw) / 2; box(t, h, a, doorX, h / 2, z0 + a / 2, mat, { col: true }); box(t, h, a, doorX, h / 2, z1 - a / 2, mat, { col: true });
    box(t, h - dh, dw, doorX, dh + (h - dh) / 2, cz, mat);
    if (o.closed) { box(0.1, dh, dw, doorX + o.side * 0.06, dh / 2, cz, MAT.door, { col: true }); }
    else if (o.door !== false) { box(0.08, dh, dw, doorX + o.side * 0.45, dh / 2, cz - dw * 0.4, MAT.door, { ry: o.side * 1.1 }); }
    // windows (some lit) and crenellation
    [z0 + d * 0.25, z0 + d * 0.75].forEach((wz) => box(0.06, 0.8, 0.6, doorX + o.side * 0.27, h * 0.62, wz, R() < (o.lit || 0) ? MAT.lit : MAT.dark));
    if (!o.ruin) for (let p = 0.3; p < w; p += 0.9) { box(0.45, 0.4, t, x0 + p, h + 0.2, z0, mat); box(0.45, 0.4, t, x0 + p, h + 0.2, z1, mat); }
    if (o.roof) { box(w, 0.25, d, cx, h, cz, MAT.plaster); for (let bz = z0 + 0.6; bz < z1; bz += 0.7) box(w + 0.3, 0.12, 0.12, cx, h - 0.2, bz, MAT.wood); }
    interiors.push({ x0, x1, z0, z1 });
    box(w - t, 0.03, d - t, cx, 0.02, cz, MAT.plaster, { ts: 3 });
    return { x0, x1, z0, z1, doorX, cz };
  }

  // ================= the quarter =================
  // ground and the stone lane
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), MAT.dirt); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  box(4.6, 0.06, 96, 0, 0.03, -2, MAT.flag, { ts: 1.6 });                       // main lane (north-south)
  box(30, 0.06, 3.4, 17, 0.03, 0, MAT.flag, { ts: 1.6 });                       // east alley
  box(26, 0.06, 3.2, -15, 0.03, -20, MAT.flag, { ts: 1.6 });                    // west alley
  // falaj along the lane (west side), with a thin sheet of water
  for (let z = 44; z > 14; z -= 4) { box(0.22, 0.5, 4, -2.75, 0.25, z - 2, MAT.stone, { col: true, ts: 1.5 }); box(0.22, 0.5, 4, -3.45, 0.25, z - 2, MAT.stone, { col: true, ts: 1.5 }); }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 36), MAT.water); water.rotation.x = -Math.PI / 2; water.position.set(-3.1, 0.12, 29); water.scale.y = 30 / 36; scene.add(water);
  // gate
  box(1.3, 4.6, 1.3, -3.4, 2.3, 44, MAT.stone, { col: true }); box(1.3, 4.6, 1.3, 3.4, 2.3, 44, MAT.stone, { col: true }); box(8.1, 1, 1.3, 0, 4.9, 44, MAT.stone);
  // west row (doors face +x), east row (doors face -x)
  const H = {};
  H.w1 = house(-7.5, 34, 9, 9, 5.5, { side: 1, lit: 0.6, closed: true });
  H.w2 = house(-7.5, 22, 9, 10, 6.2, { side: 1, ruin: true });
  H.blue = house(-7.5, 8, 9, 10, 6.4, { side: 1, roof: true });                 // notebook
  H.w4 = house(-7.5, -6, 9, 10, 5.2, { side: 1, ruin: true });
  H.w5 = house(-7.5, -33, 9, 10, 5.8, { side: 1, ruin: true });
  H.e1 = house(7.5, 34, 9, 9, 5.2, { side: -1, lit: 0.6, closed: true });       // Saif's shop front
  H.voice = house(7.5, 18, 9, 10, 6.6, { side: -1, roof: true });                // recorder
  H.e3 = house(7.5, -12, 9, 10, 5.4, { side: -1, ruin: true });
  H.clinic = house(22, 7, 12, 8, 4.2, { side: -1, mat: MAT.plaster, roof: true }); // old clinic on the east alley
  box(0.5, 4.6, 8, -5, 2.3, -44, MAT.plaster, { col: true }); box(0.5, 4.6, 8, 5, 2.3, -44, MAT.plaster, { col: true }); box(10.5, 4.6, 0.5, 0, 2.3, -48, MAT.plaster, { col: true });
  box(10.5, 0.25, 8.5, 0, 4.7, -44, MAT.plaster); for (let p = 0.3; p < 10; p += 0.9) box(0.45, 0.4, 0.5, -5 + p, 5.05, -40, MAT.plaster); box(9.5, 0.03, 7.5, 0, 0.02, -44, MAT.plaster, { ts: 3 });
  interiors.push({ x0: -5, x1: 5, z0: -48, z1: -40 }); // the eighth house closes the lane
  // the eighth house front faces the lane: rebuild its door wall facing +z
  // bench in the voice house, register desk in the clinic
  box(0.7, 0.5, 4, H.voice.x1 - 0.85, 0.25, 18, MAT.plaster, { col: true });
  box(2.2, 0.8, 0.8, 26, 0.4, 5.2, MAT.wood, { col: true });
  // well square on the east alley
  const well = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.85, 20, 1, true), MAT.stone); well.position.set(31, 0.42, 0); well.castShadow = true; scene.add(well); addCol(29.7, 32.3, -1.3, 1.3, 1);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.15, 20), MAT.dark); hole.rotation.x = -Math.PI / 2; hole.position.set(31, 0.05, 0); scene.add(hole);
  box(0.14, 2.4, 0.14, 29.9, 1.2, 0, MAT.wood); box(0.14, 2.4, 0.14, 32.1, 1.2, 0, MAT.wood); box(2.5, 0.14, 0.14, 31, 2.35, 0, MAT.wood);
  // watchtower beyond the eighth house
  const tw = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.6, 14, 24), MAT.stone); tw.position.set(-14, 7, -48); tw.castShadow = tw.receiveShadow = true; scene.add(tw); addCol(-17.6, -10.4, -51.6, -44.4, 14);
  // souq stall at the gate (Saif)
  box(3.2, 0.9, 0.8, 2.3, 0.45, 37.5, MAT.wood, { col: true }); box(3.6, 0.06, 2, 2.6, 2.5, 37.6, new THREE.MeshStandardMaterial({ color: 0x6b2f2a, roughness: 1, side: THREE.DoubleSide }), { rz: -0.15 });
  // bounds (invisible walls)
  addCol(-60, -12.2, -70, 70); addCol(12.2, 60, 12, 70); addCol(12.2, 60, -70, -2); addCol(36, 60, -70, 70); addCol(-60, 60, -70, -49); addCol(-60, 60, 64, 70);
  addCol(-60, -28, -70, 70);
  flush();

  // instanced palms outside the walls
  {
    const R = rng(23), pts = [];
    for (let i = 0; i < 60; i++) { const x = (R() < 0.5 ? -1 : 1) * (14 + R() * 30), z = -40 + R() * 100; if (Math.abs(x) < 13) continue; pts.push([x, z, 5 + R() * 4, R() * 6]); }
    for (let i = 0; i < 12; i++) pts.push([(R() < 0.5 ? -1 : 1) * (8 + R() * 6), 50 + R() * 12, 5 + R() * 4, R() * 6]);
    const tg = new THREE.CylinderGeometry(0.16, 0.24, 1, 7); tg.translate(0, 0.5, 0);
    const fg = new THREE.PlaneGeometry(3.2, 0.9); fg.translate(1.6, 0, 0); fg.rotateX(Math.PI / 2);
    const tr = new THREE.InstancedMesh(tg, MAT.wood, pts.length), fr = new THREE.InstancedMesh(fg, MAT.frond, pts.length * 12);
    const o = new THREE.Object3D(); let k = 0;
    pts.forEach(([x, z, h, yaw], i) => { o.position.set(x, 0, z); o.rotation.set(0, yaw, 0); o.scale.set(1, h, 1); o.updateMatrix(); tr.setMatrixAt(i, o.matrix); for (let j = 0; j < 12; j++) { o.position.set(x, h, z); o.scale.set(1, 1, 1); o.rotation.set(0, (j / 12) * Math.PI * 2 + yaw, -0.2 - (j % 3) * 0.25, 'YZX'); o.updateMatrix(); fr.setMatrixAt(k++, o.matrix); } });
    [tr, fr].forEach((m) => { m.castShadow = m.receiveShadow = true; scene.add(m); });
  }

  // ================= lights =================
  scene.add(new THREE.HemisphereLight(0xb5c7dc, 0x4a3d30, 1.0));
  const sun = new THREE.DirectionalLight(0xc9d6ea, 0.55); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006;
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 }); scene.add(sun, sun.target);
  const lamps = [[2.4, 3.6, 30], [-2.4, 3.6, 2], [9, 3.4, -1.6]];
  lamps.forEach(([x, y, z]) => { const p = new THREE.PointLight(0xffb066, 1.3, 16, 2); p.position.set(x, y, z); scene.add(p); const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd39a })); b.position.copy(p.position); scene.add(b); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, y, 6), MAT.metal); pole.position.set(x + Math.sign(x || 1) * 0.3, y / 2, z); scene.add(pole); });
  const torch = new THREE.SpotLight(0xffe2b8, 0, 22, 0.55, 0.6, 1.5); torch.castShadow = true; torch.shadow.mapSize.set(1024, 1024);
  scene.add(torch, torch.target);

  // ================= clues in the world =================
  const PLACE = {
    calendar: [-3.4, 1.5, 43.32, 'paper', 'z'], charger: [-1.6, 0.05, 40.2, 'battery'], flyer: [2.72, 1.6, 36, 'paper', 'x'],
    tracks: [-1.5, 0.04, 55, 'tracks'], rope: [-2.6, 0.05, 59, 'rope'], list: [2.0, 0.05, 56.6, 'paper'],
    footprints: [-1.7, 0.04, 26, 'footprints'], wrapper: [-1.8, 0.05, 16, 'battery'], pole: [3.3, 1.1, 27.5, 'pole'], marks: [-2.72, 1.5, -2, 'marks'],
    notebook: [-9.5, 0.06, 6.5, 'notebook'], recorder: [H.voice.x1 - 0.85, 0.52, 19, 'recorder'], register: [26, 0.82, 5.2, 'register'], phone: [18.5, 0.05, 9.6, 'phone'],
    map85: [-5.0, 1.27, 48.5, 'paper'], shovel: [27.5, 0.6, -2.6, 'shovel'], invoice: [24.0, 1.27, -3.9, 'paper'], cap: [31, 0.88, 1.15, 'cap'], lock: [0.4, 1.15, -39.88, 'lock'],
  };
  const items = [];
  const glintTex = tex(64, (g, s) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,245,215,1)'); gr.addColorStop(0.2, 'rgba(255,220,160,0.6)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }, 1, false);
  function prop(kind) {
    const g = new THREE.Group(), add = (geo, col, y = 0, o = {}) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: o.r || 0.8, metalness: o.m || 0 })); m.position.y = y; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; m.castShadow = true; g.add(m); return m; };
    switch (kind) {
      case 'paper': add(new THREE.BoxGeometry(0.22, 0.005, 0.3), 0xe6dcc6, 0.003); break;
      case 'battery': add(new THREE.BoxGeometry(0.12, 0.05, 0.05), 0xc9a32a, 0.025); break;
      case 'tracks': for (let i = 0; i < 8; i++) { const m = add(new THREE.BoxGeometry(0.3, 0.01, 0.5), 0x2a2018, 0.006); m.position.set(i % 2 ? 0.9 : -0.9, 0.006, i * 0.7 - 2.5); } break;
      case 'rope': for (let i = 0; i < 3; i++) add(new THREE.TorusGeometry(0.18 - i * 0.03, 0.022, 6, 18), 0xb39662, 0.03 + i * 0.02, { rx: Math.PI / 2 }); break;
      case 'footprints': for (let i = 0; i < 10; i++) { const m = add(new THREE.BoxGeometry(0.11, 0.005, 0.26), 0x241a10, 0.004); m.position.set(i % 2 ? 0.14 : -0.04, 0.004, -i * 0.7); } break;
      case 'pole': for (let i = 0; i < 8; i++) { const m = add(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8), i % 2 ? 0xe8e2d4 : 0xd35a1e, 0, {}); m.position.y = -1 + i * 0.28; } g.rotation.z = 0.3; break;
      case 'marks': for (let i = 0; i < 8; i++) { const m = add(new THREE.BoxGeometry(0.015, 0.4, 0.03), i === 7 ? 0xc06040 : 0xd8c8a8, 0); m.position.z = -0.35 + i * 0.1; } break;
      case 'notebook': add(new THREE.BoxGeometry(0.24, 0.03, 0.32), 0x26364f, 0.015); add(new THREE.BoxGeometry(0.22, 0.032, 0.3), 0xd8ceb6, 0.017); break;
      case 'recorder': add(new THREE.BoxGeometry(0.07, 0.025, 0.14), 0x1a1c1f, 0.012); { const l = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2a1a })); l.position.set(0.015, 0.03, -0.05); g.add(l); } break;
      case 'register': add(new THREE.BoxGeometry(0.3, 0.06, 0.42), 0x5a2a20, 0.03); break;
      case 'phone': add(new THREE.BoxGeometry(0.075, 0.01, 0.155), 0x111111, 0.006); { const sc = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.002, 0.14), new THREE.MeshBasicMaterial({ color: 0x3a6ab0 })); sc.position.y = 0.012; g.add(sc); } break;
      case 'shovel': add(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), 0x4a3523, 0, { rz: 0.35 }); { const b = add(new THREE.BoxGeometry(0.24, 0.3, 0.02), 0x7a2c18, -0.6); b.position.x = 0.21; } break;
      case 'cap': add(new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x3c4c3c, 0); break;
      case 'lock': add(new THREE.BoxGeometry(0.1, 0.1, 0.05), 0xd0d0d0, 0, { m: 0.9, r: 0.3 }); add(new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI), 0xd0d0d0, 0.05, { m: 0.9, r: 0.3 }); break;
      default: add(new THREE.BoxGeometry(0.2, 0.2, 0.2), 0xdddddd, 0.1);
    }
    return g;
  }
  Object.entries(PLACE).forEach(([id, [x, y, z, kind, onWall]]) => {
    if (!clueData[id]) return;
    const o = prop(kind); o.position.set(x, y, z); if (onWall === 'z') o.rotation.x = Math.PI / 2; if (onWall === 'x') o.rotation.z = Math.PI / 2; scene.add(o);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, color: 0xffe0a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); gl.position.set(x, y + 0.25, z); gl.scale.set(0.5, 0.5, 1); scene.add(gl);
    const it = { id, obj: o, glint: gl, x, z, y }; items.push(it);
    if (S.clues.includes(id)) { o.visible = false; gl.visible = false; it.taken = true; }
  });
  // static vehicles: Khalfan's car outside the gate, Nasser's car, Juma's pickup
  function car(color, x, z, yaw) { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 }); const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 4.6), m); b.position.y = 0.85; g.add(b); const cab = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.7, 2.5), m); cab.position.set(0, 1.6, -0.3); g.add(cab); const gl = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.5, 2.3), new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.1, metalness: 0.6 })); gl.position.set(0, 1.65, -0.3); g.add(gl); [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]].forEach(([wx, wz]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.42, wz); g.add(w); }); g.traverse((k) => { if (k.isMesh) { k.castShadow = k.receiveShadow = true; } }); g.position.set(x, 0, z); g.rotation.y = yaw; scene.add(g); const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw)), hw = (1.9 * c + 4.6 * s) / 2, hd = (1.9 * s + 4.6 * c) / 2; addCol(x - hw, x + hw, z - hd, z + hd, 2); return g; }
  car(0x9aa0a6, 4.2, 58, 0.3); car(0x1d2a3c, -6.8, 48.5, Math.PI / 2); car(0xe3e0d8, 25, -4.6, Math.PI / 2);

  // ================= characters (Mixamo Xbot, dressed in code) =================
  const loader = new THREE.GLTFLoader(); let base = null, mixers = [];
  const people = {}; let player = null;
  function bone(root, name) { let b = null; root.traverse((o) => { if (!b && o.isBone && o.name.endsWith(name)) b = o; }); return b; }
  function attach(root, boneName, mesh, pos) { const b = bone(root, boneName); if (!b) return; root.updateMatrixWorld(true); const ws = new THREE.Vector3(); b.getWorldScale(ws); mesh.scale.multiplyScalar(1 / ws.x); mesh.position.copy(pos).multiplyScalar(1 / ws.x); b.add(mesh); }
  const skinM = new THREE.MeshStandardMaterial({ color: 0x6e4630, roughness: 0.6 });
  function dress(root, kind) {
    const look = { dishdasha: [0xece8df, 'kumma'], elder: [0xe4dfd3, 'mussar'], abaya: [0x111114, 'scarf'], uniform: [0x1d2836, 'cap'], grey: [0x8d9096, 'kumma'], worker: [0x4b5560, 'hard'] }[kind];
    const cloth = new THREE.MeshStandardMaterial({ color: look[0], roughness: 0.82, skinning: true });
    root.traverse((o) => { if (o.isSkinnedMesh) { o.material = cloth; o.castShadow = true; o.receiveShadow = true; } });
    const robeLen = kind === 'abaya' ? 1.0 : 0.92;
    if (kind !== 'uniform' && kind !== 'worker') { const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.17, kind === 'abaya' ? 0.34 : 0.3, robeLen, 18, 1, true), new THREE.MeshStandardMaterial({ color: look[0], roughness: 0.82, side: THREE.DoubleSide })); robe.castShadow = true; attach(root, 'Hips', robe, new THREE.Vector3(0, -robeLen / 2 + 0.06, 0)); }
    // head: skin, hair, and headwear
    const headSkin = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 14), kind === 'abaya' ? new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.7 }) : skinM); headSkin.scale.set(1.25, 1.36, 1.3); attach(root, 'Head', headSkin, new THREE.Vector3(0, 0.1, 0.02));
    if (kind !== 'abaya') { const hair = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), new THREE.MeshStandardMaterial({ color: 0x15110e, roughness: 0.9 })); hair.scale.set(1.28, 1.02, 1.2); attach(root, 'Head', hair, new THREE.Vector3(0, 0.085, -0.02)); }
    if (look[1] === 'kumma') { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.132, 0.1, 28), new THREE.MeshStandardMaterial({ map: kummaT, roughness: 0.8 })); attach(root, 'Head', k, new THREE.Vector3(0, 0.205, 0.0)); const top = new THREE.Mesh(new THREE.CircleGeometry(0.128, 28), new THREE.MeshStandardMaterial({ color: 0xe9e3d3 })); top.rotation.x = -Math.PI / 2; attach(root, 'Head', top, new THREE.Vector3(0, 0.256, 0.0)); }
    else if (look[1] === 'mussar') { const m = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.045, 10, 20), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 })); m.rotation.x = Math.PI / 2; attach(root, 'Head', m, new THREE.Vector3(0, 0.19, 0.005)); }
    else if (look[1] === 'cap') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.11, 0.07, 20), new THREE.MeshStandardMaterial({ color: 0x16202c })); attach(root, 'Head', c, new THREE.Vector3(0, 0.2, 0.01)); }
    else if (look[1] === 'scarf') { const f = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), skinM); f.scale.set(1, 1.2, 0.6); attach(root, 'Head', f, new THREE.Vector3(0, 0.09, 0.07)); }
    else if (look[1] === 'hard') { const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe8b020 })); attach(root, 'Head', h, new THREE.Vector3(0, 0.15, 0.01)); const v = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.26), new THREE.MeshStandardMaterial({ color: 0xf26b1d, roughness: 0.6 })); attach(root, 'Spine2', v, new THREE.Vector3(0, 0.02, 0)); }
    ['LeftHand', 'RightHand'].forEach((h) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), kind === 'abaya' ? skinM : skinM); attach(root, h, s, new THREE.Vector3(0, 0.05, 0)); });
  }
  function spawn(kind, x, z, yaw) {
    const root = THREE.SkeletonUtils.clone(base.scene); scene.add(root); root.position.set(x, 0, z); root.rotation.y = yaw;
    dress(root, kind);
    const mixer = new THREE.AnimationMixer(root), A = {}; base.animations.forEach((c) => { A[c.name] = mixer.clipAction(c); });
    A.idle.play(); mixers.push(mixer);
    return { root, mixer, A, cur: 'idle' };
  }
  function setAnim(ch, name, fade = 0.25) { if (ch.cur === name) return; const a = ch.A[name], b = ch.A[ch.cur]; a.reset().setEffectiveWeight(1).play(); b.crossFadeTo(a, fade, false); ch.cur = name; }

  const NPC = {
    maryam: { kind: 'abaya', at: [-1.5, 39.5], yaw: Math.PI },
    saif: { kind: 'dishdasha', at: [2.3, 38.6], yaw: Math.PI },
    nasser: { kind: 'uniform', at: [-3.4, 47.4], yaw: Math.PI / 2 },
    juma: { kind: 'grey', at: [27.5, -0.5], yaw: -Math.PI / 2 },
    khalfan: { kind: 'worker', at: [0.3, -41.6], yaw: 0, hidden: true },
  };

  // ================= HUD / UI =================
  let subT = 0;
  function sub(who, text, sec = 3.5) { const el = $('#sub'); el.textContent = ''; if (who) { const b = document.createElement('b'); b.textContent = who + ': '; el.append(b); } el.append(text); el.hidden = false; clearTimeout(subT); subT = setTimeout(() => { el.hidden = true; }, sec * 1000); }
  function objective() {
    if (S.ended) return 'انتهت القضية. شكراً لك.';
    if (!S.talked.maryam) return 'تحدّث مع مريم عند بوابة الحارة.';
    if (S.clues.includes('lock') && S.clues.length >= 15) return 'افتح البيت الثامن في آخر الحارة.';
    return `ابحث عن الأدلة في الحارة: ${fmt(S.clues.length)} من ${fmt(TOTAL)}`;
  }
  function hud() { $('#obj').textContent = objective(); $('#count').textContent = `${fmt(S.clues.length)}/${fmt(TOTAL)}`; }
  function card(c) { const el = $('#card'); el.querySelector('h3').textContent = c.title; el.querySelector('p').textContent = c.text; el.querySelector('small').textContent = `دليل ${fmt(S.clues.length)} من ${fmt(TOTAL)}`; el.hidden = false; paused = true; }
  $('#card button').addEventListener('click', () => { $('#card').hidden = true; paused = false; hud(); if (pendingPlay) { const p = pendingPlay; pendingPlay = null; playLines(p); } });
  let pendingPlay = null;
  function playLines(lines, done) { let i = 0; (function n() { if (i >= lines.length) { done && setTimeout(done, 300); return; } const [w, t] = lines[i++], s = Math.max(2.6, t.length / 13); sub(w, t, s); setTimeout(n, s * 1000 + 250); })(); }
  function talk(id, after) {
    const T = C.talks[id], P = C.people[id], first = !S.talked[id], d = $('#dlg'); paused = true;
    d.querySelector('.who b').textContent = P.name; d.querySelector('.who span').textContent = P.role;
    const pic = d.querySelector('.pic'); pic.style.backgroundImage = P.portrait ? `url(../assets/cast/${P.portrait}.jpg)` : ''; pic.textContent = P.portrait ? '' : P.name.slice(0, 1);
    let q = (first ? T.first : T.again).slice(); d.hidden = false;
    const line = d.querySelector('.line');
    function next() {
      if (q.length) { const [w, t] = q.shift(); line.textContent = ''; const b = document.createElement('b'); b.textContent = w + ': '; line.append(b, t); SND.page(); return; }
      d.hidden = true; paused = false;
      if (first) { S.talked[id] = true; save(); if (T.gives && !S.clues.includes(T.gives)) collect(T.gives); }
      hud(); if (after) after();
    }
    d.querySelector('.next').onclick = next; next();
  }
  function collect(id) {
    if (S.clues.includes(id)) return; S.clues.push(id); save(); SND.clue();
    const it = items.find((x) => x.id === id); if (it) { it.taken = true; it.obj.visible = false; it.glint.visible = false; }
    const c = clueData[id]; if (c.play) pendingPlay = c.play; card(c);
    if (id === 'cap') setTimeout(() => { ['واحد…', 'اثنين…', 'ثلاثة…', 'أربعة…', 'خمسة…', 'ستة…', 'سبعة…', '…ثمانية'].forEach((w, i) => setTimeout(() => { sub('', 'صوت من البئر يعدّ: ' + w, 1.2); SND.whisper(0, 2); }, i * 1100)); }, 600);
  }
  // accusation at the eighth house
  function accuse() {
    paused = true; const el = $('#acc'); el.hidden = false; const box = el.querySelector('.opts'); box.innerHTML = '';
    C.accusation.suspects.forEach((s) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = s.name; b.addEventListener('click', () => {
      if (s.id === C.accusation.answer) { el.hidden = true; S.flags.solved = true; save(); SND.solve(); openEighth(); }
      else { SND.wrong(); el.querySelector('.why').textContent = 'الأدلة لا تدعم هذا. فكّر: من صاحب الشاحنة والمجرفة والفاتورة؟'; }
    }); box.append(b); });
    el.querySelector('.why').textContent = 'من المسؤول عن اختفاء خلفان؟';
  }
  $('#acc .close').addEventListener('click', () => { $('#acc').hidden = true; paused = false; });
  function openEighth() {
    eighthDoorCol.off = true; eighthDoor.visible = false; const k = people.khalfan; k.root.visible = true; paused = false;
    sub('', '(صوت ضعيف من تحت الأرض… الباب مفتوح.)', 3.5); hud();
  }

  // ================= input =================
  const keys = {}, mv = { x: 0, y: 0 }; let running = false, paused = true, torchOn = false;
  addEventListener('keydown', (e) => { keys[e.code] = true; if (e.code === 'KeyE') interact(); if (e.code === 'KeyF') toggleTorch(); if (e.code === 'ShiftLeft') running = true; });
  addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'ShiftLeft') running = false; });
  let camYaw = 0, camPitch = 0.18;
  const tz = $('#tz'), joy = $('#joy'), knob = $('#joy i'), T = { j: null, l: null, ox: 0, oy: 0, lx: 0, ly: 0 };
  tz.addEventListener('pointerdown', (e) => { tz.setPointerCapture(e.pointerId); if (e.clientX < innerWidth * 0.42 && T.j == null) { T.j = e.pointerId; T.ox = e.clientX; T.oy = e.clientY; joy.style.left = e.clientX + 'px'; joy.style.top = e.clientY + 'px'; joy.hidden = false; } else if (T.l == null) { T.l = e.pointerId; T.lx = e.clientX; T.ly = e.clientY; } });
  tz.addEventListener('pointermove', (e) => { if (e.pointerId === T.j) { let dx = e.clientX - T.ox, dy = e.clientY - T.oy; const m = Math.hypot(dx, dy), R = 55; if (m > R) { dx *= R / m; dy *= R / m; } knob.style.transform = `translate(${dx}px,${dy}px)`; mv.x = dx / R; mv.y = -dy / R; } else if (e.pointerId === T.l) { camYaw -= (e.clientX - T.lx) * 0.006; camPitch = Math.max(-0.25, Math.min(0.8, camPitch + (e.clientY - T.ly) * 0.004)); T.lx = e.clientX; T.ly = e.clientY; } });
  const endT = (e) => { if (e.pointerId === T.j) { T.j = null; mv.x = mv.y = 0; joy.hidden = true; knob.style.transform = ''; } if (e.pointerId === T.l) T.l = null; };
  tz.addEventListener('pointerup', endT); tz.addEventListener('pointercancel', endT);
  $('#b-use').addEventListener('click', interact);
  $('#b-run').addEventListener('click', () => { running = !running; $('#b-run').classList.toggle('on', running); });
  $('#b-torch').addEventListener('click', toggleTorch);
  function toggleTorch() { torchOn = !torchOn; $('#b-torch').classList.toggle('on', torchOn); SND.click(); }
  $('#b-notes').addEventListener('click', () => { const el = $('#notes'), l = el.querySelector('.list'); l.innerHTML = ''; S.clues.forEach((id) => { const c = clueData[id], d = document.createElement('div'); d.className = 'nc'; const b = document.createElement('b'); b.textContent = c.title; const p = document.createElement('p'); p.textContent = c.text; d.append(b, p); l.append(d); }); if (!S.clues.length) l.textContent = 'لا توجد أدلة بعد.'; el.hidden = false; paused = true; });
  $('#notes .close').addEventListener('click', () => { $('#notes').hidden = true; paused = false; });

  // ================= interaction =================
  let focus = null; const fwd = new THREE.Vector3();
  function findFocus() {
    if (!player) return null; const p = player.root.position, yaw = player.root.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
    let best = null, bd = 9;
    const cons = (kind, ref, x, z, r) => { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d > r) return; if (d > 0.9 && (dx * fx + dz * fz) / d < 0.35) return; const score = d + (kind === 'npc' ? 0.8 : 0); if (score < bd) { bd = score; best = { kind, ref }; } };
    items.forEach((it) => { if (!it.taken) cons('clue', it, it.x, it.z, 2.6); });
    Object.entries(people).forEach(([id, ch]) => { if (id !== 'player' && ch.root.visible) cons('npc', id, ch.root.position.x, ch.root.position.z, 2.6); });
    if (!best && !S.flags.solved && Math.hypot(p.x - 0, p.z - (-39.6)) < 2.6) best = { kind: 'door' };
    return best;
  }
  function interact() {
    if (paused || !focus) return;
    if (focus.kind === 'clue') collect(focus.ref.id);
    else if (focus.kind === 'npc') { const id = focus.ref; if (id === 'khalfan') talk('khalfan', () => ending()); else talk(id); }
    else if (focus.kind === 'door') { if (S.clues.includes('lock') && S.clues.length >= 15) accuse(); else sub('', 'الباب مقفل بقفل جديد. تحتاج أدلة أكثر قبل أن تواجه أحداً.', 3); }
  }
  function ending() { S.ended = true; save(); ghostTimer = 0.01; setTimeout(() => { $('#end p').textContent = C.ending; $('#end').hidden = false; }, 5000); }

  // eighth house door (closed until solved)
  const eighthDoor = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 0.12), MAT.door); eighthDoor.position.set(0, 1.15, -39.95); eighthDoor.castShadow = true; scene.add(eighthDoor);
  box(4, 4.6, 0.5, -3, 2.3, -40, MAT.plaster, { col: true }); box(4, 4.6, 0.5, 3, 2.3, -40, MAT.plaster, { col: true }); box(2, 2.3, 0.5, 0, 3.45, -40, MAT.plaster); flush();
  addCol(-0.7, 0.7, -40.3, -39.7, 3); const eighthDoorCol = colliders[colliders.length - 1];
  if (S.flags.solved) { eighthDoorCol.off = true; eighthDoor.visible = false; }

  // ghost: a translucent copy of the character that appears once at the end of the lane
  let ghost = null, ghostTimer = 0, ghostSeen = !!S.seen.ghostHarat;

  // ================= main loop =================
  const clock = new THREE.Clock(); let stepAcc = 0;
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  const tmp = new THREE.Vector3(), camTarget = new THREE.Vector3();
  function update(dt) {
    const p = player.root.position;
    let ix = mv.x + (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), iy = mv.y + (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const mag = Math.min(1, Math.hypot(ix, iy));
    if (mag > 0.08) {
      const sp = (running || mag > 0.97 ? 3.4 : 1.5) * mag, ang = camYaw + Math.PI - Math.atan2(ix, iy);
      const tx = Math.sin(ang), tz2 = Math.cos(ang);
      let ry = player.root.rotation.y, dy = Math.atan2(tx, tz2) - ry; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); player.root.rotation.y = ry + dy * Math.min(1, dt * 10);
      const nx = p.x + tx * sp * dt, nz = p.z + tz2 * sp * dt;
      if (!blocked(nx, p.z)) p.x = nx; if (!blocked(p.x, nz)) p.z = nz;
      setAnim(player, sp > 2.4 ? 'run' : 'walk'); player.A.walk.timeScale = Math.max(0.6, sp / 1.5);
      stepAcc += sp * dt; if (stepAcc > (sp > 2.4 ? 0.9 : 0.7)) { stepAcc = 0; SND.step(interiors.some((r) => p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1)); }
    } else setAnim(player, 'idle');
    // camera: behind the character, pulled in when a wall is in the way
    camTarget.set(p.x, 1.55, p.z);
    const dist = 3.4, back = new THREE.Vector3(Math.sin(camYaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(camYaw) * Math.cos(camPitch));
    let d = dist; for (let s = 0.4; s <= dist; s += 0.15) { tmp.copy(camTarget).addScaledVector(back, s); if (blocked(tmp.x, tmp.z, 0.2, tmp.y)) { d = Math.max(0.6, s - 0.3); break; } }
    const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    tmp.copy(camTarget).addScaledVector(back, d).addScaledVector(right, -0.45 * Math.min(1, d / dist));
    camera.position.lerp(tmp, Math.min(1, dt * 12)); camera.lookAt(camTarget.x - right.x * 0.45, camTarget.y, camTarget.z - right.z * 0.45);
    // lights follow
    sun.position.set(p.x - 20, 30, p.z - 14); sun.target.position.set(p.x, 0, p.z);
    torch.intensity = torchOn ? 2.6 : 0; if (torchOn) { const yaw = player.root.rotation.y; torch.position.set(p.x + Math.sin(yaw) * 0.3, 1.3, p.z + Math.cos(yaw) * 0.3); torch.target.position.set(p.x + Math.sin(yaw) * 6, 0.2, p.z + Math.cos(yaw) * 6); }
    // NPCs face the player when close
    Object.entries(people).forEach(([id, ch]) => { if (id === 'player' || !ch.root.visible) return; const q = ch.root.position, dd = Math.hypot(q.x - p.x, q.z - p.z); if (dd < 5) { const a = Math.atan2(p.x - q.x, p.z - q.z); let df = a - ch.root.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); ch.root.rotation.y += df * Math.min(1, dt * 3); } });
    // glints pulse
    const t = clock.elapsedTime; items.forEach((it, i) => { if (!it.taken) { const k = 0.35 + 0.25 * Math.sin(t * 2.4 + i); it.glint.material.opacity = k; it.glint.scale.setScalar(0.35 + k * 0.4); } });
    // ghost moment at the far end of the lane (once)
    if (!ghostSeen && p.z < -18) { ghostSeen = true; S.seen.ghostHarat = 1; save(); ghostTimer = 0.01; SND.whisper(0, 7); sub('', '(في آخر الممر… أحد واقف في الضباب)', 3.5); }
    if (ghostTimer > 0) { ghostTimer += dt; ghost.root.visible = true; const a = ghostTimer < 1.2 ? ghostTimer / 1.2 : ghostTimer < 3 ? 1 : Math.max(0, 1 - (ghostTimer - 3)); ghost.mat.opacity = a * 0.45; if (ghostTimer > 4.2) { ghostTimer = 0; ghost.root.visible = false; sub('', '(لم يكن هناك أحد.)', 2.5); } }
    // focus prompt
    focus = findFocus(); const pr = $('#prompt');
    if (focus) { pr.textContent = focus.kind === 'clue' ? 'التقط: ' + clueData[focus.ref.id].title : focus.kind === 'npc' ? 'تحدّث مع ' + C.people[focus.ref].name : 'البيت الثامن'; pr.hidden = false; } else pr.hidden = true;
    $('#b-use').classList.toggle('ready', !!focus);
  }
  function frame() { requestAnimationFrame(frame); const dt = Math.min(0.05, clock.getDelta()); mixers.forEach((m) => m.update(dt)); if (player && !paused) update(dt); renderer.render(scene, camera); }

  // ================= load the character and start =================
  const bar = $('#loadbar');
  loader.load('../assets/models/xbot.glb', (g) => {
    base = g;
    // measure real height from the head-top bone (skinned-mesh bounds are unreliable)
    const probe = g.scene; probe.updateMatrixWorld(true); const top = bone(probe, 'HeadTop_End'), wp = new THREE.Vector3(); if (top) top.getWorldPosition(wp);
    const hgt = top && wp.y > 0.1 ? wp.y : 1.76; probe.scale.multiplyScalar(1.76 / hgt); probe.updateMatrixWorld(true);
    window.__haratHeight = hgt;
    player = spawn('dishdasha', 0, 41, Math.PI); people.player = player;
    Object.entries(NPC).forEach(([id, n]) => { const ch = spawn(n.kind, n.at[0], n.at[1], n.yaw); people[id] = ch; if (n.hidden && !S.flags.solved) ch.root.visible = false; });
    // ghost
    const gr = THREE.SkeletonUtils.clone(g.scene); const gm = new THREE.MeshBasicMaterial({ color: 0xd6e2f2, transparent: true, opacity: 0, depthWrite: false, skinning: true, blending: THREE.AdditiveBlending });
    gr.traverse((o) => { if (o.isSkinnedMesh) o.material = gm; }); gr.position.set(1.2, 0, -34); gr.rotation.y = 0; gr.visible = false; scene.add(gr);
    const gmx = new THREE.AnimationMixer(gr); gmx.clipAction(g.animations.find((c) => c.name === 'idle')).play(); mixers.push(gmx); ghost = { root: gr, mat: gm };
    $('#loading').hidden = true; $('#start').hidden = false; hud();
  }, (e) => { if (e.total) bar.style.width = Math.round((e.loaded / e.total) * 100) + '%'; }, (err) => { $('#loading p').textContent = 'تعذّر تحميل الشخصية. حدّث الصفحة.'; console.error(err); });
  $('#go').addEventListener('click', () => {
    SND.init(); $('#start').hidden = true; $('#hud').hidden = false; paused = false; hud();
    if (!S.talked.maryam) setTimeout(() => sub('', 'مريم تنتظرك عند بوابة الحارة.', 3.5), 600);
  });
  document.body.classList.toggle('touch', isTouch);
  frame();
  window.__harat = { get S() { return S; }, people, items, tp: (x, z) => { player.root.position.set(x, 0, z); }, face: (yaw) => { player.root.rotation.y = yaw; }, interact, focus: () => focus && (focus.kind === 'clue' ? 'clue:' + focus.ref.id : focus.kind === 'npc' ? 'npc:' + focus.ref : 'door'), setCam: (y, p) => { camYaw = y; camPitch = p; }, isPaused: () => paused };
})();
