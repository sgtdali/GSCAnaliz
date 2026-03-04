'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
    TrendingUp, X, Loader2, AlertTriangle, Search,
    CheckCircle2, AlertCircle, Info, ExternalLink,
    Layout, ListChecks, Gauge
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export function QueryAnalysisModal({ url, query, onClose }: { url: string; query?: string; onClose: () => void }) {
    const [tab, setTab] = useState<'audit' | 'gsc'>(query ? 'audit' : 'gsc');

    // GSC Queries Analysis
    const { data: analysis, error: gscError } = useSWR(
        `/api/seo/gsc/queries?page=${encodeURIComponent(url)}`,
        fetcher
    );

    // Page Audit Data
    const { data: audit, error: auditError, isLoading: auditLoading } = useSWR(
        `/api/seo/page-audit?url=${encodeURIComponent(url)}${query ? `&query=${encodeURIComponent(query)}` : ''}`,
        fetcher
    );

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'var(--green)';
        if (score >= 60) return 'var(--yellow)';
        return 'var(--red)';
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '950px', width: '95%' }}>
                <div className="modal__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 className="modal__title" style={{ margin: 0 }}>SEO Detay Analizi</h3>
                        <div className="modal__tabs" style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '8px', padding: '2px', marginLeft: '20px' }}>
                            <button
                                className={`tab-btn ${tab === 'audit' ? 'active' : ''}`}
                                onClick={() => setTab('audit')}
                            >
                                <ListChecks size={12} /> Sayfa Denetimi (Audit)
                            </button>
                            <button
                                className={`tab-btn ${tab === 'gsc' ? 'active' : ''}`}
                                onClick={() => setTab('gsc')}
                            >
                                <TrendingUp size={12} /> GSC Kelime Analizi
                            </button>
                        </div>
                    </div>
                    <button className="modal__close" onClick={onClose}><X size={16} /></button>
                </div>

                <div className="modal__body" style={{ minHeight: '500px' }}>
                    {/* Header Info */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>İncelenen Sayfa</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {url.replace('https://uygunbakim.com', '') || '/'}
                                <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-light)' }}><ExternalLink size={12} /></a>
                            </div>
                        </div>
                        {audit && (
                            <div style={{ textAlign: 'right', display: 'flex', gap: '30px', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Analiz Sorgusu</div>
                                    <div style={{ fontWeight: 700, color: 'var(--accent-light)', fontSize: '15px' }}>{audit.query}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>SEO Skoru</div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: getScoreColor(audit.score) }}>{audit.score}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {tab === 'audit' ? (
                        <div style={{ padding: '24px' }}>
                            {auditLoading && (
                                <div style={{ padding: '100px', textAlign: 'center' }}>
                                    <Loader2 size={32} className="icon-spin" style={{ color: 'var(--accent)', marginBottom: '16px' }} />
                                    <div style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Sayfa Teknik Analizi Yapılıyor...</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>HTML çekiliyor ve kurallar kontrol ediliyor.</div>
                                </div>
                            )}

                            {audit && (
                                <div className="space-y-6">
                                    {/* Metrics Summary Card */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                        {[
                                            { label: 'Pozisyon', value: audit.gscData.position, color: 'var(--yellow)' },
                                            { label: 'Gösterim', value: audit.gscData.impressions.toLocaleString(), color: 'var(--text-primary)' },
                                            { label: 'Tıklama', value: audit.gscData.clicks.toLocaleString(), color: 'var(--text-primary)' },
                                            { label: 'CTR', value: audit.gscData.ctr.toFixed(2) + '%', color: 'var(--accent-light)' }
                                        ].map((stat, i) => (
                                            <div key={i} style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                                                <div style={{ fontSize: '20px', fontWeight: 700, color: stat.color, marginTop: '4px' }}>{stat.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Issues Section */}
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <ListChecks size={16} /> Optimizasyon Kontrol Listesi
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {audit.rules.map((rule: any, i: number) => (
                                                <div key={i} style={{
                                                    background: 'var(--bg-card)',
                                                    borderRadius: '12px',
                                                    padding: '16px',
                                                    border: '1px solid var(--glass-border)',
                                                    borderLeft: `4px solid ${rule.status === 'critical' ? 'var(--red)' : rule.status === 'warning' ? 'var(--yellow)' : 'var(--green)'}`,
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '16px'
                                                }}>
                                                    <div style={{ color: rule.status === 'critical' ? 'var(--red)' : rule.status === 'warning' ? 'var(--yellow)' : 'var(--green)', marginTop: '2px' }}>
                                                        {rule.status === 'critical' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{rule.message}</div>
                                                        {rule.action && (
                                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                                <span style={{ fontWeight: 700, color: 'var(--accent-light)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>💡 Aksiyon</span>
                                                                {rule.action}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '10px', fontWeight: 800, opacity: 0.3, color: 'var(--text-muted)' }}>{rule.id}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {auditError && (
                                <div style={{ padding: '60px', textAlign: 'center' }}>
                                    <AlertTriangle size={32} style={{ color: 'var(--red)', marginBottom: '16px' }} />
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Sayfa Taranamadı</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>{auditError}</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="gsc-tab-content">
                            {!analysis && !gscError && (
                                <div style={{ padding: '100px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Loader2 size={32} className="icon-spin" style={{ color: 'var(--accent)' }} />
                                    <div style={{ marginTop: '16px' }}>Kelime performansları yükleniyor...</div>
                                </div>
                            )}
                            {analysis && (
                                <div className="table-wrap" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                                    <table className="table">
                                        <thead>
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
                                                    <td style={{ fontWeight: 500 }}>{q.query}</td>
                                                    <td className="table__num">{q.current.clicks}</td>
                                                    <td className={`table__num ${q.diff.clicks >= 0 ? 'table__change--up' : 'table__change--down'}`}>
                                                        {q.diff.clicks >= 0 ? '+' : ''}{q.diff.clicks}
                                                    </td>
                                                    <td className="table__num">{q.current.position.toFixed(1)}</td>
                                                    <td>
                                                        {q.diff.clicks < 0 ? <span className="badge badge--red">Düşüş</span> : <span className="badge badge--green">Yükseliş</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
