import { memo } from 'react'

export interface MannequinOutfit {
  outer?: string
  middleware?: string
  top?: string
  bottom?: string
  scarf?: string
  hat?: string
  shoes?: string
}

export interface MannequinOptions {
  outerType?: 'coat' | 'jacket' | 'padding'
  midType?: 'knit' | 'cardigan' | 'vest'
}

interface Props {
  outfit: MannequinOutfit
  options?: MannequinOptions
  size?: number
  className?: string
  style?: React.CSSProperties
}

// ─── 헬퍼 함수 ───

function getStroke(hex?: string): string {
  if (!hex) return 'rgba(0,0,0,0.3)'
  const h = hex.toLowerCase()
  return (h === '#ffffff' || h === '#fff' || h === '#fefce8')
    ? 'rgba(0,0,0,0.2)'
    : 'rgba(0,0,0,0.3)'
}

function adjustBrightness(hex: string | undefined, percent: number): string | undefined {
  if (!hex) return hex
  let r = parseInt(hex.substring(1, 3), 16)
  let g = parseInt(hex.substring(3, 5), 16)
  let b = parseInt(hex.substring(5, 7), 16)

  r = Math.floor(r * (1 + percent / 100))
  g = Math.floor(g * (1 + percent / 100))
  b = Math.floor(b * (1 + percent / 100))

  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))

  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return '#' + toHex(r) + toHex(g) + toHex(b)
}

const SKIN = '#ffe0bd'
const SW = 1.5

// ─── 마네킹 컴포넌트 ───

