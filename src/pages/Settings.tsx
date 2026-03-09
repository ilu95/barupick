import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Eye, EyeOff, Cloud, MessageSquare, FileText, Shield, LogOut, UserX, Info, Check, Download } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useAutoSync, useLastSyncTime } from '@/hooks/useAutoSync'

export default function Settings() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { syncNow } = useAutoSync()
  const lastSync = useLastSyncTime()
  const [darkMode, setDarkMode] = useState(localStorage.getItem('sp_dark_mode') === '1')
  const [a11yLabels, setA11yLabels] = useState(localStorage.getItem('sp_a11y_labels') === '1')
  const [hideCounts, setHideCounts] = useState(localStorage.getItem('sp_hide_counts') === '1')
  const [syncing, setSyncing] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const toggleDark = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('sp_dark_mode', next ? '1' : '0')
    document.documentElement.classList.toggle('dark', next)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next ? '#1C1917' : '#F7F5F2')
  }

  const toggleA11y = () => {
    const next = !a11yLabels
    setA11yLabels(next)
    localStorage.setItem('sp_a11y_labels', next ? '1' : '0')
  }

  const toggleHide = () => {
    const next = !hideCounts
    setHideCounts(next)
    localStorage.setItem('sp_hide_counts', next ? '1' : '0')
  }

  // 데이터 동기화
  const syncData = async () => {
    if (!user) return
    setSyncing(true)
    try {
      await syncNow()
      alert('동기화 완료!')
    } catch (e: any) {
      alert('동기화 실패: ' + (e.message || ''))
    } finally {
      setSyncing(false)
    }
  }

  // 계정 삭제
  const deleteAccount = async () => {
    if (!confirm('정말 계정을 삭제하시겠어요?\n\n• 모든 코디 기록이 삭제됩니다\n• 커뮤니티 게시물이 삭제됩니다\n• 이 작업은 되돌릴 수 없습니다')) return
    const input = prompt('확인을 위해 "계정삭제"를 입력해주세요:')
    if (input !== '계정삭제') { alert('계정 삭제가 취소되었어요'); return }
    try {
      await supabase.rpc('delete_own_account')
      localStorage.clear()
      alert('계정이 삭제되었어요. 이용해주셔서 감사합니다.')
      window.location.reload()
    } catch (e: any) {
      alert('계정 삭제 중 오류: ' + (e.message || ''))
    }
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">

      {/* 디스플레이 */}
      <SectionHeader icon={<Eye size={14} />} title="디스플레이" />

      <ToggleItem
        icon={<Moon size={18} />}
        label="다크 모드"
        desc="눈의 피로를 줄여줍니다"
        value={darkMode}
        onChange={toggleDark}
      />
      <ToggleItem
        icon={<Eye size={18} />}
        label="색상 라벨 표시"
        desc="색각이상자를 위한 색상명 표시"
        value={a11yLabels}
        onChange={toggleA11y}
      />
      <ToggleItem
        icon={<EyeOff size={18} />}
        label="좋아요/저장 숫자 숨기기"
        desc="내 게시물의 반응 수를 다른 사람에게 숨겨요"
        value={hideCounts}
        onChange={toggleHide}
        last
      />

      {/* 데이터 */}
      {user && (
        <>
          <SectionHeader icon={<Cloud size={14} />} title="데이터" />

          {/* 자동 동기화 안내 */}
          <div className="flex items-center gap-2.5 py-3 border-b border-warm-300">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[13px] text-warm-900">자동 동기화 활성</div>
              <div className="text-[11px] text-warm-500">{lastSync || '아직 동기화되지 않음'}</div>
            </div>
          </div>

          <button
            onClick={syncData}
            disabled={syncing}
            className="w-full flex items-center gap-2.5 py-3.5 border-b border-warm-300 text-left active:bg-warm-200/50 rounded-lg transition-colors"
          >
            <Cloud size={18} className="text-warm-600" />
            <div className="flex-1">
              <span className="text-[15px] text-warm-900">지금 동기화</span>
              <div className="text-[11px] text-warm-500">수동으로 서버와 동기화합니다</div>
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
              } catch (e: any) { alert('내보내기 실패: ' + e.message) }
            }}
            className="w-full flex items-center gap-2.5 py-3.5 border-b border-warm-300 text-left active:bg-warm-200/50 rounded-lg transition-colors"
          >
            <Download size={18} className="text-warm-600" />
            <div className="flex-1">
              <span className="text-[15px] text-warm-900">데이터 내보내기</span>
              <div className="text-[11px] text-warm-500">OOTD 기록, 옷장, 저장한 코디를 JSON으로 다운로드</div>
            </div>
          </button>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="w-full flex items-center gap-2.5 py-3.5 text-left active:bg-warm-200/50 rounded-lg transition-colors"
          >
            <MessageSquare size={18} className="text-warm-600" />
            <span className="text-[15px] text-warm-900 flex-1">피드백 보내기</span>
          </button>
        </>
      )}

      {/* 정보 */}
      <SectionHeader icon={<Info size={14} />} title="정보" />
      <button onClick={() => navigate('/terms')} className="w-full flex items-center gap-2.5 py-3.5 border-b border-warm-300 text-left active:bg-warm-200/50 rounded-lg transition-colors">
        <FileText size={18} className="text-warm-600" />
        <span className="text-[15px] text-warm-900 flex-1">이용약관</span>
      </button>
      <button onClick={() => navigate('/privacy')} className="w-full flex items-center gap-2.5 py-3.5 border-b border-warm-300 text-left active:bg-warm-200/50 rounded-lg transition-colors">
        <Shield size={18} className="text-warm-600" />
        <span className="text-[15px] text-warm-900 flex-1">개인정보처리방침</span>
      </button>
      <div className="flex items-center justify-between py-3 text-sm border-b border-warm-300">
        <span className="text-warm-600">버전</span>
        <span className="font-display text-warm-800 font-medium">2.0.0 (beta)</span>
      </div>
      <div className="flex items-center justify-between py-3 text-sm mb-6">
        <span className="text-warm-600">개발</span>
        <span className="text-warm-800 font-medium">바루픽</span>
      </div>

      {/* 계정 */}
      {user && (
        <>
          <SectionHeader icon={<LogOut size={14} />} title="계정" />
          <button onClick={logout} className="w-full flex items-center gap-2.5 py-3.5 border-b border-warm-300 text-left active:bg-warm-200/50 rounded-lg transition-colors">
            <LogOut size={18} className="text-warm-600" />
            <span className="text-[15px] text-warm-900 flex-1">로그아웃</span>
          </button>
          <button onClick={deleteAccount} className="w-full flex items-center gap-2.5 py-3.5 text-left active:bg-warm-200/50 rounded-lg transition-colors">
            <UserX size={18} className="text-red-500" />
            <span className="text-[15px] text-red-600 flex-1">계정 삭제</span>
          </button>
        </>
      )}

      {/* 피드백 모달 */}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} userId={user?.id} />}
    </div>
  )
}

