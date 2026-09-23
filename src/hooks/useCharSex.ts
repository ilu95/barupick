// 캐릭터 남/여 — 어느 화면에서 바꾸든 값은 하나(sp_char_sex), 바꾸면 다른 화면도 같이 다시 그린다.
import { useEffect, useState } from 'react'
import { charSex, setCharSex } from '@/lib/char/map'
import { profile } from '@/lib/profile'

const EVENT = 'bp:sex'

export function useCharSex(): ['m' | 'w', (s: 'm' | 'w') => void] {
  const [sex, setSex] = useState<'m' | 'w'>(charSex)

  useEffect(() => {
    const onSex = (e: Event) => setSex((e as CustomEvent<'m' | 'w'>).detail)
    window.addEventListener(EVENT, onSex)
    return () => window.removeEventListener(EVENT, onSex)
  }, [])

  const set = (s: 'm' | 'w') => {
    setCharSex(s)
    profile.setGender(s === 'w' ? 'female' : 'male')
    window.dispatchEvent(new CustomEvent(EVENT, { detail: s }))
  }

  return [sex, set]
}
