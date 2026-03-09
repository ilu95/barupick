import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { Check, AlertTriangle, Info, X, Undo2 } from 'lucide-react'

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════
type ToastVariant = 'success' | 'error' | 'info'

interface ToastOptions {
  message: string
  variant?: ToastVariant
  duration?: number          // ms, default 3000. 0 = manual dismiss only
  undoAction?: () => void    // 되돌리기 콜백
  undoLabel?: string         // default '되돌리기'
}

interface ToastItem extends ToastOptions {
  id: string
  exiting?: boolean
}

interface ToastContextValue {
  toast: (options: ToastOptions | string) => void
  success: (message: string) => void
  error: (message: string) => void
}

// ═══════════════════════════════════════
// Context
// ═══════════════════════════════════════
const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ═══════════════════════════════════════
// Provider + Renderer
// ═══════════════════════════════════════
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    // exit 애니메이션 트리거
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    // 300ms 후 실제 제거
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 280)
    // 타이머 정리
    const timer = timersRef.current.get(id)
    if (timer) { clearTimeout(timer); timersRef.current.delete(id) }
  }, [])

  const toast = useCallback((options: ToastOptions | string) => {
    const opts: ToastOptions = typeof options === 'string' ? { message: options } : options
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
    const duration = opts.duration ?? (opts.undoAction ? 5000 : 3000)

    const item: ToastItem = { ...opts, id }
    setToasts(prev => [...prev.slice(-4), item]) // 최대 5개 유지

    if (duration > 0) {
      const timer = setTimeout(() => dismiss(id), duration)
      timersRef.current.set(id, timer)
    }
  }, [dismiss])

  const success = useCallback((message: string) => toast({ message, variant: 'success' }), [toast])
  const error = useCallback((message: string) => toast({ message, variant: 'error' }), [toast])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t))
      timersRef.current.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}

      {/* Toast Container */}
      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-[calc(80px+env(safe-area-inset-bottom,0px))] z-[400] flex flex-col-reverse gap-2 w-full max-w-[440px] px-5 pointer-events-none"
      >
        {toasts.map(t => (
          <ToastItem key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ═══════════════════════════════════════
// Single Toast Item
// ═══════════════════════════════════════
function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const icons: Record<ToastVariant, React.ReactNode> = {
    success: <Check size={16} className="text-sage" />,
    error: <AlertTriangle size={16} className="text-red-500" />,
    info: <Info size={16} className="text-sky-500" />,
  }
  const variant = item.variant || 'success'

  const handleUndo = () => {
    item.undoAction?.()
    onDismiss(item.id)
  }

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 bg-warm-900 dark:bg-warm-200 text-white dark:text-warm-900 rounded-2xl px-4 py-3 shadow-warm-lg transition-all duration-280 ${
        item.exiting
          ? 'opacity-0 translate-y-3 scale-95'
          : 'opacity-100 translate-y-0 scale-100 animate-slide-up'
      }`}
    >
      {/* 아이콘 */}
      <div className="flex-shrink-0">{icons[variant]}</div>

      {/* 메시지 */}
      <span className="flex-1 text-[13px] font-medium leading-snug min-w-0">
        {item.message}
      </span>

      {/* 되돌리기 */}
      {item.undoAction && (
        <button
          onClick={handleUndo}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-white/15 dark:bg-warm-900/15 rounded-lg text-[11px] font-bold active:scale-95 transition-transform"
        >
          <Undo2 size={12} />
          {item.undoLabel || '되돌리기'}
        </button>
      )}

      {/* 닫기 */}
      {!item.undoAction && (
        <button
          onClick={() => onDismiss(item.id)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full active:scale-90 transition-transform opacity-60 hover:opacity-100"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
