import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, History } from 'lucide-react';
import { storage } from '@/lib/storage';
import { ExchangeRate } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ExchangeRates = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [buyRate, setBuyRate] = useState('');
  const [sellRate, setSellRate] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = () => {
    const allRates = storage.getRates();
    setRates(allRates);
    if (allRates.length > 0) {
      setBuyRate(allRates[0].buyRate.toString());
      setSellRate(allRates[0].sellRate.toString());
    }
  };

  const handleUpdate = () => {
    const buy = parseFloat(buyRate);
    const sell = parseFloat(sellRate);

    if (isNaN(buy) || isNaN(sell) || buy <= 0 || sell <= 0) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال أسعار صحيحة',
      });
      return;
    }

    if (sell <= buy) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'التحويل العكسي يجب أن يكون أكبر من التحويل العادي',
      });
      return;
    }

    const newRate: ExchangeRate = {
      id: Date.now().toString(),
      buyRate: buy,
      sellRate: sell,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.id || '1',
    };

    const updatedRates = [newRate, ...rates];
    storage.saveRates(updatedRates);
    setRates(updatedRates);
    
    toast({
      title: 'تم التحديث',
      description: 'تم تحديث أسعار الصرف بنجاح',
    });
  };

  const currentRate = rates[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">أسعار الصرف</h1>
        <p className="text-muted-foreground mt-1">إدارة أسعار الصرف بين العملات</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="ml-2 h-5 w-5 text-primary" />
              السعر الحالي
            </CardTitle>
            <CardDescription>
              آخر تحديث: {currentRate ? new Date(currentRate.updatedAt).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">التحويل العادي</p>
              <p className="text-3xl font-bold text-green-600">
                {currentRate?.buyRate || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">SDG لكل 1 AED</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">التحويل العكسي</p>
              <p className="text-3xl font-bold text-blue-600">
                {currentRate?.sellRate || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">SDG لكل 1 AED</p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">الفرق (الربح المحتمل)</p>
              <p className="text-2xl font-bold text-yellow-600">
                {currentRate ? (currentRate.sellRate - currentRate.buyRate).toFixed(2) : 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تحديث السعر</CardTitle>
            <CardDescription>
              سيتم تطبيق السعر الجديد على العمليات القادمة فقط
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buy">التحويل العادي</Label>
              <Input
                id="buy"
                type="number"
                step="0.01"
                value={buyRate}
                onChange={(e) => setBuyRate(e.target.value)}
                placeholder="900"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                السعر الذي تشتري به الدرهم بالجنيه السوداني
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sell">التحويل العكسي</Label>
              <Input
                id="sell"
                type="number"
                step="0.01"
                value={sellRate}
                onChange={(e) => setSellRate(e.target.value)}
                placeholder="1000"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                السعر الذي تبيع به الدرهم بالجنيه السوداني
              </p>
            </div>
            <Button onClick={handleUpdate} className="w-full">
              تحديث الأسعار
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="ml-2 h-5 w-5" />
            سجل الأسعار
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div dir="rtl">
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ والوقت</TableHead>
                    <TableHead className="text-right">التحويل العادي</TableHead>
                    <TableHead className="text-right">التحويل العكسي</TableHead>
                    <TableHead className="text-right">الفرق</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="text-right">
                      {new Date(rate.updatedAt).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="font-medium text-green-600 text-right">
                      {rate.buyRate}
                    </TableCell>
                    <TableCell className="font-medium text-blue-600 text-right">
                      {rate.sellRate}
                    </TableCell>
                    <TableCell className="font-medium text-yellow-600 text-right">
                      {(rate.sellRate - rate.buyRate).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExchangeRates;
