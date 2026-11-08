/* 역사 본문 빈칸 연습 */
(function () {
'use strict';
const CFG = Object.assign({ SHEET_URL: '', TITLE: '역사 본문 빈칸 연습', SUBTITLE: '', SAVE_EVERY: 5 }, window.APP_CONFIG || {});
const REMOTE = (CFG.SHEET_URL || '').trim();
const PUNCT = '『』「」‘’';

/* ---------- 데이터 준비: 빈칸 후보 낱말 → 문장 속 위치 ---------- */
const DATA = (window.SENTENCES || []).map((s, i) => {
  const used = [];
  (s.w || []).forEach(word => {
    const at = s.t.indexOf(word);
    if (at < 0) { console.warn('빈칸이 없습니다:', s.id, word); return; }
    let a = at, b = at + word.length;
    while (a < b && PUNCT.includes(s.t[a])) a++;
    while (b > a && PUNCT.includes(s.t[b - 1])) b--;
    if (used.some(([x, y]) => !(b <= x || a >= y))) return;
    used.push([a, b]);
  });
  used.sort((x, y) => x[0] - y[0]);
  return Object.assign({}, s, { idx: i, b: used });
}).filter(s => s.b.length);
const BYID = Object.fromEntries(DATA.map(s => [s.id, s]));
const UNITS = { 'Ⅳ': 'Ⅳ. 조선의 성립과 발전', 'Ⅴ': 'Ⅴ. 조선 사회의 변동' };
const SECTIONS = [];
DATA.forEach(s => {
  let last = SECTIONS[SECTIONS.length - 1];
  if (!last || last.name !== s.sec) { last = { name: s.sec, unit: s.u, page: s.p, ids: [] }; SECTIONS.push(last); }
  last.ids.push(s.id);
});
const LV_NAME = ['안 풀어 봄', '틀림', '맞힘', '숙달'];
const LV_COL = ['var(--l0)', 'var(--l1)', 'var(--l2)', 'var(--l3)'];

/* ---------- 브라우저 저장소 (localStorage) ---------- */
const mem = {};
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }
};
const KEY = 'history-blank:v1:';
let sid = null, st = null;
const fresh = () => ({
  lv: {}, streak: {}, pos: {}, queue: null, queueKey: null, dirty: false,
  settings: { order: 'seq', fmt: 'drag', count: 'rand', scope: SECTIONS.map(s => s.name) }
});
function openUser(id) {
  sid = id;
  const saved = store.get(KEY + 'u:' + id) || {};
  st = Object.assign(fresh(), saved);
  st.settings = Object.assign(fresh().settings, saved.settings || {});
  st.settings.scope = st.settings.scope.filter(n => SECTIONS.some(s => s.name === n));
  store.set(KEY + 'last', id);
}
function save() { if (sid) store.set(KEY + 'u:' + sid, st); }

