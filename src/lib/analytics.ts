// @ts-nocheck
import { supabase } from './supabase'
import { ENGINE_VERSION, PALETTE_VERSION } from './versions'

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
  if (import.meta.env.DEV) console.debug('[analytics]', event, item.meta)
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

// ════════════════════════════════════════════════════════════════
// 계측 v1 (2026-09-08) — 색 선택 과정을 데이터로 남긴다
//
// 목적: (1) 팔레트를 넓게 시작해 두고, 실제로 고르는 색과 안 고르는 색을
// 보고 줄인다. (2) 만들기 퍼널의 기준선(단계별 이탈, 완료 점수 분포,
// 색 바꾼 횟수)을 잡아 둔다. (3) 공유가 어디서 일어나는지 센다.
// 이후 1단계 옷 조합·안내 층·엔진 v7.1이 들어갈 때 전후 비교의 기준이 된다.
//
// 이벤트 사전
//   color_tab      색 탭 노출   {ctx, tab, n}
//   color_pick     색 탭(터치) {ctx, slot, color, src: grid|recent|rec, tab?, pos?, delta?, engine, pal}
//   color_confirm  색 확정     {slot, item, color, action: add|edit|simple, score_before, engine, pal}
//   build_step     단계 진입   {step, mode, style, ms}
//   build_complete 결과 도달   {score, n_upper, n_parts, layered, colors, style, mode, fabric, picks, confirms, ms, engine, pal}
//   share          공유        {kind: native|community|card, ctx, score}
//   outfit_*       1단계 옷 조합 {id, situ, temp, via|kind|rank}
//   guide_*        2단계 안내 층 {slot, from, to, gain}
//   taste_*        취향 온보딩 {i, ax, which | name, 축 6 | id, rank}
//   vote_*         웹 투표 {code, two | choice}. share kind='card' 는 코디 카드
// meta 는 jsonb 라 스키마 변경 없음. 조회 예시는 scripts/03_analytics.sql.
// ════════════════════════════════════════════════════════════════

const VER = { engine: ENGINE_VERSION, pal: PALETTE_VERSION }

// 퍼널 타이머·카운터 (탭 안에서만 유지)
const funnels: Record<string, { t0: number; picks: number; confirms: number }> = {}
export function markFunnel(name: string) {
  funnels[name] = { t0: Date.now(), picks: 0, confirms: 0 }
}
function funnel(name: string) {
  if (!funnels[name]) markFunnel(name)
  return funnels[name]
}

export type ColorPickCtx = 'build' | 'recommend_pin' | 'recommend_edit' | 'other'

// 색 탭 노출 (탭을 열 때마다; 첫 렌더 포함)
export function trackColorTab(ctx: string, tab: string, n: number) {
  trackEvent('color_tab', { ctx, tab, n })
}

// 색 탭(터치). src: grid=팔레트 격자, recent=최근 사용, rec=추천 칩
export function trackColorPick(ctx: string, meta: { slot?: string | null; color: string; src: 'grid' | 'recent' | 'rec'; tab?: string; pos?: number; delta?: number }) {
  if (ctx === 'build') funnel('build').picks++
  trackEvent('color_pick', { ctx, ...meta, ...VER })
}

// 색 확정 (만들기: 확정 버튼)
export function trackColorConfirm(meta: { slot?: string | null; item?: string | null; color: string; action: 'add' | 'edit' | 'simple'; score_before: number }) {
  funnel('build').confirms++
  trackEvent('color_confirm', { ...meta, ...VER })
}

// 만들기 단계 진입
export function trackBuildStep(step: string, meta: { mode: string; style: string | null }) {
  if (step === 'outfit' || (step === 'style' && !funnels.build)) markFunnel('build')
  trackEvent('build_step', { step, ...meta, ms: Date.now() - funnel('build').t0 })
}

// 만들기 결과 도달 (완료 기준선)
export function trackBuildComplete(meta: { score: number; n_upper: number; colors: Record<string, string>; style: string | null; mode: string; fabric: boolean }) {
  const f = funnel('build')
  const keys = Object.values(meta.colors)
  trackEvent('build_complete', {
    ...meta,
    n_parts: keys.length,
    n_colors: new Set(keys).size,
    layered: meta.n_upper >= 2,
    picks: f.picks,
    confirms: f.confirms,
    ms: Date.now() - f.t0,
    ...VER,
  })
}

// 공유
export function trackShare(kind: 'native' | 'community' | 'card', ctx: string, score?: number) {
  trackEvent('share', { kind, ctx, score: score ?? null })
}

// 1단계 옷 조합: view(카드 노출) · adopt(방향/대안 채택) · pick(색 고르기로 진행) · feedback(👍👎) · anchor
export function trackOutfit(kind: 'view' | 'adopt' | 'pick' | 'feedback' | 'anchor', meta: Record<string, any>) {
  trackEvent('outfit_' + kind, { ...meta, ...VER })
}

// 2단계 안내 층: 더 올리려면? 열기 · 한 수 적용 · 되돌리기 (● 탭 노출·선택은 color_tab/color_pick 의 tab='rec' 로 잡힌다)
export function trackGuide(kind: 'moves_open' | 'move_apply' | 'move_undo', meta: Record<string, any>) {
  trackEvent('guide_' + kind, { ...meta, ...VER })
}

// 취향 온보딩: start · answer · reveal · fall_view · pick(카드 → 만들기) · share
export function trackTaste(kind: 'start' | 'answer' | 'reveal' | 'fall_view' | 'pick' | 'share', meta: Record<string, any>) {
  trackEvent('taste_' + kind, { ...meta, ...VER })
}

// 웹 투표(루프 L3): create(만든 사람) · view · answer · share · cta(받은 사람이 취향 테스트로)
export function trackVote(kind: 'create' | 'view' | 'answer' | 'share' | 'cta', meta: Record<string, any>) {
  trackEvent('vote_' + kind, { ...meta, ...VER })
}
