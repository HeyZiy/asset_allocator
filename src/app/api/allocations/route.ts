import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    const allocations = await prisma.assetAllocation.findMany({
      where: accountId ? { accountId: parseInt(accountId) } : undefined,
      include: {
        asset: true,
        account: true,
      },
    });
    return NextResponse.json(allocations);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch allocations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const allocation = await prisma.assetAllocation.create({
      data: {
        accountId: data.accountId,
        assetId: data.assetId,
        targetAmount: data.targetAmount,
      },
      include: { asset: true, account: true },
    });
    return NextResponse.json(allocation, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create allocation' }, { status: 500 });
  }
}