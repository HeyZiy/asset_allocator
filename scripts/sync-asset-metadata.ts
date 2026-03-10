import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';
import { enrichAssetFromEastMoney } from '../src/lib/price-fetcher';

const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany({
    select: { id: true, symbol: true, name: true, currentPrice: true },
    orderBy: { id: 'asc' },
  });

  if (assets.length === 0) {
    console.log('没有资产需要修正');
    return;
  }

  let updatedNameCount = 0;
  let updatedPriceCount = 0;
  let unchangedCount = 0;
  let failedCount = 0;

  for (const asset of assets) {
    try {
      const enriched = await enrichAssetFromEastMoney(asset.symbol);

      const nextName = enriched.name?.trim();
      const nextPrice = enriched.currentPrice;

      const data: { name?: string; currentPrice?: number; lastPriceUpdated?: Date } = {};

      if (nextName && nextName !== asset.name) {
        data.name = nextName;
      }

      if (typeof nextPrice === 'number' && Number.isFinite(nextPrice) && nextPrice > 0) {
        if (asset.currentPrice == null || Math.abs(asset.currentPrice - nextPrice) > 1e-8) {
          data.currentPrice = nextPrice;
          data.lastPriceUpdated = new Date();
        }
      }

      if (Object.keys(data).length > 0) {
        await prisma.asset.update({
          where: { id: asset.id },
          data,
        });

        if (data.name) updatedNameCount += 1;
        if (data.currentPrice != null) updatedPriceCount += 1;

        console.log(`UPDATED ${asset.symbol} -> name:${data.name ? 'Y' : 'N'} price:${data.currentPrice != null ? data.currentPrice : 'N'}`);
      } else {
        unchangedCount += 1;
        console.log(`UNCHANGED ${asset.symbol}`);
      }
    } catch (error) {
      failedCount += 1;
      console.error(`FAILED ${asset.symbol}`, error);
    }
  }

  console.log('--- SUMMARY ---');
  console.log(`Total: ${assets.length}`);
  console.log(`Name updated: ${updatedNameCount}`);
  console.log(`Price updated: ${updatedPriceCount}`);
  console.log(`Unchanged: ${unchangedCount}`);
  console.log(`Failed: ${failedCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
