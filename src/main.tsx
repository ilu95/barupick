import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ─── localStorage 마이그레이션 (HTML→React 전환 시 1회 실행) ───
;(function migrateLocalStorage() {
  const MIGRATION_KEY = 'sp_migrated_v2'
  if (localStorage.getItem(MIGRATION_KEY)) return

  try {
    // 1. 옷장 아이템: colorKey → color 통합
    const wardrobe = JSON.parse(localStorage.getItem('sp_wardrobe') || '[]')
    let wardrobeChanged = false
    wardrobe.forEach((item: any) => {
      // colorKey만 있고 color가 없는 경우 (HTML 버전 데이터)
      if (item.colorKey && !item.color) {
        item.color = item.colorKey
        wardrobeChanged = true
      }
      // color만 있고 colorKey가 없는 경우
      if (item.color && !item.colorKey) {
        item.colorKey = item.color
        wardrobeChanged = true
      }
      // id가 없는 경우 추가
      if (!item.id) {
        item.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
        wardrobeChanged = true
      }
      // category 영문→한글 매핑 (원본 HTML은 영문 사용)
      const catMap: Record<string, string> = { outer: 'outer', middleware: 'middleware', top: 'top', bottom: 'bottom', shoes: 'shoes', scarf: 'scarf', hat: 'hat' }
      // 한글 카테고리는 그대로 유지 — 영문도 그대로 유지 (ClosetCoord에서 양쪽 처리)
    })
    if (wardrobeChanged) {
      localStorage.setItem('sp_wardrobe', JSON.stringify(wardrobe))
    }

    // 2. OOTD 기록: id 없는 레코드에 id 추가
    const ootd = JSON.parse(localStorage.getItem('sp_ootd_records') || '[]')
    let ootdChanged = false
    ootd.forEach((r: any) => {
      if (!r.id) {
        r.id = r.date + '_' + (r.createdAt || Date.now()).toString(36)
        ootdChanged = true
      }
    })
    if (ootdChanged) {
      localStorage.setItem('sp_ootd_records', JSON.stringify(ootd))
    }

    // 3. 프로필 키 통합 (cs_profile 사용 확인)
    // cs_profile은 이미 양쪽에서 동일한 키 사용 — 별도 작업 불필요

    localStorage.setItem(MIGRATION_KEY, new Date().toISOString())
    console.log('[BaruPick] localStorage migration complete')
  } catch (e) {
    console.warn('[BaruPick] localStorage migration error:', e)
  }
})()

// 다크모드 초기화 (CSS와 동기화)
if (localStorage.getItem('sp_dark_mode') === '1') {
  document.documentElement.classList.add('dark')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// PWA 서비스 워커 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW 등록 실패는 무시 (개발 환경)
    })
  })
}
