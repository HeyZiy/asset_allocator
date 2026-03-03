'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Account {
  id: number;
  name: string;
  platform: string | null;
  targetAmount: number | null;
  allocations: { id: number; accountId: number; assetId: number; targetAmount: number; asset: Asset }[];
  transactions: { id: number; accountId: number; assetId: number; type: string; amount: number; price: number; shares: number; date: string; asset: Asset }[];
}

interface Asset {
  id: number;
  name: string;
  symbol: string;
  type: string;
  currentPrice: number | null;
}

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [addAllocationAccountId, setAddAllocationAccountId] = useState<number | null>(null);
  const [addTransactionAccountId, setAddTransactionAccountId] = useState<number | null>(null);
  const [editAllocationId, setEditAllocationId] = useState<number | null>(null);
  const [newAccount, setNewAccount] = useState({ name: '', platform: '', targetAmount: '' });
  const [newAsset, setNewAsset] = useState({ name: '', symbol: '', type: 'stock', currentPrice: 0 });
  const [newAllocation, setNewAllocation] = useState({ accountId: 0, assetId: 0, targetAmount: 0 });
  const [editAllocation, setEditAllocation] = useState({ id: 0, targetAmount: 0 });
  const [newTransaction, setNewTransaction] = useState({ accountId: 0, assetId: 0, type: 'buy', amount: 0, price: 0, shares: 0, date: new Date().toISOString().split('T')[0] });
  const [priceFetching, setPriceFetching] = useState(false);

  const handleFetchPrice = async () => {
    const asset = assets.find((a) => a.id === newTransaction.assetId);
    if (!asset?.symbol || !newTransaction.date) return;
    setPriceFetching(true);
    try {
      const res = await fetch(`/api/prices?symbol=${encodeURIComponent(asset.symbol)}&date=${newTransaction.date}`);
      const data = await res.json();
      if (data.price != null) {
        const price = data.price;
        setNewTransaction((prev) => ({
          ...prev,
          price,
          amount: prev.shares > 0 ? Math.round(prev.shares * price * 100) / 100 : prev.amount,
        }));
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert('获取价格失败');
    } finally {
      setPriceFetching(false);
    }
  };

  const fetchAllData = async () => {
    const [accountsRes, assetsRes] = await Promise.all([
      fetch('/api/accounts'),
      fetch('/api/assets'),
    ]);
    const [accountsData, assetsData] = await Promise.all([
      accountsRes.json(),
      assetsRes.json(),
    ]);
    setAccounts(accountsData);
    setAssets(assetsData);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const calculateAccountValue = (account: Account) => {
    const assetShares: Record<number, number> = {};
    for (const t of account.transactions) {
      assetShares[t.assetId] = (assetShares[t.assetId] ?? 0) + (t.type === 'buy' ? t.shares : -t.shares);
    }
    return Object.entries(assetShares).reduce((total, [assetIdStr, shares]) => {
      const asset = assets.find((a) => a.id === parseInt(assetIdStr));
      const price = asset?.currentPrice || 0;
      return total + shares * price;
    }, 0);
  };

  const calculateTotalValue = () => {
    return accounts.reduce((total, account) => total + calculateAccountValue(account), 0);
  };

  const getAccountAssetValue = (accountId: number, assetId: number) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return 0;
    const asset = assets.find((a) => a.id === assetId);
    const shares = account.transactions
      .filter((t) => t.assetId === assetId)
      .reduce((s, t) => s + (t.type === 'buy' ? t.shares : -t.shares), 0);
    const price = asset?.currentPrice || 0;
    return shares * price;
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newAccount.name,
        platform: newAccount.platform || null,
        targetAmount: newAccount.targetAmount ? parseFloat(newAccount.targetAmount) : null,
      }),
    });
    if (response.ok) {
      setIsAddAccountOpen(false);
      setNewAccount({ name: '', platform: '', targetAmount: '' });
      fetchAllData();
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAsset),
    });
    if (response.ok) {
      setIsAddAssetOpen(false);
      setNewAsset({ name: '', symbol: '', type: 'stock', currentPrice: 0 });
      fetchAllData();
    }
  };

  const handleAddAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newAllocation, accountId: addAllocationAccountId ?? newAllocation.accountId }),
    });
    if (response.ok) {
      setAddAllocationAccountId(null);
      setNewAllocation({ accountId: 0, assetId: 0, targetAmount: 0 });
      fetchAllData();
    }
  };

  const handleDeleteAllocation = async (id: number) => {
    if (!confirm('确定删除这条配置？')) return;
    const res = await fetch(`/api/allocations/${id}`, { method: 'DELETE' });
    if (res.ok) fetchAllData();
  };

  const handleUpdateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch(`/api/allocations/${editAllocation.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetAmount: editAllocation.targetAmount }),
    });
    if (response.ok) {
      setEditAllocationId(null);
      setEditAllocation({ id: 0, targetAmount: 0 });
      fetchAllData();
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('确定删除这条交易记录？')) return;
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (res.ok) fetchAllData();
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTransaction, accountId: addTransactionAccountId ?? newTransaction.accountId }),
    });
    if (response.ok) {
      setAddTransactionAccountId(null);
      setNewTransaction({ accountId: 0, assetId: 0, type: 'buy', amount: 0, price: 0, shares: 0, date: new Date().toISOString().split('T')[0] });
      fetchAllData();
    }
  };

  const totalValue = calculateTotalValue();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">个人资产配置面板</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>总资产</CardTitle>
            <CardDescription>所有账户合计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">¥{totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>账户数</CardTitle>
            <CardDescription>当前账户数量</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{accounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>资产种类</CardTitle>
            <CardDescription>全局资产池</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assets.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-6">
        <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
          <DialogTrigger asChild>
            <Button>添加账户</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加账户</DialogTitle>
              <DialogDescription>输入账户名称、平台（可选）、目标金额（可选）</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAccount}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">名称</Label>
                  <Input value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} className="col-span-3" placeholder="长钱 银河证券" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">平台</Label>
                  <Input value={newAccount.platform} onChange={(e) => setNewAccount({ ...newAccount, platform: e.target.value })} className="col-span-3" placeholder="银河证券" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">目标金额</Label>
                  <Input type="number" value={newAccount.targetAmount} onChange={(e) => setNewAccount({ ...newAccount, targetAmount: e.target.value })} className="col-span-3" placeholder="80000" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">保存</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">添加资产</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加资产</DialogTitle>
              <DialogDescription>资产在全局池中，各账户可分别配置</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAsset}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">名称</Label>
                  <Input value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">代码</Label>
                  <Input value={newAsset.symbol} onChange={(e) => setNewAsset({ ...newAsset, symbol: e.target.value })} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">类型</Label>
                  <Select value={newAsset.type} onValueChange={(v) => setNewAsset({ ...newAsset, type: v })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">股票/基金</SelectItem>
                      <SelectItem value="bond">债券</SelectItem>
                      <SelectItem value="cash">现金</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">当前价格</Label>
                  <Input type="number" value={newAsset.currentPrice || ''} onChange={(e) => setNewAsset({ ...newAsset, currentPrice: parseFloat(e.target.value) || 0 })} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">保存</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.map((account) => {
        const accountValue = calculateAccountValue(account);
        const accountTotal = accountValue;
        return (
          <Card key={account.id} className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{account.name}</CardTitle>
                  <CardDescription>
                    {account.platform && <span>{account.platform} · </span>}
                    当前 ¥{accountValue.toFixed(2)}
                    {account.targetAmount != null && ` · 目标 ¥${account.targetAmount.toLocaleString()}`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog open={addAllocationAccountId === account.id} onOpenChange={(open) => { setAddAllocationAccountId(open ? account.id : null); if (!open) setNewAllocation({ ...newAllocation, accountId: 0 }); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => setNewAllocation({ ...newAllocation, accountId: account.id })}>添加配置</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>添加配置 - {account.name}</DialogTitle>
                        <DialogDescription>从现有资产中选择并设置目标比例</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddAllocation}>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">资产</Label>
                            <Select value={newAllocation.assetId.toString()} onValueChange={(v) => setNewAllocation({ ...newAllocation, assetId: parseInt(v) })}>
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="选择资产" />
                              </SelectTrigger>
                              <SelectContent>
                                {assets.map((a) => (
                                  <SelectItem key={a.id} value={a.id.toString()}>{a.name} ({a.symbol})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">目标金额 ¥</Label>
                            <Input type="number" value={newAllocation.targetAmount || ''} onChange={(e) => setNewAllocation({ ...newAllocation, targetAmount: parseFloat(e.target.value) || 0 })} className="col-span-3" placeholder="20000" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">保存</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={addTransactionAccountId === account.id} onOpenChange={(open) => { setAddTransactionAccountId(open ? account.id : null); if (!open) setNewTransaction({ ...newTransaction, accountId: 0 }); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setNewTransaction({ ...newTransaction, accountId: account.id })}>添加交易</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>添加交易 - {account.name}</DialogTitle>
                        <DialogDescription>为该账户记录买入/卖出。支持 ETF/股票（510xxx/159xxx 等）填写份额+日期后点「获取价格」自动填充</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddTransaction}>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">资产</Label>
                            <Select value={newTransaction.assetId.toString()} onValueChange={(v) => setNewTransaction({ ...newTransaction, assetId: parseInt(v) })}>
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="选择资产" />
                              </SelectTrigger>
                              <SelectContent>
                                {assets.map((a) => (
                                  <SelectItem key={a.id} value={a.id.toString()}>{a.name} ({a.symbol})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">类型</Label>
                            <Select value={newTransaction.type} onValueChange={(v) => setNewTransaction({ ...newTransaction, type: v })}>
                              <SelectTrigger className="col-span-3">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="buy">买入</SelectItem>
                                <SelectItem value="sell">卖出</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">份额</Label>
                            <Input type="number" value={newTransaction.shares || ''} onChange={(e) => setNewTransaction({ ...newTransaction, shares: parseFloat(e.target.value) || 0 })} className="col-span-3" placeholder="填写后可点获取价格" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">日期</Label>
                            <div className="col-span-3 flex gap-2">
                              <Input type="date" value={newTransaction.date} onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })} className="flex-1" />
                              <Button type="button" variant="outline" size="sm" onClick={handleFetchPrice} disabled={priceFetching || !newTransaction.assetId || !newTransaction.date}>
                                {priceFetching ? '获取中…' : '获取价格'}
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">价格</Label>
                            <Input type="number" value={newTransaction.price || ''} onChange={(e) => setNewTransaction({ ...newTransaction, price: parseFloat(e.target.value) || 0 })} className="col-span-3" placeholder="可自动获取或手动填写" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">金额</Label>
                            <Input type="number" value={newTransaction.amount || ''} onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || 0 })} className="col-span-3" placeholder="可自动计算或手动填写" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">保存</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {account.allocations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">配置比例</h4>
                  <div className="space-y-2">
                    {account.allocations.map((alloc) => {
                      const value = getAccountAssetValue(account.id, alloc.assetId);
                      const targetPct = account.targetAmount ? (alloc.targetAmount / account.targetAmount) * 100 : 0;
                      const currentPct = accountTotal > 0 ? (value / accountTotal) * 100 : 0;
                      return (
                        <div key={alloc.id} className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-0.5">
                              <span>{alloc.asset.name} ({alloc.asset.symbol})</span>
                              <span>¥{value.toFixed(2)} / 目标 ¥{(alloc.targetAmount || 0).toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(currentPct, 100)}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>当前占比: {currentPct.toFixed(1)}%</span>
                              <span>目标占比: {targetPct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Dialog open={editAllocationId === alloc.id} onOpenChange={(open) => { setEditAllocationId(open ? alloc.id : null); if (open) setEditAllocation({ id: alloc.id, targetAmount: alloc.targetAmount }); }}>
                              <DialogTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-8">
                                  编辑
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>编辑配置 - {alloc.asset.name}</DialogTitle>
                                  <DialogDescription>修改目标配置金额</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleUpdateAllocation}>
                                  <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label className="text-right">资产</Label>
                                      <Input value={alloc.asset.name} readOnly className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label className="text-right">目标金额 ¥</Label>
                                      <Input type="number" value={editAllocation.targetAmount || ''} onChange={(e) => setEditAllocation({ ...editAllocation, targetAmount: parseFloat(e.target.value) || 0 })} className="col-span-3" placeholder="20000" />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button type="submit">保存</Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>
                            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-8" onClick={() => handleDeleteAllocation(alloc.id)}>
                              删除
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {account.transactions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">交易记录</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日期</TableHead>
                        <TableHead>资产</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>价格</TableHead>
                        <TableHead>份额</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {account.transactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
                          <TableCell>{t.asset.name}</TableCell>
                          <TableCell>{t.type === 'buy' ? '买入' : '卖出'}</TableCell>
                          <TableCell>¥{t.amount.toFixed(2)}</TableCell>
                          <TableCell>¥{t.price.toFixed(2)}</TableCell>
                          <TableCell>{t.shares.toFixed(4)}</TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-8" onClick={() => handleDeleteTransaction(t.id)}>
                              删除
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {account.allocations.length === 0 && account.transactions.length === 0 && (
                <p className="text-muted-foreground text-sm">暂无配置和交易，点击上方按钮添加</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {accounts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无账户，点击「添加账户」开始
          </CardContent>
        </Card>
      )}
    </div>
  );
}
