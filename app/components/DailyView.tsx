import React from 'react';
import useSWR from 'swr';
import { BarChart2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export function DailyView() {
    const { data: rows, error } = useSWR('/api/seo/gsc/daily', fetcher);

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
