import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      include: {
        allocations: { include: { asset: true } },
        transactions: { include: { asset: true } },
      },
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(accounts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const account = await prisma.account.create({
      data: {
        name: data.name,
        platform: data.platform ?? null,
        targetAmount: data.targetAmount ?? null,
      },
    });
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
