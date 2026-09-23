// @ts-nocheck
// 원본: 바루픽 설계 스크래치 charlab/v7.js (2026-09-08). 검증: refset 50벌 · sim7.mjs. 고칠 때는 원본과 함께.
/* 바루픽 컬러 점수 엔진 v8.5b — v8 + 레퍼런스 학습 수정 A~J2 (규칙은 그대로, 조건만 좁힘)
 * 실제 룩 495벌 학습 결과. FIX 스위치를 하나씩 꺼서 어느 수정이 어떤 결과를 냈는지 가른다.
 * 근거·측정: 바루픽_레퍼런스_학습_1단계.md, 컬러조합_연구/learn/21_v85b_output.md
 *
 * (아래는 v7.1 원문 주석)
 * 바루픽 컬러 점수 엔진 v7.1 — 시제품 (2차: 모든 판정을 연속 가중치로)
 *
 * 근거: 바루픽_컬러_추천_과정_설계_연구.md 3.1/3.2/7장, sajucolor/engine.js 에서 가져온 것
 *   (개인 대비 수준, 명도 구조 배율, 강한 색 면적 규칙, 이름 목록 대신 HCL 영역),
 *   렌더러에서 실측한 옷 면적·가려짐 비율(2026-09-08).
 * 2차 수정: 무채/유채·강한 색을 문턱이 아니라 램프(연속)로 — 근접 색 교체에 점수가 튀지 않게.
 *   패션 무채(네이비·다크 브라운·데님)는 색 수에 절반만 센다. 원톤(수트·올블랙)은 안쪽·신발 대비로 판정.
 *
 * evaluate(items, ctx) → { total, parts, reasons[{id,txt,w,slots}], … }
 *   items: [{slot, id, hex, color?}]  slot ∈ outer/layer/top/inner/bottom/shoes/scarf/tie/socks/hat
 *   ctx: { situ, month, pc:null|'spring'|'summer'|'autumn'|'winter', contrast?, body? }
 */

