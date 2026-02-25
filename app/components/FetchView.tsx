import React from 'react';

export function FetchView() {
    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><span className="panel__title-icon">🔄</span> Veri Çekme Komutları</h3>
            </div>
            <div className="panel__body">
                <div className="action-list">
                    <div className="action-item">
                        <div className="action-item__severity action-item__severity--info">📥</div>
                        <div className="action-item__content">
                            <div className="action-item__title">Günlük Fetch (D-2)</div>
                            <div className="action-item__desc">npx tsx scripts/gsc/fetch-daily.ts</div>
                        </div>
                    </div>
                    <div className="action-item">
                        <div className="action-item__severity action-item__severity--warning">📦</div>
                        <div className="action-item__content">
                            <div className="action-item__title">Backfill (Son 90 gün)</div>
                            <div className="action-item__desc">npx tsx scripts/gsc/backfill.ts --days=90</div>
                        </div>
                    </div>
                    <div className="action-item">
                        <div className="action-item__severity action-item__severity--positive">📊</div>
                        <div className="action-item__content">
                            <div className="action-item__title">Haftalık Özet Oluştur</div>
                            <div className="action-item__desc">npx tsx scripts/gsc/build-weekly-summary.ts --weeks=12</div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Kullanım
                    </div>
                    <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'var(--accent-light)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {`# Belirli tarih
npx tsx scripts/gsc/fetch-daily.ts --date=2026-02-14

# Tarih aralığı backfill
npx tsx scripts/gsc/backfill.ts --start=2026-01-01 --end=2026-02-15

# Son N hafta özeti
npx tsx scripts/gsc/build-weekly-summary.ts --weeks=8`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
