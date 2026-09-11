// @ts-nocheck
// 원본: 바루픽 설계 스크래치 charlab/v7.js (2026-09-08). 검증: refset 50벌 · sim7.mjs. 고칠 때는 원본과 함께.
/* 바루픽 컬러 점수 엔진 v7.1 — 시제품 (2차: 모든 판정을 연속 가중치로)
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
    if (earthHue(c.h) && c.C > NEUTRAL_C && c.C < 65) return '웜 어스';
    if (c.h >= 15 && c.h <= 50 && c.C >= 30 && c.C <= 68 && c.L > 50) return '웜 소프트';
  }
  if (pc === 'summer') {
    if (c.C >= 55 && warmHue(c.h)) return '쨍한 웜';
    if (c.L < 22 && c.C < 20) return '너무 어두운';
    if (earthHue(c.h) && c.C >= 25 && c.L < 60) return '웜 어스';
  }
  if (pc === 'autumn') {
    if (c.C <= NEUTRAL_C && c.L < 20) return '새까만';
    if (c.L > 85 && c.C > NEUTRAL_C && !warmHue(c.h)) return '차가운 파스텔';
    if (c.C >= 50 && !warmHue(c.h)) return '쨍한 쿨';
  }
  if (pc === 'spring') {
    if (c.L < 25 && c.C < 30) return '너무 어두운';
    if (c.C > NEUTRAL_C && c.C < 30 && c.L > 35 && c.L < 70) return '탁한';
    if (c.C >= 45 && !warmHue(c.h) && c.L < 45) return '깊은 쿨';
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
const toneVivid = c => ramp(c.C, 40, 50) * ramp(c.L, 30, 40);
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
  P.forEach(p => { p.fn = fashionNeutral(p.c, p.id); p.wc = 1 - p.fn; p.vv = vivid(p); p.viv = toneVivid(p.c); p.pas = tonePastel(p.c); p.deep = toneDeep(p.c); p.kind = p.wc < .15 ? 'neutral' : p.wc < .75 ? 'soft' : 'chroma'; });
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
    const recover = (f, w, k) => f + (1 - f) * w * clamp(k, 0, 1);
    const breakers = P.filter(p => p !== upperMain && p.area >= .035 && ['top', 'layer', 'inner', 'shoes', 'scarf', 'tie', 'socks'].includes(p.slot));
    const brkOf = p => ramp(Math.abs(p.c.L - upperMain.c.L), 18, 32) * ramp(Math.abs(p.c.L - bot.c.L), 12, 24);
    const brkP = breakers.reduce((m, p) => (!m || brkOf(p) > brkOf(m)) ? p : m, null);
    const brk = brkP ? brkOf(brkP) : 0;
    if (oneTone) fit = Math.max(fit, .45 + .55 * ramp(breakers.reduce((m, p) => Math.max(m, Math.abs(p.c.L - upperMain.c.L)), 0), 18, 45));
    const hueCarry = ramp(Math.max(upperMain.c.C, bot.c.C), 30, 45) * ramp(dH(upperMain.c.h, bot.c.h), 40, 70) * (1 - brk);
    const lightTonal = ramp(Math.min(upperMain.c.L, bot.c.L), 66, 74) * Math.max(ramp(Math.max(upperMain.c.C, bot.c.C), 10, 16), ramp(Math.min(upperMain.c.L, bot.c.L), 78, 84)) * (1 - brk);
    const bw = upperMain.c.C <= NEUTRAL_C && bot.c.C <= NEUTRAL_C && Math.abs(upperMain.c.L - bot.c.L) > 80 ? 1 : 0;
    fit = recover(fit, .9, brk); fit = recover(fit, .8, hueCarry); fit = recover(fit, .9, lightTonal); fit = recover(fit, .8, bw);
    if (brk > .35) add('tonal-breaker', `위아래는 비슷해도 ${nmG(brkP)} 밝기를 갈라 줘요`, 1, [brkP.slot, 'top', 'bottom']);
    else if (oneTone) add('onetone-flat', '위아래가 한 색인데 나눠 줄 밝은 곳이 없어요. 이너나 신발로 대비를 줘 보세요', -1, ['top', 'shoes', 'inner']);
    else if (dL < TARGET[1] * .6) {
      if (hueCarry > .35) add('hue-carries', `${nmW(upperMain)} ${nmN(bot)} 밝기는 비슷해도 색 계열이 달라 구분돼요`, 1, ['top', 'bottom']);
      else if (lightTonal > .35) add('light-tonal', '밝은 색끼리 톤을 맞춘 룩이에요', 1, ['top', 'bottom']);
      else add('dL-low', '위아래 밝기가 비슷해서 뭉개져 보여요', -2, ['top', 'bottom', 'outer']);
    }
    else if (dL > TARGET[3]) { if (bw) add('bw-contrast', `${nm(upperMain)}와 ${nm(bot)}의 흑백 대비는 정석이에요`, 1, ['top', 'bottom']); else add('dL-high', '위아래 밝기 차이가 너무 커서 끊겨 보여요. 중간 밝기 옷을 하나 넣어 보세요', -1, ['top', 'bottom']); }
    else if (fit > .8) add('dL-ok', '위아래 밝기가 또렷하게 나뉘어요', 1, ['top', 'bottom']);
    mScore += 22 * fit;
    const o = by('outer'), t = by('top') || by('layer');
    if (o && t) { const d2 = Math.abs(o.c.L - t.c.L); mScore += 5 * ramp(d2, 6, 22); if (d2 < 8) add('outer-inner', `${nm(o)}와 ${nm(t)} 밝기가 비슷해서 겹쳐 입은 게 안 보여요`, -1, ['outer', 'top']); }
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
  if (n >= 2.6) add('too-many', `색이 ${Math.round(n)}가지라 많아요. 하나는 무채색으로 바꿔 보세요`, -2, P.filter(p => p.wc >= .5).map(p => p.slot));
  if (n < .3) add('all-neutral', '전부 무채색이라 안전하지만 심심해요. 작은 포인트 색을 하나 더해 보세요', 0, ['scarf', 'shoes', 'top']);
  const strongArea = P.reduce((s, p) => s + p.area * p.vv, 0);
  if (strongArea > situ.accentMax) { const pen = Math.min(16, (strongArea - situ.accentMax) * 45 * situ.strict); cScore -= pen; add('accent-big', `강한 색이 전체의 ${Math.round(strongArea * 100)}%나 돼요. 포인트는 작을수록 살아요`, -2, P.filter(p => p.vv > .4).map(p => p.slot)); }
  const anchor = P.reduce((a, b) => (a.area >= b.area ? a : b), P[0]);
  if (anchor && anchor.vv > .25) { cScore -= 8 * anchor.vv; add('anchor', `제일 넓은 ${nm(anchor)}가 너무 쨍해요. 넓은 자리는 차분한 색이 편해요`, -2, [anchor.slot]); }
  const chromItems = P.filter(p => p.wc > .5 && p.area >= .05);
  if (chromItems.length >= 3 && !P.some(p => p.wc < .3 && p.area >= .05)) { const vAvg = chromItems.reduce((s, p) => s + p.vv, 0) / chromItems.length; const pen = 6 + 6 * vAvg; cScore -= pen; add('no-neutral', '무채색이 한 벌도 없어요. 눈이 쉬어 갈 색이 하나는 필요해요', -1, chromItems.map(p => p.slot)); }
  parts['색 수·면적'] = [Math.round(clamp(cScore, 0, 20)), 20];

  /* 3. 조화 25 — 실무 규칙 층이 들어오면서 20 → 25 (상황·계절 10 → 5 로 상쇄, 합 100 유지) */
  let hScore = 25;
  /* 점수는 연속으로 깎고, 문구는 눈에 띌 만큼(1.5점) 깎였을 때만 남긴다 */
  const rule = (id, txt, d, slots) => { if (!(d > 0)) return; hScore -= d; if (d >= 1.5) add(id, txt, -1, slots || []); };
  const ADJ = [['outer', 'top'], ['outer', 'layer'], ['layer', 'top'], ['top', 'bottom'], ['layer', 'bottom'], ['outer', 'bottom'], ['bottom', 'shoes'], ['top', 'scarf'], ['outer', 'scarf'], ['top', 'tie']];
  const nextTo = (a, b) => ADJ.some(([x, y]) => (a.slot === x && b.slot === y) || (a.slot === y && b.slot === x));
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i], b = P[j]; const w = Math.min(a.wc, b.wc); const dh = dH(a.c.h, b.c.h), dl = Math.abs(a.c.L - b.c.L);
    const bigPair = ['outer', 'layer', 'top', 'bottom'].includes(a.slot) && ['outer', 'layer', 'top', 'bottom'].includes(b.slot);
    if (w > .05) {
      if (bigPair && dh >= 15 && dh < 32 && dl < 25 && a.wc > .5 && b.wc > .5) { hScore -= 3 * w; add('tone-flat', `${nm(a)}와 ${nm(b)}는 같은 계열인데 밝기까지 비슷해요. 하나를 훨씬 밝거나 어둡게 해 보세요`, -1, [a.slot, b.slot]); }
      if (bigPair && dh < 15 && dl < 18 && Math.abs(a.c.C - b.c.C) < 22) { hScore -= 5 * w; if (w > .4) add('dup', `${nm(a)}와 ${nm(b)}가 거의 같은 색이라 흐릿해요. 밝기 차이를 줘 보세요`, -1, [a.slot, b.slot]); }
      const vv = Math.min(a.vv, b.vv);
      if (nextTo(a, b) && vv > .2) { hScore -= 7 * vv; if (vv > .5) add('clash', `${nm(a)}와 ${nm(b)}가 둘 다 쨍해서 붙으면 튀어요`, -1, [a.slot, b.slot]); }
      if (nextTo(a, b) && dh > 150 && vv > .3) { hScore -= 4 * vv; add('comp', `${nm(a)}와 ${nm(b)}는 보색이라 서로를 밀어내요`, -1, [a.slot, b.slot]); }
      if (nextTo(a, b) && dh >= 18 && dh <= 75 && vv > .35 && Math.abs(a.c.C - b.c.C) < 30) { hScore -= 8 * vv; add('analog-vivid', `${nm(a)}와 ${nm(b)}는 비슷한 계열인데 둘 다 쨍해서 서로 부딪혀요. 하나는 톤을 낮춰 보세요`, -1, [a.slot, b.slot]); }
    }
    /* 실무 규칙 — 톤 일치와 온도. 붙어 있는지·넓은지가 아니라 "입은 색"(면적 3% 이상) 전부가 대상이다.
       옛 temp 규칙은 R2 가 대신한다(채도 조건 없이, 무채가 아닌 두 색이면 걸린다) */
    if (a.wc > .05 && b.wc > .05 && a.area >= .03 && b.area >= .03) {
      const cw = a.wc * b.wc, far = ramp(dh, 30, 50);
      const vivMis = Math.max(a.viv * (1 - b.viv), b.viv * (1 - a.viv));
      rule('tone-mismatch', `${nmW(a)} ${nmN(b)} 하나는 쨍하고 하나는 가라앉은 색이라 톤이 안 맞아요`, 15 * cw * far * vivMis, [a.slot, b.slot]);
      rule('tone-soft', `${nmW(a)} ${nmN(b)} 연한 톤과 깊은 톤이라 서로 어긋나요`, 6 * cw * far * (1 - vivMis) * (a.pas * b.deep + b.pas * a.deep), [a.slot, b.slot]);
      rule('tone-same-fam', `${nmW(a)} ${nmN(b)} 같은 계열인데 하나만 쨍해서 어긋나요`, 8 * cw * (1 - far) * (a.viv * b.pas + b.viv * a.pas), [a.slot, b.slot]);
      if (warmHue(a.c.h) !== warmHue(b.c.h)) rule('temp', `${nmW(a)} ${nmN(b)} 따뜻한 색과 차가운 색이라 어긋나요. 하나를 무채색으로 바꿔 보세요`, 10 * cw * ramp(dh, 60, 90), [a.slot, b.slot]);
    }
    /* 브라운 × 그레이: 온도가 반대라 서로를 탁하게 한다. 밝기까지 비슷하면 더 나쁘다 */
    if (bigPair) {
      const gb = (g, r) => (g.c.C < 10 && g.c.L >= 35 && g.c.L <= 75)
        ? earthW(r.c.h, r.c.L) * ramp(r.c.C, 12, 20) * (1 - ramp(r.c.C, 40, 48)) * ramp(r.c.L, 26, 34) * (1 - ramp(r.c.L, 58, 66)) * (1 - ramp(Math.abs(g.c.L - r.c.L), 14, 24))
        : 0;
      const ab = gb(a, b), ba = gb(b, a); const [g, r] = ab >= ba ? [a, b] : [b, a];
      rule('gray-brown', `${nmW(g)} ${nmN(r)} 온도가 달라 서로 탁하게 해요. 그레이 대신 네이비나 블랙이 나아요`, 12 * Math.max(ab, ba), [g.slot, r.slot]);
    }
    /* 블랙 × 네이비: 둘 다 어두운데 구분이 안 된다 */
    const isBlack = p => p.c.C <= NEUTRAL_C && p.c.L < 18, isNavy = p => p.c.h >= 250 && p.c.h <= 310 && p.c.L < 30 && p.c.C > 15;
    if (bigPair && nextTo(a, b) && ((isBlack(a) && isNavy(b)) || (isBlack(b) && isNavy(a)))) { hScore -= 8; add('black-navy', `${nm(a)}와 ${nm(b)}가 붙으면 검정인지 남색인지 구분이 안 돼요`, -1, [a.slot, b.slot]); }
  }
  const darkBig = P.filter(p => p.c.L < 42 && p.area >= .05);
  const darkFams = []; darkBig.forEach(p => { const key = p.c.C <= NEUTRAL_C ? 'k' : String(Math.round(p.c.h / 40)); if (!darkFams.includes(key)) darkFams.push(key); });
  if (darkFams.length >= 3) { hScore -= 12; add('dark-mix', '검정·남색·갈색처럼 어두운 색이 세 가지나 섞여 탁해요. 하나는 밝게 해 보세요', -1, darkBig.map(p => p.slot)); }
  let blackBrown = false;
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const a = P[i], b = P[j]; const bp = ['outer', 'layer', 'top', 'bottom'].includes(a.slot) && ['outer', 'layer', 'top', 'bottom'].includes(b.slot); const blk = p => p.c.C <= NEUTRAL_C && p.c.L < 18, brn = p => earthHue(p.c.h) && p.c.C > 18 && p.c.L < 45; if (bp && nextTo(a, b) && ((blk(a) && brn(b)) || (blk(b) && brn(a)))) { blackBrown = true; hScore -= 3; add('black-brown', `${nm(a)}와 ${nm(b)}는 서로를 탁하게 해요`, -1, [a.slot, b.slot]); } }
  /* 어스 톤 바탕에 형광에 가까운 색 하나 — 무채 바탕이면 포인트지만 어스 바탕에서는 겉돈다 */
  const big = p => ['outer', 'layer', 'top', 'bottom'].includes(p.slot);
  const neonP = P.filter(p => p.area >= .03).reduce((m, p) => (!m || p.viv * ramp(p.c.L, 50, 60) * p.wc > m.viv * ramp(m.c.L, 50, 60) * m.wc) ? p : m, null);
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
    if (tied < .4) add('shoe', `${nm(shoe)} 신발 색이 따로 놀아요. 하의 색이나 무채색으로 맞춰 보세요`, -1, ['shoes']);
    else if (shoe.wc > .5 && tiedTo(anc)) add('shoe-tie', '신발이 하의 색과 이어져 다리가 길어 보여요', 1, ['shoes']);
    const darkBottomBrownShoe = anc && anc.c.C <= NEUTRAL_C && anc.c.L < 18 && earthHue(shoe.c.h) && shoe.c.C > 20 && shoe.c.L < 50;
    if (darkBottomBrownShoe) { eScore -= 2; add('black-brown', '블랙 하의에 브라운 신발은 어색해요. 블랙이나 화이트 신발이 나아요', -1, ['shoes']); }
  } else eScore += 5;
  const points = P.filter(p => p.vv > .5 && p.area <= .12);
  eScore += points.length <= 1 ? 5 : points.length === 2 ? 2 : 0;
  if (points.length >= 2) add('points', `포인트 색이 ${points.length}곳이에요. 한 곳이면 충분해요`, -1, points.map(p => p.slot));
  else if (points.length === 1 && n <= 2.2) {
    /* 포인트는 바탕이 무채일 때만 포인트다. 코트가 가라앉은 색인데 안쪽만 쨍하면 포인트가 아니라 따로 노는 것 */
    const pt = points[0], base = P.filter(p => p !== pt && p.area >= .03);
    const baseArea = base.reduce((s, p) => s + p.area, 0);
    const baseFn = baseArea ? base.reduce((s, p) => s + p.area * p.fn, 0) / baseArea : 1;
    if (baseArea < .6 || baseFn >= .5) add('point-one', `${nm(pt)} 하나가 포인트가 됐어요`, 1, [pt.slot]);
    else { eScore -= 8; add('point-buried', `바탕이 가라앉은 색인데 ${nm(pt)}만 쨍해서 포인트가 아니라 따로 놀아요`, -1, [pt.slot]); }
  }
  points.forEach(pt => { const others = P.filter(p => p !== pt && p.wc > .2); if (others.length && !others.some(o => dH(o.c.h, pt.c.h) < 40 || warmHue(o.c.h) === warmHue(pt.c.h))) { eScore -= 2; add('point-odd', `${nm(pt)} 포인트가 다른 색들과 온도가 달라 겉돌아요`, -1, [pt.slot]); } });
  parts['시선 정리'] = [Math.round(clamp(eScore, 0, 10)), 10];

  /* 5. 상황·계절 5 — 안은 10점 눈금 그대로 두고 마지막에 반으로 접는다 (조화 20 → 25 와 맞바꿔 합 100 유지) */
  let sScore = 6;
  P.filter(p => p.area >= .2).forEach(p => { const over = ramp(p.c.C - situ.bigC, 0, 30) * ramp(p.c.L, 26, 44); if (over > .1) { sScore -= 4 * over * situ.strict; if (over > .4) add('situ-big', `${nm(p)}는 이 자리엔 조금 쨍해요`, -1, [p.slot]); } });
  const avgL = P.reduce((s, p) => s + p.c.L * p.area, 0);
  if (season === 'summer') { const pen = 3 * ramp(38 - avgL, 0, 12); sScore -= pen; if (pen > 1.5) add('season-heavy', '여름치고 전체가 어두워요. 한 벌은 밝게 해 보세요', -1, ['top']); }
  if (season === 'winter' && avgL > 80 && n < .3) { sScore -= 2; add('season-light', '겨울인데 전체가 하얘요. 한 벌은 깊은 색으로 해 보세요', 0, ['outer', 'bottom']); }
  if (season === 'autumn' && P.some(p => p.area >= .1 && p.wc > .2 && earthHue(p.c.h) && p.c.L < 72)) { sScore += 2; add('season-earth', '가을에 맞는 어스 톤이에요', 1, []); }
  if (season === 'spring' && P.some(p => p.area >= .1 && p.c.L > 76 && p.wc > .2)) { sScore += 2; add('season-fresh', '봄에 맞게 밝고 맑아요', 1, []); }
  if (season === 'summer' && avgL > 62) { sScore += 2; add('season-cool', '여름에 맞게 가벼워요', 1, []); }
  if (season === 'winter' && P.some(p => p.c.L < 30 && p.area > .3)) { sScore += 2; add('season-deep', '겨울에 맞게 깊이가 있어요', 1, []); }
  parts['상황·계절'] = [Math.round(clamp(sScore, 0, 10) * .5), 5];

  /* 6. 나에게 15 */
  const hasPC = !!pc; let fScore = 15;
  if (hasPC) {
    P.filter(p => ['outer', 'layer', 'top', 'scarf', 'tie', 'hat'].includes(p.slot) && p.area >= .03).forEach(p => {
      const bad = toneFail(p.c, pc); if (bad) { fScore -= 6; add('tone', `${nm(p)}는 ${bad} 색이라 얼굴이 가라앉아요. 아래쪽에 쓰면 괜찮아요`, -2, [p.slot]); }
    });
    if (ctx.body) {
      const t = by('top') || by('outer');
      if (t && ctx.body.top === 'light' && t.c.L < 55) { fScore -= 3; add('body-top', '체형을 보면 상의는 밝은 쪽이 균형이 맞아요', -1, ['top']); }
      if (t && ctx.body.top === 'dark' && t.c.L > 55) { fScore -= 3; add('body-top', '체형을 보면 상의는 어두운 쪽이 균형이 맞아요', -1, ['top']); }
    }
    parts['나에게'] = [Math.round(clamp(fScore, 0, 15)), 15];
  }
  const others = Object.entries(parts).filter(([k]) => k !== '명도 구조').reduce((s, [, [v]]) => s + v, 0);
  const maxOthers = hasPC ? 70 : 55;
  const raw = parts['명도 구조'][0] + others * (0.7 + 0.3 * fitL);
  const total = Math.round(clamp(raw * (100 / (30 + maxOthers)), 0, 100));
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
  list.forEach(x => { const c = lch(x.hex); x.adj = x.total - 2 * x.vv - 1.5 * ramp(c.C, NEUTRAL_C, SOFT_C); });   /* 동점이면 차분한 색 먼저 */
  list.sort((a, b) => b.total - a.total || a.vv - b.vv || a.key.localeCompare(b.key));
  const top = list[0] ? list[0].total : 0;
  /* 추천 세 묶음: 무난(무채·연유채) 최대 4 + 어울려요(유채 상위) 최대 5 + 포인트(작은 자리에서만 쨍한 색) 최대 3. 감점 규칙 없는 것만, 계열 겹침 3개까지 */
  const byAdj = [...list].sort((a, b) => b.adj - a.adj || a.key.localeCompare(b.key));
  const famOf = hex => { const c = lch(hex); return c.C <= NEUTRAL_C ? 'n' + (c.L > 60 ? 'L' : 'D') : 'h' + Math.round(c.h / 30); };
  const pickN = (pred, nMax, tol) => { const out = [], hues = []; for (const x of byAdj) { if (out.length >= nMax) break; if (!pred(x) || x.warn.some(w => w.w <= -1) || x.total < top - tol) continue; const fam = famOf(x.hex); if (hues.filter(h => h === fam).length >= 3) continue; hues.push(fam); out.push(x); } return out; };
  /* 무난 묶음은 계산 채도가 아니라 패션 무채(네이비·카멜·브라운도 바탕으로 센다) 기준으로 가른다 */
  const fnOf = x => fashionNeutral(lch(x.hex), opts.idFor || slot);
  const safe = pickN(x => fnOf(x) >= .5, 4, 10), match = pickN(x => fnOf(x) < .5, 5, 8);
  const point = SMALL_SLOTS.includes(slot)
    ? list.filter(x => x.vv >= .4 && !x.warn.some(w => w.w <= -1)).sort((a, b) => b.total - a.total || a.key.localeCompare(b.key)).slice(0, 3)
    : [];
  const groups = { safe: safe.map(x => x.key), match: match.map(x => x.key), point: point.map(x => x.key) };
  const seen = new Set(); const rec = [];
  for (const x of [...safe, ...match, ...point]) if (!seen.has(x.key)) { seen.add(x.key); rec.push(x); }
  const marks = {}; list.forEach(x => { marks[x.key] = seen.has(x.key) ? 'rec' : (x.warn.length && x.d <= -4) ? 'warn' : ''; });
  return { base, list, rec, groups, marks };
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
export { lch, evaluate, delta, guide, bestMoves, visibleAreas, toneFail, chromaWeight, fashionNeutral, vivid, NEUTRAL_C, SOFT_C, AREA };
