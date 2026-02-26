import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getSupabase } from '../../lib/db/connection';

async function setup() {
    console.log('--- Setting up Internal Links Table ---');
    const supabase = getSupabase();

    const sql = `
CREATE TABLE IF NOT EXISTS internal_links (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_page   TEXT NOT NULL,
  target_page   TEXT NOT NULL,
  anchor_text   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_internal_links_target ON internal_links (target_page);
CREATE INDEX IF NOT EXISTS idx_internal_links_source ON internal_links (source_page);

ALTER TABLE internal_links ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'internal_links' 
        AND policyname = 'Service role full access'
    ) THEN
        CREATE POLICY "Service role full access" ON internal_links
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
    `;

    try {
        const { error } = await supabase.rpc('execute_sql', { query_text: sql });
        if (error) {
            console.error('Failed via RPC:', error.message);
            // If RPC doesn't work, we might need another way or let user run it.
        } else {
            console.log('Success: Table and indices created!');
        }
    } catch (err: any) {
        console.error('Error:', err.message);
    }
}

setup();
