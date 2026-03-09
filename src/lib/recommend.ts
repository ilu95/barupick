// @ts-nocheck
// ================================================================
// recommend.ts — 코디 추천/생성 엔진
// 원본: 바루픽_최신본.html 2935~4194행
// ⚠️ 추천 결과가 기존과 동일하게 나와야 합니다.
// ================================================================

import { COLORS_60, COLORS, hcl, H, Cv, L, hex, temp, COLOR_FAMILIES, WARM_SET, COOL_SET, getHueDiff, isNeutralColor, getToneGroup, getColorTemperature, PASTEL_COLORS, EARTH_TONE_COLORS, CLASSIC_COMBOS, AVOID_COMBOS } from './colors'
import { STYLE_MOODS } from './styleMoods'
import { STYLE_GUIDE, LAYER_LEVELS } from './styles'
import { PERSONAL_COLOR_12, FACE_NEAR_ITEMS } from './personalColor'
import { BODY_GUIDE_DATA } from './bodyType'
import { evaluationSystem } from './evaluation'
import { profile } from './profile'


const STW = {
    // Semi-formal
    preppy: { monochrome: .04, tone_on_tone: .10, gradient: .03, tone_in_tone: .08, one_point: .14, complementary: .06, analogous: .12, split_complementary: .05, color_blocking: .06, light_dark_contrast: .10, neutral_accent: .06, all_neutral: .04, ratio_211: .07, sandwich: .05 },
    ivy: { monochrome: .06, tone_on_tone: .12, gradient: .04, tone_in_tone: .06, one_point: .12, complementary: .04, analogous: .12, split_complementary: .04, color_blocking: .04, light_dark_contrast: .10, neutral_accent: .06, all_neutral: .06, ratio_211: .08, sandwich: .06 },
    dandy: { monochrome: .08, tone_on_tone: .12, gradient: .06, tone_in_tone: .08, one_point: .10, complementary: .04, analogous: .10, split_complementary: .04, color_blocking: .03, light_dark_contrast: .08, neutral_accent: .08, all_neutral: .06, ratio_211: .06, sandwich: .07 },
    oldmoney: { monochrome: .12, tone_on_tone: .14, gradient: .08, tone_in_tone: .06, one_point: .06, complementary: .02, analogous: .08, split_complementary: .02, color_blocking: .02, light_dark_contrast: .10, neutral_accent: .10, all_neutral: .10, ratio_211: .05, sandwich: .05 },
    ralphlook: { monochrome: .04, tone_on_tone: .08, gradient: .03, tone_in_tone: .10, one_point: .16, complementary: .06, analogous: .12, split_complementary: .05, color_blocking: .08, light_dark_contrast: .08, neutral_accent: .05, all_neutral: .03, ratio_211: .07, sandwich: .05 },

    // Casual
    minimal: { monochrome: .12, tone_on_tone: .12, gradient: .10, tone_in_tone: .06, one_point: .08, complementary: .02, analogous: .08, split_complementary: .02, color_blocking: .03, light_dark_contrast: .10, neutral_accent: .10, all_neutral: .08, ratio_211: .05, sandwich: .04 },
    casual: { monochrome: .04, tone_on_tone: .10, gradient: .04, tone_in_tone: .08, one_point: .12, complementary: .05, analogous: .12, split_complementary: .04, color_blocking: .06, light_dark_contrast: .08, neutral_accent: .08, all_neutral: .05, ratio_211: .08, sandwich: .06 },
    cityboy: { monochrome: .03, tone_on_tone: .10, gradient: .06, tone_in_tone: .12, one_point: .14, complementary: .03, analogous: .14, split_complementary: .03, color_blocking: .04, light_dark_contrast: .04, neutral_accent: .08, all_neutral: .03, ratio_211: .08, sandwich: .08 },
    normcore: { monochrome: .10, tone_on_tone: .12, gradient: .08, tone_in_tone: .04, one_point: .06, complementary: .02, analogous: .06, split_complementary: .02, color_blocking: .02, light_dark_contrast: .10, neutral_accent: .10, all_neutral: .14, ratio_211: .06, sandwich: .08 },
    athleisure: { monochrome: .14, tone_on_tone: .10, gradient: .10, tone_in_tone: .04, one_point: .08, complementary: .02, analogous: .06, split_complementary: .02, color_blocking: .04, light_dark_contrast: .12, neutral_accent: .08, all_neutral: .10, ratio_211: .06, sandwich: .04 },

    // Work/Outdoor
    amekaji: { monochrome: .04, tone_on_tone: .14, gradient: .04, tone_in_tone: .08, one_point: .10, complementary: .04, analogous: .14, split_complementary: .04, color_blocking: .06, light_dark_contrast: .06, neutral_accent: .06, all_neutral: .06, ratio_211: .08, sandwich: .06 },
    workwear: { monochrome: .04, tone_on_tone: .14, gradient: .04, tone_in_tone: .06, one_point: .10, complementary: .04, analogous: .14, split_complementary: .04, color_blocking: .06, light_dark_contrast: .06, neutral_accent: .06, all_neutral: .08, ratio_211: .08, sandwich: .06 },
    military: { monochrome: .06, tone_on_tone: .12, gradient: .06, tone_in_tone: .06, one_point: .08, complementary: .03, analogous: .14, split_complementary: .03, color_blocking: .04, light_dark_contrast: .08, neutral_accent: .06, all_neutral: .10, ratio_211: .08, sandwich: .06 },
    british: { monochrome: .06, tone_on_tone: .12, gradient: .04, tone_in_tone: .08, one_point: .10, complementary: .04, analogous: .14, split_complementary: .04, color_blocking: .04, light_dark_contrast: .08, neutral_accent: .06, all_neutral: .06, ratio_211: .08, sandwich: .06 },
    gorpcore: { monochrome: .04, tone_on_tone: .10, gradient: .04, tone_in_tone: .08, one_point: .12, complementary: .04, analogous: .12, split_complementary: .04, color_blocking: .06, light_dark_contrast: .06, neutral_accent: .08, all_neutral: .06, ratio_211: .08, sandwich: .08 },

    // Street
    street: { monochrome: .06, tone_on_tone: .08, gradient: .04, tone_in_tone: .08, one_point: .14, complementary: .06, analogous: .10, split_complementary: .04, color_blocking: .08, light_dark_contrast: .08, neutral_accent: .06, all_neutral: .04, ratio_211: .08, sandwich: .06 },
    grunge: { monochrome: .08, tone_on_tone: .14, gradient: .06, tone_in_tone: .08, one_point: .08, complementary: .04, analogous: .12, split_complementary: .04, color_blocking: .04, light_dark_contrast: .08, neutral_accent: .06, all_neutral: .08, ratio_211: .06, sandwich: .04 },
    contemporary: { monochrome: .10, tone_on_tone: .10, gradient: .08, tone_in_tone: .08, one_point: .08, complementary: .03, analogous: .10, split_complementary: .03, color_blocking: .04, light_dark_contrast: .08, neutral_accent: .08, all_neutral: .06, ratio_211: .06, sandwich: .08 },
    techwear: { monochrome: .16, tone_on_tone: .12, gradient: .12, tone_in_tone: .06, one_point: .04, complementary: .01, analogous: .08, split_complementary: .01, color_blocking: .03, light_dark_contrast: .12, neutral_accent: .06, all_neutral: .10, ratio_211: .05, sandwich: .04 },
    genderless: { monochrome: .06, tone_on_tone: .10, gradient: .06, tone_in_tone: .10, one_point: .10, complementary: .03, analogous: .10, split_complementary: .03, color_blocking: .04, light_dark_contrast: .08, neutral_accent: .10, all_neutral: .06, ratio_211: .06, sandwich: .08 },
};

// — p3_helpers.js —
// 3. HELPER FUNCTIONS
// ===================================================================

function pick(a) { return a[Math.floor(Math.random() * a.length)] }
function shuffle(a) { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]] } return r }
function pickN(a, n) { return shuffle(a).slice(0, Math.min(n, a.length)) }
function wPick(items, weights) { const r = Math.random(); let c = 0; for (let i = 0; i < items.length; i++) { c += weights[i]; if (r <= c) return items[i] } return items[items.length - 1] }

function pick4Spread(sorted) {
    if (sorted.length <= 4) return sorted.slice(0, 4);
    const n = sorted.length, step = (n - 1) / 3;
    return [sorted[0], sorted[Math.round(step)], sorted[Math.round(step * 2)], sorted[n - 1]];
}

function selectGradient(sorted, count, minGap) {
    for (let a = 0; a < 30; a++) {
        const sel = [pick(sorted)]; const pool = shuffle(sorted.filter(c => c !== sel[0]));
        for (const c of pool) { if (sel.length >= count) break; if (sel.every(s => Math.abs(L(c) - L(s)) >= minGap)) sel.push(c) }
        if (sel.length >= count) return sel.sort((a, b) => L(a) - L(b));
    }
    return null;
}

function pickDiverseHues(pool, n) {
    for (let a = 0; a < 30; a++) {
        const sel = [pick(pool)]; const rest = shuffle(pool.filter(c => c !== sel[0]));
        for (const c of rest) {
            if (sel.length >= n) break;
            if (sel.every(s => { const d = Math.min(Math.abs(H(c) - H(s)), 360 - Math.abs(H(c) - H(s))); return d >= 25 || (Cv(c) < 10 && Cv(s) < 10) })) sel.push(c);
        }
        if (sel.length >= n) return sel;
    }
    return null;
}

