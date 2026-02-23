'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
    Home, BarChart2, Calendar, Target, Microscope, FileText, RefreshCw, Settings,
    ArrowUpRight, ArrowDownRight, Eye, MousePointer2, Percent, Hash, AlertTriangle,
    ChevronRight, Info, CheckCircle2, TrendingUp, Search, X, Loader2
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

type Section = 'dashboard' | 'daily' | 'weekly' | 'actions' | 'impact' | 'changelog' | 'fetch' | 'settings';

export default function Dashboard() {
    const [active, setActive] = useState<Section>('dashboard');
    const [analysisUrl, setAnalysisUrl] = useState<string | null>(null);

    // API Data Fetching
    const { data: weeklyData, error: weeklyError } = useSWR('/api/seo/gsc/weekly', fetcher);
    const { data: actionsData, error: actionsError } = useSWR('/api/seo/gsc/actions', fetcher);
    const { data: changesData } = useSWR('/api/seo/gsc/changes', fetcher);

    // Derived Stats for Dashboard
    const stats = useMemo(() => {
        if (!weeklyData || weeklyData.length === 0) return null;

        // Use the latest week's total stats
        const latestWeek = weeklyData[0]?.week_start;
        const currentWeekPages = weeklyData.filter((w: any) => w.week_start === latestWeek);

        const totals = currentWeekPages.reduce((acc: any, curr: any) => ({
            clicks: acc.clicks + curr.total_clicks,
            impressions: acc.impressions + curr.total_impressions,
            prevClicks: acc.prevClicks + (curr.prev_clicks || 0),
            prevImpressions: acc.prevImpressions + (curr.prev_impressions || 0),
            posSum: acc.posSum + curr.avg_position,
            count: acc.count + 1
        }), { clicks: 0, impressions: 0, prevClicks: 0, prevImpressions: 0, posSum: 0, count: 0 });

        const clickChange = totals.prevClicks > 0
            ? ((totals.clicks - totals.prevClicks) / totals.prevClicks) * 100
            : 0;

        const impChange = totals.prevImpressions > 0
            ? ((totals.impressions - totals.prevImpressions) / totals.prevImpressions) * 100
            : 0;

        return {
            clicks: totals.clicks,
            impressions: totals.impressions,
            ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
            avgPos: totals.posSum / totals.count,
            clickChange,
            impChange
        };
    }, [weeklyData]);

    const NAV = [
        { id: 'dashboard' as Section, icon: <Home size={18} />, label: 'Dashboard' },
        { id: 'daily' as Section, icon: <BarChart2 size={18} />, label: 'Günlük Metrikler' },
        { id: 'weekly' as Section, icon: <Calendar size={18} />, label: 'Haftalık WoW' },
    ];

    const NAV_ANALYSIS = [
        { id: 'actions' as Section, icon: <Target size={18} />, label: 'Aksiyon Önerileri', badge: actionsData?.length },
        { id: 'impact' as Section, icon: <Microscope size={18} />, label: 'Etki Analizi' },
        { id: 'changelog' as Section, icon: <FileText size={18} />, label: 'Değişiklik Günlüğü' },
    ];

    const NAV_TOOLS = [
        { id: 'fetch' as Section, icon: <RefreshCw size={18} />, label: 'Veri Çekme' },
        { id: 'settings' as Section, icon: <Settings size={18} />, label: 'Ayarlar' },
    ];

    const SECTION_TITLES: Record<Section, string> = {
        dashboard: 'Dashboard',
        daily: 'Günlük Metrikler',
        weekly: 'Haftalık WoW Analiz',
        actions: 'Aksiyon Önerileri',
        impact: 'Etki Analizi',
        changelog: 'Değişiklik Günlüğü',
        fetch: 'Veri Çekme',
        settings: 'Ayarlar',
    };

    return (
        <div className="app">
            <aside className="sidebar">
                <div className="sidebar__brand">
                    <div className="sidebar__logo">✨</div>
                    <div>
                        <div className="sidebar__name">SEO Control Center</div>
                        <div className="sidebar__site">uygunbakim.com</div>
                    </div>
                </div>

                <nav className="sidebar__nav">
                    <div className="sidebar__section-label">Genel</div>
                    {NAV.map(item => (
                        <div
                            key={item.id}
                            className={`sidebar__link ${active === item.id ? 'sidebar__link--active' : ''}`}
                            onClick={() => setActive(item.id)}
                        >
                            <span className="sidebar__link-icon">{item.icon}</span>
                            {item.label}
                        </div>
                    ))}

                    <div className="sidebar__section-label">Analiz</div>
                    {NAV_ANALYSIS.map(item => (
                        <div
                            key={item.id}
                            className={`sidebar__link ${active === item.id ? 'sidebar__link--active' : ''}`}
                            onClick={() => setActive(item.id)}
                        >
                            <span className="sidebar__link-icon">{item.icon}</span>
                            {item.label}
                            {item.badge > 0 && (
                                <span className="sidebar__link-badge">{item.badge}</span>
                            )}
                        </div>
                    ))}

                    <div className="sidebar__section-label">Araçlar</div>
                    {NAV_TOOLS.map(item => (
                        <div
                            key={item.id}
                            className={`sidebar__link ${active === item.id ? 'sidebar__link--active' : ''}`}
                            onClick={() => setActive(item.id)}
                        >
                            <span className="sidebar__link-icon">{item.icon}</span>
                            {item.label}
                        </div>
                    ))}
                </nav>

                <div className="sidebar__footer">
                    <div className="sidebar__status">
                        <span className="sidebar__status-dot" />
                        GSC API Bağlantısı Aktif
                    </div>
                </div>
            </aside>

            <main className="main">
                <header className="main__header">
                    <div className="main__header-left">
                        <div className="main__breadcrumb">
                            GSC Analytics / <span>{SECTION_TITLES[active]}</span>
                        </div>
                    </div>
                    <div className="main__header-right">
                        <button className="main__header-btn"><Calendar size={14} /> Son 30 Gün</button>
                        <button className="main__header-btn" onClick={() => window.location.reload()}><RefreshCw size={14} /> Yenile</button>
                    </div>
                </header>

                <div className="main__content">
                    {active === 'dashboard' && <DashboardView stats={stats} weeklyData={weeklyData} actions={actionsData} onAnalyze={setAnalysisUrl} />}
                    {active === 'daily' && <DailyView />}
                    {active === 'weekly' && <WeeklyView data={weeklyData} />}
                    {active === 'actions' && <ActionsView data={actionsData} onAnalyze={setAnalysisUrl} />}
                    {active === 'impact' && <ImpactView />}
                    {active === 'changelog' && <ChangeLogView data={changesData} />}
                    {active === 'fetch' && <FetchView />}
                    {active === 'settings' && <SettingsView />}
                </div>

                {analysisUrl && (
                    <QueryAnalysisModal url={analysisUrl} onClose={() => setAnalysisUrl(null)} />
                )}
            </main>
        </div>
    );
}

