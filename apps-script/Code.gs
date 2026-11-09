/**
 * 역사 본문 빈칸 연습 — 진행도 저장용 Google Apps Script
 *
 * 시트 구성
 *  - '명단' 탭 : A열에 학번(5자리)만 입력. 여기 있는 학번만 접속할 수 있습니다.
 *  - '진행' 탭 : 앱이 자동으로 채웁니다. 학번 / 진행 문자열 / 마지막 저장 / 푼 문장 / 숙달 문장 / 최고 기록 / 달성 점수
 *
 * 진행 문자열: 문장 번호 순서대로 한 글자씩, 0=안 풀어 봄 1=틀림 2=맞힘 3=숙달 (지금 상태)
 * 최고 기록  : 같은 형식으로, 문장마다 지금까지 오른 가장 높은 단계. 틀려도 내려가지 않으며 눈사람 달성도에 쓰입니다.
 * 저장되는 개인정보는 학번뿐입니다.
 */

const ROSTER = '명단';
const PROGRESS = '진행';

/** 처음 한 번 실행: 탭과 머리글을 만듭니다. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let r = ss.getSheetByName(ROSTER);
  if (!r) r = ss.insertSheet(ROSTER);
  if (r.getLastRow() === 0) r.appendRow(['학번', '메모(선택)']);
  r.getRange('A:A').setNumberFormat('@');

  let p = ss.getSheetByName(PROGRESS);
  if (!p) p = ss.insertSheet(PROGRESS);
  if (p.getLastRow() === 0) p.appendRow(['학번', '진행 문자열', '마지막 저장', '푼 문장', '숙달 문장', '최고 기록', '달성 점수']);
  else if (!p.getRange(1, 6).getValue()) p.getRange(1, 6, 1, 2).setValues([['최고 기록', '달성 점수']]);
  p.getRange('A:B').setNumberFormat('@');
  p.getRange('F:F').setNumberFormat('@');
  p.setFrozenRows(1);
}

function doGet(e) {
  const action = (e.parameter.action || '').trim();
  const sid = normSid_(e.parameter.sid);
  if (action === 'ping') return json_({ ok: true });
  if (action !== 'load') return json_({ ok: false, error: 'bad_action' });
  if (!sid) return json_({ ok: false, error: 'bad_sid' });
  if (!isRegistered_(sid)) return json_({ ok: false, error: 'not_registered' });
  const row = findRow_(sid);
  if (!row) return json_({ ok: true, progress: '', best: '', updated: '' });
  const v = sheet_(PROGRESS).getRange(row, 1, 1, 6).getDisplayValues()[0];
  return json_({ ok: true, progress: v[1], updated: v[2], best: v[5] || '' });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  const sid = normSid_(body.sid);
  const progress = String(body.progress || '');
  if (body.action !== 'save') return json_({ ok: false, error: 'bad_action' });
  if (!sid) return json_({ ok: false, error: 'bad_sid' });
  if (!/^[0-3]{1,1000}$/.test(progress)) return json_({ ok: false, error: 'bad_progress' });
  let best = String(body.best || '');
  if (best && !/^[0-3]{1,1000}$/.test(best)) return json_({ ok: false, error: 'bad_best' });
  if (!isRegistered_(sid)) return json_({ ok: false, error: 'not_registered' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_(PROGRESS);
    let row = findRow_(sid);
    if (!row) row = sh.getLastRow() + 1;
    // 앱이 접속할 때 시트 기록과 기기 기록을 합친 뒤 보내므로, 받은 값을 그대로 저장합니다.
    const merged = progress;
    const solved = (merged.match(/[123]/g) || []).length;
    const mastered = (merged.match(/3/g) || []).length;
    // 최고 기록은 시트에 있던 값과 받은 값 중 문장별로 높은 쪽을 남깁니다 (절대 내려가지 않음).
    const oldBest = row <= sh.getLastRow() ? String(sh.getRange(row, 6).getDisplayValue() || '') : '';
    best = maxMerge_(maxMerge_(oldBest, best), merged);
    const points = best.split('').reduce((n, c) => n + Math.max(0, Number(c) - 1), 0);
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    sh.getRange(row, 1, 1, 2).setNumberFormat('@');
    sh.getRange(row, 6).setNumberFormat('@');
    sh.getRange(row, 1, 1, 7).setValues([[sid, merged, now, solved, mastered, best, points]]);
    return json_({ ok: true, progress: merged, best: best, updated: now });
  } finally {
    lock.releaseLock();
  }
}

function maxMerge_(a, b) {
  const n = Math.max(a.length, b.length);
  let out = '';
  for (let i = 0; i < n; i++) out += String(Math.max(Number(a[i] || 0), Number(b[i] || 0)));
  return out;
}

function normSid_(v) {
  const s = String(v == null ? '' : v).trim();
  return /^\d{5}$/.test(s) ? s : '';
}

function isRegistered_(sid) {
  const sh = sheet_(ROSTER);
  const last = sh.getLastRow();
  if (last < 2) return false;
  const ids = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
  return ids.some(r => String(r[0]).trim().padStart(5, '0') === sid);
}

function findRow_(sid) {
  const sh = sheet_(PROGRESS);
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const ids = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim().padStart(5, '0') === sid) return i + 2;
  }
  return 0;
}

function sheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('"' + name + '" 탭이 없습니다. setup 함수를 먼저 실행하세요.');
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