// ─── 섹션 헤더 ───
function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-warm-600 tracking-widest uppercase mb-3 pb-2 border-b border-warm-400 mt-2">
      {icon} {title}
    </div>
  )
}

// ─── 토글 아이템 ───
function ToggleItem({ icon, label, desc, value, onChange, last }: {
  icon: React.ReactNode, label: string, desc: string, value: boolean, onChange: () => void, last?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-3.5 ${last ? '' : 'border-b border-warm-300'}`}>
      <div className="flex items-center gap-2.5">
        <span className="text-warm-600">{icon}</span>
        <div>
          <span className="text-[15px] text-warm-900">{label}</span>
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

// ─── 피드백 모달 ───
function FeedbackModal({ onClose, userId }: { onClose: () => void, userId?: string }) {
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
    if (!type || !message.trim()) { alert('유형과 내용을 입력해주세요'); return }
    setSending(true)
    try {
      await supabase.from('feedbacks').insert({
        user_id: userId || null,
        type,
        message: message.trim(),
        screen: window.location.pathname,
      })
      alert('소중한 의견 감사합니다!')
      onClose()
    } catch (e: any) {
      alert('전송 실패: ' + (e.message || ''))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[300] flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-[480px] bg-white rounded-t-3xl p-6 pb-8 animate-screen-enter" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-warm-400 rounded-full mx-auto mb-5" />
        <h3 className="font-display text-lg font-bold text-warm-900 mb-4">피드백 보내기</h3>

        <div className="flex gap-2 mb-4">
          {types.map(t => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`px-3.5 py-2 rounded-full text-[12px] font-medium transition-all ${
                type === t.key ? 'bg-terra-500 text-white' : 'bg-warm-200 text-warm-700 active:scale-95'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="의견을 자유롭게 작성해주세요 (최대 1000자)"
          maxLength={1000}
          className="w-full h-32 px-4 py-3 bg-warm-100 border border-warm-400 rounded-2xl text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:border-terra-400 resize-none mb-4"
        />

        <button
          onClick={submit}
          disabled={sending}
          className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra disabled:opacity-50"
        >
          {sending ? '보내는 중...' : '보내기'}
        </button>
      </div>
    </div>
  )
}
