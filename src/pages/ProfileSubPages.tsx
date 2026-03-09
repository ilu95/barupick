// @ts-nocheck
// ================================================================
// ProfileSubPages.tsx — 프로필 하위 페이지 모음
// MyLevel, MyBadges, ColorRanking, ColorPattern, Challenges, TitleExam, MyPosts, Insights
// ================================================================
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Award, Palette, Target, GraduationCap, ScanLine, Star, ChevronRight, FileText, TrendingUp, Eye, Heart, Bookmark, ArrowLeft, Check, Gift, Trophy } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { COLORS_60 } from '@/lib/colors'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { gamification } from '@/lib/gamification'

// @ts-nocheck

// ─── 내 레벨 ───
export function MyLevel() {
  // @ts-ignore
  const lv = gamification.getLevel ? gamification.getLevel() : { level: 1, name: '입문자', progress: 0, currentXp: 0, nextXp: 100 }
  const circumference = 2 * Math.PI * 52
  const offset = circumference * (1 - lv.progress / 100)

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <div className="text-center mb-6">
        <div className="relative w-[140px] h-[140px] mx-auto mb-4">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx={60} cy={60} r={52} fill="none" stroke="#E7E5E4" strokeWidth={10} />
            <circle cx={60} cy={60} r={52} fill="none" stroke="#C2785C" strokeWidth={10} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl font-bold text-warm-900">{lv.level}</span>
            <span className="text-xs text-warm-600">{lv.name}</span>
          </div>
        </div>
        <div className="text-sm text-warm-600">경험치 {lv.currentXp || 0} / {lv.nextXp || 100}</div>
        <div className="h-2 bg-warm-300 rounded-full mt-2 max-w-[200px] mx-auto"><div className="h-full bg-terra-500 rounded-full transition-all" style={{ width: `${lv.progress}%` }} /></div>
      </div>
      <div className="bg-white border border-warm-400 rounded-2xl p-4 shadow-warm-sm">
        <div className="text-xs font-semibold text-warm-600 uppercase tracking-wider mb-3">경험치 획득 방법</div>
        {[['OOTD 기록', '+20 XP'], ['코디 만들기', '+15 XP'], ['커뮤니티 공유', '+25 XP'], ['좋아요 받기', '+5 XP'], ['배지 획득', '+50 XP']].map(([label, xp]) => (
          <div key={label} className="flex items-center justify-between py-2.5 border-b border-warm-300 last:border-0">
            <span className="text-sm text-warm-800">{label}</span>
            <span className="text-xs font-semibold text-terra-600">{xp}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 배지 컬렉션 ───
export function MyBadges() {
  // @ts-ignore
  const badges = gamification.getBadges ? gamification.getBadges() : []

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-1">배지 컬렉션</h2>
      <p className="text-sm text-warm-600 mb-5">{badges.filter((b: any) => b.earned).length}/{badges.length}개 획득</p>
      <div className="grid grid-cols-3 gap-2.5">
        {badges.map((badge: any) => (
          <div key={badge.id} className={`bg-white border rounded-2xl p-4 text-center shadow-warm-sm ${badge.earned ? 'border-terra-300' : 'border-warm-400 opacity-50'}`}>
            <div className="text-3xl mb-2">{badge.icon || '🏅'}</div>
            <div className="text-[12px] font-semibold text-warm-900">{badge.name}</div>
            <div className="text-[10px] text-warm-500 mt-0.5">{badge.description}</div>
            {badge.earned && <div className="text-[9px] text-terra-600 font-medium mt-1">획득 ✓</div>}
          </div>
        ))}
      </div>
      {badges.length === 0 && <div className="text-center py-16"><Award size={40} className="text-warm-400 mx-auto mb-3" /><div className="text-sm text-warm-600">OOTD를 기록하면 배지를 획득할 수 있어요</div></div>}
    </div>
  )
}

// ─── 컬러 랭킹 ───
export function ColorRanking() {
  const records = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('sp_ootd_records') || '[]') } catch { return [] }
  }, [])

  const colorCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    records.forEach((r: any) => {
      Object.values(r.colors || {}).forEach(ck => { if (ck) counts[ck as string] = (counts[ck as string] || 0) + 1 })
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20)
  }, [records])

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-1">컬러 랭킹</h2>
      <p className="text-sm text-warm-600 mb-5">내가 가장 많이 입은 색상</p>
      {colorCounts.length > 0 ? (
        <div className="flex flex-col gap-2">
          {colorCounts.map(([ck, count], idx) => {
            const c = COLORS_60[ck]
            if (!c) return null
            const maxCount = colorCounts[0][1]
            return (
              <div key={ck} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-bold text-warm-600">{idx + 1}</span>
                <span className="w-8 h-8 rounded-lg border border-warm-400 flex-shrink-0" style={{ background: c.hex }} />
                <div className="flex-1"><div className="text-sm font-medium text-warm-900">{c.name}</div>
                  <div className="h-1.5 bg-warm-300 rounded-full mt-1"><div className="h-full bg-terra-500 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} /></div>
                </div>
                <span className="text-xs font-semibold text-warm-600">{count}회</span>
              </div>
            )
          })}
        </div>
      ) : <div className="text-center py-16"><Palette size={40} className="text-warm-400 mx-auto mb-3" /><div className="text-sm text-warm-600">OOTD를 기록하면 컬러 랭킹을 볼 수 있어요</div></div>}
    </div>
  )
}

