// ═══════════════════════════════════════════════════════
// notifStore.ts — 미읽음 알림 수 (헤더 배지)
// 알림 탭에 들어가야만 새 알림을 알 수 있던 것을, 로그인·앱 재개·2분 주기·읽음 처리 후에
// 서버 카운트를 받아 배지로 보여준다. 나중에 Realtime/푸시를 붙여도 같은 카운트 소스를 쓴다.
// ═══════════════════════════════════════════════════════
import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase'
import { isOnline, onAppResume, onNetworkChange } from '@/lib/appLifecycle'

const POLL_MS = 2 * 60_000

let unread = 0
let userId: string | null = null
let timer: ReturnType<typeof setInterval> | null = null
let hooked = false
const listeners = new Set<() => void>()
function set(n: number) { if (n === unread) return; unread = n; listeners.forEach(l => l()) }
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
function snapshot() { return unread }

export async function refreshUnread() {
  const uid = userId
  if (!uid || !isOnline()) return
  try {
    // RPC(02_missing_functions) 우선, 없으면 count 쿼리
    const { data, error } = await supabase.rpc('get_unread_notification_count', { p_user_id: uid })
    if (!error && typeof data === 'number') { if (userId === uid) set(data); return }
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false)
    if (userId === uid) set(count || 0)
  } catch (e) { console.warn('[notif] unread count failed:', e) }
}

/** 알림 화면에서 읽음 처리한 직후 */
export function markAllReadLocally() { set(0) }

export function bindNotifUser(uid: string | null) {
  if (uid === userId && hooked) return
  userId = uid
  set(0)
  if (timer) { clearInterval(timer); timer = null }
  if (!hooked) {
    hooked = true
    onAppResume(() => { void refreshUnread() })
    onNetworkChange(o => { if (o) void refreshUnread() })
  }
  if (uid) {
    void refreshUnread()
    timer = setInterval(() => { if (document.visibilityState !== 'hidden') void refreshUnread() }, POLL_MS)
  }
}

export function useUnreadCount(): number {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

export function useBindNotifUser(uid: string | null) {
  useEffect(() => { bindNotifUser(uid) }, [uid])
}
