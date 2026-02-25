import React from 'react';

export function ImpactView() {
    const impacts = [
        { page: '/blog/en-iyi-bakim-urunleri', change: 'Title değişikliği', date: '2026-02-01', baselineClicks: 180, postClicks: 245, uplift: '+36.1%', confidence: 'Yüksek', status: 'positive' as const },
        { page: '/blog/sac-bakim-ipuclari', change: 'Schema markup eklendi', date: '2026-02-05', baselineClicks: 420, postClicks: 512, uplift: '+21.9%', confidence: 'Orta', status: 'positive' as const },
        { page: '/blog/cilt-bakim-rehberi', change: 'İçerik genişletme', date: '2026-02-10', baselineClicks: 310, postClicks: 0, uplift: 'Bekleniyor', confidence: '9/14 gün', status: 'pending' as const },
        { page: '/blog/dogal-bakim-yontemleri', change: 'Meta description', date: '2026-01-28', baselineClicks: 140, postClicks: 156, uplift: '+11.4%', confidence: 'Düşük', status: 'info' as const },
    ];

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><span className="panel__title-icon">🔬</span> Değişiklik Etki Analizi</h3>
            </div>
            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Sayfa</th>
                            <th>Değişiklik</th>
                            <th>Tarih</th>
                            <th>Baseline Click (14g)</th>
                            <th>Sonrası (14g)</th>
                            <th>Uplift</th>
                            <th>Güven</th>
                        </tr>
                    </thead>
                    <tbody>
                        {impacts.map((imp, i) => (
                            <tr key={i}>
                                <td><span className="table__url">{imp.page}</span></td>
                                <td style={{ color: 'var(--text-secondary)' }}>{imp.change}</td>
                                <td className="table__num">{imp.date}</td>
                                <td className="table__num">{imp.baselineClicks}</td>
                                <td className="table__num">{imp.postClicks || '—'}</td>
                                <td>
                                    <span className={`table__change ${imp.status === 'positive' ? 'table__change--up' : imp.status === 'pending' ? '' : ''}`}
                                        style={imp.status === 'pending' ? { color: 'var(--yellow)', background: 'var(--yellow-bg)' } : imp.status === 'info' ? { color: 'var(--blue)', background: 'var(--blue-bg)' } : {}}>
                                        {imp.uplift}
                                    </span>
                                </td>
                                <td style={{ color: imp.confidence === 'Yüksek' ? 'var(--green)' : imp.confidence === 'Orta' ? 'var(--yellow)' : 'var(--text-muted)', fontWeight: 600, fontSize: '12px' }}>
                                    {imp.confidence}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
