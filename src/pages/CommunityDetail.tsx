// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Heart, Bookmark, Share, User, Flag, ChevronRight, MessageCircle, Send, Trash2, ExternalLink } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { COLORS_60 } from '@/lib/colors'
import { STYLE_GUIDE } from '@/lib/styles'
import { CATEGORY_NAMES } from '@/lib/categories'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useSocial } from '@/hooks/useSocial'
import { useModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

export default function CommunityDetail() {
  const navigate = useNavigate()
  const { postId } = useParams<{ postId: string }>()
  const { user } = useAuth()
  const { isFollowing, isFriend, toggleFollow } = useSocial()
  const modal = useModal()
  const toast = useToast()

  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentText, setCommentText] = useState('')

  useEffect(() => { if (postId) loadPost() }, [postId])

  // 북마크 초기 상태 확인
  useEffect(() => {
    if (!postId) return
    try {
      const saved = JSON.parse(localStorage.getItem('cs_saved') || '[]')
      setBookmarked(saved.some((s: any) => s.commPostId === postId))
    } catch {}
  }, [postId])

  const loadPost = async () => {
    try {
      const { data } = await supabase.from('posts')
        .select('*, profiles!posts_user_id_fkey(nickname, avatar_url, instagram_id)')
        .eq('id', postId).single()
      setPost(data)
      // 조회수
      supabase.rpc('increment_view_count', { p_post_id: postId }).catch(() => {})
      // 좋아요 확인
      if (user) {
        const { data: likeData } = await supabase.from('likes').select('id').eq('user_id', user.id).eq('post_id', postId)
        setLiked(!!(likeData && likeData.length > 0))
      }
      // 댓글 로드 (친구 공개 게시물만)
      if (data?.visibility === 'friends') {
        const { data: cmts } = await supabase.from('comments')
          .select('*, profiles:user_id(nickname, avatar_url)')
          .eq('post_id', postId).order('created_at', { ascending: true })
        setComments(cmts || [])
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  // ── 좋아요 ──
  const toggleLike = async () => {
    if (!user || !postId) return
    const was = liked
    setLiked(!was)
    setPost((p: any) => p ? { ...p, likes_count: (p.likes_count || 0) + (was ? -1 : 1) } : p)
    try {
      if (was) {
        const { data } = await supabase.from('likes').select('id').eq('user_id', user.id).eq('post_id', postId)
        if (data?.[0]) await supabase.from('likes').delete().eq('id', data[0].id)
      } else {
        await supabase.from('likes').insert({ user_id: user.id, post_id: postId })
        if (post?.user_id !== user.id) {
          supabase.rpc('send_notification', { p_user_id: post.user_id, p_actor_id: user.id, p_type: 'like', p_message: '님이 코디에 ♡를 눌렀어요', p_related_id: postId }).catch(() => {})
        }
      }
    } catch { setLiked(was) }
  }

  // ── 저장 (북마크) ──
  const toggleBookmark = async () => {
    if (!user || !post) return
    const saved = JSON.parse(localStorage.getItem('cs_saved') || '[]')
    const already = saved.find((s: any) => s.commPostId === postId)

    if (already) {
      // 제거
      const newSaved = saved.filter((s: any) => s.commPostId !== postId)
      localStorage.setItem('cs_saved', JSON.stringify(newSaved))
      setBookmarked(false)
      toast.toast({ message: '저장 목록에서 제거했어요' })
      supabase.rpc('decrement_save_count', { p_post_id: postId }).catch(() => {})
      setPost((p: any) => p ? { ...p, save_count: Math.max(0, (p.save_count || 1) - 1) } : p)
    } else {
      // 저장
      if (saved.length >= 50) { toast.error('저장 가능한 코디는 최대 50개입니다'); return }
      const nick = post.profiles?.nickname || '유저'
      saved.unshift({
        id: 'comm_' + Date.now(),
        commPostId: postId,
        name: '@' + nick + '의 코디',
        memo: post.caption || '',
        outfit: post.outfit || {},
        score: post.score || 0,
        style: post.style || '',
        layerType: post.layer_type || 'basic',
        outerType: 'coat',
        midType: 'knit',
        createdAt: new Date().toISOString(),
      })
      localStorage.setItem('cs_saved', JSON.stringify(saved))
      setBookmarked(true)
      toast.success('내 코디에 저장했어요! 💾')
      supabase.rpc('increment_save_count', { p_post_id: postId }).catch(() => {})
      setPost((p: any) => p ? { ...p, save_count: (p.save_count || 0) + 1 } : p)
      // 알림
      if (post.user_id && post.user_id !== user.id) {
        supabase.rpc('send_notification', { p_user_id: post.user_id, p_actor_id: user.id, p_type: 'save', p_message: '회원님의 코디를 저장했어요', p_related_id: postId }).catch(() => {})
      }
    }
  }

  // ── 공유 ──
  const handleShare = () => {
    const title = post?.caption || post?.title || '바루픽 코디'
    const text = `${post?.profiles?.nickname || '유저'}님의 코디 (${post?.score || 0}점)`
    navigator.share?.({ title, text, url: window.location.href }).catch(() => {})
  }

  // ── 신고 ──
  const handleReport = () => {
    if (!user || !postId) return
    modal.prompt({
      title: '게시물 신고',
      message: '신고 사유를 입력해주세요.',
      placeholder: '신고 사유',
      maxLength: 200,
      onConfirm: async (reason) => {
        try {
          const { error } = await supabase.from('reports').insert({ reporter_id: user.id, post_id: postId, reason })
          if (error?.code === '23505') toast.toast({ message: '이미 신고한 게시물이에요' })
          else if (error) toast.error('신고 실패')
          else toast.success('신고가 접수되었어요 📋')
        } catch {}
      },
    })
  }

  // ── 댓글 작성 ──
  const addComment = async () => {
    if (!user || !commentText.trim() || !postId) return
    try {
      const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content: commentText.trim() })
      if (error) {
        if (error.message?.includes('violates row-level')) toast.error('맞팔 친구의 게시물에만 댓글을 달 수 있어요')
        else toast.error('댓글 작성 실패: ' + error.message)
        return
      }
      setCommentText('')
      // 댓글 수 갱신
      setPost((p: any) => p ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p)
      // 알림
      if (post?.user_id && post.user_id !== user.id) {
        const preview = commentText.trim().slice(0, 30)
        supabase.rpc('send_notification', { p_user_id: post.user_id, p_actor_id: user.id, p_type: 'comment', p_message: '댓글을 남겼어요: ' + preview, p_related_id: postId }).catch(() => {})
      }
      toast.success('댓글이 등록되었어요 💬')
      loadPost()
    } catch (e: any) { toast.error('오류: ' + e.message) }
  }

  // ── 댓글 삭제 ──
  const deleteComment = (commentId: string) => {
    modal.confirm({
      title: '댓글 삭제',
      message: '이 댓글을 삭제할까요?',
      confirmLabel: '삭제',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await supabase.from('comments').delete().eq('id', commentId)
          setComments(prev => prev.filter(c => c.id !== commentId))
          setPost((p: any) => p ? { ...p, comments_count: Math.max(0, (p.comments_count || 1) - 1) } : p)
          toast.success('댓글을 삭제했어요')
        } catch { toast.error('삭제 실패') }
      },
    })
  }

  // ── 로딩/에러 상태 ──
  if (loading) return <div className="animate-screen-fade px-5 pt-6 text-center py-20 text-sm text-warm-400">불러오는 중...</div>
  if (!post) return <div className="animate-screen-fade px-5 pt-6 text-center py-20 text-sm text-warm-600">게시물을 찾을 수 없어요</div>

  const outfit = post.outfit || {}
  const outfitHex: Record<string, string> = {}
  Object.entries(outfit).forEach(([k, v]) => { if (v) outfitHex[k] = COLORS_60[v as string]?.hex || (v as string) })
  const hasPhoto = post.photo_urls && post.photo_urls.length > 0
  const nick = post.profiles?.nickname || '유저'
  const avatar = post.profiles?.avatar_url
  const instaId = post.profiles?.instagram_id
  const styleName = post.style ? STYLE_GUIDE[post.style]?.name : null
  const isMe = user?.id === post.user_id
  const isFriendsPost = post.visibility === 'friends'
  const canComment = isFriendsPost && (isFriend(post.user_id) || isMe)

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {/* ═══ 사진/마네킹 (4:5 비율) ═══ */}
      {hasPhoto ? (
        <div className="mb-4 -mx-5">
          {post.photo_urls.length === 1 ? (
            <img src={post.photo_urls[0]} className="w-full aspect-[4/5] object-cover" alt="코디" />
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar px-5">
              {post.photo_urls.map((url: string, i: number) => (
                <img key={i} src={url} className="w-[80vw] max-w-[380px] aspect-[4/5] rounded-2xl object-cover flex-shrink-0" alt="" />
              ))}
            </div>
          )}
        </div>
      ) : Object.keys(outfitHex).length > 0 && (
        <div className="flex justify-center py-6 bg-warm-100 rounded-2xl mb-4">
          <MannequinSVG outfit={outfitHex} size={180} />
        </div>
      )}

      {/* ═══ 액션 바 ═══ */}
      <div className="flex gap-2 mb-4">
        {/* 좋아요 */}
        <button
          onClick={toggleLike}
          aria-label={liked ? '좋아요 취소' : '좋아요'}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 ${
            liked ? 'border-red-300 text-red-500 bg-red-50' : 'border-warm-400 bg-white text-warm-800'
          }`}
        >
          <Heart size={16} fill={liked ? '#FF6B6B' : 'none'} stroke={liked ? '#FF6B6B' : 'currentColor'} strokeWidth={2} />
          {!post.hide_counts && (post.likes_count || 0)}
        </button>

        {/* 저장 */}
        <button
          onClick={toggleBookmark}
          aria-label={bookmarked ? '저장 취소' : '저장'}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 ${
            bookmarked ? 'border-terra-300 text-terra-600 bg-terra-50' : 'border-warm-400 bg-white text-warm-800'
          }`}
        >
          {bookmarked ? '🔖' : '📄'} 저장
        </button>

        {/* 공유 */}
        <button
          onClick={handleShare}
          aria-label="공유"
          className="py-2.5 px-4 rounded-xl border border-warm-400 bg-white text-warm-700 active:scale-[0.97] transition-all"
        >
          <Share size={16} />
        </button>

        {/* 신고 (타인 게시물만) */}
        {!isMe && user && (
          <button
            onClick={handleReport}
            aria-label="신고"
            className="py-2.5 px-3 rounded-xl border border-warm-400 bg-white text-warm-500 active:scale-[0.97] transition-all"
          >
            <Flag size={14} />
          </button>
        )}
      </div>

      {/* ═══ 작성자 ═══ */}
      <div className="flex items-center gap-3 mb-4">
        <div onClick={() => navigate(`/user/${post.user_id}`)} className="flex items-center gap-2.5 cursor-pointer flex-1">
          {avatar ? <img src={avatar} className="w-9 h-9 rounded-full object-cover" alt="" />
          : <div className="w-9 h-9 rounded-full bg-terra-100 flex items-center justify-center"><User size={16} className="text-terra-600" /></div>}
          <div>
            <div className="text-sm font-semibold text-warm-900">@{nick}</div>
          </div>
        </div>
        {!isMe && user && (
          <button onClick={() => toggleFollow(post.user_id)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all ${isFollowing(post.user_id) ? 'bg-warm-200 text-warm-700 border border-warm-400' : 'bg-terra-500 text-white shadow-terra'}`}>
            {isFollowing(post.user_id) ? '팔로잉 ✓' : '팔로우'}
          </button>
        )}
      </div>

      {/* ═══ 인스타그램 링크 (show_instagram + id 있을 때) ═══ */}
      {post.show_instagram && instaId && (
        <button
          onClick={() => window.open('https://instagram.com/' + instaId, '_blank')}
          className="w-full bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-3.5 mb-4 flex items-center gap-2.5 active:scale-[0.98] transition-all"
        >
          <span className="text-lg">📸</span>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">@{instaId}</div>
            <div className="text-[10px] text-warm-500">인스타 구경하러가기</div>
          </div>
          <ExternalLink size={14} className="text-warm-500" />
        </button>
      )}

      {/* ═══ 맞팔 유도 배너 (팔로잉 중이지만 맞팔 아닐 때) ═══ */}
      {!isMe && user && isFollowing(post.user_id) && !isFriend(post.user_id) && (
        <div className="bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl p-3 mb-4 text-center text-[11px] text-warm-600 dark:text-warm-400">
          @{nick}님도 나를 팔로우하면 <span className="font-semibold text-green-700 dark:text-green-400">👫 친구</span>가 되어 댓글로 소통할 수 있어요
        </div>
      )}

      {/* ═══ 바이럴 CTA (미팔로우 + 타인 게시물) ═══ */}
      {!isMe && user && !isFollowing(post.user_id) && (
        <div
          onClick={() => toggleFollow(post.user_id)}
          className="bg-gradient-to-r from-terra-50 to-warm-50 dark:from-terra-900/20 dark:to-warm-800 border border-terra-200 dark:border-terra-700 rounded-2xl p-3.5 mb-4 flex items-center gap-2.5 cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="text-lg flex-shrink-0">✨</div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-warm-800 dark:text-warm-200">@{nick}님의 코디 더 보기</div>
            <div className="text-[10px] text-warm-500">팔로우하면 새 코디 알림을 받을 수 있어요</div>
          </div>
          <span className="px-3 py-1.5 bg-terra-500 text-white rounded-full text-[11px] font-semibold flex-shrink-0">팔로우</span>
        </div>
      )}

      {/* ═══ 캡션 + 태그 ═══ */}
      {(post.caption || post.title) && <div className="text-sm text-warm-800 dark:text-warm-200 mb-3 leading-relaxed">{post.caption || post.title}</div>}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {styleName && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-terra-100 text-terra-700">{styleName}</span>}
        {post.score > 0 && <span className="font-display text-[11px] font-bold px-2.5 py-1 rounded-full bg-warm-900 text-white">{post.score}점</span>}
      </div>

      {/* ═══ 컬러 정보 ═══ */}
      {Object.keys(outfit).length > 0 && (
        <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-3 mb-5 shadow-warm-sm">
          <div className="flex gap-2 flex-wrap">
            {Object.entries(outfit).filter(([_, v]) => v).map(([part, ck]) => {
              const c = COLORS_60[ck as string]
              if (!c) return null
              return (
                <div key={part} className="flex items-center gap-1.5 text-xs">
                  <span className="w-4 h-4 rounded border border-warm-400" style={{ background: c.hex }} />
                  <span className="text-warm-500">{(CATEGORY_NAMES as any)?.[part]}</span>
                  <span className="text-warm-800 dark:text-warm-200">{c.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ 인사이트 (본인 게시물) ═══ */}
      {isMe && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl py-2.5 text-center">
            <div className="text-base font-bold text-warm-900 dark:text-warm-100">{post.likes_count || 0}</div>
            <div className="text-[9px] text-warm-500">좋아요</div>
          </div>
          <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl py-2.5 text-center">
            <div className="text-base font-bold text-warm-900 dark:text-warm-100">{post.view_count || 0}</div>
            <div className="text-[9px] text-warm-500">조회</div>
          </div>
          <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl py-2.5 text-center">
            <div className="text-base font-bold text-warm-900 dark:text-warm-100">{post.comments_count || comments.length}</div>
            <div className="text-[9px] text-warm-500">댓글</div>
          </div>
        </div>
      )}

      {/* ═══ 댓글 섹션 — 친구 공개 게시물만 표시 ═══ */}
      {isFriendsPost && (
        <div className="border-t border-warm-300 dark:border-warm-600 pt-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-warm-700 dark:text-warm-300 mb-3">
            <MessageCircle size={13} /> 댓글 <span className="text-warm-500 font-normal">{comments.length}</span>
          </div>

          {/* 댓글 목록 */}
          {comments.length > 0 ? (
            <div className="space-y-3 mb-3">
              {comments.map(c => {
                const isMyComment = user && c.user_id === user.id
                const isPostOwner = user && post.user_id === user.id
                const canDelete = isMyComment || isPostOwner
                const commentDate = c.created_at ? new Date(c.created_at) : null
                const dateStr = commentDate ? `${commentDate.getMonth() + 1}/${commentDate.getDate()}` : ''

                return (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <div
                      onClick={() => navigate(`/user/${c.user_id}`)}
                      className="cursor-pointer flex-shrink-0"
                    >
                      {c.profiles?.avatar_url ? (
                        <img src={c.profiles.avatar_url} className="w-7 h-7 rounded-full object-cover mt-0.5" alt="" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-warm-200 dark:bg-warm-700 flex items-center justify-center mt-0.5"><User size={12} className="text-warm-500" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-warm-900 dark:text-warm-100">@{c.profiles?.nickname || '유저'}</span>
                        <span className="text-[10px] text-warm-400">{dateStr}</span>
                      </div>
                      <div className="text-sm text-warm-800 dark:text-warm-200 mt-0.5 leading-relaxed">{c.content}</div>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="flex-shrink-0 mt-1 p-1 text-warm-400 hover:text-red-400 active:scale-90 transition-all"
                        aria-label="댓글 삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-warm-500 dark:text-warm-400 text-xs">
              아직 댓글이 없어요. 첫 댓글을 남겨보세요!
            </div>
          )}

          {/* 댓글 입력 */}
          {canComment && user ? (
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()}
                placeholder="댓글을 남겨보세요..."
                maxLength={500}
                className="flex-1 px-3 py-2.5 bg-warm-100 dark:bg-warm-700 border border-warm-400 dark:border-warm-600 rounded-xl text-sm text-warm-900 dark:text-warm-100 placeholder-warm-400 focus:outline-none focus:border-terra-400 transition-all"
              />
              <button
                onClick={addComment}
                disabled={!commentText.trim()}
                className="px-4 py-2.5 bg-terra-500 text-white rounded-xl text-xs font-semibold active:scale-95 transition-all shadow-terra disabled:opacity-50"
              >
                등록
              </button>
            </div>
          ) : user && !isMe && !isFriend(post.user_id) ? (
            <div className="text-xs text-warm-500 dark:text-warm-400 text-center py-3 bg-warm-100 dark:bg-warm-800 rounded-xl">
              맞팔 친구만 댓글을 작성할 수 있어요
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
