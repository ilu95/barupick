// ================================================================
// taste.ts — 컬러 취향 온보딩: 10문항 → 6축 벡터 → 취향 이름 → 30벌 폭포
//
// 유저가 쓰는 모습 자체가 콘텐츠가 되는 기능(대표님 아이디어 2026-09-08).
// 그림 두 장 중 하나를 고르는 질문 열 개로 대비·채도·온도·밝기·격식·모험 여섯
// 축을 잡고, 그 축으로 색 풀을 뽑아 조합 48벌 × 색 배정 6가지를 엔진 v7.1로
// 매긴 뒤 "가장 나다운 10 · 조금 다르게 10 · 과감하게 10"으로 편다.
// 근거: 바루픽_취향_온보딩_기획.md, 목업 flow-v5.
// ================================================================
import i18n from '@/i18n'
import { COLORS_60, getColorName } from './colors'
import { lch } from './engine/v7'
import { scoreTemplate } from './engine'
import { TEMPLATES, partsOf, formality, type Parts, type Template } from './outfits'

export type Axis = 'contrast' | 'chroma' | 'temp' | 'light' | 'formal' | 'novelty'
export type Vec = Record<Axis, number>
export const AXES: Axis[] = ['contrast', 'chroma', 'temp', 'light', 'formal', 'novelty']
export const zeroVec = (): Vec => ({ contrast: 0, chroma: 0, temp: 0, light: 0, formal: 0, novelty: 0 })

export interface Option { l: string; en: string; p: Record<string, string>; k: Record<string, string>; d: number; ax2?: Axis; d2?: number }
export interface Question { t: string; en: string; ax: Axis; a: Option; b: Option }

