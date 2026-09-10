// ================================================================
// mode.ts — 앱 모드 (타겟 둘, 앞문 둘)
//
// easy(골라 주는 모드): 패션 초보. 홈이 곧 한 벌이고 버튼은 둘(이대로 · 다른 거).
//   색 고르기는 ● 추천만, 결과는 저장과 물어보기뿐. 설명·용어·게임 요소 없음.
// pro(직접 만드는 모드): 옷에 익숙한 사람. 작업대(레일 8칸·색 148개) 전부 열림.
// 밑바닥(엔진·캐릭터·판·투표·알림)은 하나, 앞문만 다르다. 온보딩에서 한 번 묻고 설정에서 바꾼다.
// ================================================================
export type AppMode = 'easy' | 'pro'
const KEY = 'sp_mode'

export function getMode(): AppMode {
  try { const m = localStorage.getItem(KEY); if (m === 'easy' || m === 'pro') return m } catch {}
  return 'easy'
}
export function setMode(m: AppMode) { try { localStorage.setItem(KEY, m) } catch {} }
export const isEasy = () => getMode() === 'easy'