/* ---------- 구글 시트 동기화 ---------- */
let syncState = REMOTE ? 'saved' : 'off', sinceSave = 0, pushing = false;
const progressString = () => DATA.map(s => st.lv[s.id] || 0).join('');
function mergeFrom(str) {
  let changed = false;
  DATA.forEach((s, i) => {
    const remote = Number(str[i] || 0), local = st.lv[s.id] || 0;
    if (remote > local) { st.lv[s.id] = remote; }
    if (local > remote) changed = true;
  });
  return changed;
}
async function remoteLoad(id) {
  const res = await fetch(REMOTE + '?action=load&sid=' + encodeURIComponent(id), { method: 'GET', redirect: 'follow' });
  return res.json();
}
async function push(force) {
  if (!REMOTE || !sid || !st.dirty || pushing) return;
  if (!force && sinceSave < CFG.SAVE_EVERY) return;
  pushing = true; setSync('saving');
  try {
    const res = await fetch(REMOTE, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'save', sid, progress: progressString() }) });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error);
    st.dirty = false; sinceSave = 0; save(); setSync('saved');
  } catch (e) { setSync('wait'); }
  pushing = false;
}
function setSync(s) {
  syncState = s;
  const el = document.getElementById('sync');
  if (el) el.outerHTML = syncBadge();
}
function syncBadge() {
  const map = { off: ['off', '이 기기에만 저장'], saved: ['', '시트에 저장됨'], saving: ['wait', '저장 중…'], wait: ['wait', '저장 대기'] };
  const [cls, txt] = map[syncState] || map.off;
  return `<span class="sync ${cls}" id="sync"><i></i>${txt}</span>`;
}
window.addEventListener('pagehide', () => {
  if (REMOTE && sid && st && st.dirty && navigator.sendBeacon) {
    try { navigator.sendBeacon(REMOTE, new Blob([JSON.stringify({ action: 'save', sid, progress: progressString() })], { type: 'text/plain' })); } catch (e) {}
  }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') push(true); });

/* ---------- 도우미 ---------- */
const app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const chosung = w => [...w].map(c => { const k = c.charCodeAt(0); if (k >= 0xAC00 && k <= 0xD7A3) return CHO[Math.floor((k - 0xAC00) / 588)]; if (/[0-9]/.test(c)) return '□'; return c; }).join('');
const norm = s => s.replace(/\s+/g, '');
const scopeKey = () => st.settings.scope.join('|');
const scopeIds = () => { const on = new Set(st.settings.scope); return DATA.filter(s => on.has(s.sec)).map(s => s.id); };
const countLv = ids => { const c = [0, 0, 0, 0]; ids.forEach(id => c[st.lv[id] || 0]++); return c; };
function toast(text) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = text; document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function stackBar(c, n) {
  return `<div class="stack" role="img" aria-label="숙달 ${c[3]}, 맞힘 ${c[2]}, 틀림 ${c[1]}, 안 풀어 봄 ${c[0]}">` +
    [3, 2, 1].map(l => `<i style="width:${c[l] / n * 100}%;background:${LV_COL[l]}"></i>`).join('') + '</div>';
}
const legend = () => '<div class="legend">' + [3, 2, 1, 0].map(i => `<span><i class="dot" style="background:${LV_COL[i]}"></i>${LV_NAME[i]}</span>`).join('') + '</div>';

/* ---------- 접속 ---------- */
function viewLogin(message) {
  app.style.paddingBottom = '';
  app.innerHTML = `<section class="login"><div class="sheet">
    <h1>${esc(CFG.TITLE)}</h1>
    <p class="lead">${esc(CFG.SUBTITLE)}<br>교과서 본문 빈칸 채우기 연습용입니다.</p>
    <form id="f" autocomplete="off">
      <label for="sid">학번 5자리</label>
      <div class="omr" id="omr">${'<span></span>'.repeat(5)}<input id="sid" inputmode="numeric" pattern="[0-9]*" maxlength="5" aria-label="학번 5자리"></div>
      <div class="msg" id="msg">${message ? esc(message) : ''}</div>
      <button class="btn btn-main" id="enter" type="submit">시작하기</button>
    </form>
    <p class="fine">학번만 5자리로 입력하면 됩니다.</p>
  </div></section>`;
  const inp = document.getElementById('sid'), cells = [...document.querySelectorAll('#omr span')], msg = document.getElementById('msg');
  const paint = () => {
    inp.value = inp.value.replace(/\D/g, '').slice(0, 5);
    cells.forEach((c, i) => { c.textContent = inp.value[i] || ''; c.classList.toggle('full', i < inp.value.length); c.classList.toggle('cur', document.activeElement === inp && i === Math.min(inp.value.length, 4)); });
  };
  inp.addEventListener('input', () => { msg.textContent = ''; paint(); });
  inp.addEventListener('focus', paint); inp.addEventListener('blur', paint);
  inp.value = store.get(KEY + 'last') || ''; paint();
  document.getElementById('f').addEventListener('submit', async e => {
    e.preventDefault();
    const id = inp.value;
    if (!/^\d{5}$/.test(id)) { msg.className = 'msg'; msg.textContent = '학번 5자리를 숫자로 입력하세요.'; inp.focus(); return; }
    if (!REMOTE) { openUser(id); return viewHome(); }
    const btn = document.getElementById('enter'); btn.disabled = true; btn.textContent = '기록 불러오는 중…';
    try {
      const j = await remoteLoad(id);
      if (!j.ok && j.error === 'not_registered') { btn.disabled = false; btn.textContent = '시작하기'; msg.className = 'msg'; msg.textContent = '학번을 확인하고 다시 입력해주세요.'; return; }
      if (!j.ok) throw new Error(j.error);
      openUser(id);
      if (mergeFrom(j.progress || '')) { st.dirty = true; }
      save(); setSync(st.dirty ? 'wait' : 'saved'); viewHome(); if (st.dirty) push(true);
    } catch (err) {
      openUser(id); setSync('wait'); viewHome();
      toast('시트에 연결하지 못했습니다. 이 기기에 저장해 두고 나중에 다시 보냅니다.');
    }
  });
  setTimeout(() => inp.focus(), 60);
}

/* ---------- 홈 ---------- */
function pressed(key, v) { return String(st.settings[key]) === String(v); }
function viewHome() {
  app.style.paddingBottom = '';
  session = null; q = null;
  const all = countLv(DATA.map(s => s.id)), wrong = all[1];
  const choice = (key, v, title, desc) => `<button class="choice" data-key="${key}" data-v="${v}" aria-pressed="${pressed(key, v)}"><b>${title}</b><span>${desc}</span></button>`;
  const pill = (key, v, t) => `<button class="pill" data-key="${key}" data-v="${v}" aria-pressed="${pressed(key, v)}">${t}</button>`;
  const units = Object.keys(UNITS).map(u => {
    const secs = SECTIONS.filter(s => s.unit === u);
    return `<div class="unit"><span>${UNITS[u]}</span><button class="textbtn" data-unit="${u}">전체 선택</button></div>` +
      secs.map(s => { const c = countLv(s.ids);
        return `<label><input type="checkbox" value="${esc(s.name)}" ${st.settings.scope.includes(s.name) ? 'checked' : ''}><span>${esc(s.name)}</span><span class="meta">${s.page}쪽 ${s.ids.length}문장<span class="mini" title="숙달 ${c[3]}/${s.ids.length}"><i style="width:${c[3] / s.ids.length * 100}%"></i></span></span></label>`; }).join('');
  }).join('');
  app.innerHTML = `
  <header class="head"><h1>${esc(CFG.TITLE)}</h1>
    <div class="me">학번 ${sid}<br>${syncBadge()}<br><button class="textbtn" id="logout">로그아웃</button></div></header>
  <section class="mastery">
    <p>지금까지 숙달한 문장</p>
    <div class="num">${all[3]} <small>/ ${DATA.length}문장</small></div>
    <div style="margin-top:10px">${stackBar(all, DATA.length)}</div>${legend()}
  </section>
  <div class="quick"><button class="btn btn-line" id="prog">진행 현황 보기</button><button class="btn btn-line" id="wrong" ${wrong ? '' : 'disabled'}>틀린 문장 ${wrong}개 다시 풀기</button></div>
  <section class="group"><h2>학습 방식</h2><div class="choices c2">
    ${choice('order', 'seq', '교과서 순서대로', '본문 차례대로 읽으며 풀기')}
    ${choice('order', 'rand', '무작위 문장', '모든 문장이 한 번씩 나온 뒤 다시 섞기')}</div></section>
  <section class="group"><h2>빈칸 형식</h2><div class="choices c3">
    ${choice('fmt', 'drag', '끌어 넣기', '보기 카드에서 골라 넣기')}
    ${choice('fmt', 'cho', '초성 힌트', 'ㅎㅁㅈㅇ처럼 자음만')}
    ${choice('fmt', 'blank', '완전 빈칸', '힌트 없이 쓰기')}</div>
    <div class="sublabel">한 문장의 빈칸 개수</div><div class="pills">${pill('count', 'rand', '매번 다르게')}${pill('count', '1', '1개')}${pill('count', 'all', '최대')}</div></section>
  <section class="group"><h2>범위</h2><div class="scope" id="scope">${units}</div></section>
  <div class="dock"><div class="in"><button class="btn btn-main" id="go"></button></div></div>`;

  const refreshGo = () => {
    const ids = scopeIds(), go = document.getElementById('go');
    go.disabled = !ids.length;
    if (!ids.length) { go.textContent = '범위를 하나 이상 고르세요'; return; }
    if (st.settings.order === 'seq') { const p = st.pos[scopeKey()] || 0; go.textContent = p > 0 && p < ids.length ? `이어서 풀기 (${ids.length}문장 중 ${p + 1}번째부터)` : `${ids.length}문장 풀기 시작`; }
    else { const left = st.queueKey === scopeKey() && st.queue && st.queue.length; go.textContent = left ? `이어서 풀기 (남은 문장 ${st.queue.length}개)` : `${ids.length}문장 무작위로 풀기`; }
    document.querySelectorAll('[data-unit]').forEach(b => { const secs = SECTIONS.filter(s => s.unit === b.dataset.unit).map(s => s.name); b.textContent = secs.every(n => st.settings.scope.includes(n)) ? '전체 해제' : '전체 선택'; });
  };
  app.querySelectorAll('[data-key]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.key; st.settings[k] = b.dataset.v; save();
    app.querySelectorAll(`[data-key="${k}"]`).forEach(x => x.setAttribute('aria-pressed', x === b)); refreshGo();
  }));
  const syncScope = () => { st.settings.scope = [...app.querySelectorAll('#scope input:checked')].map(x => x.value); save(); refreshGo(); };
  app.querySelectorAll('#scope input').forEach(c => c.addEventListener('change', syncScope));
  app.querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', () => {
    const secs = SECTIONS.filter(s => s.unit === b.dataset.unit).map(s => s.name);
    const boxes = [...app.querySelectorAll('#scope input')].filter(x => secs.includes(x.value));
    const on = !boxes.every(x => x.checked); boxes.forEach(x => x.checked = on); syncScope();
  }));
  document.getElementById('logout').onclick = async () => { await push(true); store.del(KEY + 'last'); sid = null; st = null; viewLogin(); };
  document.getElementById('prog').onclick = viewProgress;
  document.getElementById('wrong').onclick = () => { session = { kind: 'wrong', list: shuffle(DATA.filter(s => st.lv[s.id] === 1).map(s => s.id)), i: 0 }; nextQuestion(); };
  document.getElementById('go').onclick = startSession;
  refreshGo();
  window.scrollTo(0, 0);
}