function MannequinSVGInner({ outfit, options = {}, size, className, style }: Props) {
  const outerType = options.outerType || 'coat'
  const midType = options.midType || 'knit'

  const topColor = outfit.top || '#ffffff'
  const bottomColor = outfit.bottom || '#1e293b'
  const middlewareColor = outfit.middleware
  const outerColor = outfit.outer
  const scarfColor = outfit.scarf
  const hatColor = outfit.hat
  const shoesColor = outfit.shoes || '#ffffff'

  const hasOuter = !!outerColor
  const hasMiddleware = !!middlewareColor
  const hasScarf = !!scarfColor
  const hasHat = !!hatColor

  let sleeveColor = topColor
  if (hasMiddleware && midType !== 'vest') {
    sleeveColor = middlewareColor!
  }

  const darkOuterColor = hasOuter ? adjustBrightness(outerColor, -15) : outerColor
  const darkMidColor = hasMiddleware ? adjustBrightness(middlewareColor, -10) : middlewareColor

  const wrapStyle: React.CSSProperties = {
    width: size ? `${size}px` : '100%',
    height: size ? 'auto' : '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  }

  return (
    <div className={className} style={wrapStyle}>
      <svg viewBox="0 0 300 500" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', objectFit: 'contain' }}>

        {/* 목 */}
        <path d="M138 110 L138 140 L162 140 L162 110" fill={SKIN} />
        <path d="M138 115 Q150 120 162 115" fill="rgba(0,0,0,0.05)" />

        {/* 얼굴 */}
        <path d="M120 60 Q120 115 150 125 Q180 115 180 60 Q180 25 150 25 Q120 25 120 60" fill={SKIN} />
        <path d="M116 75 Q112 80 116 85" fill={SKIN} />
        <path d="M184 75 Q188 80 184 85" fill={SKIN} />

        {/* 머리카락 */}
        {!hasHat ? (
          <g>
            <path d="M115 50 Q110 30 150 20 Q190 30 185 50 L185 70 L180 60 L178 45 Q150 40 122 45 L120 60 L115 70 Z" fill="#2d2d2d" />
            <path d="M115 50 C115 80, 140 75, 150 60 C160 75, 185 80, 185 50 C185 30, 150 25, 115 50" fill="#2d2d2d" />
          </g>
        ) : (
          <g>
            <path d="M118 60 L118 80 Q122 75 122 70 L122 60" fill="#2d2d2d" />
            <path d="M182 60 L182 80 Q178 75 178 70 L178 60" fill="#2d2d2d" />
          </g>
        )}

        {/* 얼굴 디테일 */}
        <path d="M128 70 Q135 68 142 70" fill="none" stroke="#a1887f" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M158 70 Q165 68 172 70" fill="none" stroke="#a1887f" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={135} cy={78} r={1.5} fill="#5d4037" />
        <circle cx={165} cy={78} r={1.5} fill="#5d4037" />
        <path d="M150 80 L148 88 L151 88" fill="none" stroke="#e0c0a0" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M142 100 Q150 103 158 100" fill="none" stroke="#ccbfa3" strokeWidth="1.5" strokeLinecap="round" />

        {/* 하의 */}
        <path d="M110 280 L105 460 L140 460 L145 330 L155 330 L160 460 L195 460 L190 280 Z" fill={bottomColor} stroke={getStroke(bottomColor)} strokeWidth={SW} />
        <line x1={150} y1={330} x2={150} y2={460} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />

        {/* 신발 */}
        <path d="M100 460 Q95 485 120 485 L140 485 Q145 470 140 460 Z" fill={shoesColor} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
        <path d="M160 460 Q155 470 180 485 L195 485 Q205 485 195 460 Z" fill={shoesColor} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />

        {/* 이너(Top) */}
        <g>
          <path d="M100 140 L200 140 L190 300 L110 300 Z" fill={topColor} stroke={getStroke(topColor)} strokeWidth={SW} />
          <path d="M130 140 Q150 155 170 140" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={2} />
        </g>

        {/* 팔 (아우터 없을 때) */}
        {!hasOuter && (
          <g>
            <path d="M92 140 L65 260 L95 270 L120 160 Z" fill={sleeveColor} stroke={getStroke(sleeveColor)} strokeWidth={SW} />
            <path d="M208 140 L235 260 L205 270 L180 160 Z" fill={sleeveColor} stroke={getStroke(sleeveColor)} strokeWidth={SW} />
          </g>
        )}

        {/* 미들웨어 */}
        {hasMiddleware && midType === 'knit' && (
          <g>
            <path d="M95 140 L105 295 L195 295 L205 140 L175 140 Q150 165 125 140 Z" fill={middlewareColor} stroke={getStroke(middlewareColor)} strokeWidth={SW} />
            <g fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth={1}>
              <path d="M100 200 Q150 205 200 200" />
              <path d="M102 240 Q150 245 198 240" />
            </g>
            <path d="M104 280 L196 280" stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
          </g>
        )}
        {hasMiddleware && midType === 'cardigan' && (
          <g>
            <path d="M95 140 L105 295 L148 295 L148 220 L125 140 Z" fill={middlewareColor} stroke={getStroke(middlewareColor)} strokeWidth={SW} />
            <path d="M205 140 L195 295 L152 295 L152 220 L175 140 Z" fill={middlewareColor} stroke={getStroke(middlewareColor)} strokeWidth={SW} />
            <circle cx={158} cy={240} r={2.5} fill={darkMidColor} opacity={0.8} />
            <circle cx={158} cy={265} r={2.5} fill={darkMidColor} opacity={0.8} />
            <circle cx={158} cy={290} r={2.5} fill={darkMidColor} opacity={0.8} />
          </g>
        )}
        {hasMiddleware && midType === 'vest' && (
          <g>
            <path d="M115 140 Q105 180 110 210 L110 285 L190 285 L190 210 Q195 180 185 140 L170 140 Q150 160 130 140 Z" fill={middlewareColor} stroke={getStroke(middlewareColor)} strokeWidth={SW} />
            <circle cx={150} cy={180} r={2} fill="rgba(0,0,0,0.2)" />
            <circle cx={150} cy={220} r={2} fill="rgba(0,0,0,0.2)" />
            <circle cx={150} cy={260} r={2} fill="rgba(0,0,0,0.2)" />
          </g>
        )}

        {/* 아우터 — 패딩 */}
        {hasOuter && outerType === 'padding' && (
          <g>
            <path d="M85 140 Q75 200 80 320 L125 320 L125 140 Z" fill={outerColor} stroke={getStroke(outerColor)} strokeWidth={SW} />
            <path d="M215 140 Q225 200 220 320 L175 320 L175 140 Z" fill={outerColor} stroke={getStroke(outerColor)} strokeWidth={SW} />
            <path d="M82 140 Q60 200 50 260 L95 270 L118 160 Z" fill={outerColor} stroke={getStroke(outerColor)} strokeWidth={SW} />
            <path d="M218 140 Q240 200 250 260 L205 270 L182 160 Z" fill={outerColor} stroke={getStroke(outerColor)} strokeWidth={SW} />
            <line x1={125} y1={140} x2={125} y2={320} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
            <line x1={175} y1={140} x2={175} y2={320} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
            <g stroke="rgba(0,0,0,0.15)" strokeWidth={1} fill="none">
              <path d="M82 180 Q100 185 125 180" /><path d="M175 180 Q200 185 218 180" />
              <path d="M81 220 Q100 225 125 220" /><path d="M175 220 Q200 225 219 220" />
              <path d="M80 260 Q100 265 125 260" /><path d="M175 260 Q200 265 220 260" />
            </g>
          </g>
        )}

        {/* 아우터 — 자켓 */}
        {hasOuter && outerType === 'jacket' && (
          <g>
            <path d="M90 135 Q85 200 90 290 L125 290 L125 135 Z" fill={outerColor} stroke={getStroke(outerColor)} strokeWidth={SW} />
            <path d="M210 135 Q215 200 210 290 L175 290 L175 135 Z" fill={outerColor} stroke={getStroke(outerColor)} strokeWidth={SW} />
            <path d="M90 135 L60 260 L100 270 L120 160 Z" fill={outerColor} stroke={getStroke(outerColor)} strokeWidth={SW} />
            <path d="M210 135 L240 260 L200 270 L180 160 Z" fill={outerColor} stroke={getStroke(outerColor)} strokeWidth={SW} />
            <path d="M125 135 L125 200 Q115 180 108 160 Z" fill={darkOuterColor} opacity={0.9} />
            <path d="M175 135 L175 200 Q185 180 192 160 Z" fill={darkOuterColor} opacity={0.9} />
            <line x1={180} y1={190} x2={200} y2={188} stroke="rgba(0,0,0,0.15)" strokeWidth={1.5} />
            <circle cx={182} cy={240} r={2} fill="rgba(0,0,0,0.2)" />
            <circle cx={182} cy={270} r={2} fill="rgba(0,0,0,0.2)" />
          </g>
        )}

        {/* 아우터 — 코트 (기본) */}
        {hasOuter && outerType === 'coat' && (
          <g>
            <path d="M90 135 Q80 160 85 250 L85 355 L125 355 L125 135 Z" fill={outerColor} stroke={getStroke(outerColor)} strokeWidth={SW} />
            <path d="M210 135 Q220 160 215 250 L215 355 L175 355 L175 135 Z" fill={outerColor} stroke={getStroke(outerColor)} strokeWidth={SW} />
            <path d="M90 135 L60 260 L100 270 L120 160 Z" fill={outerColor} stroke={getStroke(outerColor)} strokeWidth={SW} />
            <path d="M210 135 L240 260 L200 270 L180 160 Z" fill={outerColor} stroke={getStroke(outerColor)} strokeWidth={SW} />
            <path d="M125 135 L125 220 Q110 190 100 160 Z" fill={darkOuterColor} opacity={0.9} />
            <path d="M175 135 L175 220 Q190 190 200 160 Z" fill={darkOuterColor} opacity={0.9} />
            <line x1={95} y1={280} x2={115} y2={280} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
            <line x1={185} y1={280} x2={205} y2={280} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
          </g>
        )}

        {/* 손 */}
        <circle cx={80} cy={275} r={10} fill={SKIN} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
        <circle cx={220} cy={275} r={10} fill={SKIN} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />

        {/* 목도리 */}
        {hasScarf && (
          <g>
            <path d="M118 138 Q150 158 182 138 Q188 125 182 118 Q150 125 118 118 Q112 125 118 138" fill={scarfColor} stroke={getStroke(scarfColor)} strokeWidth={SW} />
            <path d="M145 145 Q140 180 142 220 L170 220 Q168 180 165 145 Z" fill={scarfColor} stroke={getStroke(scarfColor)} strokeWidth={SW} />
            <path d="M135 145 Q130 170 125 200 L145 205 Q150 170 155 145 Z" fill={scarfColor} opacity={0.95} stroke={getStroke(scarfColor)} strokeWidth={SW} />
            <path d="M135 135 Q150 155 165 135" fill={scarfColor} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
            <g stroke={scarfColor} strokeWidth={2} strokeLinecap="round">
              <line x1={144} y1={220} x2={144} y2={228} />
              <line x1={150} y1={220} x2={150} y2={230} />
              <line x1={156} y1={220} x2={156} y2={228} />
              <line x1={162} y1={220} x2={162} y2={230} />
              <line x1={127} y1={200} x2={127} y2={208} />
              <line x1={133} y1={202} x2={133} y2={210} />
              <line x1={140} y1={204} x2={140} y2={212} />
            </g>
          </g>
        )}

        {/* 모자 */}
        {hasHat && (
          <g>
            <path d="M120 55 Q120 10 150 10 Q180 10 180 55 L180 65 L120 65 Z" fill={hatColor} stroke={getStroke(hatColor)} strokeWidth={SW} />
            <rect x={118} y={55} width={64} height={15} rx={4} fill={hatColor} stroke={getStroke(hatColor)} strokeWidth={SW} />
            <line x1={130} y1={35} x2={130} y2={50} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
            <line x1={150} y1={30} x2={150} y2={50} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
            <line x1={170} y1={35} x2={170} y2={50} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
          </g>
        )}

      </svg>
    </div>
  )
}

// React.memo로 감싸서 동일 outfit/options일 때 리렌더링 방지
const MannequinSVG = memo(MannequinSVGInner, (prev, next) => {
  // outfit 객체의 각 키 비교
  const outfitKeys = ['outer', 'middleware', 'top', 'bottom', 'scarf', 'hat', 'shoes'] as const
  for (const k of outfitKeys) {
    if (prev.outfit[k] !== next.outfit[k]) return false
  }
  // options 비교
  if (prev.options?.outerType !== next.options?.outerType) return false
  if (prev.options?.midType !== next.options?.midType) return false
  if (prev.size !== next.size) return false
  return true
})

MannequinSVG.displayName = 'MannequinSVG'

export default MannequinSVG

// ─── 타입 라벨 (기존 코드 호환) ───
export const MID_TYPE_LABELS: Record<string, string> = { knit: '니트', cardigan: '가디건', vest: '베스트' }
export const OUTER_TYPE_LABELS: Record<string, string> = { coat: '코트', jacket: '자켓', padding: '패딩' }
