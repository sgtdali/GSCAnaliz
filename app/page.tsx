'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
    Home, BarChart2, Calendar, Target, Microscope, FileText, RefreshCw, Settings,
    CheckCircle2, Layers, TrendingUp, Network, Sparkles
} from 'lucide-react';

import { Section } from '@/lib/types';

// View Components
import { DashboardView } from './components/DashboardView';
import { DailyView } from './components/DailyView';
import { WeeklyView } from './components/WeeklyView';
import { ActionsView } from './components/ActionsView';
import { CannibalizationView } from './components/CannibalizationView';
import { IndexingView } from './components/IndexingView';
import { FetchView } from './components/FetchView';
import { SettingsView } from './components/SettingsView';
import { LowHangingFruitsView } from './components/LowHangingFruitsView'; // SEO Analysis
import { CrawlerView } from './components/CrawlerView'; // Link Crawler
import { BlogVersionerView } from './components/BlogVersionerView'; // Blog Change Management
import { ImprovementOpportunitiesView } from './components/ImprovementOpportunitiesView';

// Shared Components
import { QueryAnalysisModal } from './components/shared/QueryAnalysisModal';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export default function Dashboard() {
    const [active, setActive] = useState<Section>('dashboard');
    const [analysisData, setAnalysisData] = useState<{ url: string; query?: string } | null>(null);

    // API Data Fetching
    const { data: weeklyData } = useSWR('/api/seo/gsc/weekly', fetcher);
    const { data: actionsData } = useSWR('/api/seo/gsc/actions', fetcher);

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
        { id: 'cannibalization' as Section, icon: <Layers size={18} />, label: 'Keyword Cannibalizm' },
        { id: 'low-hanging-fruits' as Section, icon: <TrendingUp size={18} />, label: 'Hızlı Kazanımlar (Fırsat)' },
        { id: 'improvement-opportunities' as Section, icon: <Sparkles size={18} style={{ color: 'var(--yellow)' }} />, label: 'İyileştirme Fırsatları' },
        { id: 'indexing' as Section, icon: <CheckCircle2 size={18} />, label: 'Index Durumu' },
        { id: 'crawler' as Section, icon: <Network size={18} />, label: 'Link Crawler (Beta)' },
        { id: 'blog-versioning' as Section, icon: <Layers size={18} />, label: 'Blog Değişiklik Kontrolü' },
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
        cannibalization: 'Keyword Cannibalizm Tespiti',
        'low-hanging-fruits': 'Hızlı Kazanımlar (Low-Hanging Fruits)',
        indexing: 'Index Durumu Analizi (/blog)',
        crawler: 'İç Link Crawler ve Haritalama',
        'blog-versioning': 'Blog Değişiklik Yönetimi (Git-like)',
        'improvement-opportunities': 'İyileştirme Fırsatları (Deep Audit)',
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
                    {active === 'dashboard' && <DashboardView stats={stats} weeklyData={weeklyData} actions={actionsData} onAnalyze={(url: string) => setAnalysisData({ url })} />}
                    {active === 'daily' && <DailyView />}
                    {active === 'weekly' && <WeeklyView data={weeklyData} />}
                    {active === 'actions' && <ActionsView data={actionsData} onAnalyze={(url: string) => setAnalysisData({ url })} />}
                    {active === 'cannibalization' && <CannibalizationView />}
                    {active === 'low-hanging-fruits' && <LowHangingFruitsView onAnalyze={(url: string, query: string) => setAnalysisData({ url, query })} />}
                    {active === 'improvement-opportunities' && <ImprovementOpportunitiesView onAnalyze={(url: string) => setAnalysisData({ url })} />}
                    {active === 'indexing' && <IndexingView />}
                    {active === 'crawler' && <CrawlerView />}
                    {active === 'blog-versioning' && <BlogVersionerView />}
                    {active === 'fetch' && <FetchView />}
                    {active === 'settings' && <SettingsView />}
                </div>

                {analysisData && (
                    <QueryAnalysisModal
                        url={analysisData.url}
                        query={analysisData.query}
                        onClose={() => setAnalysisData(null)}
                    />
                )}
            </main>
        </div>
    );
}
