import React from 'react';
import useSWR from 'swr';
import { Sparkles, AlertTriangle, Loader2, ArrowUpRight, Target, Eye, Percent, MousePointer2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export function ImprovementOpportunitiesView({ onAnalyze }: { onAnalyze: (url: string) => void }) {
    const { data: results, error, isLoading } = useSWR('/api/seo/gsc/improvement-opportunities', fetcher);

    if (error) return (
        <div className="panel" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertTriangle size={32} style={{ color: 'var(--red)', marginBottom: '16px' }} />
            <div style={{ fontWeight: 600 }}>Fırsatlar yüklenirken hata oluştu</div>
        </div>
    );

    if (isLoading) return (
        <div className="panel" style={{ padding: '80px', textAlign: 'center' }}>
            <Loader2 size={32} className="icon-spin" style={{ color: 'var(--accent)', marginBottom: '16px' }} />
            <div>Büyük Fırsatlar Hesaplanıyor...</div>
        </div>
    );

    const data = results?.opportunities || [];

    return (
        <div className="panel">
            <div className="panel__header">
                <div>
                    <h3 className="panel__title"><Sparkles size={16} className="panel__title-icon" style={{ color: 'var(--yellow)' }} /> İyileştirme Fırsatları</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Pozisyonu 5-20 arası olup, yüksek gösterimli ama düşük CTR'lı (vuruş yapılabilecek) sayfalar.
                    </div>
                </div>
            </div>

            <div className="panel__body">
                {data.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Şu kriterlere uygun sayfa bulunamadı: Pos(5-20), Imp(&gt;200), CTR(&lt;%8).
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Sayfa URL</th>
                                    <th className="table__num">Pozisyon</th>
                                    <th className="table__num">Impression</th>
                                    <th className="table__num">CTR</th>
                                    <th>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="table__url" title={item.page}>
                                                    {item.page.replace('https://uygunbakim.com', '') || '/'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="table__num">
                                            <span style={{
                                                padding: '2px 8px',
                                                background: item.position < 10 ? 'var(--green-bg)' : 'var(--yellow-bg)',
                                                color: item.position < 10 ? 'var(--green)' : 'var(--yellow)',
                                                borderRadius: '6px',
                                                fontWeight: 700
                                            }}>
                                                {item.position.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="table__num" style={{ fontWeight: 600 }}>{item.impressions.toLocaleString()}</td>
                                        <td className="table__num" style={{ color: 'var(--red)' }}>{item.ctr.toFixed(2)}%</td>
                                        <td>
                                            <button
                                                className="main__header-btn"
                                                style={{ padding: '4px 10px', fontSize: '11px', height: 'auto' }}
                                                onClick={() => onAnalyze(item.page)}
                                            >
                                                <ArrowUpRight size={12} /> Audit Yap
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--glass-border)', fontSize: '13px' }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <Target size={14} /> <span style={{ fontWeight: 700 }}>5 - 20</span> Pozisyon
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <Eye size={14} /> <span style={{ fontWeight: 700 }}>200+</span> Gösterim
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <Percent size={14} /> <span style={{ fontWeight: 700 }}>&lt; 8%</span> CTR
                    </div>
                </div>
            </div>
        </div>
    );
}
