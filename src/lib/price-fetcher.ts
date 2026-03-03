import prisma from '@/lib/db';

function getSecid(symbol: string): string | null {
  const code = symbol.replace(/\D/g, '');
  if (code.length !== 6) return null;
  const first = code.slice(0, 2);
  if (['51', '60', '58'].includes(first)) return `1.${code}`;
  if (['15', '00', '30', '16'].includes(first)) return `0.${code}`;
  return null;
}

async function fetchFromEastMoney(secid: string, dateStr: string): Promise<number | null> {
  const date = new Date(dateStr);
  const beg = new Date(date);
  beg.setDate(beg.getDate() - 10);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 10);
  const begStr = beg.toISOString().slice(0, 10).replace(/-/g, '');
  const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, '');
  const url = `http://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56&klt=101&fqt=1&secid=${secid}&beg=${begStr}&end=${endStr}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const json = await res.json();
  const klines: string[] = json?.data?.klines ?? [];
  if (klines.length === 0) return null;
  const line = klines.find((k) => k.startsWith(dateStr));
  if (line) {
    const parts = line.split(',');
    return parseFloat(parts[2]) || null;
  }
  const targetTime = new Date(dateStr).getTime();
  let nearest = klines[0];
  let minDiff = Infinity;
  for (const k of klines) {
    const kDate = k.split(',')[0];
    const diff = Math.abs(new Date(kDate).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = k;
    }
  }
  const parts = nearest.split(',');
  return parseFloat(parts[2]) || null;
}

export async function getPriceBySymbolDate(symbol: string, date: Date): Promise<number | null> {
  const dateStr = date.toISOString().slice(0, 10);
  const cached = await prisma.priceCache.findUnique({
    where: { symbol_date: { symbol, date } },
  });
  if (cached) return cached.price;
  const secid = getSecid(symbol);
  if (!secid) return null;
  const price = await fetchFromEastMoney(secid, dateStr);
  if (price == null) return null;
  await prisma.priceCache.upsert({
    where: { symbol_date: { symbol, date } },
    create: { symbol, date, price },
    update: { price, createdAt: new Date() },
  });
  return price;
}
