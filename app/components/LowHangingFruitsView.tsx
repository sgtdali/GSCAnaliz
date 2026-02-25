import React from 'react';
import useSWR from 'swr';
import { TrendingUp, AlertTriangle, Loader2, MousePointer2, Eye, Percent, ArrowUpRight } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export function LowHangingFruitsView({ onAnalyze }: { onAnalyze: (url: string) => void }) {
    const { data: results, error, isLoading } = useSWR('/api/seo/gsc/low-hanging-fruits', fetcher);

    if (error) return (
        <div className="panel" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertTriangle size={32} style={{ color: 'var(--red)', marginBottom: '16px' }} />
            <div style={{ fontWeight: 600 }}>Veri Yüklenemedi</div>
            <div style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Google Search Console verisi çekilirken bir hata oluştu.</div>
        </div>
    );

    if (isLoading) return (
        <div className="panel" style={{ padding: '80px', textAlign: 'center' }}>
            <Loader2 size={32} className="icon-spin" style={{ color: 'var(--accent)', marginBottom: '16px' }} />
            <div style={{ fontWeight: 500 }}>Fırsatlar Hesaplanıyor...</div>
            <div style={{ color: 'var(--text-muted)', marginTop: '8px' }}>2. sayfada kalan yüksek potansiyelli kelimeler ayıklanıyor.</div>
        </div>
    );

    const data = results?.data || [];

    return (
        <div className="panel">
            <div className="panel__header">
                <div>
                    <h3 className="panel__title"><TrendingUp size={16} className="panel__title-icon" /> Düşük Sarkan Meyveler (Low-Hanging Fruits)</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Google 11-20. sıra aralığında olup trafik potansiyeli en yüksek sorgular.
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span className="sidebar__link-badge" style={{ padding: '4px 10px', fontSize: '12px' }}>{data.length} Potansiyel Fırsat</span>
                </div>
            </div>

            <div className="panel__body">
                {data.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <TrendingUp size={32} style={{ color: 'var(--green)', marginBottom: '16px', opacity: 0.5 }} />
                        <div>Şu an için 2. sayfada bekleyen kritik bir fırsat bulunamadı.</div>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Sorgu (Query)</th>
                                    <th>Sayfa</th>
                                    <th className="table__num">Pozisyon</th>
                                    <th className="table__num">Impression</th>
                                    <th className="table__num">Click</th>
                                    <th className="table__num">CTR</th>
                                    <th>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.query}</td>
                                        <td>
                                            <div className="table__url" title={item.page}>
                                                {item.page.replace('https://uygunbakim.com', '') || '/'}
                                            </div>
                                        </td>
                                        <td className="table__num">
                                            <span style={{
                                                padding: '2px 8px',
                                                background: 'var(--yellow-bg)',
                                                color: 'var(--yellow)',
                                                borderRadius: '6px',
                                                fontWeight: 700
                                            }}>
                                                {item.position.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="table__num">{item.impressions.toLocaleString()}</td>
                                        <td className="table__num">{item.clicks.toLocaleString()}</td>
                                        <td className="table__num">{item.ctr.toFixed(2)}%</td>
                                        <td>
                                            <button
                                                className="main__header-btn"
                                                style={{ padding: '4px 8px', fontSize: '11px', height: 'auto' }}
                                                onClick={() => onAnalyze(item.page)}
                                            >
                                                <ArrowUpRight size={12} /> Analiz Et
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
                <div style={{ fontWeight: 600, color: 'var(--accent-light)', marginBottom: '4px' }}>💡 Strateji Önerisi:</div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Bu sorgular Google'ın 2. sayfasında yer alıyor ve yüksek gösterim alıyorlar.
                    <strong> Title'a anahtar kelimeyi eklemek</strong>, içeriğe 1-2 paragraf detaylı bilgi katmak veya
                    <strong> site içi güçlü sayfalardan bu linke link vermek</strong> bu sayfaları ilk sayfaya taşıyabilir.
                </p>
            </div>
        </div>
    );
}
