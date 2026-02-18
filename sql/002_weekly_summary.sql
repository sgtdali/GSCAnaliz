-- ============================================
-- GSC Analytics — Haftalık Özet Build Sorgusu
-- build-weekly-summary.ts tarafından çağrılır
-- ============================================

-- Parametre: $1 = week_start (DATE), $2 = week_end (DATE)
-- Örnek: $1 = '2026-02-09', $2 = '2026-02-15'

-- Bu sorgu, mevcut hafta ve önceki haftanın verilerini
-- tek seferde hesaplayıp weekly_page_summary tablosuna UPSERT yapar.

WITH current_week AS (
  SELECT
    page,
    SUM(clicks) AS total_clicks,
    SUM(impressions) AS total_impressions,
    CASE 
      WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::NUMERIC / SUM(impressions)) * 100, 4)
      ELSE 0
    END AS avg_ctr,
    ROUND(AVG(position)::NUMERIC, 2) AS avg_position,
    COUNT(*) AS data_days
  FROM gsc_daily_metrics
  WHERE date >= $1 AND date <= $2
  GROUP BY page
),
previous_week AS (
  SELECT
    page,
    SUM(clicks) AS total_clicks,
    SUM(impressions) AS total_impressions,
    CASE 
      WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::NUMERIC / SUM(impressions)) * 100, 4)
      ELSE 0
    END AS avg_ctr,
    ROUND(AVG(position)::NUMERIC, 2) AS avg_position
  FROM gsc_daily_metrics
  WHERE date >= ($1::DATE - INTERVAL '7 days') AND date < $1
  GROUP BY page
)
INSERT INTO weekly_page_summary (
  week_start, week_end, page,
  total_clicks, total_impressions, avg_ctr, avg_position, data_days,
  prev_clicks, prev_impressions, prev_avg_ctr, prev_avg_position,
  click_change_pct, impression_change_pct, ctr_delta, position_delta,
  computed_at
)
SELECT
  $1 AS week_start,
  $2 AS week_end,
  cw.page,
  cw.total_clicks,
  cw.total_impressions,
  cw.avg_ctr,
  cw.avg_position,
  cw.data_days,
  pw.total_clicks AS prev_clicks,
  pw.total_impressions AS prev_impressions,
  pw.avg_ctr AS prev_avg_ctr,
  pw.avg_position AS prev_avg_position,
  -- WoW Click Change %
  CASE 
    WHEN pw.total_clicks IS NOT NULL AND pw.total_clicks > 0 
    THEN ROUND(((cw.total_clicks - pw.total_clicks)::NUMERIC / pw.total_clicks) * 100, 2)
    ELSE NULL
  END AS click_change_pct,
  -- WoW Impression Change %
  CASE 
    WHEN pw.total_impressions IS NOT NULL AND pw.total_impressions > 0 
    THEN ROUND(((cw.total_impressions - pw.total_impressions)::NUMERIC / pw.total_impressions) * 100, 2)
    ELSE NULL
  END AS impression_change_pct,
  -- CTR Delta (absolute)
  CASE 
    WHEN pw.avg_ctr IS NOT NULL 
    THEN ROUND((cw.avg_ctr - pw.avg_ctr)::NUMERIC, 4)
    ELSE NULL
  END AS ctr_delta,
  -- Position Delta (negatif = iyileşme)
  CASE 
    WHEN pw.avg_position IS NOT NULL 
    THEN ROUND((cw.avg_position - pw.avg_position)::NUMERIC, 2)
    ELSE NULL
  END AS position_delta,
  NOW() AS computed_at
FROM current_week cw
LEFT JOIN previous_week pw ON cw.page = pw.page
ON CONFLICT (week_start, page) DO UPDATE SET
  week_end = EXCLUDED.week_end,
  total_clicks = EXCLUDED.total_clicks,
  total_impressions = EXCLUDED.total_impressions,
  avg_ctr = EXCLUDED.avg_ctr,
  avg_position = EXCLUDED.avg_position,
  data_days = EXCLUDED.data_days,
  prev_clicks = EXCLUDED.prev_clicks,
  prev_impressions = EXCLUDED.prev_impressions,
  prev_avg_ctr = EXCLUDED.prev_avg_ctr,
  prev_avg_position = EXCLUDED.prev_avg_position,
  click_change_pct = EXCLUDED.click_change_pct,
  impression_change_pct = EXCLUDED.impression_change_pct,
  ctr_delta = EXCLUDED.ctr_delta,
  position_delta = EXCLUDED.position_delta,
  computed_at = NOW();
