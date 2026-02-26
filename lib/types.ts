export type Section = 'dashboard' | 'daily' | 'weekly' | 'actions' | 'cannibalization' | 'indexing' | 'fetch' | 'settings' | 'low-hanging-fruits' | 'crawler' | 'blog-versioning';

export interface DailyMetric {
    date: string;
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    fetched_at: string;
}

export interface WeeklySummary {
    week_start: string;
    week_end: string;
    page: string;
    total_clicks: number;
    total_impressions: number;
    avg_ctr: number;
    avg_position: number;
    data_days: number;
    prev_clicks: number | null;
    prev_impressions: number | null;
    click_change_pct: number | null;
    impression_change_pct: number | null;
    ctr_delta: number | null;
    position_delta: number | null;
}
