// @ts-nocheck
import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'

// ═══════════════════════════════════════════════════════
// ShareCard v3 — 실제 앱 마네킹 SVG 사용
// ═══════════════════════════════════════════════════════

export interface ShareCardData {
  photoUrl: string
  outfitHex: Record<string, string>
  outerType?: 'coat' | 'jacket' | 'padding'
  midType?: 'knit' | 'cardigan' | 'vest'
}

interface ShareCardProps {
  data: ShareCardData
  onClose: () => void
}

const CARD_W = 1080
const CARD_H = 1350

// ─── 헬퍼 ───
const SKIN = '#ffe0bd'
function gS(hex) { if (!hex) return 'rgba(0,0,0,0.3)'; const h = hex.toLowerCase(); return (h === '#ffffff' || h === '#fff' || h === '#fefce8') ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)' }
function aB(hex, p) { if (!hex) return hex; let r = parseInt(hex.substring(1, 3), 16), g = parseInt(hex.substring(3, 5), 16), b = parseInt(hex.substring(5, 7), 16); r = Math.min(255, Math.max(0, Math.floor(r * (1 + p / 100)))); g = Math.min(255, Math.max(0, Math.floor(g * (1 + p / 100)))); b = Math.min(255, Math.max(0, Math.floor(b * (1 + p / 100)))); return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('') }

