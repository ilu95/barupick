// @ts-nocheck
import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// 동기화 대상 localStorage 키
const SYNC_KEYS = [
  'sp_ootd_records',    // OOTD 기록
  'cs_saved',           // 저장한 코디
  'sp_gamification',    // 레벨/배지/XP
  'sp_wardrobe',        // 옷장 아이템
  'cs_personal_color',  // 퍼스널컬러
  'cs_body_effect',     // 체형 효과
  'cs_body_type',       // 체형
  'cs_profile',         // 로컬 프로필 설정
  'sp_follows',         // 팔로우 캐시
  'sp_friends',         // 친구 캐시
  'sp_dark_mode',       // 다크모드
  'sp_a11y_labels',     // 접근성
  'sp_hide_counts',     // 카운트 숨김
]

const SYNC_DEBOUNCE_MS = 3000    // 변경 후 3초 뒤 서버 push
const SYNC_INTERVAL_MS = 300000  // 5분마다 자동 동기화

/**
 * 하이브리드 동기화 훅
 * 
 * 동작 방식:
 * 1. 로그인 시: 서버에서 pull → localStorage보다 새로우면 덮어씀
 * 2. localStorage 변경 시: 3초 디바운스 후 서버로 push
 * 3. 5분마다 자동 push (변경 감지와 무관하게)
 * 4. 충돌 해결: 타임스탬프 비교 → 최신 데이터 우선 (last-write-wins)
 */
export function useAutoSync() {
  const { user } = useAuth()
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSyncRef = useRef<number>(0)

  // ── 서버에서 Pull ──
  const pullFromServer = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('data, updated_at')
        .eq('user_id', user.id)
        .single()

      if (error || !data?.data) return // 서버에 데이터 없음 (신규 유저)

      const serverData = data.data
      const serverTime = new Date(data.updated_at).getTime()
      const localTime = parseInt(localStorage.getItem('_sync_ts') || '0', 10)

      // 서버가 더 최신이면 → 로컬 덮어쓰기
      if (serverTime > localTime) {
        console.log('[Sync] Server is newer, pulling...')
        let pulled = 0

        SYNC_KEYS.forEach(key => {
          const serverVal = serverData[key]
          if (serverVal !== undefined && serverVal !== null) {
            const localVal = localStorage.getItem(key)
            // 서버 값이 있고, 로컬과 다르면 업데이트
            if (serverVal !== localVal) {
              localStorage.setItem(key, typeof serverVal === 'string' ? serverVal : JSON.stringify(serverVal))
              pulled++
            }
          }
        })

        if (pulled > 0) {
          localStorage.setItem('_sync_ts', String(serverTime))
          console.log(`[Sync] Pulled ${pulled} keys from server`)
          // 페이지 리프레시 없이 상태 갱신을 위해 커스텀 이벤트 발행
          window.dispatchEvent(new CustomEvent('sync-pulled', { detail: { count: pulled } }))
        }
      } else {
        console.log('[Sync] Local is newer or same, skipping pull')
      }
    } catch (e) {
      console.warn('[Sync] Pull failed:', e)
    }
  }, [user])

  // ── 서버로 Push ──
  const pushToServer = useCallback(async () => {
    if (!user) return

    try {
      const payload: Record<string, any> = {}
      SYNC_KEYS.forEach(key => {
        const val = localStorage.getItem(key)
        if (val !== null) payload[key] = val
      })

      const now = Date.now()
      payload._synced_at = new Date(now).toISOString()

      const { error } = await supabase
        .from('user_data')
        .upsert({
          user_id: user.id,
          data: payload,
          updated_at: new Date(now).toISOString(),
        })

      if (error) throw error

      localStorage.setItem('_sync_ts', String(now))
      lastSyncRef.current = now
      console.log('[Sync] Pushed to server')
    } catch (e) {
      console.warn('[Sync] Push failed:', e)
    }
  }, [user])

  // ── 디바운스된 Push ──
  const schedulePush = useCallback(() => {
    if (!user) return
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      pushToServer()
    }, SYNC_DEBOUNCE_MS)
  }, [user, pushToServer])

  // ── localStorage 변경 감지 ──
  useEffect(() => {
    if (!user) return

    // localStorage.setItem을 패치하여 변경 감지
    const originalSetItem = localStorage.setItem.bind(localStorage)
    localStorage.setItem = function (key: string, value: string) {
      originalSetItem(key, value)
      if (SYNC_KEYS.includes(key)) {
        schedulePush()
      }
    }

    // 다른 탭에서의 변경 감지
    const handleStorage = (e: StorageEvent) => {
      if (e.key && SYNC_KEYS.includes(e.key)) {
        schedulePush()
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      localStorage.setItem = originalSetItem
      window.removeEventListener('storage', handleStorage)
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [user, schedulePush])

  // ── 로그인 시 Pull + 주기적 Push ──
  useEffect(() => {
    if (!user) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    // 로그인 직후: 서버에서 Pull
    pullFromServer()

    // 5분마다 자동 Push
    intervalRef.current = setInterval(() => {
      pushToServer()
    }, SYNC_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user, pullFromServer, pushToServer])

  // ── 앱 종료/백그라운드 시 즉시 Push ──
  useEffect(() => {
    if (!user) return

    const handleBeforeUnload = () => {
      // navigator.sendBeacon은 비동기이므로 사용 불가, 대신 마지막 push 시도
      // visibilitychange가 더 안정적
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && user) {
        // 백그라운드로 갈 때 즉시 push
        pushToServer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, pushToServer])

  return {
    pullFromServer,
    pushToServer,
    /** 수동 전체 동기화 (설정 화면에서 사용) */
    syncNow: async () => {
      await pushToServer()
      await pullFromServer()
    },
  }
}

/**
 * 동기화 상태 표시용 훅
 * 마지막 동기화 시간을 반환
 */
export function useLastSyncTime(): string | null {
  const ts = parseInt(localStorage.getItem('_sync_ts') || '0', 10)
  if (!ts) return null
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return '방금 동기화됨'
  if (diff < 3600) return Math.floor(diff / 60) + '분 전 동기화'
  if (diff < 86400) return Math.floor(diff / 3600) + '시간 전 동기화'
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' 동기화'
}
