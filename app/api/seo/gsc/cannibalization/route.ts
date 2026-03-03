import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/middleware';
import { fetchCannibalizationData } from '@/lib/gsc/client';
import { subDays, format } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const today = new Date();
        const endDate = subDays(today, 2);
        const startDate = subDays(endDate, 30);

        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(endDate, 'yyyy-MM-dd');

        console.log(`[API /cannibalization] Fetching 30 days data: ${startDateStr} - ${endDateStr}`);

        // Increase limit to capture more data for analysis
        const data = await fetchCannibalizationData(startDateStr, endDateStr, 25000);

        const queryGroups = new Map<string, any[]>();
        for (const row of data) {
            // URL Normalizasyonu: # ve sonrasını at (Anchor link noise temizliği)
            const cleanUrl = row.page.split('#')[0];
            const existing = queryGroups.get(row.query) || [];

            // Bu sorgu için bu ANA URL zaten eklenmiş mi?
            const alreadyIn = existing.find(p => p.page === cleanUrl);

            if (alreadyIn) {
                // Aynı URL ise rakamları topla, en iyi pozisyonu tut
                alreadyIn.clicks += row.clicks;
                alreadyIn.impressions += row.impressions;
                alreadyIn.position = Math.min(alreadyIn.position, row.position);
            } else {
                existing.push({ ...row, page: cleanUrl });
            }
            queryGroups.set(row.query, existing);
        }

        const cannibalized = Array.from(queryGroups.entries())
            .map(([query, pages]) => {
                const totalClicks = pages.reduce((sum, p) => sum + p.clicks, 0);
                const totalImpressions = pages.reduce((sum, p) => sum + p.impressions, 0);

                // Filter Effective URLs: impressions > 5% of total
                const effectivePages = pages.filter(p => p.impressions > totalImpressions * 0.05)
                    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);

                if (effectivePages.length < 2) return null;

                // A) Dominance Score
                const maxClicks = effectivePages[0].clicks;
                const dominance = totalClicks > 0 ? maxClicks / totalClicks : (effectivePages[0].impressions / totalImpressions);
                let dominanceLevel = 'LOW';
                if (dominance < 0.5) dominanceLevel = 'HIGH';
                else if (dominance <= 0.75) dominanceLevel = 'MEDIUM';

                // B) Position Gap Score
                const firstPos = effectivePages[0].position;
                const secondPos = effectivePages[1].position;
                const posGap = Math.abs(firstPos - secondPos);
                let gapLevel = 'LOW';
                if (posGap < 1) gapLevel = 'HIGH';
                else if (posGap <= 3) gapLevel = 'MEDIUM';

                // C) Impression Share Balance
                const firstImp = effectivePages[0].impressions;
                const secondImp = effectivePages[1].impressions;
                const impRatio = secondImp / firstImp;
                let impLevel = 'LOW';
                if (impRatio > 0.7) impLevel = 'HIGH';
                else if (impRatio >= 0.3) impLevel = 'MEDIUM';

                // Unified Risk Calculation (0 - 100)
                const getWeight = (lvl: string) => lvl === 'HIGH' ? 100 : (lvl === 'MEDIUM' ? 50 : 0);
                const riskScore = Math.round((getWeight(dominanceLevel) + getWeight(gapLevel) + getWeight(impLevel)) / 3);

                return {
                    query,
                    totalClicks,
                    totalImpressions,
                    pageCount: effectivePages.length,
                    actualUrlCount: pages.length,
                    riskScore,
                    riskLevel: riskScore > 60 ? 'HIGH' : (riskScore > 30 ? 'MEDIUM' : 'LOW'),
                    metrics: { dominance, posGap, impRatio },
                    pages: effectivePages
                };
            })
            .filter(item => item !== null)
            .sort((a, b) => (b as any).riskScore - (a as any).riskScore || (b as any).totalClicks - (a as any).totalClicks);

        return successResponse({
            startDate: startDateStr,
            endDate: endDateStr,
            count: cannibalized.length,
            data: cannibalized.slice(0, 100)
        });

    } catch (error) {
        console.error('[API /cannibalization] Error:', error);
        return errorResponse('Cannibalization data fetch failed', 500);
    }
}
