-- ═══════════════════════════════════════════════════════
-- 05_user_items.sql — 기록·저장 코디·옷장을 "행 단위"로 동기화
--
-- 배경: user_data 통짜 blob(LWW) 은 두 기기가 각자 다른 항목을 바꿔도 한쪽이 통째로 덮였다.
-- 이제 항목 하나가 행 하나. 충돌은 행 단위 last-write-wins, 삭제는 tombstone(deleted_at).
-- 작은 스칼라 설정(퍼스널컬러·체형·프로필·XP 등)은 계속 user_data blob 에 남는다.
-- Supabase SQL Editor 에서 1회 실행. 여러 번 실행해도 안전.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_items (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,                 -- 'ootd' | 'saved' | 'wardrobe'
  id         TEXT NOT NULL,                 -- 클라이언트가 만든 항목 id (기존 localStorage id 그대로)
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, kind, id)
);

CREATE INDEX IF NOT EXISTS user_items_user_updated_idx ON public.user_items(user_id, updated_at);

ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_items_select" ON public.user_items;
DROP POLICY IF EXISTS "user_items_insert" ON public.user_items;
DROP POLICY IF EXISTS "user_items_update" ON public.user_items;
DROP POLICY IF EXISTS "user_items_delete" ON public.user_items;
CREATE POLICY "user_items_select" ON public.user_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_items_insert" ON public.user_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_items_update" ON public.user_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_items_delete" ON public.user_items FOR DELETE USING (auth.uid() = user_id);

-- updated_at 은 항상 서버 시각으로 (클라이언트 시계 불일치 방지)
CREATE OR REPLACE FUNCTION public.user_items_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS user_items_touch_trg ON public.user_items;
CREATE TRIGGER user_items_touch_trg
  BEFORE INSERT OR UPDATE ON public.user_items
  FOR EACH ROW EXECUTE FUNCTION public.user_items_touch();

-- 오래된 tombstone 정리 (선택, pg_cron 있으면):
-- DELETE FROM public.user_items WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '90 days';
