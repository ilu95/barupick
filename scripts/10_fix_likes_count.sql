-- ================================================================
-- 10. 좋아요 수 오류 수정
--
-- 증상: 하트를 한 번 누르면 likes_count 가 3씩 오른다 (운영 DB에서 모든 게시물의
--       likes_count 가 실제 likes 행 수의 정확히 3배였다). likes 테이블에 같은 일을 하는
--       트리거가 여러 개 걸려 있어서다.
-- 조치: 1) likes 테이블의 사용자 트리거를 전부 지운다
--       2) 함수는 "+1/-1" 대신 실제 행 수로 다시 세게 바꾼다 (트리거가 또 겹쳐도 값이 틀리지 않는다)
--       3) 트리거를 하나만 다시 건다
--       4) 지금까지 어긋난 likes_count 를 실제 개수로 맞춘다
-- Supabase SQL Editor 에서 한 번 실행.
-- ================================================================

-- 1) likes 테이블의 사용자 트리거 전부 삭제
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tgname FROM pg_trigger
    WHERE tgrelid = 'public.likes'::regclass AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.likes', r.tgname);
  END LOOP;
END $$;

-- 2) 실제 개수로 다시 세는 함수
CREATE OR REPLACE FUNCTION public.update_likes_count()
RETURNS TRIGGER AS $$
DECLARE pid uuid;
BEGIN
  pid := COALESCE(NEW.post_id, OLD.post_id);
  UPDATE public.posts
     SET likes_count = (SELECT COUNT(*) FROM public.likes l WHERE l.post_id = pid)
   WHERE id = pid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) 트리거 하나만
CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.update_likes_count();

-- 4) 어긋난 값 정리
UPDATE public.posts p
   SET likes_count = (SELECT COUNT(*) FROM public.likes l WHERE l.post_id = p.id);

-- 확인: likes 트리거가 1개(trigger_update_likes_count)만 나와야 한다
SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.likes'::regclass AND NOT tgisinternal;