const lchCache = new Map();
function lch(hex) {
  if (lchCache.has(hex)) return lchCache.get(hex);
  const h = hex.replace('#', '');
  let [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  [r, g, b] = [f(r), f(g), f(b)];
  const X = r * .4124 + g * .3576 + b * .1805, Y = r * .2126 + g * .7152 + b * .0722, Z = r * .0193 + g * .1192 + b * .9505;
  const k = t => (t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = k(X / .95047), fy = k(Y), fz = k(Z / 1.08883);
  const L = 116 * fy - 16, a = 500 * (fx - fy), bb = 200 * (fy - fz);
  const o = { L, C: Math.hypot(a, bb), h: (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360 };
  lchCache.set(hex, o); return o;
}
const dH = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const ramp = (x, a, b) => { const t = (x - a) / (b - a); return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); };
const band = (x, a, b, c, d) => Math.min(ramp(x, a, b), 1 - ramp(x, c, d));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const NEUTRAL_C = 14, SOFT_C = 30;
const warmHue = h => h < 105 || h > 320;
const earthHue = h => h >= 40 && h <= 110;

/* ── 8단계 수정 스위치 (하나씩 꺼 보며 원인을 가른다) ────────── */
export const FIX = { A: true, A2: true, B: true, C: true, D: true, D2: false, E: true, F: true, G: true, H: true, I: true, J1: true, J2: true };
/* A. 데님을 판 id 가 아니라 색으로 본다 — h 200~290 · C 20~40 · L 35~65 */
/* A2. 틸(h 202)·다크틸(199)까지 데님으로 삼키지 않게 색상각 바닥을 200→230 으로.
   데님 계열 네 색(denim 276 · dusty_blue 265 · steel_blue 263 · powder_blue 235)은 그대로 들어온다 */
const denimW = c => band(c.h, FIX.A2 ? 225 : 195, FIX.A2 ? 235 : 205, 285, 295) * band(c.C, 16, 22, 38, 46) * band(c.L, 30, 36, 64, 70);
/* I. 브라운·코냑·마룬·옥스블러드 신발(어스·와인 색상각, 어두움)은 무채로 센다 */
const shoeBrownW = c => band(c.h, 3, 10, 104, 112) * (1 - ramp(c.L, 48, 58)) * (1 - ramp(c.C, 50, 58));

/* ── 면적 모델 (렌더러 실측, 몸 면적 대비) ────────── */
const AREA = {
  outer: { '17_coat_long': .91, '30_trench': .92, '28_coat_short': .62, '19_blazer': .46, '31_trucker': .50, '29_puffer': .53, '32_padding_long': .95, _: .55 },
  layer: { '15_cardigan': .47, '14_knit_vest': .34, '10_shirt_open': .52, '45_vest_padding': .30, _: .45 },
  top:   { '16_hoodie': .65, '11_knit_crew': .57, '35_sweat': .56, '08_shirt_closed': .55, '13_knit_turtle': .55, '07_tee_long': .52, '12_knit_vneck': .47, '09_shirt_short': .44, '37_polo': .40, '06_tee_short': .40, '36_tank': .27, _: .52 },
  inner: { _: .06 },
  bottom:{ '61_pants_balloon': .63, '60_denim_barrel': .58, '04_slacks_wide': .54, '63_chino': .52, '02_denim_wide': .48, '01_denim_straight': .47, '39_cargo': .48, '03_slacks_straight': .44, '49_skirt_long': .67, '24_skirt_pleat': .33, _: .48 },
  shoes: { '73_sneaker_chunky': .09, '76_boots_walker': .08, '75_boots_chelsea': .07, '74_loafer': .055, '77_derby': .05, '71_sneaker_canvas': .045, '78_flats_ballet': .03, _: .06 },
  scarf: { '58_scarf_blanket': .48, '54_scarf': .20, '57_scarf_cable': .19, '55_snood': .11, '56_scarf_silk': .02, _: .18 },
  tie: { _: .05 }, socks: { _: .04 }, hat: { _: .08 },
};
const TOP_UNDER = { '28_coat_short': .13, '19_blazer': .17, '30_trench': .04, '31_trucker': .11, '17_coat_long': .12, '29_puffer': .13, '32_padding_long': .05, '15_cardigan': .16, '14_knit_vest': .35, '10_shirt_open': .09, '45_vest_padding': .46, _: .15 };
const BOTTOM_UNDER = { '28_coat_short': .74, '19_blazer': .95, '30_trench': .25, '17_coat_long': .28, '29_puffer': 1, '31_trucker': .95, '32_padding_long': .2, _: .8 };
const areaOf = (slot, id) => { const t = AREA[slot] || { _: .1 }; return t[id] !== undefined ? t[id] : t._; };
function visibleAreas(items) {
  const by = s => items.find(i => i.slot === s);
  const outer = by('outer'), layer = by('layer'), top = by('top'), inner = by('inner'), bottom = by('bottom');
  const vis = {};
  if (outer) vis.outer = areaOf('outer', outer.id);
  if (layer) vis.layer = areaOf('layer', layer.id) * (outer ? .08 : 1);
  if (top) { let a = areaOf('top', top.id); if (outer) a *= (TOP_UNDER[outer.id] ?? TOP_UNDER._); else if (layer) a *= (TOP_UNDER[layer.id] ?? TOP_UNDER._); vis.top = a; }
  if (inner) vis.inner = top ? .04 : areaOf('top', inner.id);
  if (bottom) { let a = areaOf('bottom', bottom.id); if (outer) a *= (BOTTOM_UNDER[outer.id] ?? BOTTOM_UNDER._); vis.bottom = a; }
  for (const s of ['shoes', 'scarf', 'tie', 'socks', 'hat']) { const it = by(s); if (it) vis[s] = areaOf(s, it.id); }
  if (vis.tie && outer) vis.tie *= .6;
  const sum = Object.values(vis).reduce((a, b) => a + b, 0) || 1;
  for (const k in vis) vis[k] /= sum;
  return vis;
}

const SITU = { work: { accentMax: .10, bigC: 38, strict: 1.4 }, formal: { accentMax: .06, bigC: 32, strict: 1.7 }, date: { accentMax: .18, bigC: 55, strict: 1 }, daily: { accentMax: .22, bigC: 62, strict: .9 }, active: { accentMax: .35, bigC: 85, strict: .6 }, home: { accentMax: .35, bigC: 85, strict: .6 } };
const SEASON_OF = m => (m >= 3 && m <= 5) ? 'spring' : (m >= 6 && m <= 8) ? 'summer' : (m >= 9 && m <= 11) ? 'autumn' : 'winter';
function toneFail(c, pc) {
  if (!pc) return null;
  if (pc === 'winter') {
    if (c.C > NEUTRAL_C && c.C < 32 && c.L > 40 && c.L < 75) return '탁한';
    if (earthHue(c.h) && c.C > NEUTRAL_C && c.C < 65) return '따뜻한 흙빛';
    if (c.h >= 15 && c.h <= 50 && c.C >= 30 && c.C <= 68 && c.L > 50) return '부드러운 웜톤';
  }
  if (pc === 'summer') {
    if (c.C >= 55 && warmHue(c.h)) return '쨍한 웜톤';
    if (c.L < 22 && c.C < 20) return '너무 어두운';
    if (earthHue(c.h) && c.C >= 25 && c.L < 60) return '따뜻한 흙빛';
  }
  if (pc === 'autumn') {
    if (c.C <= NEUTRAL_C && c.L < 20) return '새까만';
    if (c.L > 85 && c.C > NEUTRAL_C && !warmHue(c.h)) return '차가운 파스텔';
    if (c.C >= 50 && !warmHue(c.h)) return '쨍한 쿨톤';
  }
  if (pc === 'spring') {
    if (c.L < 25 && c.C < 30) return '너무 어두운';
    if (c.C > NEUTRAL_C && c.C < 30 && c.L > 35 && c.L < 70) return '탁한';
    if (c.C >= 45 && !warmHue(c.h) && c.L < 45) return '어두운 쿨톤';
  }
  return null;
}
const DEFAULT_CONTRAST = { winter: 'high', spring: 'mid', autumn: 'mid', summer: 'low' };
const SLOT_KO = { outer: '아우터', layer: '레이어드', top: '상의', inner: '이너', bottom: '하의', shoes: '신발', scarf: '목도리', tie: '넥타이', socks: '양말', hat: '모자' };

/* 연속 가중치들 */
const isDenim = p => /denim|trucker/.test(p.id || '') && p.c.C < 45 && p.c.h > 220 && p.c.h < 310;
/* 베이지·카멜·브라운 계열 색상각. 어두운 브라운(초콜릿·체스넛)은 붉은 쪽까지, 밝은 베이지는 노란 쪽만 */
const earthW = (h, L) => (L < 50 ? ramp(h, 20, 32) : ramp(h, 52, 64)) * (1 - ramp(h, 108, 118));
/* 패션 무채 가중치 0(색) … 1(무채): 흑백회 · 네이비 · 데님 · 어두운 브라운 계열 · 밝은 베이지 계열.
   스타일리스트는 크림·카멜·네이비·브라운을 "색"이 아니라 바탕으로 센다. 계산 채도만 보던 v7 은
   다크틸(C 17)·네이비(18)·올리브(26)까지 무채로 넣어 톤·온도 규칙에서 빠뜨렸다 — 그 입구를 고친다. */
function fashionNeutral(c, id) {
  let w = 1 - ramp(c.C, 12, 20);
  if (c.h >= 250 && c.h <= 310) w = Math.max(w, 1 - ramp(c.L, 28, 36));                       // 네이비
  if (/denim|trucker/.test(id || '') && c.h > 220 && c.h < 310) w = Math.max(w, 1 - ramp(c.C, 40, 50));
  if (FIX.A) w = Math.max(w, denimW(c));                                                      // A. 색으로 본 데님
  const e = earthW(c.h, c.L);
  if (e > 0) { const dark = 1 - ramp(c.L, 44, 52), light = ramp(c.L, 56, 64); w = Math.max(w, e * Math.max(dark * (1 - ramp(c.C, 42, 50)), light * (1 - ramp(c.C, 32, 40)))); }
  return w;
}
function chromaWeight(p) { return 1 - fashionNeutral(p.c, p.id); }   /* 0 무채 … 1 유채 */
function vivid(p) {                   /* 0 차분 … 1 쨍함. 어두우면 덜 쨍하게 보이고, 어스 색은 문턱이 높다 */
  const c0 = earthHue(p.c.h) ? 58 : 44;
  return ramp(p.c.C, c0, c0 + 22) * ramp(p.c.L, 26, 44) * (isDenim(p) ? .3 : 1);
}
/* 톤 등급 — 톤 일치(R1 계열)가 쓴다. vivid 와 달리 어스 문턱이 없고 채도만 본다 */
/* D. 어스 색상각은 vivid() 처럼 문턱을 높인다 — 카멜·머스타드는 채도가 높아도 덜 쨍하게 보인다 */
/* D'. 어스 문턱은 색상각 45~110 에만 — 붉은 주황(20~45, 코랄·스칼렛)은 보통 문턱 그대로 */
/* D2. 어스 문턱은 밝은 어스(L≥62: 머스타드·카멜·샌드·오트밀)에만 — 깊은 카라멜(L57)·러스트(44)는 그냥 쨍한 색이다 */
const toneVivid = c => { const c0 = (FIX.D && c.h >= 45 && c.h <= 110 && (!FIX.D2 || c.L >= 62)) ? 58 : 40; return ramp(c.C, c0, c0 + 10) * ramp(c.L, 30, 40); };
const tonePastel = c => ramp(c.L, 74, 82);
const toneDeep = c => 1 - ramp(c.L, 30, 40);

function evaluate(items, ctx) {
  ctx = ctx || {};
  const situ = SITU[ctx.situ] || SITU.daily;
  const pc = ctx.pc || null;
  const contrast = ctx.contrast || (pc ? DEFAULT_CONTRAST[pc] : 'mid');
  const season = SEASON_OF(ctx.month || (new Date().getMonth() + 1));
  const vis = visibleAreas(items);
  const P = items.filter(i => vis[i.slot] > .015).map(i => ({ ...i, c: lch(i.hex), area: vis[i.slot], ko: i.name || SLOT_KO[i.slot] || i.slot }));
  P.forEach(p => { p.fn = fashionNeutral(p.c, p.id); if (FIX.I && p.slot === 'shoes') p.fn = Math.max(p.fn, shoeBrownW(p.c)); p.wc = 1 - p.fn; p.vv = vivid(p); p.viv = toneVivid(p.c); p.pas = tonePastel(p.c); p.deep = toneDeep(p.c); p.kind = p.wc < .15 ? 'neutral' : p.wc < .75 ? 'soft' : 'chroma'; });
  const by = s => P.find(p => p.slot === s);
  const reasons = [], parts = {};
  const add = (id, txt, w, slots) => reasons.push({ id, txt, w, slots: slots || [] });
  const nm = p => (p.color ? p.color + ' ' : '') + p.ko;
  /* 받침에 따라 조사를 고른다 — 색+옷 이름이라 "블랙 신발가" 같은 게 나온다 */
  const js = (s, no, yes) => { const c = s.charCodeAt(s.length - 1); return s + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 0 ? no : yes); };
  const nmW = p => js(nm(p), '와', '과'), nmN = p => js(nm(p), '는', '은'), nmG = p => js(nm(p), '가', '이');
  const sameHue = (a, b) => (a.c.C <= NEUTRAL_C && b.c.C <= NEUTRAL_C) || dH(a.c.h, b.c.h) < 25 || a.c.C <= NEUTRAL_C || b.c.C <= NEUTRAL_C;

  /* 1. 명도 구조 30 */
  const TARGET = { high: [26, 40, 100, 125], mid: [12, 22, 90, 115], low: [8, 14, 62, 85] }[contrast];   /* 위 끝은 사실상 열어 둔다 — 흑백은 정석이다 */
  const upperItems = P.filter(p => ['outer', 'layer', 'top'].includes(p.slot));
  const bot = by('bottom');
  let mScore = 0, fitL = 1;
  if (upperItems.length && bot) {
    const upArea = upperItems.reduce((s, p) => s + p.area, 0);
    const upperL = upperItems.reduce((s, p) => s + p.c.L * p.area, 0) / upArea;
    const upperMain = upperItems.reduce((a, b) => (a.area >= b.area ? a : b));
    const dLmain = Math.abs(upperMain.c.L - bot.c.L);
    const sep = (a, b) => Math.abs(a.L - b.L) + Math.min(8, .15 * Math.abs(a.C - b.C)) + Math.min(6, .1 * Math.min(dH(a.h, b.h), 60) * Math.min(a.C, b.C) / 60);   /* 명도가 1순위, 채도·색상 차는 보조(최대 +14) */
    const upC = upperItems.reduce((s, p) => s + p.c.C * p.area, 0) / upArea, upH = upperMain.c.h;
    const dL = sep(upperMain.c, bot.c) + ((isDenim(bot) || isDenim(upperMain)) && !(isDenim(bot) && isDenim(upperMain)) ? 6 : 0);
    const oneTone = dLmain < 10 && sameHue(upperMain, bot) && Math.abs(upperMain.c.C - bot.c.C) < 20;
    let fit = band(dL, TARGET[0], TARGET[1], TARGET[2], TARGET[3]);
    /* 실무 예외 4종 — v7 의 "뭉개짐" 판정이 실무에서 정상인 착장(어두운 톤온톤·올화이트·흑백)을 깎던 자리.
       모자란 만큼을 비율로 되돌린다. 원톤 전용이던 "갈라 주는 자리" 판정을 모든 경우로 일반화하고 양말도 후보에 넣는다. */
    const lowFit = 1 - ramp(fit, .55, .8);                      /* 구조가 실제로 모자랄 때만 구제한다 — 이미 괜찮은 착장까지 밀어 올리면 무작위 조합이 같이 뜬다 */
    const recover = (f, w, k) => f + (1 - f) * w * lowFit * clamp(k, 0, 1);
    const breakers = P.filter(p => p !== upperMain && p.area >= .035 && ['top', 'layer', 'inner', 'shoes', 'scarf', 'tie', 'socks'].includes(p.slot));
    const brkOf = p => ramp(Math.abs(p.c.L - upperMain.c.L), 18, 32) * ramp(Math.abs(p.c.L - bot.c.L), 12, 24);
    const brkP = breakers.reduce((m, p) => (!m || brkOf(p) > brkOf(m)) ? p : m, null);
    const brk = brkP ? brkOf(brkP) : 0;
    if (oneTone) fit = Math.max(fit, .45 + .55 * ramp(breakers.reduce((m, p) => Math.max(m, Math.abs(p.c.L - upperMain.c.L)), 0), 18, 45));
    const hueCarry = ramp(Math.max(upperMain.c.C, bot.c.C), 30, 45) * ramp(dH(upperMain.c.h, bot.c.h), 40, 70) * (1 - brk);
    const lightTonal = ramp(Math.min(upperMain.c.L, bot.c.L), FIX.C ? 58 : 66, FIX.C ? 66 : 74) * Math.max(ramp(Math.max(upperMain.c.C, bot.c.C), 10, 16), ramp(Math.min(upperMain.c.L, bot.c.L), 78, 84)) * (1 - brk);
    /* H. 크림·오프화이트도 무채다 — 계산 채도가 아니라 패션 무채로 본다 */
    const bwNeutral = FIX.H ? (upperMain.fn >= .5 && bot.fn >= .5) : (upperMain.c.C <= NEUTRAL_C && bot.c.C <= NEUTRAL_C);
    const bw = bwNeutral && Math.abs(upperMain.c.L - bot.c.L) > 80 ? 1 : 0;
    /* J2. outer/top/bottom 이 전부 같은 색이고 갈라 주는 자리가 없으면 어떤 구제도 걸지 않는다(카멜 4벌 원톤은 낮아야 한다).
       v7 원래의 원톤 바닥(fit .45)은 남긴다 — 그것까지 없애면 카멜 4벌이 v8 값(51)보다 한참 아래로 떨어진다 */
    const bigThree = ['outer', 'top', 'bottom'].map(s => by(s)).filter(Boolean);
    const j2 = FIX.J2 && bigThree.length >= 2 && bigThree.every(p => p.hex === bigThree[0].hex) && brk < .35;
    const gk = j2 ? 0 : 1;
    /* J1. 어두운 톤온톤 구제 — 위아래 둘 다 L<40 이고 같은 가족(또는 둘 다 패션 무채)인데
       밝은 자리(이너·신발·양말 중 L≥70, 면적 3.5% 이상)가 갈라 주면 모자란 만큼의 70% 를 되돌린다.
       밝은 자리가 없으면 구제 없음 — 어둡기만 한 뭉개짐과 갈라 준 다크 톤온톤을 가르는 건 그 자리다 */
    const brightSlot = P.some(p => ['inner', 'shoes', 'socks'].includes(p.slot) && p.c.L >= 70 && p.area >= .035);
    const darkTonal = (FIX.J1 && upperMain.c.L < 40 && bot.c.L < 40
      && (dH(upperMain.c.h, bot.c.h) < 30 || (upperMain.fn >= .5 && bot.fn >= .5)) && brightSlot) ? 1 : 0;
    fit = recover(fit, .9, brk * gk); fit = recover(fit, .8, hueCarry * gk); fit = recover(fit, .9, lightTonal * gk); fit = recover(fit, .8, bw * gk);
    fit = recover(fit, .7, darkTonal * gk);
    /* E. 위아래+신발이 전부 블랙이면 감점 절반 — 올블랙은 실무에서 정상이다 */
    const shE = by('shoes');
    /* E'. "올블랙"은 채도도 본다 — 네이비(C 18)·미드나잇(C 20)은 어두워도 블랙이 아니다 */
    const isK = p => p && p.c.L < 18 && p.c.C <= NEUTRAL_C;
    const allBlack = FIX.E && isK(upperMain) && isK(bot) && isK(shE);
    if (allBlack) fit = fit + (1 - fit) * .5;
    /* 갈라 주는 자리는 밝을 수도 어두울 수도 있다(brkOf 는 절대값) — 말을 방향에 맞춰야 한다 */
    const brkUp = brkP && brkP.c.L > (upperMain.c.L + bot.c.L) / 2;
    if (brk > .35) add('tonal-breaker', `위아래 색이 비슷한데 ${nmG(brkP)} ${brkUp ? '밝아서 답답해 보이지 않아요' : '어두워서 밋밋하지 않아요'}`, 1, [brkP.slot, 'top', 'bottom']);
    else if (oneTone) add('onetone-flat', '위아래가 온통 같은 색이라 밋밋해요. 이너나 신발만 밝은 걸로 바꿔도 확 살아나요', -1, ['top', 'shoes', 'inner']);
    else if (dL < TARGET[1] * .6) {
      if (hueCarry > .35) add('hue-carries', `${nmW(upperMain)} ${nmN(bot)} 비슷하게 밝지만 색이 달라서 따로따로 잘 보여요`, 1, ['top', 'bottom']);
      else if (lightTonal > .35) add('light-tonal', '밝은 색으로만 맞춰 입어서 가볍고 산뜻해요', 1, ['top', 'bottom']);
      else if (darkTonal > .35) add('dark-tonal', '어두운 색으로 차분하게 맞추고 한 군데만 밝게 둬서 답답하지 않아요', 1, ['top', 'bottom']);
      else add('dL-low', '위아래 색이 너무 비슷해서 한 덩어리로 보여요', -2, ['top', 'bottom', 'outer']);
    }
    else if (dL > TARGET[3]) { if (bw) add('bw-contrast', `${nmW(upperMain)} ${nmN(bot)} 흑백 조합이라 실패할 일이 없어요`, 1, ['top', 'bottom']); else add('dL-high', '위아래가 너무 확 차이 나서 뚝 끊겨 보여요. 중간쯤 되는 색을 하나 걸치면 자연스러워져요', -1, ['top', 'bottom']); }
    else if (fit > .8) add('dL-ok', '위아래가 또렷하게 나뉘어서 보기 좋아요', 1, ['top', 'bottom']);
    mScore += 22 * fit;
    const o = by('outer'), t = by('top') || by('layer');
    if (o && t) { const d2 = Math.abs(o.c.L - t.c.L); const oi = ramp(d2, 6, 22); mScore += 5 * (allBlack ? .5 + .5 * oi : oi); if (d2 < 8) add('outer-inner', `${nmW(o)} ${nmN(t)} 밝기가 비슷해서 겹쳐 입은 티가 안 나요`, -1, ['outer', 'top']); }
    else mScore += 5;
    const wantLightBottom = ctx.body && ctx.body.bottom === 'light';
    mScore += 3 * (wantLightBottom ? ramp(bot.c.L - upperL, -8, 4) : ramp(upperL - bot.c.L, -8, 4));
    fitL = mScore / 30;
  } else { mScore = 18; fitL = .6; }
  parts['명도 구조'] = [Math.round(mScore), 30];

  /* 2. 색 수와 면적 20 */
  const fams = [];   // {h, w}
  P.forEach(p => { const w = p.wc * ramp(p.area, .03, .12); if (w < .05) return; const f = fams.find(f => dH(f.h, p.c.h) < 30); if (f) f.w = Math.max(f.w, w); else fams.push({ h: p.c.h, w }); });
  const n = fams.reduce((s, f) => s + f.w, 0);
  // 무채색 일색은 안전한 정석이라 크게 깎지 않는다 (v7.3: 12+4n → 16+4n). 색이 하나 있으면 20, 둘째부터 서서히, 셋째부터 가파르게
  let cScore = n < 1 ? 16 + 4 * n : n <= 2 ? 20 - 2 * (n - 1) : n <= 3 ? 18 - 7 * (n - 2) : Math.max(3, 11 - 7 * (n - 3));
  if (n >= 2.6) add('too-many', `색이 ${Math.round(n)}가지나 섞여서 좀 복잡해요. 하나는 검정이나 회색처럼 무난한 색으로 바꿔 보세요`, -2, P.filter(p => p.wc >= .5).map(p => p.slot));
  if (n < .3) add('all-neutral', '검정·흰색·회색뿐이라 무난하긴 한데 밋밋해요. 목도리나 신발에 색을 하나 넣어 보세요', 0, ['scarf', 'shoes', 'top']);
  /* G·G'. 유채가 한 가족뿐이고 나머지가 무채면 "주인공 하나" 룩이다 — 넓이 감점을 반으로.
     아이템 개수가 아니라 색 가족(색상각 20° 안)으로 센다: 레드 코트 + 레드 모자는 하나다 */
  const heroFams = [];
  P.filter(p => p.fn < .5 && p.area >= .03).forEach(p => { if (!heroFams.some(h => dH(h, p.c.h) < 20)) heroFams.push(p.c.h); });
  const heroK = FIX.G && heroFams.length === 1 ? .5 : 1;
  const strongArea = P.reduce((s, p) => s + p.area * p.vv, 0);
  if (strongArea > situ.accentMax) { const pen = Math.min(16, (strongArea - situ.accentMax) * 45 * situ.strict) * heroK; cScore -= pen; add('accent-big', `쨍한 색이 몸의 ${Math.round(strongArea * 100)}%를 차지해요. 포인트 색은 좁게 쓸수록 눈에 띄어요`, -2, P.filter(p => p.vv > .4).map(p => p.slot)); }
  const anchor = P.reduce((a, b) => (a.area >= b.area ? a : b), P[0]);
  if (anchor && anchor.vv > .25) { cScore -= 8 * anchor.vv * heroK; add('anchor', `가장 넓은 ${nmG(anchor)} 너무 쨍해요. 넓게 차지하는 옷일수록 차분한 색이라야 편해 보여요`, -2, [anchor.slot]); }
  const chromItems = P.filter(p => p.wc > .5 && p.area >= .05);
  if (chromItems.length >= 3 && !P.some(p => p.wc < .3 && p.area >= .05)) { const vAvg = chromItems.reduce((s, p) => s + p.vv, 0) / chromItems.length; const pen = 6 + 6 * vAvg; cScore -= pen; add('no-neutral', '전부 색이 있는 옷이라 눈이 쉴 곳이 없어요. 검정이나 흰색을 하나 넣어 보세요', -1, chromItems.map(p => p.slot)); }
  parts['색 수·면적'] = [Math.round(clamp(cScore, 0, 20)), 20];

  /* 3. 조화 25 — 실무 규칙 층이 들어오면서 20 → 25 (상황·계절 10 → 5 로 상쇄, 합 100 유지) */
  let hScore = 25;
  /* 점수는 연속으로 깎고, 문구는 눈에 띌 만큼(1.5점) 깎였을 때만 남긴다 */
  const rule = (id, txt, d, slots) => { if (!(d > 0)) return; hScore -= d; if (d >= 1.5) add(id, txt, -1, slots || []); };
  /* F. 밝은 자리가 있으면 그레이×브라운은 문제가 아니다 */
  const brightSomewhere = P.some(p => p.c.L >= 70 && p.area >= .035);
  const ADJ = [['outer', 'top'], ['outer', 'layer'], ['layer', 'top'], ['top', 'bottom'], ['layer', 'bottom'], ['outer', 'bottom'], ['bottom', 'shoes'], ['top', 'scarf'], ['outer', 'scarf'], ['top', 'tie']];
  const nextTo = (a, b) => ADJ.some(([x, y]) => (a.slot === x && b.slot === y) || (a.slot === y && b.slot === x));
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i], b = P[j]; const w = Math.min(a.wc, b.wc); const dh = dH(a.c.h, b.c.h), dl = Math.abs(a.c.L - b.c.L);
    const bigPair = ['outer', 'layer', 'top', 'bottom'].includes(a.slot) && ['outer', 'layer', 'top', 'bottom'].includes(b.slot);
    if (w > .05) {
      if (bigPair && dh >= 15 && dh < 32 && dl < 25 && a.wc > .5 && b.wc > .5) { hScore -= 3 * w; add('tone-flat', `${nmW(a)} ${nmN(b)} 색도 밝기도 비슷해서 심심해요. 둘 중 하나를 확 밝히거나 어둡게 하면 살아나요`, -1, [a.slot, b.slot]); }
      if (bigPair && dh < 15 && dl < 18 && Math.abs(a.c.C - b.c.C) < 22) { hScore -= 5 * w; if (w > .4) add('dup', `${nmW(a)} ${nmG(b)} 거의 같은 색이라 구분이 안 돼요. 하나를 더 밝게 해 보세요`, -1, [a.slot, b.slot]); }
      const vv = Math.min(a.vv, b.vv);
      if (nextTo(a, b) && vv > .2) { hScore -= 7 * vv; if (vv > .5) add('clash', `${nmW(a)} ${nmG(b)} 둘 다 쨍해서 붙여 놓으면 눈이 아파요`, -1, [a.slot, b.slot]); }
      if (nextTo(a, b) && dh > 150 && vv > .3) { hScore -= 4 * vv; add('comp', `${nmW(a)} ${nmN(b)} 정반대 색이라 서로 부딪혀요`, -1, [a.slot, b.slot]); }
      if (nextTo(a, b) && dh >= 18 && dh <= 75 && vv > .35 && Math.abs(a.c.C - b.c.C) < 30) { hScore -= 8 * vv; add('analog-vivid', `${nmW(a)} ${nmN(b)} 비슷한 색인데 둘 다 쨍해요. 하나는 좀 연한 색으로 바꿔 보세요`, -1, [a.slot, b.slot]); }
    }
    /* 실무 규칙 — 톤 일치와 온도. 붙어 있는지·넓은지가 아니라 "입은 색"(면적 3% 이상) 전부가 대상이다.
       옛 temp 규칙은 R2 가 대신한다(채도 조건 없이, 무채가 아닌 두 색이면 걸린다) */
    if (a.wc > .05 && b.wc > .05 && a.area >= .03 && b.area >= .03) {
      const cw = a.wc * b.wc, far = ramp(dh, 30, 50);
      const vivMis = Math.max(a.viv * (1 - b.viv), b.viv * (1 - a.viv));
      /* C. 둘 다 뮤트거나 둘 다 파스텔이면 톤인톤이다 — 톤·온도 규칙을 걸지 않는다 */
      const muted = p => p.c.C <= 32 && p.c.L >= 35 && p.c.L <= 78;   // C'. viv 가 아니라 계산 채도 — 코랄(47)·카라멜(45)은 뮤트가 아니다
      const tonal = (FIX.C && ((muted(a) && muted(b)) || (a.c.L >= 78 && b.c.L >= 78))) ? 0 : 1;
      rule('tone-mismatch', `${nmW(a)} ${nmN(b)} 하나는 쨍하고 하나는 가라앉은 색이라 톤이 안 맞아요`, 15 * cw * far * vivMis * tonal, [a.slot, b.slot]);
      rule('tone-soft', `${nmW(a)} ${nmN(b)} 연한 톤과 깊은 톤이라 서로 어긋나요`, 6 * cw * far * (1 - vivMis) * (a.pas * b.deep + b.pas * a.deep) * tonal, [a.slot, b.slot]);
      rule('tone-same-fam', `${nmW(a)} ${nmN(b)} 같은 계열인데 하나만 쨍해서 어긋나요`, 8 * cw * (1 - far) * (a.viv * b.pas + b.viv * a.pas), [a.slot, b.slot]);
      if (warmHue(a.c.h) !== warmHue(b.c.h)) rule('temp', `${nmW(a)} ${nmN(b)} 따뜻한 색과 차가운 색이라 어긋나요. 하나를 무채색으로 바꿔 보세요`, 10 * cw * ramp(dh, 60, 90) * tonal, [a.slot, b.slot]);
    }
    /* 브라운 × 그레이: 온도가 반대라 서로를 탁하게 한다. 밝기까지 비슷하면 더 나쁘다 */
    if (bigPair) {
      const gb = (g, r) => (g.c.C < 10 && g.c.L >= 35 && g.c.L <= 75)
        ? earthW(r.c.h, r.c.L) * ramp(r.c.C, 12, 20) * (1 - ramp(r.c.C, 40, 48)) * ramp(r.c.L, 26, 34) * (1 - ramp(r.c.L, 58, 66)) * (1 - ramp(Math.abs(g.c.L - r.c.L), 14, 24))
        : 0;
      const ab = gb(a, b), ba = gb(b, a); const [g, r] = ab >= ba ? [a, b] : [b, a];
      rule('gray-brown', `${nmW(g)} ${nmN(r)} 온도가 달라 서로 탁하게 해요. 그레이 대신 네이비나 블랙이 나아요`, (FIX.F ? (brightSomewhere ? 0 : 6) : 12) * Math.max(ab, ba), [g.slot, r.slot]);
    }
    /* 블랙 × 네이비: 둘 다 어두운데 구분이 안 된다 */
    const isBlack = p => p.c.C <= NEUTRAL_C && p.c.L < 18, isNavy = p => p.c.h >= 250 && p.c.h <= 310 && p.c.L < 30 && p.c.C > 15 && !(FIX.B && denimW(p.c) >= .5);
    if (bigPair && nextTo(a, b) && ((isBlack(a) && isNavy(b)) || (isBlack(b) && isNavy(a)))) { hScore -= 8; add('black-navy', `${nmW(a)} ${nmG(b)} 붙어 있으면 검정인지 남색인지 헷갈려요`, -1, [a.slot, b.slot]); }
  }
  /* B. 옷 자리만 세고(모자·신발·목도리 제외), 데님은 빼고, 브라운·올리브는 한 가족으로 */
  const darkBig = P.filter(p => p.c.L < 42 && p.area >= .05
    && (!FIX.B || (['outer', 'layer', 'top', 'bottom'].includes(p.slot) && denimW(p.c) < .5)));
  const darkFams = []; darkBig.forEach(p => { const key = p.c.C <= NEUTRAL_C ? 'k' : (FIX.B && p.c.h >= 20 && p.c.h <= 125) ? 'e' : String(Math.round(p.c.h / 40)); if (!darkFams.includes(key)) darkFams.push(key); });
  if (darkFams.length >= 3) { hScore -= 12; add('dark-mix', '어두운 색이 세 가지나 섞여서 칙칙해 보여요. 하나는 밝은 색으로 바꿔 보세요', -1, darkBig.map(p => p.slot)); }
  let blackBrown = false;
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const a = P[i], b = P[j]; const bp = ['outer', 'layer', 'top', 'bottom'].includes(a.slot) && ['outer', 'layer', 'top', 'bottom'].includes(b.slot); const blk = p => p.c.C <= NEUTRAL_C && p.c.L < 18, brn = p => earthHue(p.c.h) && p.c.C > 18 && p.c.L < 45; if (bp && nextTo(a, b) && ((blk(a) && brn(b)) || (blk(b) && brn(a)))) { blackBrown = true; hScore -= 3; add('black-brown', `${nmW(a)} ${nmN(b)} 같이 입으면 서로 칙칙해 보여요`, -1, [a.slot, b.slot]); } }
  /* 어스 톤 바탕에 형광에 가까운 색 하나 — 무채 바탕이면 포인트지만 어스 바탕에서는 겉돈다 */
  const big = p => ['outer', 'layer', 'top', 'bottom'].includes(p.slot);
  /* D. 어스-네온은 정말 밝고 쨍한 색만 — L 65 이상 · C 50 이상 */
  const neonP = P.filter(p => p.area >= .03 && (!FIX.D || (p.c.L >= 65 && p.c.C >= 50))).reduce((m, p) => (!m || p.viv * ramp(p.c.L, 50, 60) * p.wc > m.viv * ramp(m.c.L, 50, 60) * m.wc) ? p : m, null);
  if (neonP) {
    const neon = neonP.viv * ramp(neonP.c.L, 50, 60) * neonP.wc;
    const earthBase = P.filter(big).reduce((s, p) => s + p.area * p.fn * earthW(p.c.h, p.c.L) * ramp(p.c.C, 10, 16), 0);
    const achro = P.filter(big).reduce((s, p) => s + p.area * (1 - ramp(p.c.C, 8, 14)), 0);
    rule('earth-neon', `어스 톤 바탕에 ${nmN(neonP)} 너무 밝아서 겉돌아요`, 8 * neon * ramp(earthBase, .3, .6) * (1 - ramp(achro, .2, .4)), [neonP.slot]);
  }
  /* 블랙 × 브라운은 밝은 제3색이 사이에 있어야 정의가 선다 */
  if (blackBrown) { const lightP = P.filter(p => p.area >= .035).reduce((m, p) => Math.max(m, ramp(p.c.L, 60, 75)), 0); rule('black-brown-flat', '블랙과 브라운 사이에 밝은 색이 없어 서로 뭉개져요. 밝은 이너나 셔츠를 넣어 보세요', 8 * (1 - lightP), ['inner', 'top']); }
  parts['조화'] = [Math.round(clamp(hScore, 0, 25)), 25];

  /* 4. 시선 정리 10 */
  let eScore = 0;
  const shoe = by('shoes');
  if (shoe) {
    const anc = by('bottom') || by('outer'), tp = by('top');
    const tiedTo = x => x && dH(shoe.c.h, x.c.h) < 30 && Math.abs(shoe.c.L - x.c.L) < 30;
    const tied = Math.max(1 - shoe.wc, tiedTo(anc) ? 1 : 0, tiedTo(tp) ? .8 : 0);
    eScore += 5 * tied;
    if (tied < .4) add('shoe', `${nmG(shoe)} 혼자 따로 놀아요. 하의랑 같은 색이거나 검정·흰색이면 무난해요`, -1, ['shoes']);
    else if (shoe.wc > .5 && tiedTo(anc)) add('shoe-tie', '신발을 하의랑 같은 색으로 맞춰서 다리가 길어 보여요', 1, ['shoes']);
    const darkBottomBrownShoe = anc && anc.c.C <= NEUTRAL_C && anc.c.L < 18 && earthHue(shoe.c.h) && shoe.c.C > 20 && shoe.c.L < 50;
    if (darkBottomBrownShoe) { eScore -= 2; add('black-brown', '검정 하의에 갈색 신발은 잘 안 어울려요. 검정이나 흰색 신발이 나아요', -1, ['shoes']); }
  } else eScore += 5;
  const points = P.filter(p => p.vv > .5 && p.area <= .12);
  eScore += points.length <= 1 ? 5 : points.length === 2 ? 2 : 0;
  if (points.length >= 2) add('points', `눈에 띄는 색이 ${points.length}군데나 있어요. 한 군데만 있어도 충분해요`, -1, points.map(p => p.slot));
  else if (points.length === 1 && n <= 2.2) {
    /* 포인트는 바탕이 무채일 때만 포인트다. 코트가 가라앉은 색인데 안쪽만 쨍하면 포인트가 아니라 따로 노는 것 */
    const pt = points[0], base = P.filter(p => p !== pt && p.area >= .03);
    const baseArea = base.reduce((s, p) => s + p.area, 0);
    const baseFn = baseArea ? base.reduce((s, p) => s + p.area * p.fn, 0) / baseArea : 1;
    if (baseArea < .6 || baseFn >= .5) add('point-one', `${nmG(pt)} 포인트로 딱 살았어요`, 1, [pt.slot]);
    else { eScore -= 8; add('point-buried', `나머지가 다 가라앉은 색이라 ${nmN(pt)} 포인트라기보다 혼자 튀어 보여요`, -1, [pt.slot]); }
  }
  points.forEach(pt => { const others = P.filter(p => p !== pt && p.wc > .2); if (others.length && !others.some(o => dH(o.c.h, pt.c.h) < 40 || warmHue(o.c.h) === warmHue(pt.c.h))) { eScore -= 2; add('point-odd', `${nmN(pt)} 다른 색들이랑 결이 달라서 겉돌아요`, -1, [pt.slot]); } });
  parts['시선 정리'] = [Math.round(clamp(eScore, 0, 10)), 10];

  /* 5. 상황·계절 5 — 안은 10점 눈금 그대로 두고 마지막에 반으로 접는다 (조화 20 → 25 와 맞바꿔 합 100 유지) */
  let sScore = 6;
  P.filter(p => p.area >= .2).forEach(p => { const over = ramp(p.c.C - situ.bigC, 0, 30) * ramp(p.c.L, 26, 44); if (over > .1) { sScore -= 4 * over * situ.strict; if (over > .4) add('situ-big', `${nmN(p)} 이런 자리에 입기엔 조금 쨍해요`, -1, [p.slot]); } });
  const avgL = P.reduce((s, p) => s + p.c.L * p.area, 0);
  if (season === 'summer') { const pen = 3 * ramp(38 - avgL, 0, 12); sScore -= pen; if (pen > 1.5) add('season-heavy', '여름인데 전체적으로 어두워요. 하나만 밝은 색으로 바꿔도 훨씬 시원해 보여요', -1, ['top']); }
  if (season === 'winter' && avgL > 80 && n < .3) { sScore -= 2; add('season-light', '겨울인데 전체적으로 너무 하얘요. 하나는 진한 색으로 바꿔 보세요', 0, ['outer', 'bottom']); }
  if (season === 'autumn' && P.some(p => p.area >= .1 && p.wc > .2 && earthHue(p.c.h) && p.c.L < 72)) { sScore += 2; add('season-earth', '가을에 어울리는 차분한 흙빛이에요', 1, []); }
  if (season === 'spring' && P.some(p => p.area >= .1 && p.c.L > 76 && p.wc > .2)) { sScore += 2; add('season-fresh', '봄에 어울리게 밝고 맑아요', 1, []); }
  if (season === 'summer' && avgL > 62) { sScore += 2; add('season-cool', '여름에 어울리게 가벼워 보여요', 1, []); }
  if (season === 'winter' && P.some(p => p.c.L < 30 && p.area > .3)) { sScore += 2; add('season-deep', '겨울에 어울리게 묵직하고 깊어요', 1, []); }
  parts['상황·계절'] = [Math.round(clamp(sScore, 0, 10) * .5), 5];

  /* 6. 나에게 15 */
  const hasPC = !!pc; let fScore = 15;
  /* 12타입표(ctx.pcAvoid/pcFace)가 있으면 그걸로, 없으면 옛 toneFail 문턱으로 — J. 12타입 색 연동 */
  const has12 = hasPC && !!(ctx.pcAvoid && ctx.pcAvoid.size);
  let faceAvoidHit = false;
  if (hasPC) {
    P.filter(p => ['outer', 'layer', 'top', 'scarf', 'tie', 'hat'].includes(p.slot) && p.area >= .03).forEach(p => {
      if (has12) {
        if (ctx.pcAvoid.has(p.hex)) { fScore -= 8; faceAvoidHit = true; add('tone', `${nmN(p)} ${ctx.pcName} 톤에는 잘 안 받아요. 하의나 신발처럼 얼굴에서 먼 곳에 쓰면 괜찮아요`, -2, [p.slot]); }
        else if (ctx.pcFace.has(p.hex)) { fScore += 4; add('tone-face', `${nmN(p)} 얼굴 옆에 두면 안색이 좋아 보이는 색이에요`, 1, [p.slot]); }
      } else {
        const bad = toneFail(p.c, pc); if (bad) { fScore -= 6; add('tone', `${nmN(p)} ${bad} 색이라 얼굴이 칙칙해 보여요. 아래쪽에 쓰면 괜찮아요`, -2, [p.slot]); }
      }
    });
    if (ctx.body) {
      const t = by('top') || by('outer');
      if (t && ctx.body.top === 'light' && t.c.L < 55) { fScore -= 3; add('body-top', '체형상 상의를 밝게 입으면 균형이 더 잘 맞아요', -1, ['top']); }
      if (t && ctx.body.top === 'dark' && t.c.L > 55) { fScore -= 3; add('body-top', '체형상 상의를 어둡게 입으면 균형이 더 잘 맞아요', -1, ['top']); }
    }
    parts['나에게'] = [Math.round(clamp(fScore, 0, 15)), 15];
  }
  const others = Object.entries(parts).filter(([k]) => k !== '명도 구조').reduce((s, [, [v]]) => s + v, 0);
  const maxOthers = hasPC ? 70 : 55;
  const raw = parts['명도 구조'][0] + others * (0.7 + 0.3 * fitL);
  let total = Math.round(clamp(raw * (100 / (30 + maxOthers)), 0, 100));
  /* 얼굴 근처에 12타입 회피색이 있으면 등급이 실제로 떨어지게 총점을 한 번 더 누른다 */
  if (faceAvoidHit) total = Math.min(total, 84);
  reasons.sort((a, b) => a.w - b.w);
  return { total, parts, reasons, vis, fitL, contrast, season, n: +n.toFixed(2), P: P.map(p => ({ slot: p.slot, id: p.id, hex: p.hex, kind: p.kind, wc: +p.wc.toFixed(2), vv: +p.vv.toFixed(2), area: +p.area.toFixed(3), L: +p.c.L.toFixed(1), C: +p.c.C.toFixed(1), h: +p.c.h.toFixed(0) })) };
}

