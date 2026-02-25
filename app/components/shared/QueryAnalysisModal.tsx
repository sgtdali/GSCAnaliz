import React from 'react';
import useSWR from 'swr';
import { TrendingUp, X, Loader2, AlertTriangle, Search } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export function QueryAnalysisModal({ url, onClose }: { url: string; onClose: () => void }) {
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
