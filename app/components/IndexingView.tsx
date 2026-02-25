import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { CheckCircle2, RefreshCw, AlertTriangle, Info, Loader2 } from 'lucide-react';

export function IndexingView() {
    const { data: dbResponse, mutate } = useSWR('/api/seo/gsc/indexing?task=db', url => fetch(url).then(r => r.json()));

    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);

    // Initial data from DB
    useEffect(() => {
        if (dbResponse?.success && !isLoading && results.length === 0) {
            setResults(dbResponse.data);
        }
    }, [dbResponse, isLoading, results.length]);

    const startInspection = async () => {
        setIsLoading(true);
        setIsFinished(false);
        setError(null);
        setResults([]);
        setProgress({ current: 0, total: 0 });

        try {
            const listRes = await fetch('/api/seo/gsc/indexing?task=list');
            const listData = await listRes.json();
            if (!listData.success) throw new Error(listData.error || 'URL listesi alınamadı.');

            const urls = listData.urls;
            setProgress({ current: 0, total: urls.length });

            const newResults: any[] = [];
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                try {
                    const insRes = await fetch(`/api/seo/gsc/indexing?task=inspect&url=${encodeURIComponent(url)}`);
                    const insData = await insRes.json();
                    if (insData.success) {
                        newResults.push(insData.data);
                        setResults([...newResults]);
                    }
                } catch (err) {
                    console.error(`Error inspecting ${url}`, err);
                }
                setProgress(prev => ({ ...prev, current: i + 1 }));
            }

            // MARK FULL SYNC AS COMPLETE
            await fetch('/api/seo/gsc/indexing?task=mark_sync');

            setIsFinished(true);
            mutate(); // Sync SWR cache with new DB data including lastSync
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const stats = {
        total: results.length,
        indexed: results.filter((r: any) => r.verdict === 'PASSING').length,
        notIndexed: results.filter((r: any) => r.verdict === 'NEUTRAL').length,
        errors: results.filter((r: any) => r.verdict === 'ERROR').length
    };

    // Use session-based lastSync from DB if available
    const lastSyncTime = dbResponse?.lastSync
        ? new Date(dbResponse.lastSync).toLocaleString()
        : (results.length > 0 ? 'Analiz Gerekli' : null);

    const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

    if (error) return (
        <div className="panel" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertTriangle size={32} style={{ color: 'var(--red)', marginBottom: '16px' }} />
            <div style={{ fontWeight: 600 }}>Hata: {error}</div>
            <button className="main__header-btn--primary" style={{ marginTop: '16px', marginInline: 'auto' }} onClick={startInspection}>Tekrar Dene</button>
        </div>
    );

    return (
        <div className="panel">
            <div className="panel__header">
                <div>
                    <h3 className="panel__title">
                        <CheckCircle2 size={16} className="panel__title-icon" /> /blog/ Sayfaları Derin Index Analizi
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {lastSyncTime ? `Son GSC Taraması: ${lastSyncTime}` : 'Veriler Supabase üzerinden yükleniyor...'}
                    </div>
                </div>
                {!isLoading && (
                    <button className="main__header-btn--primary" onClick={startInspection}>
                        <RefreshCw size={14} /> GSC'den Güncelle
                    </button>
                )}
            </div>

            <div className="panel__body">
                {isLoading && (
                    <div style={{ marginBottom: '24px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                            <span style={{ fontWeight: 500 }}>Google Search Console Sorgulanıyor...</span>
                            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{progress.current} / {progress.total}</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${progressPercent}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
                                transition: 'width 0.3s ease'
                            }}></div>
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            URL: <span style={{ color: 'var(--text-primary)' }}>{results[results.length - 1]?.url.replace('https://uygunbakim.com', '') || 'Hazırlanıyor...'}</span>
                        </div>
                    </div>
                )}

                {!isLoading && !isFinished && results.length === 0 && (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Info size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <p>Blog sayfalarınızın gerçek zamanlı index durumunu görmek için analizi başlatın.</p>
                        <button className="main__header-btn--primary" style={{ marginTop: '20px', marginInline: 'auto' }} onClick={startInspection}>Analizi Başlat</button>
                    </div>
                )}

                {results.length > 0 && (
                    <>
                        <div className="stats-row" style={{ marginBottom: '24px' }}>
                            <div className="stat-card" style={{ padding: '16px' }}>
                                <div className="stat-card__label">Tarihteki Kayıt</div>
                                <div className="stat-card__value" style={{ fontSize: '24px' }}>{results.length}</div>
                            </div>
                            <div className="stat-card" style={{ padding: '16px' }}>
                                <div className="stat-card__label">Indexli</div>
                                <div className="stat-card__value" style={{ fontSize: '24px', color: 'var(--green)' }}>{stats.indexed}</div>
                            </div>
                            <div className="stat-card" style={{ padding: '16px' }}>
                                <div className="stat-card__label">İndexli Değil</div>
                                <div className="stat-card__value" style={{ fontSize: '24px', color: 'var(--yellow)' }}>{stats.notIndexed}</div>
                            </div>
                            {stats.errors > 0 && (
                                <div className="stat-card" style={{ padding: '16px' }}>
                                    <div className="stat-card__label">Hata</div>
                                    <div className="stat-card__value" style={{ fontSize: '24px', color: 'var(--red)' }}>{stats.errors}</div>
                                </div>
                            )}
                        </div>

                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Sayfa</th>
                                        <th>Durum</th>
                                        <th>Google Tanımı</th>
                                        <th className="table__num">Son Bot Taraması</th>
                                        <th>Google Canonical</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(isLoading ? [...results].reverse() : results).map((item: any, i: number) => (
                                        <tr key={i} style={{ animation: 'fadeIn 0.5s ease' }}>
                                            <td style={{ maxWidth: '280px' }}>
                                                <div className="table__url" title={item.url}>
                                                    {item.url.replace('https://uygunbakim.com', '') || '/'}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="table__change" style={{
                                                    background: item.status_type === 'success' ? 'var(--green-bg)' :
                                                        item.status_type === 'warning' ? 'var(--yellow-bg)' : 'var(--red-bg)',
                                                    color: item.status_type === 'success' ? 'var(--green)' :
                                                        item.status_type === 'warning' ? 'var(--yellow)' : 'var(--red)',
                                                    fontSize: '11px',
                                                    fontWeight: 600
                                                }}>
                                                    {item.verdict === 'PASSING' ? 'INDEXLI' :
                                                        item.verdict === 'NEUTRAL' ? 'INDEXLI DEGIL' : item.verdict}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '250px' }}>
                                                {item.coverage_state}
                                            </td>
                                            <td className="table__num" style={{ fontSize: '11px' }}>
                                                {item.last_crawl_time ? new Date(item.last_crawl_time).toLocaleDateString() : '—'}
                                            </td>
                                            <td style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.google_canonical ? item.google_canonical.replace('https://uygunbakim.com', '') : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
