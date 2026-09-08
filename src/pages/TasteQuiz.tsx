import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Share, RotateCcw, ChevronDown, X } from 'lucide-react'
import CharacterCanvas, { bootCharacter } from '@/components/mannequin/CharacterCanvas'
import * as R from '@/lib/char/render3'
import { charSex, DEFAULT_HAIR, DEFAULT_HAIR_COLOR, type CharScene } from '@/lib/char/map'
import { COLORS_60, getColorName } from '@/lib/colors'
import { useToast } from '@/components/ui/Toast'
import { trackTaste } from '@/lib/analytics'
import { PLATE_TO_ITEM, STYLE_KEY, PARTS, type Parts } from '@/lib/outfits'
import { QUESTIONS, AXES, zeroVec, applyAnswer, tasteName, axisWords, buildFall, colorNames, saveTaste, loadTaste, clearTaste, type Vec, type Fall, type FallCard } from '@/lib/taste'

// ═══════════════════════════════════════════════════════
// 내 컬러 취향 — 10문항 → 취향 이름 → 30벌 폭포 → 공유 / 오늘 뭐 입지
// 카드 한 장을 고르면 만들기 2단계로 바로 들어간다 (sessionStorage 로 넘긴다).
// ═══════════════════════════════════════════════════════

const PICK_KEY = 'sp_taste_pick'
const ORDER = ['outer', 'layer', 'top', 'inner', 'bottom', 'shoes', 'scarf'] as const
const isKo = (lng: string) => (lng || 'ko').startsWith('ko')

