// @ts-nocheck
// ─── 공용 크롭 오버레이 (원본 _showCropUI 포팅) ───
// shape: 'rect' (기본, 4:5 등) | 'circle' (프로필 아바타)
// ratio: width/height (circle은 무시, 항상 1:1)
import { useRef, useEffect } from 'react'

interface CropOverlayProps {
  src: string
  ratio?: number       // default 4/5
  shape?: 'rect' | 'circle'
  title?: string
  outputSize?: number  // circle 출력 크기 (default 600)
  onDone: (dataUrl: string) => void
  onCancel: () => void
}

export default function CropOverlay({
  src, ratio = 4 / 5, shape = 'rect', title, outputSize = 600, onDone, onCancel
}: CropOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const guideRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const stateRef = useRef({ scale: 1, offsetX: 0, offsetY: 0, minScale: 0.5 })
  const touchRef = useRef({ lastDist: 0, lastScale: 1, isDragging: false, lastX: 0, lastY: 0 })

  const isCircle = shape === 'circle'
  const effectiveRatio = isCircle ? 1 : ratio

  useEffect(() => {
    const img = new window.Image()
    img.onload = () => {
      imgRef.current = img
      const area = areaRef.current, canvas = canvasRef.current, guide = guideRef.current
      if (!area || !canvas || !guide) return

      const cssW = area.clientWidth, cssH = area.clientHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width = cssW * dpr; canvas.height = cssH * dpr
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px'
      canvas.getContext('2d')!.scale(dpr, dpr)

      const maxGW = cssW * 0.75, maxGH = cssH * 0.65
      let gw: number, gh: number
      if (effectiveRatio >= 1) { gw = Math.min(maxGW, maxGH * effectiveRatio); gh = gw / effectiveRatio }
      else { gh = Math.min(maxGH, maxGW / effectiveRatio); gw = gh * effectiveRatio }
      if (isCircle) { gw = gh = Math.min(gw, gh) }

      guide.style.width = gw + 'px'; guide.style.height = gh + 'px'
      guide.style.left = (cssW - gw) / 2 + 'px'; guide.style.top = (cssH - gh) / 2 + 'px'

      const fitScale = Math.max(gw / img.width, gh / img.height)
      stateRef.current = { scale: fitScale, offsetX: 0, offsetY: 0, minScale: fitScale * 0.5 }
      draw()
    }
    img.src = src
  }, [src])

  const draw = () => {
    const canvas = canvasRef.current, area = areaRef.current, img = imgRef.current
    if (!canvas || !area || !img) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const cssW = area.clientWidth, cssH = area.clientHeight
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)
    const { scale, offsetX, offsetY } = stateRef.current
    const w = img.width * scale, h = img.height * scale
    ctx.drawImage(img, (cssW - w) / 2 + offsetX, (cssH - h) / 2 + offsetY, w, h)
  }

  // ─── Touch ───
  const onTS = (e: React.TouchEvent) => {
    e.preventDefault()
    const t = e.touches
    if (t.length === 2) {
      touchRef.current.lastDist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
      touchRef.current.lastScale = stateRef.current.scale
    } else if (t.length === 1) {
      touchRef.current.isDragging = true
      touchRef.current.lastX = t[0].clientX; touchRef.current.lastY = t[0].clientY
    }
  }
  const onTM = (e: React.TouchEvent) => {
    e.preventDefault()
    const t = e.touches
    if (t.length === 2) {
      const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
      stateRef.current.scale = Math.max(stateRef.current.minScale, Math.min(touchRef.current.lastScale * 5, touchRef.current.lastScale * (dist / touchRef.current.lastDist)))
      draw()
    } else if (t.length === 1 && touchRef.current.isDragging) {
      stateRef.current.offsetX += t[0].clientX - touchRef.current.lastX
      stateRef.current.offsetY += t[0].clientY - touchRef.current.lastY
      touchRef.current.lastX = t[0].clientX; touchRef.current.lastY = t[0].clientY
      draw()
    }
  }
  const onTE = (e: React.TouchEvent) => {
    if (e.touches.length < 2) touchRef.current.isDragging = false
    if (e.touches.length === 1) {
      touchRef.current.isDragging = true
      touchRef.current.lastX = e.touches[0].clientX; touchRef.current.lastY = e.touches[0].clientY
    }
  }

  // ─── Mouse ───
  const mRef = useRef({ down: false, lx: 0, ly: 0 })
  const onMD = (e: React.MouseEvent) => { mRef.current = { down: true, lx: e.clientX, ly: e.clientY } }
  const onMM = (e: React.MouseEvent) => {
    if (!mRef.current.down) return
    stateRef.current.offsetX += e.clientX - mRef.current.lx
    stateRef.current.offsetY += e.clientY - mRef.current.ly
    mRef.current.lx = e.clientX; mRef.current.ly = e.clientY; draw()
  }
  const onMU = () => { mRef.current.down = false }
  const onWh = (e: React.WheelEvent) => {
    stateRef.current.scale = Math.max(stateRef.current.minScale, stateRef.current.scale * (e.deltaY > 0 ? 0.95 : 1.05)); draw()
  }

  // ─── Done ───
  const handleDone = () => {
    const img = imgRef.current, area = areaRef.current, guide = guideRef.current
    if (!img || !area || !guide) return
    const cssW = area.clientWidth, cssH = area.clientHeight
    const gw = guide.clientWidth, gh = guide.clientHeight
    const { scale, offsetX, offsetY } = stateRef.current
    const imgX = (cssW - img.width * scale) / 2 + offsetX
    const imgY = (cssH - img.height * scale) / 2 + offsetY
    const guideLeft = (cssW - gw) / 2, guideTop = (cssH - gh) / 2

    const outW = isCircle ? outputSize : Math.round(gw * 2)
    const outH = isCircle ? outputSize : Math.round(gh * 2)
    const oc = document.createElement('canvas')
    oc.width = outW; oc.height = outH
    const octx = oc.getContext('2d')!
    octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high'

    if (isCircle) {
      octx.beginPath()
      octx.arc(outW / 2, outH / 2, outW / 2, 0, Math.PI * 2)
      octx.clip()
    }

    octx.drawImage(img, (guideLeft - imgX) / scale, (guideTop - imgY) / scale, gw / scale, gh / scale, 0, 0, outW, outH)
    onDone(oc.toDataURL(isCircle ? 'image/webp' : 'image/jpeg', 0.85))
  }

  const guideClass = isCircle
    ? 'absolute pointer-events-none border-2 border-white/80 rounded-full'
    : 'absolute pointer-events-none border-2 border-white/80 rounded-xl'

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col">
      <div className="flex justify-between items-center px-4 py-3 flex-shrink-0">
        <button onClick={onCancel} className="text-white/70 text-sm px-4 py-2 bg-white/15 rounded-full">취소</button>
        <span className="text-white text-sm font-semibold">{title || (isCircle ? '프로필 사진' : '사진 크롭')}</span>
        <button onClick={handleDone} className="text-white text-sm px-4 py-2 bg-terra-500 rounded-full font-semibold">완료</button>
      </div>
      <div ref={areaRef} className="flex-1 relative overflow-hidden flex items-center justify-center" style={{ touchAction: 'none' }}
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onWheel={onWh}
      >
        <canvas ref={canvasRef} />
        <div ref={guideRef} className={guideClass} style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }} />
      </div>
      <div className="text-center text-white/40 text-xs py-3 flex-shrink-0">두 손가락으로 확대/축소 · 드래그로 위치 조정</div>
    </div>
  )
}
