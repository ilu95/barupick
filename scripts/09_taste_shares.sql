-- ═══════════════════════════════════════════════════════
-- 09_taste_shares.sql — 취향 친구 비교 (루프 L2)
--
-- 취향 테스트 결과를 링크(/t/<code>)로 보내면, 받은 친구가 30초 테스트를 마친 뒤
-- 둘의 관계(겹치는 옷장 N벌 · 취향 일치 % · 둘 다 좋아할 코디)를 본다.
-- 보낸 사람은 자기 링크에서 "친구 N명이 비교했어요"와 각 친구와의 비교를 본다.
-- 익명도 보낼 수 있어야 하므로 owner_id 는 null 허용. 미리보기 이미지는 vote-cards
-- 버킷을 같이 쓴다 (코드가 T + 7자 = 8자라 07_vote_og.sql 의 이름 규칙에 맞는다).
-- 08_vote_multi.sql 다음에 1회 실행. 여러 번 실행해도 안전.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.taste_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,                 -- T + 7자
  owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL DEFAULT '',             -- 친구에게 보일 이름
  taste       JSONB NOT NULL,                       -- { v, name, cw, tone, mood, tag, pal, sex, look:{p,key} }
  og_url      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_taste_shares_code ON public.taste_shares(code);
CREATE INDEX IF NOT EXISTS idx_taste_shares_owner ON public.taste_shares(owner_id);

CREATE TABLE IF NOT EXISTS public.taste_compares (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  share_id    UUID NOT NULL REFERENCES public.taste_shares(id) ON DELETE CASCADE,
  voter       TEXT NOT NULL,                        -- 기기 키 (익명). 한 기기 한 번
  name        TEXT NOT NULL DEFAULT '',
  taste       JSONB NOT NULL,                       -- 비교한 친구의 취향 (같은 꼴)
  sim         INT,                                  -- 취향 일치 %
  overlap     INT,                                  -- 겹치는 옷장 벌 수
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (share_id, voter)
);
CREATE INDEX IF NOT EXISTS idx_taste_compares_share ON public.taste_compares(share_id);

ALTER TABLE public.taste_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taste_compares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "taste_shares_read" ON public.taste_shares;
CREATE POLICY "taste_shares_read" ON public.taste_shares FOR SELECT USING (true);
DROP POLICY IF EXISTS "taste_shares_insert" ON public.taste_shares;
CREATE POLICY "taste_shares_insert" ON public.taste_shares FOR INSERT
  WITH CHECK (owner_id IS NULL OR owner_id = auth.uid());

DROP POLICY IF EXISTS "taste_compares_read" ON public.taste_compares;
CREATE POLICY "taste_compares_read" ON public.taste_compares FOR SELECT USING (true);
DROP POLICY IF EXISTS "taste_compares_insert" ON public.taste_compares;
CREATE POLICY "taste_compares_insert" ON public.taste_compares FOR INSERT WITH CHECK (true);

-- ─── 조회 예시 ───
-- 링크 하나당 비교한 친구 수 (2차 확산 분모)
-- SELECT s.code, s.name, COUNT(c.id) FROM taste_shares s LEFT JOIN taste_compares c ON c.share_id = s.id GROUP BY 1,2 ORDER BY 3 DESC;
