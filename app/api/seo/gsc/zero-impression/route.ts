import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/gsc/auth';

export const maxDuration = 300;

async function fetchSitemapUrls(): Promise<string[]> {
    const sitemapUrl = 'https://uygunbakim.com/sitemap.xml';
    const response = await fetch(sitemapUrl);
    const xml = await response.text();

    // Extract all <loc> URLs from sitemap XML
    const urlRegex = /<loc>(.*?)<\/loc>/g;
    const urls: string[] = [];
    let match;

    while ((match = urlRegex.exec(xml)) !== null) {
        urls.push(match[1]);
    }

    return urls;
}

async function fetchGSCUrls(): Promise<Set<string>> {
    const auth = await getAuthenticatedClient();
    const siteUrl = process.env.GSC_SITE_URL || 'sc-domain:uygunbakim.com';

    const allUrls = new Set<string>();
    let startRow = 0;
    const rowLimit = 25000;

    while (true) {
        const response = await fetch(
            `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.credentials.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    startDate: '2020-01-01',
                    endDate: new Date().toISOString().split('T')[0],
                    dimensions: ['page'],
                    rowLimit,
                    startRow,
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`GSC API Error: ${response.status} - ${error}`);
        }

        const data = await response.json();

        if (!data.rows || data.rows.length === 0) break;

        for (const row of data.rows) {
            allUrls.add(row.keys[0]);
        }

        if (data.rows.length < rowLimit) break;
        startRow += rowLimit;
    }

    return allUrls;
}

export async function GET() {
    try {
        // Fetch both data sources in parallel
        const [sitemapUrls, gscUrls] = await Promise.all([
            fetchSitemapUrls(),
            fetchGSCUrls(),
        ]);

        // Filter: only /product/ URLs from sitemap
        const sitemapProductUrls = sitemapUrls.filter(url => url.includes('/product/'));
        const sitemapBlogUrls = sitemapUrls.filter(url => url.includes('/blog/'));
        const sitemapOtherUrls = sitemapUrls.filter(url => !url.includes('/product/') && !url.includes('/blog/'));

        // Find URLs in sitemap but NOT in GSC (zero impressions)
        const zeroImpressionProducts = sitemapProductUrls.filter(url => !gscUrls.has(url));
        const zeroImpressionBlogs = sitemapBlogUrls.filter(url => !gscUrls.has(url));
        const zeroImpressionOther = sitemapOtherUrls.filter(url => !gscUrls.has(url));

        // Also find URLs in GSC but NOT in sitemap (orphan pages)
        const gscProductUrls = Array.from(gscUrls).filter(url => url.includes('/product/'));
        const orphanProducts = gscProductUrls.filter(url => !sitemapUrls.includes(url));

        return NextResponse.json({
            success: true,
            data: {
                sitemap: {
                    totalUrls: sitemapUrls.length,
                    productUrls: sitemapProductUrls.length,
                    blogUrls: sitemapBlogUrls.length,
                    otherUrls: sitemapOtherUrls.length,
                },
                gsc: {
                    totalUrlsWithImpressions: gscUrls.size,
                    productUrlsWithImpressions: gscProductUrls.length,
                },
                zeroImpressions: {
                    products: zeroImpressionProducts.sort(),
                    productCount: zeroImpressionProducts.length,
                    blogs: zeroImpressionBlogs.sort(),
                    blogCount: zeroImpressionBlogs.length,
                    other: zeroImpressionOther.sort(),
                    otherCount: zeroImpressionOther.length,
                    totalCount: zeroImpressionProducts.length + zeroImpressionBlogs.length + zeroImpressionOther.length,
                },
                orphanPages: {
                    products: orphanProducts.sort(),
                    count: orphanProducts.length,
                },
            },
            meta: {
                generatedAt: new Date().toISOString(),
                gscDateRange: '2020-01-01 — ' + new Date().toISOString().split('T')[0],
            },
        });
    } catch (error: any) {
        console.error('Zero impression analysis error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