function pickWithLSpread(pool, n) {
    for (let a = 0; a < 20; a++) { const s = pickN(pool, n); if (s.length < n) continue; const ls = s.map(L); if (Math.max(...ls) - Math.min(...ls) >= 20) return s }
    const sorted = [...pool].sort((a, b) => L(a) - L(b)); return sorted.length >= n ? pick4Spread(sorted) : null;
}

function pickShoe(style, ctx) {
    const pool = STYLE_MOODS[style].shoes;
    const ok = pool.filter(s => { let c = ctx.filter(x => x === s).length; return c < 2 });
    return pick(ok.length ? ok : pool);
}

function assignPos(sorted, shoes) {
    const patterns = [
        s => ({ outer: s[0], top: s[3], bottom: s[1], shoes }),
        s => ({ outer: s[3], top: s[1], bottom: s[2], shoes }),
        s => ({ outer: s[1], top: s[3], bottom: s[0], shoes }),
        s => ({ outer: s[0], top: s[2], bottom: s[3], shoes }),
        s => ({ outer: s[2], top: s[0], bottom: s[3], shoes }),
        s => ({ outer: s[3], top: s[0], bottom: s[2], shoes }),
    ];
    return pick(patterns)(sorted);
}

// ===================================================================

// — p4_techniques.js —
// 4. TECHNIQUE DEFINITIONS — 14 styling methods
// ===================================================================


const TECHNIQUES = {
    monochrome: {
        nameKo: '모노크롬',
        compose(style) {
            const m = STYLE_MOODS[style], all = [...m.darks, ...m.mids, ...m.lights];
            const fams = Object.keys(COLOR_FAMILIES).filter(f => COLOR_FAMILIES[f].filter(c => all.includes(c)).length >= 4);
            if (!fams.length) return null;
            const pool = COLOR_FAMILIES[pick(fams)].filter(c => all.includes(c) || m.pastels.includes(c));
            if (pool.length < 4) return null;
            const sorted = [...pool].sort((a, b) => L(a) - L(b));
            const colors = pick4Spread(sorted);
            return assignPos(colors.sort((a, b) => L(a) - L(b)), pickShoe(style, colors));
        }
    },

    tone_on_tone: {
        nameKo: '톤온톤',
        compose(style) {
            const m = STYLE_MOODS[style], all = [...m.darks, ...m.mids, ...m.lights, ...m.pastels];
            const fams = Object.keys(COLOR_FAMILIES).filter(f => { const p = COLOR_FAMILIES[f].filter(c => all.includes(c)); return p.length >= 3 });
            if (!fams.length) return null;
            let pool = COLOR_FAMILIES[pick(fams)].filter(c => all.includes(c)).sort((a, b) => L(a) - L(b));
            if (pool.length < 3 || L(pool[pool.length - 1]) - L(pool[0]) < 25) return null;
            const colors = pick4Spread(pool);
            return assignPos(colors.sort((a, b) => L(a) - L(b)), pickShoe(style, colors));
        }
    },

    gradient: {
        nameKo: '그라데이션',
        compose(style) {
            const m = STYLE_MOODS[style], all = [...m.darks, ...m.mids, ...m.lights, ...m.pastels];
            const dir = Math.random() < 0.5 ? 'd2l' : 'l2d';
            const sel = selectGradient(shuffle(all).sort((a, b) => L(a) - L(b)), 4, 10);
            if (!sel) return null;
            const shoes = pickShoe(style, sel);
            return dir === 'd2l' ? { outer: sel[0], top: sel[1], bottom: sel[2], shoes } : { outer: sel[3], top: sel[2], bottom: sel[1], shoes };
        }
    },

    tone_in_tone: {
        nameKo: '톤인톤',
        compose(style) {
            const m = STYLE_MOODS[style], tgt = 30 + Math.random() * 50, rng = 15;
            const all = [...m.darks, ...m.mids, ...m.lights, ...m.pastels];
            const cands = all.filter(c => Math.abs(L(c) - tgt) <= rng);
            if (cands.length < 4) return null;
            const sel = pickDiverseHues(cands, 4);
            if (!sel) return null;
            const shoes = pickShoe(style, sel);
            return { outer: sel[0], top: sel[1], bottom: sel[2], shoes };
        }
    },

    one_point: {
        nameKo: '원포인트',
        compose(style) {
            const m = STYLE_MOODS[style];
            const base = [...m.darks, ...m.mids, ...m.lights].filter(c => Cv(c) < 50);
            const accent = [...m.pastels, ...m.accents].filter(c => Cv(c) >= 20);
            if (base.length < 3 || accent.length < 1) return null;
            const ac = pick(accent);
            // pick 3 bases with L spread
            const bases = pickWithLSpread(base, 3);
            if (!bases) return null;
            const pos = Math.floor(Math.random() * 4);
            const all4 = [...bases]; all4.splice(pos, 0, ac);
            const shoes = pickShoe(style, all4);
            return { outer: all4[0], top: all4[1], bottom: all4[2], shoes };
        }
    },

    complementary: {
        nameKo: '보색 대비',
        compose(style) {
            const m = STYLE_MOODS[style];
            const chrom = [...m.darks, ...m.mids, ...m.accents].filter(c => Cv(c) >= 25);
            if (chrom.length < 2) return null;
            const c1 = pick(chrom), h1 = H(c1);
            const comp = chrom.filter(c => { const d = Math.min(Math.abs(H(c) - h1), 360 - Math.abs(H(c) - h1)); return d >= 120 && d <= 210 && c !== c1 });
            if (!comp.length) return null;
            const c2 = pick(comp);
            const neut = [...m.lights, ...m.mids].filter(c => Cv(c) < 35);
            const n1 = pick(neut), n2 = pick(neut.filter(c => c !== n1));
            if (!n2) return null;
            const shoes = pickShoe(style, [c1, c2, n1, n2]);
            const arr = pick([[c1, n1, c2, n2], [n1, c1, n2, c2], [c1, n2, n1, c2], [n1, c2, c1, n2]]);
            return { outer: arr[0], top: arr[1], bottom: arr[2], shoes };
        }
    },

    analogous: {
        nameKo: '유사색 조화',
        compose(style) {
            const m = STYLE_MOODS[style], all = [...m.darks, ...m.mids, ...m.lights, ...m.pastels, ...m.accents];
            const chrom = all.filter(c => Cv(c) >= 15);
            if (chrom.length < 2) return null;
            const anchor = pick(chrom), hA = H(anchor);
            const nearby = all.filter(c => { if (c === anchor) return false; const d = Math.min(Math.abs(H(c) - hA), 360 - Math.abs(H(c) - hA)); return d <= 70 });
            if (nearby.length < 3) return null;
            const others = pickWithLSpread(nearby, 3);
            if (!others) return null;
            const all4 = [anchor, ...others].sort((a, b) => L(a) - L(b));
            return assignPos(all4, pickShoe(style, all4));
        }
    },

    split_complementary: {
        nameKo: '분할보색',
        compose(style) {
            const m = STYLE_MOODS[style];
            const chrom = [...m.darks, ...m.mids, ...m.accents, ...m.pastels].filter(c => Cv(c) >= 20);
            if (chrom.length < 3) return null;
            const base = pick(chrom), hB = H(base);
            const s1p = chrom.filter(c => { const d = Math.min(Math.abs(H(c) - hB), 360 - Math.abs(H(c) - hB)); return d >= 110 && d <= 160 && c !== base });
            const s2p = chrom.filter(c => { const d = Math.min(Math.abs(H(c) - hB), 360 - Math.abs(H(c) - hB)); return d >= 160 && d <= 210 && c !== base });
            if (!s1p.length || !s2p.length) return null;
            const s1 = pick(s1p), s2 = pick(s2p);
            const neut = pick([...m.lights, ...m.mids].filter(c => Cv(c) < 30));
            if (!neut) return null;
            const shoes = pickShoe(style, [base, s1, s2, neut]);
            const arr = shuffle([base, s1, s2, neut]);
            return { outer: arr[0], top: arr[1], bottom: arr[2], shoes };
        }
    },

    color_blocking: {
        nameKo: '컬러 블로킹',
        compose(style) {
            const m = STYLE_MOODS[style];
            const chrom = [...m.darks, ...m.mids, ...m.accents].filter(c => Cv(c) >= 20);
            if (chrom.length < 3) return null;
            const c1 = pick(chrom);
            const c2 = pick(chrom.filter(c => { const d = Math.min(Math.abs(H(c) - H(c1)), 360 - Math.abs(H(c) - H(c1))); return d >= 40 && c !== c1 }));
            if (!c2) return null;
            const pool3 = [...m.lights, ...m.mids].filter(c => c !== c1 && c !== c2);
            const c3 = pick(pool3); if (!c3) return null;
            const shoes = pickShoe(style, [c1, c2, c3]);
            const arr = shuffle([c1, c2, c3]);
            return { outer: arr[0], top: arr[1], bottom: arr[2], shoes };
        }
    },

    light_dark_contrast: {
        nameKo: '명암 대비',
        compose(style) {
            const m = STYLE_MOODS[style];
            const dp = m.darks.filter(c => L(c) <= 40), lp = [...m.lights, ...m.pastels].filter(c => L(c) >= 70);
            if (dp.length < 1 || lp.length < 1) return null;
            const pat = pick(['2d2l', '1d3l', '3d1l']);
            let colors;
            if (pat === '2d2l') { const d1 = pick(dp), d2 = pick(dp.filter(c => c !== d1)) || d1, l1 = pick(lp), l2 = pick(lp.filter(c => c !== l1)) || l1; colors = shuffle([d1, d2, l1, l2]) }
            else if (pat === '1d3l') { colors = shuffle([pick(dp), ...pickN(lp, 3)]) }
            else { colors = shuffle([...pickN(dp, 3), pick(lp)]) }
            const shoes = pickShoe(style, colors);
            return { outer: colors[0], top: colors[1], bottom: colors[2], shoes };
        }
    },

    neutral_accent: {
        nameKo: '뉴트럴+악센트',
        compose(style) {
            const m = STYLE_MOODS[style];
            const np = [...m.darks, ...m.mids, ...m.lights].filter(c => Cv(c) <= 25);
            const ap = [...m.pastels, ...m.accents].filter(c => Cv(c) >= 18);
            if (np.length < 3 || ap.length < 1) return null;
            const ns = pickN(np, 3); if (ns.length < 3) return null;
            const ac = pick(ap);
            const pos = Math.floor(Math.random() * 4);
            const all4 = [...ns]; all4.splice(pos, 0, ac);
            return { outer: all4[0], top: all4[1], bottom: all4[2], shoes: pickShoe(style, all4) };
        }
    },

    all_neutral: {
        nameKo: '올 뉴트럴',
        compose(style) {
            const m = STYLE_MOODS[style];
            const np = [...m.darks, ...m.mids, ...m.lights].filter(c => Cv(c) <= 30);
            if (np.length < 4) return null;
            const sel = pickWithLSpread(np, 4); if (!sel) return null;
            return assignPos(sel.sort((a, b) => L(a) - L(b)), pickShoe(style, sel));
        }
    },

    ratio_211: {
        nameKo: '2:1:1 비율',
        compose(style) {
            const m = STYLE_MOODS[style], all = [...m.darks, ...m.mids, ...m.lights, ...m.pastels];
            const mc = pick(all);
            const rest = all.filter(c => c !== mc && Math.abs(L(c) - L(mc)) >= 10);
            if (rest.length < 2) return null;
            const c2 = pick(rest), c3 = pick(rest.filter(c => c !== c2)); if (!c3) return null;
            const pats = [[mc, c2, mc, c3], [c2, mc, c3, mc], [mc, c2, c3, mc], [mc, mc, c2, c3], [c2, c3, mc, mc]];
            const p = pick(pats);
            return { outer: p[0], top: p[1], bottom: p[2], shoes: pickShoe(style, p) };
        }
    },

    sandwich: {
        nameKo: '샌드위치',
        compose(style) {
            const m = STYLE_MOODS[style], all = [...m.darks, ...m.mids, ...m.lights, ...m.pastels];
            const ft = Math.random() < 0.6 ? 'oc' : 'ti';
            const fc = pick(all);
            const fill = all.filter(c => c !== fc && Math.abs(L(c) - L(fc)) >= 12);
            if (fill.length < 2) return null;
            const f1 = pick(fill), f2 = pick(fill.filter(c => c !== f1)); if (!f2) return null;
            const shoes = pickShoe(style, [fc, f1, f2]);
            return ft === 'oc' ? { outer: fc, top: f1, bottom: fc, shoes } : { outer: f1, top: fc, bottom: f2, shoes };
        }
    },
};

