import React from 'react';

export function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
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