// ─── 색상 패턴 분석 ───
export function ColorPattern() {
  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-1">색상 패턴 분석</h2>
      <p className="text-sm text-warm-600 mb-5">내 컬러 DNA를 분석합니다</p>
      <div className="text-center py-12"><ScanLine size={48} className="text-terra-500 mx-auto mb-4" /><div className="text-sm text-warm-600">10개 이상 기록하면 분석을 시작할 수 있어요</div></div>
    </div>
  )
}

// ─── 주간 챌린지 ───
export function Challenges() {
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState<any[]>([])
  const [claimedMsg, setClaimedMsg] = useState('')

  useEffect(() => {
    try { setChallenges(gamification.getWeeklyChallenges()) } catch { setChallenges([]) }
  }, [])

  const reload = () => {
    try { setChallenges(gamification.getWeeklyChallenges()) } catch {}
  }

  const handleClaim = (ch: any) => {
    if (!ch.completed || ch.claimed) return
    const ok = gamification.claimChallenge(ch.cKey)
    if (ok) {
      setClaimedMsg(`${ch.name} 보상 획득! +${20}XP`)
      // XP 추가
      try {
        const gd = JSON.parse(localStorage.getItem('sp_gamification') || '{}')
        gd.totalXp = (gd.totalXp || 0) + 20
        localStorage.setItem('sp_gamification', JSON.stringify(gd))
      } catch {}
      reload()
      setTimeout(() => setClaimedMsg(''), 2500)
    }
  }

  const completedCount = challenges.filter(c => c.completed).length

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">주간 챌린지</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-2">{completedCount}/{challenges.length}개 완료</p>

      {claimedMsg && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2.5 text-sm font-medium text-green-700 dark:text-green-400 animate-screen-fade">
          🎉 {claimedMsg}
        </div>
      )}

      {/* 전체 진행률 */}
      <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 mb-5 shadow-warm-sm">
        <div className="flex justify-between text-xs text-warm-600 dark:text-warm-400 mb-2">
          <span>이번 주 진행률</span>
          <span className="font-display font-bold">{completedCount}/{challenges.length}</span>
        </div>
        <div className="h-2.5 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden">
          <div className="h-full bg-terra-500 rounded-full transition-all duration-500" style={{ width: `${challenges.length > 0 ? (completedCount / challenges.length) * 100 : 0}%` }} />
        </div>
      </div>

      {challenges.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {challenges.map((ch: any, idx: number) => {
            const pct = ch.target > 0 ? Math.round((ch.progress / ch.target) * 100) : 0
            return (
              <div key={idx} className={`bg-white dark:bg-warm-800 border rounded-2xl p-4 shadow-warm-sm transition-all ${ch.completed ? 'border-green-300 dark:border-green-800' : 'border-warm-400 dark:border-warm-600'}`}>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${ch.completed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-warm-200 dark:bg-warm-700'}`}>
                    {ch.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{ch.name}</div>
                    <div className="text-[11px] text-warm-500 dark:text-warm-400 mt-0.5">{ch.desc}</div>
                  </div>
                  <span className="text-xs font-display font-bold text-warm-600 dark:text-warm-400 flex-shrink-0">{ch.progress}/{ch.target}</span>
                </div>
                {/* 진행률 바 */}
                <div className="h-2 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full transition-all duration-500 ${ch.completed ? 'bg-green-500' : 'bg-terra-400'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                {/* 보상 버튼 */}
                {ch.completed && !ch.claimed && (
                  <button onClick={() => handleClaim(ch)} className="w-full py-2.5 bg-terra-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-terra">
                    <Gift size={14} /> 보상 받기 (+20 XP)
                  </button>
                )}
                {ch.claimed && (
                  <div className="text-center text-[11px] text-green-600 dark:text-green-400 font-medium py-1">✓ 보상 수령 완료</div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Target size={40} className="text-warm-400 mx-auto mb-3" />
          <div className="text-sm text-warm-600 dark:text-warm-400">이번 주 챌린지를 불러올 수 없어요</div>
        </div>
      )}

      <button onClick={() => navigate('/record')} className="w-full py-3.5 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-800 dark:text-warm-200 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 mt-5 active:scale-[0.98] transition-all">
        OOTD 기록하러 가기
      </button>
    </div>
  )
}

// ─── 칭호 시험 ───
export function TitleExam() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'list' | 'play' | 'result'>('list')
  const [examId, setExamId] = useState<string | null>(null)
  const [qStep, setQStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [score, setScore] = useState(0)
  const [passed, setPassed] = useState(false)

  const exams = gamification.TITLE_EXAMS || []
  const results = gamification.getTitleResults?.() || []

  const startExam = (id: string) => {
    setExamId(id)
    setQStep(0)
    setAnswers([])
    setStep('play')
  }

  const answerQuestion = (ansIdx: number) => {
    const exam = exams.find(e => e.id === examId)
    if (!exam) return
    const newAnswers = [...answers, ansIdx]
    setAnswers(newAnswers)

    if (qStep < exam.questions.length - 1) {
      setQStep(qStep + 1)
    } else {
      // 채점
      let sc = 0
      exam.questions.forEach((q, i) => { if (newAnswers[i] === q.ans) sc++ })
      const pass = sc >= exam.minScore
      setScore(sc)
      setPassed(pass)
      gamification.saveTitleResult(exam.id, sc, pass)
      setStep('result')
    }
  }

  // 1단계: 시험 목록
  if (step === 'list') {
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">칭호 시험</h2>
        <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">컬러 지식을 테스트하고 칭호를 획득하세요</p>

        <div className="flex flex-col gap-2.5">
          {exams.map((exam) => {
            const prev = results.find(r => r.id === exam.id)
            return (
              <button key={exam.id} onClick={() => startExam(exam.id)} className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 shadow-warm-sm text-left active:scale-[0.98] transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${prev?.passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-terra-100 dark:bg-terra-900/30'}`}>
                    {exam.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{exam.name}</div>
                    <div className="text-[11px] text-warm-500 dark:text-warm-400 mt-0.5">{exam.desc} · {exam.questions.length}문제 · {exam.minScore}점 이상 합격</div>
                    {prev && (
                      <div className={`text-[10px] font-medium mt-1 ${prev.passed ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {prev.passed ? `✓ 합격 (${prev.score}/${exam.questions.length})` : `✕ 불합격 (${prev.score}/${exam.questions.length}) — 재도전 가능`}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-warm-400 flex-shrink-0" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 2단계: 퀴즈 플레이
  if (step === 'play') {
    const exam = exams.find(e => e.id === examId)
    if (!exam) return null
    const q = exam.questions[qStep]
    const progress = ((qStep + 1) / exam.questions.length) * 100

    return (
      <div className="animate-screen-enter px-5 pt-2 pb-10">
        <button onClick={() => setStep('list')} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70">
          <ArrowLeft size={16} /> 시험 목록
        </button>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-warm-700 dark:text-warm-300">{exam.icon} {exam.name}</span>
          <span className="text-sm font-display font-bold text-terra-600 dark:text-terra-400">{qStep + 1} / {exam.questions.length}</span>
        </div>

        <div className="h-2 bg-warm-300 dark:bg-warm-700 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-terra-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-5 mb-5 shadow-warm-sm">
          <div className="text-base font-semibold text-warm-900 dark:text-warm-100 leading-relaxed">{q.q}</div>
        </div>

        <div className="flex flex-col gap-2.5">
          {q.opts.map((opt, i) => (
            <button key={i} onClick={() => answerQuestion(i)} className="w-full bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl px-5 py-4 text-left text-sm text-warm-800 dark:text-warm-200 font-medium active:scale-[0.98] active:border-terra-400 transition-all shadow-warm-sm hover:border-terra-300">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-warm-200 dark:bg-warm-700 text-xs font-bold text-warm-600 dark:text-warm-400 mr-3">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 3단계: 결과
  const exam = exams.find(e => e.id === examId)
  if (!exam) return null

  return (
    <div className="animate-screen-enter px-5 pt-2 pb-10">
      <div className="text-center py-8">
        <div className="text-5xl mb-4">{passed ? '🎉' : '😅'}</div>
        <h2 className="font-display text-2xl font-bold text-warm-900 dark:text-warm-100 mb-2">{passed ? '합격!' : '아쉬워요'}</h2>
        <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">
          {exam.questions.length}문제 중 {score}문제 정답 {passed ? `— ${exam.name} 칭호 획득!` : `— ${exam.minScore}문제 이상 맞아야 합격`}
        </p>

        {/* 점수 원형 */}
        <div className="relative w-[120px] h-[120px] mx-auto mb-5">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx={60} cy={60} r={52} fill="none" stroke="#E7E5E4" strokeWidth={8} />
            <circle cx={60} cy={60} r={52} fill="none" stroke={passed ? '#6B9E76' : '#C2785C'} strokeWidth={8}
              strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - score / exam.questions.length)} strokeLinecap="round" className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-bold text-warm-900 dark:text-warm-100">{score}</span>
            <span className="text-[10px] text-warm-600 dark:text-warm-400">/ {exam.questions.length}</span>
          </div>
        </div>

        {/* 문제별 정답 확인 */}
        <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 mb-5 shadow-warm-sm text-left">
          <div className="text-xs font-semibold text-warm-500 dark:text-warm-400 uppercase tracking-widest mb-3">문제별 결과</div>
          {exam.questions.map((q, i) => {
            const correct = answers[i] === q.ans
            return (
              <div key={i} className={`flex items-start gap-2.5 py-2.5 ${i < exam.questions.length - 1 ? 'border-b border-warm-300 dark:border-warm-700' : ''}`}>
                <span className={`text-xs font-bold mt-0.5 ${correct ? 'text-green-600' : 'text-red-500'}`}>{correct ? '○' : '✕'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-warm-800 dark:text-warm-200 leading-relaxed">{q.q}</div>
                  {!correct && (
                    <div className="text-[11px] text-green-600 dark:text-green-400 mt-0.5">정답: {q.opts[q.ans]}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-2.5">
          <button onClick={() => setStep('list')} className="flex-1 py-3.5 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-800 dark:text-warm-200 rounded-2xl font-medium text-sm active:scale-[0.98] transition-all">
            목록으로
          </button>
          <button onClick={() => startExam(exam.id)} className="flex-1 py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra">
            다시 도전
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 내 게시물 ───
export function MyPosts() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'public' | 'friends' | 'private'>('all')

  useEffect(() => {
    if (!user) { setLoading(false); return }
    // status 필터 없이 본인 게시물 전체 로드 (비공개 포함)
    supabase.from('posts').select('id, created_at, likes_count, view_count, save_count, comments_count, outfit, style, caption, photo_urls, score, visibility, status')
      .eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setPosts(data || []); setLoading(false) })
  }, [user])

  // OOTD 기록도 로드 (비공개 기록 = 커뮤니티에 공유 안 한 것)
  const ootdRecords = useMemo(() => {
    try {
      const records = JSON.parse(localStorage.getItem('sp_ootd_records') || '[]')
      // posts에 없는 기록만 (postId가 없거나 posts에 없는 것)
      const postIds = new Set(posts.map(p => p.id))
      return records.filter((r: any) => !r.postId || !postIds.has(r.postId))
    } catch { return [] }
  }, [posts])

  if (loading) return <div className="animate-screen-fade px-5 pt-6 text-center py-20 text-sm text-warm-400">불러오는 중...</div>

  const publicPosts = posts.filter(p => p.visibility === 'public')
  const friendsPosts = posts.filter(p => p.visibility === 'friends')
  const privatePosts = posts.filter(p => p.visibility === 'private')

  const tabs = [
    { key: 'all', label: `전체 (${posts.length + ootdRecords.length})` },
    { key: 'public', label: `전체 공개 (${publicPosts.length})` },
    { key: 'friends', label: `친구 (${friendsPosts.length})` },
    { key: 'private', label: `비공개 (${privatePosts.length + ootdRecords.length})` },
  ]

  const getFiltered = () => {
    if (activeTab === 'public') return { posts: publicPosts, records: [] }
    if (activeTab === 'friends') return { posts: friendsPosts, records: [] }
    if (activeTab === 'private') return { posts: privatePosts, records: ootdRecords }
    return { posts, records: ootdRecords }
  }

  const { posts: filteredPosts, records: filteredRecords } = getFiltered()

  const visibilityBadge = (v: string) => {
    if (v === 'public') return <span className="text-[8px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-bold">공개</span>
    if (v === 'friends') return <span className="text-[8px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold">친구</span>
    return <span className="text-[8px] bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-400 px-1.5 py-0.5 rounded-full font-bold">비공개</span>
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-3">내 게시물</h2>

      {/* 탭 */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 hide-scrollbar">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              activeTab === t.key ? 'bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900' : 'bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* 커뮤니티 게시물 */}
      {filteredPosts.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-4">
          {filteredPosts.map(p => {
            const hasPhoto = p.photo_urls && p.photo_urls.length > 0
            const outfitHex: Record<string, string> = {}
            Object.entries(p.outfit || {}).forEach(([k, v]) => { if (v) outfitHex[k] = COLORS_60[v as string]?.hex || (v as string) })
            return (
              <button key={p.id} onClick={() => navigate(`/community/${p.id}`)} className="aspect-square rounded-xl overflow-hidden bg-warm-100 dark:bg-warm-800 active:scale-95 transition-transform relative">
                {hasPhoto ? <img src={p.photo_urls[0]} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full flex items-center justify-center"><MannequinSVG outfit={outfitHex} size={50} /></div>}
                <div className="absolute top-0.5 left-0.5">{visibilityBadge(p.visibility)}</div>
                <div className="absolute bottom-0.5 right-0.5 text-[9px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full">♡{p.likes_count||0}</div>
              </button>
            )
          })}
        </div>
      )}

      {/* 비공개 OOTD 기록 (커뮤니티 미공유) */}
      {filteredRecords.length > 0 && (activeTab === 'all' || activeTab === 'private') && (
        <>
          <div className="text-[11px] font-semibold text-warm-500 dark:text-warm-400 uppercase tracking-widest mb-2 mt-2">비공개 기록 ({filteredRecords.length})</div>
          <div className="grid grid-cols-3 gap-1.5">
            {filteredRecords.map((r: any, idx: number) => {
              const outfitHex: Record<string, string> = {}
              Object.entries(r.colors || {}).forEach(([k, v]) => { if (v) outfitHex[k] = COLORS_60[v as string]?.hex || '' })
              return (
                <button key={r.id || idx} onClick={() => navigate(`/closet/ootd/${r.date}?id=${r.id}`)} className="aspect-square rounded-xl overflow-hidden bg-warm-50 dark:bg-warm-800 active:scale-95 transition-transform relative border border-warm-300 dark:border-warm-600">
                  {r.photos?.[0] ? <img src={r.photos[0]} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center"><MannequinSVG outfit={outfitHex} size={50} /></div>}
                  <div className="absolute top-0.5 left-0.5">{visibilityBadge('private')}</div>
                  <div className="absolute bottom-0.5 right-0.5 text-[9px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full">{r.score}점</div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {filteredPosts.length === 0 && filteredRecords.length === 0 && (
        <div className="text-center py-16"><FileText size={40} className="text-warm-400 mx-auto mb-3" /><div className="text-sm text-warm-600 dark:text-warm-400">아직 게시물이 없어요</div></div>
      )}
    </div>
  )
}

// ─── 인사이트 ───
export function Insights() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ views: 0, likes: 0, saves: 0 })

  useEffect(() => {
    if (!user) return
    supabase.from('posts').select('likes_count, view_count, save_count').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          setStats({
            views: data.reduce((s, p) => s + (p.view_count || 0), 0),
            likes: data.reduce((s, p) => s + (p.likes_count || 0), 0),
            saves: data.reduce((s, p) => s + (p.save_count || 0), 0),
          })
        }
      })
  }, [user])

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-5">인사이트</h2>
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {[['조회', stats.views, <Eye size={20} />], ['좋아요', stats.likes, <Heart size={20} />], ['저장', stats.saves, <Bookmark size={20} />]].map(([label, val, icon]) => (
          <div key={label as string} className="bg-white border border-warm-400 rounded-2xl py-4 text-center shadow-warm-sm">
            <div className="text-terra-500 flex justify-center mb-1">{icon as any}</div>
            <div className="font-display text-xl font-bold text-warm-900">{val as number}</div>
            <div className="text-[10px] text-warm-600 mt-0.5">{label as string}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 저장한 코디 ───
export function SavedCoords() {
  const navigate = useNavigate()
  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('cs_saved') || '[]') } catch { return [] }
  }, [])

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-5">저장한 코디 ({saved.length})</h2>
      {saved.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {saved.map((item: any, idx: number) => {
            const outfitHex: Record<string, string> = {}
            Object.entries(item.outfit || item.colors || {}).forEach(([k, v]) => {
              if (v) outfitHex[k] = COLORS_60[v as string]?.hex || (v as string)
            })
            return (
              <div key={idx} className="flex items-center gap-3 bg-white border border-warm-400 rounded-2xl p-3 shadow-warm-sm">
                <MannequinSVG outfit={outfitHex} size={60} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-warm-900">{item.name || `코디 #${idx + 1}`}</div>
                  {item.score && <div className="text-xs text-terra-600 font-medium mt-0.5">{item.score}점</div>}
                  <div className="flex gap-1 mt-1">{Object.values(item.outfit || item.colors || {}).filter(Boolean).slice(0, 5).map((ck, i) => {
                    const c = COLORS_60[ck as string]; return c ? <div key={i} className="w-3 h-3 rounded-full border border-warm-400/50" style={{ background: c.hex }} /> : null
                  })}</div>
                </div>
              </div>
            )
          })}
        </div>
      ) : <div className="text-center py-16"><Star size={40} className="text-warm-400 mx-auto mb-3" /><div className="text-sm text-warm-600">저장한 코디가 없어요</div></div>}
    </div>
  )
}