// ===================================================================

// — p6_critic.js —
// 6. CRITIC
// ===================================================================
function scoreCritic(o, style) {
    const cols = [o.outer, o.top, o.bottom, o.shoes];
    let total = 0;

    // F1: Hue harmony (12pt)
    const hues = cols.filter(c => Cv(c) >= 15).map(H);
    let f1 = 6;
    if (hues.length >= 2) {
        const pairs = []; for (let i = 0; i < hues.length; i++)for (let j = i + 1; j < hues.length; j++) { const d = Math.min(Math.abs(hues[i] - hues[j]), 360 - Math.abs(hues[i] - hues[j])); pairs.push(d) }
        const avg = pairs.reduce((a, b) => a + b, 0) / pairs.length;
        f1 = avg <= 50 ? 11 : avg >= 120 && avg <= 180 ? 10 : avg >= 80 ? 8 : 5;
    }
    total += f1;

    // F2: Lightness dynamics (13pt)
    const ls = cols.map(L), lR = Math.max(...ls) - Math.min(...ls), avgL = ls.reduce((a, b) => a + b) / 4;
    let f2 = 6;
    if (style === 'cityboy' && avgL > 65) { const v = ls.reduce((a, x) => a + (x - avgL) ** 2, 0) / 4; f2 = v > 100 ? 13 : v > 40 ? 10 : 7 }
    else if (style === 'techwear' && avgL < 45) { const v = ls.reduce((a, x) => a + (x - avgL) ** 2, 0) / 4; f2 = v > 80 ? 13 : v > 30 ? 10 : 7 }
    else { f2 = lR >= 45 ? 13 : lR >= 30 ? 10 : lR >= 15 ? 7 : 4 }
    total += f2;

    // F3: Chroma balance (10pt)
    const tc = cols.map(Cv).reduce((a, b) => a + b) / 100;
    total += (tc >= 0.3 && tc <= 2.0) ? 10 : tc < 0.3 ? 5 : 6;

    // F4: Temperature coherence (10pt)
    const ts = cols.map(temp), wc = ts.filter(t => t === 'w').length, cc = ts.filter(t => t === 'c').length;
    const bias = STYLE_MOODS[style].tempBias;
    let f4 = 5;
    if (bias === 'warm') f4 = wc >= 2 ? 10 : wc >= 1 ? 7 : 3;
    else if (bias === 'neutral') f4 = (wc <= 3 && cc <= 3) ? 9 : 6;
    else f4 = Math.abs(wc - cc) <= 2 ? 9 : 5;
    total += f4;

    // F5: Style identity (25pt)
    const m = STYLE_MOODS[style], sp = new Set([...m.darks, ...m.mids, ...m.lights, ...m.pastels, ...m.accents, ...m.shoes]);
    let f5 = 0; cols.forEach(c => { f5 += sp.has(c) ? 5 : -2 }); f5 += m.shoes.includes(o.shoes) ? 5 : -1;
    f5 = Math.max(0, Math.min(25, f5));
    total += f5;

    // F6: Adjacent contrast (10pt)
    let f6 = 10;
    [[0, 1], [1, 2], [2, 3]].forEach(([i, j]) => { if (cols[i] === cols[j]) f6 -= 4; else if (Math.abs(L(cols[i]) - L(cols[j])) < 5) f6 -= 2 });
    total += Math.max(0, f6);

    // F7: Diversity (10pt)
    const uniq = new Set(cols).size;
    total += (uniq === 4 ? 10 : uniq === 3 ? 7 : uniq === 2 ? 4 : 1);

    return { total: Math.min(95, Math.max(0, total)), f1, f2, f4, f5, f6 };
}

// ===================================================================
// 7. GENERATOR
// ===================================================================
function pickTech(style) {
    const w = STW[style], ts = Object.keys(w), ws = ts.map(t => w[t]);
    return wPick(ts, ws);
}

// ===================================================================

