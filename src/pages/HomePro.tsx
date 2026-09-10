import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BuildCoord from '@/pages/BuildCoord'

// ═══════════════════════════════════════════════════════
// 직접 만드는 모드의 앞문 — 1단계(한 벌 + 방향)가 곧 홈이고, 그 안의 도구 줄로
// 후보 비교·옷장 조합·기록·30벌·취향 비교에 간다. 별도 홈 카드 목록은 없다.
// ═══════════════════════════════════════════════════════
export default function HomePro() {
  const navigate = useNavigate()
  useEffect(() => { if (!localStorage.getItem('sp_onboarded')) navigate('/onboarding', { replace: true }) }, [])
  return <BuildCoord />
}
