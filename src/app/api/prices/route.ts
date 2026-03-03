import { NextRequest, NextResponse } from 'next/server';
import { getPriceBySymbolDate } from '@/lib/price-fetcher';

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');
    const date = request.nextUrl.searchParams.get('date');
    if (!symbol || !date) {
      return NextResponse.json({ error: '缺少 symbol 或 date' }, { status: 400 });
    }

    const dateObj = new Date(date);
    const price = await getPriceBySymbolDate(symbol, dateObj);

    if (price == null) {
      return NextResponse.json({ error: '该资产暂无行情或未获取到该日期数据，请手动输入价格', price: null }, { status: 200 });
    }

    return NextResponse.json({ price });
  } catch (error) {
    console.error('Price fetch error:', error);
    return NextResponse.json({ error: '获取价格失败', price: null }, { status: 500 });
  }
}
