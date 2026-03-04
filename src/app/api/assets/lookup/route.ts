import { NextRequest, NextResponse } from 'next/server';
import { enrichAssetFromEastMoney } from '@/lib/price-fetcher';

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }

    const enriched = await enrichAssetFromEastMoney(symbol);
    
    return NextResponse.json(enriched || {});
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to lookup asset' }, { status: 500 });
  }
}
