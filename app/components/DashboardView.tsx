import React, { useMemo } from 'react';
import { MousePointer2, Eye, Percent, Hash, TrendingUp, Target, AlertTriangle, Info } from 'lucide-react';
import { StatCard } from './shared/StatCard';
import { BarChart } from './shared/BarChart';
import { ActionItem } from './shared/ActionItem';
import { TopPagesTable } from './shared/TopPagesTable';

export function DashboardView({ stats, weeklyData, actions, onAnalyze }: { stats: any; weeklyData: any; actions: any; onAnalyze: (url: string) => void }) {
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
