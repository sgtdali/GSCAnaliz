/**
 * Database Connection Module
 * 
 * Supabase client oluşturur.
 * Service role key kullanır (RLS bypass).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Singleton Supabase client döndürür.
 * Service role key ile oluşturulur (RLS bypass).
 */
export function getSupabase(): SupabaseClient {
    if (supabaseInstance) return supabaseInstance;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
        );
    }

    supabaseInstance = createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        db: {
            schema: 'public',
        },
    });

    return supabaseInstance;
}

/**
 * Raw SQL çalıştırır (Supabase rpc ile).
 * Karmaşık sorgular için kullanılır.
 */
export async function executeRawSQL<T = unknown>(
    query: string,
    params: Record<string, unknown> = {}
): Promise<T[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc('execute_sql', {
        query_text: query,
        query_params: params,
    });

    if (error) {
        throw new Error(`SQL execution failed: ${error.message}`);
    }

    return (data as T[]) || [];
}