export default function TasteQuiz() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const sex = charSex()
  const ko = isKo(i18n.language)

  const [i, setI] = useState(0)
  const [v, setV] = useState<Vec>(zeroVec)
  const [picked, setPicked] = useState<'a' | 'b' | null>(null)
  const [stage, setStage] = useState<'q' | 'reveal' | 'fall'>(() => loadTaste() ? 'reveal' : 'q')
  const [saved, setSaved] = useState(loadTaste)
  const [fall, setFall] = useState<Fall | null>(null)
  const [open, setOpen] = useState<{ second: boolean; third: boolean }>({ second: false, third: false })
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  useEffect(() => { if (stage === 'q' && i === 0) trackTaste('start', {}) }, [])

  const scene = (p: Parts | Record<string, string>, k: Record<string, string>): CharScene => ({
    items: ORDER.filter(s => (p as any)[s]).map(s => ({ id: (p as any)[s], color: COLORS_60[k[s] || 'white']?.hex || '#FFFFFF' })),
    body: { sex, hair: DEFAULT_HAIR[sex], hairColor: DEFAULT_HAIR_COLOR },
  })

  const answer = (which: 'a' | 'b') => {
    if (picked) return
    const q = QUESTIONS[i]
    setPicked(which)
    trackTaste('answer', { i, ax: q.ax, which })
    const nv = applyAnswer(v, q, which)
    setV(nv)
    setTimeout(() => {
      setPicked(null)
      if (i + 1 < QUESTIONS.length) setI(i + 1)
      else reveal(nv)
    }, 380)
  }

  const reveal = (nv: Vec) => {
    const n = tasteName(nv)
    const f = buildFall(nv, sex)
    const s = { v: nv, ...n, pal: f.pal, at: Date.now() }
    saveTaste(s); setSaved(s); setFall(f); setStage('reveal')
    trackTaste('reveal', { name: n.name, cw: n.cw, tone: n.tone, mood: n.mood, ...Object.fromEntries(AXES.map(a => [a, +nv[a].toFixed(2)])) })
  }

  const showFall = () => {
    if (!saved) return
    if (!fall) setFall(buildFall(saved.v, sex))
    setStage('fall'); setOpen({ second: false, third: false })
    trackTaste('fall_view', { name: saved.name })
  }

  const restart = () => { clearTaste(); setSaved(null); setFall(null); setV(zeroVec()); setI(0); setPicked(null); setShareUrl(null); setStage('q'); trackTaste('start', { redo: true }) }

  const pick = (x: FallCard, rank: number) => {
    const p = x.p, key = x.key
    const layers: { itemId: string; plate: string; colorKey: string }[] = []
    const seen = new Set<string>()
    for (const s of ['outer', 'layer', 'top'] as const) {
      const plate = p[s]; if (!plate) continue
      const itemId = PLATE_TO_ITEM[plate]; if (!itemId || seen.has(itemId)) continue
      seen.add(itemId); layers.push({ itemId, plate, colorKey: key[s] || 'white' })
    }
    const payload = {
      layers,
      bottom: p.bottom ? { plate: p.bottom, colorKey: key.bottom || 'charcoal' } : undefined,
      shoes: p.shoes ? { plate: p.shoes, colorKey: key.shoes || 'black' } : undefined,
      style: STYLE_KEY[x.c.st] ?? null,
      templateId: x.id,
      situ: x.c.tag,
    }
    try { sessionStorage.setItem(PICK_KEY, JSON.stringify(payload)) } catch {}
    trackTaste('pick', { id: x.id, rank, total: x.total, name: saved?.name })
    navigate('/home/build')
  }

  // 취향 카드(4:5) 만들기 — 캐릭터 3장 + 이름 + 팔레트
  const makeShare = async () => {
    if (!saved || !fall || sharing) return
    setSharing(true)
    try {
      await bootCharacter()
      const top3 = fall.first.slice(0, 3)
      const figs = await Promise.all(top3.map(async x => { const c = document.createElement('canvas'); await R.render(c, scene(x.p, x.key).items, scene(x.p, x.key).body); return c }))
      const W = 1080, H = 1350
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H
      const g = cv.getContext('2d')!
      const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#F3EEE6'); grad.addColorStop(1, '#FAF8F5')
      g.fillStyle = grad; g.fillRect(0, 0, W, H)
      g.fillStyle = '#6E6862'; g.font = '600 30px Pretendard, "Apple SD Gothic Neo", sans-serif'; g.textBaseline = 'top'
      g.fillText(t('taste.share.eyebrow'), 72, 72)
      g.fillStyle = '#1C1917'; g.font = '800 88px Pretendard, "Apple SD Gothic Neo", sans-serif'
      g.fillText(saved.name, 72, 116)
      g.fillStyle = '#57534E'; g.font = '500 32px Pretendard, "Apple SD Gothic Neo", sans-serif'
      wrapText(g, saved.tag, 72, 232, W - 144, 44)
      saved.pal.forEach((k, j) => { g.beginPath(); g.arc(72 + 36 + j * 92, 372, 36, 0, Math.PI * 2); g.fillStyle = COLORS_60[k]?.hex || '#ccc'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(28,25,23,.12)'; g.stroke() })
      const fw = 300, fh = Math.round(fw * 1200 / 896), fy = 470
      figs.forEach((c, j) => { const x = 72 + j * (fw + 18); g.drawImage(c, x, fy, fw, fh) })
      top3.forEach((x, j) => { g.fillStyle = '#1C1917'; g.font = '800 34px Pretendard, sans-serif'; g.fillText(String(x.total), 72 + j * (fw + 18) + 8, fy + fh + 14); g.fillStyle = '#6E6862'; g.font = '500 22px Pretendard, sans-serif'; g.fillText(colorNames(x.key, 2), 72 + j * (fw + 18) + 8, fy + fh + 56) })
      g.fillStyle = '#6E6862'; g.font = '800 24px Pretendard, sans-serif'; g.fillText('BARUPICK · ' + t('taste.share.watermark'), 72, H - 96)
      g.textAlign = 'right'; g.font = '500 24px Pretendard, sans-serif'; g.fillText('barupick.vercel.app/home/taste', W - 72, H - 96); g.textAlign = 'left'
      const url = cv.toDataURL('image/png')
      setShareUrl(url)
      trackTaste('share', { name: saved.name })
    } catch { toast.error(t('taste.share.fail')) } finally { setSharing(false) }
  }
  const doShare = async () => {
    if (!shareUrl) return
    try {
      const blob = await (await fetch(shareUrl)).blob()
      const file = new File([blob], 'barupick-taste.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: saved?.name }); return }
    } catch {}
    const a = document.createElement('a'); a.href = shareUrl; a.download = 'barupick-taste.png'; a.click()
  }

  const q = QUESTIONS[i]
  const words = useMemo(() => saved ? axisWords(saved.v) : [], [saved, i18n.language])

  return (
    <div className="min-h-screen dark:bg-[#1C1917]">
      <div className="max-w-[480px] mx-auto px-5 py-4 pb-10">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="w-9 h-9 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 flex items-center justify-center active:scale-90"><ArrowLeft size={16} /></button>
          <div className="font-display text-lg font-bold text-warm-900 dark:text-warm-100">{t('taste.title')}</div>
          {stage === 'q' && <div className="ml-auto text-[12px] font-semibold text-warm-500">{i + 1}/{QUESTIONS.length}</div>}
        </div>

        {/* ── 질문 ── */}
        {stage === 'q' && (
          <div className="animate-screen-fade">
            <div className="flex gap-1 mb-4">{QUESTIONS.map((_, j) => <i key={j} className={`h-1 flex-1 rounded-full ${j <= i ? 'bg-terra-500' : 'bg-warm-300 dark:bg-warm-700'}`} />)}</div>
            <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">{ko ? q.t : q.en}</h2>
            <p className="text-sm text-warm-600 dark:text-warm-400 mb-4">{t('taste.pickOne')}</p>
            <div className="grid grid-cols-2 gap-3">
              {(['a', 'b'] as const).map(w => {
                const o = q[w]
                return (
                  <button key={w} onClick={() => answer(w)}
                    className={`bg-white dark:bg-warm-800 border rounded-3xl p-3 flex flex-col items-center gap-2 transition-all active:scale-[0.98] ${picked === w ? 'border-terra-500 ring-2 ring-terra-200 scale-[1.02]' : picked ? 'border-warm-300 opacity-50' : 'border-warm-400 dark:border-warm-600'}`}>
                    <CharacterCanvas {...scene(o.p, o.k)} width={150} />
                    <div className="text-[13px] font-bold text-warm-900 dark:text-warm-100 text-center leading-tight">{ko ? o.l : o.en}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 결과 ── */}
        {stage === 'reveal' && saved && (
          <div className="animate-screen-fade bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-3xl p-6 text-center shadow-warm-sm">
            <div className="text-[12px] font-semibold text-warm-500 mb-2">{t('taste.revealEyebrow')}</div>
            <div className="font-display text-[28px] font-extrabold text-warm-900 dark:text-warm-100 leading-tight mb-2">{saved.name}</div>
            <div className="text-[13px] text-warm-700 dark:text-warm-300 leading-relaxed mb-4">{saved.tag}</div>
            <div className="flex justify-center gap-2 mb-4">{saved.pal.map(k => <i key={k} title={getColorName(k)} className="w-8 h-8 rounded-full border border-black/10" style={{ background: COLORS_60[k]?.hex }} />)}</div>
            <div className="flex flex-wrap justify-center gap-1.5 mb-5">{words.map(w => <span key={w} className="px-2.5 py-1 rounded-full bg-warm-100 dark:bg-warm-700 text-[11px] font-semibold text-warm-700 dark:text-warm-300">{w}</span>)}</div>
            <button onClick={showFall} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] shadow-terra">{t('taste.seeFall')} <ArrowRight size={16} /></button>
            <button onClick={restart} className="mt-2 text-[12px] text-warm-500 py-2 flex items-center justify-center gap-1 w-full active:opacity-70"><RotateCcw size={12} /> {t('taste.redo')}</button>
          </div>
        )}

        {/* ── 30벌 폭포 ── */}
        {stage === 'fall' && saved && fall && (
          <div className="animate-screen-fade">
            <Section title={t('taste.sections.first')} sub={saved.name} cards={fall.first} onPick={pick} scene={scene} base={0} />
            {open.second ? <Section title={t('taste.sections.second')} sub={t('taste.sections.secondSub')} cards={fall.second} onPick={pick} scene={scene} base={10} />
              : <MoreBtn label={t('taste.sections.second')} onClick={() => setOpen(o => ({ ...o, second: true }))} />}
            {open.second && (open.third ? <Section title={saved.v.novelty < -.33 ? t('taste.sections.thirdSafe') : t('taste.sections.third')} sub={t('taste.sections.thirdSub')} cards={fall.third} onPick={pick} scene={scene} base={20} />
              : <MoreBtn label={saved.v.novelty < -.33 ? t('taste.sections.thirdSafe') : t('taste.sections.third')} onClick={() => setOpen(o => ({ ...o, third: true }))} />)}

            <div className="sticky bottom-0 -mx-5 px-5 pt-3 pb-4 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5] to-transparent dark:from-[#1C1917] dark:via-[#1C1917] flex gap-2">
              <button onClick={makeShare} disabled={sharing} className="flex-1 py-3 bg-terra-500 text-white rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-60"><Share size={15} /> {sharing ? t('taste.share.making') : t('taste.share.btn')}</button>
              <button onClick={restart} className="px-3 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl text-[12px] font-medium text-warm-700 dark:text-warm-300 active:scale-[0.98]">{t('taste.redo')}</button>
              <button onClick={() => navigate('/home/build')} className="px-3 py-3 bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900 rounded-2xl text-[12px] font-semibold active:scale-[0.98]">{t('taste.goBuild')}</button>
            </div>
          </div>
        )}
      </div>

      {/* 취향 카드 미리보기 */}
      {shareUrl && (
        <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center px-6" onClick={() => setShareUrl(null)}>
          <div className="w-full max-w-[360px] bg-white dark:bg-warm-800 rounded-3xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-warm-900 dark:text-warm-100">{t('taste.share.title')}</div>
              <button onClick={() => setShareUrl(null)} aria-label={t('common.close')} className="w-8 h-8 rounded-full bg-warm-200 dark:bg-warm-700 flex items-center justify-center"><X size={14} /></button>
            </div>
            <img src={shareUrl} alt="" className="w-full rounded-2xl border border-warm-300 dark:border-warm-600" />
            <button onClick={doShare} className="mt-3 w-full py-3 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"><Share size={15} /> {t('taste.share.send')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, sub, cards, onPick, scene, base }: { title: string; sub: string; cards: FallCard[]; onPick: (x: FallCard, rank: number) => void; scene: (p: any, k: Record<string, string>) => CharScene; base: number }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-2"><div className="text-sm font-bold text-warm-900 dark:text-warm-100">{title}</div><div className="text-[11px] text-warm-500">{sub}</div></div>
      <div className="grid grid-cols-3 gap-2">
        {cards.map((x, j) => (
          <button key={x.id} onClick={() => onPick(x, base + j + 1)} className="relative text-left bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-2 active:scale-[0.98] transition-all">
            <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warm-900 text-white">{x.total}</span>
            <div className="flex justify-center mb-1"><CharacterCanvas {...scene(x.p, x.key)} width={84} /></div>
            <div className="text-[10.5px] font-semibold text-warm-800 dark:text-warm-200 leading-tight truncate">{colorNames(x.key)}</div>
            <div className="text-[9.5px] text-warm-500 leading-snug line-clamp-2 mt-0.5">{x.why}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
function MoreBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full mb-4 py-3 rounded-2xl bg-white dark:bg-warm-800 border border-dashed border-warm-400 dark:border-warm-600 text-[12.5px] font-semibold text-warm-700 dark:text-warm-300 flex items-center justify-center gap-1 active:scale-[0.98]"><ChevronDown size={14} /> {label}</button>
}
function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const chars = text.split(''); let line = ''; let yy = y
  for (const ch of chars) { const test = line + ch; if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = ch; yy += lh } else line = test }
  if (line) g.fillText(line, x, yy)
}
