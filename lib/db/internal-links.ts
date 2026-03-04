/**
 * Internal Links Database Module
 * 
 * Veritabanında internal_links tablosuna CRUD operasyonlarını sağlar.
 */

import { getSupabase } from './connection';

export interface InternalLinkRecord {
    source_page: string;
    target_page: string;
    anchor_text: string | null;
}

/**
 * Belirli bir kaynak sayfa için olan tüm linkleri temizler ve yenilerini ekler.
 * Bu sayede link haritasını taze tutarız (UPSERT mantığı).
 */
export async function replaceInternalLinks(
    sourcePage: string,
    links: InternalLinkRecord[]
): Promise<{ count: number; error: string | null }> {
    const supabase = getSupabase();

    // Önce o sayfa için mevcut kayıtları temizleyelim
    const { error: deleteError } = await supabase
        .from('internal_links')
        .delete()
        .eq('source_page', sourcePage);

    if (deleteError) {
        console.error(`[DB] Delete error for ${sourcePage}:`, deleteError.message);
        return { count: 0, error: deleteError.message };
    }

    if (links.length === 0) {
        return { count: 0, error: null };
    }

    // Yeni linkleri ekleyelim
    // Batch insert yapıyoruz
    const { data, error: insertError } = await supabase
        .from('internal_links')
        .insert(links)
        .select('id');

    if (insertError) {
        console.error(`[DB] Insert error for ${sourcePage}:`, insertError.message);
        return { count: 0, error: insertError.message };
    }

    return { count: data?.length || links.length, error: null };
}

/**
 * Belirli bir hedef URL'ye gelen tüm linkleri (backlink map) döner.
 * "Hedef URL'ye gelen linkleri tersten çok hızlı bulabilmemizi sağlayacak yapı" isteğine karşılık.
 */
export async function getIncomingLinks(targetPage: string) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('internal_links')
        .select('*')
        .eq('target_page', targetPage)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(`[DB] Fetch incoming links error for ${targetPage}:`, error.message);
        return [];
    }

    return data;
}

/**
 * Tablodaki tüm linkleri siler. 
 * Tam tarama başlatılmadan önce verilerin birikmesini önlemek için kullanılır.
 */
export async function truncateInternalLinks(): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabase();

    // Supabase JS client'da 'truncate' yoktur, filtre vermeden delete kullanıyoruz.
    const { error } = await supabase
        .from('internal_links')
        .delete()
        .neq('id', 0); // BIGINT id >= 1 olduğu için hepsini kapsar

    if (error) {
        console.error(`[DB] Truncate error:`, error.message);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
}
