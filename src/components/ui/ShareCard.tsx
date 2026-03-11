// @ts-nocheck
import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'

// ═══════════════════════════════════════════════════════
// ShareCard v2 — 공유 카드 이미지 생성
//
// 디자인: 투명 배경 + 착용샷(라운드) + 마네킹(좌하단) + "Made By. Barupick"
// 사진 필수. 사진 없으면 이 컴포넌트를 호출하지 않음.
// ═══════════════════════════════════════════════════════

export interface ShareCardData {
  photoUrl: string                    // 착용샷 (필수)
  outfitHex: Record<string, string>   // { top: '#fff', bottom: '#000080', ... }
  outerType?: string
  midType?: string
}

interface ShareCardProps {
  data: ShareCardData
  onClose: () => void
}

const CARD_W = 1080
const CARD_H = 1920

// ─── 마네킹 SVG 생성 ───
function buildMannequinSvg(outfitHex: Record<string, string>, size: number): string {
  const w = size, h = size * 1.6
  const cx = w / 2

  const stroke = (hex?: string) => {
    if (!hex) return 'rgba(0,0,0,0.15)'
    return (hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#fff')
      ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.2)'
  }

  const empty = '#E8E5E0'
  const top = outfitHex.top || empty
  const bottom = outfitHex.bottom || empty
  const outer = outfitHex.outer
  const mid = outfitHex.middleware
  const shoes = outfitHex.shoes || empty
  const scarf = outfitHex.scarf
  const hat = outfitHex.hat

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`

  // Head
  svg += `<ellipse cx="${cx}" cy="${h * 0.07}" rx="${w * 0.08}" ry="${h * 0.045}" fill="#F0DCC8" stroke="rgba(0,0,0,0.12)" stroke-width="1.5"/>`
  // Hair
  svg += `<ellipse cx="${cx}" cy="${h * 0.045}" rx="${w * 0.075}" ry="${h * 0.028}" fill="#2D2420"/>`

  // Hat
  if (hat) {
    svg += `<ellipse cx="${cx}" cy="${h * 0.04}" rx="${w * 0.11}" ry="${h * 0.025}" fill="${hat}" stroke="${stroke(hat)}" stroke-width="1.5"/>`
    svg += `<rect x="${cx - w * 0.085}" y="${h * 0.015}" width="${w * 0.17}" height="${h * 0.03}" rx="5" fill="${hat}" stroke="${stroke(hat)}" stroke-width="1.5"/>`
  }

  // Body (top)
  svg += `<path d="M${cx - w * 0.2} ${h * 0.12} Q${cx} ${h * 0.1} ${cx + w * 0.2} ${h * 0.12} L${cx + w * 0.17} ${h * 0.42} L${cx - w * 0.17} ${h * 0.42} Z" fill="${top}" stroke="${stroke(top)}" stroke-width="2"/>`

  // Middleware
  if (mid) {
    svg += `<path d="M${cx - w * 0.19} ${h * 0.13} Q${cx} ${h * 0.11} ${cx + w * 0.19} ${h * 0.13} L${cx + w * 0.165} ${h * 0.41} L${cx - w * 0.165} ${h * 0.41} Z" fill="${mid}" stroke="${stroke(mid)}" stroke-width="1.5" opacity="0.88"/>`
  }

  // Outer (coat style)
  if (outer) {
    svg += `<path d="M${cx - w * 0.24} ${h * 0.12} L${cx - w * 0.2} ${h * 0.12} L${cx - w * 0.17} ${h * 0.44} L${cx - w * 0.24} ${h * 0.44} Z" fill="${outer}" stroke="${stroke(outer)}" stroke-width="2"/>`
    svg += `<path d="M${cx + w * 0.24} ${h * 0.12} L${cx + w * 0.2} ${h * 0.12} L${cx + w * 0.17} ${h * 0.44} L${cx + w * 0.24} ${h * 0.44} Z" fill="${outer}" stroke="${stroke(outer)}" stroke-width="2"/>`
  }

  // Scarf
  if (scarf) {
    svg += `<path d="M${cx - w * 0.07} ${h * 0.11} Q${cx} ${h * 0.13} ${cx + w * 0.07} ${h * 0.11} L${cx + w * 0.04} ${h * 0.2} Q${cx} ${h * 0.22} ${cx - w * 0.04} ${h * 0.2} Z" fill="${scarf}" stroke="${stroke(scarf)}" stroke-width="1.5"/>`
    // 늘어진 부분
    svg += `<path d="M${cx - w * 0.03} ${h * 0.18} L${cx - w * 0.05} ${h * 0.32} L${cx - w * 0.01} ${h * 0.31} Z" fill="${scarf}" stroke="${stroke(scarf)}" stroke-width="1"/>`
  }

  // Arms
  svg += `<line x1="${cx - w * 0.21}" y1="${h * 0.13}" x2="${cx - w * 0.3}" y2="${h * 0.35}" stroke="#F0DCC8" stroke-width="10" stroke-linecap="round"/>`
  svg += `<line x1="${cx + w * 0.21}" y1="${h * 0.13}" x2="${cx + w * 0.3}" y2="${h * 0.35}" stroke="#F0DCC8" stroke-width="10" stroke-linecap="round"/>`

  // Bottom (pants)
  svg += `<path d="M${cx - w * 0.16} ${h * 0.42} L${cx - w * 0.13} ${h * 0.73} L${cx - w * 0.02} ${h * 0.73} L${cx} ${h * 0.42} Z" fill="${bottom}" stroke="${stroke(bottom)}" stroke-width="2"/>`
  svg += `<path d="M${cx + w * 0.16} ${h * 0.42} L${cx + w * 0.13} ${h * 0.73} L${cx + w * 0.02} ${h * 0.73} L${cx} ${h * 0.42} Z" fill="${bottom}" stroke="${stroke(bottom)}" stroke-width="2"/>`

  // Shoes
  svg += `<ellipse cx="${cx - w * 0.075}" cy="${h * 0.75}" rx="${w * 0.065}" ry="${h * 0.02}" fill="${shoes}" stroke="${stroke(shoes)}" stroke-width="1.5"/>`
  svg += `<ellipse cx="${cx + w * 0.075}" cy="${h * 0.75}" rx="${w * 0.065}" ry="${h * 0.02}" fill="${shoes}" stroke="${stroke(shoes)}" stroke-width="1.5"/>`

  svg += '</svg>'
  return svg
}

// ─── 이미지 로드 ───
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// ─── 라운드 사각형 (Canvas 호환) ───
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ═══════════════════════════════════════════════════════
// Canvas 렌더링
// ═══════════════════════════════════════════════════════
async function renderCard(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  mannequinImg: HTMLImageElement,
  photoImg: HTMLImageElement
) {
  const W = CARD_W, H = CARD_H

  // 투명 배경
  ctx.clearRect(0, 0, W, H)

  // ── 착용샷 (라운드 코너) ──
  const photoMargin = 60
  const photoX = photoMargin
  const photoY = photoMargin
  const photoW = W - photoMargin * 2
  const photoH = H - photoMargin * 2
  const cornerR = 40

  ctx.save()
  roundRect(ctx, photoX, photoY, photoW, photoH, cornerR)
  ctx.clip()

  // 사진을 cover 방식으로 채우기
  const scale = Math.max(photoW / photoImg.width, photoH / photoImg.height)
  const sw = photoImg.width * scale
  const sh = photoImg.height * scale
  ctx.drawImage(
    photoImg,
    photoX + (photoW - sw) / 2,
    photoY + (photoH - sh) / 2,
    sw, sh
  )
  ctx.restore()

  // ── 마네킹 (좌측 하단) ──
  const mannW = 180
  const mannH = mannequinImg.height * (mannW / mannequinImg.width)
  const mannX = photoX + 30
  const mannY = photoY + photoH - mannH - 80

  // 마네킹 배경 (약간 반투명 흰색으로 가독성 확보)
  // 없이도 괜찮으면 제거 가능
  ctx.drawImage(mannequinImg, mannX, mannY, mannW, mannH)

  // ── "Made By. Barupick" 텍스트 ──
  const textX = mannX
  const textY = photoY + photoH - 40

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.font = '500 28px "Outfit", "Pretendard", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'

  // 텍스트 그림자 (가독성)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 2
  ctx.fillText('Made By. Barupick', textX, textY)

  // 그림자 리셋
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

// ═══════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════
export default function ShareCard({ data, onClose }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(true)

  const generate = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CARD_W
    canvas.height = CARD_H
    const ctx = canvas.getContext('2d')!

    setGenerating(true)

    try {
      // 마네킹 SVG → Image
      const svgStr = buildMannequinSvg(data.outfitHex, 300)
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml' })
      const svgUrl = URL.createObjectURL(svgBlob)
      let mannequinImg: HTMLImageElement
      try {
        mannequinImg = await loadImage(svgUrl)
      } finally {
        URL.revokeObjectURL(svgUrl)
      }

      // 착용샷 로드
      const photoImg = await loadImage(data.photoUrl)

      // 렌더링
      await renderCard(ctx, data, mannequinImg, photoImg)

      // PNG (투명 배경)
      setImageUrl(canvas.toDataURL('image/png'))
    } catch (e) {
      console.error('ShareCard render error:', e)
    } finally {
      setGenerating(false)
    }
  }, [data])

  useEffect(() => { generate() }, [generate])

  // 공유
  const handleShare = async () => {
    if (!imageUrl) return
    try {
      const blob = await (await fetch(imageUrl)).blob()
      const file = new File([blob], 'barupick-coord.png', { type: 'image/png' })
      await navigator.share({ files: [file], title: '바루픽 코디' })
    } catch {
      handleDownload()
    }
  }

  // 다운로드
  const handleDownload = () => {
    if (!imageUrl) return
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = `barupick-${Date.now()}.png`
    a.click()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-[360px] mx-4 animate-screen-enter" onClick={e => e.stopPropagation()}>

        {/* 닫기 */}
        <div className="flex justify-end mb-3">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white/70 active:scale-90 transition-transform">
            <X size={16} />
          </button>
        </div>

        {/* 미리보기 */}
        <div className="flex justify-center mb-5">
          {generating ? (
            <div className="flex items-center justify-center rounded-2xl bg-warm-800/50" style={{ width: 240, height: 426 }}>
              <div className="w-6 h-6 border-2 border-terra-300 border-t-terra-500 rounded-full animate-spin" />
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt="공유 카드"
              className="rounded-2xl shadow-2xl"
              style={{ width: 240, height: 426, objectFit: 'contain', background: '#000' }}
            />
          ) : (
            <div className="text-white/50 text-sm py-20">생성 실패</div>
          )}
        </div>

        {/* 액션 */}
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            disabled={generating}
            className="flex-1 py-3.5 bg-white text-warm-900 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Share size={16} /> 공유하기
          </button>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="py-3.5 px-5 bg-white/15 text-white rounded-2xl font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Download size={16} />
          </button>
        </div>

        {/* 숨겨진 캔버스 */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}

// ─── 편의 훅 ───
export function useShareCard() {
  const [open, setOpen] = useState(false)
  const [cardData, setCardData] = useState<ShareCardData | null>(null)

  const showShareCard = useCallback((data: ShareCardData) => {
    setCardData(data)
    setOpen(true)
  }, [])

  const hideShareCard = useCallback(() => {
    setOpen(false)
    setCardData(null)
  }, [])

  return { open, cardData, showShareCard, hideShareCard }
}
