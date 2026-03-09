-- ================================================================
-- 바루픽 프로덕션 DB 스키마 패치
-- 프로덕션 Supabase: kwcogjzwpnvqwmifizce.supabase.co
-- 실행: Supabase Dashboard → SQL Editor → 아래 순서대로 실행
-- ================================================================

-- ────────────────────────────────────
-- 1. profiles 테이블 (auth.users → profiles 자동 생성)
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT DEFAULT '스타일 입문자',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  email TEXT DEFAULT '',
  instagram_id TEXT DEFAULT '',
  personal_color TEXT DEFAULT '',
  body_type TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- profiles RLS: 누구나 읽기, 본인만 수정
CREATE POLICY IF NOT EXISTS "profiles_read" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);


-- ────────────────────────────────────
-- 2. handle_new_user 트리거 (수정본 - EXCEPTION 제거)
-- ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
      '스타일 입문자'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────
-- 3. posts 테이블
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  outfit JSONB DEFAULT '{}',
  score INT DEFAULT 0,
  style TEXT,
  layer_type TEXT DEFAULT 'basic',
  caption TEXT DEFAULT '',
  photo_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'approved',
  visibility TEXT DEFAULT 'public',
  show_instagram BOOLEAN DEFAULT false,
  hide_counts BOOLEAN DEFAULT false,
  likes_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  save_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "posts_read" ON public.posts
  FOR SELECT USING (status = 'approved' OR user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "posts_insert" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "posts_update" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "posts_delete" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────
-- 4. likes / bookmarks
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "likes_read" ON public.likes FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "likes_insert" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "likes_delete" ON public.likes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "bookmarks_read" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "bookmarks_insert" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "bookmarks_delete" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────
-- 5. follows / blocks
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "follows_read" ON public.follows FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "follows_insert" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY IF NOT EXISTS "follows_delete" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "blocks_read" ON public.blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY IF NOT EXISTS "blocks_insert" ON public.blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY IF NOT EXISTS "blocks_delete" ON public.blocks FOR DELETE USING (auth.uid() = blocker_id);


-- ────────────────────────────────────
-- 6. comments
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "comments_read" ON public.comments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "comments_insert" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "comments_delete" ON public.comments FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────
-- 7. events / event_submissions
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  rules TEXT DEFAULT '',
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ DEFAULT now() + interval '7 days',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "events_read" ON public.events FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.event_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit JSONB DEFAULT '{}',
  photo_urls TEXT[] DEFAULT '{}',
  instagram_id TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.event_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "submissions_read" ON public.event_submissions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "submissions_insert" ON public.event_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ────────────────────────────────────
-- 8. notifications
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'info',
  title TEXT DEFAULT '',
  body TEXT DEFAULT '',
  link TEXT DEFAULT '',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "notif_read" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "notif_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "notif_insert" ON public.notifications FOR INSERT WITH CHECK (true);

-- mark_notifications_read 함수
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.notifications SET read = true WHERE user_id = p_user_id AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────
-- 9. reports / feedbacks / user_data
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id),
  post_id UUID REFERENCES public.posts(id),
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "reports_insert" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "feedbacks_insert" ON public.feedbacks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key)
);
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "userdata_read" ON public.user_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "userdata_insert" ON public.user_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "userdata_update" ON public.user_data FOR UPDATE USING (auth.uid() = user_id);


-- ────────────────────────────────────
-- 10. Storage 버킷 (Dashboard에서 수동 생성 필요)
-- ────────────────────────────────────
-- Dashboard → Storage → New Bucket:
--   1. avatars (Public)
--   2. community (Public)

-- Storage RLS:
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('community', 'community', true) ON CONFLICT DO NOTHING;
