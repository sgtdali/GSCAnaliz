'use client';

import { useState } from 'react';

type Section = 'dashboard' | 'daily' | 'weekly' | 'actions' | 'impact' | 'changelog' | 'fetch' | 'settings';

export default function Dashboard() {
    const [active, setActive] = useState<Section>('dashboard');

    const NAV = [
        { id: 'dashboard' as Section, icon: '🏠', label: 'Dashboard' },
        { id: 'daily' as Section, icon: '📈', label: 'Günlük Metrikler' },
        { id: 'weekly' as Section, icon: '📅', label: 'Haftalık WoW' },
    ];

    const NAV_ANALYSIS = [
        { id: 'actions' as Section, icon: '🎯', label: 'Aksiyon Önerileri', badge: 3 },
        { id: 'impact' as Section, icon: '🔬', label: 'Etki Analizi' },
        { id: 'changelog' as Section, icon: '📝', label: 'Değişiklik Günlüğü' },
    ];

    const NAV_TOOLS = [
        { id: 'fetch' as Section, icon: '🔄', label: 'Veri Çekme' },
        { id: 'settings' as Section, icon: '⚙️', label: 'Ayarlar' },
    ];

    const SECTION_TITLES: Record<Section, string> = {
        dashboard: 'Dashboard',
        daily: 'Günlük Metrikler',
        weekly: 'Haftalık WoW Analiz',
        actions: 'Aksiyon Önerileri',
        impact: 'Etki Analizi',
        changelog: 'Değişiklik Günlüğü',
        fetch: 'Veri Çekme',
        settings: 'Ayarlar',
    };

    return (
        <div className="app">
            {/* ==================== SIDEBAR ==================== */}
            <aside className="sidebar">
                <div className="sidebar__brand">
                    <div className="sidebar__logo">📊</div>
                    <div>
                        <div className="sidebar__name">GSC Analytics</div>
                        <div className="sidebar__site">uygunbakim.com</div>
                    </div>
                </div>

                <nav className="sidebar__nav">
                    <div className="sidebar__section-label">Genel</div>
                    {NAV.map(item => (
                        <div
                            key={item.id}
                            className={`sidebar__link ${active === item.id ? 'sidebar__link--active' : ''}`}
                            onClick={() => setActive(item.id)}
                        >
                            <span className="sidebar__link-icon">{item.icon}</span>
                            {item.label}
                        </div>
                    ))}

                    <div className="sidebar__section-label">Analiz</div>
                    {NAV_ANALYSIS.map(item => (
                        <div
                            key={item.id}
                            className={`sidebar__link ${active === item.id ? 'sidebar__link--active' : ''}`}
                            onClick={() => setActive(item.id)}
                        >
                            <span className="sidebar__link-icon">{item.icon}</span>
                            {item.label}
                            {'badge' in item && item.badge && (
                                <span className="sidebar__link-badge">{item.badge}</span>
                            )}
                        </div>
                    ))}

                    <div className="sidebar__section-label">Araçlar</div>
                    {NAV_TOOLS.map(item => (
                        <div
                            key={item.id}
                            className={`sidebar__link ${active === item.id ? 'sidebar__link--active' : ''}`}
                            onClick={() => setActive(item.id)}
                        >
                            <span className="sidebar__link-icon">{item.icon}</span>
                            {item.label}
                        </div>
                    ))}
                </nav>

                <div className="sidebar__footer">
                    <div className="sidebar__status">
                        <span className="sidebar__status-dot" />
                        API Bağlantısı Aktif
                    </div>
                </div>
            </aside>

            {/* ==================== MAIN ==================== */}
            <main className="main">
                <header className="main__header">
                    <div className="main__header-left">
                        <div className="main__breadcrumb">
                            GSC Analytics / <span>{SECTION_TITLES[active]}</span>
                        </div>
                    </div>
                    <div className="main__header-right">
                        <button className="main__header-btn">📅 Son 30 Gün</button>
                        <button className="main__header-btn">🔄 Yenile</button>
                        {active === 'changelog' && (
                            <button className="main__header-btn main__header-btn--primary">+ Değişiklik Ekle</button>
                        )}
                    </div>
                </header>

                <div className="main__content">
                    {active === 'dashboard' && <DashboardView />}
                    {active === 'daily' && <DailyView />}
                    {active === 'weekly' && <WeeklyView />}
                    {active === 'actions' && <ActionsView />}
                    {active === 'impact' && <ImpactView />}
                    {active === 'changelog' && <ChangeLogView />}
                    {active === 'fetch' && <FetchView />}
                    {active === 'settings' && <SettingsView />}
                </div>
            </main>
        </div>
    );
}

