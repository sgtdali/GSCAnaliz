import React from 'react';

export function StatCard({ label, value, change, up, icon, color }: {
    label: string; value: string; change: string; up: boolean; icon: React.ReactNode; color: string;
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
