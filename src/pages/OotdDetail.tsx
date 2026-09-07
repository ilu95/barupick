import { setJSON } from '@/lib/storage'
import { useState, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Pencil, Trash2, Share, Globe, Calendar, Tag, Smile, Cloud, ArrowLeft, Image } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { COLORS_60, getColorName } from '@/lib/colors'

import { useOotd } from '@/hooks/useOotd'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import ShareCard, { useShareCard } from '@/components/ui/ShareCard'
import { enqueuePost, usePostQueue } from '@/lib/postQueue'
import { evaluationSystem } from '@/lib/evaluation'
import { getScorePercentile } from '@/hooks/useWardrobe'
import { useTranslation } from 'react-i18next'
import { getLocale } from '@/i18n'
import { weatherEmoji } from '@/hooks/useOotd'

const SITUATION_KEYS = ['commute', 'date', 'casual', 'interview', 'travel', 'exercise'] as const
const MOOD_KEYS = ['satisfied', 'okay', 'regret'] as const
const MOOD_EMOJIS: Record<string, string> = { satisfied: '😊', okay: '😐', regret: '😕' }

/** 한국어로 저장된 기존 상황 데이터 → key 역매핑 */
const SITUATION_KO_MAP: Record<string, string> = {
  '출근': 'commute', '데이트': 'date', '캐주얼': 'casual',
  '면접': 'interview', '여행': 'travel', '운동': 'exercise',
}

/** 한국어로 저장된 기존 기분 데이터 → key 역매핑 */
const MOOD_KO_MAP: Record<string, string> = {
  '만족': 'satisfied', '그저그럭': 'okay', '아쉬움': 'regret',
}

function resolveSituation(raw: string | null, t: any): string | null {
  if (!raw) return null
  // 새 형식: key값 (commute, date 등)
  if (SITUATION_KEYS.includes(raw as any)) return t(`ootdRecord.situations.${raw}`)
  // 구 형식: 한국어 역매핑
  const key = SITUATION_KO_MAP[raw]
  if (key) return t(`ootdRecord.situations.${key}`)
  // 사용자 직접 입력
  return raw
}

function resolveMood(raw: string | null, t: any): string | null {
  if (!raw) return null
  // 새 형식: key값 (satisfied, okay 등)
  if (MOOD_KEYS.includes(raw as any)) {
    return MOOD_EMOJIS[raw] + ' ' + t(`ootdRecord.moods.${raw}`)
  }
  // 구 형식: "😊 만족" → 이모지 + 한국어
  const match = raw.match(/^(.+?)\s+(.+)$/)
  if (match) {
    const koText = match[2]
    const key = MOOD_KO_MAP[koText]
    if (key) return match[1] + ' ' + t(`ootdRecord.moods.${key}`)
  }
  return raw
}

function resolveWeather(record: any, t: any): string | null {
  // weatherData가 있으면 다국어 표시
  if (record.weatherData) {
    const wd = record.weatherData
    const code = wd.code ?? 0
    const emoji = weatherEmoji(code)
    const textKey = getWeatherTextKey(code)
    return `${emoji} ${wd.temp}°C ${t('weatherConditions.' + textKey)}`
  }
  // weatherData 없이 weather 문자열만 있는 경우 (아주 오래된 데이터)
  return record.weather || null
}

function getWeatherTextKey(code: number): string {
  if (code === 0) return 'clear'
  if (code <= 3) return 'partlyCloudy'
  if (code <= 48) return 'fog'
  if (code <= 57) return 'drizzle'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  if (code <= 82) return 'showers'
  if (code <= 86) return 'heavySnow'
  if (code <= 99) return 'thunderstorm'
  return 'cloudy'
}

