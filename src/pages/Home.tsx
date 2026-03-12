import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wand2, Palette, CloudSun, Bookmark, Scissors, Ruler, HelpCircle, ChevronRight, Flame, Calendar, Sparkles, Download, X, Droplets, Wind, Shirt } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { COLORS_60 } from '@/lib/colors'
import { useAuth } from '@/contexts/AuthContext'
import { usePWA } from '@/hooks/usePWA'
import { useWeather, weatherEmoji, weatherText, getLayerAdvice } from '@/hooks/useWeather'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useModal } from '@/components/ui/Modal'

import { profile as profileLib } from '@/lib/profile'

export default function Home() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const { canInstall, isInstalled, install } = usePWA()
  const { weather, loading: wLoading } = useWeather()
  const toast = useToast()
  const modal = useModal()
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  // 온보딩 체크
  useEffect(() => {
    if (!localStorage.getItem('sp_onboarded')) {
      navigate('/onboarding', { replace: true })
    }
  }, [])

  // 시간대별 인사
  const hour = new Date().getHours()
  const greeting = hour < 12 ? '좋은 아침' : hour < 18 ? '좋은 오후' : '좋은 저녁'
  const userName = profile?.nickname || ''
  const greetingText = userName ? `${greeting}, ${userName}님` : greeting

  // 날씨 기반 배경 그라데이션
  const weatherGradient = weather ? (
    weather.code === 0 ? 'from-amber-50 to-sky-50' :
    weather.code <= 3 ? 'from-sky-50 to-blue-50' :
    weather.code <= 48 ? 'from-gray-100 to-slate-100' :
    weather.code <= 67 ? 'from-blue-50 to-indigo-50' :
    'from-slate-100 to-blue-100'
  ) : 'from-warm-100 to-warm-50'

  const advice = weather ? getLayerAdvice(weather.feels) : null

  // 최근 OOTD 기록
  const recentOotd = useMemo(() => {
    try {
      const records = JSON.parse(localStorage.getItem('sp_ootd_records') || '[]')
      return records[0] || null
    } catch { return null }
  }, [])

  return (
    <div className="animate-screen-fade px-5 pt-[18px] pb-10">
      {/* 인사 */}
      <div className="pb-4">
        <h1 className="font-display text-[clamp(22px,5.5vw,28px)] font-bold tracking-tight text-warm-900 dark:text-warm-100 leading-tight mb-3">
          {greetingText}
        </h1>

        {/* 피드백 + 베타 테스터 */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setFeedbackOpen(true)} className="inline-flex items-center gap-1 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-full px-3 py-1.5 text-[11px] font-semibold text-warm-600 dark:text-warm-400 active:scale-95 transition-all shadow-warm-sm">
            💬 피드백
          </button>
          <a href="https://forms.gle/b7xpZUhKYVhi5kXY7" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-gradient-to-r from-terra-500 to-terra-600 rounded-full px-3 py-1.5 text-[11px] font-bold text-white active:scale-95 transition-all shadow-terra no-underline">
            🔥 베타 테스터 신청
          </a>
        </div>

        {/* 날씨 카드 */}
        {weather ? (
          <button
            onClick={() => navigate('/home/weather')}
            className={`w-full bg-gradient-to-br ${weatherGradient} dark:from-warm-800 dark:to-warm-700 border border-warm-300 dark:border-warm-600 rounded-2xl p-4 text-left shadow-warm-sm active:scale-[0.98] transition-all mb-3`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{weatherEmoji(weather.code)}</span>
                <div>
                  <span className="font-display text-2xl font-bold text-warm-900 dark:text-warm-100">{weather.temp}°</span>
                  <span className="text-xs text-warm-500 dark:text-warm-400 ml-1.5">체감 {weather.feels}°</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] text-warm-500 dark:text-warm-400">
                <span className="flex items-center gap-0.5"><Droplets size={11} />{weather.humidity}%</span>
                <span className="flex items-center gap-0.5"><Wind size={11} />{weather.wind}km/h</span>
              </div>
            </div>
            {advice && (
              <div className="flex items-center gap-2 bg-white/60 dark:bg-warm-900/40 rounded-xl px-3 py-2">
                <span className="text-sm">{advice.emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-warm-800 dark:text-warm-200">{advice.title}</span>
                  <span className="text-[11px] text-warm-500 dark:text-warm-400 ml-1.5">{advice.desc}</span>
                </div>
                <ChevronRight size={14} className="text-warm-400 flex-shrink-0" />
              </div>
            )}
          </button>
        ) : (
          <button onClick={() => navigate('/home/weather')} className="w-full flex items-center gap-2 bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl px-4 py-3.5 text-sm text-warm-500 dark:text-warm-400 shadow-warm-sm active:scale-[0.98] transition-all mb-3">
            <CloudSun size={16} /> {wLoading ? '날씨 불러오는 중...' : '위치 허용하면 날씨 추천을 받을 수 있어요'}
          </button>
        )}

        {/* 최근 OOTD or 기록 유도 */}
        {recentOotd ? (() => {
          const outfitHex: Record<string, string> = {}
          Object.entries(recentOotd.colors || {}).forEach(([k, v]) => {
            if (v) { const c = COLORS_60[v as string]; if (c) outfitHex[k] = c.hex }
          })
          const d = new Date(recentOotd.date)
          const dayLabel = d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
          return (
            <button onClick={() => navigate(`/closet/ootd/${recentOotd.date}?id=${recentOotd.id}`)} className="w-full flex items-center gap-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl px-4 py-3 shadow-warm-sm active:scale-[0.98] transition-all">
              <MannequinSVG outfit={outfitHex} size={44} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-warm-900 dark:text-warm-100">최근 기록 · {dayLabel}</div>
                <div className="text-[11px] text-warm-500 dark:text-warm-400 mt-0.5">{recentOotd.score}점{recentOotd.situation ? ` · ${recentOotd.situation}` : ''}</div>
              </div>
              <div className="flex gap-1">
                {Object.values(recentOotd.colors || {}).filter(Boolean).slice(0, 4).map((ck, i) => {
                  const c = COLORS_60[ck as string]
                  return c ? <div key={i} className="w-3.5 h-3.5 rounded-full border border-warm-300" style={{ background: c.hex }} /> : null
                })}
              </div>
              <ChevronRight size={14} className="text-warm-400 flex-shrink-0" />
            </button>
          )
        })() : (
          <button onClick={() => navigate('/record')} className="inline-flex items-center gap-1.5 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-full px-3.5 py-2 text-sm text-warm-600 dark:text-warm-400 shadow-warm-sm active:scale-[0.97] transition-all">
            <Calendar size={16} /> 오늘 첫 기록을 남겨보세요
          </button>
        )}
      </div>

      {/* 퍼스널컬러 미설정 배너 — 설정 완료 시 숨김 */}
      {!profileLib.getPersonalColor() && (
        <button onClick={() => navigate('/profile/personal-color')} className="w-full flex items-center gap-3 bg-terra-100 border border-terra-200 rounded-2xl px-4 py-3.5 mb-5 text-left active:scale-[0.98] transition-all">
          <div className="w-10 h-10 rounded-xl bg-terra-200 flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-terra-600" />
          </div>
          <span className="text-sm text-terra-700 leading-snug flex-1">퍼스널컬러를 설정하면 더 정확한 추천을 받을 수 있어요</span>
          <ChevronRight size={16} className="text-terra-600 flex-shrink-0" />
        </button>
      )}

      <div className="h-px bg-warm-400 mb-5" />

      {/* 오늘 뭐 입지? — 항상 표시, 아이템 부족 시 비활성화 */}
      {(() => {
        const wardrobeCount = (() => { try { return JSON.parse(localStorage.getItem('sp_wardrobe') || '[]').length } catch { return 0 } })()
        const enabled = wardrobeCount >= 3
        const needed = Math.max(0, 3 - wardrobeCount)
        return (
          <button
            onClick={() => enabled ? navigate('/home/today') : navigate('/closet/add')}
            className={`group w-full border-[1.5px] rounded-2xl p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all shadow-warm-sm mb-4 ${
              enabled
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-warm-800 dark:to-warm-700 border-amber-300 dark:border-amber-700'
                : 'bg-warm-100 dark:bg-warm-800 border-warm-300 dark:border-warm-600 opacity-80'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${enabled ? 'bg-amber-200 dark:bg-amber-800' : 'bg-warm-300 dark:bg-warm-700'}`}>
              <Shirt size={26} className={enabled ? 'text-amber-700 dark:text-amber-300' : 'text-warm-500 dark:text-warm-400'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-display text-lg font-bold tracking-tight ${enabled ? 'text-amber-800 dark:text-amber-200' : 'text-warm-700 dark:text-warm-300'}`}>오늘 뭐 입지?</div>
              <div className="text-sm text-warm-600 dark:text-warm-400 mt-0.5">
                {enabled ? '내 옷장에서 AI가 골라주는 코디' : `옷장에 아이템 ${needed}개 더 등록하면 사용할 수 있어요`}
              </div>
            </div>
            <ChevronRight size={18} className={`flex-shrink-0 ${enabled ? 'text-amber-600 dark:text-amber-400' : 'text-warm-400'}`} />
          </button>
        )
      })()}

      {/* 메인 CTA */}
      <div className="flex flex-col gap-3 mb-6">
        {/* 히어로 — 코디 추천받기 */}
        <button onClick={() => navigate('/home/recommend')} className="group w-full bg-gradient-to-br from-terra-50 to-terra-100 border-[1.5px] border-terra-300 rounded-2xl p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all shadow-warm-sm hover:shadow-warm">
          <div className="w-14 h-14 rounded-2xl bg-terra-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Wand2 size={26} className="text-terra-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg font-bold text-terra-700 tracking-tight">코디 추천받기</div>
            <div className="text-sm text-warm-600 mt-0.5">AI가 분석하는 오늘의 컬러 조합</div>
          </div>
          <ChevronRight size={18} className="text-terra-600 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* 직접 만들기 */}
        <button onClick={() => navigate('/home/build')} className="group w-full bg-white border border-warm-400 rounded-2xl p-4 flex items-center gap-3.5 text-left active:scale-[0.98] transition-all shadow-warm-sm hover:shadow-warm">
          <div className="w-11 h-11 rounded-xl bg-warm-300 flex items-center justify-center flex-shrink-0">
            <Palette size={20} className="text-warm-800" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-warm-900 tracking-tight">직접 만들기</div>
            <div className="text-xs text-warm-600 mt-0.5">내 조합의 점수를 확인해보세요</div>
          </div>
          <ChevronRight size={16} className="text-warm-500 flex-shrink-0 opacity-50" />
        </button>

        {/* 하단 2열 */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/home/weather')} className="group bg-white border border-warm-400 rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.97] transition-all shadow-warm-sm hover:shadow-warm">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
              <CloudSun size={18} className="text-sky-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-warm-900">날씨 코디</div>
              <div className="text-[11px] text-warm-500 mt-0.5">오늘 기온에 맞는</div>
            </div>
          </button>

          <button onClick={() => navigate('/home/saved')} className="group bg-white border border-warm-400 rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.97] transition-all shadow-warm-sm hover:shadow-warm">
            <div className="w-10 h-10 rounded-xl bg-warm-300 flex items-center justify-center flex-shrink-0">
              <Bookmark size={18} className="text-warm-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-warm-900">저장한 코디</div>
              <div className="text-[11px] text-warm-500 mt-0.5">즐겨찾기</div>
            </div>
          </button>
        </div>
      </div>

      {/* 가이드 섹션 */}
      <div className="mb-5">
        <div className="text-xs font-semibold text-warm-600 tracking-widest uppercase mb-3 flex items-center gap-1.5">
          가이드
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <button onClick={() => navigate('/home/fabric')} className="bg-white border border-warm-400 rounded-2xl py-5 px-2 text-center shadow-warm-sm active:scale-[0.97] transition-all hover:shadow-warm">
            <Scissors size={24} className="text-terra-600 mx-auto mb-2" />
            <div className="text-[13px] font-medium text-warm-800">소재 가이드</div>
          </button>
          <button onClick={() => navigate('/home/body')} className="bg-white border border-warm-400 rounded-2xl py-5 px-2 text-center shadow-warm-sm active:scale-[0.97] transition-all hover:shadow-warm">
            <Ruler size={24} className="text-terra-600 mx-auto mb-2" />
            <div className="text-[13px] font-medium text-warm-800">체형별 코디</div>
          </button>
          <button onClick={() => navigate('/home/quiz')} className="bg-white border border-warm-400 rounded-2xl py-5 px-2 text-center shadow-warm-sm active:scale-[0.97] transition-all hover:shadow-warm">
            <HelpCircle size={24} className="text-terra-600 mx-auto mb-2" />
            <div className="text-[13px] font-medium text-warm-800">퀴즈</div>
          </button>
        </div>
      </div>

      {/* PWA 설치 배너 — 미설치 상태일 때 표시 (설치 완료 또는 사용자 닫기 시 숨김) */}
      {!isInstalled && !localStorage.getItem('sp_pwa_dismissed') && (
        <div className="bg-white dark:bg-warm-800 border border-terra-200 dark:border-terra-700 rounded-2xl p-4 flex items-center gap-3 shadow-warm-sm animate-slide-up relative">
          <div className="w-10 h-10 rounded-xl bg-terra-100 dark:bg-terra-900/30 flex items-center justify-center flex-shrink-0">
            <Download size={20} className="text-terra-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">홈 화면에 추가</div>
            <div className="text-[11px] text-warm-600 dark:text-warm-400">앱처럼 빠르게 실행할 수 있어요</div>
          </div>
          {canInstall ? (
            <button onClick={install} className="px-3.5 py-1.5 bg-terra-500 text-white rounded-full text-[11px] font-semibold active:scale-95 transition-all shadow-terra flex-shrink-0">
              설치
            </button>
          ) : (
            <button onClick={() => { modal.alert({ title: '홈 화면에 추가', message: '브라우저 메뉴(⋮)에서 "홈 화면에 추가"를 선택해주세요.' }); localStorage.setItem('sp_pwa_dismissed', '1') }} className="px-3.5 py-1.5 bg-terra-500 text-white rounded-full text-[11px] font-semibold active:scale-95 transition-all shadow-terra flex-shrink-0">
              방법 보기
            </button>
          )}
          <button onClick={() => { localStorage.setItem('sp_pwa_dismissed', '1'); window.location.reload() }} className="absolute top-2 right-2 w-5 h-5 rounded-full bg-warm-200 dark:bg-warm-700 text-warm-500 text-[10px] flex items-center justify-center">✕</button>
        </div>
      )}

      {/* 피드백 모달 */}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} userId={user?.id} />}
    </div>
  )
}

// ─── 피드백 모달 ───
function FeedbackModal({ onClose, userId }: { onClose: () => void, userId?: string }) {
  const toast = useToast()
  const [type, setType] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const types = [
    { key: 'bug', label: '🐛 버그' },
    { key: 'feature', label: '✨ 기능 요청' },
    { key: 'design', label: '🎨 디자인' },
    { key: 'other', label: '💡 기타' },
  ]

  const submit = async () => {
    if (!type || !message.trim()) { toast.error('유형과 내용을 입력해주세요'); return }
    setSending(true)
    try {
      await supabase.from('feedbacks').insert({ user_id: userId || null, type, message: message.trim(), screen: 'home' })
      toast.success('소중한 의견 감사합니다!')
      onClose()
    } catch (e: any) {
      toast.error('전송 실패: ' + (e.message || ''))
    } finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[300] flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-[480px] bg-white dark:bg-warm-800 rounded-t-3xl p-6 pb-8 animate-screen-enter" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-warm-400 rounded-full mx-auto mb-5" />
        <h3 className="font-display text-lg font-bold text-warm-900 dark:text-warm-100 mb-4">피드백 보내기</h3>
        <div className="flex gap-2 mb-4">
          {types.map(t => (
            <button key={t.key} onClick={() => setType(t.key)} className={`px-3.5 py-2 rounded-full text-[12px] font-medium transition-all ${type === t.key ? 'bg-terra-500 text-white' : 'bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-300 active:scale-95'}`}>{t.label}</button>
          ))}
        </div>
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="의견을 자유롭게 작성해주세요 (최대 1000자)" maxLength={1000}
          className="w-full h-32 px-4 py-3 bg-warm-100 dark:bg-warm-700 border border-warm-400 dark:border-warm-600 rounded-2xl text-sm text-warm-900 dark:text-warm-100 placeholder-warm-500 focus:outline-none focus:border-terra-400 resize-none mb-4" />
        <button onClick={submit} disabled={sending} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra disabled:opacity-50">
          {sending ? '보내는 중...' : '보내기'}
        </button>
      </div>
    </div>
  )
}
