import React, { useState } from 'react';
import useSWR from 'swr';
import { Layers, AlertTriangle, Loader2, CheckCircle2, Search, Link as LinkIcon, Edit, ChevronRight, X } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export function CannibalizationView() {
    const { data: response, error, isLoading } = useSWR('/api/seo/gsc/cannibalization', fetcher);
    const [analyzing, setAnalyzing] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const handleAnalyze = async (item: any) => {
        setAnalyzing(item.query);
        try {
            const res = await fetch('/api/seo/analyze-urls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    urls: item.pages.map((p: any) => p.page),
                    query: item.query
                })
            });
            const data = await res.json();
            if (data.success) {
                setAnalysisResult(data.data);
            }
        } catch (err) {
            console.error('Analysis failed', err);
        } finally {
            setAnalyzing(null);
        }
    };

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
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            Sorgu (Query)
                                            <span style={{
                                                padding: '1px 6px', borderRadius: '4px', fontSize: '10px',
                                                background: item.riskLevel === 'HIGH' ? 'var(--red-bg)' : (item.riskLevel === 'MEDIUM' ? 'var(--yellow-bg)' : 'var(--green-bg)'),
                                                color: item.riskLevel === 'HIGH' ? 'var(--red)' : (item.riskLevel === 'MEDIUM' ? 'var(--yellow)' : 'var(--green)'),
                                                border: '1px solid currentColor'
                                            }}>
                                                RİSK: {item.riskLevel} ({item.riskScore})
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                                            {item.query}
                                            <button
                                                className={`btn btn--sm ${analyzing === item.query ? 'btn--loading' : ''}`}
                                                style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--accent)', color: 'var(--accent)', background: 'transparent' }}
                                                onClick={() => handleAnalyze(item)}
                                                disabled={!!analyzing}
                                            >
                                                {analyzing === item.query ? <Loader2 size={12} className="icon-spin" /> : <Search size={12} style={{ marginRight: '4px' }} />}
                                                Detaylı Analiz Et
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                            <span>Dominance: <strong>{(item.metrics.dominance * 100).toFixed(0)}%</strong></span>
                                            <span>Gap: <strong>{item.metrics.posGap.toFixed(1)}</strong></span>
                                            <span>Share: <strong>{(item.metrics.impRatio * 100).toFixed(0)}%</strong></span>
                                            {item.actualUrlCount > item.pageCount && <span>(Index noise filtrelendi: {item.actualUrlCount - item.pageCount} URL)</span>}
                                        </div>
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

            {/* Analysis Result Modal */}
            {analysisResult && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(8px)', padding: '20px'
                }}>
                    <div className="panel" style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                        <div className="panel__header">
                            <div>
                                <h3 className="panel__title">
                                    <Search size={16} className="panel__title-icon" />
                                    Derinlemesine Analiz: "{analysisResult.query}"
                                </h3>
                            </div>
                            <button className="btn btn--icon" onClick={() => setAnalysisResult(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="panel__body">
                            <div className="analysis-actions" style={{ marginBottom: '32px' }}>
                                <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                                    <Edit size={16} /> Yapılması Gereken Spesifik İşlemler
                                </h4>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {analysisResult.specificActions.length > 0 ? (
                                        analysisResult.specificActions.map((action: string, idx: number) => (
                                            <div key={idx} style={{
                                                padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
                                                borderLeft: '4px solid var(--accent)', display: 'flex', alignItems: 'flex-start', gap: '12px'
                                            }}>
                                                <ChevronRight size={16} style={{ marginTop: '2px', color: 'var(--accent)', flexShrink: 0 }} />
                                                <div style={{ fontSize: '14px', lineHeight: '1.5' }}>{action}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ color: 'var(--green)', fontSize: '14px' }}>Belirgin bir eksiklik bulunamadı, mevcut yapı korunabilir.</div>
                                    )}
                                </div>
                            </div>

                            <div className="analysis-urls">
                                <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Layers size={16} /> Sayfa Yapıları ve Bulgular
                                </h4>
                                <div style={{ display: 'grid', gap: '20px' }}>
                                    {analysisResult.reports.map((report: any, idx: number) => (
                                        <div key={idx} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ marginBottom: '12px', wordBreak: 'break-all', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                    {report.isBlog ? 'BLOG' : (report.isProduct ? 'ÜRÜN' : 'DİĞER')}
                                                </span>
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: 600,
                                                    background: report.status === 200 ? 'var(--green-bg)' : 'var(--red-bg)',
                                                    color: report.status === 200 ? 'var(--green)' : 'var(--red)'
                                                }}>
                                                    HTTP {report.status}
                                                </span>
                                                <a href={report.url} target="_blank" className="table__url" style={{ fontWeight: 600 }}>{report.url}</a>
                                            </div>
                                            <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                                                <div><strong>Title:</strong> <span style={{ color: 'var(--text-muted)' }}>{report.title}</span></div>
                                                <div><strong>H1 Tags:</strong> <span style={{ color: 'var(--text-muted)' }}>{report.h1.join(', ') || 'Bulunamadı'}</span></div>
                                                <div><strong>İç Link Bağlantısı:</strong>
                                                    {report.linksToOthers.length > 0 ? (
                                                        <span style={{ color: 'var(--green)', marginLeft: '8px' }}>
                                                            <LinkIcon size={12} style={{ marginRight: '4px' }} />
                                                            Rakip sayfalara link veriyor: {report.linksToOthers.length} adet
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--red)', marginLeft: '8px' }}>Rakip sayfalara hiç link vermiyor.</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
