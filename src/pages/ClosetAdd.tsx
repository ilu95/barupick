// @ts-nocheck
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Camera, Edit3, ArrowLeft, X } from 'lucide-react'
import ColorPicker from '@/components/ui/ColorPicker'
import { COLORS_60 } from '@/lib/colors'
import { ITEMS_CATALOG } from '@/lib/styles'

// ITEMS_CATALOG + 하의/신발 통합 목록
const ALL_ITEMS = [
  ...ITEMS_CATALOG,
  { id: 'bottom', emoji: '👖', label: '하의', slot: 'bottom' },
  { id: 'shoes',  emoji: '👞', label: '신발', slot: 'shoes' },
]

// 아이템 id → 저장용 category 매핑
function itemToCategory(itemId) {
  const outerIds = ['padding', 'coat', 'jacket', 'hood_zip']
  const midIds = ['cardigan', 'knit_zip', 'vest']
  if (outerIds.includes(itemId)) return 'outer'
  if (midIds.includes(itemId)) return 'middleware'
  if (itemId === 'bottom') return 'bottom'
  if (itemId === 'shoes') return 'shoes'
  if (itemId === 'scarf') return 'scarf'
  if (itemId === 'hat') return 'hat'
  return 'top'
}

function extractColorsFromImage(img) {
  const canvas = document.createElement('canvas')
  const size = 100
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ['white', 'gray', 'black', 'beige', 'navy']
  ctx.drawImage(img, 0, 0, size, size)
  const data = ctx.getImageData(0, 0, size, size).data
  const pixels = []
  for (let y = 15; y < 85; y += 2) {
    for (let x = 15; x < 85; x += 2) {
      const i = (y * size + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const brightness = (r + g + b) / 3
      if (brightness > 20 && brightness < 245) pixels.push([r, g, b])
    }
  }
  if (pixels.length === 0) return ['white', 'gray', 'black', 'beige', 'navy']
  const buckets = {}
  pixels.forEach(p => {
    const key = `${Math.round(p[0] / 32)},${Math.round(p[1] / 32)},${Math.round(p[2] / 32)}`
    if (!buckets[key]) buckets[key] = { sum: [0, 0, 0], count: 0 }
    buckets[key].sum[0] += p[0]; buckets[key].sum[1] += p[1]; buckets[key].sum[2] += p[2]; buckets[key].count++
  })
  const clusters = Object.values(buckets).sort((a, b) => b.count - a.count).slice(0, 5)
  const dominants = clusters.map(c => [Math.round(c.sum[0] / c.count), Math.round(c.sum[1] / c.count), Math.round(c.sum[2] / c.count)])
  const matched = []
  const usedKeys = {}
  dominants.forEach(rgb => {
    let bestKey = '', bestDist = Infinity
    Object.entries(COLORS_60).forEach(([k, v]) => {
      if (usedKeys[k]) return
      const hex = v.hex
      const cr = parseInt(hex.slice(1, 3), 16), cg = parseInt(hex.slice(3, 5), 16), cb = parseInt(hex.slice(5, 7), 16)
      const dist = Math.sqrt((rgb[0] - cr) ** 2 + (rgb[1] - cg) ** 2 + (rgb[2] - cb) ** 2)
      if (dist < bestDist) { bestDist = dist; bestKey = k }
    })
    if (bestKey && !usedKeys[bestKey]) { matched.push(bestKey); usedKeys[bestKey] = true }
  })
  return matched.length > 0 ? matched.slice(0, 5) : ['white', 'gray', 'black', 'beige', 'navy']
}

function generateThumbnail(img) {
  const tc = document.createElement('canvas')
  tc.width = 150; tc.height = 150
  const tctx = tc.getContext('2d')
  if (!tctx) return ''
  const s = Math.min(img.width, img.height)
  const sx = (img.width - s) / 2, sy = (img.height - s) / 2
  tctx.drawImage(img, sx, sy, s, s, 0, 0, 150, 150)
  return tc.toDataURL('image/jpeg', 0.6)
}

export default function ClosetAdd() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [mode, setMode] = useState('select')
  const [selectedItem, setSelectedItem] = useState(null) // ALL_ITEMS 중 하나
  const [color, setColor] = useState(null)
  const [brand, setBrand] = useState('')
  const [itemName, setItemName] = useState('')
  const [saved, setSaved] = useState(false)
  const [photoData, setPhotoData] = useState(null)
  const [photoThumb, setPhotoThumb] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [extracting, setExtracting] = useState(false)
  const fileRef = useRef(null)

  const resetForm = () => {
    setSelectedItem(null); setColor(null); setBrand(''); setItemName('')
    setPhotoData(null); setPhotoThumb(null); setCandidates([])
  }

  const handleSave = () => {
    if (!selectedItem || !color) return
    try {
      const items = JSON.parse(localStorage.getItem('sp_wardrobe') || '[]')
      items.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        category: itemToCategory(selectedItem.id),
        itemType: selectedItem.id,
        color, colorKey: color,
        brand: brand.trim() || null,
        name: itemName.trim() || selectedItem.label,
        photoThumb: photoThumb || null,
        createdAt: new Date().toISOString(),
      })
      if (items.length > 200) items.length = 200
      localStorage.setItem('sp_wardrobe', JSON.stringify(items))
      setSaved(true)
      setTimeout(() => { setSaved(false); resetForm(); setMode('select') }, 1200)
    } catch {}
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setExtracting(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const imgSrc = ev.target?.result
      setPhotoData(imgSrc)
      const img = new Image()
      img.onload = () => {
        setPhotoThumb(generateThumbnail(img))
        const colors = extractColorsFromImage(img)
        setCandidates(colors)
        if (colors.length > 0) setColor(colors[0])
        setExtracting(false)
      }
      img.onerror = () => setExtracting(false)
      img.src = imgSrc
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ─── 아이템 선택 (코디 만들기와 동일한 아이템 목록) ───
  const ItemSelector = () => (
    <div className="mb-5">
      <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-2">{t('closetAdd.step1')}</div>
      <div className="flex flex-wrap gap-2">
        {ALL_ITEMS.map(item => (
          <button key={item.id} onClick={() => setSelectedItem(item)} className={`px-3 py-2 rounded-full text-[12px] font-medium transition-all ${selectedItem?.id === item.id ? 'bg-terra-500 text-white shadow-terra' : 'bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-700 dark:text-warm-300 active:scale-95'}`}>
            {item.emoji} {item.label}
          </button>
        ))}
      </div>
    </div>
  )

  // ─── 브랜드 + 상품명 ───
  const ItemInfo = ({ step }) => (
    <div className="mb-5">
      <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-2">{step}. {t('closetAdd.step3')}</div>
      <div className="flex flex-col gap-2.5">
        <input type="text" placeholder={t('closetAdd.brandPlaceholder')} maxLength={30} value={brand} onChange={e => setBrand(e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl text-sm text-warm-900 dark:text-warm-100 placeholder-warm-500 focus:outline-none focus:border-terra-400 transition-all" />
        <input type="text" placeholder={t('closetAdd.namePlaceholder')} maxLength={40} value={itemName} onChange={e => setItemName(e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl text-sm text-warm-900 dark:text-warm-100 placeholder-warm-500 focus:outline-none focus:border-terra-400 transition-all" />
      </div>
    </div>
  )

  if (saved) {
    return (
      <div className="animate-screen-fade flex items-center justify-center py-32">
        <div className="text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="font-display text-lg font-bold text-warm-900 dark:text-warm-100">{t('common.done')}</div>
        </div>
      </div>
    )
  }

  if (mode === 'select') {
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-2">{t('header.closetAdd')}</h2>
        <p className="text-sm text-warm-600 dark:text-warm-400 mb-6">{t('closetAdd.step1')}</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => setMode('photo')} className="w-full flex items-center gap-4 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-5 text-left shadow-warm-sm active:scale-[0.98] transition-all">
            <div className="w-12 h-12 rounded-xl bg-terra-100 dark:bg-terra-900/30 flex items-center justify-center flex-shrink-0"><Camera size={24} className="text-terra-600 dark:text-terra-400" /></div>
            <div><div className="text-[15px] font-semibold text-warm-900 dark:text-warm-100">{t('closetAdd.photoMode')}</div><div className="text-xs text-warm-600 dark:text-warm-400 mt-0.5">{t('closetAdd.colorExtract')}</div></div>
          </button>
          <button onClick={() => setMode('manual')} className="w-full flex items-center gap-4 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-5 text-left shadow-warm-sm active:scale-[0.98] transition-all">
            <div className="w-12 h-12 rounded-xl bg-warm-300 dark:bg-warm-700 flex items-center justify-center flex-shrink-0"><Edit3 size={24} className="text-warm-700 dark:text-warm-300" /></div>
            <div><div className="text-[15px] font-semibold text-warm-900 dark:text-warm-100">{t('closetAdd.manualMode')}</div><div className="text-xs text-warm-600 dark:text-warm-400 mt-0.5">{t('closetAdd.step2')}</div></div>
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'photo') {
    return (
      <div className="animate-screen-enter px-5 pt-2 pb-10">
        <button onClick={() => { resetForm(); setMode('select') }} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70"><ArrowLeft size={16} /> {t('common.back')}</button>
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-5">{t('closetAdd.photoMode')}</h2>

        <ItemSelector />

        <div className="mb-5">
          <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-2">2. {t('common.photo')}</div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
          {photoData ? (
            <div className="relative w-full aspect-square max-w-[200px] mx-auto rounded-2xl overflow-hidden border border-warm-400 dark:border-warm-600 cursor-pointer" onClick={() => fileRef.current?.click()}>
              <img src={photoData} className="w-full h-full object-cover" alt="" />
              <button onClick={(e) => { e.stopPropagation(); setPhotoData(null); setPhotoThumb(null); setCandidates([]); setColor(null) }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center"><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="w-full aspect-[4/3] max-w-[250px] mx-auto rounded-2xl border-2 border-dashed border-warm-400 dark:border-warm-600 flex flex-col items-center justify-center bg-warm-100 dark:bg-warm-800 active:scale-[0.98] transition-all">
              <Camera size={32} className="text-warm-500 dark:text-warm-400 mb-2" />
              <span className="text-sm text-warm-500 dark:text-warm-400">{t('common.addPhoto')}</span>
            </button>
          )}
          {extracting && <div className="text-center text-xs text-terra-600 dark:text-terra-400 mt-2 animate-pulse">{t('closetAdd.colorExtract')}</div>}
        </div>

        {candidates.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-2">3. {t('closetAdd.step2')}</div>
            <div className="flex gap-2.5 flex-wrap mb-2">
              {candidates.map(ck => {
                const c = COLORS_60[ck]; if (!c) return null
                const sel = color === ck
                return (
                  <button key={ck} onClick={() => setColor(ck)} className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${sel ? 'scale-105' : ''}`}>
                    <div className={`w-12 h-12 rounded-xl border-2 ${sel ? 'border-terra-500 ring-2 ring-terra-300' : 'border-warm-400 dark:border-warm-600'}`} style={{ background: c.hex }} />
                    <span className="text-[10px] text-warm-600 dark:text-warm-400 font-medium">{c.name}</span>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setMode('manual')} className="text-xs text-terra-600 dark:text-terra-400 font-medium active:opacity-70">{t('closetAdd.manualMode')} →</button>
          </div>
        )}

        {color && <ItemInfo step={4} />}

        {selectedItem && color && (
          <button onClick={handleSave} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra">{t('common.done')}</button>
        )}
      </div>
    )
  }

  return (
    <div className="animate-screen-enter px-5 pt-2 pb-10">
      <button onClick={() => { resetForm(); setMode('select') }} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70"><ArrowLeft size={16} /> {t('common.back')}</button>
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-5">{t('closetAdd.manualMode')}</h2>

      <ItemSelector />

      {selectedItem && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-2">
            2. {t('closetAdd.step2')} {color && <span className="text-terra-600 dark:text-terra-400 normal-case tracking-normal">— {COLORS_60[color]?.name}</span>}
          </div>
          <ColorPicker inline selected={color} onSelect={setColor} onClear={() => setColor(null)} />
        </div>
      )}

      {selectedItem && color && <ItemInfo step={3} />}

      {selectedItem && color && (
        <button onClick={handleSave} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra">{t('common.done')}</button>
      )}
    </div>
  )
}
