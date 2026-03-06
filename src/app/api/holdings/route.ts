import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const accountId = Number(data.accountId);
    const shares = Number(data.shares);
    const avgCost = data.avgCost != null && data.avgCost !== '' ? Number(data.avgCost) : undefined;
    const currentPrice = data.currentPrice != null && data.currentPrice !== '' ? Number(data.currentPrice) : undefined;

    if (!accountId || Number.isNaN(accountId)) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    if (Number.isNaN(shares) || shares < 0) {
      return NextResponse.json({ error: 'shares must be a non-negative number' }, { status: 400 });
    }

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.marketType !== 'otc') {
      return NextResponse.json({ error: 'Only OTC accounts support manual holding record' }, { status: 400 });
    }

    let assetId = data.assetId ? Number(data.assetId) : undefined;

    if (!assetId) {
      const symbol = String(data.symbol || '').trim();
      const name = String(data.name || symbol).trim();
      const assetType = String(data.assetType || 'fund');

      if (!symbol) {
        return NextResponse.json({ error: 'assetId or symbol is required' }, { status: 400 });
      }

      const existing = await prisma.asset.findUnique({ where: { symbol } });
      if (existing) {
        assetId = existing.id;
      } else {
        const created = await prisma.asset.create({
          data: {
            symbol,
            name,
            type: assetType,
            currentPrice: currentPrice ?? 0,
            lastPriceUpdated: currentPrice != null ? new Date() : undefined,
          },
        });
        assetId = created.id;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      if (currentPrice != null && !Number.isNaN(currentPrice) && currentPrice >= 0) {
        await tx.asset.update({
          where: { id: assetId! },
          data: {
            currentPrice,
            lastPriceUpdated: new Date(),
          },
        });
      }

      if (shares === 0) {
        await tx.holding.deleteMany({
          where: { accountId, assetId: assetId! },
        });

        return {
          accountId,
          assetId,
          shares: 0,
          avgCost: avgCost ?? 0,
        };
      }

      const holding = await tx.holding.upsert({
        where: { accountId_assetId: { accountId, assetId: assetId! } },
        create: {
          accountId,
          assetId: assetId!,
          shares,
          avgCost: avgCost ?? currentPrice ?? 0,
        },
        update: {
          shares,
          ...(avgCost != null ? { avgCost } : {}),
        },
        include: {
          asset: true,
          account: true,
        },
      });

      return holding;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to record holding' }, { status: 500 });
  }
}
