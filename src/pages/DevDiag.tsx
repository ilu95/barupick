// @ts-nocheck
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface TestResult {
  name: string
  status: 'pending' | 'pass' | 'fail' | 'skip'
  detail?: string
  ms?: number
}

export default function DevDiag() {
  const { user, profile } = useAuth()
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)

  const update = (name: string, status: TestResult['status'], detail?: string, ms?: number) => {
    setResults(prev => {
      const idx = prev.findIndex(r => r.name === name)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { name, status, detail, ms }
        return copy
      }
      return [...prev, { name, status, detail, ms }]
    })
  }

  const runAll = useCallback(async () => {
    setResults([])
    setRunning(true)

    // 1. Supabase 연결
    const t0 = Date.now()
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1)
      if (error) throw error
      update('1. DB 연결', 'pass', `profiles 테이블 접근 OK`, Date.now() - t0)
    } catch (e: any) {
      update('1. DB 연결', 'fail', e.message || String(e))
    }

    // 2. 테이블 존재 확인
    const tables = ['profiles', 'posts', 'follows', 'likes', 'bookmarks', 'comments', 'blocks', 'events', 'event_submissions', 'notifications', 'reports', 'feedbacks', 'user_data']
    for (const table of tables) {
      try {
        const t1 = Date.now()
        const { error } = await supabase.from(table).select('*').limit(0)
        if (error) throw error
        update(`2. 테이블: ${table}`, 'pass', '', Date.now() - t1)
      } catch (e: any) {
        update(`2. 테이블: ${table}`, 'fail', e.message?.includes('does not exist') ? '테이블 없음 → SQL 실행 필요' : e.message)
      }
    }

    // 3. RPC 함수 확인
    const rpcs = [
      { name: 'increment_view_count', args: { p_post_id: '00000000-0000-0000-0000-000000000000' } },
      { name: 'get_unread_notification_count', args: { p_user_id: '00000000-0000-0000-0000-000000000000' } },
      { name: 'mark_notifications_read', args: { p_user_id: '00000000-0000-0000-0000-000000000000' } },
    ]
    for (const rpc of rpcs) {
      try {
        const t2 = Date.now()
        const { error } = await supabase.rpc(rpc.name, rpc.args)
        // 일부 에러는 정상 (예: foreign key 위반)
        if (error && !error.message?.includes('violates') && !error.message?.includes('RLS')) throw error
        update(`3. RPC: ${rpc.name}`, 'pass', '', Date.now() - t2)
      } catch (e: any) {
        update(`3. RPC: ${rpc.name}`, 'fail', e.message?.includes('does not exist') ? '함수 없음 → SQL 실행 필요' : e.message)
      }
    }

    // 4. Auth 상태
    if (user) {
      update('4. 인증 상태', 'pass', `로그인됨: ${user.email || user.id.slice(0, 8)}`)
    } else {
      update('4. 인증 상태', 'skip', '로그인 필요 (이메일 로그인 후 재실행)')
    }

    // 5. 프로필 조회
    if (user) {
      try {
        const t3 = Date.now()
        const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (error) throw error
        update('5. 내 프로필', 'pass', `닉네임: ${data?.nickname || '(없음)'}`, Date.now() - t3)
      } catch (e: any) {
        update('5. 내 프로필', 'fail', e.message)
      }
    } else {
      update('5. 내 프로필', 'skip')
    }

    // 6. 게시물 CRUD
    if (user) {
      let testPostId: string | null = null
      try {
        // INSERT
        const t4 = Date.now()
        const { data: inserted, error: insertErr } = await supabase.from('posts').insert({
          user_id: user.id,
          title: '[테스트] 진단 게시물',
          outfit: { top: 'navy', bottom: 'beige', shoes: 'brown' },
          score: 78,
          style: 'casual',
          caption: 'DevDiag 자동 생성',
          visibility: 'private',
        }).select('id').single()
        if (insertErr) throw insertErr
        testPostId = inserted?.id
        update('6a. 게시물 INSERT', 'pass', `id: ${testPostId?.slice(0, 8)}`, Date.now() - t4)

        // SELECT
        const t5 = Date.now()
        const { data: selected, error: selectErr } = await supabase.from('posts')
          .select('*, profiles!posts_user_id_fkey(nickname, avatar_url)')
          .eq('id', testPostId).single()
        if (selectErr) throw selectErr
        update('6b. 게시물 SELECT + JOIN', 'pass', `title: ${selected?.title}`, Date.now() - t5)

        // UPDATE
        const t6 = Date.now()
        const { error: updateErr } = await supabase.from('posts')
          .update({ caption: 'DevDiag 수정됨' }).eq('id', testPostId)
        if (updateErr) throw updateErr
        update('6c. 게시물 UPDATE', 'pass', '', Date.now() - t6)

        // DELETE
        const t7 = Date.now()
        const { error: deleteErr } = await supabase.from('posts').delete().eq('id', testPostId)
        if (deleteErr) throw deleteErr
        update('6d. 게시물 DELETE', 'pass', '', Date.now() - t7)
      } catch (e: any) {
        update('6. 게시물 CRUD', 'fail', e.message)
        // 정리
        if (testPostId) supabase.from('posts').delete().eq('id', testPostId).catch(() => {})
      }
    } else {
      update('6. 게시물 CRUD', 'skip', '로그인 필요')
    }

    // 7. 좋아요 (자기 게시물에)
    if (user) {
      try {
        // 테스트 포스트 생성 → 좋아요 → 삭제
        const { data: p } = await supabase.from('posts').insert({
          user_id: user.id, title: '[테스트] 좋아요', outfit: {}, visibility: 'private'
        }).select('id').single()
        if (!p) throw new Error('게시물 생성 실패')

        const t8 = Date.now()
        const { error: likeErr } = await supabase.from('likes').insert({ user_id: user.id, post_id: p.id })
        if (likeErr) throw likeErr

        const { data: likeCheck } = await supabase.from('likes').select('id').eq('user_id', user.id).eq('post_id', p.id)
        if (!likeCheck || likeCheck.length === 0) throw new Error('좋아요 조회 실패')

        // 좋아요 삭제
        await supabase.from('likes').delete().eq('id', likeCheck[0].id)
        // 게시물 삭제
        await supabase.from('posts').delete().eq('id', p.id)
        update('7. 좋아요 INSERT/SELECT/DELETE', 'pass', '', Date.now() - t8)
      } catch (e: any) {
        update('7. 좋아요', 'fail', e.message)
      }
    } else {
      update('7. 좋아요', 'skip')
    }

    // 8. 팔로우 (자기 자신은 안됨, 더미 UUID)
    if (user) {
      try {
        const dummyId = '00000000-0000-0000-0000-000000000001'
        const t9 = Date.now()
        // INSERT (실패할 수 있음 - FK 위반)
        const { error: fErr } = await supabase.from('follows').insert({ follower_id: user.id, following_id: dummyId })
        if (fErr && !fErr.message?.includes('violates foreign key')) throw fErr
        if (!fErr) {
          // 정리
          await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', dummyId)
          update('8. 팔로우 RLS', 'pass', 'INSERT/DELETE OK', Date.now() - t9)
        } else {
          update('8. 팔로우 RLS', 'pass', 'FK 검증 동작 (정상)', Date.now() - t9)
        }
      } catch (e: any) {
        update('8. 팔로우', 'fail', e.message)
      }
    } else {
      update('8. 팔로우', 'skip')
    }

    // 9. Storage
    try {
      const t10 = Date.now()
      // listBuckets는 service_role 필요 → 대신 각 버킷에 list 시도
      let hasCommunity = false, hasAvatars = false
      try {
        const { error: ce } = await supabase.storage.from('community').list('', { limit: 1 })
        hasCommunity = !ce
      } catch {}
      try {
        const { error: ae } = await supabase.storage.from('avatars').list('', { limit: 1 })
        hasAvatars = !ae
      } catch {}
      if (hasCommunity && hasAvatars) {
        update('9. Storage 버킷', 'pass', `community ✓, avatars ✓`, Date.now() - t10)
      } else {
        update('9. Storage 버킷', 'fail', `${!hasCommunity ? 'community 없음 ' : ''}${!hasAvatars ? 'avatars 없음' : ''} → Dashboard에서 생성 필요`)
      }
    } catch (e: any) {
      update('9. Storage 버킷', 'fail', e.message)
    }

    // 10. 피드 쿼리 (실제 앱에서 사용하는 패턴)
    try {
      const t11 = Date.now()
      const { data, error } = await supabase.from('posts')
        .select('*, profiles!posts_user_id_fkey(nickname, avatar_url, instagram_id)')
        .eq('status', 'approved')
        .or('visibility.eq.public,visibility.is.null')
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      update('10. 피드 쿼리', 'pass', `${(data || []).length}개 게시물`, Date.now() - t11)
    } catch (e: any) {
      update('10. 피드 쿼리', 'fail', e.message)
    }

    setRunning(false)
  }, [user])

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const skipped = results.filter(r => r.status === 'skip').length

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-xl font-bold text-warm-900 tracking-tight mb-1">Supabase 연결 진단</h2>
      <p className="text-sm text-warm-600 mb-2">개발DB (ywqaxxcv...) 연결 상태를 확인합니다</p>

      <div className="flex gap-2 text-xs mb-4">
        <span className="px-2 py-1 rounded-full bg-warm-200">유저: {user ? user.email || user.id.slice(0, 8) : '로그인 안됨'}</span>
        {profile && <span className="px-2 py-1 rounded-full bg-terra-100 text-terra-700">@{profile.nickname}</span>}
      </div>

      <button
        onClick={runAll}
        disabled={running}
        className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra mb-5 disabled:opacity-50"
      >
        {running ? '테스트 실행 중...' : '전체 진단 실행'}
      </button>

      {results.length > 0 && (
        <div className="flex gap-2 mb-4 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-semibold">✓ {passed}</span>
          <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-semibold">✕ {failed}</span>
          <span className="px-2.5 py-1 rounded-full bg-warm-200 text-warm-700 font-semibold">- {skipped}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {results.map(r => (
          <div key={r.name} className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm ${
            r.status === 'pass' ? 'bg-green-50 border-green-200' :
            r.status === 'fail' ? 'bg-red-50 border-red-200' :
            r.status === 'skip' ? 'bg-warm-100 border-warm-300' :
            'bg-white border-warm-400'
          }`}>
            <span className="flex-shrink-0 mt-0.5">
              {r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : r.status === 'skip' ? '⏭️' : '⏳'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-warm-900">{r.name}</div>
              {r.detail && <div className="text-xs text-warm-600 mt-0.5 break-all">{r.detail}</div>}
            </div>
            {r.ms !== undefined && <span className="text-[10px] text-warm-500 flex-shrink-0">{r.ms}ms</span>}
          </div>
        ))}
      </div>

      {failed > 0 && (
        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="text-sm font-bold text-amber-800 mb-2">수정 방법</div>
          <div className="text-xs text-amber-700 leading-relaxed space-y-1.5">
            <p><b>테이블/함수 없음:</b> Supabase Dashboard → SQL Editor에서 <code>barupick-dev-db-setup.sql</code> 전체 실행</p>
            <p><b>Storage 버킷 없음:</b> Dashboard → Storage → New Bucket → 이름: <code>community</code> (Public), <code>avatars</code> (Public)</p>
            <p><b>RLS 에러:</b> SQL 스크립트의 RLS 정책 부분이 제대로 실행됐는지 확인</p>
          </div>
        </div>
      )}

      {passed > 0 && failed === 0 && !running && (
        <div className="mt-5 bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <div className="text-sm font-bold text-green-800">모든 테스트 통과!</div>
          <div className="text-xs text-green-600 mt-1">Supabase 연결이 정상입니다. Vercel 배포를 진행해도 됩니다.</div>
        </div>
      )}
    </div>
  )
}