/* ---------- 학습 진행 ---------- */
let session = null, q = null;
function startSession() {
  const ids = scopeIds(); if (!ids.length) return;
  if (st.settings.order === 'seq') {
    let p = st.pos[scopeKey()] || 0; if (p >= ids.length) p = 0;
    session = { kind: 'seq', list: ids, i: p };
  } else {
    if (st.queueKey !== scopeKey() || !st.queue || !st.queue.length) {
      const unseen = ids.filter(i => !st.lv[i]), seen = ids.filter(i => st.lv[i]);
      st.queue = shuffle(unseen).concat(shuffle(seen)); st.queueKey = scopeKey(); save();
    }
    session = { kind: 'rand', total: ids.length };
  }
  nextQuestion();
}
function pickBlanks(s) {
  const n = s.b.length, c = st.settings.count;
  const k = c === '1' ? 1 : c === 'all' ? n : 1 + Math.floor(Math.random() * n);
  return shuffle(s.b.map((_, i) => i)).slice(0, k).sort((a, b) => a - b).map(i => s.b[i]);
}
function nextQuestion() {
  if (session.kind === 'rand' ? !st.queue.length : session.i >= session.list.length) return viewDone();
  const s = BYID[session.kind === 'rand' ? st.queue[0] : session.list[session.i]];
  q = { s, blanks: pickBlanks(s), fmt: st.settings.fmt, checked: false, fill: {} };
  viewStudy();
}
function windowAround(idx, n) {
  const half = (n - 1) / 2; let a = idx - half, b = idx + half;
  if (a < 0) { b -= a; a = 0; }
  if (b > DATA.length - 1) { a -= b - (DATA.length - 1); b = DATA.length - 1; }
  return [Math.max(0, a), b];
}
function targetHtml(s) {
  let h = '', p = 0;
  q.blanks.forEach(([a, b], bi) => {
    h += esc(s.t.slice(p, a));
    const ans = s.t.slice(a, b);
    if (q.fmt === 'drag') h += `<span class="slot" role="button" tabindex="0" data-bi="${bi}" aria-label="빈칸 ${bi + 1}">&nbsp;</span>`;
    else {
      const ph = q.fmt === 'cho' ? chosung(ans) : '';
      const w = q.fmt === 'cho' ? Math.max(3.4, ans.length * 1.1 + 1.4) : 6.5;
      h += `<input class="blank" data-bi="${bi}" aria-label="빈칸 ${bi + 1}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="${esc(ph)}" style="width:${w}em">`;
    }
    p = b;
  });
  return h + esc(s.t.slice(p));
}
function viewStudy() {
  const s = q.s, [a, b] = windowAround(s.idx, 3);
  let body = '', lastSub = null;
  for (let i = a; i <= b; i++) {
    const d = DATA[i];
    if (d.sub !== lastSub) { body += `<span class="sh">${esc(d.sub)}</span>`; lastSub = d.sub; }
    body += i === s.idx ? `<span class="tg">${targetHtml(d)}</span> ` : `<span class="ctx">${esc(d.t)}</span> `;
  }
  let n, total;
  if (session.kind === 'rand') { total = session.total; n = total - st.queue.length + 1; }
  else { total = session.list.length; n = session.i + 1; }
  const lv = st.lv[s.id] || 0;
  const hint = q.fmt === 'drag' ? '아래 카드를 빈칸으로 끌어 놓거나, 카드를 누른 뒤 빈칸을 누르세요.' : '빈칸을 누르고 답을 쓰세요. 엔터를 누르면 다음 빈칸으로 넘어갑니다.';
  app.innerHTML = `
  <div class="studybar"><button class="textbtn" id="stop">그만하고 나가기</button><span class="count">${session.kind === 'wrong' ? '틀린 문장 ' : ''}${n} / ${total}</span></div>
  <div class="track"><i style="width:${(n - 1) / total * 100}%"></i></div>
  <article class="page">
    <div class="where"><span><b>${esc(s.sec)}</b> ${s.p}쪽</span><span><i class="dot" style="background:${LV_COL[lv]}"></i>${LV_NAME[lv]}</span></div>
    <div class="passage">${body}</div>
    <div class="result" id="result"><span class="hint">${hint}</span></div>
  </article>
  <div class="dock ${q.fmt === 'drag' ? 'tray' : ''}" id="dock">
    ${q.fmt === 'drag' ? '<div class="bank" id="bank" aria-label="보기 카드"></div>' : ''}
    <div class="in">${session.kind === 'seq' ? '<button class="btn btn-line" id="prev">이전</button>' : ''}<button class="btn btn-main" id="act">확인</button></div></div>`;
  document.getElementById('stop').onclick = () => { save(); push(true); viewHome(); };
  const pv = document.getElementById('prev');
  if (pv) { pv.disabled = session.i === 0; pv.onclick = () => { session.i--; st.pos[scopeKey()] = session.i; save(); nextQuestion(); }; }
  document.getElementById('act').onclick = () => (q.checked ? advance() : check());
  if (q.fmt === 'drag') setupDrag();
  fitDock();
  if (q.fmt !== 'drag') {
    const ins = [...app.querySelectorAll('.blank')];
    ins.forEach((inp, i) => inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      if (!q.checked && i < ins.length - 1) ins[i + 1].focus(); else document.getElementById('act').click();
    }));
    setTimeout(() => { if (ins[0]) ins[0].focus({ preventScroll: true }); }, 40);
  }
  window.scrollTo(0, 0);
}
function fitDock() {
  const d = document.getElementById('dock');
  app.style.paddingBottom = d ? (d.offsetHeight + 24) + 'px' : '';
}
window.addEventListener('resize', fitDock);
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.isComposing && q && q.checked && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && document.getElementById('act')) { e.preventDefault(); advance(); }
});

