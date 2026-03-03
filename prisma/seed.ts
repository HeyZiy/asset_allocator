/**
 * 默认测试配置 - 按账户分组，使用真实 ETF 代码
 * 长钱 银河证券 8w, 博弈仓 东方 1w, 稳健 京东金融 5w, 活钱 4w
 */

import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client';

const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.transaction.deleteMany();
  await prisma.assetAllocation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.account.deleteMany();

  const accountChangqian = await prisma.account.create({
    data: { name: '长钱 银河证券', platform: '银河证券', targetAmount: 80000 },
  });
  const accountBoyi = await prisma.account.create({
    data: { name: '博弈仓 东方', platform: '东方', targetAmount: 10000 },
  });
  const accountWenjian = await prisma.account.create({
    data: { name: '稳健 京东金融', platform: '京东金融', targetAmount: 50000 },
  });
  const accountHuogian = await prisma.account.create({
    data: { name: '活钱', platform: null, targetAmount: 40000 },
  });

  // 真实 ETF 代码
  const assetData = [
    { name: '中证500ETF', symbol: '510500', type: 'stock', currentPrice: null },
    { name: '沪深300ETF', symbol: '510300', type: 'stock', currentPrice: null },
    { name: '红利ETF', symbol: '510880', type: 'stock', currentPrice: null },
    { name: '主要消费ETF', symbol: '159928', type: 'stock', currentPrice: null },
    { name: '短债ETF', symbol: '511380', type: 'bond', currentPrice: null },
    { name: '纳指100ETF', symbol: '513100', type: 'stock', currentPrice: null },
    { name: '标普500ETF', symbol: '513500', type: 'stock', currentPrice: null },
    { name: '黄金ETF', symbol: '518880', type: 'stock', currentPrice: null },
    { name: '国债ETF', symbol: '511080', type: 'bond', currentPrice: null },
    { name: '华宝添益', symbol: '511880', type: 'cash', currentPrice: null },
  ];

  for (const a of assetData) {
    await prisma.asset.create({ data: a });
  }
  const assets = await prisma.asset.findMany({ orderBy: { id: 'asc' } });
  const bySymbol = (s: string) => assets.find((a) => a.symbol === s)!;

  // 长钱 银河证券：25% a500, 10% hs300, 25% 红利, 15% 主要消费, 10% 短债, 10% 海外(纳指+标普各半), 5% 黄金
  const changqianAllocs = [
    { symbol: '510500', targetPct: 25 },
    { symbol: '510300', targetPct: 10 },
    { symbol: '510880', targetPct: 25 },
    { symbol: '159928', targetPct: 15 },
    { symbol: '511380', targetPct: 10 },
    { symbol: '513100', targetPct: 5 },
    { symbol: '513500', targetPct: 5 },
    { symbol: '518880', targetPct: 5 },
  ];
  for (const { symbol, targetPct } of changqianAllocs) {
    await prisma.assetAllocation.create({
      data: { accountId: accountChangqian.id, assetId: bySymbol(symbol).id, targetPct },
    });
  }

  // 博弈仓 东方：趋势交易，需用户自行添加标的
  // 稳健 京东金融：80% 债基, 5% 红利, 5% 主动基金, 10% 货币
  const wenjianAllocs = [
    { symbol: '511080', targetPct: 80 },
    { symbol: '510880', targetPct: 5 },
    { symbol: '511880', targetPct: 15 },
  ];
  for (const { symbol, targetPct } of wenjianAllocs) {
    await prisma.assetAllocation.create({
      data: { accountId: accountWenjian.id, assetId: bySymbol(symbol).id, targetPct },
    });
  }

  // 活钱：100% 货币
  await prisma.assetAllocation.create({
    data: { accountId: accountHuogian.id, assetId: bySymbol('511880').id, targetPct: 100 },
  });

  console.log('✅ 种子数据已写入：4 个账户，10 个资产（真实ETF代码）');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
