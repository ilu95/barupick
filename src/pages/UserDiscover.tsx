import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useSocial } from '@/hooks/useSocial'

interface UserRow {
  id: string
  nickname: string | null
  avatar_url: string | null
  instagram_id: string | null
}

export default function UserDiscover() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isFollowing, isFriend, toggleFollow } = useSocial()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserRow[] | null>(null)
  const [suggested, setSuggested] = useState<UserRow[] | null>(null)
  const [searching, setSearching] = useState(false)

  // 추천 유저 로드
  useEffect(() => {
    loadSuggested()
  }, [])

  const loadSuggested = async () => {
    try {
      const myFollows = JSON.parse(localStorage.getItem('sp_follows') || '[]')
      const exclude = user ? [user.id, ...myFollows] : myFollows

      const { data } = await supabase.from('profiles')
        .select('id, nickname, avatar_url, instagram_id')
        .not('nickname', 'is', null)
        .limit(20)

      // 클라이언트에서 제외
      setSuggested((data || []).filter(u => !exclude.includes(u.id)))
    } catch (e) {
      console.error('Suggested error:', e)
      setSuggested([])
    }
  }

  const doSearch = async () => {
    const q = query.trim()
    if (q.length < 2) { alert('2글자 이상 입력해주세요'); return }
    setSearching(true)
    try {
      const { data } = await supabase.from('profiles')
        .select('id, nickname, avatar_url, instagram_id')
        .or(`nickname.ilike.%${q}%,instagram_id.ilike.%${q}%`)
        .limit(30)
      setResults(data || [])
    } catch (e) {
      console.error('Search error:', e)
      alert('검색 중 오류가 발생했어요')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {/* 검색바 */}
      <div className="relative mb-5">
        <input
          type="text"
          placeholder="닉네임 또는 인스타 ID로 검색"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          className="w-full pl-10 pr-16 py-3 bg-white border border-warm-400 rounded-2xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:border-terra-400 transition-colors"
        />
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-600" />
        <button
          onClick={doSearch}
          disabled={searching}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-terra-500 text-white text-[11px] font-semibold rounded-xl active:scale-95 transition-all"
        >
          {searching ? '...' : '검색'}
        </button>
      </div>

      {/* 검색 결과 */}
      {results !== null && (
        <div className="mb-5">
          {results.length === 0 ? (
            <div className="text-center py-6 text-warm-400 text-sm">검색 결과가 없어요</div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-[10px] text-warm-500 uppercase tracking-wider font-semibold mb-2 px-1">
                <Search size={12} /> 검색 결과 {results.length}명
              </div>
              {results.map(u => (
                <UserRow key={u.id} user={u} isFollowing={isFollowing(u.id)} isFriend={isFriend(u.id)} onFollow={() => toggleFollow(u.id)} onProfile={() => navigate(`/user/${u.id}`)} isMe={u.id === user?.id} />
              ))}
            </>
          )}
        </div>
      )}

      {/* 추천 유저 (검색 결과 없을 때) */}
      {results === null && (
        <div>
          {suggested === null ? (
            <div className="text-center py-10 text-warm-400 text-sm">불러오는 중...</div>
          ) : suggested.length === 0 ? (
            <div className="text-center py-10 text-warm-400 text-sm">아직 가입한 유저가 없어요</div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-[10px] text-warm-500 uppercase tracking-wider font-semibold mb-3 px-1">
                <Sparkles size={12} /> 추천 유저
              </div>
              {suggested.map(u => (
                <UserRow key={u.id} user={u} isFollowing={isFollowing(u.id)} isFriend={isFriend(u.id)} onFollow={() => toggleFollow(u.id)} onProfile={() => navigate(`/user/${u.id}`)} isMe={u.id === user?.id} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function UserRow({ user: u, isFollowing, isFriend: isMutual, onFollow, onProfile, isMe }: {
  user: UserRow, isFollowing: boolean, isFriend: boolean, onFollow: () => void, onProfile: () => void, isMe: boolean
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-warm-300">
      <div onClick={onProfile} className="flex-shrink-0 cursor-pointer">
        {u.avatar_url ? (
          <img src={u.avatar_url} className="w-11 h-11 rounded-full object-cover border border-warm-300" alt="" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-terra-100 flex items-center justify-center border border-warm-300">
            <User size={18} className="text-terra-600" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onProfile}>
        <div className="text-sm font-semibold text-warm-900 truncate">@{u.nickname || '유저'}</div>
        {u.instagram_id && <div className="text-[11px] text-warm-500">📸 {u.instagram_id}</div>}
        {isMutual && <div className="text-[10px] text-green-600 font-medium">👫 서로 친구</div>}
      </div>
      {!isMe && (
        <button
          onClick={(e) => { e.stopPropagation(); onFollow() }}
          className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all flex-shrink-0 ${
            isMutual ? 'bg-green-100 text-green-700 border border-green-300'
            : isFollowing ? 'bg-warm-200 text-warm-700 border border-warm-400'
            : 'bg-terra-500 text-white shadow-terra'
          }`}
        >
          {isMutual ? '👫 친구' : isFollowing ? '팔로잉 ✓' : '팔로우'}
        </button>
      )}
    </div>
  )
}
