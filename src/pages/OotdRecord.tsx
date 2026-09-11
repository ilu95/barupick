// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Camera, Lock, Users, Globe, Pencil, ArrowLeft } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import StepBuilderV2 from '@/pages/build/StepBuilderV2'
import ImageEditor from '@/components/ui/ImageEditor'
import CropOverlay from '@/components/ui/CropOverlay'
import { useBuild } from '@/hooks/useBuild'
import { useOotd } from '@/hooks/useOotd'
import { useAuth } from '@/contexts/AuthContext'
import { charSceneFromState, DEFAULT_BOTTOM, DEFAULT_SHOE, DEFAULT_SCARF, DEFAULT_HAT } from '@/lib/char/map'
import { garmentsOf, commitCloset } from '@/lib/closetAuto'
import { trackOotdRecord } from '@/lib/analytics'
import { COLORS_60, getColorName } from '@/lib/colors'

// ═══════════════════════════════════════════════════════
// 기록 — 새 디자인. 옷 입히기는 만들기 2단계(캐릭터 + 레일)를 그대로 쓰고,
// "기록하기"를 누르면 마무리(사진·상황·기분·공개)만 한 장 더. 오늘 저장한 코디가 있으면
// 한 번 탭으로 그대로 불러온다. 기록한 옷은 옷장에 담긴다(입었으니 가진 옷).
// ═══════════════════════════════════════════════════════

const SITUATION_KEYS = ['commute', 'date', 'casual', 'interview', 'travel', 'exercise'] as const
const MOOD_KEYS = [{ emoji: '😊', key: 'satisfied' }, { emoji: '😐', key: 'okay' }, { emoji: '😕', key: 'regret' }] as const
const DEF_ITEM: Record<string, string> = { outer: 'jacket', middleware: 'knit', top: 'tshirt', inner: 'tshirt' }

