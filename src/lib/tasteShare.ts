// ================================================================
// tasteShare.ts — 취향 친구 비교 (루프 L2)
//
// 취향 결과를 링크(/t/<code>)로 보낸다. 받은 친구가 30초 테스트를 마치면 둘의 관계를
// 본다: 겹치는 옷장 N벌 · 취향 일치 % · 서로의 팔레트 · 둘 다 좋아할 코디 3벌.
// "너는 뭐야?"라는 비교가 대화가 되는 자리(정체성 라벨이 퍼지는 이유).
// 테이블: scripts/09_taste_shares.sql. 미리보기 이미지는 vote-cards 버킷을 같이 쓴다.
// ================================================================
import i18n from '@/i18n'
import { supabase } from './supabase'
import { COLORS_60, getColorName } from './colors'
import { DEFAULT_HAIR, DEFAULT_HAIR_COLOR, type CharScene } from './char/map'
import { scoreTemplate } from './engine'
import { buildFall, tasteAlign, AXES, type Vec, type SavedTaste, type FallCard } from './taste'
import { newCode, uploadCard, voterKey } from './votes'

export interface Look { p: Record<string, string>; key: Record<string, string>; total?: number }
export interface TasteProfile { v: Vec; name: string; cw: string; tone: string; mood: string; tag: string; pal: string[]; sex: 'm' | 'w'; look: Look | null }
export interface TasteShare { id: string; code: string; owner_id: string | null; name: string; taste: TasteProfile; og_url?: string | null; created_at: string }
export interface TasteCompareRow { id: number; share_id: string; voter: string; name: string; taste: TasteProfile; sim: number | null; overlap: number | null; created_at: string }

const ORDER = ['outer', 'layer', 'top', 'inner', 'bottom', 'shoes', 'scarf']
const isKo = () => (i18n.language || 'ko').startsWith('ko')

/** 판 + 색 키 → 장면 (취향 카드·비교 화면·OG 가 같이 쓴다) */
export function sceneFromLook(look: Look | null, sex: 'm' | 'w'): CharScene {
  const items = look ? ORDER.filter(s => look.p[s]).map(s => ({ id: look.p[s], color: COLORS_60[look.key[s] || 'white']?.hex || '#FFFFFF' })) : []
  return { items, body: { sex, hair: DEFAULT_HAIR[sex], hairColor: DEFAULT_HAIR_COLOR } }
}
export const lookOf = (x: FallCard | null | undefined): Look | null => x ? { p: x.p as Record<string, string>, key: x.key, total: x.total } : null
export const profileOf = (t: SavedTaste, sex: 'm' | 'w', look: Look | null): TasteProfile => ({ v: t.v, name: t.name, cw: t.cw, tone: t.tone, mood: t.mood, tag: t.tag, pal: t.pal, sex, look })

/* ── 내 링크 (기기 안) ── */
const MY_KEY = 'sp_taste_share'
export function myTasteShare(): { code: string; at: number; name: string } | null { try { return JSON.parse(localStorage.getItem(MY_KEY) || 'null') } catch { return null } }
export const isMyShare = (code: string) => myTasteShare()?.code === code
export const tasteUrl = (code: string) => `${typeof location !== 'undefined' ? location.origin : 'https://barupick.vercel.app'}/t/${code}`