/** 10문항. p = 판, k = 색 키(팔레트 v2). d 는 주축 이동, ax2/d2 는 부축. */
export const QUESTIONS: Question[] = [
  { t: '오늘의 나는', en: 'Today I feel', ax: 'contrast',
    a: { l: '잔잔하게', en: 'Soft', p: { top: '11_knit_crew', bottom: '03_slacks_straight', shoes: '74_loafer' }, k: { top: 'ivory', bottom: 'beige', shoes: 'beige' }, d: -1 },
    b: { l: '또렷하게', en: 'Crisp', p: { top: '08_shirt_closed', bottom: '03_slacks_straight', shoes: '77_derby' }, k: { top: 'white', bottom: 'black', shoes: 'black' }, d: 1 } },
  { t: '옷장에 더 많은 쪽', en: 'More of my closet is', ax: 'chroma',
    a: { l: '차분한 색', en: 'Calm colors', p: { top: '11_knit_crew', bottom: '03_slacks_straight', shoes: '74_loafer' }, k: { top: 'gray', bottom: 'charcoal', shoes: 'black' }, d: -1 },
    b: { l: '색이 있는 옷', en: 'Colorful pieces', p: { top: '11_knit_crew', bottom: '03_slacks_straight', shoes: '74_loafer' }, k: { top: 'cobalt', bottom: 'charcoal', shoes: 'black' }, d: 1 } },
  { t: '더 끌리는 코트', en: 'The coat I want', ax: 'temp',
    a: { l: '카멜', en: 'Camel', p: { outer: '28_coat_short', top: '11_knit_crew', bottom: '03_slacks_straight', shoes: '75_boots_chelsea' }, k: { outer: 'camel', top: 'ivory', bottom: 'charcoal', shoes: 'brown' }, d: 1 },
    b: { l: '네이비', en: 'Navy', p: { outer: '28_coat_short', top: '11_knit_crew', bottom: '03_slacks_straight', shoes: '75_boots_chelsea' }, k: { outer: 'navy', top: 'lightgray', bottom: 'charcoal', shoes: 'black' }, d: -1 } },
  { t: '주말 아침엔', en: 'On a weekend morning', ax: 'formal',
    a: { l: '단정하게', en: 'Put together', p: { outer: '19_blazer', top: '08_shirt_closed', bottom: '03_slacks_straight', shoes: '74_loafer' }, k: { outer: 'charcoal', top: 'white', bottom: 'charcoal', shoes: 'black' }, d: 1 },
    b: { l: '편하게', en: 'Easy', p: { top: '16_hoodie', bottom: '39_cargo', shoes: '73_sneaker_chunky' }, k: { top: 'gray', bottom: 'olive', shoes: 'white' }, d: -1 } },
  { t: '새 옷을 산다면', en: 'Buying something new', ax: 'novelty',
    a: { l: '늘 입던 색', en: 'A color I always wear', p: { top: '11_knit_crew', bottom: '01_denim_straight', shoes: '71_sneaker_canvas' }, k: { top: 'black', bottom: 'denim', shoes: 'white' }, d: -1 },
    b: { l: '안 입어 본 색', en: "A color I've never tried", p: { top: '11_knit_crew', bottom: '01_denim_straight', shoes: '71_sneaker_canvas' }, k: { top: 'sage', bottom: 'denim', shoes: 'white' }, d: 1 } },
  { t: '더 나 같은 밝기', en: 'The brightness that is me', ax: 'light',
    a: { l: '밝게', en: 'Light', p: { top: '11_knit_crew', bottom: '04_slacks_wide', shoes: '71_sneaker_canvas' }, k: { top: 'cream', bottom: 'white', shoes: 'white' }, d: 1 },
    b: { l: '어둡게', en: 'Dark', p: { top: '11_knit_crew', bottom: '04_slacks_wide', shoes: '75_boots_chelsea' }, k: { top: 'charcoal', bottom: 'black', shoes: 'black' }, d: -1 } },
  { t: '위아래는', en: 'Top and bottom', ax: 'light',
    a: { l: '밝은 위, 어두운 아래', en: 'Light top, dark bottom', p: { top: '11_knit_crew', bottom: '03_slacks_straight', shoes: '74_loafer' }, k: { top: 'ivory', bottom: 'charcoal', shoes: 'black' }, d: .3, ax2: 'contrast', d2: .4 },
    b: { l: '어두운 위, 밝은 아래', en: 'Dark top, light bottom', p: { top: '11_knit_crew', bottom: '03_slacks_straight', shoes: '74_loafer' }, k: { top: 'charcoal', bottom: 'ivory', shoes: 'brown' }, d: -.3, ax2: 'novelty', d2: .4 } },
  { t: '포인트는', en: 'An accent', ax: 'chroma',
    a: { l: '하나쯤', en: 'One is nice', p: { outer: '28_coat_short', top: '11_knit_crew', bottom: '03_slacks_straight', shoes: '75_boots_chelsea', scarf: '54_scarf' }, k: { outer: 'charcoal', top: 'ivory', bottom: 'charcoal', shoes: 'black', scarf: 'burgundy' }, d: .6, ax2: 'novelty', d2: .5 },
    b: { l: '없어도 좋아', en: 'Not needed', p: { outer: '28_coat_short', top: '11_knit_crew', bottom: '03_slacks_straight', shoes: '75_boots_chelsea' }, k: { outer: 'charcoal', top: 'ivory', bottom: 'charcoal', shoes: 'black' }, d: -.6, ax2: 'novelty', d2: -.5 } },
  { t: '이 둘 중엔', en: 'Between these two', ax: 'contrast',
    a: { l: '톤온톤', en: 'Tone on tone', p: { outer: '30_trench', top: '11_knit_crew', bottom: '63_chino', shoes: '74_loafer' }, k: { outer: 'beige', top: 'cream', bottom: 'tan', shoes: 'brown' }, d: -.8, ax2: 'temp', d2: .5 },
    b: { l: '네이비 + 화이트', en: 'Navy + white', p: { outer: '19_blazer', top: '08_shirt_closed', bottom: '04_slacks_wide', shoes: '77_derby' }, k: { outer: 'navy', top: 'white', bottom: 'white', shoes: 'black' }, d: .8, ax2: 'temp', d2: -.5 } },
  { t: '마지막, 더 좋은 쪽', en: 'Last one, which is better', ax: 'temp',
    a: { l: '테라코타 + 크림', en: 'Terracotta + cream', p: { top: '11_knit_crew', bottom: '04_slacks_wide', shoes: '74_loafer' }, k: { top: 'terracotta', bottom: 'cream', shoes: 'brown' }, d: 1, ax2: 'chroma', d2: .5 },
    b: { l: '더스티블루 + 그레이', en: 'Dusty blue + gray', p: { top: '11_knit_crew', bottom: '04_slacks_wide', shoes: '77_derby' }, k: { top: 'dusty_blue', bottom: 'gray', shoes: 'black' }, d: -1, ax2: 'chroma', d2: -.5 } },
]