/* ---------- 끌어 넣기 ---------- */
function setupDrag() {
  const s = q.s, answers = q.blanks.map(([a, b]) => s.t.slice(a, b));
  const pool = [...new Set(DATA.filter(d => d.sec === s.sec).flatMap(d => d.b.map(([a, b]) => d.t.slice(a, b))))].filter(w => !answers.some(x => norm(x) === norm(w)));
  const words = shuffle(answers.concat(shuffle(pool).slice(0, Math.max(2, 5 - answers.length))));
  q.words = words;
  const bank = document.getElementById('bank');
  bank.innerHTML = words.map((w, i) => `<button class="chip" data-ci="${i}">${esc(w)}</button>`).join('');
  const slots = [...app.querySelectorAll('.slot')];
  let selected = null;
  const paint = () => {
    const used = new Set(Object.values(q.fill));
    slots.forEach(sl => { const ci = q.fill[sl.dataset.bi]; sl.classList.toggle('on', ci != null); sl.classList.toggle('ready', selected != null && ci == null); sl.innerHTML = ci != null ? esc(words[ci]) : '&nbsp;'; });
    bank.querySelectorAll('.chip').forEach(c => { c.classList.toggle('used', used.has(+c.dataset.ci)); c.classList.toggle('sel', selected === +c.dataset.ci); });
  };
  const place = (bi, ci) => { if (q.checked) return; for (const k in q.fill) if (q.fill[k] === ci) delete q.fill[k]; q.fill[bi] = ci; selected = null; paint(); };
  const slotAct = sl => {
    if (q.checked) return;
    const bi = sl.dataset.bi;
    if (selected != null) place(bi, selected);
    else if (q.fill[bi] != null) { delete q.fill[bi]; paint(); }
  };
  slots.forEach(sl => {
    sl.addEventListener('click', () => slotAct(sl));
    sl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); slotAct(sl); } });
  });
  bank.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const ci = +chip.dataset.ci; selected = selected === ci ? null : ci; paint(); const empty = slots.find(sl => q.fill[sl.dataset.bi] == null); if (selected != null && empty) empty.focus(); } });
    chip.addEventListener('pointerdown', e => {
      if (q.checked || e.button > 0) return;
      e.preventDefault();
      const ci = +chip.dataset.ci, sx = e.clientX, sy = e.clientY;
      let ghost = null, over = null;
      try { chip.setPointerCapture(e.pointerId); } catch (_) {}
      const move = ev => {
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) { ghost = chip.cloneNode(true); ghost.classList.add('ghost'); ghost.classList.remove('sel'); document.body.appendChild(ghost); chip.style.opacity = .3; }
        if (!ghost) return;
        ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
        const el = document.elementFromPoint(ev.clientX, ev.clientY), sl = el && el.closest('.slot');
        if (over && over !== sl) over.classList.remove('hover');
        if (sl) sl.classList.add('hover');
        over = sl;
      };
      const up = () => {
        chip.removeEventListener('pointermove', move); chip.removeEventListener('pointerup', up); chip.removeEventListener('pointercancel', up);
        chip.style.opacity = '';
        if (ghost) { ghost.remove(); if (over) { over.classList.remove('hover'); place(over.dataset.bi, ci); } return; }
        selected = selected === ci ? null : ci;
        const empty = slots.filter(sl => q.fill[sl.dataset.bi] == null);
        if (selected != null && empty.length === 1) place(empty[0].dataset.bi, ci); else paint();
      };
      chip.addEventListener('pointermove', move); chip.addEventListener('pointerup', up); chip.addEventListener('pointercancel', up);
    });
  });
  paint();
}