// — filter_20.js —
// ===================================================================
// STYLE FILTER — 20 styles
// ===================================================================
function styleFilter(style, r) {
    const cols = [r.outer, r.top, r.bottom, r.shoes];
    const ws = cols.map(temp).filter(t => t === 'w').length;
    const cs = cols.map(temp).filter(t => t === 'c').length;
    const avgL = cols.map(L).reduce((a, b) => a + b) / 4;
    const chromatics = cols.filter(c => Cv(c) >= 40);
    const highChrom = cols.filter(c => Cv(c) >= 60);
    const pastels = cols.filter(c => c.startsWith('pastel_'));
    const darks = cols.filter(c => L(c) <= 30);
    const lights = cols.filter(c => L(c) >= 80);
    const purples = cols.filter(c => ['eggplant', 'dark_purple', 'plum', 'mauve', 'purple', 'pastel_lavender', 'pastel_lilac'].includes(c));
    const pinks = cols.filter(c => ['pastel_pink', 'pastel_coral', 'pastel_peach', 'pastel_rose', 'dusty_rose', 'rose', 'salmon'].includes(c));
    const deepBlue = cols.filter(c => ['midnight', 'dark_blue', 'cobalt', 'indigo'].includes(c));
    const earthLight = cols.filter(c => ['cream', 'ivory', 'beige', 'camel', 'tan', 'pastel_peach'].includes(c));
    const heavyGreen = cols.filter(c => ['hunter_green', 'forest', 'dark_green', 'dark_olive'].includes(c));

    // ── UNIVERSAL: temperature clash ──
    if (ws >= 2 && cs >= 2) return false;

    // ── UNIVERSAL: adjacent same color ──
    if (r.outer === r.top || r.top === r.bottom) return false;

    // ── STYLE-SPECIFIC ──
    const m = STYLE_MOODS[style];

    switch (style) {

        // === SEMI-FORMAL ===
        case 'preppy':
        case 'ralphlook':
            if (pastels.length >= 3) return false;
            if (darks.length >= 3 && lights.length === 0) return false;
            if (purples.length >= 2) return false;
            if (pinks.length >= 3) return false;
            break;

        case 'ivy':
            if (pastels.length >= 2) return false;  // ivy는 파스텔 최대 1개
            if (darks.length >= 3 && lights.length === 0) return false;
            if (purples.length >= 2) return false;
            break;

        case 'dandy':
            if (pastels.length >= 3) return false;
            if (highChrom.length >= 2) return false;  // 댄디는 너무 강한 채도 금지
            if (darks.length >= 3 && lights.length === 0) return false;
            break;

        case 'oldmoney':
            if (pastels.length >= 2) return false;
            if (chromatics.length >= 3) return false;  // 올드머니는 유채색 최대 2
            if (highChrom.length >= 1) return false;   // 강한 채도 전면 금지
            // 색상군 2개 이하
            const omHues = new Set(cols.filter(c => Cv(c) >= 20).map(c => Math.round(H(c) / 60) % 6));
            if (omHues.size >= 3) return false;
            break;

        // === CASUAL ===
        case 'minimal':
            if (chromatics.length >= 3) return false;
            const miniHues = new Set(cols.filter(c => Cv(c) >= 25).map(c => Math.round(H(c) / 60) % 6));
            if (miniHues.size >= 3) return false;
            break;

        case 'casual':
            if (highChrom.length >= 3) return false;  // 비비드 3개 과잉
            if (darks.length >= 3 && lights.length === 0 && avgL < 35) return false;
            break;

        case 'cityboy':
            if (avgL < 50) return false;
            if (darks.length >= 3) return false;
            if (heavyGreen.length >= 2) return false;
            break;

        case 'normcore':
            if (pastels.length >= 2) return false;
            if (chromatics.length >= 2) return false;  // 놈코어는 유채색 최대 1
            if (highChrom.length >= 1) return false;   // 강한 채도 금지
            break;

        case 'athleisure':
            if (highChrom.length >= 2) return false;
            if (ws >= 3) return false;
            if (lights.length >= 3) return false;
            if (earthLight.length >= 2) return false;
            break;

        // === WORK/OUTDOOR ===
        case 'amekaji':
        case 'workwear':
            if (pastels.length >= 1) return false;
            if (cs >= 3) return false;
            if (deepBlue.length >= 2) return false;
            break;

        case 'military':
            if (pastels.length >= 1) return false;
            if (cs >= 3) return false;
            if (purples.length >= 1) return false;  // 밀리터리에 보라 금지
            if (pinks.length >= 1) return false;    // 핑크도 금지
            break;

        case 'british':
            if (pastels.length >= 2) return false;
            if (cs >= 3) return false;
            if (highChrom.length >= 2) return false;
            break;

        case 'gorpcore':
            if (purples.length >= 2) return false;
            if (pinks.length >= 2) return false;
            if (cs >= 3) return false;
            break;

        // === STREET ===
        case 'street':
            if (pastels.length >= 3) return false;  // 스트릿은 파스텔 과잉 금지
            break;

        case 'grunge':
            if (pastels.length >= 1) return false;  // 그런지에 파스텔 금지
            if (lights.length >= 3) return false;   // 너무 밝으면 안됨
            if (cs >= 3) return false;
            break;

        case 'contemporary':
            if (highChrom.length >= 2) return false;
            const contHues = new Set(cols.filter(c => Cv(c) >= 30).map(c => Math.round(H(c) / 60) % 6));
            if (contHues.size >= 3) return false;
            break;

        case 'techwear':
            if (highChrom.length >= 2) return false;
            if (chromatics.length >= 3) return false;
            if (ws >= 3) return false;
            if (lights.length >= 3) return false;
            if (earthLight.length >= 2) return false;
            if (avgL > 60) return false;
            break;

        case 'genderless':
            if (highChrom.length >= 2) return false;
            if (darks.length >= 3 && lights.length === 0) return false;
            break;
    }

    return true;
}

// — p7_gen_clean.js —

function genOne(style) {
    for (let a = 0; a < 30; a++) {
        const tn = pickTech(style), r = TECHNIQUES[tn].compose(style);
        if (!r || !r.outer || !r.top || !r.bottom || !r.shoes) continue;
        if (!COLORS[r.outer] || !COLORS[r.top] || !COLORS[r.bottom] || !COLORS[r.shoes]) continue;
        if (!styleFilter(style, r)) continue;
        const sc = scoreCritic(r, style);
        if (sc.total >= 50) return { ...r, technique: tn, score: sc };
    }
    return null;
}

function generateOutfits(style, count) {
    const outfits = [], seen = new Set(), osCount = {};
    let att = 0; const mx = count * 15;
    while (outfits.length < count && att < mx) {
        att++; const o = genOne(style); if (!o) continue;
        const key = `${o.outer}/${o.top}/${o.bottom}/${o.shoes}`;
        if (seen.has(key)) continue;
        const osk = `${o.outer}_${o.shoes}`; osCount[osk] = (osCount[osk] || 0) + 1;
        if (osCount[osk] > 4) continue;
        const cc = {};[o.outer, o.top, o.bottom, o.shoes].forEach(c => cc[c] = (cc[c] || 0) + 1);
        if (Object.values(cc).some(v => v >= 3)) continue;
        seen.add(key); outfits.push(o);
    }
    return outfits.sort((a, b) => b.score.total - a.score.total);
}

const LAYER_DEFS = {
    simple: { name: '심플', partKeys: ['top', 'bottom', 'shoes'], bodyKeys: ['top', 'bottom'] },
    basic: { name: '아우터+이너', partKeys: ['outer', 'top', 'bottom', 'shoes'], bodyKeys: ['outer', 'top', 'bottom'] },
    mid_inner: { name: '니트류+이너', partKeys: ['middleware', 'top', 'bottom', 'shoes'], bodyKeys: ['middleware', 'top', 'bottom'] },
    scarf_top: { name: '목도리+상의', partKeys: ['scarf', 'top', 'bottom', 'shoes'], bodyKeys: ['scarf', 'top', 'bottom'] },
    layered: { name: '아우터+니트류+이너', partKeys: ['outer', 'middleware', 'top', 'bottom', 'shoes'], bodyKeys: ['outer', 'middleware', 'top', 'bottom'] },
    scarf_basic: { name: '목도리+아우터+이너', partKeys: ['scarf', 'outer', 'top', 'bottom', 'shoes'], bodyKeys: ['scarf', 'outer', 'top', 'bottom'] },
    scarf_mid: { name: '목도리+니트류+이너', partKeys: ['scarf', 'middleware', 'top', 'bottom', 'shoes'], bodyKeys: ['scarf', 'middleware', 'top', 'bottom'] },
    full: { name: '풀 레이어드', partKeys: ['scarf', 'outer', 'middleware', 'top', 'bottom', 'shoes'], bodyKeys: ['scarf', 'outer', 'middleware', 'top', 'bottom'] },
};

// ===================================================================
// EXTRA COLOR PICKER — coherent with existing palette
// ===================================================================
function pickExtraColor(existingColors, style) {
    const m = STYLE_MOODS[style];
    const pool = [...new Set([...m.darks, ...m.mids, ...m.lights, ...m.pastels])];
    const existing = new Set(existingColors);

    // Compute existing palette properties
    const avgLex = existingColors.map(L).reduce((a, b) => a + b) / existingColors.length;
    const exTemps = existingColors.map(temp);
    const wCount = exTemps.filter(t => t === 'w').length;
    const cCount = exTemps.filter(t => t === 'c').length;
    const dominantTemp = wCount > cCount ? 'w' : cCount > wCount ? 'c' : 'n';

    // Filter candidates
    let cands = pool.filter(c => {
        if (existing.has(c)) return false; // no exact duplicates first pass

        // Temperature: don't create W2+C2 conflict
        const t = temp(c);
        const newW = wCount + (t === 'w' ? 1 : 0);
        const newC = cCount + (t === 'c' ? 1 : 0);
        if (newW >= 2 && newC >= 2) return false;

        // L should provide some contrast with at least one neighbor
        const lc = L(c);
        const hasContrast = existingColors.some(e => Math.abs(L(e) - lc) >= 8);
        if (!hasContrast) return false;

        return true;
    });

    if (cands.length === 0) {
        // Relax: allow duplicates
        cands = pool.filter(c => {
            const t = temp(c);
            const newW = wCount + (t === 'w' ? 1 : 0);
            const newC = cCount + (t === 'c' ? 1 : 0);
            return !(newW >= 2 && newC >= 2);
        });
    }

    if (cands.length === 0) return pick(pool);

    // Score candidates by coherence
    const scored = cands.map(c => {
        let score = 0;
        const lc = L(c), hc = H(c), cc = Cv(c);

        // Reward: L between existing extremes (bridge role)
        const ls = existingColors.map(L);
        const minL = Math.min(...ls), maxL = Math.max(...ls);
        if (lc > minL && lc < maxL) score += 3;

        // Reward: hue similarity with existing (analogous)
        existingColors.forEach(e => {
            const d = Math.min(Math.abs(H(e) - hc), 360 - Math.abs(H(e) - hc));
            if (d < 40) score += 1;
        });

        // Reward: same temperature as dominant
        if (temp(c) === dominantTemp) score += 2;
        if (temp(c) === 'n') score += 1; // neutral always safe

        // Reward: in style's pool
        if (m.darks.includes(c) || m.mids.includes(c)) score += 1;

        return { c, score };
    });

    // Pick from top candidates with randomness
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, Math.min(8, scored.length));
    return pick(top).c;
}

