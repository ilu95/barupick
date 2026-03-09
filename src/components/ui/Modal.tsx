import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { X } from 'lucide-react'

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

interface ModalAlertOptions {
  title: string
  message?: string
  confirmLabel?: string   // default '확인'
  onConfirm?: () => void
}

interface ModalConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string   // default '확인'
  cancelLabel?: string    // default '취소'
  variant?: 'default' | 'danger'  // danger = 빨간 확인 버튼 (삭제 등)
  onConfirm: () => void
  onCancel?: () => void
}

interface ModalPromptOptions {
  title: string
  message?: string
  placeholder?: string
  defaultValue?: string
  maxLength?: number
  confirmLabel?: string   // default '확인'
  cancelLabel?: string    // default '취소'
  validate?: (value: string) => string | null  // 에러 메시지 반환, null = 유효
  onConfirm: (value: string) => void
  onCancel?: () => void
}

type ModalState =
  | { type: 'alert'; options: ModalAlertOptions }
  | { type: 'confirm'; options: ModalConfirmOptions }
  | { type: 'prompt'; options: ModalPromptOptions }
  | null

interface ModalContextValue {
  alert: (options: ModalAlertOptions) => void
  confirm: (options: ModalConfirmOptions) => void
  prompt: (options: ModalPromptOptions) => void
  close: () => void
}

// ═══════════════════════════════════════
// Context
// ═══════════════════════════════════════
const ModalContext = createContext<ModalContextValue | null>(null)

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used within ModalProvider')
  return ctx
}

// ═══════════════════════════════════════
// Provider + Renderer
// ═══════════════════════════════════════
export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState>(null)
  const [exiting, setExiting] = useState(false)

  const close = useCallback(() => {
    setExiting(true)
    setTimeout(() => {
      setModal(null)
      setExiting(false)
    }, 200)
  }, [])

  const alert = useCallback((options: ModalAlertOptions) => {
    setModal({ type: 'alert', options })
    setExiting(false)
  }, [])

  const confirm = useCallback((options: ModalConfirmOptions) => {
    setModal({ type: 'confirm', options })
    setExiting(false)
  }, [])

  const prompt = useCallback((options: ModalPromptOptions) => {
    setModal({ type: 'prompt', options })
    setExiting(false)
  }, [])

  return (
    <ModalContext.Provider value={{ alert, confirm, prompt, close }}>
      {children}
      {modal && (
        <ModalOverlay exiting={exiting} onBackdrop={close}>
          {modal.type === 'alert' && <AlertContent options={modal.options} close={close} />}
          {modal.type === 'confirm' && <ConfirmContent options={modal.options} close={close} />}
          {modal.type === 'prompt' && <PromptContent options={modal.options} close={close} />}
        </ModalOverlay>
      )}
    </ModalContext.Provider>
  )
}