/* ---------- 채점과 숙달 단계 ---------- */
function check() {
  const s = q.s, out = document.getElementById('result');
  let allOk = true;
  if (q.fmt === 'drag') {
    const slots = [...app.querySelectorAll('.slot')];
    if (slots.some(sl => q.fill[sl.dataset.bi] == null)) { out.innerHTML = '<span class="bad">빈칸을 모두 채운 뒤 확인을 누르세요.</span>'; return; }
    slots.forEach(sl => {
      const [a, b] = q.blanks[sl.dataset.bi], ans = s.t.slice(a, b), ok = norm(q.words[q.fill[sl.dataset.bi]]) === norm(ans);
      allOk = allOk && ok; sl.classList.add(ok ? 'is-ok' : 'is-bad');
      if (!ok) sl.insertAdjacentHTML('afterend', `<span class="ans">${esc(ans)}</span>`);
    });
  } else {
    const ins = [...app.querySelectorAll('.blank')];
    if (ins.every(i => !i.value.trim())) { out.innerHTML = '<span class="bad">빈칸을 누르고 답을 쓰세요.</span>'; ins[0].focus(); return; }
    ins.forEach(inp => {
      const [a, b] = q.blanks[inp.dataset.bi], ans = s.t.slice(a, b), ok = norm(inp.value) === norm(ans);
      allOk = allOk && ok; inp.classList.add(ok ? 'is-ok' : 'is-bad'); inp.readOnly = true;
      if (!ok) inp.insertAdjacentHTML('afterend', `<span class="ans">${esc(ans)}</span>`);
    });
  }
  q.checked = true;
  const before = st.lv[s.id] || 0;
  let lv;
  if (allOk) { st.streak[s.id] = (st.streak[s.id] || 0) + 1; lv = (q.fmt === 'blank' || st.streak[s.id] >= 2) ? 3 : Math.max(before, 2); }
  else { st.streak[s.id] = 0; lv = before <= 1 ? 1 : before - 1; }
  st.lv[s.id] = lv;
  if (session.kind === 'rand') st.queue.shift();
  st.dirty = true; sinceSave++; save(); if (REMOTE) { setSync('wait'); push(false); }
  out.innerHTML = (allOk ? '<span class="ok">정답입니다.</span>' : '<span class="bad">틀린 빈칸 옆에 정답을 표시했습니다.</span>') + `<span class="lv">이 문장: ${LV_NAME[lv]}</span>`;
  const act = document.getElementById('act'); act.textContent = '다음 문장'; act.focus({ preventScroll: true });
}
function advance() {
  if (session.kind !== 'rand') { session.i++; if (session.kind === 'seq') { st.pos[scopeKey()] = session.i; save(); } }
  nextQuestion();
}
function viewDone() {
  app.style.paddingBottom = '';
  if (session.kind === 'seq') { st.pos[scopeKey()] = 0; save(); }
  push(true);
  const wrong = DATA.filter(s => st.lv[s.id] === 1).length;
  app.innerHTML = `<section class="page done">
    <h2>${session.kind === 'wrong' ? '틀린 문장을 모두 다시 풀었습니다' : '고른 범위를 한 바퀴 다 풀었습니다'}</h2>
    <p>${wrong ? `아직 틀림으로 남은 문장이 ${wrong}개 있습니다.` : '틀림으로 남은 문장이 없습니다.'}</p>
    <div class="quick" style="margin:0"><button class="btn btn-line" id="p">진행 현황 보기</button><button class="btn btn-main" id="h">처음 화면으로</button></div>
  </section>`;
  document.getElementById('p').onclick = viewProgress;
  document.getElementById('h').onclick = viewHome;
}

