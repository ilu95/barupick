// ================================================================
// votes.ts — "이 코디 어때?" 웹 투표 (루프 L3)
//
// 만든 사람: 결과 화면에서 코디 두 벌(A = 지금, B = 한 수 바꾼 버전)로 투표를
// 만들고 링크를 보낸다. 받는 사람: 앱 없이 /v/<code> 에서 한 번 누른다.
// 표는 기기 키로 한 번만. 결과는 공개(만든 사람이 알림 없이도 볼 수 있게).
// 테이블: scripts/06_coord_votes.sql
// ================================================================
import { supabase } from './supabase'
import { trackEvent } from './analytics'
import type { CharScene } from './char/map'

export interface VoteSide { scene: CharScene; colors: { key: string; hex: string; name: string }[]; score: number; label?: string }
export interface Vote { id: string; code: string; owner_id: string | null; question: string; a: VoteSide; b: VoteSide | null; situ: string | null; temp: number | null; created_at: string; og_url?: string | null }
export interface VoteCounts { a: number; b: number; up: number; down: number; total: number }
export type Choice = 'a' | 'b' | 'up' | 'down'

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
async function uploadOg(code: string, dataUrl: string): Promise<string | null> {
  const path = `${code}.png`
  let lastMsg = ''
  for (let i = 0; i < 2; i++) {   // 한 번은 다시 시도 (모바일 네트워크 흔들림)
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const { error } = await supabase.storage.from('vote-cards').upload(path, blob, { contentType: 'image/png', upsert: true })
      if (!error) return supabase.storage.from('vote-cards').getPublicUrl(path).data.publicUrl
      lastMsg = error.message || String(error)
    } catch (e: any) { lastMsg = e?.message || String(e) }
  }
  // 왜 미리보기 카드가 안 붙었는지 남긴다 (analytics_events 에서 vote_og_fail 로 조회)
  trackEvent('vote_og_fail', { code, msg: lastMsg.slice(0, 200) })
  if (import.meta.env.DEV) console.warn('[vote] og upload failed:', lastMsg)
  return null
}

export async function createVote(input: { a: VoteSide; b: VoteSide | null; question: string; situ?: string | null; temp?: number | null; ownerId?: string | null; ogDataUrl?: string | null }): Promise<Vote> {
  let lastErr: any = null
  for (let i = 0; i < 3; i++) {   // 코드 충돌이면 다시
    const code = newCode()
    const og_url = input.ogDataUrl ? await uploadOg(code, input.ogDataUrl) : null
    const { data, error } = await supabase.from('coord_votes')
      .insert({ code, owner_id: input.ownerId || null, question: input.question, a: input.a, b: input.b, situ: input.situ || null, temp: input.temp ?? null, og_url })
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
  const c: VoteCounts = { a: 0, b: 0, up: 0, down: 0, total: 0 }
  for (const r of (data || []) as { choice: Choice }[]) { c[r.choice]++; c.total++ }
  return c
}

/** 한 기기 한 표. 이미 넣었으면(UNIQUE 위반) 그대로 넘어간다. */
export async function answerVote(vote: Vote, choice: Choice): Promise<void> {
  const { error } = await supabase.from('coord_vote_answers').insert({ vote_id: vote.id, choice, voter: voterKey() })
  if (error && error.code !== '23505') throw error
  try { localStorage.setItem('sp_voted_' + vote.code, choice) } catch {}
}

export const voteUrl = (code: string) => `${typeof location !== 'undefined' ? location.origin : 'https://barupick.vercel.app'}/v/${code}`
