// ═══════════════════════════════════════════════════════
// storage.ts — localStorage 안전 접근 + 변경 알림
// - setJSON/getJSON: 예외(용량 초과 등)를 삼키지 않고 boolean/기본값으로 돌려준다
// - installStorageWatcher: setItem을 앱 시작 시 딱 한 번 감싸서 'bp:storage' 이벤트로 알린다
//   (useAutoSync가 user 바뀔 때마다 패치를 걸고 풀던 것을 대체)
// ═══════════════════════════════════════════════════════

export const STORAGE_EVENT = 'bp:storage'
export const STORAGE_FULL_EVENT = 'bp:storage-full'

export class StorageQuotaError extends Error {
  constructor(key: string) { super(`localStorage quota exceeded while writing "${key}"`); this.name = 'StorageQuotaError' }
}

export function isQuotaError(e: unknown): boolean {
  if (e instanceof StorageQuotaError) return true
  const err = e as { name?: string; code?: number }
  return !!err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014)
}

export function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch { return fallback }
}

function notifyFull(key: string) {
  console.warn('[storage] quota exceeded:', key)
  try { window.dispatchEvent(new CustomEvent(STORAGE_FULL_EVENT, { detail: { key } })) } catch {}
}

/** 문자열 저장. 성공하면 true. 용량 초과면 bp:storage-full 이벤트(StorageFullToaster 가 알림) + false. */
export function setString(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    if (isQuotaError(e)) notifyFull(key)
    else console.warn('[storage] set failed:', key, e)
    return false
  }
}

/** JSON 저장. 성공하면 true. 용량 초과면 bp:storage-full 이벤트 + false — 호출자는 false 면 "저장 안 됨"으로 다룬다. */
export function setJSON(key: string, value: unknown): boolean {
  return setString(key, JSON.stringify(value))
}

export function removeKeys(keys: readonly string[]) {
  keys.forEach(k => { try { localStorage.removeItem(k) } catch {} })
}

let installed = false
/** 앱 시작 시 1회. 이후 localStorage.setItem/removeItem 호출마다 window에 bp:storage {key} 이벤트가 뜬다. */
export function installStorageWatcher() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const proto = Storage.prototype
  const origSet = proto.setItem
  const origRemove = proto.removeItem
  proto.setItem = function (this: Storage, key: string, value: string) {
    origSet.call(this, key, value)
    if (this === window.localStorage) window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } }))
  }
  proto.removeItem = function (this: Storage, key: string) {
    origRemove.call(this, key)
    if (this === window.localStorage) window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } }))
  }
}

/** 지정 키가 바뀔 때 콜백. 다른 탭에서의 변경(storage 이벤트)도 포함. 해제 함수를 돌려준다. */
export function onStorageChange(keys: readonly string[], cb: (key: string) => void): () => void {
  const set = new Set(keys)
  const local = (e: Event) => { const k = (e as CustomEvent<{ key: string }>).detail?.key; if (k && set.has(k)) cb(k) }
  const cross = (e: StorageEvent) => { if (e.key && set.has(e.key)) cb(e.key) }
  window.addEventListener(STORAGE_EVENT, local)
  window.addEventListener('storage', cross)
  return () => { window.removeEventListener(STORAGE_EVENT, local); window.removeEventListener('storage', cross) }
}
