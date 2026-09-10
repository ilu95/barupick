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
function chromaWeight(p) {            /* 0 무채 … 1 유채. 패션 무채(네이비·다크 브라운·데님)는 낮춘다 */
  let w = ramp(p.c.C, NEUTRAL_C, SOFT_C);
  if (p.c.h >= 250 && p.c.h <= 310 && p.c.L < 32) w *= .35;        // 네이비·미드나잇
  else if (earthHue(p.c.h) && p.c.L < 48 && p.c.C < 60) w *= .5;   // 다크 브라운·다크 올리브
  if (isDenim(p)) w *= .35;
  return w;
}
function vivid(p) {                   /* 0 차분 … 1 쨍함. 어두우면 덜 쨍하게 보이고, 어스 색은 문턱이 높다 */
  const c0 = earthHue(p.c.h) ? 58 : 44;
  return ramp(p.c.C, c0, c0 + 22) * ramp(p.c.L, 26, 44) * (isDenim(p) ? .3 : 1);
}

function evaluate(items, ctx) {
  ctx = ctx || {};
  const situ = SITU[ctx.situ] || SITU.daily;
  const pc = ctx.pc || null;
  const contrast = ctx.contrast || (pc ? DEFAULT_CONTRAST[pc] : 'mid');
  const season = SEASON_OF(ctx.month || (new Date().getMonth() + 1));
  const vis = visibleAreas(items);
  const P = items.filter(i => vis[i.slot] > .015).map(i => ({ ...i, c: lch(i.hex), area: vis[i.slot], ko: i.name || SLOT_KO[i.slot] || i.slot }));
  P.forEach(p => { p.wc = chromaWeight(p); p.vv = vivid(p); p.kind = p.wc < .15 ? 'neutral' : p.wc < .75 ? 'soft' : 'chroma'; });
  const by = s => P.find(p => p.slot === s);
  const reasons = [], parts = {};
  const add = (id, txt, w, slots) => reasons.push({ id, txt, w, slots: slots || [] });
  const nm = p => (p.color ? p.color + ' ' : '') + p.ko;
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
    if (oneTone) {
      const contrastors = P.filter(p => ['top', 'inner', 'shoes', 'scarf', 'tie', 'layer'].includes(p.slot) && p !== upperMain);
      const bestP = contrastors.reduce((m, p) => (!m || Math.abs(p.c.L - upperMain.c.L) > Math.abs(m.c.L - upperMain.c.L)) ? p : m, null);
      const best = bestP ? Math.abs(bestP.c.L - upperMain.c.L) : 0;
      fit = Math.max(fit, .45 + .55 * ramp(best, 18, 45));
      if (best >= 30) add('onetone-ok', `위아래를 한 색으로 묶고 ${nm(bestP)}로 갈랐어요`, 1, ['top', 'bottom']);
      else add('onetone-flat', '위아래가 한 색인데 나눠 줄 밝은 곳이 없어요. 이너나 신발로 대비를 줘 보세요', -1, ['top', 'shoes', 'inner']);
    } else if (dL < TARGET[1] * .6) add('dL-low', '위아래 밝기가 비슷해서 뭉개져 보여요', -2, ['top', 'bottom', 'outer']);
    else if (dL > TARGET[3]) add('dL-high', '위아래 밝기 차이가 너무 커서 끊겨 보여요. 중간 밝기 옷을 하나 넣어 보세요', -1, ['top', 'bottom']);
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
  let cScore = n < 1 ? 12 + 4 * n : n <= 2 ? 20 - 2 * (n - 1) : n <= 3 ? 18 - 7 * (n - 2) : Math.max(3, 11 - 7 * (n - 3));
  if (n >= 2.6) add('too-many', `색이 ${Math.round(n)}가지라 많아요. 하나는 무채색으로 바꿔 보세요`, -2, P.filter(p => p.wc >= .5).map(p => p.slot));
  if (n < .3) add('all-neutral', '전부 무채색이라 안전하지만 심심해요. 작은 포인트 색을 하나 더해 보세요', 0, ['scarf', 'shoes', 'top']);
  const strongArea = P.reduce((s, p) => s + p.area * p.vv, 0);
  if (strongArea > situ.accentMax) { const pen = Math.min(16, (strongArea - situ.accentMax) * 45 * situ.strict); cScore -= pen; add('accent-big', `강한 색이 전체의 ${Math.round(strongArea * 100)}%나 돼요. 포인트는 작을수록 살아요`, -2, P.filter(p => p.vv > .4).map(p => p.slot)); }
  const anchor = P.reduce((a, b) => (a.area >= b.area ? a : b), P[0]);
  if (anchor && anchor.vv > .25) { cScore -= 8 * anchor.vv; add('anchor', `제일 넓은 ${nm(anchor)}가 너무 쨍해요. 넓은 자리는 차분한 색이 편해요`, -2, [anchor.slot]); }
  const chromItems = P.filter(p => p.wc > .5 && p.area >= .05);
  if (chromItems.length >= 3 && !P.some(p => p.wc < .3 && p.area >= .05)) { const vAvg = chromItems.reduce((s, p) => s + p.vv, 0) / chromItems.length; const pen = 6 + 6 * vAvg; cScore -= pen; add('no-neutral', '무채색이 한 벌도 없어요. 눈이 쉬어 갈 색이 하나는 필요해요', -1, chromItems.map(p => p.slot)); }
  parts['색 수·면적'] = [Math.round(clamp(cScore, 0, 20)), 20];

  /* 3. 조화 20 */
  let hScore = 20;
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
      if (warmHue(a.c.h) !== warmHue(b.c.h) && dh > 60) { const t = Math.min(ramp(a.c.C, 30, 50), ramp(b.c.C, 30, 50)) * w; hScore -= 3 * t; if (t > .5) add('temp', `${nm(a)}와 ${nm(b)}는 따뜻한 색과 차가운 색이 섞여 어긋나요. 하나를 무채색으로 바꿔 보세요`, -1, [a.slot, b.slot]); }
      if (nextTo(a, b) && dh > 150 && vv > .3) { hScore -= 4 * vv; add('comp', `${nm(a)}와 ${nm(b)}는 보색이라 서로를 밀어내요`, -1, [a.slot, b.slot]); }
      if (nextTo(a, b) && dh >= 18 && dh <= 75 && vv > .35 && Math.abs(a.c.C - b.c.C) < 30) { hScore -= 8 * vv; add('analog-vivid', `${nm(a)}와 ${nm(b)}는 비슷한 계열인데 둘 다 쨍해서 서로 부딪혀요. 하나는 톤을 낮춰 보세요`, -1, [a.slot, b.slot]); }
    }
    /* 블랙 × 네이비: 둘 다 어두운데 구분이 안 된다 */
    const isBlack = p => p.c.C <= NEUTRAL_C && p.c.L < 18, isNavy = p => p.c.h >= 250 && p.c.h <= 310 && p.c.L < 30 && p.c.C > 15;
    if (bigPair && nextTo(a, b) && ((isBlack(a) && isNavy(b)) || (isBlack(b) && isNavy(a)))) { hScore -= 8; add('black-navy', `${nm(a)}와 ${nm(b)}가 붙으면 검정인지 남색인지 구분이 안 돼요`, -1, [a.slot, b.slot]); }
  }
  const darkBig = P.filter(p => p.c.L < 42 && p.area >= .05);
  const darkFams = []; darkBig.forEach(p => { const key = p.c.C <= NEUTRAL_C ? 'k' : String(Math.round(p.c.h / 40)); if (!darkFams.includes(key)) darkFams.push(key); });
  if (darkFams.length >= 3) { hScore -= 12; add('dark-mix', '검정·남색·갈색처럼 어두운 색이 세 가지나 섞여 탁해요. 하나는 밝게 해 보세요', -1, darkBig.map(p => p.slot)); }
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const a = P[i], b = P[j]; const bp = ['outer', 'layer', 'top', 'bottom'].includes(a.slot) && ['outer', 'layer', 'top', 'bottom'].includes(b.slot); const blk = p => p.c.C <= NEUTRAL_C && p.c.L < 18, brn = p => earthHue(p.c.h) && p.c.C > 18 && p.c.L < 45; if (bp && nextTo(a, b) && ((blk(a) && brn(b)) || (blk(b) && brn(a)))) { hScore -= 3; add('black-brown', `${nm(a)}와 ${nm(b)}는 서로를 탁하게 해요`, -1, [a.slot, b.slot]); } }
  parts['조화'] = [Math.round(clamp(hScore, 0, 20)), 20];

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
  else if (points.length === 1 && n <= 2.2) add('point-one', `${nm(points[0])} 하나가 포인트가 됐어요`, 1, [points[0].slot]);
  points.forEach(pt => { const others = P.filter(p => p !== pt && p.wc > .2); if (others.length && !others.some(o => dH(o.c.h, pt.c.h) < 40 || warmHue(o.c.h) === warmHue(pt.c.h))) { eScore -= 2; add('point-odd', `${nm(pt)} 포인트가 다른 색들과 온도가 달라 겉돌아요`, -1, [pt.slot]); } });
  parts['시선 정리'] = [Math.round(clamp(eScore, 0, 10)), 10];

  /* 5. 상황·계절 10 */
  let sScore = 6;
  P.filter(p => p.area >= .2).forEach(p => { const over = ramp(p.c.C - situ.bigC, 0, 30) * ramp(p.c.L, 26, 44); if (over > .1) { sScore -= 4 * over * situ.strict; if (over > .4) add('situ-big', `${nm(p)}는 이 자리엔 조금 쨍해요`, -1, [p.slot]); } });
  const avgL = P.reduce((s, p) => s + p.c.L * p.area, 0);
  if (season === 'summer') { const pen = 3 * ramp(38 - avgL, 0, 12); sScore -= pen; if (pen > 1.5) add('season-heavy', '여름치고 전체가 어두워요. 한 벌은 밝게 해 보세요', -1, ['top']); }
  if (season === 'winter' && avgL > 80 && n < .3) { sScore -= 2; add('season-light', '겨울인데 전체가 하얘요. 한 벌은 깊은 색으로 해 보세요', 0, ['outer', 'bottom']); }
  if (season === 'autumn' && P.some(p => p.area >= .1 && p.wc > .2 && earthHue(p.c.h) && p.c.L < 72)) { sScore += 2; add('season-earth', '가을에 맞는 어스 톤이에요', 1, []); }
  if (season === 'spring' && P.some(p => p.area >= .1 && p.c.L > 76 && p.wc > .2)) { sScore += 2; add('season-fresh', '봄에 맞게 밝고 맑아요', 1, []); }
  if (season === 'summer' && avgL > 62) { sScore += 2; add('season-cool', '여름에 맞게 가벼워요', 1, []); }
  if (season === 'winter' && P.some(p => p.c.L < 30 && p.area > .3)) { sScore += 2; add('season-deep', '겨울에 맞게 깊이가 있어요', 1, []); }
  parts['상황·계절'] = [Math.round(clamp(sScore, 0, 10)), 10];

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
  /* 추천 = 안전한 색(무채·연유채) 최대 3 + 색 있는 것 최대 3. 감점 규칙 없는 것만, 계열 겹침 2개까지 */
  const byAdj = [...list].sort((a, b) => b.adj - a.adj || a.key.localeCompare(b.key));
  const pickN = (pred, nMax, tol) => { const out = [], hues = []; for (const x of byAdj) { if (out.length >= nMax) break; if (!pred(x) || x.warn.some(w => w.w <= -1) || x.total < top - tol) continue; const c = lch(x.hex); const fam = c.C <= NEUTRAL_C ? 'n' + (c.L > 60 ? 'L' : 'D') : 'h' + Math.round(c.h / 30); if (hues.filter(h => h === fam).length >= 2) continue; hues.push(fam); out.push(x); } return out; };
  const half = Math.ceil((opts.recN || 6) / 2);
  const safe = pickN(x => lch(x.hex).C <= 18, half, 6), colored = pickN(x => lch(x.hex).C > 18, (opts.recN || 6) - half, 3);
  const rec = [...safe, ...colored].sort((a, b) => b.total - a.total || a.vv - b.vv);
  const recSet = new Set(rec.map(x => x.key));
  const marks = {}; list.forEach(x => { marks[x.key] = recSet.has(x.key) ? 'rec' : (x.warn.length && x.d <= -4) ? 'warn' : ''; });
  return { base, list, rec, marks };
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
export { lch, evaluate, delta, guide, bestMoves, visibleAreas, toneFail, chromaWeight, vivid, NEUTRAL_C, SOFT_C, AREA };
