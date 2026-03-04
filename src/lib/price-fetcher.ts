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
  
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const json = await res.json();
    const klines: string[] = json?.data?.klines ?? [];
    if (klines.length === 0) return null;
    
    // Find exact date match or closest
    const targetTime = new Date(dateStr).getTime();
    let bestMatch = klines[0];
    let minDiff = Infinity;
    
    for (const k of klines) {
        const kDateStr = k.split(',')[0];
        const kTime = new Date(kDateStr).getTime();
        const diff = Math.abs(kTime - targetTime);
        // Prefer exact match
        if (diff === 0) {
            bestMatch = k;
            minDiff = 0;
            break;
        }
        if (diff < minDiff) {
            minDiff = diff;
            bestMatch = k;
        }
    }
    
    const parts = bestMatch.split(',');
    return parseFloat(parts[2]) || null; // f53 is close price? check fields. usually parts[2] is close in kline
  } catch (e) {
    console.error('Fetch error:', e);
    return null;
  }
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

export async function updateAssetCurrentPrice(symbol: string): Promise<number | null> {
    const secid = getSecid(symbol);
    if (!secid) return null;
    
    // Use EastMoney realtime quote or kline ending today
    // kline is safer for consistent history, but for realtime we might want real quote.
    // For now, reuse fetchFromEastMoney with today's date.
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const price = await fetchFromEastMoney(secid, dateStr);
    
    if (price !== null) {
        // Update Asset table
        await prisma.asset.update({
            where: { symbol },
            data: { 
                currentPrice: price, 
                lastPriceUpdated: new Date() 
            }
        });
    }
    return price;
}

