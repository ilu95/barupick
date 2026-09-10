import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ArrowLeft, Share, RefreshCw, X, Users } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { COLORS_60, getColorName } from '@/lib/colors'
import { charSex } from '@/lib/char/map'
import { loadTaste, buildFall } from '@/lib/taste'
import { fetchTasteShare, fetchCompares, recordCompare, compareTastes, sceneFromLook, profileOf, lookOf, isMyShare, myTasteShare, tasteUrl, type TasteShare, type TasteProfile, type TasteCompareRow, type Compare } from '@/lib/tasteShare'
import { drawCompareCard } from '@/lib/tasteCard'
import { shareDataUrl } from '@/lib/coordCard'
import { trackTaste } from '@/lib/analytics'

// ═══════════════════════════════════════════════════════
// /t/:code — 취향 친구 비교 (루프 L2). 앱 없이 웹에서 연다.
// 받는 사람: 친구 취향 소개 → 30초 테스트 → 둘의 관계(겹치는 옷장 · 일치 % · 둘 다 좋아할 코디).
// 보낸 사람(이 기기에서 만든 링크): 비교한 친구 목록 → 각 친구와의 비교.
// ═══════════════════════════════════════════════════════

type Pair = { a: TasteProfile; aName: string; b: TasteProfile; bName: string }

