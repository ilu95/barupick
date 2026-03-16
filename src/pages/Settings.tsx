import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Moon, Eye, EyeOff, Cloud, MessageSquare, FileText, Shield, LogOut, UserX, Info, Download, Globe } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useAutoSync, useLastSyncTime } from '@/hooks/useAutoSync'
import { useModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
]

export default function Settings() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, logout } = useAuth()
  const { syncNow } = useAutoSync()
  const lastSync = useLastSyncTime()
  const modal = useModal()
  const toast = useToast()
  const { t, i18n } = useTranslation()
  const [darkMode, setDarkMode] = useState(localStorage.getItem('sp_dark_mode') === '1')
  const [hideCounts, setHideCounts] = useState(localStorage.getItem('sp_hide_counts') === '1')
  const [syncing, setSyncing] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(searchParams.get('feedback') === '1')

  const toggleDark = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('sp_dark_mode', next ? '1' : '0')
    document.documentElement.classList.toggle('dark', next)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next ? '#1C1917' : '#F7F5F2')
  }

  const toggleHide = () => {
    const next = !hideCounts
    setHideCounts(next)
    localStorage.setItem('sp_hide_counts', next ? '1' : '0')
  }

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('sp_language', code)
  }

  const syncData = async () => {
    if (!user) return
    setSyncing(true)
    try {
      await syncNow()
      toast.success(t('settings.syncSuccess'))
    } catch (e: any) {
      toast.error(t('settings.syncFailed', { error: e.message || '' }))
    } finally {
      setSyncing(false)
    }
  }

  const deleteAccount = () => {
    modal.confirm({
      title: t('settings.deleteAccountTitle'),
      message: t('settings.deleteAccountMessage'),
      confirmLabel: t('settings.deleteAccountContinue'),
      variant: 'danger',
      onConfirm: () => {
        const confirmWord = t('settings.deleteAccountPlaceholder')
        modal.prompt({
          title: t('settings.deleteAccountConfirmTitle'),
          message: t('settings.deleteAccountConfirmMessage'),
          placeholder: confirmWord,
          validate: (v) => v === confirmWord ? null : t('settings.deleteAccountValidation'),
          onConfirm: async () => {
            try {
              await supabase.rpc('delete_own_account')
              localStorage.clear()
              toast.success(t('settings.deleteAccountSuccess'))
              setTimeout(() => window.location.reload(), 1500)
            } catch (e: any) {
              toast.error(t('settings.deleteAccountError', { error: e.message || '' }))
            }
          },
        })
      },
    })
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">

      {/* 디스플레이 */}
      <SectionHeader icon={<Eye size={14} />} title={t('settings.display')} />

      {/* 언어 선택 */}
      <div className="flex items-center justify-between py-3.5 border-b border-warm-300">
        <div className="flex items-center gap-2.5">
          <span className="text-warm-600"><Globe size={18} /></span>
          <div>
            <span className="text-[15px] text-warm-900 dark:text-warm-100">{t('settings.language')}</span>
            <div className="text-[11px] text-warm-500">{t('settings.languageDesc')}</div>
          </div>
        </div>
        <div className="flex gap-1">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                i18n.language === lang.code
                  ? 'bg-terra-500 text-white'
                  : 'bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-300 active:scale-95'
              }`}
            >
              {lang.flag} {lang.label}
            </button>
          ))}
        </div>
      </div>

      <ToggleItem
        icon={<Moon size={18} />}
        label={t('settings.darkMode')}
        desc={t('settings.darkModeDesc')}
        value={darkMode}
        onChange={toggleDark}
      />
      <ToggleItem
        icon={<EyeOff size={18} />}
        label={t('settings.hideCounts')}
        desc={t('settings.hideCountsDesc')}
        value={hideCounts}
        onChange={toggleHide}
        last
      />

      {/* 데이터 */}
      {user && (
        <>
          <SectionHeader icon={<Cloud size={14} />} title={t('settings.data')} />

          <div className="flex items-center gap-2.5 py-3 border-b border-warm-300">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[13px] text-warm-900 dark:text-warm-100">{t('settings.autoSyncActive')}</div>
              <div className="text-[11px] text-warm-500">{lastSync || t('settings.notSynced')}</div>
            </div>
          </div>

          <button
            onClick={syncData}
            disabled={syncing}
            className="w-full flex items-center gap-2.5 py-3.5 border-b border-warm-300 text-left active:bg-warm-200/50 rounded-lg transition-colors"
          >
            <Cloud size={18} className="text-warm-600" />
            <div className="flex-1">
              <span className="text-[15px] text-warm-900 dark:text-warm-100">{t('settings.syncNow')}</span>
              <div className="text-[11px] text-warm-500">{t('settings.syncNowDesc')}</div>
            </div>
            {syncing && <div className="w-4 h-4 border-2 border-terra-300 border-t-terra-500 rounded-full animate-spin" />}
          </button>
          <button
            onClick={() => {
              try {
                const data = {
                  records: JSON.parse(localStorage.getItem('sp_ootd_records') || '[]'),
                  closet: JSON.parse(localStorage.getItem('sp_wardrobe') || '[]'),
                  saved: JSON.parse(localStorage.getItem('cs_saved') || '[]'),
                  profile: JSON.parse(localStorage.getItem('cs_profile') || '{}'),
                  exportDate: new Date().toISOString(),
                }
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = 'barupick_backup.json'; a.click()
                URL.revokeObjectURL(url)
              } catch (e: any) { toast.error(t('settings.exportFailed', { error: e.message })) }
            }}
            className="w-full flex items-center gap-2.5 py-3.5 border-b border-warm-300 text-left active:bg-warm-200/50 rounded-lg transition-colors"
          >
            <Download size={18} className="text-warm-600" />
            <div className="flex-1">
              <span className="text-[15px] text-warm-900 dark:text-warm-100">{t('settings.exportData')}</span>
              <div className="text-[11px] text-warm-500">{t('settings.exportDataDesc')}</div>
            </div>
          </button>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="w-full flex items-center gap-2.5 py-3.5 text-left active:bg-warm-200/50 rounded-lg transition-colors"
          >
            <MessageSquare size={18} className="text-warm-600" />
            <span className="text-[15px] text-warm-900 dark:text-warm-100 flex-1">{t('settings.feedback')}</span>
          </button>
        </>
      )}

      {/* 정보 */}
      <SectionHeader icon={<Info size={14} />} title={t('settings.info')} />
      <button onClick={() => navigate('/terms')} className="w-full flex items-center gap-2.5 py-3.5 border-b border-warm-300 text-left active:bg-warm-200/50 rounded-lg transition-colors">
        <FileText size={18} className="text-warm-600" />
        <span className="text-[15px] text-warm-900 dark:text-warm-100 flex-1">{t('settings.terms')}</span>
      </button>
      <button onClick={() => navigate('/privacy')} className="w-full flex items-center gap-2.5 py-3.5 border-b border-warm-300 text-left active:bg-warm-200/50 rounded-lg transition-colors">
        <Shield size={18} className="text-warm-600" />
        <span className="text-[15px] text-warm-900 dark:text-warm-100 flex-1">{t('settings.privacy')}</span>
      </button>
      <div className="flex items-center justify-between py-3 text-sm border-b border-warm-300">
        <span className="text-warm-600">{t('common.version')}</span>
        <span className="font-display text-warm-800 dark:text-warm-200 font-medium">1.0.1</span>
      </div>
      <div className="flex items-center justify-between py-3 text-sm mb-6">
        <span className="text-warm-600">{t('common.developer')}</span>
        <span className="text-warm-800 dark:text-warm-200 font-medium">{t('common.developerName')}</span>
      </div>

      {/* 계정 */}
      {user && (
        <>
          <SectionHeader icon={<LogOut size={14} />} title={t('settings.account')} />
          <button onClick={logout} className="w-full flex items-center gap-2.5 py-3.5 border-b border-warm-300 text-left active:bg-warm-200/50 rounded-lg transition-colors">
            <LogOut size={18} className="text-warm-600" />
            <span className="text-[15px] text-warm-900 dark:text-warm-100 flex-1">{t('settings.logout')}</span>
          </button>
          <button onClick={deleteAccount} className="w-full flex items-center gap-2.5 py-3.5 text-left active:bg-warm-200/50 rounded-lg transition-colors">
            <UserX size={18} className="text-red-500" />
            <span className="text-[15px] text-red-600 flex-1">{t('settings.deleteAccount')}</span>
          </button>
        </>
      )}

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} userId={user?.id} />}
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-warm-600 tracking-widest uppercase mb-3 pb-2 border-b border-warm-400 mt-2">
      {icon} {title}
    </div>
  )
}

function ToggleItem({ icon, label, desc, value, onChange, last }: {
  icon: React.ReactNode, label: string, desc: string, value: boolean, onChange: () => void, last?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-3.5 ${last ? '' : 'border-b border-warm-300'}`}>
      <div className="flex items-center gap-2.5">
        <span className="text-warm-600">{icon}</span>
        <div>
          <span className="text-[15px] text-warm-900 dark:text-warm-100">{label}</span>
          <div className="text-[11px] text-warm-500">{desc}</div>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`w-11 h-6 rounded-full p-0.5 transition-colors ${value ? 'bg-terra-500' : 'bg-warm-400'}`}
      >
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

