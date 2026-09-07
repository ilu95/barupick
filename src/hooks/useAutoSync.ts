// ═══════════════════════════════════════════════════════
// useAutoSync.ts — 로컬(localStorage) ↔ 서버(user_data) 동기화
//
// 이번 판에서 바뀐 것:
// - user 객체가 아니라 user.id 기준 → 토큰 갱신 때 pull이 다시 돌지 않는다
// - 로그인 직후 pull은 "덮어쓰기"가 아니라, 이 기기에서 처음 로그인한 계정이면(게스트 데이터) 병합
// - 앱 재개·온라인 복귀 시 pull (기존엔 로그인 때 1회뿐)
// - 백그라운드 진입 시 push는 keepalive fetch → 3초 디바운스 중 앱이 죽어도 남는다
// - 변경 감지는 lib/storage의 전역 watcher 구독 (setItem 몽키패치를 user마다 걸고 풀지 않음)
// - 상태(syncing/error/lastAt)를 useSyncStatus로 노출
//
// 기록·저장 코디·옷장은 행 단위(lib/rowSync, user_items). 작은 설정만 blob(user_data).
// ═══════════════════════════════════════════════════════
import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import i18n, { getLocale } from '@/i18n'
import { SYNC_KEYS, ROW_SYNC_KEYS } from '@/lib/localKeys'
import { pushRows, pullRows, bootstrapRows, hasLocalRowChanges } from '@/lib/rowSync'
import { onStorageChange } from '@/lib/storage'
import { onAppResume, onAppBackground, onNetworkChange, isOnline } from '@/lib/appLifecycle'

const SYNC_DEBOUNCE_MS = 3000       // 변경 후 3초 뒤 push
const SYNC_INTERVAL_MS = 5 * 60_000 // 포그라운드 주기 pull+push
const RESUME_PULL_GAP_MS = 60_000   // 재개 pull 최소 간격

// ── 상태 저장소 (설정 화면 표시용) ──
export interface SyncStatus {
  state: 'idle' | 'syncing' | 'error' | 'offline'
  lastAt: number       // 마지막 성공 시각
  lastError: string | null
  pending: boolean     // 로컬 변경이 아직 서버에 안 올라감
}
let status: SyncStatus = { state: 'idle', lastAt: parseInt(localStorage.getItem('_sync_ts') || '0', 10) || 0, lastError: null, pending: false }
const statusListeners = new Set<() => void>()
function setStatus(next: Partial<SyncStatus>) {
  status = { ...status, ...next }
  statusListeners.forEach(l => l())
}
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    l => { statusListeners.add(l); return () => { statusListeners.delete(l) } },
    () => status, () => status,
  )
}

type Payload = Record<string, unknown>

function collectLocal(): Payload {
  const payload: Payload = {}
  SYNC_KEYS.forEach(key => {
    const val = localStorage.getItem(key)
    if (val !== null) payload[key] = val
  })
  return payload
}

function asString(v: unknown): string { return typeof v === 'string' ? v : JSON.stringify(v) }

function parseArray(v: unknown): Array<{ id?: string }> | null {
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v
    return Array.isArray(arr) ? arr : null
  } catch { return null }
}

/**
 * 게스트 → 로그인 승격 병합 (blob 키): 서버 값이 있으면 서버, 없으면 로컬.
 * 옛 blob 에 배열 키(기록·옷장·저장)가 남아 있으면 rowSync 부트스트랩 전에 로컬로 내려 행으로 올라가게 한다.
 */
function mergeGuestData(server: Payload): { merged: Payload; needsPush: boolean } {
  const merged: Payload = {}
  let needsPush = false
  SYNC_KEYS.forEach(key => {
    const sv = server[key]
    const lv = localStorage.getItem(key)
    if (sv != null) merged[key] = asString(sv)
    else if (lv != null) { merged[key] = lv; needsPush = true }
  })
  ROW_SYNC_KEYS.forEach(key => {
    const sArr = parseArray(server[key]) || []
    const lArr = parseArray(localStorage.getItem(key)) || []
    if (sArr.length === 0) return
    const ids = new Set(lArr.map(r => r?.id).filter(Boolean))
    const extra = sArr.filter(r => r?.id && !ids.has(r.id))
    if (extra.length > 0) merged[key] = JSON.stringify([...lArr, ...extra])
  })
  return { merged, needsPush }
}

