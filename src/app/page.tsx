'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RefreshCw, Plus, ArrowRight, Wallet, TrendingUp, DollarSign } from 'lucide-react';

// --- Interfaces matching new backend logic ---

interface PortfolioPosition {
  assetId: number;
  symbol: string;
  name: string;
  shares: number;
  price: number;
  currentValue: number;      // shares * price
  currentPercent: number;    // of total portfolio
  targetPercent: number;     // target allocation
  targetValue: number;
  driftValue: number;        // difference (positive = need buy)
  actionShares: number;      // suggested buy/sell shares
}

interface PortfolioAccount {
  id: number;
  name: string;
  cash: number;
  totalValue: number;        // cash + holdings
  holdingsValue: number;
}

interface PortfolioResponse {
  account: PortfolioAccount;
  positions: PortfolioPosition[];
}

// --- Main Component ---

export default function Home() {
  const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshingPrices, setRefreshingPrices] = useState(false);

  // Dialog States
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isTxOpen, setIsTxOpen] = useState(false);
  
  // Selection Context
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  
  // Forms Data
  const [newAccount, setNewAccount] = useState({ name: '', platform: '', cash: '0' });
  const [newTx, setNewTx] = useState({ 
    accountId: 0, 
    type: 'buy', 
    symbol: '', 
    shares: '0', 
    price: '', 
    date: '' 
  });

  // Init Date on client only to avoid hydration mismatch
  useEffect(() => {
    setNewTx(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
  }, []);

  // --- Data Fetching ---

  const fetchAllPortfolios = async () => {
    setLoading(true);
    try {
      // 1. Get List of Accounts
      const accRes = await fetch('/api/accounts');
            const accountsPayload = await accRes.json();

            if (!accRes.ok) {
                const message =
                    (accountsPayload && accountsPayload.error) ||
                    '账户列表获取失败';
                throw new Error(message);
            }

            const accounts = Array.isArray(accountsPayload) ? accountsPayload : [];

            if (accounts.length === 0) {
                setPortfolios([]);
                return;
            }
      
      // 2. Fetch Portfolio for each account (Parallel)
      const promises = accounts.map((acc: any) => 
        fetch(`/api/portfolio?accountId=${acc.id}`).then(r => r.json())
      );
      
      const portfolioData = await Promise.all(promises);
      setPortfolios(portfolioData.filter(p => !p.error));
    } catch (error) {
      console.error('Failed to load data', error);
            setPortfolios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPortfolios();
  }, []);

  const handleRefreshPrices = async () => {
    setRefreshingPrices(true);
    try {
        await fetch('/api/prices/refresh', { method: 'POST' });
        await fetchAllPortfolios(); // Reload data after price update
    } catch(e) {
        alert('行情更新失败');
    } finally {
        setRefreshingPrices(false);
    }
  };

  // --- Actions ---

  const handleCreateAccount = async () => {
    await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newAccount, targetAmount: 0 }),
    });
    setIsAddAccountOpen(false);
    setNewAccount({ name: '', platform: '', cash: '0' });
    fetchAllPortfolios();
  };

  const handleCreateTransaction = async () => {
    if (!newTx.accountId) return alert('请选择账户');
    if (!newTx.symbol && !newTx.price) return alert('请输入代码');
    
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newTx,
        shares: parseFloat(newTx.shares),
        price: newTx.price ? parseFloat(newTx.price) : 0,
      }),
    });
    
    if (res.ok) {
        setIsTxOpen(false);
        setNewTx({ accountId: 0, type: 'buy', symbol: '', shares: '0', price: '', date: new Date().toISOString().split('T')[0] });
        fetchAllPortfolios();
    } else {
        const err = await res.json();
        alert(err.error || '交易创建失败');
    }
  };

  // --- Helpers ---
  
  const openTxDialog = (accountId: number) => {
      setSelectedAccountId(accountId);
      setNewTx(prev => ({ ...prev, accountId, type: 'buy', symbol: '', price: '' }));
      setIsTxOpen(true);
  };
  
  const openSellDialog = (accountId: number, symbol: string, currentShares: number) => {
      setSelectedAccountId(accountId);
      setNewTx(prev => ({ 
          ...prev, 
          accountId, 
          type: 'sell', 
          symbol, 
          shares: currentShares.toString(),
          price: '' 
      }));
      setIsTxOpen(true);
  };

  const totalAssets = portfolios.reduce((sum, p) => sum + p.account.totalValue, 0);

  return (
    <div className="container mx-auto p-6 space-y-8">
      
      {/* 1. Header & Dashboard Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">资产配置仪表盘</h1>
          <p className="text-muted-foreground mt-1">
             当前总资产: <span className="text-2xl font-mono text-primary font-bold" suppressHydrationWarning>¥{totalAssets.toLocaleString()}</span>
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefreshPrices} disabled={refreshingPrices}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshingPrices ? 'animate-spin' : ''}`} />
                {refreshingPrices ? '更新最新行情...' : '刷新市值'}
            </Button>
            <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/> 新建账户</Button></DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>创建新账户</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">名称</Label>
                            <Input value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">平台</Label>
                            <Input value={newAccount.platform} onChange={e => setNewAccount({...newAccount, platform: e.target.value})} className="col-span-3" placeholder="例如: 华泰证券" />
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleCreateAccount}>创建</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      {loading && <div className="text-center py-10">加载数据中...</div>}

      {/* 2. Portfolio Cards */}
      {!loading && portfolios.map((portfolio) => (
        <Card key={portfolio.account.id} className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-gray-500"/> {portfolio.account.name}
                    </CardTitle>
                    <CardDescription>
                        {portfolio.account.cash > 0 && `现金余额: ¥${portfolio.account.cash.toLocaleString()} | `}
                         持仓市值: ¥{portfolio.account.holdingsValue.toLocaleString()}
                    </CardDescription>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold">¥{portfolio.account.totalValue.toLocaleString()}</div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>资产 (代码)</TableHead>
                            <TableHead className="text-right">持仓/价格</TableHead>
                            <TableHead className="text-right">当前市值</TableHead>
                            <TableHead className="text-right">配置比例 (目标)</TableHead>
                            <TableHead className="text-right">目标偏离 (Drift)</TableHead>
                            <TableHead className="text-right">建议操作</TableHead>
                            <TableHead className="text-right">动作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {portfolio.positions.length === 0 ? (
                           <TableRow>
                               <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                                   暂无持仓，请点击“记一笔”添加交易
                               </TableCell>
                           </TableRow>
                        ) : (
                            portfolio.positions.map((pos) => (
                                <TableRow key={pos.assetId}>
                                    <TableCell>
                                        <div className="font-medium">{pos.name || pos.symbol}</div>
                                        <div className="text-xs text-muted-foreground">{pos.symbol}</div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div>{pos.shares} 股</div>
                                        <div className="text-xs text-muted-foreground">@ {pos.price}</div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ¥{pos.currentValue.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span>{pos.currentPercent}%</span>
                                            <span className="text-xs text-muted-foreground">/ {pos.targetPercent}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={pos.driftValue > 0 ? "text-green-600" : "text-red-500"}>
                                            {pos.driftValue > 0 ? "+" : ""}{pos.driftValue.toLocaleString()}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {pos.actionShares !== 0 && (
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${pos.actionShares > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {pos.actionShares > 0 ? "买入" : "卖出"} {Math.abs(pos.actionShares)}
                                            </span>
                                        )}
                                        {pos.actionShares === 0 && <span className="text-gray-400">-</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" 
                                                onClick={() => openSellDialog(portfolio.account.id, pos.symbol, pos.shares)}>
                                                <DollarSign className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="bg-muted/50 p-3 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => openTxDialog(portfolio.account.id)}>
                    <Plus className="mr-2 h-4 w-4"/> 记一笔
                </Button>
            </CardFooter>
        </Card>
      ))}

      {/* 3. Global Dialogs */}
      
      {/* Transaction Dialog */}
      <Dialog open={isTxOpen} onOpenChange={setIsTxOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{newTx.type === 'buy' ? '买入资产' : '卖出资产'}</DialogTitle>
                <DialogDescription>
                    输入代码如果是新资产，系统会自动创建。价格留空通过接口获取。
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                     <Label className="text-right">类型</Label>
                     <Select value={newTx.type} onValueChange={v => setNewTx({...newTx, type: v})}>
                         <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                         <SelectContent>
                             <SelectItem value="buy">买入 (Buy)</SelectItem>
                             <SelectItem value="sell">卖出 (Sell)</SelectItem>
                         </SelectContent>
                     </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">账户</Label>
                    <Select value={newTx.accountId ? newTx.accountId.toString() : ''} onValueChange={v => setNewTx({...newTx, accountId: parseInt(v)})}>
                         <SelectTrigger className="col-span-3"><SelectValue placeholder="选择账户" /></SelectTrigger>
                         <SelectContent>
                             {portfolios.map(p => (
                                 <SelectItem key={p.account.id} value={p.account.id.toString()}>{p.account.name}</SelectItem>
                             ))}
                         </SelectContent>
                     </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">代码 (Symbol)</Label>
                    <Input placeholder="sh600519 / 513100" 
                           value={newTx.symbol} 
                           onChange={e => setNewTx({...newTx, symbol: e.target.value})} 
                           className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">数量 (股)</Label>
                    <Input type="number" 
                           value={newTx.shares} 
                           onChange={e => setNewTx({...newTx, shares: e.target.value})} 
                           className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">单价 (可选)</Label>
                    <Input type="number" placeholder="留空自动获取" 
                           value={newTx.price} 
                           onChange={e => setNewTx({...newTx, price: e.target.value})} 
                           className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">日期</Label>
                    <Input type="date"
                           value={newTx.date} 
                           onChange={e => setNewTx({...newTx, date: e.target.value})} 
                           className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleCreateTransaction}>提交交易</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
