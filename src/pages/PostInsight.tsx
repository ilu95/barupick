// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Eye, Heart, Bookmark, MessageSquare, Target, TrendingUp, TrendingDown, Minus, BarChart3, ChevronRight } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { sceneFromColors } from '@/lib/char/scene'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { getLocale } from '@/i18n'

export default function PostInsight() {
  const navigate = useNavigate()
  const { postId } = useParams<{ postId: string }>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (postId && user) loadInsight() }, [postId, user])

  const loadInsight = async () => {
    if (!postId || !user) return
    try {
      // 게시물
      const { data: post, error } = await supabase.from('posts')
        .select('*, profiles!posts_user_id_fkey(nickname)')
        .eq('id', postId).single()
      if (error || !post) { setLoading(false); return }

      // 14일 좋아요
      const since14 = new Date(Date.now() - 14 * 86400000).toISOString()
      const { data: likes14 } = await supabase.from('likes')
        .select('created_at').eq('post_id', postId).gte('created_at', since14)

      // 14일 댓글
      let comments14: any[] = []
      try {
        const { data: c14 } = await supabase.from('comments')
          .select('created_at').eq('post_id', postId).gte('created_at', since14)
        comments14 = c14 || []
      } catch {}

      // 내 게시물 평균
      const { data: myPosts } = await supabase.from('posts')
        .select('likes_count, view_count, save_count')
        .eq('user_id', user.id).eq('status', 'approved')
      const myAvg = { views: 0, likes: 0, saves: 0 }
      if (myPosts && myPosts.length > 0) {
        myAvg.views = Math.round(myPosts.reduce((s: number, p: any) => s + (p.view_count || 0), 0) / myPosts.length)
        myAvg.likes = Math.round(myPosts.reduce((s: number, p: any) => s + (p.likes_count || 0), 0) / myPosts.length)
        myAvg.saves = Math.round(myPosts.reduce((s: number, p: any) => s + (p.save_count || 0), 0) / myPosts.length)
      }

      // 14일 일별 맵
      const dayMap: Record<string, { likes: number; comments: number; label: string }> = {}
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const key = d.toISOString().slice(0, 10)
        dayMap[key] = { likes: 0, comments: 0, label: d.toLocaleDateString(getLocale(), { month: 'numeric', day: 'numeric' }) }
      }
      ;(likes14 || []).forEach((l: any) => { const k = (l.created_at || '').slice(0, 10); if (dayMap[k]) dayMap[k].likes++ })
      comments14.forEach((c: any) => { const k = (c.created_at || '').slice(0, 10); if (dayMap[k]) dayMap[k].comments++ })

      const daysOld = Math.max(1, Math.floor((Date.now() - new Date(post.created_at).getTime()) / 86400000))

      setData({
        post,
        views: post.view_count || 0,
        likes: post.likes_count || 0,
        saves: post.save_count || 0,
        comments: post.comments_count || 0,
        likeRate: post.view_count > 0 ? ((post.likes_count || 0) / post.view_count * 100).toFixed(1) : null,
        saveRate: post.view_count > 0 ? ((post.save_count || 0) / post.view_count * 100).toFixed(1) : null,
        myAvg,
        dayArr: Object.values(dayMap),
        daysOld,
        avgViewsPerDay: (post.view_count / daysOld).toFixed(1),
      })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="animate-screen-fade px-5 pt-6 text-center py-20 text-sm text-warm-400 dark:text-warm-500">📊 {t('common.analyzing')}</div>
  if (!data) return <div className="animate-screen-fade px-5 pt-6 text-center py-20 text-sm text-warm-600 dark:text-warm-400">{t('postInsight.notFound')}</div>

  const { post, views, likes, saves, comments, likeRate, saveRate, myAvg, dayArr, daysOld, avgViewsPerDay } = data
  const maxDay = Math.max(1, ...dayArr.map((d: any) => d.likes + d.comments))

  // 비교 표시
  const CompareIcon = ({ val, avg }: { val: number; avg: number }) => {
    if (avg === 0) return null
    if (val > avg * 1.2) return <TrendingUp size={12} className="text-green-500" />
    if (val < avg * 0.8) return <TrendingDown size={12} className="text-red-400" />
    return <Minus size={12} className="text-warm-500 dark:text-warm-400" />
  }

  const scene = post.photo_urls?.[0] ? null : sceneFromColors(post.outfit || {})

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {/* 게시물 미리보기 — 누르면 게시물로 */}
      <button onClick={() => navigate(`/community/${post.id}`)}
        className="w-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-3.5 mb-4 flex items-center gap-3 shadow-warm-sm active:scale-[0.98] transition-all text-left">
        <div className="w-14 h-[72px] rounded-xl bg-warm-100 dark:bg-warm-700 flex items-center justify-center overflow-hidden flex-shrink-0">
          {scene ? <CharacterCanvas items={scene.items} body={scene.body} width={48} />
            : <img src={post.photo_urls[0]} className="w-full h-full object-cover" alt="" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-extrabold text-warm-900 dark:text-warm-100 truncate">{post.caption || t('nav.coord')}</div>
          <div className="text-[11px] text-warm-500 dark:text-warm-400 mt-0.5">{t('postInsight.daysOld', { count: daysOld })} · {t('postInsight.avgViewsPerDay', { count: avgViewsPerDay })}</div>
        </div>
        <ChevronRight size={16} className="text-warm-400 dark:text-warm-500 flex-shrink-0" />
      </button>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { icon: <Eye size={14} />, val: views, label: t('postInsight.views') },
          { icon: <Heart size={14} />, val: likes, label: t('postInsight.likes') },
          { icon: <Bookmark size={14} />, val: saves, label: t('postInsight.saves') },
          { icon: <MessageSquare size={14} />, val: comments, label: t('postInsight.comments') },
        ].map(({ icon, val, label }) => (
          <div key={label} className="text-center bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl py-2.5 shadow-warm-sm">
            <div className="flex justify-center text-terra-500 dark:text-terra-400 mb-1">{icon}</div>
            <div className="font-display text-lg font-bold text-warm-900 dark:text-warm-100">{val}</div>
            <div className="text-[9px] text-warm-500 dark:text-warm-400">{label}</div>
          </div>
        ))}
      </div>

      {/* 참여율 */}
      <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-4 mb-4 shadow-warm-sm">
        <div className="text-[13.5px] font-extrabold text-warm-900 dark:text-warm-100 mb-3 flex items-center gap-1.5">
          <Target size={13} /> {t('postInsight.engagementTitle')}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-warm-100 dark:bg-warm-700 rounded-xl p-3">
            <div className="text-[10px] text-warm-500 dark:text-warm-400 mb-1">{t('postInsight.likeRate')}</div>
            <div className={`text-xl font-bold ${likeRate && parseFloat(likeRate) >= 10 ? 'text-green-600 dark:text-green-400' : 'text-warm-900 dark:text-warm-100'}`}>
              {likeRate ? likeRate + '%' : '—'}
            </div>
          </div>
          <div className="bg-warm-100 dark:bg-warm-700 rounded-xl p-3">
            <div className="text-[10px] text-warm-500 dark:text-warm-400 mb-1">{t('postInsight.saveRate')}</div>
            <div className={`text-xl font-bold ${saveRate && parseFloat(saveRate) >= 5 ? 'text-green-600 dark:text-green-400' : 'text-warm-900 dark:text-warm-100'}`}>
              {saveRate ? saveRate + '%' : '—'}
            </div>
          </div>
        </div>

        {/* 내 평균 비교 */}
        <div className="text-[10px] text-warm-500 dark:text-warm-400 mb-2">{t('postInsight.compareAvg')}</div>
        {[
          { label: t('postInsight.views'), val: views, avg: myAvg.views },
          { label: t('postInsight.likes'), val: likes, avg: myAvg.likes },
          { label: t('postInsight.saves'), val: saves, avg: myAvg.saves },
        ].map(({ label, val, avg }) => (
          <div key={label} className="flex items-center gap-2 py-1.5 text-xs">
            <span className="w-12 text-warm-500 dark:text-warm-400">{label}</span>
            <div className="flex-1 h-1.5 bg-warm-300 dark:bg-warm-600 rounded-full overflow-hidden">
              <div className="h-full bg-terra-500 rounded-full transition-all" style={{ width: `${avg > 0 ? Math.min(100, (val / avg) * 50) : 50}%` }} />
            </div>
            <span className="w-8 text-right font-semibold text-warm-800 dark:text-warm-200">{val}</span>
            <CompareIcon val={val} avg={avg} />
            <span className="w-12 text-warm-500 dark:text-warm-400 text-[10px]">{t('postInsight.avgLabel', { count: avg })}</span>
          </div>
        ))}
      </div>

      {/* 14일 트렌드 */}
      <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-4 mb-4 shadow-warm-sm">
        <div className="text-[13.5px] font-extrabold text-warm-900 dark:text-warm-100 mb-3 flex items-center gap-1.5">
          <BarChart3 size={13} /> {t('postInsight.trend14d')}
        </div>
        <div className="flex items-end gap-[3px] h-[80px]">
          {dayArr.map((day: any, idx: number) => {
            const total = day.likes + day.comments
            const h = total > 0 ? Math.max(4, (total / maxDay) * 100) : 2
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex flex-col justify-end" style={{ height: '60px' }}>
                  {day.likes > 0 && <div className="w-full bg-terra-400 rounded-t-sm" style={{ height: `${(day.likes / maxDay) * 60}px` }} />}
                  {day.comments > 0 && <div className="w-full bg-blue-400 rounded-b-sm" style={{ height: `${(day.comments / maxDay) * 60}px` }} />}
                  {total === 0 && <div className="w-full bg-warm-300 dark:bg-warm-600 rounded-sm" style={{ height: '2px' }} />}
                </div>
                {idx % 2 === 0 && <span className="text-[7px] text-warm-500 dark:text-warm-400">{day.label}</span>}
              </div>
            )
          })}
        </div>
        <div className="flex justify-center gap-4 mt-2">
          <span className="flex items-center gap-1 text-[10px] text-warm-500 dark:text-warm-400"><span className="w-2.5 h-2.5 rounded-sm bg-terra-400" /> {t('postInsight.likes')}</span>
          <span className="flex items-center gap-1 text-[10px] text-warm-500 dark:text-warm-400"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> {t('postInsight.comments')}</span>
        </div>
      </div>
    </div>
  )
}
