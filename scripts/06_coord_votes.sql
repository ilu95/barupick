-- ═══════════════════════════════════════════════════════
-- 06_coord_votes.sql — "이 코디 어때?" 웹 투표 (루프 L3)
--
-- 만든 사람은 앱에서 코디 두 벌(또는 한 벌)로 투표를 만들고 링크를 카톡으로 보낸다.
-- 받는 사람은 앱 없이 웹(/v/<code>)에서 한 번 누르면 끝이다. 결과는 공개다.
-- 익명도 만들 수 있어야 하므로 owner_id 는 null 을 허용한다 (앱은 로그인 없이도 쓴다).
-- Supabase SQL Editor 에서 1회 실행. 여러 번 실행해도 안전.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.coord_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,                 -- 링크용 짧은 코드 (6~8자)
  owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question    TEXT NOT NULL DEFAULT '',
  a           JSONB NOT NULL,                       -- { scene:{items,body}, colors:[{key,hex,name}], score, label }
  b           JSONB,                                -- 없으면 👍/👎 단일 투표
  situ        TEXT,
  temp        INT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days'
);
CREATE INDEX IF NOT EXISTS idx_coord_votes_code ON public.coord_votes(code);
CREATE INDEX IF NOT EXISTS idx_coord_votes_owner ON public.coord_votes(owner_id);

CREATE TABLE IF NOT EXISTS public.coord_vote_answers (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vote_id     UUID NOT NULL REFERENCES public.coord_votes(id) ON DELETE CASCADE,
  choice      TEXT NOT NULL CHECK (choice IN ('a', 'b', 'up', 'down')),
  voter       TEXT NOT NULL,                        -- 기기 키 (익명). 한 기기 한 표
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (vote_id, voter)
);
CREATE INDEX IF NOT EXISTS idx_coord_vote_answers_vote ON public.coord_vote_answers(vote_id);

ALTER TABLE public.coord_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coord_vote_answers ENABLE ROW LEVEL SECURITY;

-- 투표: 누구나 코드로 읽는다. 만들기는 익명(owner null) 또는 본인.
DROP POLICY IF EXISTS "coord_votes_read" ON public.coord_votes;
CREATE POLICY "coord_votes_read" ON public.coord_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "coord_votes_insert" ON public.coord_votes;
CREATE POLICY "coord_votes_insert" ON public.coord_votes FOR INSERT
  WITH CHECK (owner_id IS NULL OR owner_id = auth.uid());

-- 답: 누구나 읽고(결과 공개) 누구나 한 번 넣는다 (UNIQUE 가 중복을 막는다).
DROP POLICY IF EXISTS "coord_vote_answers_read" ON public.coord_vote_answers;
CREATE POLICY "coord_vote_answers_read" ON public.coord_vote_answers FOR SELECT USING (true);
DROP POLICY IF EXISTS "coord_vote_answers_insert" ON public.coord_vote_answers;
CREATE POLICY "coord_vote_answers_insert" ON public.coord_vote_answers FOR INSERT WITH CHECK (true);

-- ─── 조회 예시 ───
-- 코드로 투표 + 결과
-- SELECT v.code, v.question, a.choice, COUNT(*) FROM coord_votes v
-- LEFT JOIN coord_vote_answers a ON a.vote_id = v.id
-- WHERE v.code = '8KQ2AB' GROUP BY 1,2,3;
-- 하루 만든 투표 수 / 답한 사람 수 (루프 K 의 초대·전환 분모)
-- SELECT date(created_at), COUNT(*) FROM coord_votes GROUP BY 1 ORDER BY 1 DESC;
-- SELECT date(created_at), COUNT(*), COUNT(DISTINCT voter) FROM coord_vote_answers GROUP BY 1 ORDER BY 1 DESC;
