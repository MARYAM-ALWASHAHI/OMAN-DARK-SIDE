/* OMAN: THE DARK SIDE — web demo: "Harat Al-Ramad" (first-person, night).
 * three.js r128. All textures are generated procedurally on canvas; all sound in audio.js.
 * Fictional location inspired by abandoned mud-brick quarters of Oman's interior.
 */
(function () {
  'use strict';
  const A = window.OTDAudio;
  const $ = (s) => document.querySelector(s);
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  // ================= Renderer / scene =================
  const canvas = $('#scene');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
  } catch (e) {
    $('#nogl').hidden = false; $('#start').hidden = true; return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const NIGHT = new THREE.Color(0x0b0f19);
  scene.background = NIGHT;
  scene.fog = new THREE.FogExp2(0x0c111b, 0.042);

  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 600);
  scene.add(camera);

  // ================= Procedural textures =================
  function mulberry(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function tex(size, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (srgb) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  function speckle(g, s, r, n, light, dark, maxSize) {
    for (let i = 0; i < n; i++) {
      const lit = r() < 0.5;
      g.fillStyle = lit ? `rgba(${light},${r() * 0.18})` : `rgba(${dark},${r() * 0.22})`;
      const sz = r() * maxSize + 0.6;
      g.fillRect(r() * s, r() * s, sz, sz);
    }
  }
  function blotches(g, s, r, n, rgb, maxA, maxR) {
    for (let i = 0; i < n; i++) {
      const x = r() * s, y = r() * s, rad = r() * maxR + 10;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${rgb},${r() * maxA})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  function cracks(g, s, r, n, alpha) {
    g.strokeStyle = `rgba(28,18,10,${alpha})`;
    for (let i = 0; i < n; i++) {
      let x = r() * s, y = r() * s; g.lineWidth = r() * 1.4 + 0.4; g.beginPath(); g.moveTo(x, y);
      const steps = 6 + r() * 14;
      for (let k = 0; k < steps; k++) { x += (r() - 0.5) * 18; y += r() * 14; g.lineTo(x, y); }
      g.stroke();
    }
  }

  // Weathered mud plaster with exposed sun-dried bricks underneath
  const plasterMap = tex(512, (g, s) => {
    const r = mulberry(7);
    g.fillStyle = '#8c6d4f'; g.fillRect(0, 0, s, s);
    blotches(g, s, r, 40, '160,128,92', 0.5, 90);
    blotches(g, s, r, 30, '70,50,34', 0.35, 70);
    // exposed brick patches where plaster has fallen
    for (let p = 0; p < 5; p++) {
      const px = r() * s, py = r() * s, pw = 60 + r() * 120, ph = 40 + r() * 80;
      g.save(); g.beginPath(); g.ellipse(px, py, pw / 2, ph / 2, r(), 0, Math.PI * 2); g.clip();
      g.fillStyle = '#6a4f38'; g.fillRect(px - pw, py - ph, pw * 2, ph * 2);
      for (let by = py - ph; by < py + ph; by += 14) {
        const off = ((by / 14) | 0) % 2 ? 14 : 0;
        for (let bx = px - pw - off; bx < px + pw; bx += 28) {
          const v = r() * 26; g.fillStyle = `rgb(${108 + v},${80 + v * 0.75},${56 + v * 0.55})`;
          g.fillRect(bx + 1.5, by + 1.5, 25, 11);
        }
      }
      g.restore();
    }
    speckle(g, s, r, 9000, '230,210,180', '30,20,10', 2.2);
    cracks(g, s, r, 22, 0.55);
  });
  const plasterBump = tex(256, (g, s) => {
    const r = mulberry(8); g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    speckle(g, s, r, 6000, '255,255,255', '0,0,0', 2.5); cracks(g, s, r, 12, 0.9);
  }, false);

  const groundMap = tex(512, (g, s) => {
    const r = mulberry(21);
    g.fillStyle = '#6f5a44'; g.fillRect(0, 0, s, s);
    blotches(g, s, r, 50, '120,100,78', 0.45, 80);
    blotches(g, s, r, 40, '45,35,26', 0.35, 60);
    speckle(g, s, r, 16000, '210,190,160', '20,15,10', 2);
    for (let i = 0; i < 260; i++) { // pebbles
      const x = r() * s, y = r() * s, w = r() * 4 + 1.5;
      const pv = r() * 60; g.fillStyle = `rgb(${92 + pv},${80 + pv * 0.85},${64 + pv * 0.7})`;
      g.beginPath(); g.ellipse(x, y, w, w * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + 1, y + 1.2, w, w * 0.5, 0, 0, Math.PI * 2); g.fill();
    }
  });
  groundMap.repeat.set(40, 40);
  const groundBump = tex(256, (g, s) => { const r = mulberry(22); g.fillStyle = '#808080'; g.fillRect(0, 0, s, s); speckle(g, s, r, 9000, '255,255,255', '0,0,0', 3); }, false);
  groundBump.repeat.set(40, 40);

  const stoneMap = tex(256, (g, s) => {
    const r = mulberry(31); g.fillStyle = '#4a4038'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 32) for (let x = -(y % 64 ? 24 : 0); x < s; x += 48) {
      const sv = r() * 36; g.fillStyle = `rgb(${92 + sv},${83 + sv * 0.9},${70 + sv * 0.8})`;
      g.fillRect(x + 2, y + 2, 44 + r() * 4, 28);
    }
    speckle(g, s, r, 4000, '220,200,180', '0,0,0', 2);
  });

  const woodMap = tex(256, (g, s) => {
    const r = mulberry(41); g.fillStyle = '#4b3524'; g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 2) { g.fillStyle = `rgba(${r() < 0.5 ? '120,90,60' : '20,12,6'},${r() * 0.35})`; g.fillRect(x, 0, 1 + r() * 2, s); }
    speckle(g, s, r, 1500, '200,170,130', '0,0,0', 1.5);
  });

  // Faded teal-painted carved door with iron studs (common in older Omani houses — verify details)
  const doorMap = tex(256, (g, s) => {
    const r = mulberry(51);
    g.fillStyle = '#2f5652'; g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 32) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 2, s); }
    g.strokeStyle = 'rgba(15,25,22,0.7)'; g.lineWidth = 4;
    [[24, 24], [136, 24], [24, 136], [136, 136]].forEach(([x, y]) => g.strokeRect(x, y, 96, 96));
    g.fillStyle = 'rgba(200,190,160,0.5)';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { g.beginPath(); g.arc(20 + i * 43, 20 + j * 43, 3, 0, 7); g.fill(); }
    blotches(g, s, r, 30, '140,110,80', 0.6, 40); // paint worn to wood
    speckle(g, s, r, 3000, '200,200,180', '0,0,0', 2);
  });

  const paperMap = tex(128, (g, s) => {
    g.fillStyle = '#d9cfb8'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(60,70,110,0.45)'; g.lineWidth = 1;
    for (let y = 14; y < s; y += 9) { g.beginPath(); g.moveTo(6, y); g.lineTo(s - 6, y); g.stroke(); }
    g.fillStyle = 'rgba(30,30,40,0.75)'; g.font = '10px monospace';
    ['23°0..', '57°3..', 'N 7 ?', '8 / 7'].forEach((t, i) => g.fillText(t, 10, 22 + i * 18));
  });

  const footMap = tex(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.fillStyle = 'rgba(25,17,10,0.85)';
    g.beginPath(); g.ellipse(64, 78, 22, 40, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(64, 30, 18, 14, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0)';
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(44, 50 + i * 7, 40, 2); } // tread
  });

  const poleMap = tex(64, (g, s) => {
    for (let y = 0; y < s; y += 16) { g.fillStyle = (y / 16) % 2 ? '#e8e2d4' : '#d35a1e'; g.fillRect(0, y, s, 16); }
  });

  const frondMap = tex(256, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.strokeStyle = '#3a3a22'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, s / 2); g.lineTo(s - 4, s / 2); g.stroke();
    for (let x = 14; x < s - 8; x += 5) {
      const len = 50 * Math.sin((x / s) * Math.PI) + 6;
      g.strokeStyle = `rgb(${50 + Math.random() * 30},${58 + Math.random() * 30},${30})`; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, s / 2); g.lineTo(x + 14, s / 2 - len); g.stroke();
      g.beginPath(); g.moveTo(x, s / 2); g.lineTo(x + 14, s / 2 + len); g.stroke();
    }
  });

  // ================= Materials =================
  const M = {
    plaster: new THREE.MeshStandardMaterial({ map: plasterMap, bumpMap: plasterBump, bumpScale: 0.03, roughness: 0.96, metalness: 0 }),
    plasterDark: new THREE.MeshStandardMaterial({ map: plasterMap, bumpMap: plasterBump, bumpScale: 0.03, roughness: 1, color: 0x9a8a7a }),
    ground: new THREE.MeshStandardMaterial({ map: groundMap, bumpMap: groundBump, bumpScale: 0.04, roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ map: stoneMap, roughness: 0.92 }),
    wood: new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.9 }),
    door: new THREE.MeshStandardMaterial({ map: doorMap, roughness: 0.85 }),
    hole: new THREE.MeshBasicMaterial({ color: 0x050505 }),
    paper: new THREE.MeshStandardMaterial({ map: paperMap, roughness: 0.8 }),
    pole: new THREE.MeshStandardMaterial({ map: poleMap, roughness: 0.6 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x1a1c1f, roughness: 0.45, metalness: 0.2 }),
    led: new THREE.MeshBasicMaterial({ color: 0xff2a1a }),
    foot: new THREE.MeshStandardMaterial({ map: footMap, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }),
    frond: new THREE.MeshStandardMaterial({ map: frondMap, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9 }),
    deadFrond: new THREE.MeshStandardMaterial({ map: frondMap, color: 0x8a7050, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1 }),
    clay: new THREE.MeshStandardMaterial({ color: 0x3e2316, roughness: 0.9 }),
    floor: new THREE.MeshStandardMaterial({ map: groundMap, color: 0xb0a090, roughness: 1 }),
  };
  M.floor.map = groundMap.clone(); M.floor.map.repeat.set(3, 3); M.floor.map.needsUpdate = true;

  // ================= Geometry helpers =================
  const colliders = []; // {minX,maxX,minZ,maxZ}
  const interiors = []; // same shape, used for indoor reverb/footsteps
  function boxGeo(w, h, d, ts = 2.2) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
      const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / ts + f * 0.37, uv.getY(k) * dims[f][1] / ts);
    }
    uv.needsUpdate = true; return g;
  }
  function box(w, h, d, x, y, z, mat, opts = {}) {
    const m = new THREE.Mesh(boxGeo(w, h, d, opts.ts), mat);
    m.position.set(x, y, z);
    if (opts.rot) m.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
    m.castShadow = opts.shadow !== false; m.receiveShadow = true;
    (opts.parent || scene).add(m);
    if (opts.collide) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return m;
  }

  /** Axis-aligned wall from (x1,z1) to (x2,z2) with optional door gap at `gapAt` (distance along wall). */
  function wall(x1, z1, x2, z2, h, t, mat, opt = {}) {
    const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    const sx = Math.min(x1, x2), sz = Math.min(z1, z2);
    const segs = [];
    if (opt.gapAt != null) {
      const gw = opt.gapW || 1.2;
      segs.push([0, opt.gapAt - gw / 2], [opt.gapAt + gw / 2, len]);
      // lintel (palm-trunk beam + mud above)
      const c = opt.gapAt;
      const lx = alongX ? sx + c : x1, lz = alongX ? z1 : sz + c;
      const lh = h - (opt.gapH || 2.1);
      if (lh > 0.05) box(alongX ? gw + 0.3 : t, lh, alongX ? t : gw + 0.3, lx, (opt.gapH || 2.1) + lh / 2, lz, mat);
    } else segs.push([0, len]);
    const r = mulberry(Math.floor((x1 * 13 + z1 * 7) * 100));
    segs.forEach(([a, b]) => {
      const L = b - a; if (L <= 0.05) return;
      let hh = h;
      if (opt.ruin && r() < opt.ruin) hh = h * (0.35 + r() * 0.45);
      const cx = alongX ? sx + (a + b) / 2 : x1, cz = alongX ? z1 : sz + (a + b) / 2;
      box(alongX ? L : t, hh, alongX ? t : L, cx, hh / 2, cz, mat, { collide: true });
      // crenellated parapet on intact walls
      if (hh === h && !opt.noCren) {
        for (let p = 0.35; p < L - 0.2; p += 0.9) {
          const px = alongX ? sx + a + p : x1, pz = alongX ? z1 : sz + a + p;
          box(alongX ? 0.45 : t, 0.42, alongX ? t : 0.45, px, h + 0.21, pz, mat);
        }
      }
      // small dark window openings
      if (opt.windows && L > 2.2 && hh > 3) {
        for (let p = 1.1; p < L - 0.8; p += 2.4) {
          const px = alongX ? sx + a + p : x1, pz = alongX ? z1 : sz + a + p;
          box(alongX ? 0.55 : t + 0.04, 0.75, alongX ? t + 0.04 : 0.55, px, hh - 1.4, pz, M.hole, { shadow: false });
        }
      }
      // rubble at the foot of ruined walls
      if (hh < h) for (let k = 0; k < 6; k++) {
        const s = 0.15 + r() * 0.35;
        const rx = cx + (alongX ? (r() - 0.5) * L : (r() - 0.5) * 1.6);
        const rz = cz + (alongX ? (r() - 0.5) * 1.6 : (r() - 0.5) * L);
        box(s, s * 0.7, s, rx, s * 0.35, rz, mat, { rot: [r(), r() * 3, r()] });
      }
    });
  }

  /** A mud-brick house: 4 walls, door on one side, optional (partly collapsed) roof with palm beams. */
  function house(o) {
    const { x, z, w, d, h } = o, t = 0.45;
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    const common = { ruin: o.ruin || 0, windows: true };
    wall(x0, z0, x1, z0, h, t, M.plaster, Object.assign({}, common, o.door === 'n' ? { gapAt: w / 2, ruin: 0 } : {}));
    wall(x0, z1, x1, z1, h, t, M.plaster, Object.assign({}, common, o.door === 's' ? { gapAt: w / 2, ruin: 0 } : {}));
    wall(x0, z0, x0, z1, h, t, M.plaster, Object.assign({}, common, o.door === 'w' ? { gapAt: d / 2, ruin: 0 } : {}));
    wall(x1, z0, x1, z1, h, t, M.plaster, Object.assign({}, common, o.door === 'e' ? { gapAt: d / 2, ruin: 0 } : {}));
    interiors.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1 });
    // interior floor
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(w - t, d - t), M.floor);
    fl.rotation.x = -Math.PI / 2; fl.position.set(x, 0.012, z); fl.receiveShadow = true; scene.add(fl);
    if (o.roof) {
      // palm-trunk beams spanning the short side, mud slab on top (with a collapsed section)
      const n = Math.floor(d / 0.65);
      const r = mulberry(x * 31 + z * 17);
      for (let i = 1; i < n; i++) {
        const bz = z0 + i * (d / n);
        const broken = o.collapse && bz > z0 + d * o.collapse[0] && bz < z0 + d * o.collapse[1];
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, w, 6), M.wood);
        beam.rotation.z = Math.PI / 2; beam.position.set(x, h - 0.15, bz); beam.castShadow = true;
        if (broken && r() < 0.6) { beam.rotation.set(0.25 * (r() - 0.5), 0, Math.PI / 2 + (r() - 0.5) * 0.9); beam.position.y = h * 0.55; }
        scene.add(beam);
      }
      const slab = (za, zb) => { if (zb - za > 0.1) box(w, 0.28, zb - za, x, h + 0.02, (za + zb) / 2, M.plasterDark); };
      if (o.collapse) { slab(z0, z0 + d * o.collapse[0]); slab(z0 + d * o.collapse[1], z1); } else slab(z0, z1);
    }
    return { x0, x1, z0, z1 };
  }

  function palm(x, z, h, dead, seed) {
    const r = mulberry(seed);
    const g = new THREE.Group();
    const lean = (r() - 0.5) * 0.25;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, h, 7, 6), M.wood);
    trunk.position.y = h / 2; trunk.castShadow = true; g.add(trunk);
    // rough trunk rings
    for (let y = 0.4; y < h - 0.3; y += 0.32) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.24, 0.12, 7), M.wood);
      ring.position.y = y; ring.rotation.y = r() * 3; g.add(ring);
    }
    const crown = new THREE.Group(); crown.position.y = h; g.add(crown);
    const count = dead ? 6 : 14;
    for (let i = 0; i < count; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.9), dead ? M.deadFrond : M.frond);
      f.geometry.translate(1.6, 0, 0);
      f.rotation.set(Math.PI / 2 + (r() - 0.5) * 0.3, 0, 0);
      const holder = new THREE.Group();
      holder.rotation.y = (i / count) * Math.PI * 2 + r() * 0.4;
      holder.rotation.z = dead ? -0.9 - r() * 0.6 : -0.15 - r() * 0.65;
      holder.add(f); f.castShadow = true; crown.add(holder);
    }
    g.rotation.z = lean; g.rotation.x = (r() - 0.5) * 0.15;
    g.position.set(x, 0, z); scene.add(g);
    colliders.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3 });
  }

  // ================= World =================
  // Ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260, 1, 1), M.ground);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // Sky dome with a faint gradient, stars, moon, mountain silhouettes (unaffected by fog)
  const skyTex = tex(64, (g, s) => {
    const gr = g.createLinearGradient(0, 0, 0, s);
    gr.addColorStop(0, '#03050a'); gr.addColorStop(0.6, '#080d19'); gr.addColorStop(1, '#141b2c');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  scene.add(sky);
  {
    const r = mulberry(99), pts = [];
    for (let i = 0; i < 1800; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(r() * 0.9 + 0.1);
      pts.push(380 * Math.sin(ph) * Math.cos(th), 380 * Math.cos(ph), 380 * Math.sin(ph) * Math.sin(th));
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));
    const moonTex = tex(128, (g, s) => {
      const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64);
      gr.addColorStop(0, 'rgba(240,240,255,1)'); gr.addColorStop(0.18, 'rgba(225,230,250,1)'); gr.addColorStop(0.24, 'rgba(160,180,230,0.35)'); gr.addColorStop(1, 'rgba(100,120,200,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, fog: false, depthWrite: false }));
    moon.scale.set(60, 60, 1); moon.position.set(-160, 170, -230); scene.add(moon);
    // Hajar-like ridges: jagged cones as silhouettes
    const mMat = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false, toneMapped: false });
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + r() * 0.1, dist = 170 + r() * 50;
      const hgt = 25 + r() * 55 + (Math.sin(a + 1.4) > 0.3 ? 35 : 0);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(25 + r() * 30, hgt, 4 + Math.floor(r() * 3)), mMat);
      cone.position.set(Math.cos(a) * dist, hgt / 2 - 4, Math.sin(a) * dist); cone.rotation.y = r() * 3;
      scene.add(cone);
    }
  }

  // Lights
  scene.add(new THREE.HemisphereLight(0x2a3a60, 0x0d0a08, 0.55));
  const moonLight = new THREE.DirectionalLight(0x9fb4e0, 0.42);
  moonLight.position.set(-30, 45, -40);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
  Object.assign(moonLight.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 140 });
  moonLight.shadow.bias = -0.0008;
  moonLight.target.position.set(0, 0, 5); scene.add(moonLight, moonLight.target);

  const torch = new THREE.SpotLight(0xffe0b0, 2.6, 26, 0.48, 0.55, 1.6);
  torch.castShadow = true;
  torch.shadow.mapSize.set(isTouch ? 512 : 1024, isTouch ? 512 : 1024);
  torch.shadow.bias = -0.0005;
  torch.position.set(0.18, -0.2, 0.1);
  camera.add(torch); camera.add(torch.target); torch.target.position.set(0, -0.15, -5);
  const torchBase = 2.6;

  // ---- The falaj channel (dry) leading north from the palm grove into the quarter ----
  for (let z = 46; z > 13; z -= 4) {
    box(0.22, 0.55, 4, -2.85, 0.275, z - 2, M.stone, { collide: true, ts: 1.2 });
    box(0.22, 0.55, 4, -2.05, 0.275, z - 2, M.stone, { collide: true, ts: 1.2 });
    box(0.58, 0.06, 4, -2.45, 0.03, z - 2, M.stone, { shadow: false });
  }

  // ---- Palm grove (some trees dead, as in an abandoned garden) ----
  {
    const r = mulberry(5);
    let seed = 100;
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side > 0 ? 1.8 + r() * 13 : -4 - r() * 12;
      const z = 16 + r() * 34;
      palm(x, z, 5 + r() * 4, r() < 0.3, seed++);
    }
    // a few dead palms inside the abandoned quarter (placed clear of the walking line)
    [[2.9, 8], [-3.1, -23], [3.2, -14.5]].forEach(([x, z]) => palm(x, z, 4 + r() * 2.5, true, seed++));
  }

  // ---- Footprints along the falaj (clue 1) ----
  const footprints = new THREE.Group(); scene.add(footprints);
  for (let i = 0; i < 16; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.3), M.foot);
    f.rotation.x = -Math.PI / 2; f.rotation.z = (Math.random() - 0.5) * 0.15;
    f.position.set(-1.55 + (i % 2 ? 0.17 : -0.05), 0.015, 31 - i * 0.72);
    footprints.add(f);
  }

  // ---- Harat Al-Ramad ----
  // Quarter gate: two pillars and a lintel
  box(1.2, 4.2, 1.2, -3.6, 2.1, 12.5, M.plaster, { collide: true });
  box(1.2, 4.2, 1.2, 3.6, 2.1, 12.5, M.plaster, { collide: true });
  box(8.4, 0.9, 1.2, 0, 4.4, 12.5, M.plaster);
  for (let i = 0; i < 6; i++) box(0.5, 0.45, 1.2, -3.4 + i * 1.36, 5.07, 12.5, M.plaster);

  house({ x: -8, z: 5, w: 8, d: 7, h: 5.2, door: 'e', ruin: 0.6 });
  const H2 = house({ x: -8, z: -6, w: 8, d: 8, h: 5.8, door: 'e', roof: true, collapse: [0.62, 0.95] }); // blue door: notebook
  house({ x: -8, z: -17.5, w: 8, d: 8, h: 4.6, door: 'e', ruin: 0.85 });
  house({ x: 8, z: 4.5, w: 8, d: 7, h: 4.8, door: 'w', ruin: 0.7 });
  const H5 = house({ x: 8, z: -9, w: 8, d: 8, h: 6.2, door: 'w', roof: true, collapse: [0.05, 0.25] }); // the voice
  house({ x: 8, z: -20.5, w: 8, d: 7, h: 5, door: 'w', ruin: 0.5 });

  // Old watch tower at the end of the lane: the landmark you walk toward
  {
    const towerMat = M.plaster;
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.6, 13, 20, 1, true), towerMat);
    tw.position.set(0, 6.5, -33); tw.castShadow = tw.receiveShadow = true; scene.add(tw);
    tw.material = towerMat.clone(); tw.material.side = THREE.DoubleSide;
    tw.material.map = plasterMap.clone(); tw.material.map.repeat.set(4, 3); tw.material.map.needsUpdate = true;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      box(0.7, 0.8, 0.45, Math.cos(a) * 3.05, 13.4, -33 + Math.sin(a) * 3.05, M.plaster, { rot: [0, -a, 0] });
    }
    for (let i = 0; i < 3; i++) box(0.4, 0.8, 0.2, Math.cos(i * 2) * 3.2, 9 - i * 2.5, -33 + Math.sin(i * 2) * 3.2 + 0.05, M.hole, { rot: [0, -i * 2 + Math.PI / 2, 0], shadow: false });
    colliders.push({ minX: -3.6, maxX: 3.6, minZ: -36.6, maxZ: -29.4 });
  }
  // Rubble barricade closing the lane
  {
    const r = mulberry(77);
    for (let i = 0; i < 40; i++) { const s = 0.3 + r() * 0.7; box(s, s * 0.6, s, -4 + r() * 8, s * 0.3, -26 - r() * 2, M.plaster, { rot: [r(), r() * 3, r()] }); }
    colliders.push({ minX: -4.5, maxX: 4.5, minZ: -28.5, maxZ: -25.2 });
  }
  // World bounds (invisible)
  [[-60, -13, -60, 60], [13, 60, -60, 60], [-60, 60, 52, 60], [-60, 60, -60, -40]].forEach(([a, b, c, d]) => colliders.push({ minX: a, maxX: b, minZ: c, maxZ: d }));

  // ---- Props ----
  // Survey pole leaning on the gate (clue 2)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 8), M.pole);
  pole.position.set(2.75, 1.05, 11.7); pole.rotation.set(0.0, 0, 0.32); pole.castShadow = true; scene.add(pole);

  // Blue (teal) door, ajar, on H2's east wall
  const doorPivot = new THREE.Group(); doorPivot.position.set(H2.x1, 0, -6 + 0.6); scene.add(doorPivot);
  const doorLeaf = box(0.08, 2.08, 1.18, 0, 1.04, -0.59, M.door, { parent: doorPivot });
  doorPivot.rotation.y = -0.35;

  // H2 interior: mat, broken pots, niche, fallen beam, and the notebook (clue 3)
  box(1.6, 0.02, 2.4, -9.6, 0.025, -4.4, new THREE.MeshStandardMaterial({ color: 0x5a3d2a, roughness: 1 }), { shadow: false });
  [[-11, -9.2], [-10.6, -9.4], [-5.5, -2.8]].forEach(([px, pz], i) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.45, 10, 1, i === 1), M.clay);
    pot.position.set(px, i === 1 ? 0.15 : 0.22, pz); if (i === 1) pot.rotation.z = 1.4; pot.castShadow = true; scene.add(pot);
  });
  box(0.05, 0.7, 0.9, H2.x0 + 0.25, 1.4, -8, M.hole, { shadow: false }); // wall niche
  box(0.22, 0.22, 4.6, -9, 1.1, -8.3, M.wood, { rot: [0.25, 0.4, 0.15] });
  const notebook = new THREE.Group();
  box(0.24, 0.035, 0.32, 0, 0.02, 0, M.paper, { parent: notebook });
  box(0.245, 0.01, 0.325, 0, 0.0, 0, new THREE.MeshStandardMaterial({ color: 0x2b3d5a, roughness: 0.7 }), { parent: notebook });
  notebook.position.set(-10.9, 0.03, -7.6); notebook.rotation.y = 0.5; scene.add(notebook);

  // H5 interior: mud bench along the back wall, recorder (clue 4)
  box(0.7, 0.5, 4.5, H5.x1 - 0.6, 0.25, -9.5, M.plasterDark, { collide: true });
  const recorder = new THREE.Group();
  box(0.07, 0.025, 0.14, 0, 0, 0, M.plastic, { parent: recorder });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), M.led); led.position.set(0.015, 0.015, -0.05); recorder.add(led);
  recorder.position.set(H5.x1 - 0.6, 0.52, -9.8); recorder.rotation.y = 0.3; scene.add(recorder);
  const ledLight = new THREE.PointLight(0xff2010, 0.0, 1.2, 2); ledLight.position.copy(recorder.position).add(new THREE.Vector3(0, 0.05, 0)); scene.add(ledLight);

  // Dust motes around the player (visible in the torch beam)
  const dust = (() => {
    const n = isTouch ? 220 : 420, p = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) p[i] = (Math.random() - 0.5) * 8;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd8c8a8, size: 0.018, transparent: true, opacity: 0.45, depthWrite: false }));
    scene.add(pts); return pts;
  })();

  // ================= Story / clues =================
  const CLUES = {
    foot: { title: 'آثار أقدام حديثة', text: 'على حافة الفلج. حذاء رجالي، والخطوات متجهة شمالاً نحو حارة الرماد. لم تمحها الريح بعد.' },
    pole: { title: 'عمود مسح برتقالي', text: 'مسنود على بوابة الحارة. مكتوب عليه بقلم أسود: «خ. — نقطة ٧». ترك خلفان معدّاته هنا ودخل.' },
    note: { title: 'دفتر خلفان', text: 'آخر صفحة: إحداثيات غير مكتملة، وسطر بخط مستعجل: «في الخريطة سبعة بيوت… عددتها ثمانية.»' },
    rec: { title: 'مسجّل صوت', text: 'آخر تسجيل قبل ثلاث ليالٍ. صوت خلفان، ثم صمت طويل.' },
  };
  const state = {
    started: false, ended: false, paused: false,
    stage: 0, // 0 follow falaj, 1 find in quarter, 2 enter blue door, 3 follow voice, 4 inspect bench, 5 done
    clues: [], eventTime: -1, whisperNext: 0, inH5: false, flicker: 0, heartNext: 0, enteredH2: false,
  };
  const OBJ = [
    'اتبع الفلج شمالاً نحو حارة الرماد',
    'ابحث عن أثر خلفان عند مدخل الحارة',
    'ادخل البيت ذا الباب الأزرق',
    'اتبع الصوت',
    'افحص ما على المصطبة',
    'انتهى العرض',
  ];
  const items = [
    { id: 'foot', pos: new THREE.Vector3(-1.5, 0, 26), verb: 'افحص آثار الأقدام', when: () => true, r: 2.4 },
    { id: 'pole', pos: new THREE.Vector3(2.75, 1, 11.7), verb: 'افحص العمود', when: () => true, r: 2.0 },
    { id: 'note', pos: new THREE.Vector3(-10.9, 0, -7.6), verb: 'التقط الدفتر', when: () => true, r: 1.9 },
    { id: 'rec', pos: new THREE.Vector3(H5.x1 - 0.6, 0.5, -9.8), verb: 'شغّل المسجّل', when: () => state.stage >= 3, r: 1.9 },
  ];

  function setObjective(i) {
    state.stage = Math.max(state.stage, i);
    const el = $('#objective'); el.textContent = OBJ[state.stage];
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  }
  let subTimer = 0;
  function sub(text, seconds, speaker) {
    const el = $('#sub');
    el.innerHTML = '';
    if (speaker) { const b = document.createElement('b'); b.textContent = speaker + ': '; el.appendChild(b); }
    el.appendChild(document.createTextNode(text));
    el.hidden = false; clearTimeout(subTimer);
    subTimer = setTimeout(() => { el.hidden = true; }, seconds * 1000);
  }
  let toastTimer = 0;
  function toast(title, text) {
    const el = $('#toast');
    el.querySelector('b').textContent = 'دليل جديد: ' + title;
    el.querySelector('span').textContent = text;
    el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 6500);
  }
  function renderNotebook() {
    const list = $('#nb-list'); list.innerHTML = '';
    if (!state.clues.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'لا توجد أدلة بعد.'; list.appendChild(li); }
    state.clues.forEach((id) => {
      const li = document.createElement('li');
      const b = document.createElement('b'); b.textContent = CLUES[id].title;
      const p = document.createElement('p'); p.textContent = CLUES[id].text;
      li.append(b, p); list.appendChild(li);
    });
    $('#nb-count').textContent = state.clues.length + ' / 4';
    $('#clue-count').textContent = state.clues.length + ' / 4';
  }

  function collect(item) {
    if (state.clues.includes(item.id)) return;
    state.clues.push(item.id); item.taken = true;
    A.pickup(); renderNotebook();
    const c = CLUES[item.id]; toast(c.title, c.text);
    if (item.id === 'foot') { if (state.stage < 1) setObjective(1); }
    if (item.id === 'pole') { if (state.stage < 2) setObjective(2); }
    if (item.id === 'note') { notebook.visible = false; startEvent(); }
    if (item.id === 'rec') { recorder.visible = false; ledLight.intensity = 0; finale(); }
  }

  // "The Count": restrained, ambiguous, plays once.
  function startEvent() {
    state.eventTime = clock.elapsedTime;
    A.fadeAmbience(0.08, 4);
    A.drone(0.10, 6);
    setTimeout(() => { state.flicker = 0.9; A.click(); }, 1500);
    setTimeout(() => {
      setObjective(3);
      sub('(همس خافت… من البيت المقابل)', 4);
      state.whisperNext = clock.elapsedTime;
    }, 4500);
  }

  function enterH5() {
    state.inH5 = true;
    state.whisperNext = Infinity;
    A.creak(H5.x0, 1, -9);
    A.startStatic(H5.x1 - 0.6, 0.6, -9.8);
    ledLight.intensity = 0.6;
    setObjective(4);
    sub('(الهمس توقف. هناك صوت تشويش خفيف.)', 4);
  }

  function finale() {
    A.stopStatic(); A.drone(0.04, 3);
    const lines = [
      ['خلفان (تسجيل)', 'اليوم… الحادي عشر. الساعة… ما أعرف.', 3.2],
      ['خلفان (تسجيل)', 'عددت البيوت مرة ثانية. في الخريطة سبعة.', 3.6],
      ['خلفان (تسجيل)', 'إذا أحد لقى هذا… لا تعدّوها.', 3.4],
    ];
    let t = 600;
    lines.forEach(([who, text, dur]) => {
      setTimeout(() => { A.recordedVoice(dur - 0.3); sub(text, dur, who); }, t);
      t += dur * 1000 + 500;
    });
    setTimeout(() => { A.fadeAmbience(0.6, 6); A.drone(0, 4); }, t);
    setTimeout(endCard, t + 2600);
  }

  function endCard() {
    state.ended = true; setObjective(5);
    if (document.pointerLockElement) document.exitPointerLock();
    $('#end-count').textContent = state.clues.length + ' من 4';
    $('#end').hidden = false;
  }

  // ================= Player & input =================
  const player = { pos: new THREE.Vector3(-1.2, 1.65, 40), yaw: 0, pitch: 0, vel: new THREE.Vector2(), bob: 0, stepAcc: 0 };
  const keys = {};
  const move = { x: 0, y: 0 };
  let running = false, torchOn = true;

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (!state.started || state.ended) return;
    if (e.code === 'KeyE') tryInteract();
    if (e.code === 'KeyF') toggleTorch();
    if (e.code === 'KeyN' || e.code === 'Tab') { e.preventDefault(); toggleNotebook(); }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  function toggleTorch() { torchOn = !torchOn; A.click(); }
  function toggleNotebook(force) {
    const nb = $('#notebook');
    const show = force != null ? force : nb.hidden;
    nb.hidden = !show; state.paused = show;
    if (show && document.pointerLockElement) document.exitPointerLock();
  }
  $('#nb-close').addEventListener('click', () => toggleNotebook(false));
  $('#btn-nb').addEventListener('click', () => toggleNotebook(true));
  $('#btn-nb2').addEventListener('click', () => toggleNotebook(true));
  $('#btn-torch').addEventListener('click', toggleTorch);
  $('#btn-use').addEventListener('click', tryInteract);

  // Mouse look: pointer lock when available, drag-to-look otherwise
  let dragging = false;
  canvas.addEventListener('mousedown', () => {
    if (!state.started || state.ended || isTouch) return;
    if (!document.pointerLockElement && canvas.requestPointerLock) {
      try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* frame may refuse */ }
    }
    dragging = true;
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!state.started || state.paused || isTouch) return;
    if (document.pointerLockElement === canvas || dragging) look(e.movementX * 0.0022, e.movementY * 0.0022);
  });
  function look(dx, dy) {
    player.yaw -= dx; player.pitch -= dy;
    player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch));
  }

  // Touch: left half = floating joystick, right half = drag to look
  const touchState = { joyId: null, lookId: null, ox: 0, oy: 0, lx: 0, ly: 0 };
  const joy = $('#joy'), knob = $('#joy i');
  const tz = $('#touchzone');
  tz.addEventListener('pointerdown', (e) => {
    if (!state.started || state.paused) return;
    tz.setPointerCapture(e.pointerId);
    if (e.clientX < innerWidth * 0.45 && touchState.joyId == null) {
      touchState.joyId = e.pointerId; touchState.ox = e.clientX; touchState.oy = e.clientY;
      joy.style.left = e.clientX + 'px'; joy.style.top = e.clientY + 'px'; joy.hidden = false;
    } else if (touchState.lookId == null) {
      touchState.lookId = e.pointerId; touchState.lx = e.clientX; touchState.ly = e.clientY;
    }
  });
  tz.addEventListener('pointermove', (e) => {
    if (e.pointerId === touchState.joyId) {
      let dx = e.clientX - touchState.ox, dy = e.clientY - touchState.oy;
      const m = Math.hypot(dx, dy), R = 56;
      if (m > R) { dx *= R / m; dy *= R / m; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      move.x = dx / R; move.y = -dy / R;
      running = m > R * 0.95;
    } else if (e.pointerId === touchState.lookId) {
      look((e.clientX - touchState.lx) * 0.0055, (e.clientY - touchState.ly) * 0.0055);
      touchState.lx = e.clientX; touchState.ly = e.clientY;
    }
  });
  const endTouch = (e) => {
    if (e.pointerId === touchState.joyId) { touchState.joyId = null; move.x = move.y = 0; joy.hidden = true; knob.style.transform = ''; running = false; }
    if (e.pointerId === touchState.lookId) touchState.lookId = null;
  };
  tz.addEventListener('pointerup', endTouch); tz.addEventListener('pointercancel', endTouch);

  // ================= Interaction =================
  const fwd = new THREE.Vector3();
  let focused = null;
  function findFocus() {
    camera.getWorldDirection(fwd);
    const f2 = new THREE.Vector2(fwd.x, fwd.z).normalize();
    let best = null, bestScore = 1e9;
    for (const it of items) {
      if (it.taken || !it.when()) continue;
      const dx = it.pos.x - player.pos.x, dz = it.pos.z - player.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > it.r) continue;
      const dot = (dx * f2.x + dz * f2.y) / (d || 1);
      if (d > 0.9 && dot < 0.72) continue;
      if (d < bestScore) { bestScore = d; best = it; }
    }
    return best;
  }
  function tryInteract() { if (focused && !state.paused) collect(focused); }

  // ================= Collision =================
  const RAD = 0.32;
  function blocked(x, z) {
    for (const c of colliders) if (x > c.minX - RAD && x < c.maxX + RAD && z > c.minZ - RAD && z < c.maxZ + RAD) return true;
    return false;
  }
  function inside(rect, x, z) { return x > rect.minX && x < rect.maxX && z > rect.minZ && z < rect.maxZ; }

  // ================= Loop =================
  const clock = new THREE.Clock();
  const v3 = new THREE.Vector3();
  let wasIndoor = false;

  function update(dt) {
    // movement intent
    let ix = move.x, iy = move.y;
    if (keys.KeyW || keys.ArrowUp) iy += 1;
    if (keys.KeyS || keys.ArrowDown) iy -= 1;
    if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1;
    const mag = Math.min(1, Math.hypot(ix, iy));
    const run = running || keys.ShiftLeft || keys.ShiftRight;
    const speed = (run ? 3.6 : 1.9) * mag;
    if (mag > 0.01) { const n = Math.hypot(ix, iy); ix /= n; iy /= n; }
    const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
    const wx = (ix * cos - iy * sin) * speed, wz = (-ix * sin - iy * cos) * speed;
    // smooth acceleration
    player.vel.x += (wx - player.vel.x) * Math.min(1, dt * 9);
    player.vel.y += (wz - player.vel.y) * Math.min(1, dt * 9);
    const nx = player.pos.x + player.vel.x * dt, nz = player.pos.z + player.vel.y * dt;
    if (!blocked(nx, player.pos.z)) player.pos.x = nx; else player.vel.x = 0;
    if (!blocked(player.pos.x, nz)) player.pos.z = nz; else player.vel.y = 0;

    // footsteps + head bob
    const sp = Math.hypot(player.vel.x, player.vel.y);
    const indoor = interiors.some((r) => inside(r, player.pos.x, player.pos.z));
    if (indoor !== wasIndoor) { A.setIndoor(indoor); wasIndoor = indoor; }
    if (sp > 0.25) {
      player.stepAcc += sp * dt;
      player.bob += sp * dt * 3.4;
      const stride = run ? 0.95 : 0.72;
      if (player.stepAcc > stride) { player.stepAcc = 0; A.footstep(indoor, run); }
    } else player.bob *= 0.9;
    const bobY = Math.sin(player.bob * 2) * 0.035 * Math.min(1, sp / 2);
    const bobX = Math.cos(player.bob) * 0.02 * Math.min(1, sp / 2);

    camera.position.set(player.pos.x, player.pos.y + bobY, player.pos.z);
    camera.rotation.set(0, 0, 0, 'YXZ');
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw; camera.rotation.x = player.pitch; camera.rotation.z = bobX * 0.3;

    // torch: sway lag + flicker
    torch.target.position.x += ((-bobX * 6) - torch.target.position.x) * Math.min(1, dt * 6);
    let ti = torchOn ? torchBase : 0;
    if (state.flicker > 0) { state.flicker -= dt; ti *= Math.random() < 0.45 ? 0.05 : 1; }
    torch.intensity = ti;

    // story triggers
    if (state.stage === 2 && !state.enteredH2 && inside(interiors[1], player.pos.x, player.pos.z)) {
      state.enteredH2 = true; A.creak(H2.x1, 1, -6);
      doorPivot.userData.swing = 1;
    }
    if (doorPivot.userData.swing) { doorPivot.rotation.y += (-1.15 - doorPivot.rotation.y) * Math.min(1, dt * 1.5); }
    if (state.stage === 3) {
      if (clock.elapsedTime >= state.whisperNext) {
        const dur = A.whisperAt(H5.x1 - 1.4, 1.5, -10);
        state.whisperNext = clock.elapsedTime + dur + 2.8 + Math.random() * 2;
      }
      if (clock.elapsedTime >= state.heartNext) { A.heartbeat(); state.heartNext = clock.elapsedTime + 1.05; }
      if (!state.inH5 && inside(interiors[4], player.pos.x, player.pos.z)) enterH5();
    }
    if (state.inH5 && recorder.visible) ledLight.intensity = (Math.sin(clock.elapsedTime * 6) > 0 ? 0.6 : 0.1);
    led.visible = recorder.visible && Math.sin(clock.elapsedTime * 6) > 0;

    // first-time hints by proximity
    if (state.stage === 0 && player.pos.z < 14) setObjective(1);

    // interaction prompt
    focused = state.paused ? null : findFocus();
    const pr = $('#prompt');
    if (focused) { pr.querySelector('span').textContent = focused.verb; pr.hidden = false; } else pr.hidden = true;
    $('#btn-use').classList.toggle('ready', !!focused);

    // dust follows the player
    dust.position.set(player.pos.x, player.pos.y, player.pos.z);
    dust.rotation.y += dt * 0.02;

    // audio listener
    camera.getWorldDirection(v3);
    A.setListener(camera.position, v3);
  }

  // Adaptive resolution: keep the frame rate up on weaker phones/tablets.
  const perf = { frames: 0, time: 0, ratio: renderer.getPixelRatio(), min: 0.6 };
  function adapt(dt) {
    perf.frames++; perf.time += dt;
    if (perf.time < 2) return;
    const fps = perf.frames / perf.time; perf.frames = 0; perf.time = 0;
    let next = perf.ratio;
    if (fps < 40 && perf.ratio > perf.min) next = Math.max(perf.min, perf.ratio - 0.2);
    else if (fps > 57 && perf.ratio < Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2)) next = perf.ratio + 0.1;
    if (next !== perf.ratio) { perf.ratio = next; renderer.setPixelRatio(next); resize(); }
    perf.fps = Math.round(fps);
  }

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    if (state.started && !state.paused && !state.ended) adapt(dt);
    if (state.started && !state.paused && !state.ended) update(dt);
    renderer.render(scene, camera);
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 85 : 72; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  // initial camera for the title screen
  camera.position.copy(player.pos); camera.rotation.order = 'YXZ';

  // ================= Start / pause =================
  document.body.classList.toggle('touch', isTouch);
  $('#hint-desktop').hidden = isTouch; $('#hint-touch').hidden = !isTouch;
  $('#btn-start').addEventListener('click', () => {
    A.init();
    // crickets in the palm grove
    [[-8, 1, 30], [7, 1, 36], [-10, 1, 20], [10, 1, 22], [-3, 1, 44]].forEach((p) => A.addCricket(...p));
    $('#start').hidden = true; $('#hud').hidden = false;
    state.started = true; clock.getDelta();
    if (!isTouch && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
    setTimeout(() => sub('سيارته عند الوادي من ثلاثة أيام. الشرطة تقول سافر… خلفان ما يسافر بدون ما يقول.', 6, 'مريم (مكالمة)'), 900);
    setObjective(0); renderNotebook();
  });
  $('#btn-again').addEventListener('click', () => location.reload());
  document.addEventListener('visibilitychange', () => { if (document.hidden) A.suspend(); else A.resume(); });

  frame();

  // Test/debug hook (used by automated checks; harmless for players)
  window.__otd = {
    state, items, player, perf,
    tp(x, z, yaw) { player.pos.x = x; player.pos.z = z; if (yaw != null) player.yaw = yaw; },
    interact: tryInteract, focus: () => focused && focused.id,
  };
})();