export default function TasteComparePage() {
  const { code = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const { user, profile: authProfile } = useAuth() as any
  const sex = charSex()
  const mine = useMemo(loadTaste, [])
  const [share, setShare] = useState<TasteShare | null>(null)
  const [state, setState] = useState<'loading' | 'intro' | 'compare' | 'owner' | 'error'>('loading')
  const [pair, setPair] = useState<Pair | null>(null)
  const [rows, setRows] = useState<TasteCompareRow[]>([])
  const owner = isMyShare(code)
  const myName = authProfile?.nickname || t('taste.cmp.me')

  const load = async () => {
    setState('loading')
    try {
      const s = await fetchTasteShare(code)
      if (!s) { setState('error'); return }
      setShare(s)
      if (owner) { try { setRows(await fetchCompares(s.id)) } catch {} setState('owner'); trackTaste('cmp_view', { code, owner: true }); return }
      if (mine) {
        const me = profileOf(mine, sex, lookOf(buildFall(mine.v, sex).first[0]))
        setPair({ a: s.taste, aName: s.name || t('taste.cmp.friend'), b: me, bName: myName })
        setState('compare')
        trackTaste('cmp_view', { code, owner: false, has_taste: true })
      } else { setState('intro'); trackTaste('cmp_view', { code, owner: false, has_taste: false }) }
    } catch { setState('error') }
  }
  useEffect(() => { load() }, [code])
  useEffect(() => { const prev = document.title; if (share) document.title = `${share.name} · ${share.taste.name} · 바루픽`; return () => { document.title = prev } }, [share])

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#1C1917]">
      <div className="max-w-[480px] mx-auto px-5 pt-5 pb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] font-extrabold tracking-[.2em] text-warm-500">BARUPICK</div>
          <div className="text-[11px] text-warm-500">{t('taste.cmp.pill')}</div>
        </div>

        {state === 'loading' && <div className="py-20 text-center text-sm text-warm-500">{t('common.loading')}</div>}
        {state === 'error' && (
          <div className="py-16 text-center">
            <div className="text-sm text-warm-700 dark:text-warm-300 mb-3">{t('taste.cmp.loadFail')}</div>
            <button onClick={load} className="px-4 py-2 rounded-xl bg-white dark:bg-warm-800 border border-warm-400 text-[12px] font-semibold flex items-center gap-1 mx-auto"><RefreshCw size={13} /> {t('vote.retry')}</button>
          </div>
        )}

        {/* 받는 사람 · 아직 테스트 전 */}
        {state === 'intro' && share && (
          <div className="animate-screen-fade">
            <div className="text-[12px] font-semibold text-warm-500 mb-1">{t('taste.cmp.introEyebrow', { name: share.name || t('taste.cmp.friend') })}</div>
            <h1 className="font-display text-[26px] font-extrabold text-warm-900 dark:text-warm-100 leading-tight mb-2">{share.taste.name}</h1>
            <div className="text-[13px] text-warm-700 dark:text-warm-300 leading-relaxed mb-3">{share.taste.tag}</div>
            <div className="flex gap-2 mb-4">{share.taste.pal.slice(0, 6).map(k => <i key={k} title={getColorName(k)} className="w-7 h-7 rounded-full border border-black/10" style={{ background: COLORS_60[k]?.hex }} />)}</div>
            <div className="flex justify-center py-2 mb-4 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-3xl"><CharacterCanvas {...sceneFromLook(share.taste.look, share.taste.sex)} width={190} /></div>
            <div className="text-[13px] font-semibold text-warm-800 dark:text-warm-200 text-center mb-3">{t('taste.cmp.introAsk', { name: share.name || t('taste.cmp.friend') })}</div>
            <button onClick={() => { trackTaste('cmp_cta', { code }); navigate(`/home/taste?with=${code}`) }} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] shadow-terra">{t('taste.cmp.introCta')} <ArrowRight size={16} /></button>
            <div className="text-[11px] text-warm-500 text-center mt-2">{t('taste.cmp.introSub')}</div>
          </div>
        )}

        {/* 둘의 관계 */}
        {state === 'compare' && share && pair && (
          <CompareView pair={pair} sex={sex} code={code} share={share} record={!owner} onBack={owner ? () => setState('owner') : undefined} toast={toast} navigate={navigate} t={t} />
        )}

        {/* 보낸 사람 */}
        {state === 'owner' && share && (
          <div className="animate-screen-fade">
            <div className="text-[12px] font-semibold text-warm-500 mb-1">{t('taste.cmp.ownerEyebrow')}</div>
            <h1 className="font-display text-[24px] font-extrabold text-warm-900 dark:text-warm-100 leading-tight mb-3">{share.taste.name}</h1>
            <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-3xl p-4 mb-3">
              <div className="text-[13px] font-bold text-warm-900 dark:text-warm-100 mb-2">{rows.length ? t('taste.cmp.ownerCount', { n: rows.length }) : t('taste.cmp.ownerNone')}</div>
              {rows.length === 0 && <div className="text-[12px] text-warm-500">{t('taste.cmp.ownerNoneSub')}</div>}
              <div className="flex flex-col gap-1.5">
                {rows.map(r => (
                  <button key={r.id} onClick={() => { setPair({ a: share.taste, aName: share.name || myName, b: r.taste, bName: r.name || t('taste.cmp.friend') }); setState('compare') }}
                    className="w-full flex items-center gap-3 bg-[#FAF8F5] dark:bg-warm-900/40 border border-warm-300 dark:border-warm-600 rounded-2xl px-3 py-2 text-left active:scale-[0.98]">
                    <div className="w-[44px] flex justify-center"><CharacterCanvas {...sceneFromLook(r.taste.look, r.taste.sex)} width={40} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-warm-900 dark:text-warm-100 truncate">{r.name || t('taste.cmp.friend')} <span className="font-medium text-warm-500">· {r.taste.name}</span></div>
                      <div className="text-[11px] text-warm-500">{t('taste.cmp.rowSub', { n: r.overlap ?? 0, sim: r.sim ?? 0 })}</div>
                    </div>
                    <ArrowRight size={14} className="text-warm-400" />
                  </button>
                ))}
              </div>
            </div>
            <ShareRow code={code} share={share} toast={toast} t={t} />
            <button onClick={load} className="w-full text-[12px] text-warm-500 py-2 flex items-center justify-center gap-1"><RefreshCw size={12} /> {t('vote.refresh')}</button>
            <button onClick={() => navigate('/home/taste')} className="w-full text-[12px] text-terra-600 font-medium py-1">{t('taste.cmp.backTaste')}</button>
          </div>
        )}
      </div>
    </div>
  )
}

