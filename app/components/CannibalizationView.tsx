import React from 'react';
import useSWR from 'swr';
import { Layers, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export function CannibalizationView() {
    const { data: response, error, isLoading } = useSWR('/api/seo/gsc/cannibalization', fetcher);

    if (error) return (
        <div className="panel" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertTriangle size={32} style={{ color: 'var(--red)', marginBottom: '16px' }} />
            <div style={{ fontWeight: 600 }}>Veri Yüklenemedi</div>
            <div style={{ color: 'var(--text-muted)', marginTop: '8px' }}>GSC API bağlantısı veya veri işleme sırasında bir hata oluştu.</div>
        </div>
    );

    if (isLoading) return (
        <div className="panel" style={{ padding: '80px', textAlign: 'center' }}>
            <Loader2 size={32} className="icon-spin" style={{ color: 'var(--accent)', marginBottom: '16px' }} />
            <div style={{ fontWeight: 500 }}>Cannibalizm Tespiti Yapılıyor...</div>
            <div style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Son 30 günlük tüm URL verileri analiz ediliyor.</div>
        </div>
    );

    const cannibalData = response?.data || [];

    return (
        <div className="panel">
            <div className="panel__header">
                <div>
                    <h3 className="panel__title"><Layers size={16} className="panel__title-icon" /> Keyword Cannibalizm Raporu</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Son 30 gün · Tüm site URL'leri ({response?.startDate} - {response?.endDate})
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span className="sidebar__link-badge" style={{ padding: '4px 10px', fontSize: '12px' }}>{cannibalData.length} Çakışma</span>
                </div>
            </div>

            <div className="panel__body">
                {cannibalData.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <CheckCircle2 size={32} style={{ color: 'var(--green)', marginBottom: '16px', opacity: 0.5 }} />
                        <div>Harika! Belirgin bir cannibalizm çakışması tespit edilmedi.</div>
                    </div>
                ) : (
                    <div className="cannibal-list">
                        {cannibalData.map((item: any, i: number) => (
                            <div key={i} className="cannibal-item" style={{ marginBottom: '24px', padding: '16px', border: '1px solid var(--glass-border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-light)', fontWeight: 600 }}>Sorgu (Query)</div>
                                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.query}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Toplam Tıklama / Gösterim</div>
                                        <div style={{ fontWeight: 600 }}>{item.totalClicks.toLocaleString()} / {item.totalImpressions.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="table-wrap" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Rakip Sayfalar</th>
                                                <th className="table__num">Tıklama</th>
                                                <th className="table__num">Gösterim</th>
                                                <th className="table__num">CTR</th>
                                                <th className="table__num">Pozisyon</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {item.pages.map((p: any, pi: number) => (
                                                <tr key={pi}>
                                                    <td>
                                                        <a href={p.page} target="_blank" rel="noopener noreferrer" className="table__url" style={{ color: 'var(--accent-light)' }}>
                                                            {p.page.replace('https://uygunbakim.com', '') || '/'}
                                                        </a>
                                                    </td>
                                                    <td className="table__num">{p.clicks.toLocaleString()}</td>
                                                    <td className="table__num">{p.impressions.toLocaleString()}</td>
                                                    <td className="table__num">{p.ctr.toFixed(2)}%</td>
                                                    <td className="table__num">
                                                        <span style={{
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            background: p.position <= 10 ? 'var(--green-bg)' : 'transparent',
                                                            color: p.position <= 10 ? 'var(--green)' : 'inherit',
                                                            fontWeight: p.position <= 10 ? 600 : 400
                                                        }}>
                                                            {p.position.toFixed(1)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertTriangle size={14} style={{ color: 'var(--yellow)' }} />
                                    <span>Bu sorguda <strong>{item.pageCount} farklı sayfa</strong> birbiriyle rekabet ediyor. En çok tıklanan sayfayı optimize edip diğerlerini canonical veya redirect ile birleştirmeyi düşünün.</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