function delta(items, ctx, slot, hex, name) {
  const base = evaluate(items, ctx);
  if (!items.some(i => i.slot === slot)) return null;
  const r = evaluate(items.map(i => i.slot === slot ? { ...i, hex, color: name || i.color } : i), ctx);
  return { d: r.total - base.total, total: r.total, warn: r.reasons.filter(x => x.w < 0 && x.slots.includes(slot)), reasons: r.reasons };
}
const SMALL_SLOTS = ['shoes', 'scarf', 'hat', 'inner', 'tie', 'socks'];
/* 구역 판정 규칙 — guide() 의 세 묶음(safe/match/point)과 zonesOf() 가 같은 것을 쓴다. 채점 수치는 여기 없다 */
const zoneRules = (slot, opts) => ({
  fn: x => fashionNeutral(lch(x.hex), (opts && opts.idFor) || slot),   /* 패션 무채 — 네이비·카멜도 바탕으로 센다 */
  hardWarn: x => x.warn.some(w => w.w <= -1),
  small: SMALL_SLOTS.includes(slot),
});
/**
 * 팔레트 전부를 네 구역으로. guide() 의 pred·tol 을 그대로 쓰되 상위 N·계열 겹침 제한만 뺀다.
 * 우선순위: marks 의 warn → avoid, 그 다음 point > match > safe(나머지 전부).
 * point 를 match 앞에 두는 이유: guide() 의 두 묶음은 배타가 아니라, 작은 자리의 쨍한 색은
 * 양쪽에 다 든다. 구역은 하나만 줄 수 있고 쨍한 게 그 색의 성질이니 "고수의 영역"으로 보낸다.
 * (match 를 앞에 두면 고수 구역이 사실상 비어 버린다 — guide-check: 423건 vs 64건)
 */
