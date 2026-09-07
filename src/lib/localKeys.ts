// ═══════════════════════════════════════════════════════
// localKeys.ts — 계정에 속한 localStorage 키의 단일 목록
// useAutoSync(동기화 대상)와 AuthContext.logout(정리 대상)이 같은 목록을 본다.
// ═══════════════════════════════════════════════════════

/** 서버(user_data)와 동기화되는 키 */
export const SYNC_KEYS = [
  'sp_ootd_records',    // OOTD 기록
  'cs_saved',           // 저장한 코디
  'sp_gamification',    // 레벨/배지/XP
  'sp_wardrobe',        // 옷장 아이템
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

/** 배열 형태(id 필드 보유)라 게스트→로그인 승격 시 병합 가능한 키 */
export const MERGEABLE_ARRAY_KEYS = ['sp_ootd_records', 'cs_saved', 'sp_wardrobe'] as const

/** 로그아웃 시 반드시 지워야 하는 키 (동기화 대상 + 동기화 메타). 기기 설정은 남긴다. */
export const USER_SCOPED_KEYS: readonly string[] = [
  ...SYNC_KEYS.filter(k => k !== 'sp_dark_mode' && k !== 'sp_a11y_labels'),
  '_sync_ts',
  '_sync_owner',
  'sp_follows',   // 옛 팔로우 캐시 (이제 서버가 진실, 남아 있으면 지운다)
  'sp_friends',
]
