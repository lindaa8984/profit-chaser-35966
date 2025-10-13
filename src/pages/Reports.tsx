import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { Transaction, Vault, Customer } from '@/types';
import { FileText, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const Reports = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredTx, setFilteredTx] = useState<Transaction[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const txs = storage.getTransactions();
    setTransactions(txs);
    setVaults(storage.getVaults());
    setCustomers(storage.getCustomers());
    setFilteredTx(txs.filter(t => t.status === 'confirmed'));
  };

  const handleFilter = () => {
    if (!startDate || !endDate) {
      setFilteredTx(transactions.filter(t => t.status === 'confirmed'));
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filtered = transactions.filter(t => {
      if (t.status !== 'confirmed') return false;
      const txDate = new Date(t.createdAt);
      return txDate >= start && txDate <= end;
    });

    setFilteredTx(filtered);
  };

  const totalProfit = filteredTx.reduce((sum, tx) => sum + (tx.profitLoss || 0), 0);
  const totalSDG = vaults.reduce((sum, v) => sum + v.balanceSDG, 0);
  const totalAED = vaults.reduce((sum, v) => sum + v.balanceAED, 0);
  const confirmedCount = filteredTx.length;

  const getVaultName = (id?: string) => {
    if (!id) return '-';
    return vaults.find(v => v.id === id)?.name || '-';
  };

  const getCustomerName = (id?: string) => {
    if (!id) return '-';
    return customers.find(c => c.id === id)?.name || '-';
  };

  // Prepare chart data
  const chartData = filteredTx
    .filter(tx => tx.profitLoss !== undefined && tx.profitLoss !== 0)
    .map(tx => ({
      id: tx.transactionNumber,
      value: tx.profitLoss || 0,
      date: new Date(tx.createdAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
    }))
    .slice(-10); // Show last 10 transactions

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">التقارير</h1>
        <p className="text-muted-foreground mt-1">تقارير الربح والخسارة والأرصدة</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تصفية حسب الفترة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">من تاريخ</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">إلى تاريخ</Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleFilter} className="w-full">
                <FileText className="ml-2 h-4 w-4" />
                عرض التقرير
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              صافي الربح/الخسارة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {totalProfit >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600 ml-2" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600 ml-2" />
              )}
              <span className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalProfit.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي SDG
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSDG.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي AED
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAED.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              العمليات المؤكدة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmedCount}</div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              رسم بياني للربح والخسارة
              <span className="text-sm font-normal text-muted-foreground">
                - آخر {chartData.length} عملية
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                profit: {
                  label: "ربح",
                  color: "hsl(142, 76%, 36%)",
                },
                loss: {
                  label: "خسارة",
                  color: "hsl(0, 84%, 60%)",
                },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.value >= 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>ملخص الأرصدة حسب الخزنة</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الخزنة</TableHead>
                <TableHead>رصيد SDG</TableHead>
                <TableHead>رصيد AED</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vaults.map((vault) => (
                <TableRow key={vault.id}>
                  <TableCell className="font-medium">{vault.name}</TableCell>
                  <TableCell>{vault.balanceSDG.toLocaleString()}</TableCell>
                  <TableCell>{vault.balanceAED.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل العمليات المؤكدة</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم العملية</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الخزنة/الخزن</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الربح/الخسارة</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTx.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium" dir="ltr">{tx.transactionNumber}</TableCell>
                  <TableCell>
                    {tx.type === 'deposit' && 'إيداع'}
                    {tx.type === 'withdrawal' && 'سحب'}
                    {tx.type === 'transfer' && 'تحويل'}
                  </TableCell>
                  <TableCell dir="ltr">
                    {tx.amount.toLocaleString()} {tx.currency || tx.fromCurrency}
                  </TableCell>
                  <TableCell>
                    {tx.type === 'transfer'
                      ? `${getVaultName(tx.fromVaultId)} → ${getVaultName(tx.toVaultId)}`
                      : getVaultName(tx.vaultId)}
                  </TableCell>
                  <TableCell>{getCustomerName(tx.customerId)}</TableCell>
                  <TableCell>
                    {tx.profitLoss !== undefined && tx.profitLoss !== 0 ? (
                      <span className={tx.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {tx.profitLoss.toFixed(2)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(tx.createdAt).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                </TableRow>
              ))}
              {filteredTx.length > 0 && (
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={2}>المجموع</TableCell>
                  <TableCell dir="ltr">-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>
                    <span className={totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {totalProfit.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
