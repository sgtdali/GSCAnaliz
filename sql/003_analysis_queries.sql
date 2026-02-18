-- ============================================
-- GSC Analytics — Analiz Sorguları
-- API endpoint'lerinden çağrılır
-- ============================================

-- ============================================
-- Q1: URL bazlı günlük metrikler
-- API: GET /api/seo/gsc/daily?page=...&days=30
-- ============================================
-- $1 = page URL, $2 = days (default 30)
SELECT
  date,
  page,
  clicks,
  impressions,
  ctr,
  position,
  fetched_at
FROM gsc_daily_metrics
WHERE page = $1
  AND date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
ORDER BY date DESC;


-- ============================================
-- Q2: Haftalık WoW analizi
-- API: GET /api/seo/gsc/weekly?page=...&weeks=8
-- ============================================
-- $1 = page URL (optional, NULL = tümü), $2 = weeks
SELECT
  week_start,
  week_end,
  page,
  total_clicks,
  total_impressions,
  avg_ctr,
  avg_position,
  data_days,
  prev_clicks,
  prev_impressions,
  click_change_pct,
  impression_change_pct,
  ctr_delta,
  position_delta
FROM weekly_page_summary
WHERE ($1 IS NULL OR page = $1)
  AND week_start >= CURRENT_DATE - ($2 * 7 || ' days')::INTERVAL
ORDER BY week_start DESC, total_clicks DESC;


-- ============================================
-- Q3: Değişiklik etki analizi
-- API: GET /api/seo/gsc/impact?page=...&changeId=...
-- Değişiklikten önceki 2 hafta vs sonraki 2 hafta
-- ============================================
-- $1 = change_id
WITH change_info AS (
  SELECT page, changed_at::DATE AS change_date
  FROM content_change_log
  WHERE id = $1
),
baseline AS (
  SELECT
    SUM(clicks) AS total_clicks,
    SUM(impressions) AS total_impressions,
    CASE 
      WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::NUMERIC / SUM(impressions)) * 100, 4)
      ELSE 0
    END AS avg_ctr,
    ROUND(AVG(position)::NUMERIC, 2) AS avg_position,
    COUNT(*) AS data_days
  FROM gsc_daily_metrics m
  JOIN change_info ci ON m.page = ci.page
  WHERE m.date >= ci.change_date - INTERVAL '14 days'
    AND m.date < ci.change_date
),
post_change AS (
  SELECT
    SUM(clicks) AS total_clicks,
    SUM(impressions) AS total_impressions,
    CASE 
      WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::NUMERIC / SUM(impressions)) * 100, 4)
      ELSE 0
    END AS avg_ctr,
    ROUND(AVG(position)::NUMERIC, 2) AS avg_position,
    COUNT(*) AS data_days
  FROM gsc_daily_metrics m
  JOIN change_info ci ON m.page = ci.page
  WHERE m.date >= ci.change_date
    AND m.date < ci.change_date + INTERVAL '14 days'
)
SELECT
  ci.page,
  ci.change_date,

  -- Baseline (önceki 2 hafta)
  b.total_clicks AS baseline_clicks,
  b.total_impressions AS baseline_impressions,
  b.avg_ctr AS baseline_ctr,
  b.avg_position AS baseline_position,
  b.data_days AS baseline_days,

  -- Post-change (sonraki 2 hafta)
  p.total_clicks AS post_clicks,
  p.total_impressions AS post_impressions,
  p.avg_ctr AS post_ctr,
  p.avg_position AS post_position,
  p.data_days AS post_days,

  -- Uplift hesaplama
  CASE 
    WHEN b.total_clicks > 0 
    THEN ROUND(((p.total_clicks - b.total_clicks)::NUMERIC / b.total_clicks) * 100, 2)
    ELSE NULL
  END AS click_uplift_pct,

  CASE 
    WHEN b.total_impressions > 0 
    THEN ROUND(((p.total_impressions - b.total_impressions)::NUMERIC / b.total_impressions) * 100, 2)
    ELSE NULL
  END AS impression_uplift_pct,

  ROUND((p.avg_ctr - b.avg_ctr)::NUMERIC, 4) AS ctr_uplift,
  ROUND((p.avg_position - b.avg_position)::NUMERIC, 2) AS position_change,

  -- Güven eşiği: minimum 100 impressions baseline'da
  CASE 
    WHEN b.total_impressions >= 100 AND b.data_days >= 10 THEN 'high'
    WHEN b.total_impressions >= 30 AND b.data_days >= 5 THEN 'medium'
    ELSE 'low'
  END AS confidence_level

