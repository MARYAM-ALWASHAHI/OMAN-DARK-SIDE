/* OMAN: THE DARK SIDE — investigation engine.
 * Screens: title → Oman map → case map → scenes (torch search) · dialogue · evidence board · ending.
 */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s), C = window.CASE1, ART = window.ART, SND = window.SND;
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }, del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
  const KEY = 'otd-case1-v1';
  const fresh = () => ({ clues: [], talked: {}, deductions: [], flags: {}, seen: {}, ended: false });
  let S = Object.assign(fresh(), store.get(KEY) || {});
  const save = () => store.set(KEY, S);
  const fmt = (n) => n.toLocaleString('ar-OM');
  const allClues = {}; Object.entries(C.scenes).forEach(([sid, sc]) => sc.clues.forEach((c) => { allClues[c.id] = Object.assign({ scene: sid }, c); }));
  allClues.receipt = { id: 'receipt', obj: 'receipt', title: 'إيصال الساعة ٦:٤٠ مساءً', text: 'من محل سيف: بطاريات مصباح وماء. قال خلفان لسيف: «الليلة أكمل العدّ».', scene: 'souq' };
  const TOTAL = Object.keys(allClues).length;

  // ---------- conditions & unlocks ----------
  const ok = (cond) => cond.every((c) => { const [k, v] = c.split(':'); return k === 'clue' ? S.clues.includes(v) : k === 'talked' ? !!S.talked[v] : k === 'deduction' ? S.deductions.includes(v) : k === 'flag' ? !!S.flags[v] : true; });
  const open = (sid) => ok(C.scenes[sid].unlock);
  let knownOpen = new Set(Object.keys(C.scenes).filter(open));
  function checkUnlocks() { Object.keys(C.scenes).forEach((sid) => { if (open(sid) && !knownOpen.has(sid)) { knownOpen.add(sid); toast('مكان جديد', C.scenes[sid].name); } }); }

  // ---------- screens ----------
  function show(id) { document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== id; }); if (id !== 'scene') stopScene(); }
  let toastT = 0;
  function toast(k, t) { const el = $('#toast'); el.querySelector('b').textContent = k; el.querySelector('span').textContent = t; el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 3800); }
  let subT = 0;
  function sub(text, sec = 3.5, who) { const el = $('#sub'); el.textContent = ''; if (who) { const b = document.createElement('b'); b.textContent = who + ': '; el.append(b); } el.append(text); el.hidden = false; clearTimeout(subT); subT = setTimeout(() => { el.hidden = true; }, sec * 1000); }
  function playLines(lines, done) { let i = 0; (function n() { if (i >= lines.length) { if (done) setTimeout(done, 300); return; } const [w, t] = lines[i++], sec = Math.max(2.6, t.length / 13); sub(t, sec, w); setTimeout(n, sec * 1000 + 300); })(); }

  function objective() {
    if (S.flags.solved) return S.ended ? 'انتهت القضية. ارجع إلى خريطة عُمان.' : 'انزل إلى السرداب تحت البيت الثامن.';
    if (ok(C.accusation.unlock)) return 'عندك ما يكفي. اتّهم المسؤول من مذكرات الأدلة.';
    const d = C.deductions.find((x) => !S.deductions.includes(x.id) && x.proof.every((p) => S.clues.includes(p)));
    if (d) return 'اربط الأدلة في المذكرات: ' + d.q;
    if (cur) { if (cur.sc.npc && cur.sc.npc.id !== 'khalfan' && !S.talked[cur.sc.npc.id]) return 'تحدّث مع ' + C.people[cur.sc.npc.id].name + '.'; if (cur.sc.clues.some((c) => !S.clues.includes(c.id))) return 'حرّك المصباح وافحص المكان.'; }
    const next = Object.keys(C.scenes).find((sid) => open(sid) && C.scenes[sid].clues.some((c) => !S.clues.includes(c.id)));
    if (next) return 'اذهب إلى: ' + C.scenes[next].name + '.';
    return 'اعرض الأدلة على الناس. بعضهم يعرف أكثر مما يقول.';
  }

  // ---------- title ----------
  function renderTitle() { $('#btn-continue').hidden = !(S.clues.length || Object.keys(S.talked).length); $('#title-progress').textContent = S.clues.length ? `قضية خلفان: ${fmt(S.clues.length)} من ${fmt(TOTAL)} دليلاً` : ''; }
  $('#btn-start').addEventListener('click', () => { SND.init(); SND.click(); if (S.clues.length || Object.keys(S.talked).length) { $('#confirm-new').hidden = false; return; } goOman(); });
  $('#btn-new-yes').addEventListener('click', () => { S = fresh(); save(); knownOpen = new Set(Object.keys(C.scenes).filter(open)); $('#confirm-new').hidden = true; goOman(); });
  $('#btn-new-no').addEventListener('click', () => { $('#confirm-new').hidden = true; });
  $('#btn-continue').addEventListener('click', () => { SND.init(); SND.click(); goCase(); });
  document.querySelectorAll('.snd').forEach((b) => b.addEventListener('click', () => { SND.init(); const on = SND.toggle(); document.querySelectorAll('.snd').forEach((x) => { x.textContent = on ? 'الصوت: يعمل' : 'الصوت: مطفأ'; }); }));

  // ---------- Oman map ----------
  let omanDrawn = false, selRegion = 'nizwa';
  const RCOL = { musandam: '#38bdf8', sohar: '#f97316', muscat: '#eab308', nizwa: '#a855f7', jabal: '#22c55e', sharqiya: '#fbbf24', salalah: '#34d399' };
  function goOman() {
    show('oman'); SND.ambience(0.25);
    const wrap = $('#oman-map'), cv = $('#oman-canvas');
    const h = wrap.clientHeight, w = Math.round(h * window.OMAN.aspect);
    wrap.style.width = w + 'px';
    if (!omanDrawn || cv.width !== Math.round(w * Math.min(2, devicePixelRatio || 1))) { cv.width = Math.round(w * Math.min(2, devicePixelRatio || 1)); cv.height = Math.round(h * Math.min(2, devicePixelRatio || 1)); window.OMAN.draw(cv); omanDrawn = true; }
    const pins = $('#oman-pins'); pins.innerHTML = '';
    window.REGION_CASES.forEach((rc) => {
      const [lo, la] = window.OMAN.REGIONS[rc.id], [x, y] = window.OMAN.project(lo, la);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pin' + (rc.ready ? ' ready' : '') + (rc.id === selRegion ? ' sel' : '') + (rc.id === 'jabal' ? ' up' : rc.id === 'nizwa' ? ' down' : '');
      b.style.left = x * 100 + '%'; b.style.top = y * 100 + '%'; b.style.setProperty('--c', RCOL[rc.id]); b.innerHTML = '<i></i><span></span>'; b.querySelector('span').textContent = rc.name;
      b.addEventListener('click', () => { selRegion = rc.id; SND.click(); goOman(); });
      pins.appendChild(b);
    });
    const rc = window.REGION_CASES.find((r) => r.id === selRegion);
    const imgs = { muscat: 'assets/scenes/muscat.jpg', jabal: 'assets/scenes/jabal.jpg', sharqiya: 'assets/scenes/sharqiya.jpg' };
    if (rc.id === 'nizwa' && !imgs.nizwa) { if (!goOman.nz) { const r = ART.render(ART.scenes.haratGate, 0.4, []); goOman.nz = r.lit.toDataURL('image/jpeg', 0.8); } imgs.nizwa = goOman.nz; }
    $('#region-img').style.backgroundImage = imgs[rc.id] ? `url(${imgs[rc.id]})` : '';
    $('#region-name').textContent = rc.name; $('#region-title').textContent = '«' + rc.title + '»'; $('#region-hook').textContent = rc.hook;
    $('#region-go').hidden = !rc.ready; $('#region-soon').hidden = !!rc.ready;
    $('#region-progress').textContent = rc.ready ? '' : 'تُبنى في مرحلة قادمة';
    const bars = $('#region-bars'); bars.innerHTML = ''; bars.style.setProperty('--c', RCOL[rc.id]); bars.hidden = !rc.ready;
    if (rc.ready) [['الأدلة', S.clues.length, TOTAL], ['الاستنتاجات', S.deductions.length, C.deductions.length], ['تقدّم القضية', S.ended ? 1 : (S.clues.length / TOTAL) * 0.7 + (S.deductions.length / C.deductions.length) * 0.2 + (S.flags.solved ? 0.1 : 0), 1]].forEach(([n, v, m]) => {
      const d = document.createElement('div'), pct = Math.round((v / m) * 100);
      d.innerHTML = '<label><span></span><span></span></label><div class="t"><div></div></div>';
      d.querySelectorAll('span')[0].textContent = n; d.querySelectorAll('span')[1].textContent = m === 1 ? fmt(pct) + '٪' : `${fmt(v)} / ${fmt(m)}`;
      d.querySelector('.t div').style.width = pct + '%'; bars.append(d);
    });
    const chips = $('#region-chips'); chips.innerHTML = '';
    window.REGION_CASES.forEach((r) => { const c = document.createElement('button'); c.type = 'button'; c.className = 'rchip' + (r.id === selRegion ? ' sel' : ''); c.style.setProperty('--c', RCOL[r.id]); c.innerHTML = '<i></i><span></span>'; c.querySelector('span').textContent = r.name; c.addEventListener('click', () => { selRegion = r.id; SND.click(); goOman(); }); chips.append(c); });
    const list = $('#region-list'); list.innerHTML = '';
    window.REGION_CASES.forEach((r) => { const li = document.createElement('button'); li.type = 'button'; li.className = 'rc' + (r.id === selRegion ? ' sel' : ''); li.style.setProperty('--c', RCOL[r.id]); li.innerHTML = '<i></i><b></b><span></span>'; li.querySelector('b').textContent = r.name; li.querySelector('span').textContent = r.ready ? 'متاحة' : 'قريباً'; li.addEventListener('click', () => { selRegion = r.id; goOman(); }); list.appendChild(li); });
  }
  $('#region-go').addEventListener('click', () => { SND.click(); if (!S.seen.intro) { S.seen.intro = 1; save(); $('#intro-text').textContent = C.intro; $('#intro').hidden = false; } else goCase(); });
  $('#intro-go').addEventListener('click', () => { $('#intro').hidden = true; goCase(); });
  addEventListener('resize', () => { if (!$('#oman').hidden) { omanDrawn = false; goOman(); } });

  // ---------- case map ----------
  function goCase() {
    show('casemap'); SND.ambience(0.3); checkUnlocks();
    $('#case-progress').textContent = `${fmt(S.clues.length)} / ${fmt(TOTAL)}`; $('#case-obj').textContent = objective();
    const nodes = $('#case-nodes'); nodes.innerHTML = '';
    Object.entries(C.scenes).forEach(([sid, sc]) => {
      const o = open(sid), found = sc.clues.filter((c) => S.clues.includes(c.id)).length;
      if (!o && sid === 'cellar') return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'node' + (o ? '' : ' locked') + (o && found === sc.clues.length && sc.clues.length ? ' done' : '');
      b.style.left = sc.map[0] + '%'; b.style.top = sc.map[1] + '%'; b.disabled = !o;
      b.innerHTML = '<i></i><span class="n"></span><span class="c"></span>';
      b.querySelector('.n').textContent = o ? sc.name : '؟';
      b.querySelector('.c').textContent = o && sc.clues.length ? `${fmt(found)}/${fmt(sc.clues.length)}` : '';
      b.addEventListener('click', () => { SND.click(); enterScene(sid); });
      nodes.appendChild(b);
    });
    const acc = ok(C.accusation.unlock) && !S.flags.solved;
    $('#btn-accuse-hint').hidden = !acc;
  }
  $('#btn-to-oman').addEventListener('click', goOman);
  $('#btn-board').addEventListener('click', () => openBoard());
  $('#btn-title').addEventListener('click', () => { show('title'); renderTitle(); });

  // ---------- scene ----------
  const cv = $('#scene-canvas'), ctx = cv.getContext('2d');
  let cur = null, raf = 0, view = { s: 1, ox: 0, oy: 0 }, torch = { x: 800, y: 560, tx: 800, ty: 560 }, ghost = null, hint = null;
  function enterScene(sid) {
    const sc = C.scenes[sid]; show('scene'); $('#scene-name').textContent = sc.name;
    resizeScene();
    const scale = Math.min(2, view.s * (devicePixelRatio || 1));
    const art = ART.scenes[sc.art];
    if (sc.photo && !sc._img) { const im = new Image(); im.onload = () => { sc._img = im; if (cur && cur.sid === sid) cur.art = ART.renderPhoto(im, scale, sc.clues); }; im.src = sc.photo; }
    cur = { sid, sc, art: sc._img ? ART.renderPhoto(sc._img, scale, sc.clues) : ART.render(art, scale, sc.clues), t0: performance.now(), dust: Array.from({ length: 60 }, () => [Math.random() * 1600, Math.random() * 900, Math.random() * 0.4 + 0.1]) };
    torch.x = torch.tx = 800; torch.y = torch.ty = 560; ghost = null; hint = null;
    updateSceneHud();
    SND.ambience(sc.event === 'finale' ? 0.05 : 0.3);
    if (!S.seen['enter_' + sid]) { S.seen['enter_' + sid] = 1; save(); sceneEvent(sid, 'enter'); }
    if (sc.event === 'finale' && !S.ended) setTimeout(() => talk('khalfan', () => finale()), 700);
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function stopScene() { cancelAnimationFrame(raf); cur = null; }
  function resizeScene() { const w = innerWidth, h = innerHeight, dpr = Math.min(2, devicePixelRatio || 1); cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px'; view.s = Math.min(w / 1600, h / 900); view.ox = (w - 1600 * view.s) / 2; view.oy = (h - 900 * view.s) / 2; view.dpr = dpr; }
  addEventListener('resize', () => { if (cur) enterScene(cur.sid); });
  function updateSceneHud() { if (!cur) return; const sc = cur.sc, f = sc.clues.filter((c) => S.clues.includes(c.id)).length; $('#obj-text').textContent = objective(); $('#scene-count').textContent = sc.clues.length ? `· ${fmt(f)} / ${fmt(sc.clues.length)} أدلة هنا` : ''; $('#total-count').textContent = `${fmt(S.clues.length)} / ${fmt(TOTAL)}`; }

  function loop(now) {
    raf = requestAnimationFrame(loop); if (!cur) return;
    const t = (now - cur.t0) / 1000;
    torch.x += (torch.tx - torch.x) * 0.25; torch.y += (torch.ty - torch.y) * 0.25;
    const d = view.dpr; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#030407'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(view.s * d, 0, 0, view.s * d, view.ox * d, view.oy * d);
    ctx.drawImage(cur.art.dark, 0, 0, 1600, 900);
    // ghost (only in darkness; fades when the torch finds it)
    if (ghost) { const dist = Math.hypot(torch.x - ghost.x, torch.y - ghost.y); if (dist < 230) ghost.fade = true; ghost.a = ghost.fade ? Math.max(0, ghost.a - 0.03) : Math.min(0.55, ghost.a + 0.01); drawGhost(ghost); if (ghost.fade && ghost.a <= 0) { ghost = null; sub('(لم يكن هناك أحد.)', 3); } }
    // torch reveal
    const R = 250 + Math.sin(t * 7) * 3 + (Math.random() < 0.01 ? -40 : 0);
    ctx.save(); ctx.beginPath(); ctx.arc(torch.x, torch.y, R, 0, 7); ctx.clip();
    ctx.drawImage(cur.art.lit, 0, 0, 1600, 900);
    const g = ctx.createRadialGradient(torch.x, torch.y, R * 0.35, torch.x, torch.y, R); g.addColorStop(0, 'rgba(255,230,190,0.06)'); g.addColorStop(0.7, 'rgba(0,0,0,0.15)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = g; ctx.fillRect(torch.x - R, torch.y - R, R * 2, R * 2);
    // dust motes in the beam
    cur.dust.forEach((p) => { p[0] += Math.sin(t + p[1]) * 0.2; p[1] -= p[2] * 0.3; if (p[1] < 0) p[1] = 900; ctx.fillStyle = 'rgba(255,240,210,0.35)'; ctx.fillRect(p[0], p[1], 1.6, 1.6); });
    ctx.restore();
    // hint pulse
    if (hint) { const k = (now - hint.t) / 1600; if (k > 1) hint = null; else { ctx.strokeStyle = `rgba(207,168,120,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hint.x, hint.y, 40 + k * 90, 0, 7); ctx.stroke(); } }
    // found markers (small, gold)
    cur.sc.clues.forEach((c) => { if (S.clues.includes(c.id)) { ctx.fillStyle = 'rgba(207,168,120,0.8)'; ctx.beginPath(); ctx.arc(c.x, c.y - 34 * (c.s || 1) - 6, 4, 0, 7); ctx.fill(); } });
    // prompt
    const focus = focusAt(torch.x, torch.y);
    $('#btn-interact').classList.toggle('ready', !!focus);
    const pr = $('#scene-prompt'); if (focus) { pr.textContent = focus.kind === 'npc' ? 'المس للتحدث مع ' + C.people[focus.ref.id].name : S.clues.includes(focus.ref.id) ? focus.ref.title : 'المس للفحص'; pr.hidden = false; pr.style.left = (view.ox + torch.x * view.s) + 'px'; pr.style.top = (view.oy + (torch.y - R * 0.5) * view.s) + 'px'; } else pr.hidden = true;
  }
  function drawGhost(gh) {
    ctx.save(); ctx.globalAlpha = gh.a; ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(gh.x, gh.y - 280, gh.x, gh.y); g.addColorStop(0, 'rgba(190,205,235,0.9)'); g.addColorStop(1, 'rgba(190,205,235,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(gh.x, gh.y - 250, 22, 28, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(gh.x - 30, gh.y - 220); ctx.quadraticCurveTo(gh.x, gh.y - 235, gh.x + 30, gh.y - 220); ctx.lineTo(gh.x + 55, gh.y); ctx.lineTo(gh.x - 55, gh.y); ctx.fill();
    for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(210,220,245,0.4)'; ctx.fillRect(gh.x + (Math.random() - 0.5) * 120, gh.y - Math.random() * 280, 1.5, 1.5); }
    ctx.restore();
  }
  function focusAt(x, y) {
    if (!cur) return null; let best = null, bd = 1e9;
    cur.sc.clues.forEach((c) => { const d = Math.hypot(c.x - x, c.y - 20 - y); if (d < 85 && d < bd) { bd = d; best = { kind: 'clue', ref: c }; } });
    const n = cur.sc.npc; if (n && !(n.id === 'khalfan' && !S.flags.solved)) { const d = Math.hypot(n.x - x, n.y - 140 - y); if (d < n.r + 40 && d < bd) best = { kind: 'npc', ref: n }; }
    return best;
  }
  // pointer: drag moves the torch, a tap inspects
  let down = null;
  const toLogical = (e) => [(e.clientX - view.ox) / view.s, (e.clientY - view.oy) / view.s - (e.pointerType === 'touch' ? 70 : 0)];
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); const [x, y] = toLogical(e); torch.tx = x; torch.ty = y; down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  cv.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || down) { const [x, y] = toLogical(e); torch.tx = x; torch.ty = y; } });
  // A tap that opens a card or dialogue must not also click the button that appears under the finger.
  cv.addEventListener('touchend', (e) => { e.preventDefault(); }, { passive: false });
  let overlayGuard = 0;
  document.addEventListener('click', (e) => { if (performance.now() < overlayGuard && e.target !== cv) { e.stopPropagation(); e.preventDefault(); } }, true);
  cv.addEventListener('pointerup', (e) => {
    if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
    if (moved > 14 || dt > 450) return;
    const [x, y] = toLogical(e); const f = focusAt(x, y) || focusAt(torch.x, torch.y);
    if (!f) return;
    overlayGuard = performance.now() + 350;
    if (f.kind === 'clue') inspect(f.ref); else talk(f.ref.id);
  });
  $('#btn-interact').addEventListener('click', () => { const f = focusAt(torch.x, torch.y); if (!f) { sub('وجّه المصباح نحو شيء أو شخص.', 2); return; } if (f.kind === 'clue') inspect(f.ref); else talk(f.ref.id); });
  $('#btn-hint').addEventListener('click', () => { if (!cur) return; const c = cur.sc.clues.find((k) => !S.clues.includes(k.id)); if (c) { hint = { x: c.x, y: c.y - 10, t: performance.now() }; SND.click(); } else sub('لا أدلة أخرى هنا.', 2); });
  $('#btn-leave').addEventListener('click', () => { SND.click(); goCase(); });
  $('#btn-scene-board').addEventListener('click', () => openBoard());

  // ---------- clue card ----------
  function inspect(c, quiet) {
    const isNew = !S.clues.includes(c.id);
    if (isNew) { S.clues.push(c.id); save(); SND.clue(); } else SND.page();
    const card = $('#card'); const th = card.querySelector('canvas'); th.width = 480; th.height = 300; ART.thumb(c.obj, th);
    card.querySelector('.k').textContent = isNew ? 'دليل جديد · ' + fmt(S.clues.length) + ' من ' + fmt(TOTAL) : 'دليل';
    card.querySelector('h3').textContent = c.title; card.querySelector('p').textContent = c.text; card.hidden = false;
    card.querySelector('.close').onclick = () => {
      card.hidden = true; updateSceneHud();
      if (isNew) { if (c.play) playLines(c.play); sceneEvent(cur && cur.sid, 'clue:' + c.id); checkUnlocks(); }
    };
    updateSceneHud();
  }

  // ---------- events ----------
  function sceneEvent(sid, what) {
    const sc = C.scenes[sid]; if (!sc) return;
    if (what === 'enter' && sc.event === 'whisper') { SND.ambience(0.08); setTimeout(() => { SND.whisper(0.7); sub('(همس خافت… من الغرفة الثانية)', 4); ghost = { x: 725, y: 640, a: 0 }; }, 1500); }
    if (what === 'enter' && sc.event === 'footsteps') { setTimeout(() => { SND.steps(6); sub('(خطوات في آخر الممر… ثم صمت.)', 4); }, 1800); }
    if (what === 'clue:cap') { SND.ambience(0.05); const w = ['واحد…', 'اثنين…', 'ثلاثة…', 'أربعة…', 'خمسة…', 'ستة…', 'سبعة…', '…ثمانية']; w.forEach((x, i) => setTimeout(() => { sub('صوت من البئر يعدّ: ' + x, 1.3); SND.whisper(0, 2); }, 600 + i * 1150)); setTimeout(() => SND.ambience(0.3), 10500); }
  }
  function finale() {
    S.ended = true; save();
    ghost = { x: 1000, y: 640, a: 0 };
    setTimeout(() => { $('#ending p').textContent = C.ending; $('#ending').hidden = false; SND.solve(); }, 6500);
  }
  $('#ending-map').addEventListener('click', () => { $('#ending').hidden = true; goOman(); });

  // ---------- dialogue ----------
  function talk(id, done) {
    const T = C.talks[id], P = C.people[id], first = !S.talked[id];
    const dlg = $('#dialogue'), who = dlg.querySelector('.who'); who.innerHTML = '';
    const pic = document.createElement('div'); pic.className = 'portrait'; if (P.portrait) { const im = document.createElement('img'); im.src = 'assets/cast/' + P.portrait + '.jpg'; im.alt = P.name; pic.append(im); } else { pic.textContent = P.name.slice(0, 1); pic.classList.add('initial'); }
    const nm = document.createElement('div'); nm.className = 'nm'; const b = document.createElement('b'); b.textContent = P.name; const sp = document.createElement('span'); sp.textContent = P.role; nm.append(b, sp); who.append(pic, nm);
    dlg.hidden = false;
    let q = (first ? T.first : T.again).slice();
    const line = dlg.querySelector('.line'), next = dlg.querySelector('.next'), pres = dlg.querySelector('.present');
    function step() {
      if (q.length) { const [w, t] = q.shift(); line.textContent = ''; const bb = document.createElement('b'); bb.textContent = w + ': '; line.append(bb, t); next.textContent = q.length ? 'التالي' : 'إنهاء'; pres.hidden = q.length > 0 || id === 'khalfan'; SND.page(); return; }
      dlg.hidden = true;
      if (first) { S.talked[id] = true; if (T.gives && !S.clues.includes(T.gives)) { inspect(allClues[T.gives]); } save(); checkUnlocks(); }
      updateSceneHud();
      if (done) done();
    }
    next.onclick = step;
    pres.onclick = () => pick('اعرض دليلاً على ' + P.name, (cid) => {
      const r = T.present[cid];
      if (!r) { q = [[P.name, 'ما أعرف شي عن هذا.']]; }
      else { const lines = Array.isArray(r) ? r : r.lines; q = lines.slice(); if (r.flag && !S.flags[r.flag]) { S.flags[r.flag] = true; save(); setTimeout(checkUnlocks, 400); } }
      step();
    });
    step();
  }

  // ---------- evidence picker ----------
  function pick(title, cb) {
    const el = $('#picker'); el.querySelector('h3').textContent = title; const grid = el.querySelector('.grid'); grid.innerHTML = '';
    S.clues.forEach((id) => { const c = allClues[id]; const b = document.createElement('button'); b.type = 'button'; b.className = 'mini'; b.textContent = c.title; b.addEventListener('click', () => { el.hidden = true; cb(id); }); grid.append(b); });
    if (!S.clues.length) grid.textContent = 'لا توجد أدلة بعد.';
    el.hidden = false;
  }
  $('#picker .close').addEventListener('click', () => { $('#picker').hidden = true; });

  // ---------- evidence board ----------
  let boardSel = [], boardMode = null;
  function openBoard() {
    SND.page(); const el = $('#board'); el.hidden = false; boardSel = []; renderBoard();
  }
  function renderBoard() {
    const el = $('#board');
    el.querySelector('.count').textContent = `${fmt(S.clues.length)} / ${fmt(TOTAL)} دليلاً`;
    const ds = el.querySelector('.deds'); ds.innerHTML = '';
    C.deductions.forEach((d) => {
      const solved = S.deductions.includes(d.id), visible = solved || d.proof.some((p) => S.clues.includes(p));
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ded' + (solved ? ' solved' : '') + (boardMode === d.id ? ' active' : '') + (visible ? '' : ' hidden-q');
      b.innerHTML = '<b></b><span></span>'; b.querySelector('b').textContent = visible ? d.q : 'سؤال لم يظهر بعد'; b.querySelector('span').textContent = solved ? '✓ ' + d.claim : visible ? 'اختر ٣ أدلة تثبت الجواب' : '';
      b.disabled = solved || !visible; b.addEventListener('click', () => { boardMode = d.id; boardSel = []; renderBoard(); });
      ds.append(b);
    });
    if (ok(C.accusation.unlock) && !S.flags.solved) { const b = document.createElement('button'); b.type = 'button'; b.className = 'ded accuse' + (boardMode === 'acc' ? ' active' : ''); b.innerHTML = '<b></b><span></span>'; b.querySelector('b').textContent = 'الاتهام الأخير'; b.querySelector('span').textContent = C.accusation.q; b.addEventListener('click', () => { boardMode = 'acc'; boardSel = []; renderBoard(); }); ds.append(b); }
    const sus = el.querySelector('.suspects'); sus.innerHTML = ''; sus.hidden = boardMode !== 'acc';
    if (boardMode === 'acc') C.accusation.suspects.forEach((s) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (el.dataset.suspect === s.id ? ' on' : ''); b.textContent = s.name; b.addEventListener('click', () => { el.dataset.suspect = s.id; renderBoard(); }); sus.append(b); });
    const grid = el.querySelector('.cards'); grid.innerHTML = '';
    S.clues.forEach((id) => {
      const c = allClues[id], b = document.createElement('button'); b.type = 'button'; b.className = 'cardlet' + (boardSel.includes(id) ? ' on' : '');
      const cvs = document.createElement('canvas'); cvs.width = 160; cvs.height = 100; ART.thumb(c.obj, cvs);
      const t = document.createElement('b'); t.textContent = c.title; const pl = document.createElement('span'); pl.textContent = C.scenes[c.scene] ? C.scenes[c.scene].name : '';
      b.append(cvs, t, pl);
      b.addEventListener('click', () => { if (!boardMode) { inspectFromBoard(c); return; } const i = boardSel.indexOf(id); if (i >= 0) boardSel.splice(i, 1); else if (boardSel.length < 3) boardSel.push(id); SND.click(); renderBoard(); });
      grid.append(b);
    });
    const act = el.querySelector('.link'); act.hidden = !boardMode; act.disabled = boardSel.length !== 3;
    act.textContent = boardMode === 'acc' ? `اتّهم (${fmt(boardSel.length)}/٣ أدلة)` : `اربط الأدلة (${fmt(boardSel.length)}/٣)`;
    el.querySelector('.msg').textContent = boardMode ? (boardMode === 'acc' ? 'اختر المتهم، ثم ٣ أدلة تثبت التهمة.' : 'اختر ٣ أدلة من البطاقات.') : 'المس سؤالاً لتبدأ الاستنتاج، أو المس بطاقة لقراءتها.';
  }
  function inspectFromBoard(c) { const card = $('#card'); const th = card.querySelector('canvas'); th.width = 480; th.height = 300; ART.thumb(c.obj, th); card.querySelector('.k').textContent = 'دليل'; card.querySelector('h3').textContent = c.title; card.querySelector('p').textContent = c.text; card.hidden = false; card.querySelector('.close').onclick = () => { card.hidden = true; }; }
  $('#board .link').addEventListener('click', () => {
    const el = $('#board');
    if (boardMode === 'acc') {
      const A = C.accusation, good = el.dataset.suspect === A.answer && boardSel.every((x) => A.valid.includes(x));
      if (good) { S.flags.solved = true; save(); SND.solve(); el.querySelector('.msg').textContent = A.right; boardMode = null; boardSel = []; setTimeout(() => { el.hidden = true; checkUnlocks(); goCase(); }, 3500); }
      else { SND.wrong(); el.querySelector('.msg').textContent = A.wrong; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
      return;
    }
    const d = C.deductions.find((x) => x.id === boardMode);
    if (d.proof.every((p) => boardSel.includes(p))) { S.deductions.push(d.id); save(); SND.solve(); const msg = d.claim + ' · ' + d.unlockText; boardMode = null; boardSel = []; renderBoard(); el.querySelector('.msg').textContent = msg; checkUnlocks(); }
    else { SND.wrong(); el.querySelector('.msg').textContent = 'هذه الأدلة لا تثبت الجواب. فكّر في دليل مختلف.'; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  });
  $('#board .close').addEventListener('click', () => { $('#board').hidden = true; boardMode = null; if (!$('#casemap').hidden) goCase(); updateSceneHud(); });

  // ---------- boot ----------
  show('title'); renderTitle();
  window.__otd = { get S() { return S; }, toScreen: (x, y) => [view.ox + x * view.s, view.oy + y * view.s], setTorch: (x, y) => { torch.tx = torch.x = x; torch.ty = torch.y = y; }, C, allClues, enterScene, inspect: (id) => inspect(allClues[id]), talk, goCase, goOman, openBoard, focusAt, open };
})();
