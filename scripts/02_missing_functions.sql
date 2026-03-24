-- ================================================================
-- 바루픽 누락 RPC 함수 패치
-- Supabase Dashboard → SQL Editor에서 실행
-- ================================================================

-- ────────────────────────────────────
-- 0. likes 테이블 RLS 정책 재적용 (400 Bad Request 수정)
-- ────────────────────────────────────
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "likes_read" ON public.likes;
DROP POLICY IF EXISTS "likes_select" ON public.likes;
CREATE POLICY "likes_read" ON public.likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "likes_insert" ON public.likes;
CREATE POLICY "likes_insert" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "likes_delete" ON public.likes;
CREATE POLICY "likes_delete" ON public.likes FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────
-- 1. increment_view_count: 게시물 조회수 증가
-- ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_view_count(p_post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts SET view_count = view_count + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────
-- 2. increment_save_count: 게시물 저장 수 증가
-- ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_save_count(p_post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts SET save_count = save_count + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────
-- 3. decrement_save_count: 게시물 저장 수 감소
-- ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.decrement_save_count(p_post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts SET save_count = GREATEST(save_count - 1, 0) WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────
-- 4. send_notification: 알림 전송
-- ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id UUID,
  p_actor_id UUID,
  p_type TEXT,
  p_message TEXT,
  p_related_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- 자기 자신에게는 알림 보내지 않음
  IF p_user_id = p_actor_id THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link, read)
  VALUES (
    p_user_id,
    p_type,
    p_type,
    p_message,
    COALESCE('/community/' || p_related_id::TEXT, ''),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────
-- 5. get_user_like_rankings: 유저별 좋아요 랭킹
-- ────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_user_like_rankings(INT);
CREATE OR REPLACE FUNCTION public.get_user_like_rankings(lim INT DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  avatar_url TEXT,
  total_likes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    pr.nickname,
    pr.avatar_url,
    COALESCE(SUM(p.likes_count), 0) AS total_likes
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.status = 'approved'
  GROUP BY p.user_id, pr.nickname, pr.avatar_url
  ORDER BY total_likes DESC
  LIMIT lim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────
-- 6. delete_own_account: 계정 자체 삭제
-- ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
BEGIN
  -- profiles는 CASCADE로 자동 삭제됨
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────
-- 7. get_unread_notification_count: 읽지 않은 알림 수
-- ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.notifications WHERE user_id = p_user_id AND read = false;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────
-- 8. likes_count 트리거 재확인 (이미 있으면 무시됨)
-- ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_likes_count ON public.likes;
CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.update_likes_count();


-- ────────────────────────────────────
-- 8. comments_count 트리거 (누락)
-- ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_comments_count ON public.comments;
CREATE TRIGGER trigger_update_comments_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_comments_count();


-- ────────────────────────────────────
-- 9. 기존 데이터 카운트 동기화 (1회성)
-- ────────────────────────────────────
-- likes_count 동기화
UPDATE public.posts p
SET likes_count = (SELECT COUNT(*) FROM public.likes l WHERE l.post_id = p.id);

-- comments_count 동기화
UPDATE public.posts p
SET comments_count = (SELECT COUNT(*) FROM public.comments c WHERE c.post_id = p.id);

-- save_count는 localStorage 기반이라 서버에서 정확히 동기화 불가
-- 0으로 리셋 (선택사항, 필요 시 주석 해제)
-- UPDATE public.posts SET save_count = 0;


-- ════════════════════════════════════
-- 완료! 이 스크립트를 실행하면:
-- ✅ 조회수 증가 (increment_view_count)
-- ✅ 저장 수 증가/감소 (increment/decrement_save_count)
-- ✅ 알림 전송 (send_notification)
-- ✅ 유저 랭킹 (get_user_like_rankings)
-- ✅ 계정 삭제 (delete_own_account)
-- ✅ 좋아요 카운트 트리거 재적용
-- ✅ 댓글 카운트 트리거 추가
-- ✅ 기존 카운트 데이터 동기화
-- ════════════════════════════════════