FROM change_info ci
CROSS JOIN baseline b
CROSS JOIN post_change p;


-- ============================================
-- Q4: Aksiyon önerileri — skor hesaplama
-- API: GET /api/seo/gsc/actions?page=...
-- ============================================
-- $1 = page URL (optional), $2 = minimum impressions (default 50)
WITH recent_wow AS (
  SELECT
    page,
    total_clicks,
    total_impressions,
    avg_ctr,
    avg_position,
    click_change_pct,
    impression_change_pct,
    ctr_delta,
    position_delta,
    ROW_NUMBER() OVER (PARTITION BY page ORDER BY week_start DESC) AS rn
  FROM weekly_page_summary
  WHERE ($1 IS NULL OR page = $1)
    AND total_impressions >= $2
)
SELECT
  page,
  total_clicks,
  total_impressions,
  avg_ctr,
  avg_position,
  click_change_pct,
  impression_change_pct,
  ctr_delta,
  position_delta,

  -- Aksiyon kuralları
  CASE
    -- Kural 1: Impressions artıp CTR düşüyorsa → title/meta testi
    WHEN impression_change_pct > 10 AND ctr_delta < -0.5
    THEN 'TITLE_META_TEST'

    -- Kural 2: Position iyileşip click artmıyorsa → snippet/intent uyumu
    WHEN position_delta < -1.0 AND click_change_pct < 5
    THEN 'SNIPPET_INTENT_REVIEW'

    -- Kural 3: Click düşüşü → query kaybı analizi
    WHEN click_change_pct < -15
    THEN 'QUERY_LOSS_ANALYSIS'

    -- Kural 4: Tüm metrikler düşüyor → acil inceleme
    WHEN click_change_pct < -10 AND impression_change_pct < -10
    THEN 'URGENT_REVIEW'

    -- Kural 5: Position kötüleşiyor → teknik/içerik kontrolü
    WHEN position_delta > 2.0
    THEN 'POSITION_DECLINE_CHECK'

    -- Kural 6: Büyüme → fırsat
    WHEN click_change_pct > 20 AND impression_change_pct > 20
    THEN 'GROWTH_OPPORTUNITY'

    ELSE 'MONITOR'
  END AS action_recommendation,

  -- Öncelik skoru (0-100)
  GREATEST(0, LEAST(100,
    -- Yüksek hacimli sayfalar daha önemli
    (CASE WHEN total_impressions > 1000 THEN 30 
          WHEN total_impressions > 500 THEN 20 
          WHEN total_impressions > 100 THEN 10 
          ELSE 5 END) +
    -- Büyük düşüşler daha acil
    (CASE WHEN click_change_pct < -30 THEN 40 
          WHEN click_change_pct < -15 THEN 25 
          WHEN click_change_pct < -5 THEN 10 
          ELSE 0 END) +
    -- Position kötüleşmesi
    (CASE WHEN position_delta > 5 THEN 20 
          WHEN position_delta > 2 THEN 10 
          ELSE 0 END) +
    -- CTR düşüşü
    (CASE WHEN ctr_delta < -1.0 THEN 10 ELSE 0 END)
  )) AS priority_score

FROM recent_wow
WHERE rn = 1
ORDER BY priority_score DESC;


-- ============================================
-- Q5: Top pages — En çok tıklanan blog sayfaları
-- Yardımcı sorgu
-- ============================================
SELECT
  page,
  SUM(clicks) AS total_clicks,
  SUM(impressions) AS total_impressions,
  ROUND(AVG(ctr)::NUMERIC, 4) AS avg_ctr,
  ROUND(AVG(position)::NUMERIC, 2) AS avg_position,
  MIN(date) AS first_seen,
  MAX(date) AS last_seen,
  COUNT(*) AS data_points
FROM gsc_daily_metrics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY page
ORDER BY total_clicks DESC
LIMIT 50;
