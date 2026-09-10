-- ═══════════════════════════════════════════════════════
-- 08_vote_multi.sql — 투표 후보를 유저가 직접 2~4벌 고른다
--
-- 전에는 A(지금)·B(색 한 수 바꾼 것) 두 벌이 자동으로 뽑혔다. 이제 결과 화면에서
-- "친구에게 물어보기"를 누르면 후보 화면이 열리고, 지금 코디·색 한 수·옷 하나·
-- 담아 둔 코디·저장한 코디 중에서 2~4벌을 고른다. 고른 순서가 A·B·C·D 다.
-- sides 에 후보 배열을 넣고, a·b 는 옛 앱·미리보기 호환용으로 그대로 채운다.
-- 07_vote_og.sql 다음에 1회 실행. 여러 번 실행해도 안전.
-- ═══════════════════════════════════════════════════════

ALTER TABLE public.coord_votes ADD COLUMN IF NOT EXISTS sides JSONB;   -- [ {scene,colors,score,label}, ... ] 2~4개

ALTER TABLE public.coord_vote_answers DROP CONSTRAINT IF EXISTS coord_vote_answers_choice_check;
ALTER TABLE public.coord_vote_answers ADD CONSTRAINT coord_vote_answers_choice_check
  CHECK (choice IN ('a', 'b', 'c', 'd', 'up', 'down'));

-- ─── 조회 예시 ───
-- 후보 수별 투표 수 (2벌·3벌·4벌 중 어느 쪽이 많이 쓰이는지)
-- SELECT jsonb_array_length(sides) AS n, COUNT(*) FROM coord_votes WHERE sides IS NOT NULL GROUP BY 1 ORDER BY 1;
