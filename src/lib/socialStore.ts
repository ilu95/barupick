// ═══════════════════════════════════════════════════════
// socialStore.ts — 좋아요·팔로우·맞팔의 단일 저장소 (서버가 진실)
//
// 전에는 목록(useCommunity)과 상세(CommunityDetail)가 각자 좋아요 상태를 들고 수동으로 맞췄고,
// 팔로우는 localStorage(sp_follows/sp_friends)가 진실이라 기기마다 달랐다.
// 이제:
// - 내 좋아요/팔로우/팔로워는 서버에서 읽어 모듈 저장소에 두고, 모든 화면이 여기를 구독한다
// - 토글은 낙관적으로 반영하되 실패하면 되돌리고 호출자에게 {ok:false, error}를 돌려준다 (조용한 롤백 금지)
// - 맞팔 = 내가 팔로우 ∧ 상대가 나를 팔로우 (서버 기준, 재개 시 갱신)
// - 좋아요 수 변화는 window 'bp:like' 이벤트로 알려 목록/상세가 같이 움직인다
// ═══════════════════════════════════════════════════════
import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase'
import i18n from '@/i18n'
import { onAppResume } from '@/lib/appLifecycle'

export const LIKE_EVENT = 'bp:like'
export interface LikeEventDetail { postId: string; liked: boolean; delta: number }

interface State {
  userId: string | null
  ready: boolean               // 팔로우/팔로워 로드 완료
  likes: Set<string>           // 내가 좋아요한 postId
  likesKnown: Set<string>      // 서버에 물어본 postId (없음도 포함)
  follows: Set<string>         // 내가 팔로우하는 userId
  followers: Set<string>       // 나를 팔로우하는 userId
}

let st: State = { userId: null, ready: false, likes: new Set(), likesKnown: new Set(), follows: new Set(), followers: new Set() }
const listeners = new Set<() => void>()
function emit(next: Partial<State>) { st = { ...st, ...next }; listeners.forEach(l => l()) }
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
function snapshot() { return st }

export type ActionResult = { ok: true } | { ok: false; error: 'login' | 'network'; message: string }

// ── 사용자 바인딩 ──
let loadSeq = 0
export async function bindSocialUser(userId: string | null) {
  if (userId === st.userId && (st.ready || !userId)) return
  const seq = ++loadSeq
  emit({ userId, ready: false, likes: new Set(), likesKnown: new Set(), follows: new Set(), followers: new Set() })
  if (!userId) { emit({ ready: true }); return }
  await refreshFollows(seq)
}

export async function refreshFollows(seq = loadSeq) {
  const uid = st.userId
  if (!uid) return
  try {
    const [f1, f2] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', uid),
      supabase.from('follows').select('follower_id').eq('following_id', uid),
    ])
    if (seq !== loadSeq || st.userId !== uid) return
    if (f1.error) throw f1.error
    if (f2.error) throw f2.error
    emit({
      follows: new Set((f1.data || []).map(r => r.following_id as string)),
      followers: new Set((f2.data || []).map(r => r.follower_id as string)),
      ready: true,
    })
  } catch (e) {
    console.warn('[social] follows load failed:', e)
    if (seq === loadSeq) emit({ ready: true })
  }
}

let resumeHooked = false
function hookResume() {
  if (resumeHooked) return
  resumeHooked = true
  onAppResume(() => { if (st.userId) refreshFollows() })
}

// ── 좋아요 ──
/** 아직 모르는 postId 들의 좋아요 여부를 서버에서 한 번에 가져온다 */
export async function ensureLikes(postIds: string[]) {
  const uid = st.userId
  if (!uid) return
  const unknown = postIds.filter(id => !st.likesKnown.has(id))
  if (unknown.length === 0) return
  try {
    const { data, error } = await supabase.from('likes').select('post_id').eq('user_id', uid).in('post_id', unknown)
    if (error) throw error
    if (st.userId !== uid) return
    const likes = new Set(st.likes); const known = new Set(st.likesKnown)
    unknown.forEach(id => known.add(id))
    ;(data || []).forEach(r => likes.add(r.post_id as string))
    emit({ likes, likesKnown: known })
  } catch (e) { console.warn('[social] likes load failed:', e) }
}

