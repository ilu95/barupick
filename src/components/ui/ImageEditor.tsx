// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Smile, Square, CircleDot, Plus, Trash2, RotateCw } from 'lucide-react'

const STICKERS = ['😎','🌟','⭐','❤️','🔥','🎀','🌸','☁️','🐱','🐶','👑','🎭','🦋','🍀','✨','💎','🌈','🎵']
const FILL_COLORS = ['#000000','#FFFFFF','#C2785C','#6B9E76','#5B8DB8','#D4915E','#8B5CF6','#EC4899']

interface EditorItem {
  type: 'sticker' | 'blur' | 'fill'
  x: number; y: number; size: number; rotation: number
  emoji?: string; color?: string
}

interface ImageEditorProps {
  src: string
  onSave: (dataUrl: string) => void
  onCancel: () => void
  cropMode?: 'square' | 'free' | false // square = avatar crop
}

export default function ImageEditor({ src, onSave, onCancel, cropMode = false }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [items, setItems] = useState<EditorItem[]>([])
  const [activeItem, setActiveItem] = useState(-1)
  const [tool, setTool] = useState<'sticker' | 'blur' | 'fill'>('sticker')
  const [stickerType, setStickerType] = useState('😎')
  const [fillColor, setFillColor] = useState('#000000')
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const [loaded, setLoaded] = useState(false)
  const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0 })
  const pinchRef = useRef({ dist: 0, angle: 0, size: 0, rotation: 0 })

  // 이미지 로드 + 캔버스 설정
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const wrap = wrapRef.current
      if (!wrap) return
      const maxW = wrap.clientWidth, maxH = wrap.clientHeight
      let w = img.width, h = img.height
      const ratio = Math.min(maxW / w, maxH / h, 1)
      w = Math.round(w * ratio); h = Math.round(h * ratio)
      setCanvasSize({ w, h })
      setLoaded(true)
    }
    img.src = src
  }, [src])

  // 캔버스 그리기
  const redraw = useCallback((itemsToRender?: EditorItem[], activeIdx?: number) => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { w, h } = canvasSize
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)

    const renderItems = itemsToRender || items
    const ai = activeIdx !== undefined ? activeIdx : activeItem

    renderItems.forEach((item, idx) => {
      const { x, y, size } = item
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((item.rotation || 0) * Math.PI / 180)

      if (item.type === 'sticker') {
        ctx.font = `${size}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(item.emoji || '😎', 0, 0)
      } else if (item.type === 'blur') {
        const r = size / 2
        ctx.restore(); ctx.save()
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.clip()
        const sx = Math.max(0, Math.round(x - r)), sy = Math.max(0, Math.round(y - r))
        const sw = Math.min(w - sx, Math.round(size)), sh = Math.min(h - sy, Math.round(size))
        if (sw > 0 && sh > 0) {
          const ps = Math.max(3, Math.round(size / 6))
          const origC = document.createElement('canvas')
          origC.width = w; origC.height = h
          origC.getContext('2d').drawImage(img, 0, 0, w, h)
          const tc = document.createElement('canvas')
          tc.width = Math.max(1, Math.round(sw / ps))
          tc.height = Math.max(1, Math.round(sh / ps))
          tc.getContext('2d').drawImage(origC, sx, sy, sw, sh, 0, 0, tc.width, tc.height)
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(tc, 0, 0, tc.width, tc.height, sx, sy, sw, sh)
          ctx.imageSmoothingEnabled = true
        }
      } else if (item.type === 'fill') {
        const r = size / 2
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.fillStyle = item.color || '#000000'
        ctx.fill()
      }
      ctx.restore()

      // 선택 표시
      if (idx === ai) {
        ctx.save()
        ctx.strokeStyle = '#C2785C'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 3])
        const r = size / 2 + 4
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.stroke()
        // 삭제 버튼
        ctx.setLineDash([])
        const dx = x + r * 0.7, dy = y - r * 0.7
        ctx.beginPath()
        ctx.arc(dx, dy, 10, 0, Math.PI * 2)
        ctx.fillStyle = '#E53E3E'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(dx - 4, dy - 4); ctx.lineTo(dx + 4, dy + 4)
        ctx.moveTo(dx + 4, dy - 4); ctx.lineTo(dx - 4, dy + 4)
        ctx.stroke()
        ctx.restore()
      }
    })
  }, [canvasSize, items, activeItem])

  useEffect(() => {
    if (loaded) redraw()
  }, [loaded, items, activeItem, canvasSize, redraw])

  // 아이템 추가
  const addItem = () => {
    const cx = canvasSize.w / 2, cy = canvasSize.h / 2
    let newItem: EditorItem
    if (tool === 'sticker') newItem = { type: 'sticker', x: cx, y: cy, size: 60, rotation: 0, emoji: stickerType }
    else if (tool === 'blur') newItem = { type: 'blur', x: cx, y: cy, size: 80, rotation: 0 }
    else newItem = { type: 'fill', x: cx, y: cy, size: 80, rotation: 0, color: fillColor }
    const next = [...items, newItem]
    setItems(next)
    setActiveItem(next.length - 1)
  }

  // 아이템 삭제
  const deleteActive = () => {
    if (activeItem < 0) return
    const next = items.filter((_, i) => i !== activeItem)
    setItems(next)
    setActiveItem(-1)
  }

  // 저장
  const handleSave = () => {
    const img = imgRef.current
    if (!img) { onCancel(); return }

    if (cropMode === 'square') {
      // 정사각형 크롭 모드 — 원본 해상도로 정사각형 크롭
      const s = Math.min(img.width, img.height)
      const sx = (img.width - s) / 2, sy = (img.height - s) / 2
      const out = document.createElement('canvas')
      out.width = 400; out.height = 400
      out.getContext('2d').drawImage(img, sx, sy, s, s, 0, 0, 400, 400)
      onSave(out.toDataURL('image/jpeg', 0.85))
      return
    }

    // 원본 해상도로 스티커/블러/채우기 적용
    const out = document.createElement('canvas')
    out.width = img.width; out.height = img.height
    const ctx = out.getContext('2d')
    const scaleX = img.width / canvasSize.w, scaleY = img.height / canvasSize.h
    ctx.drawImage(img, 0, 0)

    items.forEach(item => {
      const x = item.x * scaleX, y = item.y * scaleY, sz = item.size * scaleX
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((item.rotation || 0) * Math.PI / 180)
      if (item.type === 'sticker') {
        ctx.font = `${sz}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(item.emoji || '😎', 0, 0)
      } else if (item.type === 'blur') {
        const r = sz / 2
        const origX = Math.round(x - r), origY = Math.round(y - r)
        const sw = Math.min(out.width - Math.max(0, origX), Math.round(sz))
        const sh = Math.min(out.height - Math.max(0, origY), Math.round(sz))
        if (sw > 0 && sh > 0) {
          ctx.restore(); ctx.save()
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.clip()
          const ps = Math.max(4, Math.round(sz / 8))
          const tc = document.createElement('canvas')
          tc.width = Math.max(1, Math.round(sw / ps))
          tc.height = Math.max(1, Math.round(sh / ps))
          tc.getContext('2d').drawImage(out, Math.max(0, origX), Math.max(0, origY), sw, sh, 0, 0, tc.width, tc.height)
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(tc, 0, 0, tc.width, tc.height, Math.max(0, origX), Math.max(0, origY), sw, sh)
          ctx.imageSmoothingEnabled = true
        }
      } else if (item.type === 'fill') {
        ctx.beginPath()
        ctx.arc(0, 0, sz / 2, 0, Math.PI * 2)
        ctx.fillStyle = item.color || '#000000'
        ctx.fill()
      }
      ctx.restore()
    })

    onSave(out.toDataURL('image/jpeg', 0.85))
  }

  // ─── 터치/마우스 이벤트 ───
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !loaded) return

    const getPos = (e: Touch | MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const hitTest = (pos: { x: number; y: number }) => {
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]
        const r = item.size / 2 + 8
        if ((pos.x - item.x) ** 2 + (pos.y - item.y) ** 2 < r * r) return i
      }
      return -1
    }

    const hitDelete = (pos: { x: number; y: number }) => {
      if (activeItem < 0) return false
      const item = items[activeItem]
      const r = item.size / 2 + 4
      const dx = item.x + r * 0.7, dy = item.y - r * 0.7
      return Math.hypot(pos.x - dx, pos.y - dy) < 14
    }

    // Touch
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 2 && activeItem >= 0) {
        const t0 = e.touches[0], t1 = e.touches[1]
        pinchRef.current = {
          dist: Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY),
          angle: Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX),
          size: items[activeItem].size,
          rotation: items[activeItem].rotation || 0,
        }
        dragRef.current.active = false
        return
      }
      if (e.touches.length === 1) {
        const pos = getPos(e.touches[0])
        if (hitDelete(pos)) { deleteActive(); return }
        const hit = hitTest(pos)
        if (hit >= 0) {
          setActiveItem(hit)
          dragRef.current = { active: true, offsetX: pos.x - items[hit].x, offsetY: pos.y - items[hit].y }
        } else {
          setActiveItem(-1)
          dragRef.current.active = false
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 2 && activeItem >= 0) {
        const t0 = e.touches[0], t1 = e.touches[1]
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY)
        const angle = Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX)
        setItems(prev => {
          const next = [...prev]
          const item = { ...next[activeItem] }
          item.size = Math.max(20, Math.min(300, pinchRef.current.size * (dist / pinchRef.current.dist)))
          item.rotation = pinchRef.current.rotation + (angle - pinchRef.current.angle) * 180 / Math.PI
          next[activeItem] = item
          return next
        })
        return
      }
      if (e.touches.length === 1 && dragRef.current.active && activeItem >= 0) {
        const pos = getPos(e.touches[0])
        setItems(prev => {
          const next = [...prev]
          next[activeItem] = { ...next[activeItem], x: pos.x - dragRef.current.offsetX, y: pos.y - dragRef.current.offsetY }
          return next
        })
      }
    }

    const onTouchEnd = () => { dragRef.current.active = false }

    // Mouse
    const onMouseDown = (e: MouseEvent) => {
      const pos = getPos(e)
      if (hitDelete(pos)) { deleteActive(); return }
      const hit = hitTest(pos)
      if (hit >= 0) {
        setActiveItem(hit)
        dragRef.current = { active: true, offsetX: pos.x - items[hit].x, offsetY: pos.y - items[hit].y }
      } else {
        setActiveItem(-1)
        dragRef.current.active = false
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.active || activeItem < 0) return
      const pos = getPos(e)
      setItems(prev => {
        const next = [...prev]
        next[activeItem] = { ...next[activeItem], x: pos.x - dragRef.current.offsetX, y: pos.y - dragRef.current.offsetY }
        return next
      })
    }

    const onMouseUp = () => { dragRef.current.active = false }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
    }
  }, [loaded, items, activeItem, canvasSize])

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center px-4 py-3 flex-shrink-0">
        <button onClick={onCancel} className="text-white text-sm px-3 py-1.5 border border-white/30 rounded-lg">취소</button>
        <span className="flex-1 text-center text-white text-[15px] font-semibold">사진 편집</span>
        <button onClick={handleSave} className="text-white text-sm px-3 py-1.5 bg-terra-500 rounded-lg font-semibold">완료</button>
      </div>

      {/* 캔버스 영역 */}
      <div ref={wrapRef} className="flex-1 relative flex items-center justify-center overflow-hidden">
        {!loaded && <div className="text-white/50 text-sm animate-pulse">로딩 중...</div>}
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          style={{ width: canvasSize.w, height: canvasSize.h, touchAction: 'none', display: loaded ? 'block' : 'none' }}
        />
      </div>

      {/* 툴바 */}
      <div className="flex-shrink-0 bg-[#1a1a1a] px-3 pt-2.5 pb-6">
        {/* 도구 탭 */}
        <div className="flex gap-1.5 mb-2.5">
          {[
            { id: 'sticker', label: '😎 스티커' },
            { id: 'blur', label: '🔲 블러' },
            { id: 'fill', label: '⬛ 채우기' },
          ].map(t => (
            <button key={t.id} onClick={() => { setTool(t.id as any); setActiveItem(-1) }}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border-[1.5px] transition-all ${
                tool === t.id ? 'border-terra-500 bg-terra-500/20 text-terra-300' : 'border-white/15 text-white/50'
              }`}
            >{t.label}</button>
          ))}
        </div>

        {/* 스티커 선택 */}
        {tool === 'sticker' && (
          <div className="flex gap-1 flex-wrap mb-2">
            {STICKERS.map(s => (
              <button key={s} onClick={() => setStickerType(s)}
                className={`w-9 h-9 rounded-lg text-xl border-[1.5px] transition-all ${
                  stickerType === s ? 'border-terra-500 bg-terra-500/20' : 'border-white/10'
                }`}
              >{s}</button>
            ))}
          </div>
        )}

        {/* 채우기 색상 */}
        {tool === 'fill' && (
          <div className="flex gap-1.5 items-center mb-2">
            <span className="text-white/50 text-[11px] mr-1">색상:</span>
            {FILL_COLORS.map(c => (
              <button key={c} onClick={() => setFillColor(c)}
                className="w-7 h-7 rounded-full border-2 transition-all"
                style={{ background: c, borderColor: fillColor === c ? '#C2785C' : 'rgba(255,255,255,0.2)' }}
              />
            ))}
          </div>
        )}

        {/* 추가 버튼 */}
        <button onClick={addItem} className="w-full py-2.5 rounded-xl bg-terra-500 text-white font-semibold text-[13px]">
          + {tool === 'sticker' ? '스티커' : tool === 'blur' ? '블러' : '채우기'} 추가
        </button>

        <div className="text-center mt-2 text-[11px] text-white/40">
          터치: 선택 · 드래그: 이동 · 두 손가락: 크기/회전
        </div>
      </div>
    </div>
  )
}
