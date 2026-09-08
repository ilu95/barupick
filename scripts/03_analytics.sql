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

-- ─── 계측 v1 (2026-09-08) 조회 예시 — 색 선택·만들기 퍼널·공유 ───
-- 스키마 변경 없음. 아래는 모두 meta(jsonb) 조회.

-- 색별 선택 수 (최근 30일, 만들기 화면) → 팔레트 축소의 1차 근거
-- SELECT meta->>'color' AS color, COUNT(*) AS picks
-- FROM analytics_events WHERE event = 'color_pick' AND meta->>'ctx' = 'build'
--   AND created_at > now() - interval '30 days'
-- GROUP BY 1 ORDER BY picks DESC;

-- 탭별 노출 대비 선택률 (노출 = color_tab, 선택 = color_pick.src='grid')
-- WITH e AS (SELECT meta->>'tab' AS tab, COUNT(*) AS shown FROM analytics_events
--            WHERE event = 'color_tab' AND created_at > now() - interval '30 days' GROUP BY 1),
--      p AS (SELECT meta->>'tab' AS tab, COUNT(*) AS picked FROM analytics_events
--            WHERE event = 'color_pick' AND meta->>'src' = 'grid' AND created_at > now() - interval '30 days' GROUP BY 1)
-- SELECT e.tab, e.shown, COALESCE(p.picked,0) AS picked, ROUND(COALESCE(p.picked,0)::numeric / e.shown, 3) AS rate
-- FROM e LEFT JOIN p USING (tab) ORDER BY rate DESC;

-- 한 번도 안 고른 색 (탭에 노출은 됐지만 picks 0) — 팔레트 축소 후보
-- SELECT c.color FROM unnest(ARRAY['white','ivory','navy']) AS c(color)   -- 실제로는 COLORS_60 키 전체를 넣는다
-- WHERE NOT EXISTS (SELECT 1 FROM analytics_events WHERE event='color_pick' AND meta->>'color' = c.color
--                   AND created_at > now() - interval '30 days');

-- 자리(slot)별 인기 색 TOP 5
-- SELECT meta->>'slot' AS slot, meta->>'color' AS color, COUNT(*) AS n
-- FROM analytics_events WHERE event = 'color_confirm' AND created_at > now() - interval '30 days'
-- GROUP BY 1,2 ORDER BY 1, n DESC;

-- 추천 칩(rec) vs 격자(grid) vs 최근(recent) — 어디서 고르는가
-- SELECT meta->>'src' AS src, COUNT(*) FROM analytics_events
-- WHERE event = 'color_pick' AND meta->>'ctx' = 'build' AND created_at > now() - interval '30 days' GROUP BY 1;

-- 만들기 퍼널 (세션 기준): style → builder → result
-- SELECT
--   COUNT(DISTINCT session_id) FILTER (WHERE meta->>'step' = 'style')   AS s_style,
--   COUNT(DISTINCT session_id) FILTER (WHERE meta->>'step' = 'builder') AS s_builder,
--   COUNT(DISTINCT session_id) FILTER (WHERE meta->>'step' = 'result')  AS s_result
-- FROM analytics_events WHERE event = 'build_step' AND created_at > now() - interval '30 days';

-- 완료 점수 분포·소요 시간·색 바꾼 횟수 (엔진 버전별) → 엔진 교체 전후 비교
-- SELECT meta->>'engine' AS engine, COUNT(*) AS n,
--   ROUND(AVG((meta->>'score')::numeric),1) AS avg_score,
--   percentile_cont(0.5) WITHIN GROUP (ORDER BY (meta->>'score')::numeric) AS med_score,
--   ROUND(AVG((meta->>'ms')::numeric)/1000) AS avg_sec,
--   ROUND(AVG((meta->>'confirms')::numeric),1) AS avg_confirms,
--   ROUND(AVG(CASE WHEN (meta->>'layered')::boolean THEN 1 ELSE 0 END),2) AS layered_rate
-- FROM analytics_events WHERE event = 'build_complete' AND created_at > now() - interval '30 days'
-- GROUP BY 1;

-- 점수 구간별 완료 수 (등급 기준 조정의 근거)
-- SELECT width_bucket((meta->>'score')::numeric, 0, 100, 10) AS bucket, COUNT(*)
-- FROM analytics_events WHERE event = 'build_complete' GROUP BY 1 ORDER BY 1;

-- 공유: 어디서, 어떤 방식으로
-- SELECT meta->>'ctx' AS ctx, meta->>'kind' AS kind, COUNT(*) FROM analytics_events
-- WHERE event = 'share' AND created_at > now() - interval '30 days' GROUP BY 1,2 ORDER BY 3 DESC;
