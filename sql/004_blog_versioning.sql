-- ============================================
-- Blog Change Management Module
-- Git-like structure for blog page versions
-- ============================================

-- 1. blog_pages
-- Tracks unique blog pages and their last scan status
CREATE TABLE IF NOT EXISTS blog_pages (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  url           TEXT NOT NULL UNIQUE,
  last_scanned  TIMESTAMPTZ,
  last_version  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for URL lookups
CREATE INDEX IF NOT EXISTS idx_blog_pages_url ON blog_pages (url);

-- 2. blog_page_snapshots
-- Stores the HTML content versions
CREATE TABLE IF NOT EXISTS blog_page_snapshots (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page_id       BIGINT NOT NULL REFERENCES blog_pages(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,
  html_content  TEXT NOT NULL,
  checksum      TEXT NOT NULL, -- To detect changes quickly
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each page version must be unique
  CONSTRAINT uq_page_version UNIQUE (page_id, version)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_snapshots_page_id_version ON blog_page_snapshots (page_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON blog_page_snapshots (created_at DESC);

-- 3. RLS Policies
ALTER TABLE blog_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_page_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON blog_pages
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON blog_page_snapshots
  FOR ALL USING (true) WITH CHECK (true);
