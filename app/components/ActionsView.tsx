import React from 'react';
import { Target, AlertTriangle, Info } from 'lucide-react';
import { ActionItem } from './shared/ActionItem';

export function ActionsView({ data, onAnalyze }: { data: any; onAnalyze: (url: string) => void }) {
    if (!data) return <div className="panel__body">Yükleniyor...</div>;

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><Target size={16} className="panel__title-icon" /> Tüm Aksiyon Önerileri</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{data.length} aksiyon · öncelik sıralı</span>
            </div>
            <div className="panel__body">
                <div className="action-list">
                    {data.map((a: any, i: number) => (
                        <ActionItem
                            key={i}
                            severity={a.priority_score > 70 ? 'critical' : a.priority_score > 40 ? 'warning' : 'info'}
                            icon={a.priority_score > 70 ? <AlertTriangle size={14} /> : <Info size={14} />}
                            title={a.action_recommendation}
                            desc={`${a.page.replace('https://uygunbakim.com', '')} — ${a.action_detail?.description || ''}`}
                            score={a.priority_score}
                            onClick={() => onAnalyze(a.page)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
