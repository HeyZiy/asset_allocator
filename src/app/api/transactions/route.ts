import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getPriceBySymbolDate } from '@/lib/price-fetcher';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    const transactions = await prisma.transaction.findMany({
      where: accountId ? { accountId: parseInt(accountId) } : undefined,
      include: {
        asset: true,
        account: true,
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    let price = data.price;
    let amount = data.amount;
    const date = new Date(data.date);
    const shares = data.shares ?? 0;

    if ((price == null || price === 0) && shares > 0) {
      const asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
      if (asset?.symbol) {
        const fetched = await getPriceBySymbolDate(asset.symbol, date);
        if (fetched != null) {
          price = fetched;
          amount = Math.round(shares * price * 100) / 100;
        }
      }
    }
    if (price == null || price === 0 || amount == null || amount === 0) {
      return NextResponse.json({ error: '请填写价格和金额，或填写份额+日期并选择支持行情接口的资产（ETF 510xxx/159xxx 等）' }, { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId: data.accountId,
        assetId: data.assetId,
        type: data.type,
        amount,
        price,
        shares,
        date,
      },
      include: { asset: true, account: true },
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}