export default function OotdRecord() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const ootd = useOotd()
  const build = useBuild('coord')
  const [stage, setStage] = useState<'dress' | 'finish' | 'saved'>('dress')
  const [saveError, setSaveError] = useState('')
  const [customSit, setCustomSit] = useState(false)
  const [editingPhotoIdx, setEditingPhotoIdx] = useState<number | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 오늘 저장한 코디 (결과 화면 "코디 저장"). 한 번 탭으로 그대로
  const quick = useMemo(() => {
    try {
      const today = new Date().toDateString()
      return (JSON.parse(localStorage.getItem('cs_saved') || '[]') as any[]).filter(x => x && x.pick && x.scene && new Date(x.createdAt).toDateString() === today).slice(0, 3)
    } catch { return [] }
  }, [])

  // 편집 모드: 기록의 색·옷 종류를 캐릭터에 올린다
  useEffect(() => {
    const editData = localStorage.getItem('_ootd_edit')
    if (!editData) return
    try {
      const rec = JSON.parse(editData)
      ootd.startEdit(rec)
      localStorage.removeItem('_ootd_edit')
      const c = rec.colors || {}, it = rec.itemTypes || {}
      const layers = ['outer', 'middleware', 'top'].filter(s => c[s]).map(s => ({ itemId: it[s] || DEF_ITEM[s], plate: it[s] && it[s].includes('_') ? it[s] : undefined, colorKey: c[s] }))
      build.applyOutfit({
        layers,
        bottom: c.bottom ? { plate: it.bottom && it.bottom.includes('_') ? it.bottom : DEFAULT_BOTTOM, colorKey: c.bottom } : undefined,
        shoes: c.shoes ? { plate: it.shoes && it.shoes.includes('_') ? it.shoes : DEFAULT_SHOE, colorKey: c.shoes } : undefined,
        scarf: c.scarf ? { plate: DEFAULT_SCARF, colorKey: c.scarf } : null,
        hat: c.hat ? { plate: DEFAULT_HAT, colorKey: c.hat } : null,
      })
    } catch {}
  }, [])

  const garments = useMemo(() => garmentsOf(build.state), [build.state])
  const scene = useMemo(() => charSceneFromState(build.state), [build.state])
  const score = build.getScore()
  const canSave = build.isComplete

  const handleSave = () => {
    if (!canSave) { setSaveError(t('ootdRecord.selectAllRequired')); setTimeout(() => setSaveError(''), 2000); return }
    if (ootd.needsPhoto) { setSaveError(t('ootdRecord.photoRequiredPublic')); setTimeout(() => setSaveError(''), 2000); return }
    const colors: Record<string, string | null> = { top: null, middleware: null, bottom: null, outer: null, shoes: null, scarf: null, hat: null }
    const itemTypes: Record<string, string> = {}
    for (const g of garments) { const slot = g.slot === 'inner' ? 'top' : g.slot; if (!colors[slot]) { colors[slot] = g.colorKey; itemTypes[slot] = g.plate } }
    try {
      const ok = ootd.saveRecord({ colors, itemTypes, score })
      if (ok) {
        commitCloset(garments, new Set(), 'record')   // 입었으니 가진 옷
        trackOotdRecord(ootd.photos.length > 0, ootd.visibility)
        setStage('saved')
        setTimeout(() => { ootd.resetForm(); navigate('/closet') }, 1500)
      } else { setSaveError(t('ootdRecord.saveFailed')); setTimeout(() => setSaveError(''), 2000) }
    } catch (e: any) {
      setSaveError(e?.name === 'StorageQuotaError' ? t('ootdRecord.storageFull') : t('ootdRecord.saveError')); setTimeout(() => setSaveError(''), 3500)
    }
  }
  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader(); reader.onload = () => { if (typeof reader.result === 'string') setCropSrc(reader.result) }; reader.readAsDataURL(file); e.target.value = ''
  }

  if (stage === 'saved') {
    let streakMsg = ''
    try { const records = JSON.parse(localStorage.getItem('sp_ootd_records') || '[]'); if (records.length >= 3) streakMsg = t('ootdRecord.streakMessage', { count: records.length }) } catch {}
    return (
      <div className="animate-screen-fade flex items-center justify-center py-28">
        <div className="text-center">
          <div className="flex justify-center mb-3"><CharacterCanvas {...scene} width={140} /></div>
          <div className="w-14 h-14 rounded-full bg-sage/20 flex items-center justify-center mx-auto mb-3"><Check size={26} className="text-sage" /></div>
          <div className="font-display text-xl font-bold text-warm-900 dark:text-warm-100">{t('ootdRecord.saveComplete')}</div>
          <div className="text-sm text-warm-600 dark:text-warm-400 mt-1">{streakMsg || t('ootdRecord.savedMessage')}</div>
        </div>
      </div>
    )
  }

  if (stage === 'dress') {
    return (
      <div className="px-5 py-4">
        {quick.length > 0 && build.state.upper.length === 0 && (
          <div className="-mx-5 px-4 pt-2 pb-1">
            <div className="text-[11px] font-bold text-warm-500 mb-1.5">{t('ootdRecord.quickToday')}</div>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
              {quick.map((x: any) => (
                <button key={x.id} onClick={() => { build.applyOutfit({ ...x.pick, goto: 'builder' }) }} className="flex-none w-[96px] bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-1.5 active:scale-[0.97]">
                  <div className="flex justify-center"><CharacterCanvas {...x.scene} width={72} /></div>
                  <div className="text-[10.5px] font-bold text-warm-900 dark:text-warm-100 truncate">{x.name}</div>
                  <div className="text-[10px] text-warm-500">{x.score}{t('builder.pt')}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        <StepBuilderV2 build={build} onBack={() => navigate('/closet')} onDone={() => setStage('finish')} doneLabel={t('ootdRecord.next')} title={t('ootdRecord.whatDidYouWear')} />
      </div>
    )
  }

  const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all active:scale-95 ${on ? 'bg-terra-500 text-white' : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400'}`
  return (
    <div className="animate-screen-fade px-5 py-4 pb-10">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setStage('dress')} aria-label={t('common.back')} className="w-9 h-9 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 flex items-center justify-center active:scale-90"><ArrowLeft size={16} /></button>
        <div className="font-display text-[17px] font-bold text-warm-900 dark:text-warm-100">{t('ootdRecord.finishTitle')}</div>
      </div>

      {/* 오늘의 코디 요약 */}
      <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-3xl p-3 mb-3 grid grid-cols-[88px_1fr] gap-3 items-center">
        <div className="flex justify-center"><CharacterCanvas {...scene} width={84} /></div>
        <div className="min-w-0">
          <div className="text-[13px] font-extrabold text-warm-900 dark:text-warm-100 leading-tight truncate">{garments.map(g => g.name).join(' · ')}</div>
          <div className="flex flex-wrap gap-1 mt-1.5">{garments.map(g => <span key={g.slot} className="flex items-center gap-1 text-[10.5px] text-warm-600 dark:text-warm-300"><i className="w-3 h-3 rounded-full border border-black/10" style={{ background: COLORS_60[g.colorKey]?.hex }} />{getColorName(g.colorKey)}</span>)}</div>
          <div className="text-[12px] font-bold text-warm-800 dark:text-warm-200 mt-1.5">{score}{t('builder.pt')}{ootd.weatherData ? ` · ${ootd.weatherData.temp}°` : ''}</div>
        </div>
      </div>

      {/* 사진 */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-warm-500 mb-1.5">
          📷 {t('common.photo')} {ootd.visibility === 'public' && <span className="text-red-500 font-medium">{t('ootdRecord.photoPublicRequired')}</span>}
          {ootd.photos.length > 0 && <span className="ml-auto text-warm-400 font-medium">{ootd.photos.length}/4</span>}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {ootd.photos.map((photo, idx) => (
            <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative">
              <img src={photo} className="w-full h-full object-cover" alt="" />
              <button onClick={() => setEditingPhotoIdx(idx)} className="absolute bottom-0.5 left-0.5 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center"><Pencil size={8} /></button>
              <button onClick={() => ootd.removePhoto(idx)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 text-white text-[9px] flex items-center justify-center">✕</button>
            </div>
          ))}
          {ootd.photos.length < 4 && (
            <label className="w-16 h-16 rounded-xl border-2 border-dashed border-warm-400 dark:border-warm-600 flex flex-col items-center justify-center cursor-pointer flex-shrink-0 active:scale-95 bg-warm-100 dark:bg-warm-800">
              <Camera size={18} className="text-warm-500" />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
            </label>
          )}
        </div>
      </div>

      {/* 상황 */}
      <div className="mb-3">
        <div className="text-[11px] font-bold text-warm-500 mb-1.5">{t('ootdRecord.situationLabel')}</div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-5 px-5 [scrollbar-width:none]">
          {SITUATION_KEYS.map(key => <button key={key} onClick={() => { setCustomSit(false); ootd.setSituation(ootd.situation === key ? null : key) }} className={chip(ootd.situation === key)}>{t(`ootdRecord.situations.${key}`)}</button>)}
          <button onClick={() => { setCustomSit(true); ootd.setSituation('') }} className={chip(customSit)}>{t('ootdRecord.customInput')}</button>
        </div>
        {customSit && <input type="text" placeholder={t('ootdRecord.customPlaceholder')} maxLength={20} value={ootd.situation || ''} onChange={e => ootd.setSituation(e.target.value)} className="mt-2 w-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl px-3 py-2.5 text-[13px] text-warm-900 dark:text-warm-100 outline-none focus:border-terra-400" />}
      </div>

      {/* 기분 · 공개 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-[11px] font-bold text-warm-500 mb-1.5">{t('ootdRecord.moodLabel')}</div>
          <div className="flex gap-1.5">{MOOD_KEYS.map(m => <button key={m.key} onClick={() => ootd.setMood(ootd.mood === m.key ? null : m.key)} className={chip(ootd.mood === m.key)}>{m.emoji}</button>)}</div>
        </div>
        <div>
          <div className="text-[11px] font-bold text-warm-500 mb-1.5">{t('ootdRecord.visibilityLabel')}</div>
          <div className="flex gap-1.5">
            {[{ key: 'private', icon: <Lock size={11} /> }, { key: 'friends', icon: <Users size={11} /> }, { key: 'public', icon: <Globe size={11} /> }].map(v => (
              <button key={v.key} onClick={() => ootd.setVisibility(v.key as any)} className={chip(ootd.visibility === v.key) + ' flex items-center gap-1'}>{v.icon}{t('ootdRecord.visibility.' + v.key)}</button>
            ))}
          </div>
        </div>
      </div>
      {ootd.visibility === 'public' && <div className="-mt-1 mb-3 text-[11px] text-green-700 dark:text-green-400">{t('ootdRecord.publicNotice')}</div>}
      {(ootd.visibility === 'public' || ootd.visibility === 'friends') && profile?.instagram_id && (
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-2 mb-3">
          <div className="text-[11px] font-medium text-warm-800 dark:text-warm-200">📸 @{profile.instagram_id}</div>
          <button onClick={() => ootd.setShowInstagram(!ootd.showInstagram)} className={`w-10 h-5 rounded-full transition-all ${ootd.showInstagram ? 'bg-terra-500' : 'bg-warm-400'}`}><div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${ootd.showInstagram ? 'translate-x-5' : 'translate-x-0.5'}`} /></button>
        </div>
      )}

      {/* 메모 */}
      <input type="text" placeholder={`💬 ${t('ootdRecord.memoPlaceholder')}`} maxLength={100} value={ootd.memo} onChange={e => ootd.setMemo(e.target.value)}
        className="w-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl px-3 py-2.5 text-[13px] text-warm-900 dark:text-warm-100 placeholder-warm-400 outline-none focus:border-terra-400 mb-3" />

      {editingPhotoIdx !== null && ootd.photos[editingPhotoIdx] && <ImageEditor src={ootd.photos[editingPhotoIdx]} onSave={(dataUrl) => { ootd.replacePhoto(editingPhotoIdx, dataUrl); setEditingPhotoIdx(null) }} onCancel={() => setEditingPhotoIdx(null)} />}
      {cropSrc && <CropOverlay src={cropSrc} ratio={4 / 5} onDone={(url) => { ootd.addPhoto(url); setCropSrc(null) }} onCancel={() => setCropSrc(null)} />}

      {saveError && <div className="mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-red-700 dark:text-red-400">{saveError}</div>}

      <button onClick={handleSave} className={`w-full py-3.5 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all ${canSave && !ootd.needsPhoto ? 'bg-terra-500 text-white shadow-terra active:scale-[0.98]' : 'bg-warm-300 dark:bg-warm-600 text-white opacity-70'}`}>
        <Check size={16} /> {ootd.editId ? t('common.done') : t('ootdRecord.saveBtn')}
      </button>
    </div>
  )
}
