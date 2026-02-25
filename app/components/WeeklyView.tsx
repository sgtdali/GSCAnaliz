import React from 'react';
import { Calendar } from 'lucide-react';

export function WeeklyView({ data }: { data: any }) {
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
