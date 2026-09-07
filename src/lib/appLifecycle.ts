// ═══════════════════════════════════════════════════════
// appLifecycle.ts — 앱 재개/백그라운드/네트워크 상태를 한 곳에서 듣는다
// 네이티브(Capacitor App.appStateChange)와 웹(visibilitychange)을 하나의 이벤트로 합치고,
// 동기화·날씨·알림 등은 여기에 구독만 한다.
// ═══════════════════════════════════════════════════════
import { useEffect, useState } from 'react'

const RESUME = 'bp:resume'
const BACKGROUND = 'bp:background'
const NET = 'bp:net'

let installed = false
let lastResumeAt = 0

function fire(name: string) { window.dispatchEvent(new Event(name)) }

/** 앱 시작 시 1회 */
export function installAppLifecycle() {
  if (installed || typeof window === 'undefined') return
  installed = true

  let hidden = document.visibilityState === 'hidden'
  const onVis = () => {
    const nowHidden = document.visibilityState === 'hidden'
    if (nowHidden === hidden) return
    hidden = nowHidden
    if (nowHidden) fire(BACKGROUND)
    else { lastResumeAt = Date.now(); fire(RESUME) }
  }
  document.addEventListener('visibilitychange', onVis)
  window.addEventListener('online', () => fire(NET))
  window.addEventListener('offline', () => fire(NET))

  // 네이티브: WKWebView는 visibilitychange를 놓칠 때가 있어 Capacitor 이벤트도 같이 듣는다
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  if (cap?.isNativePlatform?.()) {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive && hidden) { hidden = false; lastResumeAt = Date.now(); fire(RESUME) }
        else if (!isActive && !hidden) { hidden = true; fire(BACKGROUND) }
      })
    }).catch(() => {})
  }
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false
}

/** 백그라운드에서 돌아올 때. 해제 함수 반환. */
export function onAppResume(cb: () => void): () => void {
  window.addEventListener(RESUME, cb)
  return () => window.removeEventListener(RESUME, cb)
}

/** 백그라운드로 갈 때. keepalive 요청은 여기서 보낸다. */
export function onAppBackground(cb: () => void): () => void {
  window.addEventListener(BACKGROUND, cb)
  return () => window.removeEventListener(BACKGROUND, cb)
}

export function onNetworkChange(cb: (online: boolean) => void): () => void {
  const h = () => cb(isOnline())
  window.addEventListener(NET, h)
  return () => window.removeEventListener(NET, h)
}

/** 마지막 재개 시각(ms). 화면이 "돌아온 직후인지" 판단할 때. */
export function getLastResumeAt() { return lastResumeAt }

export function useOnline(): boolean {
  const [online, setOnline] = useState(isOnline)
  useEffect(() => onNetworkChange(setOnline), [])
  return online
}

/**
 * 화면이 다시 보일 때(재개·온라인 복귀) 콜백. stale 데이터 refetch 용.
 * minGapMs 안에 다시 불리는 건 무시한다.
 */
export function useOnResume(cb: () => void, minGapMs = 30_000) {
  useEffect(() => {
    let last = 0
    const run = () => { const n = Date.now(); if (n - last < minGapMs) return; last = n; cb() }
    const off1 = onAppResume(run)
    const off2 = onNetworkChange(o => { if (o) run() })
    return () => { off1(); off2() }
  }, [cb, minGapMs])
}