function zonesOf(list, top, slot, opts) {
  const R = zoneRules(slot, opts), out = {};
  for (const x of list) {
    out[x.key] = (x.warn.length && x.d <= -4) ? 'avoid'            /* marks 의 warn 과 같은 식 */
      : R.hardWarn(x) ? 'safe'                                     /* 감점 규칙에 걸리면 세 묶음 어디에도 안 들어간다 */
      : (R.small && x.vv >= .4) ? 'point'                          /* guide 의 point 묶음 조건 */
      : (R.fn(x) < .5 && x.total >= top - 8) ? 'match'             /* guide 의 match 묶음 조건 */
      : 'safe';
  }
  return out;
}
function guide(items, ctx, slot, palette, opts) {
  opts = opts || {};
  const base = evaluate(items, ctx);
  const has = items.some(i => i.slot === slot);
  const list = [];
  for (const key in palette) {
    const hex = palette[key].hex;
    const next = has ? items.map(i => i.slot === slot ? { ...i, hex, color: palette[key].name } : i) : items.concat([{ slot, id: opts.idFor || slot, hex, color: palette[key].name }]);
    const r = evaluate(next, ctx);
    const warn = r.reasons.filter(x => x.w < 0 && x.slots.includes(slot));
    list.push({ key, hex, total: r.total, d: r.total - base.total, warn, why: (r.reasons.find(x => x.w > 0 && x.slots.includes(slot)) || r.reasons.find(x => x.w > 0) || {}).txt || '' });
  }
  list.forEach(x => { x.vv = vivid({ c: lch(x.hex), id: '' }); });
  const pcFace = ctx.pcFace;
  /* J3. 내 퍼스널컬러 핵심색은 점수는 그대로 두고 정렬만 앞으로 */
  list.forEach(x => { const c = lch(x.hex); x.adj = x.total - 2 * x.vv - 1.5 * ramp(c.C, NEUTRAL_C, SOFT_C) + (pcFace && pcFace.has(x.hex) ? 3 : 0); });   /* 동점이면 차분한 색 먼저 */
  list.sort((a, b) => b.total - a.total || a.vv - b.vv || a.key.localeCompare(b.key));
  const top = list[0] ? list[0].total : 0;
  /* 추천 세 묶음: 무난(무채·연유채) 최대 4 + 어울려요(유채 상위) 최대 5 + 포인트(작은 자리에서만 쨍한 색) 최대 3. 감점 규칙 없는 것만, 계열 겹침 3개까지 */
  const byAdj = [...list].sort((a, b) => b.adj - a.adj || a.key.localeCompare(b.key));
  const famOf = hex => { const c = lch(hex); return c.C <= NEUTRAL_C ? 'n' + (c.L > 60 ? 'L' : 'D') : 'h' + Math.round(c.h / 30); };
  const R = zoneRules(slot, opts);
  const pickN = (pred, nMax, tol) => { const out = [], hues = []; for (const x of byAdj) { if (out.length >= nMax) break; if (!pred(x) || R.hardWarn(x) || x.total < top - tol) continue; const fam = famOf(x.hex); if (hues.filter(h => h === fam).length >= 3) continue; hues.push(fam); out.push(x); } return out; };
  /* 무난 묶음은 계산 채도가 아니라 패션 무채(네이비·카멜·브라운도 바탕으로 센다) 기준으로 가른다 */
  const fnOf = R.fn;
  const safe = pickN(x => fnOf(x) >= .5, 4, 10), match = pickN(x => fnOf(x) < .5, 5, 8);
  const point = R.small
    ? list.filter(x => x.vv >= .4 && !R.hardWarn(x)).sort((a, b) => b.total - a.total || a.key.localeCompare(b.key)).slice(0, 3)
    : [];
  /* 내 퍼스널컬러 핵심색 중 다른 감점 규칙에 안 걸린 것 최대 4 */
  const mine = pcFace && pcFace.size
    ? list.filter(x => pcFace.has(x.hex) && !x.warn.length).sort((a, b) => b.total - a.total || a.key.localeCompare(b.key)).slice(0, 4)
    : [];
  const groups = { safe: safe.map(x => x.key), match: match.map(x => x.key), point: point.map(x => x.key), mine: mine.map(x => x.key) };
  const seen = new Set(); const rec = [];
  for (const x of [...mine, ...safe, ...match, ...point]) if (!seen.has(x.key)) { seen.add(x.key); rec.push(x); }
  const marks = {}; list.forEach(x => { marks[x.key] = seen.has(x.key) ? 'rec' : (x.warn.length && x.d <= -4) ? 'warn' : ''; });
  return { base, list, rec, groups, marks, zones: zonesOf(list, top, slot, opts) };
}
function bestMoves(items, ctx, palette, k) {
  const base = evaluate(items, ctx); const out = [];
  for (const it of items) {
    let best = null;
    for (const key in palette) { const hex = palette[key].hex; if (hex === it.hex) continue; const r = evaluate(items.map(i => i === it ? { ...i, hex, color: palette[key].name } : i), ctx); const adjR = r.total - 6 * vivid({ c: lch(hex), id: '' }) - 3 * ramp(lch(hex).C, NEUTRAL_C, SOFT_C); if (!best || adjR > best.adjR) best = { adjR, slot: it.slot, from: it.hex, to: hex, key, name: palette[key].name, total: r.total, d: r.total - base.total, why: (r.reasons.find(x => x.w > 0 && x.slots.includes(it.slot)) || r.reasons.find(x => x.w > 0) || {}).txt || '' }; }
    if (best && best.d > 0) out.push(best);
  }
  out.forEach(m => { const c = lch(m.to); m.adj = m.d - 6 * vivid({ c, id: '' }) - 3 * ramp(c.C, NEUTRAL_C, SOFT_C); });
  out.sort((a, b) => b.adj - a.adj);
  return { base, moves: out.slice(0, k || 3) };
}
export { lch, evaluate, delta, guide, zonesOf, bestMoves, visibleAreas, toneFail, chromaWeight, fashionNeutral, vivid, NEUTRAL_C, SOFT_C, AREA };
