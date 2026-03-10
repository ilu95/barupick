// @ts-nocheck
import { supabase } from './supabase'

// ─── 세션 ID (탭 단위, 새로고침 유지) ───
const SESSION_KEY = 'sp_session_id'
function getSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    sessionStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

// ─── 배치 큐 (성능 최적화: 모아서 전송) ───
let queue: any[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
const FLUSH_INTERVAL = 3000 // 3초마다 전송
const MAX_QUEUE = 20

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(flush, FLUSH_INTERVAL)
}

async function flush() {
  flushTimer = null
  if (queue.length === 0) return
  const batch = [...queue]
  queue = []
  try {
    await supabase.from('analytics_events').insert(batch)
  } catch {
    // 실패해도 무시 (분석 데이터 손실은 허용)
  }
}

// 페이지 이탈 시 남은 큐 전송
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('beforeunload', flush)
}

// ─── 유저 ID 캐시 ───
let cachedUserId: string | null = null

export function setAnalyticsUser(userId: string | null) {
  cachedUserId = userId
}

// ─── 이벤트 기록 ───
export function trackEvent(event: string, meta?: Record<string, any>) {
  const item = {
    event,
    screen: window.location.pathname,
    session_id: getSessionId(),
    user_id: cachedUserId || null,
    meta: meta || {},
    created_at: new Date().toISOString(),
  }
  queue.push(item)
  if (queue.length >= MAX_QUEUE) flush()
  else scheduleFlush()
}

// ─── 편의 함수 ───

// 페이지 뷰
export function trackPageView(path?: string) {
  trackEvent('page_view', {
    path: path || window.location.pathname,
    referrer: document.referrer || null,
  })
}

// 버튼 클릭
export function trackClick(label: string, extra?: Record<string, any>) {
  trackEvent('click', { label, ...extra })
}

// 코디 추천 완료
export function trackRecommendComplete(style: string, layer: string, resultCount: number) {
  trackEvent('recommend_results', { style, layer, resultCount })
}

// 코디 저장
export function trackSave(source: string, score: number) {
  trackEvent('save_coord', { source, score })
}

// OOTD 기록
export function trackOotdRecord(hasPhoto: boolean, visibility: string) {
  trackEvent('ootd_record', { hasPhoto, visibility })
}

// 커뮤니티 게시물
export function trackCommunityPost() {
  trackEvent('community_post')
}

// 소셜 로그인
export function trackSocialLogin(provider: string) {
  trackEvent('social_login', { provider })
}

// 회원가입
export function trackSignup() {
  trackEvent('signup')
}

// 퍼스널컬러 설정
export function trackPersonalColor(type: string) {
  trackEvent('set_personal_color', { type })
}

// 체형 설정
export function trackBodyType(type: string) {
  trackEvent('set_body_type', { type })
}
