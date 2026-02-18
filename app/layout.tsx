import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'GSC Analytics — uygunbakim.com',
    description: 'Google Search Console analytics dashboard for uygunbakim.com blog tracking',
    icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="tr">
            <body>{children}</body>
        </html>
    );
}
