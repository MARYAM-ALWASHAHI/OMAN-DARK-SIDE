/* OMAN: THE DARK SIDE — game runtime (phones & iPads).
 * Player (first person on foot), vehicle (third-person chase camera), NPCs, mission system,
 * map with fast travel, notebook, deductions, save/load, touch controls.
 */
(function () {
  'use strict';
  const OTD = window.OTD, A = window.OTDAudio, $ = (s) => document.querySelector(s);
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const fmt = (n) => Math.round(n).toLocaleString('ar-OM');
  const { clamp } = OTD.math;

  // ================= Quality =================
  const DPR = window.devicePixelRatio || 1;
  const QUALITY = {
    ultra: { tex: 4, dpr: Math.min(DPR, 3), moon: 2048, spot: 1024, aa: true },
    high: { tex: 2, dpr: Math.min(DPR, 2), moon: 2048, spot: 1024, aa: true },
    medium: { tex: 1, dpr: Math.min(DPR, 1.25), moon: 1024, spot: 512, aa: false },
  };
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }, del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
  let qName = (navigator.deviceMemory && navigator.deviceMemory < 4) ? 'high' : 'ultra';
  if (QUALITY[store.get('otd-quality')]) qName = store.get('otd-quality');
  const Q = QUALITY[qName];
  const settings = Object.assign({ sens: 1, vol: 1 }, JSON.parse(store.get('otd-settings') || '{}'));

  // ================= Renderer / scene =================
  const canvas = $('#scene');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.aa, powerPreference: 'high-performance' }); }
  catch (e) { $('#nogl').hidden = false; $('#start').hidden = true; return; }
  renderer.setPixelRatio(Q.dpr);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c111b, 0.016);
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 1400); scene.add(camera);

  OTD.buildWorld(scene, Q, renderer);
  const M = OTD.M, L = OTD.L, AN = OTD.anchors;

  // ---- sky, stars, moon, far ridges ----
  {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#03050a'); gr.addColorStop(0.6, '#080d19'); gr.addColorStop(1, '#141b2c'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1200, 24, 12), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false })));
    const R = OTD.math.mulberry(99), pts = [];
    for (let i = 0; i < 2200; i++) { const th = R() * Math.PI * 2, ph = Math.acos(R() * 0.9 + 0.1); pts.push(1100 * Math.sin(ph) * Math.cos(th), 1100 * Math.cos(ph), 1100 * Math.sin(ph) * Math.sin(th)); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));
    const mc = document.createElement('canvas'); mc.width = mc.height = 128; const mg = mc.getContext('2d');
    const mgr = mg.createRadialGradient(64, 64, 6, 64, 64, 64); mgr.addColorStop(0, '#f0f0ff'); mgr.addColorStop(0.18, '#e1e6fa'); mgr.addColorStop(0.24, 'rgba(160,180,230,0.35)'); mgr.addColorStop(1, 'rgba(100,120,200,0)'); mg.fillStyle = mgr; mg.fillRect(0, 0, 128, 128);
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(mc), fog: false, depthWrite: false })); moon.scale.set(150, 150, 1); moon.position.set(-420, 480, -650); scene.add(moon);
    const rm = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false, toneMapped: false });
    // far ridgeline: broad, overlapping low-poly masses read as a mountain range, not pyramids
    for (let i = 0; i < 90; i++) { const a = (i / 90) * Math.PI * 2 + R() * 0.05, d = 820 + R() * 160, h = 50 + R() * 110 + (Math.sin(a * 3 + 1) > 0.4 ? 70 : 0); const cn = new THREE.Mesh(new THREE.ConeGeometry(180 + R() * 160, h, 7, 1), rm); cn.scale.z = 0.5 + R() * 0.4; cn.position.set(Math.cos(a) * d, h / 2 - 12, Math.sin(a) * d); cn.rotation.y = a + R(); scene.add(cn); }
  }

  // ---- lights ----
  scene.add(new THREE.HemisphereLight(0x2c3c64, 0x1a120b, 0.55));
  const moonL = new THREE.DirectionalLight(0x9fb4e0, 0.45);
  moonL.castShadow = true; moonL.shadow.mapSize.set(Q.moon, Q.moon); moonL.shadow.bias = -0.0008;
  Object.assign(moonL.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 });
  scene.add(moonL, moonL.target);
  const torch = new THREE.SpotLight(0xffe0b0, 2.6, 30, 0.5, 0.55, 1.6);
  torch.castShadow = true; torch.shadow.mapSize.set(Q.spot, Q.spot); torch.shadow.bias = -0.0005;
  torch.position.set(0.18, -0.2, 0.1); camera.add(torch); camera.add(torch.target); torch.target.position.set(0, -0.15, -5);

  // ---- player car + static vehicles ----
  const car = { obj: OTD.makeCar(0xd9d6cf), x: AN.carStart[0], z: AN.carStart[1], yaw: Math.PI, speed: 0, inside: false };
  scene.add(car.obj);
  const head = new THREE.SpotLight(0xfff0d8, 3.2, 70, 0.42, 0.45, 1.3); head.position.set(0, 1, 2.3); head.target.position.set(0, -1, 14); car.obj.add(head); car.obj.add(head.target); head.visible = false;
  function staticCar(color, at, yaw, cond) {
    const o = OTD.makeCar(color), x = at[0], z = at[1]; o.position.set(x, OTD.terrainH(x, z), z); o.rotation.y = yaw; scene.add(o);
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw)); const hw = (1.9 * c + 4.6 * s) / 2, hd = (1.9 * s + 4.6 * c) / 2;
    const col = OTD.addCollider(x - hw, x + hw, z - hd, z + hd); return { o, col, cond };
  }
  const statics = [staticCar(0x8b9096, AN.khalfanCar, 0.6, () => !state.done.includes('m15')), staticCar(0xe9e6df, AN.pickup, Math.PI / 2, () => state.done.includes('m09') && !state.done.includes('m15'))];

  // ================= State & save =================
  const SAVE = 'otd-save-v2';
  const fresh = () => ({ done: [], active: null, progress: {}, found: {}, clues: {}, flags: {}, discovered: ['town'], pos: [AN.playerStart[0], AN.playerStart[1]], yaw: 0, car: [car.x, car.z, car.yaw] });
  let state = fresh();
  function save() { state.pos = [player.x, player.z]; state.yaw = player.yaw; state.car = [car.x, car.z, car.yaw]; store.set(SAVE, JSON.stringify(state)); }
  function load() { try { const s = JSON.parse(store.get(SAVE)); if (s && s.done) { state = Object.assign(fresh(), s); return true; } } catch (e) { /* corrupted save */ } return false; }

  // ================= NPCs =================
  const npcObjs = {};
  function anchorPos(at, dx = 0, dz = 0) { const p = Array.isArray(at) ? at : AN[at]; if (!p) { console.warn('missing anchor', at); return [0, 0]; } return [p[0] + dx, p[1] + dz]; }
  Object.entries(OTD.NPCS).forEach(([id, n]) => {
    const o = OTD.makePerson(n.kind); const [x, z] = anchorPos(n.at, n.dx, n.dz);
    o.position.set(x, OTD.terrainH(x, z), z); o.rotation.y = n.face || 0; scene.add(o);
    const mark = makeMarkSprite(); mark.position.set(0, 2.25, 0); o.add(mark); mark.visible = false;
    npcObjs[id] = { o, x, z, mark, data: n, phase: Math.random() * 6 };
  });
  function npcVisible(id) {
    const n = OTD.NPCS[id];
    if (n.flag && !state.flags[n.flag]) return false;
    if (n.after && !state.done.includes(n.after)) return false;
    if (n.until && state.done.includes(n.until)) return false;
    return true;
  }
  function makeMarkSprite() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#cfa878'; g.beginPath(); g.arc(32, 32, 22, 0, 7); g.fill(); g.fillStyle = '#17120c'; g.font = 'bold 36px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 32, 34);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true })); s.scale.set(0.45, 0.45, 1); return s;
  }

  // ---- objective beacon (light column visible from far away) ----
  const beacon = (() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(207,168,120,0)'); gr.addColorStop(1, 'rgba(207,168,120,0.85)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 60, 8, 1, true), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    m.visible = false; scene.add(m); return m;
  })();

  // ================= Player & input =================
  const player = { x: 0, z: 0, y: 1.65, yaw: 0, pitch: 0, vx: 0, vz: 0, bob: 0, acc: 0 };
  const keys = {}, move = { x: 0, y: 0 };
  let torchOn = true, running = false, paused = false, focused = null, nearCar = false;
  addEventListener('keydown', (e) => { keys[e.code] = true; if (!started || paused) return; if (e.code === 'KeyE') interact(); if (e.code === 'KeyF') toggleTorch(); if (e.code === 'KeyC') toggleCar(); if (e.code === 'KeyM') openPanel('map'); });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  function look(dx, dy) { player.yaw -= dx * settings.sens; player.pitch = clamp(player.pitch - dy * settings.sens, -1.3, 1.3); }
  let drag = null;
  canvas.addEventListener('mousedown', (e) => { if (!isTouch) drag = [e.clientX, e.clientY]; });
  addEventListener('mouseup', () => { drag = null; });
  addEventListener('mousemove', (e) => { if (drag && !paused) { look((e.clientX - drag[0]) * 0.004, (e.clientY - drag[1]) * 0.004); drag = [e.clientX, e.clientY]; } });

  const ts = { joy: null, look: null, ox: 0, oy: 0, lx: 0, ly: 0 }, joy = $('#joy'), knob = $('#joy i'), tz = $('#touchzone');
  tz.addEventListener('pointerdown', (e) => {
    if (!started || paused) return; tz.setPointerCapture(e.pointerId);
    if (e.clientX < innerWidth * 0.45 && ts.joy == null) { ts.joy = e.pointerId; ts.ox = e.clientX; ts.oy = e.clientY; joy.style.left = e.clientX + 'px'; joy.style.top = e.clientY + 'px'; joy.hidden = false; }
    else if (ts.look == null) { ts.look = e.pointerId; ts.lx = e.clientX; ts.ly = e.clientY; }
  });
  tz.addEventListener('pointermove', (e) => {
    if (e.pointerId === ts.joy) { let dx = e.clientX - ts.ox, dy = e.clientY - ts.oy; const m = Math.hypot(dx, dy), R = 56; if (m > R) { dx *= R / m; dy *= R / m; } knob.style.transform = `translate(${dx}px, ${dy}px)`; move.x = dx / R; move.y = -dy / R; running = m > R * 0.95; }
    else if (e.pointerId === ts.look) { look((e.clientX - ts.lx) * 0.006, (e.clientY - ts.ly) * 0.006); ts.lx = e.clientX; ts.ly = e.clientY; }
  });
  const endT = (e) => { if (e.pointerId === ts.joy) { ts.joy = null; move.x = move.y = 0; joy.hidden = true; knob.style.transform = ''; running = false; } if (e.pointerId === ts.look) ts.look = null; };
  tz.addEventListener('pointerup', endT); tz.addEventListener('pointercancel', endT);
  const haptic = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not supported (iOS) */ } };

  $('#btn-use').addEventListener('click', interact);
  $('#btn-torch').addEventListener('click', toggleTorch);
  $('#btn-car').addEventListener('click', toggleCar);
  function toggleTorch() { torchOn = !torchOn; A.click(); }

  // ================= Collision / surface helpers =================
  function inside(r, x, z) { return x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ; }
  function indoorAt(x, z) { return OTD.interiors.some((r) => inside(r, x, z)); }
  function surfaceAt(x, z) {
    if (indoorAt(x, z)) return 'floor';
    const ri = OTD.roadInfo(x, z); if (ri.d < 0.3) return ri.kind === 'asphalt' ? 'asphalt' : 'gravel';
    if ((x > 180 && z > 160) || Math.hypot(x - L.grove.x, z - L.grove.z) < 35) return 'sand';
    return 'gravel';
  }

  // ================= Car =================
  function toggleCar() {
    if (paused) return;
    if (car.inside) {
      // exit on the driver's side if free
      const sx = Math.cos(car.yaw) * 2.2, sz = -Math.sin(car.yaw) * 2.2;
      const opts = [[car.x + sx, car.z + sz], [car.x - sx, car.z - sz], [car.x - Math.sin(car.yaw) * 3.5, car.z - Math.cos(car.yaw) * 3.5]];
      const spot = opts.find(([x, z]) => !OTD.blocked(x, z, 0.35)); if (!spot || Math.abs(car.speed) > 2) return;
      car.inside = false; car.speed = 0; player.x = spot[0]; player.z = spot[1]; player.yaw = car.yaw + Math.PI; A.engineStop(); A.door(); head.visible = false; save();
    } else if (nearCar) { car.inside = true; A.door(); setTimeout(() => A.engineStart(), 350); head.visible = true; }
    updateButtons();
  }
  function updateCar(dt) {
    const thr = clamp(move.y + (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), -1, 1), st = clamp(move.x + (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), -1, 1);
    const ri = OTD.roadInfo(car.x, car.z), off = ri.d > 0.5, max = off ? 15 : 24;
    if (thr > 0) car.speed += thr * (off ? 6 : 8) * dt;
    else if (thr < 0) car.speed += car.speed > 0.5 ? thr * 16 * dt : thr * 4 * dt;
    car.speed -= car.speed * (off ? 0.55 : 0.22) * dt; car.speed = clamp(car.speed, -6, max);
    if (Math.abs(car.speed) < 0.05 && thr === 0) car.speed = 0;
    car.yaw -= st * 1.5 * clamp(car.speed / 7, -1, 1) * dt;
    const nx = car.x + Math.sin(car.yaw) * car.speed * dt, nz = car.z + Math.cos(car.yaw) * car.speed * dt;
    if (OTD.blocked(nx, nz, 1.5)) { if (Math.abs(car.speed) > 4) haptic(30); car.speed *= -0.25; } else { car.x = nx; car.z = nz; }
    A.engineUpdate(Math.abs(car.speed) / 24, off);
    car.obj.userData.wheels.forEach((w) => { w.rotation.x += car.speed * dt / 0.42; });
  }
  function placeCar() {
    const fx = Math.sin(car.yaw) * 1.5, fz = Math.cos(car.yaw) * 1.5, rx = Math.cos(car.yaw) * 0.9, rz = -Math.sin(car.yaw) * 0.9;
    const hf = OTD.terrainH(car.x + fx, car.z + fz), hb = OTD.terrainH(car.x - fx, car.z - fz), hl = OTD.terrainH(car.x - rx, car.z - rz), hr = OTD.terrainH(car.x + rx, car.z + rz);
    car.obj.position.set(car.x, (hf + hb + hl + hr) / 4, car.z);
    car.obj.rotation.set(0, 0, 0); car.obj.rotateY(car.yaw); car.obj.rotateX(-Math.atan2(hf - hb, 3)); car.obj.rotateZ(Math.atan2(hr - hl, 1.8));
  }

  // ================= Missions =================
  const MIS = {}; OTD.MISSIONS.forEach((m, i) => { MIS[m.id] = m; m.index = i; });
  const MAIN = OTD.MISSIONS.filter((m) => !m.side);
  function available(m) {
    if (state.done.includes(m.id)) return false;
    if (m.side) return state.done.includes(m.after);
    const i = MAIN.indexOf(m); return i === 0 || state.done.includes(MAIN[i - 1].id);
  }
  const curMission = () => state.active && MIS[state.active];
  const curStep = () => { const m = curMission(); return m ? m.steps[state.progress[m.id] || 0] : null; };
  let spawned = [], ev = null;

  function startMission(id) {
    if (state.active === id) return;
    clearSpawned(); stopEvent();
    state.active = id; if (state.progress[id] == null) state.progress[id] = 0;
    const m = MIS[id];
    if (!m.side && (m.index === 0 || MAIN[MAIN.indexOf(m) - 1].ch !== m.ch)) showCard(OTD.CHAPTERS[m.ch], m.title);
    else showCard(m.side ? 'مهمة جانبية' : OTD.CHAPTERS[m.ch], m.title);
    enterStep(); save();
  }
  function clearSpawned() { spawned.forEach((s) => scene.remove(s.obj)); spawned = []; }
  function enterStep() {
    clearSpawned(); stopEvent();
    const s = curStep(); if (!s) return;
    setObjective(s.text);
    if (s.type === 'find') {
      const found = state.found[state.active] || [];
      s.items.forEach((it) => {
        if (found.includes(it.id)) return;
        const [x, z] = anchorPos(it.at, it.dx, it.dz), y = OTD.terrainH(x, z) + (it.y || 0) + 0.01;
        const obj = OTD.makeProp(it.prop); obj.position.set(x, y, z); obj.rotation.y = Math.random() * 6; scene.add(obj);
        spawned.push({ obj, it, x, z });
      });
    }
    if (s.type === 'deduce') setTimeout(() => { if (curStep() === s) openDeduce(s); }, 600);
    if (s.type === 'event') startEvent(s);
  }
  function stepTarget() {
    const s = curStep(); if (!s) return null;
    if (s.type === 'goto') return anchorPos(s.at, s.dx, s.dz);
    if (s.type === 'talk') { const n = npcObjs[s.npc]; return [n.x, n.z]; }
    if (s.type === 'find') { const left = spawned.filter((p) => !p.taken); if (!left.length) return null; let best = left[0], bd = 1e9; left.forEach((p) => { const d = Math.hypot(p.x - player.x, p.z - player.z); if (d < bd) { bd = d; best = p; } }); return [best.x, best.z]; }
    if (s.type === 'event' && ev && ev.target) return ev.target;
    return null;
  }
  function completeStep() {
    const m = curMission(); if (!m) return;
    state.progress[m.id] = (state.progress[m.id] || 0) + 1;
    if (state.progress[m.id] >= m.steps.length) return completeMission(m);
    A.pickup(); enterStep(); save();
  }
  function completeMission(m) {
    clearSpawned(); stopEvent();
    state.done.push(m.id); state.active = null; save();
    A.success(); haptic(40);
    setObjective(null);
    if (m.ending) { showEnding(m.ending); return; }
    const next = OTD.MISSIONS.find((x) => available(x) && !x.side);
    showBanner('اكتملت المهمة', m.title, next ? 'التالية: ' + next.title : 'افتح الملفات لاختيار مهمة');
    if (next) setTimeout(() => { if (!state.active) startMission(next.id); }, 3200);
  }
  function addClue(id, title, desc) { state.clues[id] = { title, desc, m: state.active }; toast(title, desc); }

  // ---- interaction ----
  const v3 = new THREE.Vector3();
  function findFocus() {
    if (car.inside) return null;
    camera.getWorldDirection(v3); const fx = v3.x, fz = v3.z, fl = Math.hypot(fx, fz) || 1;
    let best = null, bd = 1e9;
    const consider = (kind, ref, x, z, r) => { const dx = x - player.x, dz = z - player.z, d = Math.hypot(dx, dz); if (d > r) return; const dot = (dx * fx + dz * fz) / (d * fl || 1); if (d > 1.1 && dot < 0.6) return; if (d < bd) { bd = d; best = { kind, ref }; } };
    spawned.forEach((p) => { if (!p.taken) consider('item', p, p.x, p.z, 2.3); });
    Object.entries(npcObjs).forEach(([id, n]) => { if (n.o.visible) consider('npc', id, n.x, n.z, 2.6); });
    return best;
  }
  function interact() {
    if (paused || !focused) return;
    haptic(15);
    if (focused.kind === 'item') {
      const p = focused.ref; p.taken = true; scene.remove(p.obj);
      (state.found[state.active] = state.found[state.active] || []).push(p.it.id);
      addClue(p.it.id, p.it.title, p.it.desc); A.pickup(); save();
      const s = curStep();
      if (spawned.every((x) => x.taken)) {
        if (s.onDone) state.flags[s.onDone] = true;
        if (s.play) { paused = true; playLines(s.play, true, () => { paused = false; completeStep(); }); } else setTimeout(completeStep, 900);
      }
    } else if (focused.kind === 'npc') {
      const id = focused.ref, s = curStep();
      if (s && s.type === 'talk' && s.npc === id) openDialogue(id, s.lines, s.choices, (choice) => {
        if (choice && choice.retry) return;
        if (s.gives) addClue(s.gives.id, s.gives.title, s.gives.desc);
        completeStep();
      });
      else openDialogue(id, [[OTD.NPCS[id].name, idleLine(id)]], null, () => {});
    }
  }
  function idleLine(id) {
    const lines = { maryam: 'أي خبر عن خلفان؟', saif: 'السوق هادي الليلة.', nasser: 'خلّك حذر في الطرق بالليل.', abuhilal: 'اجلس، القهوة حارة.', nora: 'أسجّل كل شي. يمكن ينفع.', umsalim: 'الله يحفظك يا ولدي.', juma: 'وش تبي؟', salem: 'الجو بارد فوق بالليل.', khalfan: 'شكراً… شكراً.' };
    return lines[id] || 'مرحبا.';
  }

  // ================= Events (horror, restrained) =================
  function startEvent(s) {
    const [x, z] = anchorPos(s.at, s.dx, s.dz), y = OTD.terrainH(x, z);
    ev = { s, x, z, y, t: 0, phase: 0, target: [x, z] };
    if (s.kind === 'whisper') { A.fadeAmbience(0.15, 4); A.drone(0.15, 6); ev.next = 0; ev.until = anchorPos(s.until); ev.target = ev.until; }
    if (s.kind === 'figure') { const g = OTD.makeGhost(); g.position.set(x, y, z); scene.add(g); ev.ghost = g; }
    if (s.kind === 'lights') { ev.glows = []; for (let i = 0; i < 3; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffc080, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.position.set(x + (i - 1) * 5, y + 2.5, z + (i % 2) * 4); sp.scale.set(5, 5, 1); scene.add(sp); ev.glows.push(sp); } }
  }
  function stopEvent() {
    if (!ev) return;
    if (ev.ghost) scene.remove(ev.ghost);
    if (ev.glows) ev.glows.forEach((g) => scene.remove(g));
    A.fadeAmbience(1, 5); A.drone(0, 3); ev = null;
  }
  function finishEvent() { const s = ev && ev.s; stopEvent(); if (s && curStep() === s) completeStep(); }
  function updateEvent(dt) {
    if (!ev) return; ev.t += dt; const s = ev.s, d = Math.hypot(player.x - ev.x, player.z - ev.z);
    if (s.kind === 'whisper') {
      if (ev.t >= ev.next) { const dur = A.whisperAt(ev.x, ev.y + 1.5, ev.z); ev.next = ev.t + dur + 3 + Math.random() * 2; if (ev.phase === 0) { sub('(همس خافت… من بيت قريب)', 4); ev.phase = 1; } }
      if (Math.floor(ev.t) % 1 === 0 && ev.t % 1 < dt) A.heartbeat();
      if (Math.hypot(player.x - ev.until[0], player.z - ev.until[1]) < (s.r || 4)) { sub('(توقف الهمس.)', 3); finishEvent(); }
    } else if (s.kind === 'count') {
      if (ev.phase === 0 && d < 30) { ev.phase = 1; ev.t = 0; A.fadeAmbience(0.1, 2); A.drone(0.12, 3); }
      if (ev.phase === 1) {
        const words = ['واحد…', 'اثنين…', 'ثلاثة…', 'أربعة…', 'خمسة…', 'ستة…', 'سبعة…', '…ثمانية'];
        const i = Math.floor(ev.t / 1.1);
        if (i < words.length && ev.last !== i) { ev.last = i; sub('صوت خافت يعدّ: ' + words[i], 1.4); A.whisperAt(ev.x, ev.y + 1, ev.z); }
        if (ev.t > words.length * 1.1 + 1.5) finishEvent();
      }
    } else if (s.kind === 'footsteps') {
      if (ev.phase === 0 && d < (s.r || 4) + 2) { ev.phase = 1; ev.t = 0; A.fadeAmbience(0.1, 1.5); A.followSteps(() => { camera.getWorldDirection(v3); return { x: player.x - v3.x * 5, y: 0.2, z: player.z - v3.z * 5 }; }, 6); }
      if (ev.phase === 1 && ev.t > 1.2 && !ev.said) { ev.said = true; sub('(خطوات خلفك… ثم لا شيء.)', 4); }
      if (ev.phase === 1 && ev.t > 4.5) finishEvent();
    } else if (s.kind === 'lights') {
      ev.glows.forEach((g, i) => { g.material.opacity = Math.random() < 0.2 ? 0.1 : 0.9; g.scale.setScalar(4 + Math.sin(ev.t * 3 + i) * 0.6); });
      if (ev.t > 0.5 && !ev.said) { ev.said = true; sub('(أضواء تشتعل وتنطفئ… ثم تختفي كلها مرة واحدة.)', 5); A.drone(0.1, 2); }
      if (ev.t > 6) finishEvent();
    } else if (s.kind === 'figure') {
      const mat = ev.ghost.userData.mat;
      if (ev.phase === 0) { mat.opacity = Math.min(0.5, mat.opacity + dt * 0.25); if (d < 45 && mat.opacity > 0.3) { ev.phase = 1; ev.t = 0; A.drone(0.12, 2); } }
      else if (ev.phase === 1) { if ((d < 16 && ev.t > 1.8) || ev.t > 6) { ev.phase = 2; ev.t = 0; } }
      else { mat.opacity = Math.max(0, mat.opacity - dt * 0.6); if (mat.opacity <= 0) { sub('(لم يكن هناك أحد.)', 3); finishEvent(); } }
      ev.ghost.lookAt(player.x, ev.ghost.position.y, player.z);
    }
  }

  // ================= UI =================
  let subTimer = 0, toastTimer = 0;
  function sub(text, sec, who) { const el = $('#sub'); el.innerHTML = ''; if (who) { const b = document.createElement('b'); b.textContent = who + ': '; el.appendChild(b); } el.appendChild(document.createTextNode(text)); el.hidden = false; clearTimeout(subTimer); subTimer = setTimeout(() => { el.hidden = true; }, sec * 1000); }
  function toast(t, d) { const el = $('#toast'); el.querySelector('b').textContent = 'دليل جديد: ' + t; el.querySelector('span').textContent = d; el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 6000); }
  function setObjective(text) { const el = $('#objective'); if (!text) { el.hidden = true; return; } el.hidden = false; el.querySelector('.ob-mission').textContent = curMission() ? curMission().title : ''; el.querySelector('.ob-text').textContent = text; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
  function showCard(kicker, title) { const el = $('#card'); el.querySelector('.k').textContent = kicker; el.querySelector('.t').textContent = title; el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); setTimeout(() => { el.hidden = true; }, 3400); }
  function showBanner(k, t, n) { const el = $('#banner'); el.querySelector('.k').textContent = k; el.querySelector('.t').textContent = t; el.querySelector('.n').textContent = n; el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); setTimeout(() => { el.hidden = true; }, 3800); }
  function showEnding(text) { paused = true; $('#ending p').textContent = text; $('#ending').hidden = false; }
  $('#btn-ending').addEventListener('click', () => { $('#ending').hidden = true; paused = false; openPanel('cases'); });

  function playLines(lines, lofi, done) {
    let i = 0;
    (function next() {
      if (i >= lines.length) { setTimeout(done, 400); return; }
      const [who, text] = lines[i++], sec = Math.max(2.6, text.length / 14);
      sub(text, sec, who); A.voice(sec - 0.4, lofi); setTimeout(next, sec * 1000 + 350);
    })();
  }

  // ---- dialogue ----
  function portraitEl(id) {
    const n = OTD.NPCS[id] || {}, box = document.createElement('div'); box.className = 'portrait';
    if (n.portrait) { const img = document.createElement('img'); img.src = '../assets/cast/' + n.portrait + '.jpg'; img.alt = n.name; box.appendChild(img); }
    else { box.textContent = (n.name || '؟').replace('الرقيب ', '').slice(0, 1); box.classList.add('initial'); }
    return box;
  }
  function openDialogue(npcId, lines, choices, done) {
    paused = true; const dlg = $('#dialogue'), n = OTD.NPCS[npcId];
    dlg.querySelector('.who').innerHTML = ''; dlg.querySelector('.who').append(portraitEl(npcId));
    const nm = document.createElement('div'); nm.className = 'nm'; nm.innerHTML = `<b></b><span></span>`; nm.querySelector('b').textContent = n.name; nm.querySelector('span').textContent = n.role; dlg.querySelector('.who').append(nm);
    const textEl = dlg.querySelector('.line'), ch = dlg.querySelector('.choices'), nextBtn = dlg.querySelector('.next');
    dlg.hidden = false; let queue = lines.slice(), picked = null;
    function show() {
      ch.innerHTML = '';
      if (queue.length) { const [who, text] = queue.shift(); textEl.innerHTML = ''; const b = document.createElement('b'); b.textContent = who + ': '; textEl.append(b, document.createTextNode(text)); nextBtn.hidden = false; nextBtn.textContent = 'التالي'; A.voice(Math.min(2.2, text.length / 16), false); return; }
      if (choices && !picked) {
        nextBtn.hidden = true;
        choices.forEach((c) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'choice';
          const ok = !c.req || state.clues[c.req]; b.disabled = !ok;
          b.textContent = c.text + (ok ? '' : ' (تحتاج دليلاً: ' + reqTitle(c.req) + ')');
          b.addEventListener('click', () => { picked = c; if (c.flag) state.flags[c.flag] = true; queue = c.lines.slice(); show(); });
          ch.appendChild(b);
        });
        return;
      }
      dlg.hidden = true; paused = false; done(picked);
    }
    nextBtn.onclick = show; show();
  }
  function reqTitle(id) { for (const m of OTD.MISSIONS) for (const s of m.steps) { if (s.items) for (const it of s.items) if (it.id === id) return it.title; if (s.gives && s.gives.id === id) return s.gives.title; } return id; }

  // ---- deduction ----
  function openDeduce(s) {
    paused = true; const el = $('#deduce'); el.hidden = false;
    el.querySelector('.q').textContent = s.q; const box = el.querySelector('.opts'); box.innerHTML = ''; el.querySelector('.why').hidden = true; el.querySelector('.cont').hidden = true;
    s.options.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.textContent = o;
      b.addEventListener('click', () => {
        if (i === s.answer) { A.success(); box.querySelectorAll('button').forEach((x) => { x.disabled = true; }); b.classList.add('right'); const w = el.querySelector('.why'); w.textContent = s.why; w.hidden = false; el.querySelector('.cont').hidden = false; }
        else { A.wrong(); haptic(60); b.classList.add('wrong'); b.disabled = true; el.querySelector('.why').textContent = 'ليس بالضبط. راجع الدفتر وفكّر في الأدلة.'; el.querySelector('.why').hidden = false; }
      });
      box.appendChild(b);
    });
    el.querySelector('.cont').onclick = () => { el.hidden = true; paused = false; completeStep(); };
    el.querySelector('.nb').onclick = () => openPanel('notebook', true);
  }

  // ---- panels: cases, map, notebook, settings ----
  function openPanel(name, overDeduce) {
    if (!started) return;
    if (!overDeduce && !$('#dialogue').hidden) return;
    document.querySelectorAll('.panel').forEach((p) => { p.hidden = true; });
    const p = $('#panel-' + name); p.hidden = false; paused = true;
    if (name === 'cases') renderCases(); if (name === 'map') renderMap(); if (name === 'notebook') renderNotebook(); if (name === 'settings') renderSettings();
  }
  function closePanels() { document.querySelectorAll('.panel').forEach((p) => { p.hidden = true; }); paused = !$('#deduce').hidden || !$('#dialogue').hidden || !$('#ending').hidden; }
  document.querySelectorAll('.panel .close').forEach((b) => b.addEventListener('click', closePanels));
  $('#btn-cases').addEventListener('click', () => openPanel('cases'));
  $('#btn-map').addEventListener('click', () => openPanel('map'));
  $('#btn-notes').addEventListener('click', () => openPanel('notebook'));
  $('#btn-settings').addEventListener('click', () => openPanel('settings'));

  function renderCases() {
    const list = $('#cases-list'); list.innerHTML = '';
    const groups = [[OTD.CHAPTERS[0], (m) => !m.side && m.ch === 0], [OTD.CHAPTERS[1], (m) => !m.side && m.ch === 1], [OTD.CHAPTERS[2], (m) => !m.side && m.ch === 2], ['مهام جانبية', (m) => m.side]];
    const done = state.done.length;
    $('#cases-count').textContent = `${fmt(done)} من ${fmt(OTD.MISSIONS.length)}`;
    groups.forEach(([title, f]) => {
      const h = document.createElement('h3'); h.textContent = title; list.appendChild(h);
      OTD.MISSIONS.filter(f).forEach((m) => {
        const st = state.done.includes(m.id) ? 'done' : state.active === m.id ? 'active' : available(m) ? 'open' : 'locked';
        const b = document.createElement('button'); b.type = 'button'; b.className = 'case ' + st; b.disabled = st === 'locked' || st === 'done';
        const label = { done: 'مكتملة', active: 'جارية', open: 'متاحة', locked: 'مقفلة' }[st];
        b.innerHTML = '<span class="ct"></span><span class="cp"></span><span class="cb"></span><span class="cs"></span>';
        b.querySelector('.ct').textContent = m.title; b.querySelector('.cp').textContent = m.place; b.querySelector('.cb').textContent = st === 'locked' ? 'تُفتح بعد إكمال المهمة السابقة.' : m.brief; b.querySelector('.cs').textContent = label;
        b.addEventListener('click', () => { closePanels(); startMission(m.id); });
        list.appendChild(b);
      });
    });
  }

  // map: pre-rendered terrain image + live overlay
  const mapBase = (() => {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const img = g.createImageData(S, S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = (i / S - 0.5) * 1000, z = (j / S - 0.5) * 1000, h = OTD.terrainH(x, z), hx = OTD.terrainH(x + 2, z);
      const shade = clamp(0.55 + (h - hx) * 0.25 + h * 0.006, 0.15, 1);
      const dune = OTD.math.smooth(170, 260, x) * OTD.math.smooth(150, 230, z);
      const k = (j * S + i) * 4; img.data[k] = (70 + dune * 50) * shade + 20; img.data[k + 1] = (62 + dune * 25) * shade + 18; img.data[k + 2] = 52 * shade + 22; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  })();
  const toMap = (x, z, S) => [(x / 1000 + 0.5) * S, (z / 1000 + 0.5) * S];
  function renderMap() {
    const cv = $('#map-canvas'), S = cv.width = cv.height = Math.min(1024, Math.round(cv.clientWidth * (window.devicePixelRatio || 1)) || 512), g = cv.getContext('2d');
    g.drawImage(mapBase, 0, 0, S, S);
    g.lineCap = 'round';
    OTD.ROADS.forEach((r) => { g.lineWidth = (r.kind === 'asphalt' ? 4 : 2.4) * S / 512; g.strokeStyle = r.kind === 'asphalt' ? 'rgba(25,25,28,0.95)' : 'rgba(150,130,105,0.9)'; g.beginPath(); r.pts.forEach(([x, z], i) => { const [mx, mz] = toMap(x, z, S); if (i) g.lineTo(mx, mz); else g.moveTo(mx, mz); }); g.stroke(); });
    // locations
    g.textAlign = 'center'; g.font = `600 ${Math.round(13 * S / 512)}px -apple-system, system-ui, sans-serif`;
    Object.entries(L).forEach(([k, l]) => {
      const [mx, mz] = toMap(l.x, l.z, S), known = state.discovered.includes(k);
      g.fillStyle = known ? '#cfa878' : 'rgba(200,200,200,0.5)'; g.beginPath(); g.arc(mx, mz, 5 * S / 512, 0, 7); g.fill();
      g.fillStyle = known ? '#f2ebdf' : 'rgba(220,220,220,0.55)'; g.fillText(known ? l.name : '؟', mx, mz - 9 * S / 512);
    });
    const t = stepTarget(); if (t) { const [mx, mz] = toMap(t[0], t[1], S); g.strokeStyle = '#e0533f'; g.lineWidth = 3 * S / 512; g.beginPath(); g.arc(mx, mz, 10 * S / 512, 0, 7); g.stroke(); }
    const px = car.inside ? car.x : player.x, pz = car.inside ? car.z : player.z, [mx, mz] = toMap(px, pz, S), yaw = car.inside ? car.yaw : player.yaw + Math.PI;
    g.save(); g.translate(mx, mz); g.rotate(-yaw); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, 10 * S / 512); g.lineTo(-6 * S / 512, -6 * S / 512); g.lineTo(6 * S / 512, -6 * S / 512); g.closePath(); g.fill(); g.restore();
    const list = $('#travel-list'); list.innerHTML = '';
    Object.entries(L).filter(([k]) => state.discovered.includes(k)).forEach(([k, l]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip-btn'; b.textContent = l.name;
      b.addEventListener('click', () => fastTravel(k)); list.appendChild(b);
    });
  }
  function fastTravel(k) {
    const l = L[k]; let best = null;
    // nearest point on a road close to the location, so the car fits
    for (let a = 0; a < 24 && !best; a++) for (let r = 8; r < 40 && !best; r += 4) { const x = l.x + Math.cos(a * 0.26) * r, z = l.z + Math.sin(a * 0.26) * r; if (!OTD.blocked(x, z, 2.4) && OTD.roadInfo(x, z).d < 6) best = [x, z]; }
    if (!best) for (let r = 8; r < 60 && !best; r += 3) for (let a = 0; a < 24 && !best; a++) { const x = l.x + Math.cos(a * 0.26) * r, z = l.z + Math.sin(a * 0.26) * r; if (!OTD.blocked(x, z, 2.4)) best = [x, z]; }
    if (!best) return;
    if (car.inside) { car.x = best[0]; car.z = best[1]; car.speed = 0; }
    else { player.x = best[0]; player.z = best[1]; car.x = best[0] + 3.5; car.z = best[1] + 1; if (OTD.blocked(car.x, car.z, 1.6)) { car.x = best[0]; car.z = best[1] - 4; } car.speed = 0; }
    closePanels(); save(); sub('وصلت إلى ' + l.name, 2.5);
  }

  function renderNotebook() {
    const box = $('#notes-list'); box.innerHTML = '';
    const byM = {}; Object.entries(state.clues).forEach(([id, c]) => { (byM[c.m || 'x'] = byM[c.m || 'x'] || []).push(c); });
    if (!Object.keys(byM).length) { box.innerHTML = '<p class="empty">لا توجد أدلة بعد.</p>'; return; }
    Object.entries(byM).forEach(([mid, cs]) => {
      const h = document.createElement('h3'); h.textContent = MIS[mid] ? MIS[mid].title : 'أخرى'; box.appendChild(h);
      cs.forEach((c) => { const d = document.createElement('div'); d.className = 'clue'; const b = document.createElement('b'); b.textContent = c.title; const p = document.createElement('p'); p.textContent = c.desc; d.append(b, p); box.appendChild(d); });
    });
    $('#notes-count').textContent = fmt(Object.keys(state.clues).length) + ' دليل';
  }
  function renderSettings() {
    document.querySelectorAll('#q-seg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.q === qName)));
    $('#sens').value = settings.sens; $('#vol').value = settings.vol;
    const r = A.hasReal ? A.hasReal() : []; $('#real-audio').textContent = r.length ? 'تسجيلات حقيقية مفعّلة: ' + r.length : 'لا توجد تسجيلات حقيقية بعد. الأصوات مولّدة.';
  }
  document.querySelectorAll('#q-seg button').forEach((b) => b.addEventListener('click', () => { if (b.dataset.q !== qName && store.set('otd-quality', b.dataset.q)) { save(); location.reload(); } }));
  $('#sens').addEventListener('input', (e) => { settings.sens = +e.target.value; store.set('otd-settings', JSON.stringify(settings)); });
  $('#vol').addEventListener('input', (e) => { settings.vol = +e.target.value; A.setVolume(settings.vol); store.set('otd-settings', JSON.stringify(settings)); });
  $('#reset').addEventListener('click', () => { const c = $('#reset-confirm'); c.hidden = !c.hidden; });
  $('#reset-yes').addEventListener('click', () => { store.del(SAVE); location.reload(); });

  function updateButtons() {
    $('#btn-car').hidden = !(car.inside || nearCar);
    $('#btn-car').textContent = car.inside ? 'انزل' : 'اركب';
    $('#btn-use').hidden = car.inside; $('#btn-torch').hidden = car.inside;
    document.body.classList.toggle('driving', car.inside);
  }

  // ================= Main loop =================
  const clock = new THREE.Clock();
  let wasIndoor = false, started = false, saveT = 0;
  const perf = { f: 0, t: 0, ratio: Q.dpr };
  function adapt(dt) { perf.f++; perf.t += dt; if (perf.t < 2) return; const fps = perf.f / perf.t; perf.f = 0; perf.t = 0; perf.fps = Math.round(fps); let n = perf.ratio; if (fps < 40 && n > 0.75) n = Math.max(0.75, n - 0.2); else if (fps > 57 && n < Q.dpr) n = Math.min(Q.dpr, n + 0.1); if (n !== perf.ratio) { perf.ratio = n; renderer.setPixelRatio(n); resize(); } }

  function update(dt) {
    let ix = move.x, iy = move.y;
    if (car.inside) { updateCar(dt); }
    else {
      if (keys.KeyW) iy += 1; if (keys.KeyS) iy -= 1; if (keys.KeyD) ix += 1; if (keys.KeyA) ix -= 1;
      const mag = Math.min(1, Math.hypot(ix, iy)), run = running || keys.ShiftLeft, sp = (run ? 3.8 : 1.9) * mag;
      if (mag > 0.01) { const n = Math.hypot(ix, iy); ix /= n; iy /= n; }
      const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
      const wx = (ix * c - iy * s) * sp, wz = (-ix * s - iy * c) * sp;
      player.vx += (wx - player.vx) * Math.min(1, dt * 9); player.vz += (wz - player.vz) * Math.min(1, dt * 9);
      const nx = player.x + player.vx * dt, nz = player.z + player.vz * dt;
      if (!OTD.blocked(nx, player.z, 0.32)) player.x = nx; else player.vx = 0;
      if (!OTD.blocked(player.x, nz, 0.32)) player.z = nz; else player.vz = 0;
      const v = Math.hypot(player.vx, player.vz), indoor = indoorAt(player.x, player.z);
      if (indoor !== wasIndoor) { A.setIndoor(indoor); wasIndoor = indoor; }
      if (v > 0.25) { player.acc += v * dt; player.bob += v * dt * 3.4; if (player.acc > (run ? 0.95 : 0.72)) { player.acc = 0; A.footstep(surfaceAt(player.x, player.z), run); } } else player.bob *= 0.9;
      nearCar = Math.hypot(player.x - car.x, player.z - car.z) < 3.6;
    }
    placeCar();

    // camera
    if (car.inside) {
      const back = 7.5, hgt = 3.1, cx = car.x - Math.sin(car.yaw) * back, cz = car.z - Math.cos(car.yaw) * back;
      const cy = Math.max(OTD.terrainH(cx, cz) + 1.2, car.obj.position.y + hgt);
      camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 5));
      camera.lookAt(car.x, car.obj.position.y + 1.4, car.z);
      player.x = car.x; player.z = car.z;
    } else {
      const gy = OTD.terrainH(player.x, player.z), v = Math.hypot(player.vx, player.vz);
      camera.position.set(player.x, gy + 1.65 + Math.sin(player.bob * 2) * 0.035 * Math.min(1, v / 2), player.z);
      camera.rotation.set(player.pitch, player.yaw, Math.cos(player.bob) * 0.006 * Math.min(1, v / 2), 'YXZ');
    }
    torch.intensity = (!car.inside && torchOn) ? (ev && ev.s.kind === 'lights' && Math.random() < 0.3 ? 0.2 : 2.6) : 0;

    // moon shadow follows the player
    moonL.position.set(player.x - 30, 60, player.z - 40); moonL.target.position.set(player.x, 0, player.z);

    // NPCs: visibility, idle motion, mission markers
    const s = curStep();
    Object.entries(npcObjs).forEach(([id, n]) => {
      const vis = npcVisible(id) || (s && s.type === 'talk' && s.npc === id);
      n.o.visible = vis; if (!vis) return;
      const d = Math.hypot(n.x - player.x, n.z - player.z);
      if (d < 60) { n.phase += dt; n.o.children[0].scale.y = 1 + Math.sin(n.phase * 1.6) * 0.008; if (d < 6) { const a = Math.atan2(player.x - n.x, player.z - n.z); n.o.rotation.y += (a - n.o.rotation.y) * Math.min(1, dt * 2); } }
      n.mark.visible = !!(s && s.type === 'talk' && s.npc === id);
    });
    statics.forEach((c) => { const on = c.cond(); c.o.visible = on; c.col.off = !on; });

    // lamps flicker
    OTD.lamps.forEach((l) => { if (l.flicker && l.point) l.point.intensity = 1.4 + Math.random() * 0.4; });

    updateEvent(dt);

    // goto steps & discovery
    if (s && s.type === 'goto') { const [tx, tz] = anchorPos(s.at, s.dx, s.dz); if (Math.hypot(player.x - tx, player.z - tz) < (s.r || 8)) completeStep(); }
    Object.entries(L).forEach(([k, l]) => { if (!state.discovered.includes(k) && Math.hypot(player.x - l.x, player.z - l.z) < l.r + 12) { state.discovered.push(k); sub('اكتشفت: ' + l.name, 3); save(); } });

    // focus & buttons
    focused = findFocus();
    const pr = $('#prompt');
    if (focused) { pr.querySelector('span').textContent = focused.kind === 'npc' ? 'تحدّث مع ' + OTD.NPCS[focused.ref].name : 'افحص: ' + focused.ref.it.title; pr.hidden = false; } else pr.hidden = true;
    $('#btn-use').classList.toggle('ready', !!focused);
    updateButtons();

    // objective beacon + compass
    const t = stepTarget();
    if (t) {
      const dx = t[0] - camera.position.x, dz = t[1] - camera.position.z, dist = Math.hypot(dx, dz);
      beacon.visible = dist > 14; beacon.position.set(t[0], OTD.terrainH(t[0], t[1]) + 30, t[1]);
      camera.getWorldDirection(v3); const ang = Math.atan2(dx, dz) - Math.atan2(v3.x, v3.z);
      $('#compass').hidden = false; $('#compass i').style.transform = `rotate(${-ang}rad)`; $('#compass span').textContent = fmt(dist) + ' م';
      beacon.material.opacity = clamp(dist / 40, 0.15, 1);
    } else { beacon.visible = false; $('#compass').hidden = true; }

    camera.getWorldDirection(v3); A.setListener(camera.position, v3);
    saveT += dt; if (saveT > 15) { saveT = 0; save(); }
  }

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    if (started && !paused) { adapt(dt); update(dt); }
    renderer.render(scene, camera);
  }
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 85 : 70; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  // ================= Start screen =================
  document.body.classList.toggle('touch', isTouch);
  $('#desk-note').hidden = isTouch;
  const hasSave = load();
  $('#btn-continue').hidden = !hasSave;
  if (hasSave) $('#btn-continue').querySelector('span').textContent = `${fmt(state.done.length)} من ${fmt(OTD.MISSIONS.length)} مهمة`;
  function begin(newGame) {
    if (newGame) { store.del(SAVE); state = fresh(); }
    A.init(); A.setVolume(settings.vol);
    [[L.grove.x, 1, L.grove.z], [L.grove.x + 20, 1, L.grove.z - 15], [L.farm.x, 1, L.farm.z - 20], [L.wadi.x, 1, L.wadi.z], [-40, 1, 60], [40, 1, -60]].forEach((p) => A.addCricket(...p));
    player.x = state.pos[0]; player.z = state.pos[1]; player.yaw = state.yaw || 0;
    if (state.car) { car.x = state.car[0]; car.z = state.car[1]; car.yaw = state.car[2]; }
    $('#start').hidden = true; $('#hud').hidden = false; started = true; clock.getDelta();
    if (state.active) { enterStep(); setObjective(curStep() && curStep().text); }
    else { const next = OTD.MISSIONS.find((m) => available(m) && !m.side); if (next) startMission(next.id); }
    save();
  }
  $('#btn-new').addEventListener('click', () => begin(true));
  $('#btn-continue').addEventListener('click', () => begin(false));
  document.addEventListener('visibilitychange', () => { if (document.hidden) { A.suspend(); if (started) save(); } else A.resume(); });
  document.querySelectorAll('#start-q button').forEach((b) => { b.setAttribute('aria-checked', String(b.dataset.q === qName)); b.addEventListener('click', () => { if (b.dataset.q !== qName && store.set('otd-quality', b.dataset.q)) location.reload(); }); });
  $('#start-qinfo').textContent = `دقة العرض ${fmt(Math.round(Math.max(innerWidth, innerHeight) * Q.dpr))}×${fmt(Math.round(Math.min(innerWidth, innerHeight) * Q.dpr))}`;

  frame();

  // ================= Test hooks (automated QA) =================
  window.__otd = {
    get state() { return state; }, player, car, perf, quality: qName,
    tp(x, z, yaw) { player.x = x; player.z = z; if (yaw != null) player.yaw = yaw; },
    step: () => curStep(), mission: () => curMission(),
    start: startMission,
    /** Completes the current step the way a player would (teleport + interact / answer). */
    autoStep() {
      const s = curStep(); if (!s) return 'none';
      if (s.type === 'goto') { const [x, z] = anchorPos(s.at, s.dx, s.dz); player.x = x; player.z = z; return 'goto'; }
      if (s.type === 'talk') { const n = npcObjs[s.npc]; player.x = n.x + 1.2; player.z = n.z + 1.2; player.yaw = Math.atan2(-(n.x - player.x), -(n.z - player.z)); return 'talk'; }
      if (s.type === 'find') { const p = spawned.find((x) => !x.taken); if (!p) return 'find-empty'; player.x = p.x + 0.8; player.z = p.z + 0.8; player.yaw = Math.atan2(-(p.x - player.x), -(p.z - player.z)); return 'find'; }
      if (s.type === 'event') { if (ev && ev.until) { player.x = ev.until[0]; player.z = ev.until[1]; } else if (ev) { player.x = ev.x + 2.5; player.z = ev.z + 2.5; } return 'event'; }
      if (s.type === 'deduce') return 'deduce';
      return s.type;
    },
    focus: () => focused && (focused.kind === 'npc' ? 'npc:' + focused.ref : 'item:' + focused.ref.it.id),
    interact, toggleCar, fastTravel, openPanel, closePanels,
    blockedAt: (x, z) => !!OTD.blocked(x, z, 0.32),
  };
})();