// ─── 실제 앱 마네킹 SVG 문자열 생성 ───
function buildMannequinSvg(outfitHex: Record<string, string>, outerType = 'coat', midType = 'knit'): string {
  const tc = outfitHex.top || '#ffffff'
  const bc = outfitHex.bottom || '#1e293b'
  const sc = outfitHex.shoes || '#ffffff'
  const oc = outfitHex.outer || null
  const mc = outfitHex.middleware || null
  const sf = outfitHex.scarf || null
  const ht = outfitHex.hat || null
  const hO = !!oc, hM = !!mc, hS = !!sf, hH = !!ht
  let slC = tc; if (hM && midType !== 'vest') slC = mc
  const dO = hO ? aB(oc, -15) : oc
  const dM = hM ? aB(mc, -10) : mc
  const SW = 1.5

  let s = '<svg viewBox="0 0 300 500" xmlns="http://www.w3.org/2000/svg">'
  // 목
  s += `<path d="M138 110 L138 140 L162 140 L162 110" fill="${SKIN}"/><path d="M138 115 Q150 120 162 115" fill="rgba(0,0,0,0.05)"/>`
  // 얼굴
  s += `<path d="M120 60 Q120 115 150 125 Q180 115 180 60 Q180 25 150 25 Q120 25 120 60" fill="${SKIN}"/>`
  s += `<path d="M116 75 Q112 80 116 85" fill="${SKIN}"/><path d="M184 75 Q188 80 184 85" fill="${SKIN}"/>`
  // 머리카락
  if (!hH) {
    s += `<path d="M115 50 Q110 30 150 20 Q190 30 185 50 L185 70 L180 60 L178 45 Q150 40 122 45 L120 60 L115 70 Z" fill="#2d2d2d"/>`
    s += `<path d="M115 50 C115 80,140 75,150 60 C160 75,185 80,185 50 C185 30,150 25,115 50" fill="#2d2d2d"/>`
  } else {
    s += `<path d="M118 60 L118 80 Q122 75 122 70 L122 60" fill="#2d2d2d"/><path d="M182 60 L182 80 Q178 75 178 70 L178 60" fill="#2d2d2d"/>`
  }
  // 얼굴 디테일
  s += `<path d="M128 70 Q135 68 142 70" fill="none" stroke="#a1887f" stroke-width="1.5" stroke-linecap="round"/>`
  s += `<path d="M158 70 Q165 68 172 70" fill="none" stroke="#a1887f" stroke-width="1.5" stroke-linecap="round"/>`
  s += `<circle cx="135" cy="78" r="1.5" fill="#5d4037"/><circle cx="165" cy="78" r="1.5" fill="#5d4037"/>`
  s += `<path d="M150 80 L148 88 L151 88" fill="none" stroke="#e0c0a0" stroke-width="1.5" stroke-linecap="round"/>`
  s += `<path d="M142 100 Q150 103 158 100" fill="none" stroke="#ccbfa3" stroke-width="1.5" stroke-linecap="round"/>`
  // 하의
  s += `<path d="M110 280 L105 460 L140 460 L145 330 L155 330 L160 460 L195 460 L190 280 Z" fill="${bc}" stroke="${gS(bc)}" stroke-width="${SW}"/>`
  s += `<line x1="150" y1="330" x2="150" y2="460" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>`
  // 신발
  s += `<path d="M100 460 Q95 485 120 485 L140 485 Q145 470 140 460 Z" fill="${sc}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>`
  s += `<path d="M160 460 Q155 470 180 485 L195 485 Q205 485 195 460 Z" fill="${sc}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>`
  // 이너(Top)
  s += `<path d="M100 140 L200 140 L190 300 L110 300 Z" fill="${tc}" stroke="${gS(tc)}" stroke-width="${SW}"/>`
  s += `<path d="M130 140 Q150 155 170 140" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="2"/>`
  // 팔 (아우터 없을 때)
  if (!hO) {
    s += `<path d="M92 140 L65 260 L95 270 L120 160 Z" fill="${slC}" stroke="${gS(slC)}" stroke-width="${SW}"/>`
    s += `<path d="M208 140 L235 260 L205 270 L180 160 Z" fill="${slC}" stroke="${gS(slC)}" stroke-width="${SW}"/>`
  }
  // 미들웨어
  if (hM && midType === 'knit') {
    s += `<path d="M95 140 L105 295 L195 295 L205 140 L175 140 Q150 165 125 140 Z" fill="${mc}" stroke="${gS(mc)}" stroke-width="${SW}"/>`
    s += `<path d="M100 200 Q150 205 200 200" fill="none" stroke="rgba(0,0,0,0.05)"/>`
    s += `<path d="M102 240 Q150 245 198 240" fill="none" stroke="rgba(0,0,0,0.05)"/>`
  }
  if (hM && midType === 'cardigan') {
    s += `<path d="M95 140 L105 295 L148 295 L148 220 L125 140 Z" fill="${mc}" stroke="${gS(mc)}" stroke-width="${SW}"/>`
    s += `<path d="M205 140 L195 295 L152 295 L152 220 L175 140 Z" fill="${mc}" stroke="${gS(mc)}" stroke-width="${SW}"/>`
    s += `<circle cx="158" cy="240" r="2.5" fill="${dM}" opacity="0.8"/><circle cx="158" cy="265" r="2.5" fill="${dM}" opacity="0.8"/>`
  }
  if (hM && midType === 'vest') {
    s += `<path d="M115 140 Q105 180 110 210 L110 285 L190 285 L190 210 Q195 180 185 140 L170 140 Q150 160 130 140 Z" fill="${mc}" stroke="${gS(mc)}" stroke-width="${SW}"/>`
    s += `<circle cx="150" cy="180" r="2" fill="rgba(0,0,0,0.2)"/><circle cx="150" cy="220" r="2" fill="rgba(0,0,0,0.2)"/>`
  }
  // 아우터 — 패딩
  if (hO && outerType === 'padding') {
    s += `<path d="M85 140 Q75 200 80 320 L125 320 L125 140 Z" fill="${oc}" stroke="${gS(oc)}" stroke-width="${SW}"/>`
    s += `<path d="M215 140 Q225 200 220 320 L175 320 L175 140 Z" fill="${oc}" stroke="${gS(oc)}" stroke-width="${SW}"/>`
    s += `<path d="M82 140 Q60 200 50 260 L95 270 L118 160 Z" fill="${oc}" stroke="${gS(oc)}" stroke-width="${SW}"/>`
    s += `<path d="M218 140 Q240 200 250 260 L205 270 L182 160 Z" fill="${oc}" stroke="${gS(oc)}" stroke-width="${SW}"/>`
    s += `<line x1="125" y1="140" x2="125" y2="320" stroke="rgba(0,0,0,0.2)"/><line x1="175" y1="140" x2="175" y2="320" stroke="rgba(0,0,0,0.2)"/>`
    s += `<path d="M82 180 Q100 185 125 180" stroke="rgba(0,0,0,0.15)" fill="none"/><path d="M175 180 Q200 185 218 180" stroke="rgba(0,0,0,0.15)" fill="none"/>`
    s += `<path d="M81 220 Q100 225 125 220" stroke="rgba(0,0,0,0.15)" fill="none"/><path d="M175 220 Q200 225 219 220" stroke="rgba(0,0,0,0.15)" fill="none"/>`
    s += `<path d="M80 260 Q100 265 125 260" stroke="rgba(0,0,0,0.15)" fill="none"/><path d="M175 260 Q200 265 220 260" stroke="rgba(0,0,0,0.15)" fill="none"/>`
  }
  // 아우터 — 자켓
  if (hO && outerType === 'jacket') {
    s += `<path d="M90 135 Q85 200 90 290 L125 290 L125 135 Z" fill="${oc}" stroke="${gS(oc)}" stroke-width="${SW}"/>`
    s += `<path d="M210 135 Q215 200 210 290 L175 290 L175 135 Z" fill="${oc}" stroke="${gS(oc)}" stroke-width="${SW}"/>`
    s += `<path d="M90 135 L60 260 L100 270 L120 160 Z" fill="${oc}" stroke="${gS(oc)}" stroke-width="${SW}"/>`
    s += `<path d="M210 135 L240 260 L200 270 L180 160 Z" fill="${oc}" stroke="${gS(oc)}" stroke-width="${SW}"/>`
    s += `<path d="M125 135 L125 200 Q115 180 108 160 Z" fill="${dO}" opacity="0.9"/>`
    s += `<path d="M175 135 L175 200 Q185 180 192 160 Z" fill="${dO}" opacity="0.9"/>`
    s += `<line x1="180" y1="190" x2="200" y2="188" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>`
    s += `<circle cx="182" cy="240" r="2" fill="rgba(0,0,0,0.2)"/><circle cx="182" cy="270" r="2" fill="rgba(0,0,0,0.2)"/>`
  }
  // 아우터 — 코트
  if (hO && outerType === 'coat') {
    s += `<path d="M90 135 Q80 160 85 250 L85 355 L125 355 L125 135 Z" fill="${oc}" stroke="${gS(oc)}" stroke-width="${SW}"/>`
    s += `<path d="M210 135 Q220 160 215 250 L215 355 L175 355 L175 135 Z" fill="${oc}" stroke="${gS(oc)}" stroke-width="${SW}"/>`
    s += `<path d="M90 135 L60 260 L100 270 L120 160 Z" fill="${oc}" stroke="${gS(oc)}" stroke-width="${SW}"/>`
    s += `<path d="M210 135 L240 260 L200 270 L180 160 Z" fill="${oc}" stroke="${gS(oc)}" stroke-width="${SW}"/>`
    s += `<path d="M125 135 L125 220 Q110 190 100 160 Z" fill="${dO}" opacity="0.9"/>`
    s += `<path d="M175 135 L175 220 Q190 190 200 160 Z" fill="${dO}" opacity="0.9"/>`
    s += `<line x1="95" y1="280" x2="115" y2="280" stroke="rgba(0,0,0,0.1)"/>`
    s += `<line x1="185" y1="280" x2="205" y2="280" stroke="rgba(0,0,0,0.1)"/>`
  }
  // 손
  s += `<circle cx="80" cy="275" r="10" fill="${SKIN}" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>`
  s += `<circle cx="220" cy="275" r="10" fill="${SKIN}" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>`
  // 목도리
  if (hS) {
    s += `<path d="M118 138 Q150 158 182 138 Q188 125 182 118 Q150 125 118 118 Q112 125 118 138" fill="${sf}" stroke="${gS(sf)}" stroke-width="${SW}"/>`
    s += `<path d="M145 145 Q140 180 142 220 L170 220 Q168 180 165 145 Z" fill="${sf}" stroke="${gS(sf)}" stroke-width="${SW}"/>`
    s += `<path d="M135 145 Q130 170 125 200 L145 205 Q150 170 155 145 Z" fill="${sf}" opacity="0.95" stroke="${gS(sf)}" stroke-width="${SW}"/>`
    s += `<path d="M135 135 Q150 155 165 135" fill="${sf}" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>`
  }
  // 모자
  if (hH) {
    s += `<path d="M120 55 Q120 10 150 10 Q180 10 180 55 L180 65 L120 65 Z" fill="${ht}" stroke="${gS(ht)}" stroke-width="${SW}"/>`
    s += `<rect x="118" y="55" width="64" height="15" rx="4" fill="${ht}" stroke="${gS(ht)}" stroke-width="${SW}"/>`
    s += `<line x1="130" y1="35" x2="130" y2="50" stroke="rgba(0,0,0,0.1)"/><line x1="150" y1="30" x2="150" y2="50" stroke="rgba(0,0,0,0.1)"/><line x1="170" y1="35" x2="170" y2="50" stroke="rgba(0,0,0,0.1)"/>`
  }
  s += '</svg>'
  return s
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image(); img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img); img.onerror = reject; img.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath()
}

