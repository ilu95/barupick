-- 바루픽 Analytics 이벤트 테이블
CREATE TABLE IF NOT EXISTS analytics_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event text NOT NULL,
  screen text,
  meta jsonb DEFAULT '{}',
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_screen ON analytics_events(screen);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);

-- RLS: 누구나 INSERT 가능 (비로그인 유저도), SELECT는 서비스 키만
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_insert" ON analytics_events;
CREATE POLICY "analytics_insert" ON analytics_events FOR INSERT WITH CHECK (true);

-- 읽기는 Supabase Dashboard 또는 서비스 키로만 가능 (일반 유저 불가)
DROP POLICY IF EXISTS "analytics_select_none" ON analytics_events;
CREATE POLICY "analytics_select_none" ON analytics_events FOR SELECT USING (false);

-- ─── 유용한 쿼리 예시 ───

-- 일별 방문자 수 (세션 기준)
-- SELECT DATE(created_at) as day, COUNT(DISTINCT session_id) as visitors
-- FROM analytics_events WHERE event = 'page_view'
-- GROUP BY day ORDER BY day DESC LIMIT 30;

-- 화면별 조회수
-- SELECT screen, COUNT(*) as views
-- FROM analytics_events WHERE event = 'page_view'
-- AND created_at > now() - interval '7 days'
-- GROUP BY screen ORDER BY views DESC;

-- 이탈률 (1페이지만 보고 나간 세션)
-- SELECT COUNT(*) FILTER (WHERE cnt = 1)::float / COUNT(*) as bounce_rate
-- FROM (SELECT session_id, COUNT(*) as cnt FROM analytics_events
-- WHERE event = 'page_view' GROUP BY session_id) t;

-- 버튼 클릭 TOP 10
-- SELECT event, meta->>'label' as label, COUNT(*) as clicks
-- FROM analytics_events WHERE event LIKE 'click_%'
-- AND created_at > now() - interval '7 days'
-- GROUP BY event, label ORDER BY clicks DESC LIMIT 10;

-- 유저별 행동 (최근 7일, 특정 유저)
-- SELECT event, screen, meta, created_at
-- FROM analytics_events WHERE user_id = '<uuid>'
-- AND created_at > now() - interval '7 days'
-- ORDER BY created_at DESC;

-- 퍼널 분석 (코디 추천 완주율)
-- SELECT
--   COUNT(*) FILTER (WHERE event = 'page_view' AND screen = '/home/recommend') as started,
--   COUNT(DISTINCT session_id) FILTER (WHERE event = 'recommend_results') as completed
-- FROM analytics_events WHERE created_at > now() - interval '7 days';