// ===================================================================
// LAYER ADAPTER — convert 4-part outfit to any layer type
// ===================================================================
function adaptToLayer(base4, layerType, style) {
    const ld = LAYER_DEFS[layerType];
    const bodyN = ld.bodyKeys.length;  // number of body parts (excl shoes)

    if (bodyN === 2) {
        // simple: 3 parts — drop outer, keep top/bottom/shoes
        return { top: base4.top, bottom: base4.bottom, shoes: base4.shoes, technique: base4.technique };
    }

    if (bodyN === 3) {
        // 4-part layers
        switch (layerType) {
            case 'basic':
                return base4; // as-is
            case 'mid_inner':
                return { middleware: base4.outer, top: base4.top, bottom: base4.bottom, shoes: base4.shoes, technique: base4.technique };
            case 'scarf_top':
                return { scarf: base4.outer, top: base4.top, bottom: base4.bottom, shoes: base4.shoes, technique: base4.technique };
            default:
                return base4;
        }
    }

    if (bodyN === 4) {
        // 5-part layers — add one extra color
        const existing = [base4.outer, base4.top, base4.bottom, base4.shoes];
        const extra = pickExtraColor(existing, style);

        switch (layerType) {
            case 'layered':
                // outer + middleware(extra) + top + bottom + shoes
                return { outer: base4.outer, middleware: extra, top: base4.top, bottom: base4.bottom, shoes: base4.shoes, technique: base4.technique };
            case 'scarf_basic':
                // scarf(extra) + outer + top + bottom + shoes
                return { scarf: extra, outer: base4.outer, top: base4.top, bottom: base4.bottom, shoes: base4.shoes, technique: base4.technique };
            case 'scarf_mid':
                // scarf(extra) + middleware(outer) + top + bottom + shoes
                return { scarf: extra, middleware: base4.outer, top: base4.top, bottom: base4.bottom, shoes: base4.shoes, technique: base4.technique };
            default:
                return base4;
        }
    }

    if (bodyN === 5) {
        // 6-part: full — add two extra colors
        const existing = [base4.outer, base4.top, base4.bottom, base4.shoes];
        const extra1 = pickExtraColor(existing, style);
        const extra2 = pickExtraColor([...existing, extra1], style);

        // scarf(extra1) + outer + middleware(extra2) + top + bottom + shoes
        return { scarf: extra1, outer: base4.outer, middleware: extra2, top: base4.top, bottom: base4.bottom, shoes: base4.shoes, technique: base4.technique };
    }

    return base4;
}

function scoreCriticGeneric(o, style, layerType, pinnedKeys) {
    const ld = LAYER_DEFS[layerType];
    const pSet = pinnedKeys ? new Set(Object.keys(pinnedKeys)) : new Set();
    const cols = ld.partKeys.map(k => o[k]).filter(Boolean);
    const n = cols.length;
    let total = 0;

    // F1: Hue harmony (12pt)
    const hues = cols.filter(c => Cv(c) >= 15).map(H);
    let f1 = 6;
    if (hues.length >= 2) {
        const pairs = []; for (let i = 0; i < hues.length; i++)for (let j = i + 1; j < hues.length; j++) { const d = Math.min(Math.abs(hues[i] - hues[j]), 360 - Math.abs(hues[i] - hues[j])); pairs.push(d) }
        const avg = pairs.reduce((a, b) => a + b, 0) / pairs.length;
        f1 = avg <= 50 ? 11 : avg >= 120 && avg <= 180 ? 10 : avg >= 80 ? 8 : 5;
    }
    total += f1;

    // F2: Lightness dynamics (13pt)
    const ls = cols.map(L), lR = Math.max(...ls) - Math.min(...ls), avgL = ls.reduce((a, b) => a + b) / n;
    let f2 = 6;
    if (style === 'cityboy' && avgL > 65) { const v = ls.reduce((a, x) => a + (x - avgL) ** 2, 0) / n; f2 = v > 100 ? 13 : v > 40 ? 10 : 7 }
    else if (style === 'techwear' && avgL < 45) { const v = ls.reduce((a, x) => a + (x - avgL) ** 2, 0) / n; f2 = v > 80 ? 13 : v > 30 ? 10 : 7 }
    else { f2 = lR >= 45 ? 13 : lR >= 30 ? 10 : lR >= 15 ? 7 : 4 }
    total += f2;

    // F3: Chroma balance (10pt) — scale to part count
    const tc = cols.map(Cv).reduce((a, b) => a + b) / (n * 25);
    total += (tc >= 0.3 && tc <= 2.0) ? 10 : tc < 0.3 ? 5 : 6;

    // F4: Temperature coherence (10pt)
    const ts = cols.map(temp), wc = ts.filter(t => t === 'w').length, cc = ts.filter(t => t === 'c').length;
    const bias = STYLE_MOODS[style].tempBias;
    let f4 = 5;
    if (bias === 'warm') f4 = wc >= 2 ? 10 : wc >= 1 ? 7 : 3;
    else if (bias === 'neutral') f4 = (wc <= Math.ceil(n / 2) && cc <= Math.ceil(n / 2)) ? 9 : 6;
    else f4 = Math.abs(wc - cc) <= 2 ? 9 : 5;
    total += f4;

    // F5: Style identity (25pt) — pinned parts get full score (user chose them)
    const m = STYLE_MOODS[style], sp = new Set([...m.darks, ...m.mids, ...m.lights, ...m.pastels, ...m.accents, ...m.shoes]);
    const ptPerColor = Math.floor(20 / n);
    let f5 = 0;
    ld.partKeys.forEach(function (k) {
        var c = o[k]; if (!c) return;
        if (pSet.has(k)) { f5 += ptPerColor; }
        else { f5 += sp.has(c) ? ptPerColor : -1; }
    });
    const shoeKey = ld.partKeys[ld.partKeys.length - 1];
    f5 += m.shoes.includes(o[shoeKey]) ? 5 : (pSet.has(shoeKey) ? 5 : -1);
    f5 = Math.max(0, Math.min(25, f5));
    total += f5;

    // F6: Adjacent contrast (10pt) — check sequential pairs
    let f6 = 10;
    for (let i = 0; i < n - 1; i++) {
        if (cols[i] === cols[i + 1]) f6 -= Math.ceil(8 / n);
        else if (Math.abs(L(cols[i]) - L(cols[i + 1])) < 5) f6 -= Math.ceil(4 / n);
    }
    total += Math.max(0, f6);

    // F7: Diversity (10pt) — scale to part count
    const uniq = new Set(cols).size;
    const maxPt = uniq === n ? 10 : uniq >= n - 1 ? 7 : uniq >= n - 2 ? 4 : 1;
    total += maxPt;

    return { total: Math.min(95, Math.max(0, total)), f1, f2, f4, f5, f6 };
}