async function renderCard(ctx: CanvasRenderingContext2D, data: ShareCardData, mannequinImg: HTMLImageElement, photoImg: HTMLImageElement) {
  const W = CARD_W, H = CARD_H
  ctx.clearRect(0, 0, W, H)
  const photoMargin = 60, photoX = photoMargin, photoY = photoMargin
  const photoW = W - photoMargin * 2, photoH = H - photoMargin * 2, cornerR = 40

  ctx.save()
  roundRect(ctx, photoX, photoY, photoW, photoH, cornerR)
  ctx.clip()
  const scale = Math.max(photoW / photoImg.width, photoH / photoImg.height)
  const sw = photoImg.width * scale, sh = photoImg.height * scale
  ctx.drawImage(photoImg, photoX + (photoW - sw) / 2, photoY + (photoH - sh) / 2, sw, sh)
  ctx.restore()

  const mannW = 180, mannH = mannequinImg.height * (mannW / mannequinImg.width)
  const mannX = photoX + 30, mannY = photoY + photoH - mannH - 80
  ctx.drawImage(mannequinImg, mannX, mannY, mannW, mannH)

  const textX = mannX, textY = photoY + photoH - 40
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.font = '500 28px "Outfit", "Pretendard", sans-serif'
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2
  ctx.fillText('Made By. Barupick', textX, textY)
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
}