/* ============================================================
   DASHBOARD VIEW
   ============================================================ */
function DashboardView() {
    return (
        <>
            {/* Stats */}
            <div className="stats-row">
                <StatCard label="Toplam Tıklama" value="12,847" change="+12.4%" up icon="👆" color="purple" />
                <StatCard label="Toplam Gösterim" value="384,291" change="+8.7%" up icon="👁️" color="blue" />
                <StatCard label="Ortalama CTR" value="3.34%" change="+0.24" up icon="📊" color="green" />
                <StatCard label="Ortalama Pozisyon" value="14.2" change="↑ 1.8" up icon="📍" color="orange" />
            </div>

            {/* Chart + Actions */}
            <div className="grid-3-1">
                <div className="panel">
                    <div className="panel__header">
                        <h3 className="panel__title"><span className="panel__title-icon">📈</span> Haftalık Tıklama Trendi</h3>
                    </div>
                    <div className="panel__body">
                        <BarChart data={[42, 55, 38, 65, 48, 72, 58, 80, 68, 85, 75, 92]} labels={['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'H11', 'H12']} />
                    </div>
                </div>

                <div className="panel">
                    <div className="panel__header">
                        <h3 className="panel__title"><span className="panel__title-icon">🎯</span> Aksiyon Önerileri</h3>
                    </div>
                    <div className="panel__body">
                        <div className="action-list">
                            <ActionItem severity="critical" icon="🔴" title="Query Kaybı Analizi" desc="/blog/en-iyi-bakim-urunleri" score={85} />
                            <ActionItem severity="warning" icon="🟡" title="Title/Meta Testi" desc="/blog/cilt-bakim-rehberi" score={62} />
                            <ActionItem severity="info" icon="🔵" title="Snippet İnceleme" desc="/blog/sac-bakim-ipuclari" score={45} />
                            <ActionItem severity="positive" icon="🟢" title="Büyüme Fırsatı" desc="/blog/dogal-bakim-yontemleri" score={38} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Pages */}
            <TopPagesTable />
        </>
    );
}

/* ============================================================
   DAILY VIEW
   ============================================================ */
function DailyView() {
    const rows = [
        { date: '2026-02-16', page: '/blog/en-iyi-bakim-urunleri', clicks: 412, impressions: 12480, ctr: '3.30%', position: '6.1' },
        { date: '2026-02-16', page: '/blog/cilt-bakim-rehberi', clicks: 287, impressions: 9320, ctr: '3.08%', position: '8.4' },
        { date: '2026-02-16', page: '/blog/sac-bakim-ipuclari', clicks: 198, impressions: 7150, ctr: '2.77%', position: '11.2' },
        { date: '2026-02-16', page: '/blog/dogal-bakim-yontemleri', clicks: 156, impressions: 5840, ctr: '2.67%', position: '9.8' },
        { date: '2026-02-16', page: '/blog/yuz-temizleme-rehberi', clicks: 102, impressions: 4210, ctr: '2.42%', position: '15.3' },
        { date: '2026-02-15', page: '/blog/en-iyi-bakim-urunleri', clicks: 398, impressions: 11950, ctr: '3.33%', position: '6.3' },
        { date: '2026-02-15', page: '/blog/cilt-bakim-rehberi', clicks: 265, impressions: 8740, ctr: '3.03%', position: '8.9' },
        { date: '2026-02-15', page: '/blog/sac-bakim-ipuclari', clicks: 210, impressions: 7420, ctr: '2.83%', position: '10.8' },
    ];

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><span className="panel__title-icon">📈</span> Günlük GSC Metrikleri</h3>
            </div>
            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Tarih</th>
                            <th>Sayfa</th>
                            <th>Click</th>
                            <th>Impression</th>
                            <th>CTR</th>
                            <th>Pozisyon</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i}>
                                <td className="table__num">{r.date}</td>
                                <td><span className="table__url">{r.page}</span></td>
                                <td className="table__num">{r.clicks.toLocaleString()}</td>
                                <td className="table__num">{r.impressions.toLocaleString()}</td>
                                <td className="table__num">{r.ctr}</td>
                                <td className="table__num">{r.position}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ============================================================
   WEEKLY VIEW
   ============================================================ */
function WeeklyView() {
    const weeks = [
        { start: '2026-02-10', end: '2026-02-16', page: '/blog/en-iyi-bakim-urunleri', clicks: 2847, impressions: 84291, ctr: '3.38%', pos: '6.2', clickW: '+18.2%', impW: '+12.1%', up: true },
        { start: '2026-02-10', end: '2026-02-16', page: '/blog/cilt-bakim-rehberi', clicks: 1923, impressions: 62480, ctr: '3.08%', pos: '8.7', clickW: '-5.4%', impW: '+22.3%', up: false },
        { start: '2026-02-10', end: '2026-02-16', page: '/blog/sac-bakim-ipuclari', clicks: 1456, impressions: 48320, ctr: '3.01%', pos: '11.4', clickW: '+8.1%', impW: '+5.6%', up: true },
        { start: '2026-02-10', end: '2026-02-16', page: '/blog/dogal-bakim-yontemleri', clicks: 982, impressions: 31850, ctr: '3.08%', pos: '9.1', clickW: '+34.7%', impW: '+28.9%', up: true },
        { start: '2026-02-03', end: '2026-02-09', page: '/blog/en-iyi-bakim-urunleri', clicks: 2408, impressions: 75190, ctr: '3.20%', pos: '6.8', clickW: '+5.1%', impW: '+3.2%', up: true },
    ];

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><span className="panel__title-icon">📅</span> Haftalık WoW Karşılaştırma</h3>
            </div>
            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Hafta</th>
                            <th>Sayfa</th>
                            <th>Click</th>
                            <th>Click WoW</th>
                            <th>Impression</th>
                            <th>Imp WoW</th>
                            <th>CTR</th>
                            <th>Pozisyon</th>
                        </tr>
                    </thead>
                    <tbody>
                        {weeks.map((w, i) => (
                            <tr key={i}>
                                <td className="table__num">{w.start}</td>
                                <td><span className="table__url">{w.page}</span></td>
                                <td className="table__num">{w.clicks.toLocaleString()}</td>
                                <td><span className={`table__change ${w.up ? 'table__change--up' : 'table__change--down'}`}>{w.clickW}</span></td>
                                <td className="table__num">{w.impressions.toLocaleString()}</td>
                                <td><span className={`table__change ${w.impW.startsWith('+') ? 'table__change--up' : 'table__change--down'}`}>{w.impW}</span></td>
                                <td className="table__num">{w.ctr}</td>
                                <td className="table__num">{w.pos}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ============================================================
   ACTIONS VIEW
   ============================================================ */
function ActionsView() {
    const actions = [
        { severity: 'critical' as const, icon: '🔴', title: 'QUERY_LOSS_ANALYSIS', desc: '/blog/yuz-temizleme-rehberi — Click ↓18.3%, ihtiyaç: Query kırılım analizi yapın', score: 85 },
        { severity: 'critical' as const, icon: '🔴', title: 'URGENT_REVIEW', desc: '/blog/anti-aging-serumlar — Click ↓22%, Impression ↓15%. Acil inceleme gerekli', score: 78 },
        { severity: 'warning' as const, icon: '🟡', title: 'TITLE_META_TEST', desc: '/blog/cilt-bakim-rehberi — Impression ↑22.3% ama CTR ↓0.6%. Title/meta iyileştirin', score: 62 },
        { severity: 'info' as const, icon: '🔵', title: 'SNIPPET_INTENT_REVIEW', desc: '/blog/sac-bakim-ipuclari — Pozisyon iyileşti ama click düşük. Snippet intent uyumu kontrol edin', score: 45 },
        { severity: 'info' as const, icon: '🔵', title: 'POSITION_DECLINE_CHECK', desc: '/blog/parfum-rehberi — Pozisyon 2.4 basamak kötüleşti. İçerik güncelliğini kontrol edin', score: 42 },
        { severity: 'positive' as const, icon: '🟢', title: 'GROWTH_OPPORTUNITY', desc: '/blog/dogal-bakim-yontemleri — Click ↑34.7%, Impression ↑28.9%. Bu içeriği genişletin', score: 38 },
        { severity: 'positive' as const, icon: '🟢', title: 'GROWTH_OPPORTUNITY', desc: '/blog/en-iyi-bakim-urunleri — Click ↑18.2%. İç link ağını güçlendirin', score: 35 },
    ];

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><span className="panel__title-icon">🎯</span> Tüm Aksiyon Önerileri</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{actions.length} aksiyon · öncelik sıralı</span>
            </div>
            <div className="panel__body">
                <div className="action-list">
                    {actions.map((a, i) => (
                        <ActionItem key={i} {...a} />
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   IMPACT VIEW
   ============================================================ */
function ImpactView() {
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

/* ============================================================
   CHANGELOG VIEW
   ============================================================ */
function ChangeLogView() {
    const logs = [
        { type: 'title', label: 'Title', text: 'Title tag güncellendi: daha spesifik anahtar kelime', page: '/blog/en-iyi-bakim-urunleri', time: '3 gün önce', actor: 'seo-team' },
        { type: 'content', label: 'Content', text: 'İçerik genişletildi: 1200 → 2400 kelime, yeni bölümler eklendi', page: '/blog/cilt-bakim-rehberi', time: '5 gün önce', actor: 'editor' },
        { type: 'tech', label: 'Tech', text: 'Schema markup eklendi: FAQ ve HowTo structured data', page: '/blog/sac-bakim-ipuclari', time: '1 hafta önce', actor: 'dev' },
        { type: 'meta', label: 'Meta', text: 'Meta description yeniden yazıldı, CTA eklendi', page: '/blog/dogal-bakim-yontemleri', time: '2 hafta önce', actor: 'seo-team' },
        { type: 'content', label: 'Content', text: 'İç linkler güncellendi, ilgili yazılara bağlantı eklendi', page: '/blog/en-iyi-bakim-urunleri', time: '2 hafta önce', actor: 'editor' },
        { type: 'title', label: 'Title', text: 'H1 etiketi SEO uyumlu hale getirildi', page: '/blog/yuz-temizleme-rehberi', time: '3 hafta önce', actor: 'seo-team' },
    ];

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><span className="panel__title-icon">📝</span> Değişiklik Günlüğü</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{logs.length} kayıt</span>
            </div>
            <div className="panel__body">
                <div className="changelog">
                    {logs.map((log, i) => (
                        <div key={i} className="changelog__item">
                            <div className="changelog__dot-line">
                                <div className="changelog__dot" />
                                {i < logs.length - 1 && <div className="changelog__line" />}
                            </div>
                            <div className="changelog__content">
                                <span className={`changelog__type changelog__type--${log.type}`}>{log.label}</span>
                                <div className="changelog__text">{log.text}</div>
                                <div className="changelog__meta">{log.page} · {log.time} · {log.actor}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   FETCH VIEW
   ============================================================ */
function FetchView() {
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

/* ============================================================
   SETTINGS VIEW
   ============================================================ */
function SettingsView() {
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

/* ============================================================
   SHARED COMPONENTS
   ============================================================ */

function StatCard({ label, value, change, up, icon, color }: {
    label: string; value: string; change: string; up: boolean; icon: string; color: string;
}) {
    return (
        <div className="stat-card">
            <div className="stat-card__top">
                <div className="stat-card__label">{label}</div>
                <div className={`stat-card__icon stat-card__icon--${color}`}>{icon}</div>
            </div>
            <div className="stat-card__value">{value}</div>
            <span className={`stat-card__change ${up ? 'stat-card__change--up' : 'stat-card__change--down'}`}>{change}</span>
            <div className="stat-card__sub">vs. önceki hafta</div>
        </div>
    );
}

function ActionItem({ severity, icon, title, desc, score }: {
    severity: 'critical' | 'warning' | 'info' | 'positive'; icon: string; title: string; desc: string; score: number;
}) {
    return (
        <div className="action-item">
            <div className={`action-item__severity action-item__severity--${severity}`}>{icon}</div>
            <div className="action-item__content">
                <div className="action-item__title">{title}</div>
                <div className="action-item__desc">{desc}</div>
            </div>
            <div className="action-item__score">{score}</div>
        </div>
    );
}

function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
    return (
        <>
            <div className="chart-bars">
                {data.map((h, i) => (
                    <div
                        key={i}
                        className={`chart-bar ${i >= data.length - 2 ? 'chart-bar--accent' : i >= data.length - 4 ? 'chart-bar--green' : 'chart-bar--muted'}`}
                        style={{ height: `${h}%` }}
                    >
                        <span className="chart-bar__tooltip">{Math.round(h * 14.3)}</span>
                    </div>
                ))}
            </div>
            <div className="chart-labels">
                {labels.map((l, i) => (
                    <span key={i} className="chart-label">{l}</span>
                ))}
            </div>
        </>
    );
}

function TopPagesTable() {
    const pages = [
        { url: '/blog/en-iyi-bakim-urunleri', clicks: '2,847', clickW: '+18.2%', imp: '84,291', impW: '+12.1%', ctr: '3.38%', pos: '6.2', spark: [40, 50, 35, 60, 45, 70, 55, 80], up: true },
        { url: '/blog/cilt-bakim-rehberi', clicks: '1,923', clickW: '-5.4%', imp: '62,480', impW: '+22.3%', ctr: '3.08%', pos: '8.7', spark: [60, 55, 65, 50, 70, 45, 55, 40], up: false },
        { url: '/blog/sac-bakim-ipuclari', clicks: '1,456', clickW: '+8.1%', imp: '48,320', impW: '+5.6%', ctr: '3.01%', pos: '11.4', spark: [30, 45, 40, 55, 50, 60, 65, 70], up: true },
        { url: '/blog/dogal-bakim-yontemleri', clicks: '982', clickW: '+34.7%', imp: '31,850', impW: '+28.9%', ctr: '3.08%', pos: '9.1', spark: [20, 30, 35, 45, 50, 60, 75, 90], up: true },
        { url: '/blog/yuz-temizleme-rehberi', clicks: '764', clickW: '-12.3%', imp: '28,140', impW: '-8.1%', ctr: '2.72%', pos: '15.8', spark: [80, 70, 65, 55, 50, 40, 35, 30], up: false },
    ];

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><span className="panel__title-icon">🏆</span> En İyi Blog Sayfaları (WoW)</h3>
            </div>
            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr><th>Sayfa</th><th>Click</th><th>WoW</th><th>Impression</th><th>WoW</th><th>CTR</th><th>Pozisyon</th><th>Trend</th></tr>
                    </thead>
                    <tbody>
                        {pages.map((p, i) => (
                            <tr key={i}>
                                <td><span className="table__url">{p.url}</span></td>
                                <td className="table__num">{p.clicks}</td>
                                <td><span className={`table__change ${p.up ? 'table__change--up' : 'table__change--down'}`}>{p.clickW}</span></td>
                                <td className="table__num">{p.imp}</td>
                                <td><span className={`table__change ${p.impW.startsWith('+') ? 'table__change--up' : 'table__change--down'}`}>{p.impW}</span></td>
                                <td className="table__num">{p.ctr}</td>
                                <td className="table__num">{p.pos}</td>
                                <td>
                                    <div className="sparkline">
                                        {p.spark.map((h, j) => <div key={j} className="sparkline__bar" style={{ height: `${h}%` }} />)}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
