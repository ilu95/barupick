import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Palette, Users, Calendar, Sparkles, ChevronRight } from 'lucide-react'

const SLIDES = [
  {
    emoji: '👕',
    icon: <Palette size={32} className="text-terra-500" />,
    title: '83가지 컬러로\n나만의 코디를 만들어요',
    desc: 'HCL 색상 이론 기반 AI가\n가장 어울리는 컬러 조합을 추천해요',
    bg: 'from-terra-50 to-warm-100',
  },
  {
    emoji: '📊',
    icon: <Sparkles size={32} className="text-terra-500" />,
    title: '퍼스널컬러 × 체형\n맞춤 추천',
    desc: '12계절 퍼스널컬러와 체형을 설정하면\n나에게 딱 맞는 코디를 받을 수 있어요',
    bg: 'from-amber-50 to-terra-50',
  },
  {
    emoji: '📝',
    icon: <Calendar size={32} className="text-terra-500" />,
    title: '매일 OOTD를\n기록하고 성장해요',
    desc: '오늘 입은 옷의 색상을 기록하고\n점수를 받으며 패션 감각을 키워요',
    bg: 'from-sky-50 to-warm-50',
  },
  {
    emoji: '👥',
    icon: <Users size={32} className="text-terra-500" />,
    title: '커뮤니티에서\n코디를 공유해요',
    desc: '다른 유저의 코디에서 영감을 받고\n나만의 스타일을 뽐내보세요',
    bg: 'from-green-50 to-warm-50',
  },
]

const SWIPE_THRESHOLD = 50 // px

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)

  // 스와이프 제스처
  const touchRef = useRef({ startX: 0, startY: 0, swiping: false })

  const goTo = useCallback((next: number, dir: 'left' | 'right') => {
    if (next < 0 || next >= SLIDES.length) return
    setDirection(dir)
    // 짧은 딜레이 후 step 변경 (CSS transition 트리거용)
    setTimeout(() => {
      setStep(next)
      setDirection(null)
    }, 150)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      swiping: true,
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current.swiping) return
    const dx = e.changedTouches[0].clientX - touchRef.current.startX
    const dy = e.changedTouches[0].clientY - touchRef.current.startY
    touchRef.current.swiping = false

    // 수평 스와이프만 처리 (수직보다 수평이 클 때)
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return

    if (dx < 0 && step < SLIDES.length - 1) {
      // 왼쪽 스와이프 → 다음
      goTo(step + 1, 'left')
    } else if (dx > 0 && step > 0) {
      // 오른쪽 스와이프 → 이전
      goTo(step - 1, 'right')
    }
  }, [step, goTo])

  const finish = () => {
    localStorage.setItem('sp_onboarded', '1')
    navigate('/home', { replace: true })
  }

  const slide = SLIDES[step]
  const isLast = step === SLIDES.length - 1

  // 슬라이드 전환 애니메이션 클래스
  const slideAnim = direction === 'left'
    ? 'opacity-0 -translate-x-8'
    : direction === 'right'
    ? 'opacity-0 translate-x-8'
    : 'opacity-100 translate-x-0'

  return (
    <div
      className="fixed inset-0 bg-[#F7F5F2] z-[500] flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-8 max-w-[480px] mx-auto w-full">

        {/* 슬라이드 컨텐츠 */}
        <div
          className={`w-full bg-gradient-to-b ${slide.bg} rounded-3xl p-8 mb-8 text-center transition-all duration-200 ease-out ${slideAnim}`}
          aria-live="polite"
        >
          <div className="text-6xl mb-5">{slide.emoji}</div>
          <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center mx-auto mb-5 shadow-warm-sm">
            {slide.icon}
          </div>
          <h2 className="font-display text-[22px] font-bold text-warm-900 tracking-tight leading-snug whitespace-pre-line mb-3">
            {slide.title}
          </h2>
          <p className="text-sm text-warm-600 leading-relaxed whitespace-pre-line">
            {slide.desc}
          </p>
        </div>

        {/* 도트 인디케이터 */}
        <div className="flex gap-2 mb-8" role="tablist" aria-label="온보딩 단계">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === step}
              aria-label={`${i + 1}단계`}
              onClick={() => goTo(i, i > step ? 'left' : 'right')}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-terra-500' : 'w-2 bg-warm-400'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="px-6 pb-10 max-w-[480px] mx-auto w-full">
        {isLast ? (
          <button
            onClick={finish}
            className="w-full py-4 bg-terra-500 text-white rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra"
          >
            시작하기 <Sparkles size={18} />
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={finish}
              className="px-6 py-4 bg-white border border-warm-400 text-warm-600 rounded-2xl font-medium text-sm active:scale-[0.98] transition-all"
            >
              건너뛰기
            </button>
            <button
              onClick={() => goTo(step + 1, 'left')}
              className="flex-1 py-4 bg-terra-500 text-white rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra"
            >
              다음 <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