const clamp1 = (x: number) => Math.max(-1, Math.min(1, x))
const isKo = () => (i18n.language || 'ko').startsWith('ko')

/** 답 하나를 벡터에 더한다. 문항 수로 나눠 -1~1 로 정규화한다. */
export function applyAnswer(v: Vec, q: Question, which: 'a' | 'b'): Vec {
  const o = q[which]; const out = { ...v }
  const n = QUESTIONS.filter(x => x.ax === q.ax || x.a.ax2 === q.ax).length || 1
  out[q.ax] = clamp1(out[q.ax] + o.d / Math.max(1, n * .6))
  if (o.ax2 && o.d2) out[o.ax2] = clamp1(out[o.ax2] + o.d2 / 2)
  return out
}

const AXWORD: Record<Axis, [string, string, string]> = {
  contrast: ['잔잔한 대비', '또렷한 대비', '강한 대비'], chroma: ['뮤트', '중간 채도', '비비드'], temp: ['쿨', '중립 온도', '웜'],
  light: ['어두운 톤', '중간 톤', '밝은 톤'], formal: ['편한 쪽', '반반', '단정한 쪽'], novelty: ['안전하게', '가끔 모험', '과감하게'],
}
const AXWORD_EN: Record<Axis, [string, string, string]> = {
  contrast: ['soft contrast', 'clear contrast', 'strong contrast'], chroma: ['muted', 'mid chroma', 'vivid'], temp: ['cool', 'neutral temp', 'warm'],
  light: ['dark tones', 'mid tones', 'light tones'], formal: ['relaxed', 'half and half', 'polished'], novelty: ['safe', 'a little adventurous', 'bold'],
}
export const axisWords = (v: Vec): string[] => AXES.map(a => { const x = v[a]; return (isKo() ? AXWORD : AXWORD_EN)[a][x < -.33 ? 0 : x > .33 ? 2 : 1] })

const TAGLINES: Record<string, string> = {
  '밝은|미니멀': '밝은 무채색 위에 아무것도 더하지 않을 때 가장 당신답습니다.', '밝은|클래식': '밝은 톤에 정석 조합을 얹는 사람. 크림과 네이비가 잘 맞습니다.', '밝은|캐주얼': '밝고 가볍게, 힘 빼고 입는 쪽. 화이트 스니커가 기본입니다.',
  '비비드|미니멀': '옷은 단정한데 색 하나는 확실히. 포인트 한 곳의 사람입니다.', '비비드|클래식': '클래식한 옷에 선명한 색. 버건디·코발트 같은 깊은 원색이 어울립니다.', '비비드|캐주얼': '색을 즐기는 캐주얼. 같은 계열로 묶으면 더 세련돼집니다.',
  '뮤트|미니멀': '채도를 낮춘 색들로 조용히 완성하는 타입. 그레이지·세이지가 당신 색입니다.', '뮤트|클래식': '가라앉은 색의 정석 조합. 카멜·차콜·올리브의 사람입니다.', '뮤트|캐주얼': '뮤트한 색을 편하게. 데님과 어스 톤이 기본입니다.',
  '딥|미니멀': '어두운 톤을 깔끔하게. 블랙·차콜에 화이트 한 줄이면 충분합니다.', '딥|클래식': '깊은 색의 격식. 네이비·와인·차콜이 잘 맞습니다.', '딥|캐주얼': '어두운 톤을 편하게 입는 쪽. 블랙 후드에 카고, 신발만 밝게.',
}
const EN = { cw: { '잔잔한': 'Soft', '또렷한': 'Crisp', '강한': 'Bold' }, tone: { '비비드': 'Vivid', '밝은': 'Light', '딥': 'Deep', '뮤트': 'Muted' }, mood: { '클래식': 'Classic', '미니멀': 'Minimal', '캐주얼': 'Casual' } } as const

