import React from 'react';

export function ActionItem({ severity, icon, title, desc, score, onClick }: {
    severity: 'critical' | 'warning' | 'info' | 'positive'; icon: React.ReactNode; title: string; desc: string; score: number; onClick?: () => void;
}) {
    return (
        <div className={`action-item ${onClick ? 'action-item--clickable' : ''}`} onClick={onClick}>
            <div className={`action-item__severity action-item__severity--${severity}`}>{icon}</div>
            <div className="action-item__content">
                <div className="action-item__title">{title}</div>
                <div className="action-item__desc">{desc}</div>
            </div>
            <div className="action-item__score">{score}</div>
        </div>
    );
}
