'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import {
    Network, Play, Loader2, AlertCircle, CheckCircle2,
    Link as LinkIcon, ExternalLink, Search, Globe, ChevronRight
} from 'lucide-react';
import { StatCard } from './shared/StatCard';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export function CrawlerView() {
    const [isCrawling, setIsCrawling] = useState(false);
    const [crawlResult, setCrawlResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchUrl, setSearchUrl] = useState('');
    const [incomingLinks, setIncomingLinks] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Pagination states for sample links
    const [sampleLinks, setSampleLinks] = useState<any[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const { data: stats, isLoading: statsLoading } = useSWR('/api/seo/crawler', fetcher, {
        onSuccess: (data) => {
            if (offset === 0 && data.samples) {
                setSampleLinks(data.samples);
                setHasMore(data.hasMore);
            }
        }
    });

    const handleLoadMore = async () => {
        const nextOffset = offset + 40;
        setIsLoadingMore(true);
        try {
            const response = await fetch(`/api/seo/crawler?offset=${nextOffset}&limit=40`);
            const result = await response.json();
            if (result.success) {
                setSampleLinks(prev => [...prev, ...result.data.samples]);
                setHasMore(result.data.hasMore);
                setOffset(nextOffset);
            }
        } catch (err) {
            console.error('Failed to load more links', err);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleStartCrawl = async () => {
        setIsCrawling(true);
        setError(null);
        setCrawlResult(null);

        try {
            const response = await fetch('/api/seo/crawler', {
                method: 'POST',
                body: JSON.stringify({}), // Limit kaldırıldı, tümü taranacak
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            if (data.success) {
                setCrawlResult(data.data);
                // Önemli: Tarama bittiğinde verileri sıfırla ve yeniden çek
                setOffset(0);
                setSampleLinks([]); // Önce temizle
                await mutate('/api/seo/crawler'); // Sonra güncel istatistikleri çek
            } else {
                setError(data.error || 'Tarama sırasında bir hata oluştu.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsCrawling(false);
        }
    };

    const handleSearchIncoming = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchUrl) return;

        setIsSearching(true);
        try {
            const formattedUrl = searchUrl.startsWith('http') ? searchUrl : `https://uygunbakim.com${searchUrl.startsWith('/') ? '' : '/'}${searchUrl}`;
            const response = await fetch(`/api/seo/crawler/incoming?url=${encodeURIComponent(formattedUrl)}`);
            const data = await response.json();
            if (data.success) {
                setIncomingLinks(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="view">
            <div className="view__header">
                <div>
                    <h2 className="view__title">İç Link Crawler & Analiz</h2>
                    <p className="view__subtitle">Site içi bağlantı haritasını çıkarın, yetim sayfaları bulun ve link gücünü analiz edin.</p>
                </div>
                <div className="view__actions">
                    <button
                        className="btn btn--primary"
                        onClick={handleStartCrawl}
                        disabled={isCrawling}
                    >
                        {isCrawling ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                        {isCrawling ? 'Tam Tarama Sürüyor...' : 'Tüm Siteyi Tara'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-row">
                <StatCard
                    label="Toplam Link İlişkisi"
                    value={stats?.totalLinks?.toLocaleString() || '0'}
                    change="Mevcut"
                    up={true}
                    icon={<Network size={18} />}
                    color="purple"
                />
                <StatCard
                    label="Taranan Sayfa (Kaynak)"
                    value={stats?.totalLinks > 0 ? (stats?.totalLinks / 15).toFixed(0) : '0'}
                    change="Tahmini"
                    up={true}
                    icon={<Globe size={18} />}
                    color="blue"
                />
                <StatCard
                    label="Kritik Sayfalar"
                    value="--"
                    change="Beta"
                    up={true}
                    icon={<AlertCircle size={18} />}
                    color="orange"
                />
                <StatCard
                    label="Link Gücü"
                    value="%"
                    change="Hesaplanıyor"
                    up={true}
                    icon={<LinkIcon size={18} />}
                    color="green"
                />
            </div>

            <div className="grid-3-1 mt-6">
                {/* Main Content: Search Incoming Links */}
                <div className="space-y-6">
                    <div className="panel">
                        <div className="panel__header">
                            <h3 className="panel__title">
                                <Search size={16} className="panel__title-icon" />
                                Sayfaya Gelen Linkleri Sorgula (Backlink Map)
                            </h3>
                        </div>
                        <div className="panel__body">
                            <form onSubmit={handleSearchIncoming} className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    className="input flex-1"
                                    placeholder="örn: /blog/mad-parfum-muadil-listesi"
                                    value={searchUrl}
                                    onChange={(e) => setSearchUrl(e.target.value)}
                                />
                                <button type="submit" className="btn btn--secondary" disabled={isSearching}>
                                    {isSearching ? <Loader2 className="animate-spin" size={16} /> : 'Sorgula'}
                                </button>
                            </form>

                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Kaynak Sayfa (Link Veren)</th>
                                            <th>Anchor Text (Link Metni)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {incomingLinks.length > 0 ? (
                                            incomingLinks.map((link, idx) => (
                                                <tr key={idx}>
                                                    <td className="text-sm font-mono truncate max-w-xs">{link.source_page.replace('https://uygunbakim.com', '')}</td>
                                                    <td className="text-sm">
                                                        <span className="badge badge--info">{link.anchor_text}</span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={2} className="text-center py-6 text-gray-400 text-sm">
                                                    Henüz bir sorgu yapılmadı veya link bulunamadı.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="panel">
                        <div className="panel__header">
                            <h3 className="panel__title">
                                <Network size={16} className="panel__title-icon" />
                                İç Link Haritası (Kuyruk: {stats?.totalLinks || 0} Bağlantı)
                            </h3>
                        </div>
                        <div className="panel__body">
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>URL</th>
                                            <th className="text-right">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sampleLinks.length > 0 ? (
                                            sampleLinks.map((link: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="text-sm flex items-center gap-2">
                                                        <ChevronRight size={14} className="text-gray-400" />
                                                        <span className="truncate max-w-sm">{link.target_page}</span>
                                                    </td>
                                                    <td className="text-right">
                                                        <a href={link.target_page} target="_blank" className="btn-icon">
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={2} className="text-center py-4 text-sm text-gray-400">Veri yok.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {hasMore && sampleLinks.length > 0 && (
                                <div className="mt-4 text-center">
                                    <button
                                        className="btn btn--secondary w-full"
                                        onClick={handleLoadMore}
                                        disabled={isLoadingMore}
                                    >
                                        {isLoadingMore ? <Loader2 className="animate-spin" size={14} /> : 'Daha Fazla Yükle'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Status & Info */}
                <div className="space-y-4">
                    <div className="panel bg-primary text-white p-4 rounded-xl border-0 shadow-lg">
                        <h4 className="font-bold mb-2 flex items-center gap-2">
                            <AlertCircle size={16} /> Crawler Durumu
                        </h4>
                        <p className="text-xs opacity-90 mb-4">
                            Crawler şu an sitemap'teki tüm URL'leri tarayacak şekilde ayarlanmıştır.
                        </p>
                        {isCrawling && (
                            <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                                <Loader2 className="animate-spin" size={14} /> Tarama devam ediyor...
                            </div>
                        )}
                        {!isCrawling && crawlResult && (
                            <div className="mt-2 bg-white/20 p-2 rounded text-xs">
                                <b>Sonuç:</b> {crawlResult.result.success} başarılı.
                            </div>
                        )}
                    </div>

                    <div className="panel p-4">
                        <h4 className="font-semibold text-sm mb-2">Crawler Notları</h4>
                        <ul className="text-xs space-y-2 text-gray-500">
                            <li>• Her istekte 200ms gecikme uygulanır.</li>
                            <li>• Sadece "internal" linkler kaydedilir.</li>
                            <li>• Trailing slash'ler otomatik temizlenir.</li>
                            <li>• Aynı linkler UPSERT mantığıyla güncellenir.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert--error mt-4">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