function ShareRow({ code, share, toast, t }: { code: string; share: TasteShare; toast: any; t: any }) {
  const send = async () => {
    const url = tasteUrl(code)
    try { if (navigator.share) { await navigator.share({ title: `${share.name} · ${share.taste.name}`, text: t('taste.cmp.shareText'), url }); trackTaste('cmp_share', { code, again: true }); return } } catch {}
    try { await navigator.clipboard.writeText(url); toast.success(t('vote.copied')) } catch { toast.error(t('vote.copyFail')) }
  }
  return <button onClick={send} className="w-full py-3 bg-[#FEE500] text-[#1C1917] rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] mb-1"><Share size={15} /> {t('taste.cmp.sendLink')}</button>
}

function CompareView({ pair, sex, code, share, record, onBack, toast, navigate, t }: { pair: Pair; sex: 'm' | 'w'; code: string; share: TasteShare; record: boolean; onBack?: () => void; toast: any; navigate: any; t: any }) {
  const cmp: Compare = useMemo(() => compareTastes(pair.a, pair.aName, pair.b, pair.bName, sex), [pair, sex])
  const [card, setCard] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const mineShare = myTasteShare()

  // 받은 사람의 비교 결과를 한 번만 남긴다 (보낸 사람이 자기 링크에서 본다)
  useEffect(() => {
    if (!record) return
    const k = 'sp_tc_' + code
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1') } catch {}   // 먼저 표시해 두 번 남지 않게 (개발 모드의 이중 effect 포함)
    recordCompare(share, pair.b, pair.bName, cmp.sim, cmp.overlap).then(() => trackTaste('cmp_done', { code, sim: cmp.sim, overlap: cmp.overlap })).catch(() => { try { localStorage.removeItem(k) } catch {} })
  }, [])

  const makeCard = async () => {
    if (busy) return
    setBusy(true)
    try {
      const url = await drawCompareCard(pair.a, pair.aName, pair.b, pair.bName, cmp, { title: t('taste.cmp.cardTitle'), overlap: t('taste.cmp.overlapLabel'), sim: t('taste.cmp.simLabel'), both: t('taste.cmp.both'), link: 'barupick.vercel.app/home/taste' }, sex)
      setCard(url); trackTaste('cmp_card', { code })
    } catch { toast.error(t('card.fail')) } finally { setBusy(false) }
  }
  const sendCard = async () => { if (!card) return; const r = await shareDataUrl(card, `barupick-taste-${Date.now()}.png`, t('taste.cmp.cardTitle')); if (r === 'downloaded') toast.success(t('card.saved')) }
  const other = async () => {
    if (mineShare) {
      const url = tasteUrl(mineShare.code)
      try { if (navigator.share) { await navigator.share({ title: t('taste.cmp.shareTitle'), text: t('taste.cmp.shareText'), url }); trackTaste('cmp_share', { code: mineShare.code, again: true }); return } } catch {}
      try { await navigator.clipboard.writeText(url); toast.success(t('vote.copied')) } catch { toast.error(t('vote.copyFail')) }
    } else navigate('/home/taste?share=1')
  }

  const Person = ({ p, name }: { p: TasteProfile; name: string }) => (
    <div className="flex-1 min-w-0 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-3xl p-3 flex flex-col items-center">
      <div className="text-[14px] font-extrabold text-warm-900 dark:text-warm-100 truncate max-w-full">{name}</div>
      <div className="text-[11px] text-warm-500 truncate max-w-full mb-1">{p.name}</div>
      <CharacterCanvas {...sceneFromLook(p.look, p.sex)} width={120} />
      <div className="flex gap-1 mt-1.5">{p.pal.slice(0, 5).map(k => <i key={k} className="w-4 h-4 rounded-full border border-black/10" style={{ background: COLORS_60[k]?.hex }} />)}</div>
    </div>
  )

  return (
    <div className="animate-screen-fade">
      {onBack && <button onClick={onBack} className="flex items-center gap-1 text-[12px] text-warm-600 mb-2 active:opacity-70"><ArrowLeft size={14} /> {t('common.back')}</button>}
      <div className="flex gap-2 mb-3"><Person p={pair.a} name={pair.aName} /><Person p={pair.b} name={pair.bName} /></div>

      <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-3xl p-4 mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-bold text-warm-700 dark:text-warm-300">{t('taste.cmp.overlapLabel')}</span>
          <span className="font-display text-[30px] font-extrabold text-warm-900 dark:text-warm-100 leading-none tabular-nums">{cmp.overlap}</span>
          <span className="text-[13px] font-bold text-warm-700 dark:text-warm-300">{t('taste.cmp.unit')}</span>
          <span className="ml-auto text-[12px] font-semibold text-terra-600">{t('taste.cmp.simLabel')} {cmp.sim}%</span>
        </div>
        {cmp.sharedPal.length > 0 && <div className="flex gap-1.5 mt-2">{cmp.sharedPal.map(k => <span key={k} className="flex items-center gap-1 text-[10.5px] font-semibold text-warm-700 dark:text-warm-300"><i className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: COLORS_60[k]?.hex }} />{getColorName(k)}</span>)}</div>}
        <div className="text-[13px] text-warm-800 dark:text-warm-200 leading-relaxed mt-2">{cmp.sentence}</div>
        {cmp.shared.length > 0 && (
          <>
            <div className="text-[11px] font-bold text-warm-500 mt-3 mb-1.5">{t('taste.cmp.both')}</div>
            <div className="grid grid-cols-3 gap-2">
              {cmp.shared.map(x => (
                <div key={x.card.id} className="relative bg-[#FAF8F5] dark:bg-warm-900/40 border border-warm-300 dark:border-warm-600 rounded-2xl p-1.5 flex flex-col items-center">
                  <span className="absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warm-900 text-white">{x.card.total}</span>
                  <CharacterCanvas {...sceneFromLook({ p: x.card.p as Record<string, string>, key: x.card.key }, sex)} width={72} />
                  <div className="text-[9.5px] text-warm-500 truncate max-w-full">{['outer', 'top', 'bottom'].filter(s => x.card.key[s]).slice(0, 2).map(s => getColorName(x.card.key[s])).join(' · ')}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={makeCard} disabled={busy} className="flex-1 py-3 bg-[#FEE500] text-[#1C1917] rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-60"><Share size={15} /> {busy ? t('card.making') : t('taste.cmp.cardBtn')}</button>
        <button onClick={other} className="flex-1 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-800 dark:text-warm-200 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98]"><Users size={15} /> {t('taste.cmp.other')}</button>
      </div>
      <button onClick={() => navigate('/home/build')} className="w-full py-3 mt-2 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] shadow-terra">{t('vote.cta')} <ArrowRight size={16} /></button>

      {card && (
        <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center px-6" onClick={() => setCard(null)}>
          <div className="w-full max-w-[360px] bg-white dark:bg-warm-800 rounded-3xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-warm-900 dark:text-warm-100">{t('taste.cmp.cardTitle')}</div>
              <button onClick={() => setCard(null)} aria-label={t('common.close')} className="w-8 h-8 rounded-full bg-warm-200 dark:bg-warm-700 flex items-center justify-center"><X size={14} /></button>
            </div>
            <img src={card} alt="" className="w-full rounded-2xl border border-warm-300 dark:border-warm-600" />
            <button onClick={sendCard} className="mt-3 w-full py-3 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"><Share size={15} /> {t('card.share')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
