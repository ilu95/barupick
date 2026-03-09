import { memo } from 'react'
import { Heart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { COLORS_60 } from '@/lib/colors'
import { STYLE_GUIDE } from '@/lib/styles'
import type { CommunityPost } from '@/hooks/useCommunity'

interface Props {
  post: CommunityPost
  isLiked: boolean
  onLike: (postId: string) => void
  showComments?: boolean
}

function timeAgo(dt: string): string {
  if (!dt) return ''
  const diff = (Date.now() - new Date(dt).getTime()) / 1000
  if (diff < 60) return '방금'
  if (diff < 3600) return Math.floor(diff / 60) + '분 전'
  if (diff < 86400) return Math.floor(diff / 3600) + '시간 전'
  if (diff < 604800) return Math.floor(diff / 86400) + '일 전'
  const d = new Date(dt)
  return (d.getMonth() + 1) + '/' + d.getDate()
}

function FeedCardInner({ post, isLiked, onLike, showComments }: Props) {
  const navigate = useNavigate()
  const outfit = post.outfit || {}
  const hasPhoto = post.photo_urls && post.photo_urls.length > 0
  const photoUrl = hasPhoto ? post.photo_urls![0] : null
  const nick = post.profiles?.nickname || '유저'
  const avatar = post.profiles?.avatar_url
  const styleName = post.style ? (STYLE_GUIDE[post.style]?.name?.replace(/ 룩$/, '') || post.style) : ''
  const title = post.caption || post.title || ''
  const dateStr = post.created_at ? new Date(post.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : ''

  // outfit의 hex 변환 (마네킹용)
  const outfitHex: Record<string, string> = {}
  Object.entries(outfit).forEach(([k, v]) => {
    if (v) outfitHex[k] = COLORS_60[v]?.hex || v
  })

  // 컬러 팔레트 도트
  const colorDots = Object.values(outfit).filter(Boolean).slice(0, 5)

  return (
    <div
      className="bg-white rounded-[14px] border border-warm-400 overflow-hidden cursor-pointer active:scale-[0.97] transition-transform shadow-warm-sm"
      onClick={() => navigate(`/community/${post.id}`)}
      role="article"
      aria-label={`${nick}의 코디${title ? ': ' + title : ''}`}
    >
      {/* 이미지/마네킹 영역 */}
      <div className="bg-warm-100 flex items-center justify-center" style={{ aspectRatio: '4/5' }}>
        {hasPhoto ? (
          <img
            src={photoUrl!}
            loading="lazy"
            className="w-full h-full object-cover"
            alt={title || '코디'}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <MannequinSVG outfit={outfitHex} size={120} />
        )}
      </div>

      {/* 정보 */}
      <div className="px-2.5 pt-2 pb-2.5">
        {title && (
          <div className="text-xs font-semibold text-warm-900 truncate mb-0.5">{title}</div>
        )}

        {/* 스타일 태그 + 컬러 도트 */}
        <div className="flex items-center gap-1.5 mb-1">
          {styleName && (
            <span className="text-[9px] font-medium text-warm-500 bg-warm-100 border border-warm-300 rounded px-1.5 py-0.5">
              {styleName}
            </span>
          )}
          <div className="flex gap-[3px] ml-auto">
            {colorDots.map((colorKey, i) => {
              const c = COLORS_60[colorKey as string]
              return c ? (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full border border-warm-400/50"
                  style={{ background: c.hex }}
                />
              ) : null
            })}
          </div>
        </div>

        {/* 날짜 + 좋아요 */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-warm-600">{dateStr}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onLike(post.id)
            }}
            aria-label={isLiked ? '좋아요 취소' : '좋아요'}
            className="flex items-center gap-0.5 text-[11px] active:scale-110 transition-transform"
          >
            <Heart
              size={13}
              fill={isLiked ? '#FF6B6B' : 'none'}
              stroke={isLiked ? '#FF6B6B' : '#A8A29E'}
              strokeWidth={2}
              className={isLiked ? 'animate-like-bounce' : ''}
            />
            {!post.hide_counts && (
              <span className={isLiked ? 'text-[#FF6B6B] font-semibold' : 'text-warm-500'}>
                {post.likes_count || 0}
              </span>
            )}
            {showComments && post.comments_count > 0 && (
              <span className="text-warm-400 ml-1">💬 {post.comments_count}</span>
            )}
          </button>
        </div>

        {/* 유저 */}
        <div className="text-[11px] text-warm-600 mt-1 flex items-center gap-1.5">
          {avatar && (
            <img src={avatar} className="w-4 h-4 rounded-full object-cover" alt="" loading="lazy" />
          )}
          <span>@{nick}</span>
        </div>
      </div>
    </div>
  )
}

const FeedCard = memo(FeedCardInner)
FeedCard.displayName = 'FeedCard'

export default FeedCard