const likeInflight = new Set<string>()
function fireLike(postId: string, liked: boolean, delta: number) {
  window.dispatchEvent(new CustomEvent<LikeEventDetail>(LIKE_EVENT, { detail: { postId, liked, delta } }))
}

/** 좋아요 토글. 낙관적 반영 → 실패 시 되돌리고 ok:false */
export async function toggleLike(postId: string, ownerId?: string | null): Promise<ActionResult> {
  const uid = st.userId
  if (!uid) return { ok: false, error: 'login', message: i18n.t('common.loginRequired') }
  if (likeInflight.has(postId)) return { ok: true }
  likeInflight.add(postId)
  const was = st.likes.has(postId)
  const apply = (liked: boolean) => {
    const likes = new Set(st.likes); const known = new Set(st.likesKnown); known.add(postId)
    if (liked) likes.add(postId); else likes.delete(postId)
    emit({ likes, likesKnown: known })
  }
  apply(!was); fireLike(postId, !was, was ? -1 : 1)
  try {
    if (was) {
      const { error } = await supabase.from('likes').delete().eq('user_id', uid).eq('post_id', postId)
      if (error) throw error
    } else {
      const { error } = await supabase.from('likes').insert({ user_id: uid, post_id: postId })
      if (error && error.code !== '23505') throw error // 23505 = 이미 좋아요 → 그대로 켜짐
      if (ownerId && ownerId !== uid) {
        supabase.rpc('send_notification', { p_user_id: ownerId, p_actor_id: uid, p_type: 'like', p_message: i18n.t('communityDetail.likeSuccess'), p_related_id: postId }).then(null, () => {})
      }
    }
    return { ok: true }
  } catch (e) {
    console.warn('[social] like toggle failed:', e)
    apply(was); fireLike(postId, was, was ? 1 : -1)
    return { ok: false, error: 'network', message: i18n.t('community.likeFailed') }
  } finally {
    likeInflight.delete(postId)
  }
}

// ── 팔로우 ──
const followInflight = new Set<string>()
export async function toggleFollow(targetId: string): Promise<ActionResult> {
  const uid = st.userId
  if (!uid) return { ok: false, error: 'login', message: i18n.t('common.loginRequired') }
  if (targetId === uid || followInflight.has(targetId)) return { ok: true }
  followInflight.add(targetId)
  const was = st.follows.has(targetId)
  const apply = (following: boolean) => {
    const follows = new Set(st.follows)
    if (following) follows.add(targetId); else follows.delete(targetId)
    emit({ follows })
  }
  apply(!was)
  try {
    if (was) {
      const { error } = await supabase.from('follows').delete().eq('follower_id', uid).eq('following_id', targetId)
      if (error) throw error
    } else {
      const { error } = await supabase.from('follows').upsert({ follower_id: uid, following_id: targetId }, { onConflict: 'follower_id,following_id' })
      if (error) throw error
      // 서버 반영이 끝난 뒤에만 알림
      supabase.rpc('send_notification', { p_user_id: targetId, p_actor_id: uid, p_type: 'follow', p_message: i18n.t('notifications.followMessage'), p_related_id: targetId }).then(null, () => {})
    }
    return { ok: true }
  } catch (e) {
    console.warn('[social] follow toggle failed:', e)
    apply(was)
    return { ok: false, error: 'network', message: i18n.t('community.followFailed') }
  } finally {
    followInflight.delete(targetId)
  }
}

// ── 읽기 ──
export function isLiked(postId: string) { return st.likes.has(postId) }
export function isFollowing(userId: string) { return st.follows.has(userId) }
export function isFriend(userId: string) { return st.follows.has(userId) && st.followers.has(userId) }
export function friendIds(): string[] { return [...st.follows].filter(id => st.followers.has(id)) }

// ── 훅 ──
export function useSocialState() {
  useEffect(hookResume, [])
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/** App 루트에서 한 번: 로그인 사용자와 저장소를 묶는다 */
export function useBindSocialUser(userId: string | null) {
  useEffect(() => { bindSocialUser(userId) }, [userId])
}
