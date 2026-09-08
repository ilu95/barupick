-- ═══════════════════════════════════════════════════════
-- 07_vote_og.sql — 투표 링크 미리보기 이미지 (카톡 OG)
--
-- 앱이 투표를 만들 때 1200×630 카드를 그려 Storage 버킷 vote-cards 에 올리고,
-- 그 공개 URL 을 coord_votes.og_url 에 함께 넣는다. api/og/vote.js 가 크롤러에게
-- 이 URL 을 og:image 로 준다. 익명도 투표를 만들므로 업로드는 public 에 연다
-- (파일명은 코드 6자 + .png, 덮어쓰기 없음).
-- 06_coord_votes.sql 다음에 1회 실행. 여러 번 실행해도 안전.
-- ═══════════════════════════════════════════════════════

ALTER TABLE public.coord_votes ADD COLUMN IF NOT EXISTS og_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vote-cards', 'vote-cards', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "vote_cards_upload" ON storage.objects;
DROP POLICY IF EXISTS "vote_cards_read" ON storage.objects;
CREATE POLICY "vote_cards_upload" ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'vote-cards' AND name ~ '^[A-Z0-9]{6,12}\.png$');
CREATE POLICY "vote_cards_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'vote-cards');