// ═══════════════════════════════════════
// Overlay Wrapper
// ═══════════════════════════════════════
function ModalOverlay({
  children,
  exiting,
  onBackdrop,
}: {
  children: React.ReactNode
  exiting: boolean
  onBackdrop: () => void
}) {
  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onBackdrop() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onBackdrop])

  return (
    <div
      className={`fixed inset-0 z-[350] flex items-center justify-center px-8 transition-colors duration-200 ${
        exiting ? 'bg-black/0' : 'bg-black/50'
      }`}
      onClick={onBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white dark:bg-warm-800 rounded-2xl p-5 w-full max-w-sm shadow-warm-lg transition-all duration-200 ${
          exiting
            ? 'opacity-0 scale-95'
            : 'opacity-100 scale-100 animate-pop-in'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// Alert Content (replaces window.alert)
// ═══════════════════════════════════════
function AlertContent({ options, close }: { options: ModalAlertOptions; close: () => void }) {
  const handleConfirm = () => {
    options.onConfirm?.()
    close()
  }

  return (
    <>
      <div className="text-lg font-bold text-warm-900 dark:text-warm-100 mb-2">
        {options.title}
      </div>
      {options.message && (
        <div className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed mb-5">
          {options.message}
        </div>
      )}
      <button
        onClick={handleConfirm}
        autoFocus
        className="w-full py-2.5 bg-terra-500 text-white rounded-xl text-sm font-semibold active:scale-[0.98] transition-all shadow-terra"
      >
        {options.confirmLabel || '확인'}
      </button>
    </>
  )
}

// ═══════════════════════════════════════
// Confirm Content (replaces window.confirm)
// ═══════════════════════════════════════
function ConfirmContent({ options, close }: { options: ModalConfirmOptions; close: () => void }) {
  const isDanger = options.variant === 'danger'

  const handleConfirm = () => {
    options.onConfirm()
    close()
  }

  const handleCancel = () => {
    options.onCancel?.()
    close()
  }

  return (
    <>
      <div className="text-lg font-bold text-warm-900 dark:text-warm-100 mb-2">
        {options.title}
      </div>
      {options.message && (
        <div className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed mb-5">
          {options.message}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          className="flex-1 py-2.5 bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-300 rounded-xl text-sm font-medium active:scale-[0.98] transition-all"
        >
          {options.cancelLabel || '취소'}
        </button>
        <button
          onClick={handleConfirm}
          autoFocus
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-all ${
            isDanger
              ? 'bg-red-500 text-white shadow-sm'
              : 'bg-terra-500 text-white shadow-terra'
          }`}
        >
          {options.confirmLabel || '확인'}
        </button>
      </div>
    </>
  )
}

// ═══════════════════════════════════════
// Prompt Content (replaces window.prompt)
// ═══════════════════════════════════════
function PromptContent({ options, close }: { options: ModalPromptOptions; close: () => void }) {
  const [value, setValue] = useState(options.defaultValue || '')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // 포커스 + 기존 값이 있으면 전체 선택
    setTimeout(() => {
      const el = inputRef.current
      if (el) { el.focus(); if (options.defaultValue) el.select() }
    }, 100)
  }, [])

  const handleConfirm = () => {
    const trimmed = value.trim()
    if (options.validate) {
      const err = options.validate(trimmed)
      if (err) { setError(err); return }
    }
    options.onConfirm(trimmed)
    close()
  }

  const handleCancel = () => {
    options.onCancel?.()
    close()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm()
  }

  return (
    <>
      <div className="text-lg font-bold text-warm-900 dark:text-warm-100 mb-2">
        {options.title}
      </div>
      {options.message && (
        <div className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed mb-3">
          {options.message}
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => { setValue(e.target.value); setError(null) }}
        onKeyDown={handleKeyDown}
        maxLength={options.maxLength}
        placeholder={options.placeholder}
        className={`w-full px-4 py-3 bg-warm-100 dark:bg-warm-700 border rounded-xl text-sm text-warm-900 dark:text-warm-100 placeholder-warm-500 focus:outline-none transition-colors mb-1 ${
          error
            ? 'border-red-400 focus:border-red-400'
            : 'border-warm-400 dark:border-warm-600 focus:border-terra-400'
        }`}
      />
      {/* 하단 정보 라인: 에러 또는 글자수 */}
      <div className="flex items-center justify-between mb-4 min-h-[20px]">
        {error ? (
          <span className="text-[11px] text-red-500 font-medium">{error}</span>
        ) : (
          <span />
        )}
        {options.maxLength && (
          <span className="text-[11px] text-warm-500">
            {value.length}/{options.maxLength}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          className="flex-1 py-2.5 bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-300 rounded-xl text-sm font-medium active:scale-[0.98] transition-all"
        >
          {options.cancelLabel || '취소'}
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-2.5 bg-terra-500 text-white rounded-xl text-sm font-semibold active:scale-[0.98] transition-all shadow-terra"
        >
          {options.confirmLabel || '확인'}
        </button>
      </div>
    </>
  )
}