export function useAutoSync() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPullRef = useRef(0)
  const pullingRef = useRef(false)

  // ── 서버에서 Pull ──
  const pullFromServer = useCallback(async () => {
    if (!userId || pullingRef.current) return
    if (!isOnline()) { setStatus({ state: 'offline' }); return }
    pullingRef.current = true
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('data, updated_at')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      lastPullRef.current = Date.now()

      const firstTimeHere = localStorage.getItem('_sync_owner') !== userId
      const serverData: Payload | null = data?.data ?? null
      const serverTime = data?.updated_at ? new Date(data.updated_at).getTime() : 0
      const localTime = parseInt(localStorage.getItem('_sync_ts') || '0', 10)

      if (firstTimeHere) {
        // 이 기기에서 이 계정으로 처음: 게스트 데이터를 버리지 않고 병합
        const { merged, needsPush } = mergeGuestData(serverData || {})
        let changed = 0
        Object.entries(merged).forEach(([k, v]) => {
          if (localStorage.getItem(k) !== v) { localStorage.setItem(k, v as string); changed++ }
        })
        localStorage.setItem('_sync_owner', userId)
        if (serverTime) localStorage.setItem('_sync_ts', String(serverTime))
        // 기록·옷장·저장 코디: 서버에 행이 없으면 로컬 전부 올리고, 있으면 받아 병합
        await bootstrapRows(userId)
        const boot = await pullRows(userId)
        if (changed > 0 || boot.applied > 0) window.dispatchEvent(new CustomEvent('sync-pulled', { detail: { count: changed + boot.applied } }))
        if (needsPush || !serverData) schedulePushRef.current?.(0)
        setStatus({ state: boot.failed ? 'error' : 'idle', lastError: boot.failed ? 'rows' : null })
        return
      }

      const rows = await pullRows(userId)
      if (rows.applied > 0) window.dispatchEvent(new CustomEvent('sync-pulled', { detail: { count: rows.applied } }))
      if (!serverData) { setStatus({ state: rows.failed ? 'error' : 'idle', lastError: rows.failed ? 'rows' : null }); return }

      if (serverTime > localTime) {
        let pulled = 0
        SYNC_KEYS.forEach(key => {
          const sv = serverData[key]
          if (sv === undefined || sv === null) return
          const str = asString(sv)
          if (str !== localStorage.getItem(key)) { localStorage.setItem(key, str); pulled++ }
        })
        localStorage.setItem('_sync_ts', String(serverTime))
        if (pulled > 0) window.dispatchEvent(new CustomEvent('sync-pulled', { detail: { count: pulled } }))
      }
      setStatus({ state: 'idle', lastError: null, lastAt: Math.max(status.lastAt, serverTime) })
    } catch (e) {
      console.warn('[Sync] Pull failed:', e)
      setStatus({ state: 'error', lastError: (e as Error)?.message || String(e) })
    } finally {
      pullingRef.current = false
    }
  }, [userId])

  // ── 서버로 Push ──
  // keepalive=true 면 supabase-js 대신 fetch(keepalive)로 보낸다 (백그라운드 진입 직전용)
  const pushToServer = useCallback(async (opts: { keepalive?: boolean } = {}) => {
    if (!userId) return
    if (!isOnline()) { setStatus({ state: 'offline', pending: true }); return }
    setStatus({ state: 'syncing' })
    // 1) 기록·옷장·저장 코디: 바뀐 행만 (keepalive 경로에서도 supabase-js 로 시도 — 실패하면 다음 기회에)
    const rows = await pushRows(userId)
    const payload = collectLocal()
    const now = Date.now()
    payload._synced_at = new Date(now).toISOString()
    const row = { user_id: userId, data: payload, updated_at: new Date(now).toISOString() }

    try {
      if (opts.keepalive) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data?on_conflict=user_id`, {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${session.access_token}`,
            'Prefer': 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(row),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } else {
        const { error } = await supabase.from('user_data').upsert(row, { onConflict: 'user_id' })
        if (error) throw error
      }
      localStorage.setItem('_sync_ts', String(now))
      if (rows.failed) setStatus({ state: 'error', lastAt: now, lastError: 'rows', pending: true })
      else setStatus({ state: 'idle', lastAt: now, lastError: null, pending: false })
    } catch (e) {
      console.warn('[Sync] Push failed:', e)
      setStatus({ state: 'error', lastError: (e as Error)?.message || String(e), pending: true })
    }
  }, [userId])

  // ── 디바운스된 Push ──
  const schedulePushRef = useRef<((delay?: number) => void) | null>(null)
  const schedulePush = useCallback((delay = SYNC_DEBOUNCE_MS) => {
    if (!userId) return
    setStatus({ pending: true })
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => { pushTimerRef.current = null; pushToServer() }, delay)
  }, [userId, pushToServer])
  schedulePushRef.current = schedulePush

  /** 대기 중인 디바운스 push가 있으면 지금 보낸다 */
  const flushPending = useCallback((keepalive = false) => {
    if (!userId) return
    if (pushTimerRef.current) { clearTimeout(pushTimerRef.current); pushTimerRef.current = null; return pushToServer({ keepalive }) }
    if (status.pending || hasLocalRowChanges()) return pushToServer({ keepalive })
  }, [userId, pushToServer])

  // ── 로컬 변경 감지 ──
  useEffect(() => {
    if (!userId) return
    const off = onStorageChange([...SYNC_KEYS, ...ROW_SYNC_KEYS], () => schedulePush())
    return () => { off(); if (pushTimerRef.current) clearTimeout(pushTimerRef.current) }
  }, [userId, schedulePush])

  // ── 로그인 시 Pull + 주기 동기화 ──
  useEffect(() => {
    if (!userId) { setStatus({ state: 'idle', pending: false }); return }
    pullFromServer()
    const iv = setInterval(async () => {
      if (document.visibilityState === 'hidden') return
      await flushPending()
      await pullFromServer()
    }, SYNC_INTERVAL_MS)
    return () => clearInterval(iv)
  }, [userId, pullFromServer, flushPending])

  // ── 재개·온라인 복귀 시 Pull, 백그라운드 진입 시 keepalive Push ──
  useEffect(() => {
    if (!userId) return
    const resume = async () => {
      if (Date.now() - lastPullRef.current < RESUME_PULL_GAP_MS) return
      await flushPending()
      await pullFromServer()
    }
    const off1 = onAppResume(resume)
    const off2 = onNetworkChange(online => { if (online) resume(); else setStatus({ state: 'offline' }) })
    const off3 = onAppBackground(() => { flushPending(true) })
    return () => { off1(); off2(); off3() }
  }, [userId, pullFromServer, flushPending])

  return {
    pullFromServer,
    pushToServer: () => pushToServer(),
    /** 수동 전체 동기화 (설정 화면) — 실패하면 throw */
    syncNow: async () => {
      await pushToServer()
      await pullFromServer()
      if (status.state === 'error') throw new Error(status.lastError || 'sync failed')
    },
  }
}

/** 마지막 동기화 시간 문구 (설정 화면) */
export function useLastSyncTime(): string | null {
  const s = useSyncStatus()
  const ts = s.lastAt || parseInt(localStorage.getItem('_sync_ts') || '0', 10)
  if (!ts) return null
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return i18n.t('ui:settings.syncJustNow')
  if (diff < 3600) return i18n.t('ui:settings.syncMinutesAgo', { count: Math.floor(diff / 60) })
  if (diff < 86400) return i18n.t('ui:settings.syncHoursAgo', { count: Math.floor(diff / 3600) })
  const dateStr = new Date(ts).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' })
  return i18n.t('ui:settings.syncDateFormat', { date: dateStr })
}