export default function ShareCard({ data, onClose }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(true)

  const generate = useCallback(async () => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.width = CARD_W; canvas.height = CARD_H
    const ctx = canvas.getContext('2d')!
    setGenerating(true)

    try {
      const svgStr = buildMannequinSvg(data.outfitHex, data.outerType || 'coat', data.midType || 'knit')
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml' })
      const svgUrl = URL.createObjectURL(svgBlob)
      let mannequinImg: HTMLImageElement
      try { mannequinImg = await loadImage(svgUrl) } finally { URL.revokeObjectURL(svgUrl) }
      const photoImg = await loadImage(data.photoUrl)
      await renderCard(ctx, data, mannequinImg, photoImg)
      setImageUrl(canvas.toDataURL('image/png'))
    } catch (e) { console.error('ShareCard render error:', e) }
    finally { setGenerating(false) }
  }, [data])

  useEffect(() => { generate() }, [generate])

  const handleShare = async () => {
    if (!imageUrl) return
    try {
      const blob = await (await fetch(imageUrl)).blob()
      const file = new File([blob], 'barupick-coord.png', { type: 'image/png' })
      await navigator.share({ files: [file], title: '바루픽 코디' })
    } catch { handleDownload() }
  }

  const handleDownload = async () => {
    if (!imageUrl) return
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    if (isIOS) {
      // iOS: navigator.share로 "이미지 저장" 유도, 불가 시 새 탭에 이미지 열기
      try {
        const blob = await (await fetch(imageUrl)).blob()
        const file = new File([blob], `barupick-${Date.now()}.png`, { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] })
          return
        }
      } catch {}
      // fallback: 새 탭에서 이미지 열기 (길게 눌러서 저장)
      const w = window.open()
      if (w) {
        w.document.write(`<html><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000"><img src="${imageUrl}" style="max-width:100%;max-height:100vh;object-fit:contain"/><p style="position:fixed;bottom:20px;width:100%;text-align:center;color:#fff;font-size:14px;">이미지를 길게 눌러서 저장해주세요</p></body></html>`)
      }
    } else {
      // Android/Desktop: 기존 download 방식
      const a = document.createElement('a')
      a.href = imageUrl
      a.download = `barupick-${Date.now()}.png`
      a.click()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-[360px] mx-4 animate-screen-enter" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end mb-3">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white/70 active:scale-90 transition-transform"><X size={16} /></button>
        </div>
        <div className="flex justify-center mb-5">
          {generating ? (
            <div className="flex items-center justify-center rounded-2xl bg-warm-800/50" style={{ width: 240, height: 300 }}>
              <div className="w-6 h-6 border-2 border-terra-300 border-t-terra-500 rounded-full animate-spin" />
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} alt="공유 카드" className="rounded-2xl shadow-2xl" style={{ width: 240, height: 300, objectFit: 'contain', background: '#000' }} />
          ) : (
            <div className="text-white/50 text-sm py-20">생성 실패</div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleShare} disabled={generating}
            className="flex-1 py-3.5 bg-white text-warm-900 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50">
            <Share size={16} /> 공유하기
          </button>
          <button onClick={handleDownload} disabled={generating}
            className="py-3.5 px-5 bg-white/15 text-white rounded-2xl font-medium text-sm flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50">
            <Download size={16} />
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}

export function useShareCard() {
  const [open, setOpen] = useState(false)
  const [cardData, setCardData] = useState<ShareCardData | null>(null)
  const showShareCard = useCallback((data: ShareCardData) => { setCardData(data); setOpen(true) }, [])
  const hideShareCard = useCallback(() => { setOpen(false); setCardData(null) }, [])
  return { open, cardData, showShareCard, hideShareCard }
}
