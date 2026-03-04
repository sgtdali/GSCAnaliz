import { getSupabase } from './connection';

export interface Brand {
    id: number;
    name: string;
    is_original: boolean;
}

export async function getAllBrands(): Promise<Brand[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('brands')
        .select('*');

    if (error) {
        console.error('[DB] Error fetching brands:', error.message);
        return [];
    }

    return data || [];
}
