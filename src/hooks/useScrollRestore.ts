import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * 페이지 이동 후 돌아왔을 때 스크롤 위치를 복원하는 훅.
 * - 언마운트 시 window.scrollY를 sessionStorage에 저장
 * - 마운트 시 저장된 위치로 복원 (콘텐츠 렌더 후 requestAnimationFrame 사용)
 * @param ready - true일 때만 스크롤 복원 (데이터 로딩 완료 후 복원하기 위함)
 */
export function useScrollRestore(ready = true) {
  const { pathname } = useLocation()
  const key = `scroll_${pathname}`
  const savedRef = useRef<number | null>(null)

  // 마운트 시 저장된 위치 읽기
  useEffect(() => {
    const saved = sessionStorage.getItem(key)
    savedRef.current = saved ? parseInt(saved, 10) : null
  }, [key])

  // ready가 true가 되면 복원
  useEffect(() => {
    if (!ready || savedRef.current == null) return
    const y = savedRef.current
    savedRef.current = null // 한 번만 복원

    // 콘텐츠 렌더링 후 복원
    requestAnimationFrame(() => {
      window.scrollTo(0, y)
    })
  }, [ready])

  // 언마운트 시 저장
  useEffect(() => {
    return () => {
      sessionStorage.setItem(key, String(window.scrollY))
    }
  }, [key])
}
