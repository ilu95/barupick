import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Shirt, UserPlus, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function Auth() {
  const location = useLocation()
  const isSignup = location.pathname === '/auth/signup'

  return isSignup ? <Signup /> : <Login />
}

// ─── 로그인 ───
function Login() {
  const navigate = useNavigate()
  const { login, socialLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요'); return }
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/home', { replace: true })
    } catch (e: any) {
      setError(e.message || '로그인에 실패했어요')
    } finally {
      setLoading(false)
    }
  }

  const handleSocial = async (provider: 'kakao' | 'google') => {
    try {
      await socialLogin(provider)
    } catch (e: any) {
      const msg = e.message || ''; if (msg.includes('not enabled') || msg.includes('Unsupported provider')) { setError((provider === 'kakao' ? '카카오' : 'Google') + ' 로그인이 아직 설정되지 않았어요. 이메일로 로그인해주세요.') } else { setError('소셜 로그인 실패: ' + msg) }
    }
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <div className="max-w-sm mx-auto pt-8">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-terra-100 flex items-center justify-center mx-auto mb-4">
            <Shirt size={28} className="text-terra-600" />
          </div>
          <h2 className="font-display text-2xl font-bold text-warm-900 tracking-tight">바루픽</h2>
          <p className="text-sm text-warm-600 mt-1">커뮤니티에 참여하세요</p>
        </div>

        {/* 소셜 로그인 */}
        <div className="flex flex-col gap-2.5 mb-5">
          <button
            onClick={() => handleSocial('kakao')}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all"
            style={{ background: '#FEE500', color: '#191919' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.58 2 11c0 2.84 1.87 5.33 4.69 6.75-.16.56-.6 2.05-.69 2.37-.11.4.15.39.31.28.13-.08 2.07-1.37 2.91-1.93.9.13 1.83.2 2.78.2 5.5 0 10-3.58 10-8s-4.5-8-10-8z" fill="#191919" /></svg>
            카카오 로그인
          </button>
          <button
            onClick={() => handleSocial('google')}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm border border-warm-400 bg-white text-warm-900 active:scale-[0.98] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google 로그인
          </button>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-warm-400" />
          <span className="text-[11px] text-warm-500">또는 이메일로</span>
          <div className="flex-1 h-px bg-warm-400" />
        </div>

        {/* 에러 */}
        {error && <div className="text-sm text-red-500 text-center mb-3">{error}</div>}

        {/* 이메일 로그인 */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-warm-600 tracking-wide mb-1.5 block">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className="w-full px-4 py-3 bg-white border border-warm-400 rounded-2xl text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:border-terra-400 focus:ring-1 focus:ring-terra-400 transition-all"
          />
        </div>
        <div className="mb-5">
          <label className="text-xs font-semibold text-warm-600 tracking-wide mb-1.5 block">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자리 이상"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-3 bg-white border border-warm-400 rounded-2xl text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:border-terra-400 focus:ring-1 focus:ring-terra-400 transition-all"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-[15px] active:scale-[0.98] transition-all shadow-terra mb-4 disabled:opacity-50"
        >
          {loading ? '로그인 중...' : '이메일 로그인'}
        </button>

        <div className="text-center text-sm text-warm-600">
          계정이 없으신가요?{' '}
          <button onClick={() => navigate('/auth/signup')} className="text-terra-600 font-semibold">
            회원가입
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 회원가입 ───
function Signup() {
  const navigate = useNavigate()
  const { signup, socialLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!email || !password || !nickname) { setError('모든 항목을 입력해주세요'); return }
    if (password.length < 6) { setError('비밀번호는 6자리 이상이어야 합니다'); return }
    if (nickname.length < 2 || nickname.length > 12) { setError('닉네임은 2~12자여야 합니다'); return }
    if (!agreed) { setError('이용약관에 동의해주세요'); return }

    const forbidden = ['관리자', '운영자', 'admin', '바루픽', 'barupick', '바루사', 'barusa', '시스템', 'system', '테스트', 'test', '공지', 'notice']
    if (forbidden.some(f => nickname.toLowerCase().includes(f))) { setError('사용할 수 없는 닉네임입니다'); return }

    setLoading(true)
    setError('')
    try {
      await signup(email, password, nickname)
      navigate('/home', { replace: true })
    } catch (e: any) {
      setError(e.message || '회원가입에 실패했어요')
    } finally {
      setLoading(false)
    }
  }

  const handleSocial = async (provider: 'kakao' | 'google') => {
    try {
      await socialLogin(provider)
    } catch (e: any) {
      const msg = e.message || ''; if (msg.includes('not enabled') || msg.includes('Unsupported provider')) { setError((provider === 'kakao' ? '카카오' : 'Google') + ' 로그인이 아직 설정되지 않았어요. 이메일로 로그인해주세요.') } else { setError('소셜 로그인 실패: ' + msg) }
    }
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <div className="max-w-sm mx-auto pt-6">
        {/* 로고 */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-terra-100 flex items-center justify-center mx-auto mb-4">
            <UserPlus size={28} className="text-terra-600" />
          </div>
          <h2 className="font-display text-2xl font-bold text-warm-900 tracking-tight">회원가입</h2>
          <p className="text-sm text-warm-600 mt-1">가입하고 코디를 공유해보세요</p>
        </div>

        {/* 소셜 가입 */}
        <div className="flex flex-col gap-2.5 mb-4">
          <button
            onClick={() => handleSocial('kakao')}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all"
            style={{ background: '#FEE500', color: '#191919' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.58 2 11c0 2.84 1.87 5.33 4.69 6.75-.16.56-.6 2.05-.69 2.37-.11.4.15.39.31.28.13-.08 2.07-1.37 2.91-1.93.9.13 1.83.2 2.78.2 5.5 0 10-3.58 10-8s-4.5-8-10-8z" fill="#191919" /></svg>
            카카오로 시작하기
          </button>
          <button
            onClick={() => handleSocial('google')}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm border border-warm-400 bg-white text-warm-900 active:scale-[0.98] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google로 시작하기
          </button>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-warm-400" />
          <span className="text-[11px] text-warm-500">또는 이메일로</span>
          <div className="flex-1 h-px bg-warm-400" />
        </div>

        {/* 에러 */}
        {error && <div className="text-sm text-red-500 text-center mb-3">{error}</div>}

        {/* 닉네임 */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-warm-600 tracking-wide mb-1.5 block">닉네임</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.replace(/[^가-힣a-zA-Z0-9]/g, ''))}
            placeholder="한글/영문/숫자 2~12자"
            maxLength={12}
            className="w-full px-4 py-3 bg-white border border-warm-400 rounded-2xl text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:border-terra-400 focus:ring-1 focus:ring-terra-400 transition-all"
          />
        </div>

        {/* 이메일 */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-warm-600 tracking-wide mb-1.5 block">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className="w-full px-4 py-3 bg-white border border-warm-400 rounded-2xl text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:border-terra-400 focus:ring-1 focus:ring-terra-400 transition-all"
          />
        </div>

        {/* 비밀번호 */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-warm-600 tracking-wide mb-1.5 block">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자리 이상"
            onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
            className="w-full px-4 py-3 bg-white border border-warm-400 rounded-2xl text-sm text-warm-900 placeholder-warm-500 focus:outline-none focus:border-terra-400 focus:ring-1 focus:ring-terra-400 transition-all"
          />
        </div>

        {/* 동의 */}
        <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-warm-400 text-terra-500 focus:ring-terra-400"
          />
          <span className="text-xs text-warm-600 leading-relaxed">
            <button onClick={() => navigate('/terms')} className="text-terra-600 underline">이용약관</button> 및{' '}
            <button onClick={() => navigate('/privacy')} className="text-terra-600 underline">개인정보처리방침</button>에 동의합니다.
          </span>
        </label>

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-[15px] active:scale-[0.98] transition-all shadow-terra mb-4 disabled:opacity-50"
        >
          {loading ? '가입 중...' : '회원가입'}
        </button>

        <div className="text-center text-sm text-warm-600">
          이미 계정이 있으신가요?{' '}
          <button onClick={() => navigate('/auth/login')} className="text-terra-600 font-semibold">
            로그인
          </button>
        </div>
      </div>
    </div>
  )
}
