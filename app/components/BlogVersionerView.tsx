'use client';

import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import {
    Layers, Play, Loader2, AlertCircle, CheckCircle2,
    History, Diff, ChevronRight, Globe, Search, ArrowLeft
} from 'lucide-react';
import { StatCard } from './shared/StatCard';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { html as beautifyHtml } from 'js-beautify';

const fetcher = (url: string) => fetch(url).then(async res => {
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'API Error');
    return json.data;
});

interface BlogPage {
    id: string;
    url: string;
    last_scanned: string;
    last_version: number;
    created_at: string;
    snapshots: { count: number }[];
}

interface Version {
    id: string;
    version: number;
    created_at: string;
    checksum: string;
    html_content?: string;
}

export function BlogVersionerView() {
    const [isScanning, setIsScanning] = useState(false);
    const [selectedPage, setSelectedPage] = useState<BlogPage | null>(null);
    const [selectedVersions, setSelectedVersions] = useState<string[]>([]); // snapshot ids
    const [showDiff, setShowDiff] = useState(false);
    const [v1Content, setV1Content] = useState('');
    const [v2Content, setV2Content] = useState('');
    const [isLoadingDiff, setIsLoadingDiff] = useState(false);

    // Fetch Pages
    const { data: pageData, isLoading: pagesLoading } = useSWR('/api/blog/pages', fetcher);
    // Fetch individual page versions if selected
    const { data: versionData, isLoading: versionsLoading, error: versionsError } = useSWR(
        selectedPage ? `/api/blog/versions?pageId=${selectedPage.id}` : null,
        fetcher
    );

    const handleStartScan = async () => {
        setIsScanning(true);
        try {
            const res = await fetch('/api/blog/scan', { method: 'POST' });
            const result = await res.json();
            if (result.success) {
                mutate('/api/blog/pages');
            }
        } catch (err) {
            console.error('Scan failed', err);
        } finally {
            setIsScanning(false);
        }
    };

    const handleVersionSelect = (id: string) => {
        if (selectedVersions.includes(id)) {
            setSelectedVersions(prev => prev.filter(v => v !== id));
        } else {
            if (selectedVersions.length >= 2) {
                // Replace the oldest one or just keep last 2
                setSelectedVersions([selectedVersions[1], id]);
            } else {
                setSelectedVersions(prev => [...prev, id]);
            }
        }
    };

    const handleCompare = async () => {
        if (selectedVersions.length !== 2) return;

        setIsLoadingDiff(true);
        setShowDiff(true);

        try {
            const v1Id = selectedVersions[0];
            const v2Id = selectedVersions[1];

            // Fetch all versions with HTML for this page
            const res = await fetch(`/api/blog/versions?pageId=${selectedPage!.id}&includeHtml=true`).then(r => r.json());

            if (res.success) {
                const versionsArr = res.data.versions;
                const vA = versionsArr.find((v: any) => v.id.toString() === v1Id);
                const vB = versionsArr.find((v: any) => v.id.toString() === v2Id);

                if (vA && vB) {
                    // Beautify both HTML contents to make comparison line-by-line
                    const beautifyOptions = {
                        indent_size: 2,
                        wrap_line_length: 80,
                        preserve_newlines: true,
                        max_preserve_newlines: 2
                    };

                    const bV1 = beautifyHtml(vA.html_content || '', beautifyOptions);
                    const bV2 = beautifyHtml(vB.html_content || '', beautifyOptions);

                    // Sort chronologically: older is v1Content, newer is v2Content
                    if (vA.version < vB.version) {
                        setV1Content(bV1);
                        setV2Content(bV2);
                    } else {
                        setV1Content(bV2);
                        setV2Content(bV1);
                    }
                } else {
                    console.error('Selected versions not found in API response');
                }
            }
        } catch (err) {
            console.error('Diff loading failed', err);
        } finally {
            setIsLoadingDiff(false);
        }
    };

    if (showDiff) {
        return (
            <div className="view">
                <div className="view__header">
                    <button className="btn btn--secondary mb-4" onClick={() => setShowDiff(false)}>
                        <ArrowLeft size={16} /> Geri Dön
                    </button>
                    <h2 className="view__title">Sürüm Karşılaştırması</h2>
                    <p className="view__subtitle">{selectedPage?.url.replace('https://uygunbakim.com', '')}</p>
                </div>

                <div className="panel mt-4 overflow-hidden">
                    {isLoadingDiff ? (
                        <div className="p-20 text-center">
                            <Loader2 className="animate-spin mx-auto mb-4 text-primary" size={48} />
                            <p>Değişiklikler hesaplanıyor...</p>
                        </div>
                    ) : (
                        <div className="diff-container bg-[#0d1117] rounded-lg border border-white/5 overflow-hidden">
                            <ReactDiffViewer
                                oldValue={v1Content}
                                newValue={v2Content}
                                splitView={true}
                                compareMethod={DiffMethod.LINES}
                                leftTitle={`Versiyon 1 (Eski)`}
                                rightTitle={`Versiyon 2 (Yeni)`}
                                useDarkTheme={true}
                                styles={{
                                    variables: {
                                        dark: {
                                            diffViewerBackground: '#0d1117',
                                            addedBackground: '#161b22',
                                            addedColor: '#3fb950',
                                            removedBackground: '#161b22',
                                            removedColor: '#f85149',
                                            wordAddedBackground: '#238636',
                                            wordRemovedBackground: '#da3633',
                                        }
                                    },
                                    contentText: {
                                        fontSize: '12px',
                                        lineHeight: '20px',
                                        fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace'
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="view">
            <div className="view__header">
                <div>
                    <h2 className="view__title">Blog Değişiklik Yönetimi</h2>
                    <p className="view__subtitle">Blog sayfalarındaki HTML değişikliklerini Git benzeri bir yapıyla takip edin.</p>
                </div>
                <div className="view__actions flex items-center gap-4">
                    {pageData?.pages && pageData.pages.length > 0 && (
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Sistem Son Tarama</p>
                            <p className="text-sm font-mono text-gray-600">
                                {new Date(Math.max(...pageData.pages.map((p: any) => new Date(p.last_scanned).getTime()))).toLocaleString('tr-TR')}
                            </p>
                        </div>
                    )}
                    <button
                        className="btn btn--primary"
                        onClick={handleStartScan}
                        disabled={isScanning}
                    >
                        {isScanning ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                        {isScanning ? 'Blog Taranıyor...' : 'Tümünü Tekrar Tara'}
                    </button>
                </div>
            </div>

            <div className="stats-row">
                <StatCard
                    label="Takip Edilen Sayfa"
                    value={pageData?.totalPages || '0'}
                    change="Blog"
                    up={true}
                    icon={<Globe size={18} />}
                    color="blue"
                />
                <StatCard
                    label="Toplam Versiyon"
                    value={pageData?.pages?.reduce((acc: number, p: any) => acc + (p.last_version || 0), 0) || '0'}
                    change="Snapshot"
                    up={true}
                    icon={<Layers size={18} />}
                    color="purple"
                />
            </div>

            <div className="grid-3-1 mt-6">
                <div className="space-y-6">
                    <div className="panel">
                        <div className="panel__header">
                            <h3 className="panel__title">
                                <Search size={16} className="panel__title-icon" />
                                Blog Sayfaları Listesi
                            </h3>
                        </div>
                        <div className="panel__body">
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>URL</th>
                                            <th>Sürüm</th>
                                            <th>Son Güncelleme</th>
                                            <th className="text-right px-4">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageData?.pages?.map((page: BlogPage) => (
                                            <tr
                                                key={page.id}
                                                className={`cursor-pointer hover:bg-gray-50 border-l-4 transition-all ${selectedPage?.id === page.id ? 'bg-primary/5 border-primary shadow-sm' : 'border-transparent'
                                                    }`}
                                                onClick={() => { setSelectedPage(page); setSelectedVersions([]); }}
                                            >
                                                <td className="text-sm font-medium py-3">
                                                    <div className="truncate max-w-[200px] sm:max-w-xs">{page.url.replace('https://uygunbakim.com', '')}</div>
                                                </td>
                                                <td>
                                                    <span className="badge badge--info px-2 py-0.5 font-bold">v{page.last_version}</span>
                                                </td>
                                                <td className="text-xs text-gray-600 font-medium">
                                                    {(page as any).last_version_at ? new Date((page as any).last_version_at).toLocaleString('tr-TR') : 'Kayıt yok'}
                                                </td>
                                                <td className="text-right pr-4">
                                                    <ChevronRight size={16} className={`${selectedPage?.id === page.id ? 'text-primary' : 'text-gray-300'} inline`} />
                                                </td>
                                            </tr>
                                        ))}
                                        {(!pageData || pageData.pages?.length === 0) && (
                                            <tr><td colSpan={4} className="text-center py-10 text-gray-400">Blog sayfası bulunamadı. Lütfen "Taramayı Başlat" butonuyla sitemap'i tarayın.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {selectedPage ? (
                        <div className="panel">
                            <div className="panel__header">
                                <h3 className="panel__title"><History size={16} className="panel__title-icon" /> Sürüm Geçmişi</h3>
                            </div>
                            <div className="panel__body p-0">
                                <div className="p-4 border-b bg-gray-50/50">
                                    <p className="text-xs font-mono truncate">{selectedPage.url}</p>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
                                    {versionsLoading ? (
                                        <div className="py-8 text-center text-gray-400">
                                            <Loader2 className="animate-spin inline mr-2" size={18} />
                                            Yükleniyor...
                                        </div>
                                    ) : versionData?.versions && versionData.versions.length > 0 ? (
                                        versionData.versions.map((v: Version) => {
                                            const isSelected = selectedVersions.includes(v.id.toString());
                                            return (
                                                <div
                                                    key={v.id.toString()}
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '12px',
                                                        borderRadius: '8px',
                                                        border: `1px solid ${isSelected ? '#3b82f6' : 'rgba(255,255,255,0.05)'}`,
                                                        background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                                                        cursor: 'pointer',
                                                        marginBottom: '8px'
                                                    }}
                                                    onClick={() => handleVersionSelect(v.id.toString())}
                                                >
                                                    {/* Custom Checkbox Box */}
                                                    <div style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        flexShrink: 0,
                                                        borderRadius: '4px',
                                                        border: `2px solid ${isSelected ? '#3b82f6' : 'rgba(255,255,255,0.3)'}`,
                                                        background: isSelected ? '#3b82f6' : 'transparent',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {isSelected && <CheckCircle2 size={12} color="white" strokeWidth={3} />}
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: '14px',
                                                            fontWeight: '800',
                                                            color: isSelected ? '#3b82f6' : '#ffffff',
                                                            lineHeight: '1'
                                                        }}>
                                                            Sürüm {v.version}
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: '#a1a1aa', marginTop: '4px' }}>
                                                            {new Date(v.created_at).toLocaleString('tr-TR')}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="py-12 text-center text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                                            <Layers className="mx-auto mb-3 opacity-20" size={32} />
                                            <p className="text-sm font-medium">Kayıt bulunamadı.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 bg-gray-50 border-t">
                                    <button
                                        className={`btn w-full flex items-center justify-center gap-2 py-3 font-bold transition-all ${selectedVersions.length === 2
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02]'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                        disabled={selectedVersions.length !== 2 || isLoadingDiff}
                                        onClick={handleCompare}
                                    >
                                        {isLoadingDiff ? (
                                            <Loader2 className="animate-spin" size={16} />
                                        ) : (
                                            <Diff size={16} />
                                        )}
                                        {selectedVersions.length === 2 ? (
                                            <span>
                                                Karşılaştır:
                                                {(() => {
                                                    const vA = versionData.versions.find((v: any) => v.id.toString() === selectedVersions[0]);
                                                    const vB = versionData.versions.find((v: any) => v.id.toString() === selectedVersions[1]);
                                                    return vA && vB ? ` v${vA.version} vs v${vB.version}` : ' Seçilenler';
                                                })()}
                                            </span>
                                        ) : (
                                            `Karşılaştırmak için 2 sürüm seçin (${selectedVersions.length}/2)`
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="panel p-8 text-center text-gray-400 border-dashed border-2">
                            <Layers size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Geçmişi görmek için bir sayfa seçin.</p>
                        </div>
                    )}

                    <div className="panel p-4">
                        <h4 className="font-semibold text-sm mb-2">Nasıl Çalışır?</h4>
                        <ul className="text-xs space-y-2 text-gray-500">
                            <li>• Sayfalar taranırken sadece <b>içerik alanı</b> (main/article) baz alınır.</li>
                            <li>• Stil ve scriptler karşılaştırma dışında tutulur.</li>
                            <li>• Her sürüm (v1, v2...) DB'de saklanır.</li>
                            <li>• İki sürüm seçerek aradaki satır bazlı farkları görebilirsiniz.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
