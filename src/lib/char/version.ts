// 캐릭터 판(에셋) 세대. 판·카탈로그·코드가 한 세대로 함께 넘어가야 한다
// (컬러랩 규칙 ⑧: 옛 그림 + 새 좌표로 그리는 사고). 코드는 번들러 해시가
// 맡고, 정적 에셋 URL 에는 이 값을 붙인다. public/char/ 를 갈아끼울 때 올린다.
export const CHAR_ASSET_VERSION = '20260907e'
export const v = (url: string) => `${url}${url.includes('?') ? '&' : '?'}v=${CHAR_ASSET_VERSION}`
