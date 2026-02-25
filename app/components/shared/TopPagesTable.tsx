import React, { useMemo } from 'react';
import { Search } from 'lucide-react';

export function TopPagesTable({ data }: { data: any }) {
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