// ===================================================================
// GENERIC STYLE FILTER — any part count
// ===================================================================
function styleFilterGeneric(style, o, layerType, pinnedKeys) {
    const ld = LAYER_DEFS[layerType];
    const pSet = pinnedKeys ? new Set(Object.keys(pinnedKeys)) : new Set();
    const cols = ld.partKeys.filter(k => !pSet.has(k)).map(k => o[k]).filter(Boolean);
    if (cols.length === 0) return true;
    const n = cols.length;
    const ws = cols.map(temp).filter(t => t === 'w').length;
    const cs = cols.map(temp).filter(t => t === 'c').length;
    const avgL = cols.map(L).reduce((a, b) => a + b) / n;
    const chromatics = cols.filter(c => Cv(c) >= 40);
    const highChrom = cols.filter(c => Cv(c) >= 60);
    const pastels = cols.filter(c => c.startsWith('pastel_'));
    const darks = cols.filter(c => L(c) <= 30);
    const lights = cols.filter(c => L(c) >= 80);
    const purples = cols.filter(c => ['eggplant', 'dark_purple', 'plum', 'mauve', 'purple', 'pastel_lavender', 'pastel_lilac'].includes(c));
    const pinks = cols.filter(c => ['pastel_pink', 'pastel_coral', 'pastel_peach', 'pastel_rose', 'dusty_rose', 'rose', 'salmon'].includes(c));
    const deepBlue = cols.filter(c => ['midnight', 'dark_blue', 'cobalt', 'indigo'].includes(c));
    const earthLight = cols.filter(c => ['cream', 'ivory', 'beige', 'camel', 'tan', 'pastel_peach'].includes(c));
    const heavyGreen = cols.filter(c => ['hunter_green', 'forest', 'dark_green', 'dark_olive'].includes(c));

    // Temperature clash — scaled threshold: W2+C2 for <=5 parts, W3+C3 for 6 parts
    const tempThresh = n <= 5 ? 2 : 3;
    if (ws >= tempThresh && cs >= tempThresh) return false;

    // Adjacent same color (check body parts sequentially)
    const bodyKeys = ld.bodyKeys;
    for (let i = 0; i < bodyKeys.length - 1; i++) {
        if (o[bodyKeys[i]] === o[bodyKeys[i + 1]]) return false;
    }

    // Style-specific rules (same as before but with scaled thresholds)
    switch (style) {
        case 'preppy': case 'ralphlook':
            if (pastels.length >= Math.ceil(n * 0.6)) return false;
            if (darks.length >= Math.ceil(n * 0.75) && lights.length === 0) return false;
            if (purples.length >= 2) return false;
            if (pinks.length >= 3) return false;
            break;
        case 'ivy':
            if (pastels.length >= 2) return false;
            if (darks.length >= Math.ceil(n * 0.75) && lights.length === 0) return false;
            if (purples.length >= 2) return false;
            break;
        case 'dandy':
            if (pastels.length >= Math.ceil(n * 0.6)) return false;
            if (highChrom.length >= 2) return false;
            if (darks.length >= Math.ceil(n * 0.75) && lights.length === 0) return false;
            break;
        case 'oldmoney':
            if (pastels.length >= 2) return false;
            if (chromatics.length >= 3) return false;
            if (highChrom.length >= 1) return false;
            var omHues = new Set(cols.filter(c => Cv(c) >= 20).map(c => Math.round(H(c) / 60) % 6));
            if (omHues.size >= 3) return false;
            break;
        case 'minimal':
            if (chromatics.length >= 3) return false;
            var miniHues = new Set(cols.filter(c => Cv(c) >= 25).map(c => Math.round(H(c) / 60) % 6));
            if (miniHues.size >= 3) return false;
            break;
        case 'casual':
            if (highChrom.length >= 3) return false;
            if (darks.length >= Math.ceil(n * 0.75) && lights.length === 0 && avgL < 35) return false;
            break;
        case 'cityboy':
            if (avgL < 50) return false;
            if (darks.length >= Math.ceil(n * 0.6)) return false;
            if (heavyGreen.length >= 2) return false;
            break;
        case 'normcore':
            if (pastels.length >= 2) return false;
            if (chromatics.length >= 2) return false;
            if (highChrom.length >= 1) return false;
            break;
        case 'athleisure':
            if (highChrom.length >= 2) return false;
            if (ws >= Math.ceil(n * 0.6)) return false;
            if (lights.length >= Math.ceil(n * 0.6)) return false;
            if (earthLight.length >= 2) return false;
            break;
        case 'amekaji': case 'workwear':
            if (pastels.length >= 1) return false;
            if (cs >= Math.ceil(n * 0.6)) return false;
            if (deepBlue.length >= 2) return false;
            break;
        case 'military':
            if (pastels.length >= 1) return false;
            if (cs >= Math.ceil(n * 0.6)) return false;
            if (purples.length >= 1) return false;
            if (pinks.length >= 1) return false;
            break;
        case 'british':
            if (pastels.length >= 2) return false;
            if (cs >= Math.ceil(n * 0.6)) return false;
            if (highChrom.length >= 2) return false;
            break;
        case 'gorpcore':
            if (purples.length >= 2) return false;
            if (pinks.length >= 2) return false;
            if (cs >= Math.ceil(n * 0.6)) return false;
            break;
        case 'street':
            if (pastels.length >= Math.ceil(n * 0.6)) return false;
            break;
        case 'grunge':
            if (pastels.length >= 1) return false;
            if (lights.length >= Math.ceil(n * 0.6)) return false;
            if (cs >= Math.ceil(n * 0.6)) return false;
            break;
        case 'contemporary':
            if (highChrom.length >= 2) return false;
            var contHues = new Set(cols.filter(c => Cv(c) >= 30).map(c => Math.round(H(c) / 60) % 6));
            if (contHues.size >= 3) return false;
            break;
        case 'techwear':
            if (highChrom.length >= 2) return false;
            if (chromatics.length >= 3) return false;
            if (ws >= Math.ceil(n * 0.6)) return false;
            if (lights.length >= Math.ceil(n * 0.6)) return false;
            if (earthLight.length >= 2) return false;
            if (avgL > 60) return false;
            break;
        case 'genderless':
            if (highChrom.length >= 2) return false;
            if (darks.length >= Math.ceil(n * 0.75) && lights.length === 0) return false;
            break;
    }
    return true;
}

// ===================================================================
// LAYERED genOne — generate outfit for any layer type
// ===================================================================
function genOneLayered(style, layerType) {
    layerType = layerType || 'basic';
    for (let a = 0; a < 30; a++) {
        // 1) Generate base 4-part outfit
        const tn = pickTech(style);
        const base = TECHNIQUES[tn].compose(style);
        if (!base || !base.outer || !base.top || !base.bottom || !base.shoes) continue;
        if (!COLORS[base.outer] || !COLORS[base.top] || !COLORS[base.bottom] || !COLORS[base.shoes]) continue;

        // 2) Adapt to target layer
        const adapted = adaptToLayer({ ...base, technique: tn }, layerType, style);

        // 3) Validate all colors exist
        const ld = LAYER_DEFS[layerType];
        const allValid = ld.partKeys.every(k => adapted[k] && COLORS[adapted[k]]);
        if (!allValid) continue;

        // 4) Style filter
        if (!styleFilterGeneric(style, adapted, layerType)) continue;

        // 5) Critic score
        const sc = scoreCriticGeneric(adapted, style, layerType);
        if (sc.total >= 50) return { ...adapted, technique: tn, score: sc };
    }
    return null;
}

// ===================================================================
// LAYERED generateOutfits
// ===================================================================
function generateOutfitsLayered(style, count, layerType) {
    layerType = layerType || 'basic';
    const ld = LAYER_DEFS[layerType];
    const outfits = [], seen = new Set(), osCount = {};
    let att = 0; const mx = count * 15;

    while (outfits.length < count && att < mx) {
        att++;
        const o = genOneLayered(style, layerType);
        if (!o) continue;

        // Dedup by full color key
        const key = ld.partKeys.map(k => o[k]).join('/');
        if (seen.has(key)) continue;

        // Cluster limit: outermost+shoes max 4
        const outermost = o[ld.bodyKeys[0]]; // first body part
        const osk = outermost + '_' + o.shoes;
        osCount[osk] = (osCount[osk] || 0) + 1;
        if (osCount[osk] > 4) continue;

        // No 3 identical colors
        const cc = {}; ld.partKeys.forEach(k => { const c = o[k]; cc[c] = (cc[c] || 0) + 1 });
        if (Object.values(cc).some(v => v >= 3)) continue;

        seen.add(key);
        outfits.push(o);
    }
    return outfits.sort((a, b) => b.score.total - a.score.total);
}


export const TECH_TAG_MAP = {
    monochrome: '모노크롬', tone_on_tone: '톤온톤', gradient: '그라데이션',
    tone_in_tone: '톤인톤', one_point: '원포인트', complementary: '보색대비',
    analogous: '유사색', split_complementary: '분할보색', color_blocking: '컬러블로킹',
    light_dark_contrast: '명암대비', neutral_accent: '뉴트럴악센트',
    all_neutral: '올뉴트럴', ratio_211: '2:1:1비율', sandwich: '샌드위치'
};

