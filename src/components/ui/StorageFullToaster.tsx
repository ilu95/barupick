import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { STORAGE_FULL_EVENT } from '@/lib/storage'

/**
 * 어디서든 localStorage 용량 초과가 나면(lib/storage.setJSON) 한 번 토스트로 알린다.
 * 화면마다 try/catch 를 두지 않아도 "저장이 안 됐다"가 조용히 묻히지 않는다. 30초에 한 번만.
 */
export default function StorageFullToaster() {
  const toast = useToast()
  const { t } = useTranslation()
  const lastRef = useRef(0)
  useEffect(() => {
    const h = () => {
      const now = Date.now()
      if (now - lastRef.current < 30_000) return
      lastRef.current = now
      toast.error(t('common.storageFull'))
    }
    window.addEventListener(STORAGE_FULL_EVENT, h)
    return () => window.removeEventListener(STORAGE_FULL_EVENT, h)
  }, [toast, t])
  return null
}