export async function createTasteShare(input: { profile: TasteProfile; name: string; ownerId?: string | null; ogDataUrl?: string | null }): Promise<TasteShare> {
  let lastErr: any = null
  for (let i = 0; i < 3; i++) {
    const code = 'T' + newCode(7)
    const og_url = input.ogDataUrl ? await uploadCard(code, input.ogDataUrl) : null
    const { data, error } = await supabase.from('taste_shares')
      .insert({ code, owner_id: input.ownerId || null, name: input.name, taste: input.profile, og_url })
      .select('*').single()
    if (!error && data) { try { localStorage.setItem(MY_KEY, JSON.stringify({ code, at: Date.now(), name: input.name })) } catch {} return data as TasteShare }
    lastErr = error
    if (error && error.code !== '23505') break
  }
  throw lastErr || new Error('taste share failed')
}
export async function fetchTasteShare(code: string): Promise<TasteShare | null> {
  const { data, error } = await supabase.from('taste_shares').select('*').eq('code', code).maybeSingle()
  if (error) throw error
  return (data as TasteShare) || null
}
/** 받은 친구의 비교 결과를 남긴다 (한 기기 한 번). 보낸 사람이 자기 링크에서 본다 */
export async function recordCompare(share: TasteShare, mine: TasteProfile, name: string, sim: number, overlap: number): Promise<void> {
  const { error } = await supabase.from('taste_compares').insert({ share_id: share.id, voter: voterKey(), name, taste: mine, sim, overlap })
  if (error && error.code !== '23505') throw error
}
export async function fetchCompares(shareId: string): Promise<TasteCompareRow[]> {
  const { data, error } = await supabase.from('taste_compares').select('*').eq('share_id', shareId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as TasteCompareRow[]
}

/* ── 비교 ── */
export interface SharedCard { card: FallCard; alignA: number; alignB: number }
export interface Compare { sim: number; sharedPal: string[]; sentence: string; shared: SharedCard[]; overlap: number; axis: { ax: string; a: string; b: string } | null }

const batchim = (s: string) => { const ch = s.charCodeAt(s.length - 1); return ch >= 0xAC00 && ch <= 0xD7A3 && (ch - 0xAC00) % 28 !== 0 }
export const eun = (s: string) => batchim(s) ? '은' : '는'
export const gwa = (s: string) => batchim(s) ? '과' : '와'
const AXW: Record<string, [string, string]> = { light: ['어두운 톤', '밝은 톤'], contrast: ['잔잔한 대비', '또렷한 대비'], chroma: ['차분한 색', '색이 있는 옷'], temp: ['쿨한 색', '따뜻한 색'], formal: ['편한 옷', '단정한 옷'], novelty: ['늘 입던 색', '새로운 색'] }
const AXW_EN: Record<string, [string, string]> = { light: ['darker tones', 'lighter tones'], contrast: ['soft contrast', 'crisp contrast'], chroma: ['calm colors', 'colorful pieces'], temp: ['cool colors', 'warm colors'], formal: ['relaxed pieces', 'polished pieces'], novelty: ['familiar colors', 'new colors'] }

/** 두 취향의 관계. sex 는 "둘 다 좋아할 코디"를 그릴 몸(보는 사람 기준) */
export function compareTastes(a: TasteProfile, aName: string, b: TasteProfile, bName: string, sex: 'm' | 'w'): Compare {
  const diffs = AXES.map(ax => Math.abs((a.v[ax] || 0) - (b.v[ax] || 0)))
  const sim = Math.round(100 * (1 - diffs.reduce((x, y) => x + y, 0) / AXES.length / 2))
  const sharedPal = a.pal.filter(k => b.pal.includes(k))
  // 가장 벌어진 축
  let axi = 0; diffs.forEach((d, i) => { if (d > diffs[axi]) axi = i })
  const ax = AXES[axi]
  const axis = diffs[axi] >= .4 ? { ax, a: (isKo() ? AXW : AXW_EN)[ax][a.v[ax] > b.v[ax] ? 1 : 0], b: (isKo() ? AXW : AXW_EN)[ax][a.v[ax] > b.v[ax] ? 0 : 1] } : null
  const names = sharedPal.slice(0, 2).map(getColorName)
  let sentence = ''
  if (isKo()) {
    sentence = names.length >= 2 ? `${names[0]}${gwa(names[0])} ${names[1]}${eun(names[1])} 둘 다 자주 써요.` : names.length === 1 ? `${names[0]}${eun(names[0])} 둘 다 자주 써요.` : '자주 쓰는 색은 서로 달라요.'
    sentence += ' ' + (axis ? `${aName}${eun(aName)} ${axis.a}, ${bName}${eun(bName)} ${axis.b} 쪽이에요.` : '고르는 방식은 거의 같아요.')
  } else {
    sentence = names.length >= 2 ? `You both wear ${names[0]} and ${names[1]} a lot.` : names.length === 1 ? `You both wear ${names[0]} a lot.` : 'Your go-to colors differ.'
    sentence += ' ' + (axis ? `${aName} leans ${axis.a}, ${bName} leans ${axis.b}.` : 'You pick almost the same way.')
  }
  // 둘 다 좋아할 코디: 두 사람의 30벌을 합쳐 두 취향 모두에 맞는 것
  const union = new Map<string, FallCard>()
  for (const f of [buildFall(a.v, sex), buildFall(b.v, sex)]) for (const x of [...f.first, ...f.second, ...f.third]) union.set(x.id, x)
  const scored: SharedCard[] = []
  for (const card of union.values()) {
    const ev = scoreTemplate(card.p as Record<string, string>, card.key)
    if (!ev) continue
    scored.push({ card, alignA: tasteAlign(ev, a.v), alignB: tasteAlign(ev, b.v) })
  }
  // 겹치는 옷장 = 두 취향 모두에 맞는 것의 수. 보여 주는 3벌은 겹침이 없어도 가장 가까운 것
  const overlap = scored.filter(x => x.alignA >= .62 && x.alignB >= .62).length
  scored.sort((x, y) => Math.min(y.alignA, y.alignB) + y.card.total / 400 - (Math.min(x.alignA, x.alignB) + x.card.total / 400))
  const seenT = new Set<string>(); const shared: SharedCard[] = []
  for (const x of scored) { if (seenT.has(x.card.c.id)) continue; seenT.add(x.card.c.id); shared.push(x); if (shared.length >= 3) break }
  return { sim, sharedPal, sentence, shared, overlap, axis }
}
