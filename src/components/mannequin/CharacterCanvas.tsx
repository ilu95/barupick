import { useEffect, useRef, useState } from 'react'
import * as R from '@/lib/char/render3'
import type { CharItem, CharBody } from '@/lib/char/map'

// 캐릭터 한 장. 캔버스는 896×1200 고정이고 CSS 로만 줄인다 (이식 문서 8-3).
// boot() 는 앱에서 한 번, render() 는 상태가 바뀔 때마다. 먼저 시작한 렌더가
// 나중 것 위에 덮이지 않게 순번을 세고, 다 그린 뒤에 보이는 캔버스로 옮긴다.

let bootP: Promise<boolean> | null = null
export function bootCharacter(): Promise<boolean> {
  if (!bootP) bootP = R.boot().then(() => true).catch(() => { bootP = null; return false })
  return bootP
}

interface Props {
  items: CharItem[]
  body: CharBody
  /** CSS 가로폭(px). 세로는 3:4 로 따라간다 */
  width: number
  className?: string
  style?: React.CSSProperties
}

export default function CharacterCanvas({ items, body, width, className, style }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const seq = useRef(0)
  const [ready, setReady] = useState(false)
  const key = JSON.stringify([items, body])

  useEffect(() => {
    let alive = true
    const my = ++seq.current
    ;(async () => {
      const ok = await bootCharacter()
      if (!alive || !ok) return
      const off = document.createElement('canvas')
      try { await R.render(off, items, body) } catch { return }
      if (!alive || my !== seq.current) return
      const cv = ref.current
      if (!cv) return
      const g = cv.getContext('2d')
      if (!g) return
      g.clearRect(0, 0, cv.width, cv.height)
      g.drawImage(off, 0, 0)
      setReady(true)
    })()
    return () => { alive = false }
  }, [key])

  return (
    <canvas
      ref={ref}
      width={R.W}
      height={R.H}
      className={className}
      style={{ width, height: Math.round(width * R.H / R.W), display: 'block', opacity: ready ? 1 : 0, transition: 'opacity .2s', ...style }}
      aria-hidden="true"
    />
  )
}
