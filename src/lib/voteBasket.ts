// ================================================================
// voteBasket.ts — "후보에 담기" (투표 후보 바구니)
//
// 결과 화면에서 지금 코디를 담아 두고, 다른 코디를 만든 뒤 "친구에게 물어보기"
// 후보 화면에서 함께 고른다. 유저가 직접 비교할 두 벌을 정하는 자리다.
// 기기 안에만(localStorage) 두고 3일 지나면 버린다. 최대 8벌.
// ================================================================
import type { VoteSide } from './votes'

export interface BasketItem { id: string; at: number; side: VoteSide; garments: string[] }

const KEY = 'sp_vote_basket', MAX = 8, TTL = 3 * 24 * 3600 * 1000

export function loadBasket(): BasketItem[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]') as BasketItem[]
    const now = Date.now()
    return list.filter(b => b && b.side && now - b.at < TTL)
  } catch { return [] }
}
function save(list: BasketItem[]) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))) } catch {} }

/** 같은 코디(장면이 같음)는 두 번 담지 않는다. 담은 뒤 바구니 크기를 돌려준다 */
export function addToBasket(side: VoteSide, garments: string[]): number {
  const list = loadBasket()
  const sig = JSON.stringify(side.scene.items)
  const rest = list.filter(b => JSON.stringify(b.side.scene.items) !== sig)
  rest.unshift({ id: Date.now().toString(36), at: Date.now(), side, garments })
  save(rest)
  return Math.min(rest.length, MAX)
}
export function removeFromBasket(id: string) { save(loadBasket().filter(b => b.id !== id)) }
export function clearBasket() { try { localStorage.removeItem(KEY) } catch {} }