export default function OotdDetail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { date } = useParams()
  const [searchParams] = useSearchParams()
  const recordId = searchParams.get('id')
  const { getRecords, deleteRecord } = useOotd()
  const postQueue = usePostQueue()
  const { user } = useAuth()
  const modal = useModal()
  const toast = useToast()
  const { open: shareOpen, cardData, showShareCard, hideShareCard } = useShareCard()
  const [sharing, setSharing] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  const records = getRecords().filter(r => r.date === date)
  const record = recordId ? records.find(r => r.id === recordId) : records[0]

  if (!record) {
    return (
      <div className="animate-screen-fade px-5 pt-6 pb-10 text-center py-20">
        <div className="text-4xl mb-3">📝</div>
        <div className="text-sm text-warm-600 dark:text-warm-400 mb-4">{t('ootdDetail.notFound')}</div>
        <button onClick={() => navigate('/closet')} className="px-5 py-2 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all">
          {t('ootdDetail.goToCloset')}
        </button>
      </div>
    )
  }

  // 마네킹용 hex
  const outfitHex: Record<string, string> = {}
  Object.entries(record.colors || {}).forEach(([k, v]) => {
    if (v) { const c = COLORS_60[v]; if (c) outfitHex[k] = c.hex }
  })

  const [ry, rm, rd] = (record.date || '').split('-').map(Number)
  const dateObj = new Date(ry, rm - 1, rd)
  const dateLabel = dateObj.toLocaleDateString(getLocale(), { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  const handleDelete = () => {
    modal.confirm({
      title: t('ootdDetail.deleteRecord'),
      message: t('ootdDetail.deleteConfirm'),
      confirmLabel: t('common.delete'),
      variant: 'danger',
      onConfirm: () => {
        deleteRecord(record.id)
        toast.success(t('ootdDetail.deleteSuccess'))
        navigate('/closet', { replace: true })
      },
    })
  }

  const handleEdit = () => {
    setJSON("_ootd_edit", record)
    navigate("/record?edit=" + record.id)
  }

  const handleCommunityShare = async () => {
    if (sharing) return
    // 사진 없으면 안내
    if (!record.photos || record.photos.length === 0) {
      setShareMsg(t('ootdDetail.addPhotoToShare'))
      setTimeout(() => setShareMsg(''), 3000)
      return
    }
    if (!user) {
      setShareMsg(t('common.loginRequired'))
      navigate('/auth/login')
      return
    }
    if (record.postId && record.visibility !== 'private' && !postQueue.isPending(record.id)) {
      setShareMsg(t('ootdDetail.alreadyShared'))
      setTimeout(() => setShareMsg(''), 3000)
      return
    }
    setSharing(true)
    try {
      // 로컬은 즉시 공개로, 서버 반영은 큐가 (사진 업로드 포함)
      const recs = JSON.parse(localStorage.getItem('sp_ootd_records') || '[]')
      const ri = recs.findIndex((r: any) => r.id === record.id)
      if (ri >= 0) { recs[ri].visibility = 'public'; setJSON('sp_ootd_records', recs) }
      enqueuePost({ recordId: record.id, op: 'publish', visibility: 'public' })
      setShareMsg(t('ootdDetail.publishQueued'))
    } catch (e) {
      console.error('Share error:', e)
      setShareMsg(t('ootdDetail.shareError'))
    } finally {
      setSharing(false)
      setTimeout(() => setShareMsg(''), 3000)
    }
  }

  // 같은 날짜에 여러 기록이 있으면 리스트 표시
  if (records.length > 1 && !recordId) {
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-1">{dateLabel}</h2>
        <p className="text-sm text-warm-600 mb-5">{t('ootdDetail.recordCount', { count: records.length })}</p>
        <div className="flex flex-col gap-2.5">
          {records.map(r => {
            const hex: Record<string, string> = {}
            Object.entries(r.colors || {}).forEach(([k, v]) => {
              if (v) { const c = COLORS_60[v]; if (c) hex[k] = c.hex }
            })
            const hasPhoto = r.photos && r.photos.length > 0
            return (
              <button
                key={r.id}
                onClick={() => navigate(`/closet/ootd/${date}?id=${r.id}`)}
                className="flex items-center gap-3 bg-white border border-warm-400 rounded-2xl p-3 shadow-warm-sm active:scale-[0.98] transition-all text-left"
              >
                {hasPhoto ? (
                  <img src={r.photos[0]} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" alt="" />
                ) : (
                  <MannequinSVG outfit={hex} size={60} />
                )}
                <div className="flex-1">
                  <span className="font-display text-sm font-bold text-terra-600">{t('common.score', { score: r.score })}</span>
                  {r.situation && <span className="text-[11px] text-warm-600 ml-2">{r.situation}</span>}
                  {r.memo && <div className="text-[11px] text-warm-500 truncate mt-0.5">{r.memo}</div>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {/* 사진 갤러리 — 사진이 메인 */}
      {record.photos && record.photos.length > 0 && (
        <div className="mb-4 -mx-5">
          {record.photos.length === 1 ? (
            <img src={record.photos[0]} className="w-full aspect-[4/5] object-cover" alt="outfit photo" />
          ) : (
            <div className="flex gap-1.5 overflow-x-auto pb-2 hide-scrollbar px-5">
              {record.photos.map((photo, idx) => (
                <img key={idx} src={photo} className="w-[80vw] max-w-[380px] aspect-[4/5] rounded-xl object-cover flex-shrink-0" alt={`outfit photo ${idx + 1}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 마네킹 + 점수 */}
      <div className="flex items-center gap-5 mb-5">
        <div className="bg-warm-100 rounded-2xl p-4 flex-shrink-0">
          <MannequinSVG outfit={outfitHex} size={record.photos?.length > 0 ? 80 : 120} />
        </div>
        <div className="flex-1">
          <div className="font-display text-3xl font-bold text-warm-900 mb-1">{t('common.score', { score: record.score })}
            {(() => { const p = getScorePercentile(record.score); return p ? <span className="ml-2 text-[10px] font-semibold bg-terra-100 text-terra-600 dark:bg-terra-900/30 dark:text-terra-400 px-2 py-0.5 rounded-full align-middle">{p.label}</span> : null })()}
          </div>
          <div className="text-sm text-warm-600 mb-3">{dateLabel}</div>

          {/* 컬러 정보 */}
          <div className="flex flex-col gap-1">
            {Object.entries(record.colors || {}).filter(([_, v]) => v).map(([part, colorKey]) => {
              const c = COLORS_60[colorKey as string]
              if (!c) return null
              const itemId = record.itemTypes?.[part]
              const partLabel = itemId ? t('categories:itemsCatalog.' + itemId) : t('categories:names.' + part)
              return (
                <div key={part} className="flex items-center gap-1.5 text-xs">
                  <span className="w-3.5 h-3.5 rounded flex-shrink-0 border border-warm-400" style={{ background: c.hex }} />
                  <span className="text-warm-500 w-16 flex-shrink-0">{partLabel}</span>
                  <span className="text-warm-800">{getColorName(colorKey as string)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="bg-white border border-warm-400 rounded-2xl p-4 mb-5 shadow-warm-sm space-y-3">
        {record.situation && (
          <div className="flex items-center gap-2 text-sm">
            <Tag size={14} className="text-warm-500" />
            <span className="text-warm-800">{resolveSituation(record.situation, t)}</span>
          </div>
        )}
        {record.mood && (
          <div className="flex items-center gap-2 text-sm">
            <Smile size={14} className="text-warm-500" />
            <span className="text-warm-800">{resolveMood(record.mood, t)}</span>
          </div>
        )}
        {(record.weather || record.weatherData) && (
          <div className="flex items-center gap-2 text-sm">
            <Cloud size={14} className="text-warm-500" />
            <span className="text-warm-800">{resolveWeather(record, t)}</span>
          </div>
        )}
        {record.memo && (
          <div className="text-sm text-warm-700 bg-warm-100 rounded-xl px-3 py-2">💬 {record.memo}</div>
        )}
      </div>

      {/* 액션 */}
      <div className="flex gap-2.5 mb-3">
        <button
          onClick={handleEdit}
          className="flex-1 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl text-sm font-medium text-warm-800 dark:text-warm-200 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
        >
          <Pencil size={14} /> {t('ootdDetail.editRecord')}
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 py-3 bg-white dark:bg-warm-800 border border-red-200 dark:border-red-800 rounded-2xl text-sm font-medium text-red-600 dark:text-red-400 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
        >
          <Trash2 size={14} /> {t('ootdDetail.deleteRecord')}
        </button>
      </div>

      {/* 공유 카드 — 사진 있을 때만 */}
      {record.photos && record.photos.length > 0 && (
        <button
          onClick={() => {
            showShareCard({
              photoUrl: record.photos[0],
              outfitHex,
            })
          }}
          className="w-full py-3 mb-3 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra"
        >
          <Image size={16} /> {t('ootdDetail.shareCard')}
        </button>
      )}

      {postQueue.isPending(record.id) && (
        <button onClick={() => postQueue.retry()} className="w-full mb-3 flex items-center justify-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl py-2 active:scale-[0.99]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> {t('ootdDetail.publishPending')}
        </button>
      )}
      {shareMsg && (
        <div className="mb-3 text-center text-xs font-medium text-terra-600 dark:text-terra-400 bg-terra-50 dark:bg-terra-900/20 border border-terra-200 dark:border-terra-800 rounded-xl py-2 animate-screen-fade">
          {shareMsg}
        </div>
      )}

      <button
        onClick={handleCommunityShare}
        disabled={sharing}
        className="w-full py-3 bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        <Globe size={16} /> {sharing ? '...' : (record.postId && record.visibility !== 'private' && !postQueue.isPending(record.id)) ? t('ootdDetail.communityShareSuccess') : t('ootdDetail.communityShare')}
      </button>

      {/* 공유 카드 모달 */}
      {shareOpen && cardData && (
        <ShareCard data={cardData} onClose={hideShareCard} />
      )}
    </div>
  )
}