export interface TasteName { name: string; cw: string; tone: string; mood: string; tag: string }
/** 3 × 4 × 3 = 36 이름 */
export function tasteName(v: Vec): TasteName {
  const cw = v.contrast < -.33 ? '잔잔한' : v.contrast > .33 ? '강한' : '또렷한'
  const tone = v.chroma > .2 ? '비비드' : v.light > .2 ? '밝은' : v.light < -.2 ? '딥' : '뮤트'
  const mood = v.formal > 0 ? (v.novelty > 0 ? '클래식' : '미니멀') : '캐주얼'
  const ko = `${cw} ${tone} ${mood}`
  const en = `${EN.cw[cw as keyof typeof EN.cw]} ${EN.tone[tone as keyof typeof EN.tone]} ${EN.mood[mood as keyof typeof EN.mood]}`
  const tag = isKo() ? (TAGLINES[tone + '|' + mood] || '') : `${EN.tone[tone as keyof typeof EN.tone]} tones, ${EN.mood[mood as keyof typeof EN.mood].toLowerCase()} pieces, ${AXWORD_EN.contrast[v.contrast < -.33 ? 0 : v.contrast > .33 ? 2 : 1]}.`
  return { name: isKo() ? ko : en, cw, tone, mood, tag }
}

/** 취향 색 풀: 148색을 여섯 축으로 점수 */
export function tastePool(v: Vec) {
  const Ct = 30 + 35 * v.chroma, Lt = 55 + 28 * v.light
  const rows = Object.keys(COLORS_60).map(k => {
    const c = lch(COLORS_60[k].hex) as { L: number; C: number; h: number }
    const warm = (c.h < 105 || c.h > 320) ? 1 : -1
    let s = -Math.abs(c.C - Ct) / 35 - Math.abs(c.L - Lt) / 40 + .45 * v.temp * warm * Math.min(1, c.C / 30)
    if (c.C > 75 && v.chroma < .6) s -= 1
    return { k, c, s }
  })
  const neutrals = rows.filter(r => r.c.C <= 14).sort((a, b) => Math.abs(a.c.L - Lt) - Math.abs(b.c.L - Lt)).map(r => r.k)
  const chrom = rows.filter(r => r.c.C > 14).sort((a, b) => b.s - a.s).slice(0, 20).map(r => r.k)
  const soft = rows.filter(r => r.c.C > 14 && r.c.C <= 32).sort((a, b) => b.s - a.s).slice(0, 10).map(r => r.k)
  const main = rows.filter(r => r.c.C > 14 && r.c.C <= 40 && Math.abs(r.c.L - Lt) < 22).sort((a, b) => b.s - a.s).slice(0, 10).map(r => r.k)
  return { neutrals: neutrals.slice(0, 10), chrom, soft, main: main.length ? main : soft }
}

/** 이 코디가 취향 벡터와 얼마나 맞나 (0~1). 엔진 결과의 P(면적·LCh)를 읽는다 */
function tasteAlign(ev: any, v: Vec): number {
  const P: any[] = ev.P || []
  const A = P.reduce((s, p) => s + p.area, 0) || 1
  const L = P.reduce((s, p) => s + p.L * p.area, 0) / A, Cc = P.reduce((s, p) => s + p.C * p.area, 0) / A
  const chromA = P.filter(p => p.C > 14)
  const warm = chromA.length ? chromA.reduce((s, p) => s + ((p.h < 105 || p.h > 320) ? 1 : -1) * p.area, 0) / chromA.reduce((s, p) => s + p.area, 0) : 0
  const up = P.find(p => p.slot === 'outer') || P.find(p => p.slot === 'top'), bo = P.find(p => p.slot === 'bottom')
  const dL = up && bo ? Math.abs(up.L - bo.L) : 30
  const diffs = [Math.abs(clamp1((L - 52) / 35) - v.light), Math.abs(clamp1((Cc - 28) / 28) - v.chroma), Math.abs(clamp1(warm) - v.temp) * .7, Math.abs(clamp1((dL - 35) / 35) - v.contrast)]
  return 1 - diffs.reduce((a, b) => a + b, 0) / diffs.length / 2
}

export interface FallCard { id: string; c: Template; p: Parts; key: Record<string, string>; total: number; align: number; bold: boolean; why: string; score: number }
export interface Fall { first: FallCard[]; second: FallCard[]; third: FallCard[]; pal: string[] }

