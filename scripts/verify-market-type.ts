import prisma from '../src/lib/db';

async function main() {
  const account = await prisma.account.findFirst({ orderBy: { id: 'asc' } });
  if (!account) {
    console.log('NO_ACCOUNT');
    return;
  }

  const updated = await prisma.account.update({
    where: { id: account.id },
    data: { marketType: 'otc' },
  });

  console.log('OK', updated.id, updated.marketType);
}

main()
  .catch((error) => {
    console.error('ERR', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
