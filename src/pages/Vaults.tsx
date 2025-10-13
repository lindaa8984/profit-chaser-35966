import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Wallet } from 'lucide-react';
import { storage } from '@/lib/storage';
import { Vault } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const Vaults = () => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialBalanceSDG, setInitialBalanceSDG] = useState('');
  const [initialBalanceAED, setInitialBalanceAED] = useState('');
  const [initialBalanceUSD, setInitialBalanceUSD] = useState('');
  const [initialBalanceSAR, setInitialBalanceSAR] = useState('');
  const [isMainVault, setIsMainVault] = useState(false);
  const [isForeignCurrency, setIsForeignCurrency] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadVaults();
  }, []);

  const loadVaults = () => {
    const loadedVaults = storage.getVaults();
    // تحديث الخزنة الرئيسية القديمة إذا لم تكن تحتوي على isMainVault
    const updatedVaults = loadedVaults.map(vault => {
      if (vault.id === '1' && !vault.hasOwnProperty('isMainVault')) {
        return { 
          ...vault, 
          isMainVault: true, 
          initialBalanceSDG: vault.balanceSDG, 
          initialBalanceAED: vault.balanceAED,
          balanceUSD: vault.balanceUSD || 0,
          balanceSAR: vault.balanceSAR || 0,
          initialBalanceUSD: vault.initialBalanceUSD || 0,
          initialBalanceSAR: vault.initialBalanceSAR || 0
        };
      }
      return {
        ...vault,
        balanceUSD: vault.balanceUSD || 0,
        balanceSAR: vault.balanceSAR || 0,
        initialBalanceUSD: vault.initialBalanceUSD || 0,
        initialBalanceSAR: vault.initialBalanceSAR || 0
      };
    });
    
    if (JSON.stringify(updatedVaults) !== JSON.stringify(loadedVaults)) {
      storage.saveVaults(updatedVaults);
      setVaults(updatedVaults);
    } else {
      setVaults(loadedVaults);
    }
  };

  const getSubVaultsTotalBalances = () => {
    // حساب مجموع الخزن الفرعية (غير الرئيسية وغير العملات الأجنبية)
    const subVaults = vaults.filter(v => !v.isMainVault && !v.isForeignCurrency);
    
    const totalSDG = subVaults.reduce((sum, v) => sum + v.balanceSDG, 0);
    const totalAED = subVaults.reduce((sum, v) => sum + v.balanceAED, 0);
    const totalUSD = subVaults.reduce((sum, v) => sum + (v.balanceUSD || 0), 0);
    const totalSAR = subVaults.reduce((sum, v) => sum + (v.balanceSAR || 0), 0);
    const totalCash = subVaults.reduce((sum, v) => sum + (v.balanceCash || 0), 0);
    
    return { totalSDG, totalAED, totalUSD, totalSAR, totalCash };
  };

  const getBuyRate = () => {
    const rates = storage.getRates();
    return rates.length > 0 ? rates[0].buyRate : 200;
  };

  const getSellRate = () => {
    const rates = storage.getRates();
    return rates.length > 0 ? rates[0].sellRate : 202;
  };

  const getTotalBalanceInAED = () => {
    const mainVault = vaults.find(v => v.isMainVault);
    if (!mainVault) return 0;
    
    const sellRate = getSellRate();
    // حساب مجموع بنكك من الخزنة الرئيسية + الخزن الفرعية
    const totalSDG = mainVault.balanceSDG + getSubVaultsTotalBalances().totalSDG;
    const totalAED = mainVault.balanceAED + getSubVaultsTotalBalances().totalAED;
    const totalUSD = (mainVault.balanceUSD || 0) + getSubVaultsTotalBalances().totalUSD;
    const totalSAR = (mainVault.balanceSAR || 0) + getSubVaultsTotalBalances().totalSAR;
    const totalCash = (mainVault.balanceCash || 0) + getSubVaultsTotalBalances().totalCash;
    
    // تحويل بنكك إلى درهم بالسعر العكسي
    const sdgInAED = totalSDG / sellRate;
    
    return totalAED + sdgInAED + totalUSD + totalSAR + totalCash;
  };

  const handleAdd = () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال اسم الحساب',
      });
      return;
    }

    const sdgBalance = parseFloat(initialBalanceSDG) || 0;
    const aedBalance = parseFloat(initialBalanceAED) || 0;
    const usdBalance = parseFloat(initialBalanceUSD) || 0;
    const sarBalance = parseFloat(initialBalanceSAR) || 0;

    const newVault: Vault = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
      balanceSDG: sdgBalance,
      balanceAED: aedBalance,
      balanceUSD: usdBalance,
      balanceSAR: sarBalance,
      initialBalanceSDG: sdgBalance,
      initialBalanceAED: aedBalance,
      initialBalanceUSD: usdBalance,
      initialBalanceSAR: sarBalance,
      isMainVault: isMainVault,
      isForeignCurrency: isForeignCurrency,
      createdAt: new Date().toISOString(),
    };

    const updatedVaults = [...vaults, newVault];
    storage.saveVaults(updatedVaults);
    setVaults(updatedVaults);
    
    toast({
      title: 'تم الإضافة',
      description: 'تم إضافة الحساب بنجاح',
    });

    setName('');
    setDescription('');
    setInitialBalanceSDG('');
    setInitialBalanceAED('');
    setInitialBalanceUSD('');
    setInitialBalanceSAR('');
    setIsMainVault(false);
    setIsForeignCurrency(false);
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">الأرصدة</h1>
          <p className="text-muted-foreground mt-1">إدارة الأرصدة والحسابات</p>
          <p className="mt-2 text-4xl font-extrabold">
            {getTotalBalanceInAED().toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            <span className="text-base mr-2 align-baseline">الرصيد الكلي درهم</span>
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              إضافة حساب
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة حساب جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات الحساب الجديد
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الحساب</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: الحساب الرئيسي"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">الوصف (اختياري)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف قصير عن الحساب"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    id="isMainVault"
                    checked={isMainVault}
                    onChange={(e) => setIsMainVault(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isMainVault">الخزنة الرئيسية للصرافة</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    id="isForeignCurrency"
                    checked={isForeignCurrency}
                    onChange={(e) => setIsForeignCurrency(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isForeignCurrency">خزنة العملات الأجنبية</Label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initialBalanceSDG">
                    {isMainVault ? 'الرصيد الافتتاحي جنيه' : 'الرصيد الافتتاحي بنكك'}
                  </Label>
                  <Input
                    id="initialBalanceSDG"
                    type="number"
                    value={initialBalanceSDG}
                    onChange={(e) => setInitialBalanceSDG(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initialBalanceAED">الرصيد الافتتاحي درهم</Label>
                  <Input
                    id="initialBalanceAED"
                    type="number"
                    value={initialBalanceAED}
                    onChange={(e) => setInitialBalanceAED(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              {isForeignCurrency && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="initialBalanceUSD">الرصيد الافتتاحي دولار</Label>
                    <Input
                      id="initialBalanceUSD"
                      type="number"
                      value={initialBalanceUSD}
                      onChange={(e) => setInitialBalanceUSD(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initialBalanceSAR">الرصيد الافتتاحي ريال</Label>
                    <Input
                      id="initialBalanceSAR"
                      type="number"
                      value={initialBalanceSAR}
                      onChange={(e) => setInitialBalanceSAR(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAdd}>إضافة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* تم نقل عرض الرصيد الكلي إلى رأس الصفحة */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* الخزن الموجودة مرتبة */}
        {vaults
          .sort((a, b) => {
            // الخزنة الرئيسية أولاً
            if (a.isMainVault && !b.isMainVault) return -1;
            if (!a.isMainVault && b.isMainVault) return 1;
            
            // Nova ثانياً
            if (a.name === 'Nova' && b.name !== 'Nova') return -1;
            if (a.name !== 'Nova' && b.name === 'Nova') return 1;
            
            // Azooz ثالثاً (مباشرة بعد Nova)
            if ((a.name === 'azooz' || a.name === 'Azooz') && (b.name !== 'azooz' && b.name !== 'Azooz') && b.name !== 'Nova') return -1;
            if ((a.name !== 'azooz' && a.name !== 'Azooz') && (b.name === 'azooz' || b.name === 'Azooz') && a.name !== 'Nova') return 1;
            
            // خزن العملات الأجنبية بعد ذلك
            if (a.isForeignCurrency && !b.isForeignCurrency) return -1;
            if (!a.isForeignCurrency && b.isForeignCurrency) return 1;
            
            return 0;
          })
          .map((vault) => (
          <Card 
            key={vault.id} 
            className={`h-fit ${
              vault.isMainVault 
                ? "border-blue-500 dark:border-blue-400 border-[3px] shadow-[0_8px_30px_rgb(59,130,246,0.3)] bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/50 dark:to-blue-900/30 relative" 
                : vault.isForeignCurrency
                ? "border-purple-500 dark:border-purple-400 border-[3px] shadow-[0_8px_30px_rgb(168,85,247,0.3)] bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/50 dark:to-purple-900/30 relative"
                : ""
            }`}
          >
            {(vault.isMainVault || vault.isForeignCurrency) && (
              <div className={`absolute top-0 right-0 left-0 h-1 rounded-t-lg ${
                vault.isMainVault 
                  ? 'bg-gradient-to-r from-blue-500 via-green-500 to-blue-500'
                  : 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500'
              }`}></div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className={`ml-2 h-5 w-5 ${
                  vault.isMainVault 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : vault.isForeignCurrency
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-primary'
                }`} />
                {vault.name}
              </CardTitle>
              {!vault.isMainVault && !vault.isForeignCurrency && (
                <p className="text-xs text-muted-foreground font-medium">حساب فرعي</p>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {vault.description && (
                <p className="text-sm text-muted-foreground">{vault.description}</p>
              )}
              <div className="space-y-2">
                {vault.isMainVault && (
                  <>
                    <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
                      <span className="text-base font-bold">نقدي</span>
                      <span className="font-bold text-gray-600 dark:text-gray-400">
                        {((vault.balanceCash || 0) + getSubVaultsTotalBalances().totalCash).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <span className="text-base font-bold">درهم</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {(vault.balanceAED + getSubVaultsTotalBalances().totalAED).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <span className="text-base font-bold">بنكك</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {vault.isMainVault 
                      ? (vault.balanceSDG + getSubVaultsTotalBalances().totalSDG).toLocaleString()
                      : vault.balanceSDG.toLocaleString()
                    }
                  </span>
                </div>
                {!vault.isMainVault && (
                  <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <span className="text-base font-bold">درهم</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {vault.balanceAED.toLocaleString()}
                    </span>
                  </div>
                )}
                {(vault.isMainVault || vault.isForeignCurrency) && (
                  <>
                    <div className="flex justify-between p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                      <span className="text-base font-bold">دولار</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {vault.isMainVault 
                          ? ((vault.balanceUSD || 0) + getSubVaultsTotalBalances().totalUSD).toLocaleString()
                          : (vault.balanceUSD || 0).toLocaleString()
                        }
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                      <span className="text-base font-bold">ريال</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {vault.isMainVault 
                          ? ((vault.balanceSAR || 0) + getSubVaultsTotalBalances().totalSAR).toLocaleString()
                          : (vault.balanceSAR || 0).toLocaleString()
                        }
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جدول الأرصدة</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم الحساب</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">رصيد جنيه/بنكك</TableHead>
                <TableHead className="text-right">رصيد درهم</TableHead>
                <TableHead className="text-right">رصيد دولار</TableHead>
                <TableHead className="text-right">رصيد ريال</TableHead>
                <TableHead className="text-right">الوصف</TableHead>
                <TableHead className="text-right">تاريخ الإنشاء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* صف بنكك */}
              {/* صفوف الخزن */}
              {vaults
                .sort((a, b) => {
                  if (b.isMainVault && !a.isMainVault) return 1;
                  if (!b.isMainVault && a.isMainVault) return -1;
                  if (b.isForeignCurrency && !a.isForeignCurrency) return 1;
                  if (!b.isForeignCurrency && a.isForeignCurrency) return -1;
                  return 0;
                })
                .map((vault) => (
                <TableRow key={vault.id}>
                  <TableCell className="font-medium text-right">
                    {vault.name}
                    {vault.isMainVault && (
                      <span className="mr-2 text-xs text-blue-600 dark:text-blue-400">(رئيسية)</span>
                    )}
                    {vault.isForeignCurrency && (
                      <span className="mr-2 text-xs text-purple-600 dark:text-purple-400">(عملات أجنبية)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {vault.isMainVault ? 'خزنة رئيسية' : vault.isForeignCurrency ? 'عملات أجنبية' : 'خزنة فرعية'}
                  </TableCell>
                  <TableCell className="text-right">{vault.balanceSDG.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{vault.balanceAED.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{(vault.balanceUSD || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{(vault.balanceSAR || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground text-right">
                    {vault.description || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Date(vault.createdAt).toLocaleDateString('en-GB')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Vaults;