/** 30벌 폭포: 48벌 × 색 배정 6 → 엔진 65점 이상 → 0.6 점수 + 0.4 취향 일치 + 0.1 격식 일치 */
export function buildFall(v: Vec, sex: 'm' | 'w'): Fall {
  const pool = tastePool(v)
  const N = pool.neutrals, P = pool.chrom, S = pool.soft, M = pool.main
  const cands: (FallCard & { sig: string; tid: string })[] = []
  TEMPLATES.forEach((c, i) => {
    const p = partsOf(c, sex)
    const f = formality(p)
    const fw = 1 - Math.abs((f - 1) / 4 * 2 - 1 - v.formal) / 2
    for (let k = 0; k < 6; k++) {
      const key: Record<string, string> = {}
      const pickN = (j: number) => N[(i + j + k * 3) % N.length], pickP = (j: number) => P[(i * 2 + j + k * 5) % P.length], pickS = (j: number) => S[(i + j + k * 2) % S.length], pickM = (j: number) => M[(i + j + k * 2) % M.length]
      if (k === 0) { if (p.outer) key.outer = pickN(0); key.top = pickN(2); key.bottom = pickN(4); key.shoes = pickN(1) }               // 올뉴트럴
      else if (k === 1) { if (p.outer) key.outer = pickM(0); key.top = pickN(1); key.bottom = pickN(3); key.shoes = pickN(5) }          // 연유채 주색
      else if (k === 2) { if (p.outer) key.outer = pickN(0); key.top = pickP(0); key.bottom = pickN(2); key.shoes = pickN(4) }          // 상의 포인트
      else if (k === 3) { if (p.outer) key.outer = pickP(1); key.top = pickN(6); key.bottom = pickN(3); key.shoes = pickN(1) }          // 아우터 색
      else if (k === 4) { if (p.outer) key.outer = pickN(1); key.top = pickN(5); key.bottom = pickM(2); key.shoes = pickN(0) }          // 하의 연유채
      else { if (p.outer) key.outer = pickM(3); key.top = pickP(2); key.bottom = pickN(7); key.shoes = pickN(2) }                        // 두 색
      if (p.layer) key.layer = key.outer ? pickN(3) : pickS(1)
      if (!p.top) delete key.top
      const ev = scoreTemplate(p as Record<string, string>, key)
      if (!ev || ev.total < 65) continue
      const align = tasteAlign(ev, v); const bold = k >= 2
      const why = (ev.reasons.find((r: any) => r.w > 0) || {}).txt || ''
      cands.push({ id: `t${c.id}k${k}`, c, p, key, total: ev.total, align, bold, why, score: .6 * ev.total / 100 + .4 * align + .1 * fw, sig: JSON.stringify(key), tid: c.id })
    }
  })
  cands.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  const out: typeof cands = []; const perT: Record<string, number> = {}; const sigs = new Set<string>()
  for (const x of cands) { if ((perT[x.tid] || 0) >= 2 || sigs.has(x.sig)) continue; perT[x.tid] = (perT[x.tid] || 0) + 1; sigs.add(x.sig); out.push(x); if (out.length >= 30) break }
  const first = out.slice(0, 10), rest = out.slice(10)
  rest.sort((a, b) => (Number(b.bold) - Number(a.bold)) || (b.score - a.score))
  const mid = rest.filter(x => !x.bold).slice(0, 10), boldL = rest.filter(x => x.bold)
  const second = [...mid, ...boldL.slice(0, Math.max(0, 10 - mid.length))]
  const third = rest.filter(x => !second.includes(x)).slice(0, 10)
  const pal = [...new Set([...pool.neutrals.slice(0, 2), ...pool.soft.slice(0, 3), ...pool.chrom.slice(0, 4)])].slice(0, 6)
  return { first, second, third, pal }
}

export const colorNames = (key: Record<string, string>, n = 3) => ['outer', 'layer', 'top', 'bottom'].filter(s => key[s]).map(s => getColorName(key[s])).slice(0, n).join(' · ')

/* ── 저장 (기기 안). 엔진 ctx 의 contrast 와 1단계 이름표가 읽는다 ── */
export interface SavedTaste { v: Vec; name: string; cw: string; tone: string; mood: string; tag: string; pal: string[]; at: number }
const KEY = 'sp_taste'
export function loadTaste(): SavedTaste | null { try { const t = JSON.parse(localStorage.getItem(KEY) || 'null'); return t && t.v ? t : null } catch { return null } }
export function saveTaste(t: SavedTaste) { try { localStorage.setItem(KEY, JSON.stringify(t)) } catch {} }
export function clearTaste() { try { localStorage.removeItem(KEY) } catch {} }
/** 엔진 v7.1 의 개인 대비 수준 */
export function tasteContrast(): 'high' | 'mid' | 'low' | undefined { const t = loadTaste(); if (!t) return undefined; return t.v.contrast > .33 ? 'high' : t.v.contrast < -.33 ? 'low' : 'mid' }
