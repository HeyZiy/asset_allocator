import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { updateAssetCurrentPrice } from '@/lib/price-fetcher';

export async function POST() {
    try {
        const assets = await prisma.asset.findMany({ select: { symbol: true } });
        // Use Promise.all with some concurrency limit if many assets, but for now simple all is fine
        const results = await Promise.allSettled(assets.map(a => updateAssetCurrentPrice(a.symbol)));
        
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
        
        return NextResponse.json({ 
            message: `Updated prices for ${successCount} out of ${assets.length} assets`,
            details: results.map((r, i) => ({ symbol: assets[i].symbol, status: r.status }))
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to refresh prices' }, { status: 500 });
    }
}
