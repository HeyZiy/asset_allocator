import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      include: {
        allocations: { include: { asset: true } },
        transactions: { include: { asset: true } },
        holdings: { include: { asset: true } }, // Newly added relation
      },
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error('API Error:', error); // Log actual error
    return NextResponse.json({ error: 'Failed to fetch accounts', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const account = await prisma.account.create({
      data: {
        name: data.name,
        platform: data.platform ?? null,
        targetAmount: data.targetAmount != null ? parseFloat(data.targetAmount) : null,
        cash: data.cash != null ? parseFloat(data.cash) : 0, // Handle cash
      },
    });
    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to create account', details: error.message }, { status: 500 });
  }
}
