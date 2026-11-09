/* 눈사람 10단계 — 굵은 손그림 선으로 그리는 SVG */
(function () {
'use strict';
const W = 120, GROUND = 104;
const C = {
  sky: '#f5f1ff', ink: '#2c2441', snow: '#ffffff', shade: '#e6ddfb', ground: '#ffffff',
  cheek: '#d9ccf7', carrot: '#f2a466', stick: '#8b6d5c', button: '#6c55bd',
  scarf: '#9d89dc', scarfDark: '#7d67c9', hat: '#4a3a85', band: '#cdbdf3',
  flake: '#c3b2f0', star: '#f2c94c', tree: '#b9a6ee', trunk: '#8b6d5c'
};
const STAGES = [
  { name: '빈 눈밭',       body: 0,  head: 0 },
  { name: '작은 눈뭉치',   body: 9,  head: 0 },
  { name: '굴린 눈덩이',   body: 17, head: 0 },
  { name: '머리 얹기',     body: 22, head: 15 },
  { name: '눈 뜨기',       body: 23, head: 15.5, eyes: 1 },
  { name: '단추 달기',     body: 24, head: 16, eyes: 1, buttons: 1 },
  { name: '당근 코',       body: 25, head: 16.5, eyes: 1, buttons: 1, nose: 1 },
  { name: '나뭇가지 팔',   body: 26, head: 17, eyes: 1, buttons: 1, nose: 1, arms: 1, mouth: 1 },
  { name: '목도리와 모자', body: 27, head: 17.5, eyes: 1, buttons: 1, nose: 1, arms: 1, mouth: 1, scarf: 1, hat: 1 },
  { name: '거대 눈사람',   body: 32, head: 20, eyes: 1, buttons: 1, nose: 1, arms: 1, mouth: 1, scarf: 1, hat: 1, giant: 1 }
];

// 손으로 그린 듯한 흔들림 (같은 단계는 늘 같은 모양)
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function smooth(pts, closed) {
  const n = pts.length, P = i => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${P(0)[0].toFixed(1)},${P(0)[1].toFixed(1)}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + (closed ? 'Z' : '');
}
function blobPath(cx, cy, rx, ry, rand, wob) {
  const pts = [], n = 14;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + (rand() - .5) * wob; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return smooth(pts, true);
}
function line(pts, rand, wob) { return smooth(pts.map(([x, y]) => [x + (rand() - .5) * wob, y + (rand() - .5) * wob]), false); }

function draw(stage) {
  stage = Math.max(1, Math.min(10, stage));
  const st = STAGES[stage - 1], rand = rng(stage * 97 + 13);
  const sw = st.giant ? 3.6 : 3;                       // 선 굵기
  const ink = `stroke="${C.ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
  let o = `<rect width="${W}" height="${W}" fill="${C.sky}"/>`;

  // 눈송이
  const flakes = [[14,14],[34,28],[84,10],[58,40],[18,60],[92,36],[46,16],[74,64],[8,84],[106,20],[28,92],[66,24]];
  flakes.slice(0, 4 + stage).forEach(([x, y]) => { o += `<path d="M${x-2.2},${y}h4.4M${x},${y-2.2}v4.4" stroke="${C.flake}" stroke-width="1.6" stroke-linecap="round"/>`; });

  // 땅
  o += `<path d="${line([[-4,GROUND+1],[30,GROUND-1],[64,GROUND+1.5],[96,GROUND-.5],[124,GROUND+1]], rand, 1.2)}L124,124L-4,124Z" fill="${C.ground}" ${ink}/>`;
  o += `<path d="M14,${GROUND+8}h7M50,${GROUND+10}h6M88,${GROUND+8}h8" stroke="${C.flake}" stroke-width="2" stroke-linecap="round"/>`;

  // 크기 비교용 작은 나무 (항상 같은 크기)
  const tx = 103;
  o += `<path d="${smooth([[tx, GROUND-30],[tx-9, GROUND-12],[tx+9, GROUND-12]], true)}" fill="${C.tree}" ${ink} stroke-width="${sw*.8}"/>`;
  o += `<path d="M${tx},${GROUND-12}V${GROUND-1}" ${ink} stroke="${C.trunk}" stroke-width="${sw*.9}"/>`;

  const cx = st.giant ? 52 : 54;
  const ball = (cy, r) => {
    o += `<path d="${blobPath(cx, cy, r * 1.03, r, rand, .035)}" fill="${C.snow}" ${ink}/>`;
    o += `<path d="M${cx + r*.25},${cy + r*.72} Q${cx + r*.72},${cy + r*.55} ${cx + r*.78},${cy + r*.12}" fill="none" stroke="${C.shade}" stroke-width="${r*.16}" stroke-linecap="round"/>`;
  };

  let by = 0, hy = 0;
  if (st.arms) {
    const ay = GROUND - st.body * 1.35, L = st.giant ? 22 : 16;
    const left = [[cx - st.body * .8, ay], [cx - st.body * .8 - L * .55, ay - L * .45], [cx - st.body * .8 - L, ay - L * .7]];
    const right = [[cx + st.body * .8, ay], [cx + st.body * .8 + L * .55, ay - L * .5], [cx + st.body * .8 + L, ay - L * .8]];
    o += `<path d="${line(left, rand, 1.5)}" fill="none" ${ink} stroke="${C.stick}"/><path d="${line(right, rand, 1.5)}" fill="none" ${ink} stroke="${C.stick}"/>`;
    o += `<path d="M${left[1][0]},${left[1][1]} l-2,-7" ${ink} stroke="${C.stick}"/><path d="M${right[1][0]},${right[1][1]} l1,-7" ${ink} stroke="${C.stick}"/>`;
  }
  if (st.body) { by = GROUND - st.body + 1; ball(by, st.body); }
  if (st.head) { hy = by - st.body - st.head + st.head * .45; ball(hy, st.head); }

  if (st.buttons) {
    const g = st.body * .36, r = st.giant ? 2.4 : 1.9;
    [-.2, .8, 1.8].forEach(k => { o += `<circle cx="${cx + (rand() - .5)}" cy="${by - st.body * .55 + k * g}" r="${r}" fill="${C.button}"/>`; });
  }
  if (st.eyes) {
    const ex = st.head * .34, ey = hy - st.head * .14, r = st.giant ? 2.8 : 2.3;
    o += `<ellipse cx="${cx - ex}" cy="${ey}" rx="${r*.9}" ry="${r*1.15}" fill="${C.ink}"/><ellipse cx="${cx + ex}" cy="${ey}" rx="${r*.9}" ry="${r*1.15}" fill="${C.ink}"/>`;
    o += `<circle cx="${cx - ex + r*.3}" cy="${ey - r*.4}" r="${r*.32}" fill="#fff"/><circle cx="${cx + ex + r*.3}" cy="${ey - r*.4}" r="${r*.32}" fill="#fff"/>`;
    o += `<ellipse cx="${cx - ex - st.head*.2}" cy="${ey + st.head*.36}" rx="${st.head*.17}" ry="${st.head*.1}" fill="${C.cheek}"/><ellipse cx="${cx + ex + st.head*.2}" cy="${ey + st.head*.36}" rx="${st.head*.17}" ry="${st.head*.1}" fill="${C.cheek}"/>`;
  }
  if (st.mouth) {
    const my = hy + st.head * .5, w = st.head * .18;
    o += `<path d="M${cx - w},${my} Q${cx},${my + w * .9} ${cx + w},${my}" fill="none" ${ink} stroke-width="${sw*.75}"/>`;
  }
  if (st.nose) {
    const nl = st.giant ? 18 : 14, nh = st.giant ? 4.2 : 3.4, ny = hy + st.head * .14;
    o += `<path d="M${cx - 1},${ny - nh} Q${cx + nl * .5},${ny - nh * .4} ${cx + nl},${ny + .8} Q${cx + nl * .5},${ny + nh * .7} ${cx - 1},${ny + nh} Z" fill="${C.carrot}" stroke="${C.ink}" stroke-width="1.7" stroke-linejoin="round"/>`;
  }
  if (st.scarf) {
    const sy = hy + st.head * .86, hw = st.head * .98, h = st.giant ? 7.5 : 6;
    o += `<path d="M${cx - hw},${sy - h/2} Q${cx},${sy - h/2 + 3} ${cx + hw},${sy - h/2} L${cx + hw},${sy + h/2} Q${cx},${sy + h/2 + 3} ${cx - hw},${sy + h/2} Z" fill="${C.scarf}" ${ink}/>`;
    const tl = st.giant ? 18 : 13, tx0 = cx + hw * .45;
    o += `<path d="M${tx0},${sy} L${tx0 + 2},${sy + tl} L${tx0 + 8},${sy + tl - 1} L${tx0 + 6},${sy + 1} Z" fill="${C.scarfDark}" ${ink}/>`;
  }
  if (st.hat) {
    const top = hy - st.head * .82, hw = st.head * .62, bw = st.head * .95, hh = st.giant ? 11 : 10;
    o += `<path d="M${cx - hw},${top} L${cx - hw + 1},${top - hh} L${cx + hw - 1},${top - hh} L${cx + hw},${top} Z" fill="${C.hat}" ${ink}/>`;
    o += `<path d="M${cx - hw + .5},${top - 4} L${cx + hw - .5},${top - 4}" stroke="${C.band}" stroke-width="${st.giant ? 3.4 : 2.6}"/>`;
    o += `<path d="M${cx - bw},${top + 1} Q${cx},${top - 2} ${cx + bw},${top + 1}" fill="none" ${ink} stroke="${C.ink}" stroke-width="${sw*1.5}"/>`;
  }
  if (st.giant) {
    [[16, 30, 5], [96, 58, 4], [20, 72, 3.5]].forEach(([x, y, r]) => {
      o += `<path d="M${x},${y - r} Q${x + r*.18},${y - r*.18} ${x + r},${y} Q${x + r*.18},${y + r*.18} ${x},${y + r} Q${x - r*.18},${y + r*.18} ${x - r},${y} Q${x - r*.18},${y - r*.18} ${x},${y - r}Z" fill="${C.star}" stroke="${C.ink}" stroke-width="1.4" stroke-linejoin="round"/>`;
    });
  }
  return `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="눈사람 ${stage}단계: ${st.name}">${o}</svg>`;
}

/* 달성도 → 단계. 점수: 맞힘 1점, 숙달 2점 (249문장 × 2 = 498점 만점) */
const CUTS = [0, 1, 5, 12, 20, 30, 42, 55, 70, 85];
function stageOf(points, max) {
  if (points <= 0) return 1;
  const pct = points / max * 100;
  let s = 2;
  for (let i = 2; i < CUTS.length; i++) if (pct >= CUTS[i]) s = i + 1;
  return s;
}
function needFor(stage, max) { return stage <= 1 ? 0 : stage === 2 ? 1 : Math.ceil(CUTS[stage - 1] / 100 * max); }

window.Snowman = { draw, stageOf, needFor, STAGES, CUTS };
})();