export const COMBO_NAMES = {
    preppy: ['캠퍼스', '클래식', '서머', '어텀', '뉴잉글랜드', '아이비', '시크', '홀리데이', '보스턴', '모던', '소프트', '볼드', '코지', '프레시', '리치', '스포티', '내추럴', '윈터', '프렙', '엘레강스'],
    ivy: ['클래식', '캠퍼스', '트래드', '브리티시', '어텀', '모던', '시크', '코지', '웜', '내추럴', '쿨', '소프트', '스마트', '빈티지', '프레시', '리치', '볼드', '셋업', '어반', '럭스'],
    dandy: ['클래식', '모던', '셋업', '시크', '소프트', '웜', '쿨', '어텀', '내추럴', '럭스', '빈티지', '스마트', '볼드', '리치', '코지', '프레시', '어반', '폴', '윈터', '나이트'],
    oldmoney: ['클래식', '시크', '럭스', '모던', '캐주얼', '소프트', '웜', '쿨', '내추럴', '코지', '어텀', '스마트', '볼드', '리치', '어반', '폴', '빈티지', '셋업', '윈터', '나이트'],
    ralphlook: ['클래식', '서머', '어텀', '프렙', '캐주얼', '모던', '시크', '스포티', '소프트', '코지', '웜', '쿨', '볼드', '리치', '내추럴', '어반', '빈티지', '프레시', '셋업', '럭스'],
    minimal: ['클래식', '모던', '소프트', '쿨', '웜', '시크', '코지', '어반', '내추럴', '럭스', '빈티지', '스마트', '볼드', '프레시', '어텀', '모노', '셋업', '폴', '윈터', '나이트'],
    casual: ['데일리', '위켄드', '릴렉스', '이지', '컴피', '스마트', '브라이트', '클린', '쿨', '웜', '내추럴', '스프링', '섬머', '어텀', '윈터', '플레이풀', '센스', '톤다운', '모던', '프레시'],
    cityboy: ['시티', '어반', '브릿지', '뉴트럴', '파스텔', '내추럴', '클린', '소프트', '미스트', '페이드', '라이트', '쿨', '스무드', '이지', '프레시', '스타일', '모던', '캐주얼', '데이', '스트릿'],
    normcore: ['노멀', '베이직', '플레인', '이지', '심플', '클린', '무드', '플랫', '스탠다드', '디폴트', '블랭크', '피스', '스틸', '퓨어', '내추럴', '오리진', '뉴트럴', '밸런스', '모노', '클래식'],
    athleisure: ['액티브', '스포티', '러닝', '워크아웃', '릴렉스', '트레이닝', '모던', '클린', '다이나믹', '플렉스', '에너지', '이지', '프리', '그립', '쿨', '트랙', '코지', '리프레시', '플로우', '스타일'],
    amekaji: ['빈티지', '클래식', '데님', '웨스턴', '워크', '러스틱', '오리지널', '올드스쿨', '카우보이', '토미', '레더', '코듀로이', '캠핑', '레트로', '서지', '내추럴', '헤리티지', '인디고', '브라운', '코지'],
    workwear: ['워커', '빌더', '카버올', '유틸리티', '캔버스', '터프', '솔리드', '포지', '그라운드', '헤비', '디깅', '어반', '클래식', '러스틱', '내추럴', '모던', '코지', '웜', '쿨', '리얼'],
    military: ['밀리터리', '커맨더', '패트롤', '카모', '오피서', '유틸리티', '레인저', '스카우트', '포스', '쉴드', '그린', '솔저', '알파', '디펜스', '미션', '택티컬', '서플라이', '코지', '웜', '클래식'],
    british: ['클래식', '트위드', '컨트리', '에든버러', '런던', '칼라일', '체크', '헤리티지', '매너', '우드', '포레스트', '캐슬', '로열', '올리브', '그린', '워싱턴', '코지', '웜', '내추럴', '리치'],
    gorpcore: ['트레일', '서밋', '캠프', '릿지', '발리', '하이킹', '알파인', '아웃도어', '포레스트', '시에라', '스톤', '에코', '내추럴', '프리', '그립', '어반', '모던', '코지', '웜', '액티브'],
    street: ['어반', '블록', '크루', '웨이브', '그래피티', '킥스', '레벨', '스톤', '원', '플로우', '비트', '스타일', '펑크', '보드', '릿', '프레시', '라우드', '스매시', '바이브', '프리'],
    grunge: ['그런지', '니르바나', '앨리스', '시애틀', '블루어', '디스토션', '리프', '앰프', '펑크', '다크', '레벨', '로우', '빈티지', '웨이스트', '모스', '로크', '카우치', '코발트', '섀도우', '러스트'],
    contemporary: ['모던', '어반', '스트럭처', '디컨', '아트', '갤러리', '스페이스', '에지', '볼륨', '라인', '앵글', '폼', '미니멀', '인터', '네오', '아키', '퓨어', '센스', '쿨', '시크'],
    techwear: ['블랙아웃', '사이버', '쉐도우', '네오', '고스트', '스텔스', '다크', '나이트', '코드', '매트릭스', '글리치', '벡터', '오닉스', '볼트', '그래파이트', '카본', '로직', '스펙', '플럭스', '코어'],
    genderless: ['플루이드', '뉴트럴', '프리', '오픈', '블랭크', '소프트', '페이드', '라이트', '퓨어', '에센스', '클린', '이지', '모던', '스무드', '밸런스', '미스트', '실크', '파스텔', '클래식', '엘레강스']
};

export function generateTip(o, style, layerType) {
    const ld = LAYER_DEFS[layerType];
    const pk = ld.partKeys;
    const firstBody = pk[0];
    const firstColor = COLORS_60[o[firstBody]]?.name || o[firstBody];
    const topColor = COLORS_60[o.top]?.name || o.top || '';
    const tn = TECH_TAG_MAP[o.technique] || o.technique;

    const tips = [
        firstColor + '과(와) ' + topColor + '의 ' + tn + ' 조합으로 세련된 룩',
        tn + ' 연출로 완성하는 ' + (STYLE_MOODS[style]?.nameKo || style) + ' 스타일',
        firstColor + ' 위주의 배색으로 분위기 있는 코디 완성',
        topColor + '을(를) 포인트로 활용한 감각적인 스타일링',
        pk.length + '부위 레이어드로 깊이감 있는 ' + tn + ' 코디',
    ];
    return tips[Math.floor(Math.random() * tips.length)];
}

// ===================================================================
// PIN-AWARE GENERATION ENGINE
// ===================================================================

// Get available colors for a specific part+style
export function getAvailableColors(style, partKey) {
    var sm = STYLE_MOODS[style];
    if (!sm) return [];
    if (partKey === 'shoes') return sm.shoes || [];
    var pool = [].concat(sm.darks, sm.mids, sm.lights, sm.pastels, sm.accents);
    // Remove duplicates
    var seen = {};
    return pool.filter(function (c) { if (seen[c]) return false; seen[c] = true; return true; });
}

// Generate one outfit with optional pinned parts
export function genOneLayeredPinned(style, layerType, pinned) {
    layerType = layerType || 'basic';
    pinned = pinned || {};
    var ld = LAYER_DEFS[layerType];
    var pinKeys = Object.keys(pinned);

    for (var a = 0; a < 40; a++) {
        // 1) Generate base 4-part outfit
        var tn = pickTech(style);
        var base = TECHNIQUES[tn].compose(style);
        if (!base || !base.outer || !base.top || !base.bottom || !base.shoes) continue;
        if (!COLORS[base.outer] || !COLORS[base.top] || !COLORS[base.bottom] || !COLORS[base.shoes]) continue;

        // 2) Adapt to target layer
        var adapted = adaptToLayer(Object.assign({}, base, { technique: tn }), layerType, style);

        // 3) Apply pins — overwrite pinned parts
        for (var pk in pinned) {
            adapted[pk] = pinned[pk];
        }

        // 4) Validate all colors exist
        var allValid = true;
        for (var k = 0; k < ld.partKeys.length; k++) {
            if (!adapted[ld.partKeys[k]] || !COLORS[adapted[ld.partKeys[k]]]) { allValid = false; break; }
        }
        if (!allValid) continue;

        // 5) Style filter (relaxed if many pins, ignore pinned colors)
        if (pinKeys.length < ld.partKeys.length - 1) {
            if (!styleFilterGeneric(style, adapted, layerType, pinned)) continue;
        }

        // 6) Critic score
        var sc = scoreCriticGeneric(adapted, style, layerType, pinned);
        if (sc.total >= (pinKeys.length > 0 ? 40 : 50)) {
            return Object.assign({}, adapted, { technique: tn, score: sc });
        }
    }
    return null;
}

// Generate batch with pins
export function generateOutfitsWithPins(style, count, layerType, pinned) {
    layerType = layerType || 'basic';
    pinned = pinned || {};
    var ld = LAYER_DEFS[layerType];
    var outfits = [], seen = new Set(), osCount = {};
    var att = 0, mx = count * 20;
    var pinKeys = Object.keys(pinned);
    var minScore = pinKeys.length > 0 ? 40 : 50;

    while (outfits.length < count && att < mx) {
        att++;
        var o = genOneLayeredPinned(style, layerType, pinned);
        if (!o) continue;

        var key = ld.partKeys.map(function (k) { return o[k]; }).join('/');
        if (seen.has(key)) continue;

        // Cluster limit
        var outermost = o[ld.bodyKeys[0]];
        var osk = outermost + '_' + o.shoes;
        osCount[osk] = (osCount[osk] || 0) + 1;
        if (osCount[osk] > 6) continue;

        // No 3 identical
        var cc = {};
        ld.partKeys.forEach(function (k) { var c = o[k]; cc[c] = (cc[c] || 0) + 1; });
        if (Object.values(cc).some(function (v) { return v >= 3; })) continue;

        seen.add(key);
        outfits.push(o);
    }

    // 핀 사용 시 결과 0이면 스타일 필터 완전 해제로 재시도
    if (outfits.length === 0 && pinKeys.length > 0) {
        att = 0; mx = count * 30;
        while (outfits.length < count && att < mx) {
            att++;
            var o2 = genOneLayeredPinnedRelaxed(style, layerType, pinned);
            if (!o2) continue;
            var key2 = ld.partKeys.map(function (k) { return o2[k]; }).join('/');
            if (seen.has(key2)) continue;
            seen.add(key2);
            outfits.push(o2);
        }
    }

    return outfits.sort(function (a, b) { return b.score.total - a.score.total; });
}

// 스타일 필터 완전 해제 버전
export function genOneLayeredPinnedRelaxed(style, layerType, pinned) {
    var ld = LAYER_DEFS[layerType];
    for (var a = 0; a < 60; a++) {
        var tn = pickTech(style);
        var base = TECHNIQUES[tn].compose(style);
        if (!base || !base.outer || !base.top || !base.bottom || !base.shoes) continue;
        if (!COLORS[base.outer] || !COLORS[base.top] || !COLORS[base.bottom] || !COLORS[base.shoes]) continue;
        var adapted = adaptToLayer(Object.assign({}, base, { technique: tn }), layerType, style);
        for (var pk in pinned) { adapted[pk] = pinned[pk]; }
        var allValid = true;
        for (var k = 0; k < ld.partKeys.length; k++) {
            if (!adapted[ld.partKeys[k]] || !COLORS[adapted[ld.partKeys[k]]]) { allValid = false; break; }
        }
        if (!allValid) continue;
        var sc = scoreCriticGeneric(adapted, style, layerType, pinned);
        if (sc.total >= 20) {
            return Object.assign({}, adapted, { technique: tn, score: sc });
        }
    }
    return null;
}

