// ================================================================
// votes.ts — "이 코디 어때?" 웹 투표 (루프 L3)
//
// 만든 사람: 결과 화면 → 후보 화면에서 2~4벌을 직접 골라(A·B·C·D) 투표를 만들고
// 링크를 보낸다. 받는 사람: 앱 없이 /v/<code> 에서 한 번 누른다.
// 표는 기기 키로 한 번만. 결과는 공개(만든 사람이 알림 없이도 볼 수 있게).
// 테이블: scripts/06_coord_votes.sql · 07_vote_og.sql · 08_vote_multi.sql(sides 열)
// sides 가 있으면 그것이 후보 목록이고, a·b 는 옛 앱·미리보기 호환용 복사본이다.
// ================================================================
import { supabase } from './supabase'
import { trackEvent } from './analytics'
import type { CharScene } from './char/map'

export interface VoteSide { scene: CharScene; colors: { key: string; hex: string; name: string }[]; score: number; label?: string }
export interface Vote { id: string; code: string; owner_id: string | null; question: string; a: VoteSide; b: VoteSide | null; sides?: VoteSide[] | null; situ: string | null; temp: number | null; created_at: string; og_url?: string | null }
export type SideKey = 'a' | 'b' | 'c' | 'd'
export const SIDE_KEYS: SideKey[] = ['a', 'b', 'c', 'd']
export type Choice = SideKey | 'up' | 'down'
export interface VoteCounts { a: number; b: number; c: number; d: number; up: number; down: number; total: number }

/** 후보 목록: sides(2~4벌) → 없으면 a·b */
export const sidesOf = (v: Vote): VoteSide[] => (v.sides && v.sides.length >= 2) ? v.sides.slice(0, 4) : ([v.a, v.b].filter(Boolean) as VoteSide[])

const MY_KEY = 'sp_my_votes', VOTER_KEY = 'sp_voter_key'
const ALPH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'   // 헷갈리는 글자(I/O/0/1) 제외

export function newCode(n = 6): string {
  const buf = new Uint8Array(n); crypto.getRandomValues(buf)
  return Array.from(buf, b => ALPH[b % ALPH.length]).join('')
}
export function voterKey(): string {
  try {
    let k = localStorage.getItem(VOTER_KEY)
    if (!k) { k = newCode(12); localStorage.setItem(VOTER_KEY, k) }
    return k
  } catch { return 'anon' }
}
export function myVotes(): { code: string; at: number; question: string }[] {
  try { return JSON.parse(localStorage.getItem(MY_KEY) || '[]') } catch { return [] }
}
function rememberMine(code: string, question: string) {
  try { const list = myVotes().filter(v => v.code !== code); list.unshift({ code, at: Date.now(), question }); localStorage.setItem(MY_KEY, JSON.stringify(list.slice(0, 20))) } catch {}
}
export const isMine = (code: string) => myVotes().some(v => v.code === code)
export const votedChoice = (code: string): Choice | null => { try { return (localStorage.getItem('sp_voted_' + code) as Choice) || null } catch { return null } }

/** 카톡 미리보기 이미지를 Storage 에 올린다. 실패해도 투표는 만든다 (기본 아이콘으로 보임). */
export async function uploadCard(code: string, dataUrl: string): Promise<string | null> {
  const path = `${code}.png`
  let lastMsg = ''
  for (let i = 0; i < 2; i++) {   // 한 번은 다시 시도 (모바일 네트워크 흔들림)
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const { error } = await supabase.storage.from('vote-cards').upload(path, blob, { contentType: blob.type || 'image/png', upsert: true })   // 이름은 정책상 .png, 내용은 JPEG 여도 미리보기는 content-type 을 본다
      if (!error) return supabase.storage.from('vote-cards').getPublicUrl(path).data.publicUrl
      lastMsg = error.message || String(error)
    } catch (e: any) { lastMsg = e?.message || String(e) }
  }
  // 왜 미리보기 카드가 안 붙었는지 남긴다 (analytics_events 에서 vote_og_fail 로 조회)
  trackEvent('vote_og_fail', { code, msg: lastMsg.slice(0, 200) })
  if (import.meta.env.DEV) console.warn('[vote] og upload failed:', lastMsg)
  return null
}

/** sides: 1벌이면 👍/👎, 2~4벌이면 하나 고르기 */
export async function createVote(input: { sides: VoteSide[]; question: string; situ?: string | null; temp?: number | null; ownerId?: string | null; ogDataUrl?: string | null }): Promise<Vote> {
  const sides = input.sides.slice(0, 4)
  if (!sides.length) throw new Error('no sides')
  let lastErr: any = null
  for (let i = 0; i < 3; i++) {   // 코드 충돌이면 다시
    const code = newCode()
    const og_url = input.ogDataUrl ? await uploadCard(code, input.ogDataUrl) : null
    const { data, error } = await supabase.from('coord_votes')
      .insert({ code, owner_id: input.ownerId || null, question: input.question, a: sides[0], b: sides[1] || null, sides: sides.length >= 2 ? sides : null, situ: input.situ || null, temp: input.temp ?? null, og_url })
      .select('*').single()
    if (!error && data) { rememberMine(code, input.question); return data as Vote }
    lastErr = error
    if (error && error.code !== '23505') break
  }
  throw lastErr || new Error('vote create failed')
}

export async function fetchVote(code: string): Promise<Vote | null> {
  const { data, error } = await supabase.from('coord_votes').select('*').eq('code', code).maybeSingle()
  if (error) throw error
  return (data as Vote) || null
}

export async function fetchCounts(voteId: string): Promise<VoteCounts> {
  const { data, error } = await supabase.from('coord_vote_answers').select('choice').eq('vote_id', voteId)
  if (error) throw error
  const c: VoteCounts = { a: 0, b: 0, c: 0, d: 0, up: 0, down: 0, total: 0 }
  for (const r of (data || []) as { choice: Choice }[]) { if (r.choice in c) { c[r.choice]++; c.total++ } }
  return c
}

/** 한 기기 한 표. 이미 넣었으면(UNIQUE 위반) 그대로 넘어간다. */
export async function answerVote(vote: Vote, choice: Choice): Promise<void> {
  const { error } = await supabase.from('coord_vote_answers').insert({ vote_id: vote.id, choice, voter: voterKey() })
  if (error && error.code !== '23505') throw error
  try { localStorage.setItem('sp_voted_' + vote.code, choice) } catch {}
}

export const voteUrl = (code: string) => `${typeof location !== 'undefined' ? location.origin : 'https://barupick.vercel.app'}/v/${code}`
