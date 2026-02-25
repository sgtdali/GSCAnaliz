import React from 'react';
import { TrendingUp, FileText, Settings, Info } from 'lucide-react';

export function ChangeLogView({ data }: { data: any }) {
    if (!data) return <div className="panel__body">Yükleniyor...</div>;

    const getIcon = (type: string) => {
        switch (type) {
            case 'title': return <TrendingUp size={12} />;
            case 'content': return <FileText size={12} />;
            case 'tech': return <Settings size={12} />;
            default: return <Info size={12} />;
        }
    };

    return (
        <div className="panel">
            <div className="panel__header">
                <h3 className="panel__title"><FileText size={16} className="panel__title-icon" /> Değişiklik Günlüğü</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{data.length} kayıt</span>
            </div>
            <div className="panel__body">
                <div className="changelog">
                    {data.map((log: any, i: number) => (
                        <div key={i} className="changelog__item">
                            <div className="changelog__dot-line">
                                <div className="changelog__dot" />
                                {i < data.length - 1 && <div className="changelog__line" />}
                            </div>
                            <div className="changelog__content">
                                <span className={`changelog__type changelog__type--${log.change_type}`}>
                                    {getIcon(log.change_type)} {log.change_type.toUpperCase()}
                                </span>
                                <div className="changelog__text">{log.description}</div>
                                <div className="changelog__meta">{log.page.replace('https://uygunbakim.com', '')} · {new Date(log.changed_at).toLocaleDateString()} · {log.actor}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