/* ============================================================
   DASHBOARD VIEW
   ============================================================ */
function DashboardView({ stats, weeklyData, actions, onAnalyze }: { stats: any; weeklyData: any; actions: any; onAnalyze: (url: string) => void }) {
    const trendData = useMemo(() => {
        if (!weeklyData || weeklyData.length === 0) return { data: [], labels: [] };

        // Group by week and sum clicks
        const byWeek = weeklyData.reduce((acc: any, curr: any) => {
            acc[curr.week_start] = (acc[curr.week_start] || 0) + curr.total_clicks;
            return acc;
        }, {});

        const sortedWeeks = Object.keys(byWeek).sort();
        const maxClicks = Math.max(...Object.values(byWeek) as number[]);

        return {
            data: sortedWeeks.map(w => ((byWeek[w] / (maxClicks || 1)) * 90) + 10), // normalized for chart height
            labels: sortedWeeks.map(w => w.split('-').slice(1).join('/'))
        };
    }, [weeklyData]);

    return (
        <>
            {/* Stats */}
            <div className="stats-row">
                <StatCard
                    label="Toplam Tıklama"
                    value={stats?.clicks?.toLocaleString() || '0'}
                    change={`${stats?.clickChange >= 0 ? '+' : ''}${stats?.clickChange?.toFixed(1)}%`}
                    up={stats?.clickChange >= 0}
                    icon={<MousePointer2 size={18} />}
                    color="purple"
                />
                <StatCard
                    label="Toplam Gösterim"
                    value={stats?.impressions?.toLocaleString() || '0'}
                    change={`${stats?.impChange >= 0 ? '+' : ''}${stats?.impChange?.toFixed(1)}%`}
                    up={stats?.impChange >= 0}
                    icon={<Eye size={18} />}
                    color="blue"
                />
                <StatCard
                    label="Ortalama CTR"
                    value={`${stats?.ctr?.toFixed(2)}%`}
                    change="" // WoW logic can be added
                    up={true}
                    icon={<Percent size={18} />}
                    color="green"
                />
                <StatCard
                    label="Ortalama Pozisyon"
                    value={stats?.avgPos?.toFixed(1) || '0'}
                    change=""
                    up={false}
                    icon={<Hash size={18} />}
                    color="orange"
                />
            </div>

            {/* Chart + Actions */}
            <div className="grid-3-1">
                <div className="panel">
                    <div className="panel__header">
                        <h3 className="panel__title"><TrendingUp size={16} className="panel__title-icon" /> Haftalık Tıklama Trendi</h3>
                    </div>
                    <div className="panel__body">
                        {weeklyData ? (
                            <BarChart data={trendData.data} labels={trendData.labels} />
                        ) : (
                            <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                Veri yükleniyor...
                            </div>
                        )}
                    </div>
                </div>

                <div className="panel">
                    <div className="panel__header">
                        <h3 className="panel__title"><Target size={16} className="panel__title-icon" /> Aksiyon Önerileri</h3>
                    </div>
                    <div className="panel__body">
                        <div className="action-list">
                            {actions?.slice(0, 4).map((a: any, i: number) => (
                                <ActionItem
                                    key={i}
                                    severity={a.priority_score > 70 ? 'critical' : a.priority_score > 40 ? 'warning' : 'info'}
                                    icon={a.priority_score > 70 ? <AlertTriangle size={14} /> : <Info size={14} />}
                                    title={a.action_recommendation}
                                    desc={a.page.replace('https://uygunbakim.com', '')}
                                    score={a.priority_score}
                                    onClick={() => onAnalyze(a.page)}
                                />
                            ))}
                            {(!actions || actions.length === 0) && (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                    Şu an için öneri yok.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <TopPagesTable data={weeklyData} />
        </>
    );
}

/* ============================================================
   DAILY VIEW
   ============================================================ */
function DailyView() {
    const { data: rows, error } = useSWR('/api/seo/gsc/daily', (url) => fetch(url).then(r => r.json()).then(res => res.data));

    if (error) return <div className="panel__body">Hata oluştu.</div>;
    if (!rows) return <div className="panel__body">Yükleniyor...</div>;

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><BarChart2 size={16} className="panel__title-icon" /> Günlük GSC Metrikleri</h3>
            </div>
            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Tarih</th>
                            <th>Sayfa</th>
                            <th>Click</th>
                            <th>Impression</th>
                            <th>CTR</th>
                            <th>Pozisyon</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r: any, i: number) => (
                            <tr key={i}>
                                <td className="table__num">{r.date}</td>
                                <td><span className="table__url">{r.page.replace('https://uygunbakim.com', '')}</span></td>
                                <td className="table__num">{r.clicks?.toLocaleString()}</td>
                                <td className="table__num">{r.impressions?.toLocaleString()}</td>
                                <td className="table__num">{r.ctr?.toFixed(2)}%</td>
                                <td className="table__num">{r.position?.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ============================================================
   WEEKLY VIEW
   ============================================================ */
function WeeklyView({ data }: { data: any }) {
    if (!data) return <div className="panel__body">Yükleniyor...</div>;

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><Calendar size={16} className="panel__title-icon" /> Haftalık WoW Karşılaştırma</h3>
            </div>
            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Hafta</th>
                            <th>Sayfa</th>
                            <th>Click</th>
                            <th>Click WoW</th>
                            <th>Impression</th>
                            <th>Imp WoW</th>
                            <th>CTR</th>
                            <th>Pozisyon</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((w: any, i: number) => (
                            <tr key={i}>
                                <td className="table__num">{w.week_start}</td>
                                <td><span className="table__url">{w.page.replace('https://uygunbakim.com', '')}</span></td>
                                <td className="table__num">{w.total_clicks?.toLocaleString()}</td>
                                <td><span className={`table__change ${(w.click_change_pct || 0) >= 0 ? 'table__change--up' : 'table__change--down'}`}>
                                    {(w.click_change_pct || 0) >= 0 ? '+' : ''}{w.click_change_pct?.toFixed(1)}%
                                </span></td>
                                <td className="table__num">{w.total_impressions?.toLocaleString()}</td>
                                <td><span className={`table__change ${(w.impression_change_pct || 0) >= 0 ? 'table__change--up' : 'table__change--down'}`}>
                                    {(w.impression_change_pct || 0) >= 0 ? '+' : ''}{w.impression_change_pct?.toFixed(1)}%
                                </span></td>
                                <td className="table__num">{w.avg_ctr?.toFixed(2)}%</td>
                                <td className="table__num">{w.avg_position?.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ============================================================
   ACTIONS VIEW
   ============================================================ */
function ActionsView({ data, onAnalyze }: { data: any; onAnalyze: (url: string) => void }) {
    if (!data) return <div className="panel__body">Yükleniyor...</div>;

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><Target size={16} className="panel__title-icon" /> Tüm Aksiyon Önerileri</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{data.length} aksiyon · öncelik sıralı</span>
            </div>
            <div className="panel__body">
                <div className="action-list">
                    {data.map((a: any, i: number) => (
                        <ActionItem
                            key={i}
                            severity={a.priority_score > 70 ? 'critical' : a.priority_score > 40 ? 'warning' : 'info'}
                            icon={a.priority_score > 70 ? <AlertTriangle size={14} /> : <Info size={14} />}
                            title={a.action_recommendation}
                            desc={`${a.page.replace('https://uygunbakim.com', '')} — ${a.action_detail?.description || ''}`}
                            score={a.priority_score}
                            onClick={() => onAnalyze(a.page)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   IMPACT VIEW
   ============================================================ */
function ImpactView() {
    const impacts = [
        { page: '/blog/en-iyi-bakim-urunleri', change: 'Title değişikliği', date: '2026-02-01', baselineClicks: 180, postClicks: 245, uplift: '+36.1%', confidence: 'Yüksek', status: 'positive' as const },
        { page: '/blog/sac-bakim-ipuclari', change: 'Schema markup eklendi', date: '2026-02-05', baselineClicks: 420, postClicks: 512, uplift: '+21.9%', confidence: 'Orta', status: 'positive' as const },
        { page: '/blog/cilt-bakim-rehberi', change: 'İçerik genişletme', date: '2026-02-10', baselineClicks: 310, postClicks: 0, uplift: 'Bekleniyor', confidence: '9/14 gün', status: 'pending' as const },
        { page: '/blog/dogal-bakim-yontemleri', change: 'Meta description', date: '2026-01-28', baselineClicks: 140, postClicks: 156, uplift: '+11.4%', confidence: 'Düşük', status: 'info' as const },
    ];

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><span className="panel__title-icon">🔬</span> Değişiklik Etki Analizi</h3>
            </div>
            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Sayfa</th>
                            <th>Değişiklik</th>
                            <th>Tarih</th>
                            <th>Baseline Click (14g)</th>
                            <th>Sonrası (14g)</th>
                            <th>Uplift</th>
                            <th>Güven</th>
                        </tr>
                    </thead>
                    <tbody>
                        {impacts.map((imp, i) => (
                            <tr key={i}>
                                <td><span className="table__url">{imp.page}</span></td>
                                <td style={{ color: 'var(--text-secondary)' }}>{imp.change}</td>
                                <td className="table__num">{imp.date}</td>
                                <td className="table__num">{imp.baselineClicks}</td>
                                <td className="table__num">{imp.postClicks || '—'}</td>
                                <td>
                                    <span className={`table__change ${imp.status === 'positive' ? 'table__change--up' : imp.status === 'pending' ? '' : ''}`}
                                        style={imp.status === 'pending' ? { color: 'var(--yellow)', background: 'var(--yellow-bg)' } : imp.status === 'info' ? { color: 'var(--blue)', background: 'var(--blue-bg)' } : {}}>
                                        {imp.uplift}
                                    </span>
                                </td>
                                <td style={{ color: imp.confidence === 'Yüksek' ? 'var(--green)' : imp.confidence === 'Orta' ? 'var(--yellow)' : 'var(--text-muted)', fontWeight: 600, fontSize: '12px' }}>
                                    {imp.confidence}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ============================================================
   CHANGELOG VIEW
   ============================================================ */
function ChangeLogView({ data }: { data: any }) {
    if (!data) return <div className="panel__body">Yükleniyor...</div>;

    const getIcon = (type: string) => {
        switch (type) {
            case 'title': return <TrendingUp size={12} />;
            case 'content': return <FileText size={12} />;
            case 'tech': return <Settings size={12} />;
            default: return <Info size={12} />;
        }
    };

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><FileText size={16} className="panel__title-icon" /> Değişiklik Günlüğü</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{data.length} kayıt</span>
            </div>
            <div className="panel__body">
                <div className="changelog">
                    {data.map((log: any, i: number) => (
                        <div key={i} className="changelog__item">
                            <div className="changelog__dot-line">
                                <div className="changelog__dot" />
                                {i < data.length - 1 && <div className="changelog__line" />}
                            </div>
                            <div className="changelog__content">
                                <span className={`changelog__type changelog__type--${log.change_type}`}>
                                    {getIcon(log.change_type)} {log.change_type.toUpperCase()}
                                </span>
                                <div className="changelog__text">{log.description}</div>
                                <div className="changelog__meta">{log.page.replace('https://uygunbakim.com', '')} · {new Date(log.changed_at).toLocaleDateString()} · {log.actor}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   FETCH VIEW
   ============================================================ */
function FetchView() {
    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><span className="panel__title-icon">🔄</span> Veri Çekme Komutları</h3>
            </div>
            <div className="panel__body">
                <div className="action-list">
                    <div className="action-item">
                        <div className="action-item__severity action-item__severity--info">📥</div>
                        <div className="action-item__content">
                            <div className="action-item__title">Günlük Fetch (D-2)</div>
                            <div className="action-item__desc">npx tsx scripts/gsc/fetch-daily.ts</div>
                        </div>
                    </div>
                    <div className="action-item">
                        <div className="action-item__severity action-item__severity--warning">📦</div>
                        <div className="action-item__content">
                            <div className="action-item__title">Backfill (Son 90 gün)</div>
                            <div className="action-item__desc">npx tsx scripts/gsc/backfill.ts --days=90</div>
                        </div>
                    </div>
                    <div className="action-item">
                        <div className="action-item__severity action-item__severity--positive">📊</div>
                        <div className="action-item__content">
                            <div className="action-item__title">Haftalık Özet Oluştur</div>
                            <div className="action-item__desc">npx tsx scripts/gsc/build-weekly-summary.ts --weeks=12</div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Kullanım
                    </div>
                    <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'var(--accent-light)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {`# Belirli tarih
npx tsx scripts/gsc/fetch-daily.ts --date=2026-02-14

# Tarih aralığı backfill
npx tsx scripts/gsc/backfill.ts --start=2026-01-01 --end=2026-02-15

# Son N hafta özeti
npx tsx scripts/gsc/build-weekly-summary.ts --weeks=8`}
                    </pre>
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   SETTINGS VIEW
   ============================================================ */
function SettingsView() {
    const envVars = [
        { name: 'SUPABASE_URL', desc: 'Supabase proje URL', required: true },
        { name: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Service role key', required: true },
        { name: 'GOOGLE_CLIENT_ID', desc: 'OAuth client ID', required: true },
        { name: 'GOOGLE_CLIENT_SECRET', desc: 'OAuth client secret', required: true },
        { name: 'GOOGLE_REDIRECT_URI', desc: 'OAuth callback URL', required: true },
        { name: 'GOOGLE_REFRESH_TOKEN', desc: 'Kalıcı refresh token', required: true },
        { name: 'GSC_SITE_URL', desc: 'sc-domain:uygunbakim.com', required: true },
        { name: 'API_SECRET_KEY', desc: 'API authentication key', required: true },
        { name: 'GSC_URL_PREFIX', desc: 'URL filtre (varsayılan: /blog/)', required: false },
    ];

    return (
        <>
            <div className="panel" style={{ marginBottom: '16px' }}>
                <div className="panel__header">
                    <h3 className="panel__title"><span className="panel__title-icon">🔑</span> Ortam Değişkenleri</h3>
                </div>
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Değişken</th>
                                <th>Açıklama</th>
                                <th>Zorunlu</th>
                            </tr>
                        </thead>
                        <tbody>
                            {envVars.map((v, i) => (
                                <tr key={i}>
                                    <td><span className="table__url">{v.name}</span></td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{v.desc}</td>
                                    <td>{v.required ? '✅' : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="panel">
                <div className="panel__header">
                    <h3 className="panel__title"><span className="panel__title-icon">⚡</span> API Endpoint&apos;leri</h3>
                </div>
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Method</th>
                                <th>Endpoint</th>
                                <th>Açıklama</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { m: 'GET', p: '/api/seo/gsc/daily', d: 'URL bazlı günlük metrikler' },
                                { m: 'GET', p: '/api/seo/gsc/weekly', d: 'Haftalık WoW analiz' },
                                { m: 'GET', p: '/api/seo/gsc/impact', d: 'Değişiklik etki analizi' },
                                { m: 'GET', p: '/api/seo/gsc/actions', d: 'Aksiyon önerileri' },
                                { m: 'GET', p: '/api/seo/gsc/changes', d: 'Değişiklik logları' },
                                { m: 'POST', p: '/api/seo/gsc/changes', d: 'Değişiklik kaydı oluştur' },
                            ].map((e, i) => (
                                <tr key={i}>
                                    <td><span className={`table__change ${e.m === 'GET' ? 'table__change--up' : ''}`}
                                        style={e.m === 'POST' ? { color: 'var(--blue)', background: 'var(--blue-bg)' } : {}}>{e.m}</span></td>
                                    <td><span className="table__url">{e.p}</span></td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{e.d}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

/* ============================================================
   SHARED COMPONENTS
   ============================================================ */

function StatCard({ label, value, change, up, icon, color }: {
    label: string; value: string; change: string; up: boolean; icon: React.ReactNode; color: string;
}) {
    return (
        <div className="stat-card">
            <div className="stat-card__top">
                <div className="stat-card__label">{label}</div>
                <div className={`stat-card__icon stat-card__icon--${color}`}>{icon}</div>
            </div>
            <div className="stat-card__value">{value}</div>
            <span className={`stat-card__change ${up ? 'stat-card__change--up' : 'stat-card__change--down'}`}>{change}</span>
            <div className="stat-card__sub">vs. önceki hafta</div>
        </div>
    );
}

function ActionItem({ severity, icon, title, desc, score, onClick }: {
    severity: 'critical' | 'warning' | 'info' | 'positive'; icon: React.ReactNode; title: string; desc: string; score: number; onClick?: () => void;
}) {
    return (
        <div className={`action-item ${onClick ? 'action-item--clickable' : ''}`} onClick={onClick}>
            <div className={`action-item__severity action-item__severity--${severity}`}>{icon}</div>
            <div className="action-item__content">
                <div className="action-item__title">{title}</div>
                <div className="action-item__desc">{desc}</div>
            </div>
            <div className="action-item__score">{score}</div>
        </div>
    );
}

function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
    return (
        <>
            <div className="chart-bars">
                {data.map((h, i) => (
                    <div
                        key={i}
                        className={`chart-bar ${i >= data.length - 2 ? 'chart-bar--accent' : i >= data.length - 4 ? 'chart-bar--green' : 'chart-bar--muted'}`}
                        style={{ height: `${h}%` }}
                    >
                        <span className="chart-bar__tooltip">{Math.round(h * 14.3)}</span>
                    </div>
                ))}
            </div>
            <div className="chart-labels">
                {labels.map((l, i) => (
                    <span key={i} className="chart-label">{l}</span>
                ))}
            </div>
        </>
    );
}

function TopPagesTable({ data }: { data: any }) {
    const pages = useMemo(() => {
        if (!data) return [];
        // Use latest records for ranking
        const latestWeek = data[0]?.week_start;
        return data.filter((w: any) => w.week_start === latestWeek)
            .sort((a: any, b: any) => b.total_clicks - a.total_clicks)
            .slice(0, 10);
    }, [data]);

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><Search size={16} className="panel__title-icon" /> En İyi Blog Sayfaları (WoW)</h3>
            </div>
            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr><th>Sayfa</th><th>Click</th><th>WoW</th><th>Impression</th><th>WoW</th><th>CTR</th><th>Pozisyon</th></tr>
                    </thead>
                    <tbody>
                        {pages.map((p: any, i: number) => (
                            <tr key={i}>
                                <td><span className="table__url">{p.page.replace('https://uygunbakim.com', '')}</span></td>
                                <td className="table__num">{p.total_clicks?.toLocaleString()}</td>
                                <td><span className={`table__change ${(p.click_change_pct || 0) >= 0 ? 'table__change--up' : 'table__change--down'}`}>
                                    {(p.click_change_pct || 0) >= 0 ? '+' : ''}{p.click_change_pct?.toFixed(1)}%
                                </span></td>
                                <td className="table__num">{p.total_impressions?.toLocaleString()}</td>
                                <td><span className={`table__change ${(p.impression_change_pct || 0) >= 0 ? 'table__change--up' : 'table__change--down'}`}>
                                    {(p.impression_change_pct || 0) >= 0 ? '+' : ''}{p.impression_change_pct?.toFixed(1)}%
                                </span></td>
                                <td className="table__num">{p.avg_ctr?.toFixed(2)}%</td>
                                <td className="table__num">{p.avg_position?.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function QueryAnalysisModal({ url, onClose }: { url: string; onClose: () => void }) {
    const { data: analysis, error } = useSWR(`/api/seo/gsc/queries?page=${encodeURIComponent(url)}`, (u) => fetch(u).then(r => r.json()).then(res => res.data));

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal__header">
                    <h3 className="modal__title">
                        <TrendingUp size={18} className="panel__title-icon" style={{ color: 'var(--accent-light)' }} />
                        Sorgu Bazlı Kayıp/Kazanç Analizi
                    </h3>
                    <button className="modal__close" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="modal__body">
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', background: 'var(--bg-card)' }}>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>İncelenen Sayfa</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all', fontSize: '14px' }}>{url.replace('https://uygunbakim.com', '')}</div>
                    </div>

                    {!analysis && !error && (
                        <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div className="loading-spinner" style={{ marginBottom: '16px' }}>
                                <Loader2 size={32} className="icon-spin" style={{ color: 'var(--accent)' }} />
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>GSC Verileri Analiz Ediliyor</div>
                            <div style={{ fontSize: '13px', marginTop: '6px' }}>Anahtar kelime değişimleri karşılaştırılıyor...</div>
                        </div>
                    )}

                    {error && (
                        <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                            <AlertTriangle size={32} style={{ color: 'var(--red)', marginBottom: '16px' }} />
                            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Veri Analizi Başarısız</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>GSC API bağlantısında bir sorun oluştu.</div>
                        </div>
                    )}

                    {analysis && analysis.queries.length === 0 && (
                        <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Search size={32} style={{ marginBottom: '16px', opacity: 0.5 }} />
                            <div>Bu sayfa için son 14 günde yeterli anahtar kelime verisi bulunamadı.</div>
                        </div>
                    )}

                    {analysis && analysis.queries.length > 0 && (
                        <div className="table-wrap" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                            <table className="table">
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)' }}>
                                    <tr>
                                        <th>Sorgu (Query)</th>
                                        <th className="table__num">Tıklama</th>
                                        <th className="table__num">Fark</th>
                                        <th className="table__num">Pozisyon</th>
                                        <th>Durum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analysis.queries.map((q: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ maxWidth: '250px' }}>
                                                <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {q.query}
                                                </div>
                                            </td>
                                            <td className="table__num" style={{ fontSize: '11px' }}>
                                                {q.current.clicks} <span style={{ color: 'var(--text-muted)' }}>/ {q.previous?.clicks || 0}</span>
                                            </td>
                                            <td className={`table__num ${q.diff.clicks >= 0 ? 'table__change--up' : 'table__change--down'}`} style={{ fontWeight: 600, fontSize: '13px' }}>
                                                {q.diff.clicks >= 0 ? '+' : ''}{q.diff.clicks}
                                            </td>
                                            <td className="table__num" style={{ fontSize: '11px' }}>
                                                {q.current.position.toFixed(1)}
                                                <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                                                    ({(q.diff.position >= 0 ? '+' : '')}{q.diff.position.toFixed(1)})
                                                </span>
                                            </td>
                                            <td>
                                                {q.diff.clicks < 0 && q.diff.position < -0.5 && (
                                                    <span style={{ fontSize: '10px', padding: '2px 8px', background: 'var(--red-bg)', color: 'var(--red)', borderRadius: '12px', border: '1px solid var(--red-border)', fontWeight: 600 }}>Sıralama Kaybı</span>
                                                )}
                                                {q.diff.clicks < 0 && q.diff.position >= -0.5 && (
                                                    <span style={{ fontSize: '10px', padding: '2px 8px', background: 'var(--yellow-bg)', color: 'var(--yellow)', borderRadius: '12px', border: '1px solid var(--yellow-border)', fontWeight: 600 }}>Trafik Kaybı</span>
                                                )}
                                                {q.diff.clicks > 0 && (
                                                    <span style={{ fontSize: '10px', padding: '2px 8px', background: 'var(--green-bg)', color: 'var(--green)', borderRadius: '12px', border: '1px solid var(--green-border)', fontWeight: 600 }}>Yükseliş ✨</span>
                                                )}
                                                {q.diff.clicks === 0 && (
                                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Değişim yok</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {analysis && (
                    <div style={{ padding: '16px 24px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--glass-border)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <span>Yeni: {analysis.periods.current.start} - {analysis.periods.current.end}</span>
                            <span>Eski: {analysis.periods.previous.start} - {analysis.periods.previous.end}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>* Veriler Search Console API&apos;den canlı alınmaktadır.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
