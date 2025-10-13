import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowRightLeft, TrendingUp, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { storage } from '@/lib/storage';
import { Vault, Customer, Transaction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { BanakStatusCard } from '@/components/BanakStatusCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentRate, setCurrentRate] = useState({ buyRate: 0, sellRate: 0 });
  const [showPending, setShowPending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setVaults(storage.getVaults());
    setCustomers(storage.getCustomers());
    setTransactions(storage.getTransactions());
    
    const rates = storage.getRates();
    if (rates.length > 0) {
      setCurrentRate({ buyRate: rates[0].buyRate, sellRate: rates[0].sellRate });
    }
  };

  const confirmTransaction = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || tx.status !== 'pending') return;

    const vaultsData = storage.getVaults();
    
    // For Banak transfers, deduct amount from vault upon confirmation
    if (tx.isBanakTransfer) {
      const vault = vaultsData.find(v => v.id === tx.fromVaultId);
      if (!vault) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'الحساب المصدر غير موجود',
        });
        return;
      }
      
      // Check if vault has sufficient balance
      if (vault.balanceSDG < tx.amount) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'الرصيد غير كافٍ في الحساب',
        });
        return;
      }
      
      // Deduct the amount from the vault
      vault.balanceSDG -= tx.amount;
      storage.saveVaults(vaultsData);
      
      const updatedTx = {
        ...tx,
        status: 'confirmed' as const,
        confirmedAt: new Date().toISOString(),
        confirmedBy: user?.id || '1',
      };
      
      const updatedTransactions = transactions.map(t => t.id === txId ? updatedTx : t);
      storage.saveTransactions(updatedTransactions);
      
      loadData();
      
      toast({
        title: 'تم التأكيد',
        description: 'تم تأكيد استلام الدرهم من المورد وخصم المبلغ',
      });
      return;
    }
    
    if (tx.type === 'deposit') {
      const vault = vaultsData.find(v => v.id === tx.vaultId);
      if (!vault) return;
      
      if (tx.currency === 'SDG') {
        vault.balanceSDG += tx.amount;
      } else {
        vault.balanceAED += tx.amount;
      }
    } else if (tx.type === 'withdrawal') {
      const vault = vaultsData.find(v => v.id === tx.vaultId);
      if (!vault) return;
      
      if (tx.currency === 'SDG' && vault.balanceSDG < tx.amount) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'الرصيد غير كافٍ في الخزنة',
        });
        return;
      }
      if (tx.currency === 'AED' && vault.balanceAED < tx.amount) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'الرصيد غير كافٍ في الخزنة',
        });
        return;
      }
      
      if (tx.currency === 'SDG') {
        vault.balanceSDG -= tx.amount;
      } else {
        vault.balanceAED -= tx.amount;
      }
    } else if (tx.type === 'transfer') {
      const fromVault = vaultsData.find(v => v.id === tx.fromVaultId);
      const toVault = vaultsData.find(v => v.id === tx.toVaultId);
      if (!fromVault || !toVault) return;
      
      if (tx.fromCurrency === 'SDG' && fromVault.balanceSDG < tx.amount) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'الرصيد غير كافٍ في الخزنة المصدر',
        });
        return;
      }
      if (tx.fromCurrency === 'AED' && fromVault.balanceAED < tx.amount) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'الرصيد غير كافٍ في الخزنة المصدر',
        });
        return;
      }
      
      if (tx.fromCurrency === 'SDG') {
        fromVault.balanceSDG -= tx.amount;
      } else {
        fromVault.balanceAED -= tx.amount;
      }
      
      let targetAmount = tx.amount;
      if (tx.fromCurrency !== tx.toCurrency && tx.exchangeRate) {
        if (tx.fromCurrency === 'SDG') {
          targetAmount = tx.amount / tx.exchangeRate;
        } else {
          targetAmount = tx.amount * tx.exchangeRate;
        }
      }
      
      if (tx.toCurrency === 'SDG') {
        toVault.balanceSDG += targetAmount;
      } else {
        toVault.balanceAED += targetAmount;
      }
    }
    
    storage.saveVaults(vaultsData);
    
    const updatedTx = {
      ...tx,
      status: 'confirmed' as const,
      confirmedAt: new Date().toISOString(),
      confirmedBy: user?.id || '1',
    };
    
    const updatedTransactions = transactions.map(t => t.id === txId ? updatedTx : t);
    storage.saveTransactions(updatedTransactions);
    
    loadData();
    
    toast({
      title: 'تم التأكيد',
      description: 'تم تأكيد العملية وتحديث الأرصدة',
    });
  };

  const totalSDG = vaults.reduce((sum, v) => sum + v.balanceSDG, 0);
  const totalAED = vaults.reduce((sum, v) => sum + v.balanceAED, 0);
  const pendingTransactions = transactions.filter(t => t.status === 'pending').length;

  // حساب الرصيد الكلي بالدرهم = رصيد AED + (رصيد SDG ÷ سعر الشراء)
  const totalBalanceInAED = totalAED + (currentRate.buyRate > 0 ? totalSDG / currentRate.buyRate : 0);

  // حساب الربح/الخسارة من عمليات التحويل المؤكدة
  const profitLoss = transactions
    .filter(t => t.status === 'confirmed' && t.type === 'transfer' && t.fromCurrency !== t.toCurrency)
    .reduce((total, tx) => {
      const rate = tx.exchangeRate || 0;
      if (rate === 0) return total;

      if (tx.fromCurrency === 'AED' && tx.toCurrency === 'SDG') {
        // التحويل من درهم إلى جنيه (البيع)
        // دفع X درهم، استلام X * sellRate جنيه
        // القيمة الحقيقية للجنيه = (X * sellRate) / buyRate
        const amountPaidAED = tx.amount;
        const amountReceivedSDG = tx.amount * rate;
        const realValueAED = currentRate.buyRate > 0 ? amountReceivedSDG / currentRate.buyRate : 0;
        return total + (amountPaidAED - realValueAED);
      } else if (tx.fromCurrency === 'SDG' && tx.toCurrency === 'AED') {
        // التحويل من جنيه إلى درهم (الشراء)
        // دفع Y جنيه، استلام Y / buyRate درهم
        const amountPaidSDG = tx.amount;
        const amountReceivedAED = tx.amount / rate;
        const costInAED = currentRate.sellRate > 0 ? amountPaidSDG / currentRate.sellRate : 0;
        return total + (amountReceivedAED - costInAED);
      }
      
      return total;
    }, 0);

  // بيانات الرسم البياني - الربح/الخسارة لكل يوم
  const chartData = transactions
    .filter(t => t.status === 'confirmed' && t.type === 'transfer' && t.fromCurrency !== t.toCurrency)
    .reduce((acc, tx) => {
      const date = new Date(tx.confirmedAt || tx.createdAt).toLocaleDateString('en-GB');
      const rate = tx.exchangeRate || 0;
      
      if (rate === 0) return acc;

      let profit = 0;
      if (tx.fromCurrency === 'AED' && tx.toCurrency === 'SDG') {
        const amountPaidAED = tx.amount;
        const amountReceivedSDG = tx.amount * rate;
        const realValueAED = currentRate.buyRate > 0 ? amountReceivedSDG / currentRate.buyRate : 0;
        profit = amountPaidAED - realValueAED;
      } else if (tx.fromCurrency === 'SDG' && tx.toCurrency === 'AED') {
        const amountPaidSDG = tx.amount;
        const amountReceivedAED = tx.amount / rate;
        const costInAED = currentRate.sellRate > 0 ? amountPaidSDG / currentRate.sellRate : 0;
        profit = amountReceivedAED - costInAED;
      }

      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.profit += profit;
      } else {
        acc.push({ date, profit });
      }
      
      return acc;
    }, [] as { date: string; profit: number }[])
    .sort((a, b) => {
      const [dayA, monthA, yearA] = a.date.split('/');
      const [dayB, monthB, yearB] = b.date.split('/');
      return new Date(`${yearA}-${monthA}-${dayA}`).getTime() - new Date(`${yearB}-${monthB}-${dayB}`).getTime();
    })
    .slice(-7); // آخر 7 أيام

  const stats = [
    {
      title: 'الرصيد الكلي (درهم)',
      value: totalBalanceInAED.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      icon: Wallet,
      color: 'text-blue-600',
    },
    {
      title: 'الربح/الخسارة (درهم)',
      value: profitLoss.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      icon: TrendingUp,
      color: profitLoss >= 0 ? 'text-green-600' : 'text-destructive',
      isProfit: profitLoss >= 0,
    },
    {
      title: 'العمليات المعلقة',
      value: pendingTransactions,
      icon: ArrowRightLeft,
      color: pendingTransactions > 0 ? 'text-destructive' : 'text-muted-foreground',
      alert: pendingTransactions > 0,
      clickHandler: 'pending',
    },
    {
      title: 'سعر الصرف الحالي',
      value: currentRate.buyRate.toFixed(2),
      icon: TrendingUp,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-1">نظرة عامة على نظام الصرافة</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isClickable = stat.alert;
          const handleClick = () => {
            if (stat.clickHandler === 'pending') {
              setShowPending(true);
            }
          };
          return (
            <Card 
              key={stat.title} 
              className={cn(
                stat.alert && stat.clickHandler === 'pending' && 'border-destructive cursor-pointer hover:shadow-lg transition-shadow',
                stat.alert && stat.clickHandler === 'inProgress' && 'border-orange-600 cursor-pointer hover:shadow-lg transition-shadow',
              )}
              onClick={isClickable ? handleClick : undefined}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={cn('h-5 w-5', stat.color)} />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  'text-2xl font-bold', 
                  stat.alert && stat.clickHandler === 'pending' && 'text-destructive',
                  stat.alert && stat.clickHandler === 'inProgress' && 'text-orange-600'
                )}>
                  {stat.value}
                </div>
                {stat.alert && stat.clickHandler === 'pending' && (
                  <p className="text-xs text-destructive mt-1">يوجد عمليات تحتاج تأكيد - اضغط للعرض</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>الأرصدة الإجمالية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="font-medium">الجنيه السوداني (SDG)</span>
              <span className="text-2xl font-bold">{totalSDG.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="font-medium">الدرهم الإماراتي (AED)</span>
              <span className="text-2xl font-bold">{totalAED.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أسعار الصرف الحالية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <span className="font-medium">التحويل العادي</span>
              <span className="text-2xl font-bold text-green-600">{currentRate.buyRate}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <span className="font-medium">التحويل العكسي</span>
              <span className="text-2xl font-bold text-blue-600">{currentRate.sellRate}</span>
            </div>
          </CardContent>
        </Card>

        <BanakStatusCard transactions={transactions} />
      </div>

      <Card className="overflow-hidden bg-gradient-to-br from-card to-muted/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                رسم بياني للربح والخسارة
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                تحليل الأداء المالي - آخر 7 أيام (بالدرهم الإماراتي)
              </p>
            </div>
            {profitLoss >= 0 ? (
              <div className="text-center px-4 py-2 bg-success/20 rounded-lg border border-success/30">
                <p className="text-xs text-success font-medium">إجمالي الربح</p>
                <p className="text-lg font-bold text-success">
                  +{profitLoss.toFixed(2)} AED
                </p>
              </div>
            ) : (
              <div className="text-center px-4 py-2 bg-destructive/20 rounded-lg border border-destructive/30">
                <p className="text-xs text-destructive font-medium">إجمالي الخسارة</p>
                <p className="text-lg font-bold text-destructive">
                  {profitLoss.toFixed(2)} AED
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {chartData.length > 0 ? (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none rounded-lg" />
              <ChartContainer
                config={{
                  profit: {
                    label: 'الربح/الخسارة',
                    color: 'hsl(var(--chart-profit-start))',
                  },
                }}
                className="h-[350px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-profit-start))" stopOpacity={0.9} />
                        <stop offset="50%" stopColor="hsl(var(--chart-profit-end))" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="hsl(var(--chart-profit-end))" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-loss-start))" stopOpacity={0.9} />
                        <stop offset="50%" stopColor="hsl(var(--chart-loss-end))" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="hsl(var(--chart-loss-end))" stopOpacity={0.1} />
                      </linearGradient>
                      <filter id="shadow">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3"/>
                      </filter>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      className="stroke-border/50" 
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={{ stroke: 'hsl(var(--border))' }}
                      tickFormatter={(value) => `${value >= 0 ? '+' : ''}${value.toFixed(0)}`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className="bg-card/95 backdrop-blur-sm border-2"
                          formatter={(value: number) => {
                            const isProfit = value >= 0;
                            return [
                              <span className={isProfit ? 'text-success font-bold' : 'text-destructive font-bold'}>
                                {value >= 0 ? '+' : ''}{value.toFixed(2)} درهم
                              </span>,
                              <span className="text-muted-foreground">
                                {isProfit ? '🔼 ربح' : '🔽 خسارة'}
                              </span>
                            ];
                          }}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke={chartData.some(d => d.profit < 0) ? 'hsl(var(--chart-loss-start))' : 'hsl(var(--chart-profit-start))'}
                      fill={chartData.some(d => d.profit < 0) ? 'url(#lossGradient)' : 'url(#profitGradient)'}
                      strokeWidth={3}
                      filter="url(#shadow)"
                      animationDuration={1500}
                      animationEasing="ease-in-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          ) : (
            <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground">
              <TrendingUp className="h-16 w-16 opacity-20 mb-4" />
              <p className="text-lg font-medium">لا توجد بيانات متاحة للعرض</p>
              <p className="text-sm mt-1">قم بإضافة عمليات تحويل لرؤية الإحصائيات</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPending} onOpenChange={setShowPending}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>العمليات المعلقة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {transactions.filter(t => t.status === 'pending').length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد عمليات معلقة</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم العملية</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>التفاصيل</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.filter(t => t.status === 'pending').map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono">{tx.transactionNumber}</TableCell>
                      <TableCell>{new Date(tx.createdAt).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tx.type === 'deposit' ? 'إيداع' : tx.type === 'withdrawal' ? 'سحب' : 'تحويل'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tx.amount.toLocaleString()} {tx.currency || tx.fromCurrency}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.type === 'transfer' 
                          ? `${tx.fromCurrency} → ${tx.toCurrency}`
                          : tx.vaultId ? vaults.find(v => v.id === tx.vaultId)?.name : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => confirmTransaction(tx.id)}
                          className="gap-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          تأكيد
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Dashboard;