/* ---------- 진행 현황 ---------- */
function viewProgress() {
  app.style.paddingBottom = '';
  push(true);
  const all = countLv(DATA.map(s => s.id));
  const rows = Object.keys(UNITS).map(u => `<div class="unit" style="padding-top:16px">${UNITS[u]}</div>` + SECTIONS.filter(s => s.unit === u).map(sec => {
    const c = countLv(sec.ids);
    return `<div class="secrow"><div class="sectitle">${esc(sec.name)}<span>${sec.page}쪽 · 숙달 ${c[3]}/${sec.ids.length}</span></div>
      <div class="cells">${sec.ids.map(id => { const l = st.lv[id] || 0; return `<button class="cell l${l}" data-id="${id}" style="background:${LV_COL[l]}" aria-label="${id}번 문장, ${LV_NAME[l]}" title="${esc(BYID[id].t)}">${id}</button>`; }).join('')}</div></div>`;
  }).join('')).join('');
  app.innerHTML = `
  <div class="studybar"><button class="textbtn" id="back">처음 화면으로</button><span class="count">학번 ${sid}</span></div>
  <section class="mastery"><p>숙달 ${all[3]} · 맞힘 ${all[2]} · 틀림 ${all[1]} · 안 풀어 봄 ${all[0]}</p>${stackBar(all, DATA.length)}${legend()}
    <p style="margin:12px 0 0">번호를 누르면 그 문장부터 교과서 순서대로 풉니다.</p></section>
  <section class="scope" style="padding-bottom:14px">${rows}</section>`;
  document.getElementById('back').onclick = viewHome;
  app.querySelectorAll('.cell').forEach(b => b.onclick = () => {
    const id = +b.dataset.id, sec = BYID[id].sec, list = DATA.filter(s => s.sec === sec).map(s => s.id);
    session = { kind: 'seq', list, i: list.indexOf(id), scopeOverride: true };
    st.settings.order = 'seq'; st.settings.scope = [sec]; st.pos[scopeKey()] = session.i; save();
    nextQuestion();
  });
  window.scrollTo(0, 0);
}

/* ---------- 시작 ---------- */
const last = store.get(KEY + 'last');
if (last && /^\d{5}$/.test(last)) {
  openUser(last);
  if (REMOTE) {
    setSync(st.dirty ? 'wait' : 'saved');
    remoteLoad(last).then(j => {
      if (!j.ok && j.error === 'not_registered') { store.del(KEY + 'last'); sid = null; st = null; return viewLogin('등록되지 않은 학번입니다. 다시 입력하세요.'); }
      if (j.ok && mergeFrom(j.progress || '')) st.dirty = true;
      save(); if (!session) viewHome(); push(true);
    }).catch(() => setSync('wait'));
  }
  viewHome();
} else viewLogin();
})();
