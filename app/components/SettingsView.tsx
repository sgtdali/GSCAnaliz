import React from 'react';

export function SettingsView() {
    const envVars = [
        { name: 'SUPABASE_URL', desc: 'Supabase proje URL', required: true },
        { name: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Service role key', required: true },
        { name: 'GOOGLE_CLIENT_ID', desc: 'OAuth client ID', required: true },
        { name: 'GOOGLE_CLIENT_SECRET', desc: 'OAuth client secret', required: true },
        { name: 'GOOGLE_REDIRECT_URI', desc: 'OAuth callback URL', required: true },
        { name: 'GOOGLE_REFRESH_TOKEN', desc: 'Kalıcı refresh token', required: true },
        { name: 'GSC_SITE_URL', desc: 'sc-domain:uygunbakim.com', required: true },
        { name: 'API_SECRET_KEY', desc: 'API authentication key', required: true },
        { name: 'GSC_URL_PREFIX', desc: 'URL filtre (varsayılan: /blog/)', required: false },
    ];

    return (
        <>
            <div className="panel" style={{ marginBottom: '16px' }}>
                <div className="panel__header">
                    <h3 className="panel__title"><span className="panel__title-icon">🔑</span> Ortam Değişkenleri</h3>
                </div>
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Değişken</th>
                                <th>Açıklama</th>
                                <th>Zorunlu</th>
                            </tr>
                        </thead>
                        <tbody>
                            {envVars.map((v, i) => (
                                <tr key={i}>
                                    <td><span className="table__url">{v.name}</span></td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{v.desc}</td>
                                    <td>{v.required ? '✅' : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="panel">
                <div className="panel__header">
                    <h3 className="panel__title"><span className="panel__title-icon">⚡</span> API Endpoint&apos;leri</h3>
                </div>
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Method</th>
                                <th>Endpoint</th>
                                <th>Açıklama</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { m: 'GET', p: '/api/seo/gsc/daily', d: 'URL bazlı günlük metrikler' },
                                { m: 'GET', p: '/api/seo/gsc/weekly', d: 'Haftalık WoW analiz' },
                                { m: 'GET', p: '/api/seo/gsc/impact', d: 'Değişiklik etki analizi' },
                                { m: 'GET', p: '/api/seo/gsc/actions', d: 'Aksiyon önerileri' },
                                { m: 'GET', p: '/api/seo/gsc/changes', d: 'Değişiklik logları' },
                                { m: 'POST', p: '/api/seo/gsc/changes', d: 'Değişiklik kaydı oluştur' },
                            ].map((e, i) => (
                                <tr key={i}>
                                    <td><span className={`table__change ${e.m === 'GET' ? 'table__change--up' : ''}`}
                                        style={e.m === 'POST' ? { color: 'var(--blue)', background: 'var(--blue-bg)' } : {}}>{e.m}</span></td>
                                    <td><span className="table__url">{e.p}</span></td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{e.d}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
