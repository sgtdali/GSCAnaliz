import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getSupabase } from '../../lib/db/connection';

async function setup() {
    console.log('--- Setting up Brands Table ---');
    const supabase = getSupabase();

    const sql = `
CREATE TABLE IF NOT EXISTS brands (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  is_original   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_name ON brands (name);

-- Seed some common perfume brands if empty
INSERT INTO brands (name, is_original)
SELECT name, is_original FROM (
  VALUES 
    ('Tom Ford', true),
    ('Chanel', true),
    ('Dior', true),
    ('Creed', true),
    ('Byredo', true),
    ('Xerjoff', true),
    ('Parfums de Marly', true),
    ('Killian', true),
    ('Maison Francis Kurkdjian', true),
    ('Tiziana Terenzi', true),
    ('Uygun Bakım', false),
    ('Uygunbakim', false)
) AS v(name, is_original)
WHERE NOT EXISTS (SELECT 1 FROM brands LIMIT 1);
    `;

    try {
        const { error } = await supabase.rpc('execute_sql', { query_text: sql });
        if (error) {
            console.error('Failed via RPC:', error.message);
        } else {
            console.log('Success: Brands table created and seeded!');
        }
    } catch (err: any) {
        console.error('Error:', err.message);
    }
}

setup();
