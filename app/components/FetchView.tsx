'use client';

import React, { useState } from 'react';
import { Play, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function FetchView() {
    const [loading, setLoading] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSync = async (action: string, params: any = {}) => {
        setLoading(action);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/seo/gsc/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...params })
            });

            const data = await response.json();
            if (data.success) {
                setResult(data.data);
            } else {
                setError(data.error || 'İşlem başarısız oldu.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="panel">
                <div className="panel__header">
                    <h3 className="panel__title">
                        <span className="panel__title-icon">🔄</span> GSC Veri Senkronizasyonu
                    </h3>
                </div>
                <div className="panel__body">
                    <div className="action-list">
                        {/* Daily Fetch */}
                        <div className="action-item">
                            <div className="action-item__severity action-item__severity--info">📥</div>
                            <div className="action-item__content">
                                <div className="action-item__title">Günlük Veri Çek (D-2)</div>
                                <div className="action-item__desc">En son kesinleşmiş GSC verilerini veritabanına aktarır.</div>
                            </div>
                            <button
                                className="btn btn--secondary btn--sm"
                                disabled={!!loading}
                                onClick={() => handleSync('fetch-daily')}
                            >
                                {loading === 'fetch-daily' ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                                {loading === 'fetch-daily' ? 'Çalışıyor...' : 'Şimdi Çalıştır'}
                            </button>
                        </div>

                        {/* Backfill */}
                        <div className="action-item">
                            <div className="action-item__severity action-item__severity--warning">📦</div>
                            <div className="action-item__content">
                                <div className="action-item__title">Geri Dönük Backfill (14 Gün)</div>
                                <div className="action-item__desc">Son 14 günlük tüm verileri yeniden tarar ve eksikleri tamamlar.</div>
                            </div>
                            <button
                                className="btn btn--secondary btn--sm"
                                disabled={!!loading}
                                onClick={() => handleSync('backfill', { days: 14 })}
                            >
                                {loading === 'backfill' ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                                {loading === 'backfill' ? 'Çalışıyor...' : 'Şimdi Çalıştır'}
                            </button>
                        </div>

                        {/* Weekly Summary */}
                        <div className="action-item">
                            <div className="action-item__severity action-item__severity--positive">📊</div>
                            <div className="action-item__content">
                                <div className="action-item__title">Haftalık Özetleri Oluştur</div>
                                <div className="action-item__desc">Dashboard grafiklerinin beslendiği haftalık tabloları hesaplar.</div>
                            </div>
                            <button
                                className="btn btn--secondary btn--sm"
                                disabled={!!loading}
                                onClick={() => handleSync('build-weekly', { weeks: 12 })}
                            >
                                {loading === 'build-weekly' ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                                {loading === 'build-weekly' ? 'Çalışıyor...' : 'Şimdi Çalıştır'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results / Feedback */}
            {result && (
                <div className="panel bg-green-50/50 border-green-200">
                    <div className="panel__body flex items-start gap-3">
                        <CheckCircle2 className="text-green-500 mt-1" size={18} />
                        <div>
                            <h4 className="font-bold text-green-700 text-sm">İşlem Tamamlandı</h4>
                            <p className="text-xs text-green-600 mt-1">{result.message}</p>
                            <pre className="mt-3 p-3 bg-black/5 rounded text-[10px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                                {result.output}
                            </pre>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="panel bg-red-50/50 border-red-200">
                    <div className="panel__body flex items-start gap-3">
                        <AlertCircle className="text-red-500 mt-1" size={18} />
                        <div>
                            <h4 className="font-bold text-red-700 text-sm">Hata Oluştu</h4>
                            <p className="text-xs text-red-600 mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
