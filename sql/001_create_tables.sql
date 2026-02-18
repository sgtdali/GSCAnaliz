-- ============================================
-- GSC Analytics — Database Schema
-- Supabase PostgreSQL uyumlu
-- ============================================

-- ============================================
-- 1. gsc_daily_metrics
-- Günlük URL bazlı GSC metrikleri
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_daily_metrics (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date          DATE NOT NULL,
  page          TEXT NOT NULL,
  clicks        INTEGER NOT NULL DEFAULT 0,
  impressions   INTEGER NOT NULL DEFAULT 0,
  ctr           DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  position      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_window TEXT NOT NULL DEFAULT 'D-2',

  -- Idempotent upsert garantisi: aynı gün + URL çiftinde tek kayıt
  CONSTRAINT uq_gsc_daily_date_page UNIQUE (date, page)
);

-- Performans indeksleri
CREATE INDEX IF NOT EXISTS idx_gsc_daily_page ON gsc_daily_metrics (page);
CREATE INDEX IF NOT EXISTS idx_gsc_daily_date ON gsc_daily_metrics (date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_daily_page_date ON gsc_daily_metrics (page, date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_daily_clicks ON gsc_daily_metrics (clicks DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_daily_impressions ON gsc_daily_metrics (impressions DESC);

-- ============================================
-- 2. content_change_log
-- İçerik/teknik değişiklik günlüğü
-- ============================================
CREATE TABLE IF NOT EXISTS content_change_log (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page          TEXT NOT NULL,
  change_type   TEXT NOT NULL CHECK (
    change_type IN ('title', 'meta', 'content', 'internal_link', 'schema', 'tech', 'other')
  ),
  description   TEXT,
  actor         TEXT NOT NULL DEFAULT 'system',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_log_page ON content_change_log (page);
CREATE INDEX IF NOT EXISTS idx_change_log_changed_at ON content_change_log (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_log_page_date ON content_change_log (page, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_log_type ON content_change_log (change_type);

-- ============================================
-- 3. weekly_page_summary
-- Haftalık aggregate tablo (materialized view yerine
-- explicit tablo — Supabase cron uyumlu)
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_page_summary (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  week_start            DATE NOT NULL,
  week_end              DATE NOT NULL,
  page                  TEXT NOT NULL,

  -- Current week aggregates
  total_clicks          INTEGER NOT NULL DEFAULT 0,
  total_impressions     INTEGER NOT NULL DEFAULT 0,
  avg_ctr               DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  avg_position          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  data_days             INTEGER NOT NULL DEFAULT 0,  -- kaç günlük veri var

  -- Previous week aggregates (WoW için)
  prev_clicks           INTEGER,
  prev_impressions      INTEGER,
  prev_avg_ctr          DOUBLE PRECISION,
  prev_avg_position     DOUBLE PRECISION,

  -- WoW deltas
  click_change_pct      DOUBLE PRECISION,
  impression_change_pct DOUBLE PRECISION,
  ctr_delta             DOUBLE PRECISION,
  position_delta        DOUBLE PRECISION,  -- negatif = iyileşme

  -- Meta
  computed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_weekly_summary UNIQUE (week_start, page)
);

CREATE INDEX IF NOT EXISTS idx_weekly_page ON weekly_page_summary (page);
CREATE INDEX IF NOT EXISTS idx_weekly_week ON weekly_page_summary (week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_page_week ON weekly_page_summary (page, week_start DESC);

-- ============================================
-- 4. gsc_fetch_log
-- Veri çekme işlemlerinin log'u (debugging + idempotency)
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_fetch_log (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fetch_date    DATE NOT NULL,
  target_date   DATE NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('started', 'success', 'failed', 'partial')),
  rows_fetched  INTEGER DEFAULT 0,
  rows_upserted INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms   INTEGER,
  source_window TEXT NOT NULL DEFAULT 'D-2',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fetch_log_target ON gsc_fetch_log (target_date DESC);
CREATE INDEX IF NOT EXISTS idx_fetch_log_status ON gsc_fetch_log (status);

-- ============================================
-- 5. RLS Policies (Supabase)
-- Service role key ile erişim — RLS bypass
-- Admin key ile API erişimi korunur
-- ============================================

-- RLS'yi etkinleştir ama service_role bypass etsin
ALTER TABLE gsc_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_page_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_fetch_log ENABLE ROW LEVEL SECURITY;

-- Service role için policy (tüm CRUD)
CREATE POLICY "Service role full access" ON gsc_daily_metrics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON content_change_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON weekly_page_summary
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON gsc_fetch_log
  FOR ALL USING (true) WITH CHECK (true);