function FeedbackModal({ onClose, userId }: { onClose: () => void, userId?: string }) {
  const toast = useToast()
  const { t } = useTranslation()
  const [type, setType] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const types = [
    { key: 'bug', label: t('feedbackModal.typeBug') },
    { key: 'feature', label: t('feedbackModal.typeFeature') },
    { key: 'design', label: t('feedbackModal.typeDesign') },
    { key: 'other', label: t('feedbackModal.typeOther') },
  ]

  const submit = async () => {
    if (!type || !message.trim()) { toast.error(t('feedbackModal.typeRequired')); return }
    setSending(true)
    try {
      await supabase.from('feedbacks').insert({
        user_id: userId || null,
        type,
        message: message.trim(),
        screen: window.location.pathname,
      })
      toast.success(t('feedbackModal.sendSuccess'))
      onClose()
    } catch (e: any) {
      toast.error(t('feedbackModal.sendFailed', { error: e.message || '' }))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[300] flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-[480px] bg-white dark:bg-warm-800 rounded-t-3xl p-6 pb-8 animate-screen-enter" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-warm-400 rounded-full mx-auto mb-5" />
        <h3 className="font-display text-lg font-bold text-warm-900 dark:text-warm-100 mb-4">{t('feedbackModal.title')}</h3>

        <div className="flex gap-2 mb-4">
          {types.map(tp => (
            <button
              key={tp.key}
              onClick={() => setType(tp.key)}
              className={`px-3.5 py-2 rounded-full text-[12px] font-medium transition-all ${type === tp.key ? 'bg-terra-500 text-white' : 'bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-300 active:scale-95'
                }`}
            >
              {tp.label}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={t('feedbackModal.placeholder')}
          maxLength={1000}
          className="w-full h-32 px-4 py-3 bg-warm-100 dark:bg-warm-700 border border-warm-400 dark:border-warm-600 rounded-2xl text-sm text-warm-900 dark:text-warm-100 placeholder-warm-500 focus:outline-none focus:border-terra-400 resize-none mb-4"
        />

        <button
          onClick={submit}
          disabled={sending}
          className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra disabled:opacity-50"
        >
          {sending ? t('feedbackModal.sending') : t('common.send')}
        </button>
      </div>
    </div>
  )
}