// Convert raw outfits to combo format
export function outfitsToComboFormat(outfits, style, layerType) {
    var names = COMBO_NAMES[style] || COMBO_NAMES.casual;
    var ld = LAYER_DEFS[layerType];
    return outfits.map(function (o, i) {
        var outfit = {};
        ld.partKeys.forEach(function (k) { outfit[k] = o[k]; });
        // evaluationSystem 점수로 통일 (카드/상세 동일)
        var pc = profile.getPersonalColor();
        var evalResult = evaluationSystem.evaluate(outfit, pc);
        var finalScore = evalResult ? evalResult.total : (o.score ? o.score.total : 0);
        return {
            id: style + '_' + layerType + '_' + String(i + 1).padStart(2, '0'),
            name: (names[i % names.length] || ('스타일 ' + (i + 1))) + ' ' + (STYLE_MOODS[style]?.nameKo || style),
            outfit: outfit,
            tags: [TECH_TAG_MAP[o.technique] || o.technique],
            tip: generateTip(o, style, layerType),
            score: finalScore,
            evalResult: evalResult || null,
        };
    });
}

// Main generation entry point (used by app)
export function getDynamicCombos(style, layerType, count, pinned) {
    count = count || 48;
    pinned = pinned || {};
    var outfits = generateOutfitsWithPins(style, count, layerType, pinned);
    return outfitsToComboFormat(outfits, style, layerType);
}

// Kept for compatibility
export function refreshCombos(style, layerType, count) {
    return getDynamicCombos(style, layerType, count || 48);
}

export const DEPENDENCY_MAP = {
    outer: ['top', 'middleware', 'bottom'],
    middleware: ['top', 'bottom'],
    top: ['bottom'],
    bottom: ['top'],
    scarf: ['top', 'middleware', 'outer'],  // 목도리는 상체만 참조 (bottom 제거)
    hat: ['top', 'outer'],                   // 모자도 상체만 참조 (bottom 제거)
    shoes: ['bottom']
};

// 얼굴 근처 아이템 (퍼스널 컬러 적용 대상)

// ─── 추가 상수 및 헬퍼 (4194~4425) ───


// 얼굴과 먼 아이템 (퍼스널 컬러 미적용, 컬러 조합만)
export const FACE_FAR_ITEMS = ['bottom', 'shoes'];

// 흔히 가지는 색상 가산점
export const COMMON_WARDROBE_COLORS = {
    'black': 20, 'white': 20, 'navy': 18, 'gray': 16,
    'charcoal': 16, 'beige': 16, 'cream': 14, 'ivory': 14,
    'camel': 14, 'brown': 12, 'olive': 12, 'burgundy': 12,
    'khaki': 12, 'lightgray': 12, 'taupe': 10
};

// 순수 무채색 (안전한 선택용)
export const PURE_NEUTRAL_COLORS = ['black', 'white', 'gray', 'charcoal', 'lightgray'];

// 클래식 조합 (패션에서 검증된 조합)
// CLASSIC_COMBOS, AVOID_COMBOS → colors.ts로 이동됨 (evaluation.ts 공용)

// 파스텔, 어스톤, 헬퍼함수는 colors.ts에서 import

export function calculateHarmonyV6(baseKey, targetKey) {
    const base = COLORS_60[baseKey];
    const target = COLORS_60[targetKey];
    if (!base || !target) return { score: 0, reasons: [], penalties: [] };

    const [h1, c1, l1] = base.hcl;
    const [h2, c2, l2] = target.hcl;

    let score = 0;
    let reasons = [];
    let penalties = [];

    const tone1 = getToneGroup(h1, c1, l1);
    const tone2 = getToneGroup(h2, c2, l2);
    const temp1 = getColorTemperature(h1, c1, l1);
    const temp2 = getColorTemperature(h2, c2, l2);
    const hueDiff = getHueDiff(h1, h2);
    const lDiff = Math.abs(l1 - l2);
    const cDiff = Math.abs(c1 - c2);

    const isBase1Neutral = isNeutralColor(c1);
    const isBase2Neutral = isNeutralColor(c2);
    const isPastel1 = PASTEL_COLORS.includes(baseKey);
    const isPastel2 = PASTEL_COLORS.includes(targetKey);
    const isEarth1 = EARTH_TONE_COLORS.includes(baseKey);
    const isEarth2 = EARTH_TONE_COLORS.includes(targetKey);

    // 톤온톤 감지
    const isToneOnTone = !isBase1Neutral && !isBase2Neutral && hueDiff < 30 && lDiff >= 30;
    if (isToneOnTone) { score += 45; reasons.push('톤온톤'); }

    // 클래식 조합 체크
    const classicPartners1 = CLASSIC_COMBOS[baseKey];
    const classicPartners2 = CLASSIC_COMBOS[targetKey];
    const isClassicCombo = (classicPartners1 && classicPartners1.includes(targetKey)) ||
        (classicPartners2 && classicPartners2.includes(baseKey));
    if (isClassicCombo) { score += 55; reasons.push('클래식'); }

    // 피해야 할 조합 체크
    const avoidPartners1 = AVOID_COMBOS[baseKey];
    const avoidPartners2 = AVOID_COMBOS[targetKey];
    const isAvoidCombo = (avoidPartners1 && avoidPartners1.includes(targetKey)) ||
        (avoidPartners2 && avoidPartners2.includes(baseKey));
    if (isAvoidCombo) { score -= 55; penalties.push('피해야함'); }

    // 파스텔 + 파스텔 조화
    if (isPastel1 && isPastel2) { score += 40; reasons.push('파스텔조화'); }

    // 어스톤 + 어스톤 조화
    if (isEarth1 && isEarth2) { score += 35; reasons.push('어스톤조화'); }

    // 감점 시스템
    const skipPenalty = isClassicCombo || isToneOnTone || (isPastel1 && isPastel2) || (isEarth1 && isEarth2);
    if (!skipPenalty) {
        if (!isBase1Neutral && !isBase2Neutral && hueDiff < 15 && lDiff < 25) {
            score -= 45; penalties.push('색상중복');
        }
        if (tone1 === 'bright' && tone2 === 'bright' && hueDiff >= 100 && hueDiff <= 140) {
            score -= 40; penalties.push('보색충돌');
        }
        if (c1 >= 80 && c2 >= 80 && hueDiff > 50 && hueDiff < 100) {
            score -= 25; penalties.push('채도충돌');
        }
    }

    // 가점 시스템
    if (isBase1Neutral || isBase2Neutral) {
        score += 30; reasons.push('뉴트럴');
        if (isBase1Neutral && !isBase2Neutral) { score += 18; reasons.push('포인트'); }
        if (isBase2Neutral && !isBase1Neutral) { score += 15; reasons.push('안정'); }
    }

    if (lDiff >= 50) { score += 28; reasons.push('강한대비'); }
    else if (lDiff >= 35) { score += 20; reasons.push('명도대비'); }
    else if (lDiff >= 20) { score += 12; reasons.push('소프트대비'); }

    if ((tone1 === 'deep' && l2 >= 60) || (tone2 === 'deep' && l1 >= 60)) {
        score += 22; reasons.push('딥라이트');
    }

    if (temp1.temp === 'neutral' || temp2.temp === 'neutral') { score += 10; }
    else if (temp1.temp === temp2.temp) { score += 15; reasons.push('온도조화'); }

    if (!isBase1Neutral && !isBase2Neutral && hueDiff >= 15 && hueDiff <= 60) {
        score += 18; reasons.push('유사색');
    }

    if (!isBase1Neutral && !isBase2Neutral && cDiff < 30) {
        score += 10; reasons.push('채도조화');
    }

    const commonBonus = COMMON_WARDROBE_COLORS[targetKey] || 0;
    score += commonBonus;
    score = Math.max(0, score);

    return { score: Math.round(score), reasons, penalties, tone1, tone2, isToneOnTone };
}

// 색상 추천 계산
export function calculateScarfRecommendations(outerColorKey) {
    const base = COLORS_60[outerColorKey];
    if (!base) return [];

    const recommendations = [];

    Object.entries(COLORS_60).forEach(([targetKey, target]) => {
        if (targetKey === outerColorKey) return;

        const harmony = calculateHarmonyV6(outerColorKey, targetKey);

        if (harmony.score > 0) {
            let category = 'safe';
            if (harmony.reasons.includes('톤온톤') || harmony.reasons.includes('유사색')) {
                category = 'toneontone';
            } else if (harmony.reasons.includes('포인트') || harmony.reasons.includes('클래식')) {
                category = 'point';
            }

            const mainReason = harmony.reasons[0] || '조화로운 매칭';

            recommendations.push({
                colorKey: targetKey,
                score: harmony.score,
                reason: mainReason,
                reasons: harmony.reasons,
                penalties: harmony.penalties,
                category: category
            });
        }
    });

    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.filter(r => r.score >= 75);
}

