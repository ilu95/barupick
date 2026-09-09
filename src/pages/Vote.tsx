import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Share, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { useToast } from '@/components/ui/Toast'
import { trackVote } from '@/lib/analytics'
import { fetchVote, fetchCounts, answerVote, isMine, votedChoice, voteUrl, type Vote as VoteT, type VoteCounts, type Choice } from '@/lib/votes'

// ═══════════════════════════════════════════════════════
// /v/:code — 앱 없이 여는 웹 투표 "이 코디 어때?"
// 받는 사람: 한 번 누르면 끝 → 결과 → "너도 내일 뭐 입을지 정해 봐".
// 만든 사람(이 기기에서 만든 투표): 바로 결과 + 링크 공유.
// ═══════════════════════════════════════════════════════

export default function VotePage() {
  const { code = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const [vote, setVote] = useState<VoteT | null>(null)
  const [counts, setCounts] = useState<VoteCounts | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'done' | 'error'>('loading')
  const [busy, setBusy] = useState(false)
  const mine = isMine(code)
  const already = votedChoice(code)

  const load = async () => {
    setState('loading')
    try {
      const v = await fetchVote(code)
      if (!v) { setState('error'); return }
      setVote(v)
      if (mine || already) { setCounts(await fetchCounts(v.id)); setState('done') } else setState('ready')
      trackVote('view', { code, mine, two: !!v.b })
    } catch { setState('error') }
  }
  useEffect(() => { load() }, [code])
  useEffect(() => { const prev = document.title; if (vote) document.title = `${vote.question || t('vote.title')} · 바루픽`; return () => { document.title = prev } }, [vote])

  const choose = async (choice: Choice) => {
    if (!vote || busy) return
    setBusy(true)
    try {
      await answerVote(vote, choice)
      setCounts(await fetchCounts(vote.id)); setState('done')
      trackVote('answer', { code, choice })
    } catch { toast.error(t('vote.failAnswer')) } finally { setBusy(false) }
  }
  const share = async () => {
    const url = voteUrl(code)
    try { if (navigator.share) { await navigator.share({ title: vote?.question || t('vote.title'), text: t('vote.shareText'), url }); trackVote('share', { code }); return } } catch {}
    try { await navigator.clipboard.writeText(url); toast.success(t('vote.copied')) } catch { toast.error(t('vote.copyFail')) }
  }

  const pct = (n: number) => counts && counts.total ? Math.round(n / counts.total * 100) : 0
  const myChoice = votedChoice(code)

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#1C1917]">
      <div className="max-w-[480px] mx-auto px-5 pt-5 pb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] font-extrabold tracking-[.2em] text-warm-500">BARUPICK</div>
          <div className="text-[11px] text-warm-500">{t('vote.noApp')}</div>
        </div>

        {state === 'loading' && <div className="py-20 text-center text-sm text-warm-500">{t('common.loading')}</div>}
        {state === 'error' && (
          <div className="py-16 text-center">
            <div className="text-sm text-warm-700 dark:text-warm-300 mb-3">{t('vote.loadFail')}</div>
            <button onClick={load} className="px-4 py-2 rounded-xl bg-white dark:bg-warm-800 border border-warm-400 text-[12px] font-semibold flex items-center gap-1 mx-auto"><RefreshCw size={13} /> {t('vote.retry')}</button>
          </div>
        )}

        {vote && state !== 'loading' && state !== 'error' && (
          <>
            <h1 className="font-display text-[22px] font-extrabold text-warm-900 dark:text-warm-100 leading-tight mb-1">{vote.question || t('vote.title')}</h1>
            <div className="text-[12px] text-warm-500 mb-4">
              {[vote.temp != null ? `${vote.temp}°` : null, vote.situ ? t('outfit.situ.' + vote.situ, { defaultValue: vote.situ }) : null, counts ? t('vote.answered', { n: counts.total }) : null].filter(Boolean).join(' · ')}
            </div>

            {/* 두 벌 */}
            <div className={`grid gap-3 ${vote.b ? 'grid-cols-2' : 'grid-cols-1 max-w-[240px] mx-auto'}`}>
              {([['a', vote.a], ['b', vote.b]] as const).filter(([, s]) => s).map(([k, side]) => {
                const s = side!
                const n = k === 'a' ? (counts?.a || 0) + (counts?.up || 0) : counts?.b || 0
                const win = counts && vote.b ? (k === 'a' ? counts.a >= counts.b : counts.b > counts.a) : false
                return (
                  <button key={k} disabled={state === 'done' || busy || !vote.b} onClick={() => choose(k)}
                    className={`relative text-left bg-white dark:bg-warm-800 border rounded-3xl p-3 flex flex-col items-center gap-2 transition-all active:scale-[0.98] ${state === 'done' && win ? 'border-warm-900 dark:border-warm-100 scale-[1.02]' : 'border-warm-400 dark:border-warm-600'} ${state === 'done' && !win && vote.b ? 'opacity-70' : ''}`}>
                    <CharacterCanvas {...s.scene} width={vote.b ? 150 : 200} />
                    <div className="text-[12.5px] font-bold text-warm-900 dark:text-warm-100 text-center">{s.label || s.colors.slice(0, 2).map(c => c.name).join(' + ')}</div>
                    <div className="flex gap-1">{s.colors.slice(0, 4).map((c, i) => <i key={i} className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: c.hex }} />)}</div>
                    {state === 'done' && vote.b && (
                      <div className="w-full">
                        <div className="h-2 rounded-full bg-warm-100 dark:bg-warm-700 overflow-hidden"><div className="h-full bg-warm-900 dark:bg-warm-100 transition-all duration-700" style={{ width: pct(k === 'a' ? counts!.a : counts!.b) + '%' }} /></div>
                        <div className="text-[13px] font-extrabold text-warm-900 dark:text-warm-100 mt-1">{pct(k === 'a' ? counts!.a : counts!.b)}%{myChoice === k ? ` · ${t('vote.myPick')}` : ''}</div>
                      </div>
                    )}
                    {state === 'done' && !vote.b && <div className="text-[12px] text-warm-600">{n}</div>}
                  </button>
                )
              })}
            </div>

            {/* 한 벌 투표: 👍 👎 */}
            {!vote.b && state === 'ready' && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button disabled={busy} onClick={() => choose('up')} className="py-4 rounded-2xl bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 font-bold text-warm-900 dark:text-warm-100 flex items-center justify-center gap-2 active:scale-[0.98]"><ThumbsUp size={18} /> {t('vote.up')}</button>
                <button disabled={busy} onClick={() => choose('down')} className="py-4 rounded-2xl bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 font-bold text-warm-900 dark:text-warm-100 flex items-center justify-center gap-2 active:scale-[0.98]"><ThumbsDown size={18} /> {t('vote.down')}</button>
              </div>
            )}
            {!vote.b && state === 'done' && counts && (
              <div className="mt-4 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 text-center">
                <div className="text-[13px] text-warm-700 dark:text-warm-300">👍 {counts.up} · 👎 {counts.down}</div>
              </div>
            )}

            {/* 아래 */}
            <div className="mt-5 flex flex-col gap-2">
              {state === 'ready' && <div className="text-[12px] text-warm-500 text-center">{t('vote.hint')}</div>}
              {state === 'done' && !mine && <div className="text-[12.5px] text-warm-700 dark:text-warm-300 text-center font-medium">{t('vote.thanks')}</div>}
              {mine && (
                <button onClick={share} className="w-full py-3 bg-[#FEE500] text-[#1C1917] rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"><Share size={15} /> {t('vote.shareLink')}</button>
              )}
              {mine && <button onClick={load} className="text-[12px] text-warm-500 py-1 flex items-center justify-center gap-1"><RefreshCw size={12} /> {t('vote.refresh')}</button>}
              <button onClick={() => { trackVote('cta', { code }); navigate('/home/taste') }} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] shadow-terra">{t('vote.cta')} <ArrowRight size={16} /></button>
              {mine && <button onClick={() => navigate('/home/build')} className="text-[12px] text-terra-600 font-medium py-1">{t('vote.backBuild')}</button>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
