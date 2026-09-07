-- ═══════════════════════════════════════════════════════
-- 04_user_data_blob.sql — user_data 를 "계정당 1행 blob" 형태로 확정
--
-- 배경: 01_schema.sql 은 user_data 를 (user_id, key, value) 로 정의했지만
-- 클라이언트(src/hooks/useAutoSync.ts)는 처음부터 (user_id, data, updated_at) 을 쓰고
-- 충돌 키로 user_id 를 기대한다. 스키마와 클라이언트가 어긋나 있으면
--   - upsert 가 매번 새 행을 INSERT 하고
--   - pull 의 .single() 이 "multiple rows" 로 실패해
-- 동기화가 조용히 죽는다. 이 스크립트는 어느 상태에서 시작하든 같은 결과로 맞춘다.
-- Supabase SQL Editor 에서 1회 실행. 여러 번 실행해도 안전.
-- ═══════════════════════════════════════════════════════

-- 1. data 컬럼 보장
ALTER TABLE public.user_data ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE public.user_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. 옛 (key, value) 컬럼이 있으면 NOT NULL 을 풀어 blob 행 INSERT 를 막지 않게 한다
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_data' AND column_name='key') THEN
    ALTER TABLE public.user_data ALTER COLUMN key DROP NOT NULL;
  END IF;
END $$;

-- 3. 계정당 여러 행이 쌓였으면 최신 하나만 남긴다
DELETE FROM public.user_data a
USING public.user_data b
WHERE a.user_id = b.user_id
  AND (a.updated_at < b.updated_at OR (a.updated_at = b.updated_at AND a.ctid < b.ctid));

-- 4. user_id 유일 제약 (클라이언트 upsert onConflict='user_id' 가 이걸 쓴다)
CREATE UNIQUE INDEX IF NOT EXISTS user_data_user_id_uidx ON public.user_data(user_id);

-- 5. RLS 는 01_schema 그대로 (본인 행만 select/insert/update)
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
