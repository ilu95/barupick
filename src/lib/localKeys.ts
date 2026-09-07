// ═══════════════════════════════════════════════════════
// localKeys.ts — 계정에 속한 localStorage 키의 단일 목록
// useAutoSync(동기화 대상)와 AuthContext.logout(정리 대상)이 같은 목록을 본다.
// ═══════════════════════════════════════════════════════

/** 행 단위(user_items)로 동기화되는 배열 키 — lib/rowSync */
export const ROW_SYNC_KEYS = ['sp_ootd_records', 'cs_saved', 'sp_wardrobe'] as const

/** 통짜 blob(user_data)으로 동기화되는 작은 설정 키 */
export const SYNC_KEYS = [
  'cs_personal_color',  // 퍼스널컬러
  'cs_body_effect',     // 체형 효과
  'cs_body_type',       // 체형
  'cs_profile',         // 로컬 프로필 설정
  'sp_dark_mode',       // 다크모드
  'sp_a11y_labels',     // 접근성
  'sp_hide_counts',     // 카운트 숨김
  'sp_challenges_done', // 주간 챌린지
  'sp_quiz_result',     // 퀴즈 결과
  'sp_title_results',   // 칭호 결과
] as const

/** 로그아웃 시 반드시 지워야 하는 키 (동기화 대상 + 동기화 메타). 기기 설정은 남긴다. */
export const USER_SCOPED_KEYS: readonly string[] = [
  ...ROW_SYNC_KEYS,
  ...SYNC_KEYS.filter(k => k !== 'sp_dark_mode' && k !== 'sp_a11y_labels'),
  '_sync_ts',
  '_sync_owner',
  'bp_rows_snapshot',
  'bp_rows_since',
  'bp_post_queue',
  'sp_gamification', // 옛 XP 카운터 (이제 파생 계산, 남아 있으면 지운다)
  'sp_follows',   // 옛 팔로우 캐시 (이제 서버가 진실, 남아 있으면 지운다)
  'sp_friends',
]
