import { useEffect, useState, useMemo } from 'react';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, CheckCircle, XCircle, Download, Printer } from 'lucide-react';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { storage } from '@/lib/storage';
import { Transaction, TransactionType, TransactionStatus, Currency, ExchangeDirection, Supplier } from '@/types';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vaults, setVaults] = useState(storage.getVaults());
  const [customers, setCustomers] = useState(storage.getCustomers());
  const [suppliers, setSuppliers] = useState(storage.getSuppliers());
  const [rates, setRates] = useState(storage.getRates());
  const [isOpen, setIsOpen] = useState(false);
  const [isBanakOpen, setIsBanakOpen] = useState(false);
  const [isCashOpen, setIsCashOpen] = useState(false);
  
  // Filter states
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('all');
  const [filterDirection, setFilterDirection] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [searchBankOpNumber, setSearchBankOpNumber] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'cash' | 'banak' | 'normal' | 'reverse'>('all');
  
  const [transactionNumber, setTransactionNumber] = useState('');
  const [exchangeDirection, setExchangeDirection] = useState<ExchangeDirection>('normal');
  const [amount, setAmount] = useState('');
  const [fromType, setFromType] = useState<'vault' | 'customer'>('vault');
  const [toType, setToType] = useState<'vault' | 'customer'>('customer');
  const [fromVaultId, setFromVaultId] = useState('');
  const [toVaultId, setToVaultId] = useState('');
  const [fromCustomerId, setFromCustomerId] = useState('');
  const [toCustomerId, setToCustomerId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [isCashCustomer, setIsCashCustomer] = useState(false);
  const [cashCustomerName, setCashCustomerName] = useState('');
  
  // Banak transfer state
  const [banakSourceVaultId, setBanakSourceVaultId] = useState('');
  const [banakSelectedVaults, setBanakSelectedVaults] = useState<string[]>([]);
  const [banakVaultAmounts, setBanakVaultAmounts] = useState<{[key: string]: string}>({});
  const [banakVaultSupplierOperationNumbers, setBanakVaultSupplierOperationNumbers] = useState<{[key: string]: string}>({});
  const [banakMultipleSuppliers, setBanakMultipleSuppliers] = useState(false);
  const [banakSingleSupplierId, setBanakSingleSupplierId] = useState('');
  const [banakSingleAmount, setBanakSingleAmount] = useState('');
  const [banakSingleRate, setBanakSingleRate] = useState('');
  const [banakSingleOperationNumber, setBanakSingleOperationNumber] = useState('');
  const [banakSelectedSuppliers, setBanakSelectedSuppliers] = useState<string[]>([]);
  const [banakSupplierRates, setBanakSupplierRates] = useState<{[key: string]: {amount: string, rate: string, operationNumber: string}}>({});
  const [banakNotes, setBanakNotes] = useState('');
  
  // Cash movement state
  const [cashMovementType, setCashMovementType] = useState<'receipt' | 'payment'>('receipt');
  const [cashAmount, setCashAmount] = useState('');
  const [cashPersonName, setCashPersonName] = useState('');
  const [cashNotes, setCashNotes] = useState('');
  const [cashVoucherNumber, setCashVoucherNumber] = useState('');
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadTransactions();
    
    // Listen for storage changes to reload transactions when updated from Dashboard
    const handleStorageChange = () => {
      loadTransactions();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for changes (for same-tab updates)
    const interval = setInterval(() => {
      loadTransactions();
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const loadTransactions = () => {
    setTransactions(storage.getTransactions());
    setVaults(storage.getVaults());
    setCustomers(storage.getCustomers());
    setSuppliers(storage.getSuppliers());
    setRates(storage.getRates());
  };

  const calculateProfitLoss = (amount: number, fromCurr: Currency, toCurr: Currency): number => {
    if (fromCurr === toCurr) return 0;
    
    const currentRate = rates[0];
    if (!currentRate) return 0;

    if (fromCurr === 'SDG' && toCurr === 'AED') {
      // Buying AED with SDG
      const expectedAmount = amount / currentRate.buyRate;
      const actualAmount = amount / currentRate.sellRate;
      return (actualAmount - expectedAmount) * currentRate.sellRate;
    } else {
      // Selling AED for SDG
      const expectedAmount = amount * currentRate.sellRate;
      const actualAmount = amount * currentRate.buyRate;
      return actualAmount - expectedAmount;
    }
  };

  const handleAdd = () => {
    // Validation: رقم العملية إلزامي للتحويل العادي والعكسي
    if (!transactionNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال رقم العملية',
      });
      return;
    }

    // التحقق من أن رقم العملية 5 أرقام بالضبط
    if (!/^\d{5}$/.test(transactionNumber.trim())) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'رقم العملية يجب أن يكون 5 أرقام بالضبط',
      });
      return;
    }

    // Check for duplicate transaction number
    const existingTx = transactions.find(t => t.transactionNumber === transactionNumber.trim());
    if (existingTx) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'رقم العملية موجود مسبقاً',
      });
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال مبلغ صحيح',
      });
      return;
    }

    // Validate source - نفس التحقق للعادي والعكسي
    if (!isCashCustomer && !fromCustomerId) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب اختيار العميل المصدر',
      });
      return;
    }
    // التحقق من اسم العميل النقدي
    if (isCashCustomer && !cashCustomerName.trim()) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال اسم العميل النقدي',
      });
      return;
    }
    
    // للعميل المباشر النقدي فقط، يجب اختيار الحساب
    if (exchangeDirection === 'normal' && isCashCustomer && !toVaultId) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب اختيار الحساب',
      });
      return;
    }
    
    // للتحويل العكسي، يجب اختيار الحساب دائماً
    if (exchangeDirection === 'reverse' && !toVaultId) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب اختيار الحساب',
      });
      return;
    }

    const currentRate = rates[0];
    
    // Set currencies based on exchange direction
    let finalFromCurrency: Currency = 'AED';
    let finalToCurrency: Currency = 'SDG';
    
    if (exchangeDirection === 'normal') {
      // Normal: AED to SDG (درهم مقابل جنيه)
      finalFromCurrency = 'AED';
      finalToCurrency = 'SDG';
    } else {
      // Reverse: SDG to AED (جنيه مقابل درهم)
      finalFromCurrency = 'SDG';
      finalToCurrency = 'AED';
    }
    
    const profitLoss = calculateProfitLoss(amt, finalFromCurrency, finalToCurrency);

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      transactionNumber: transactionNumber.trim(),
      type: 'transfer',
      status: exchangeDirection === 'normal' ? 'confirmed' : 'pending',
      amount: amt,
      currency: finalFromCurrency,
      customerId: customerId || undefined,
      fromVaultId: undefined,
      toVaultId: isCashCustomer ? toVaultId : undefined,
      fromCustomerId: isCashCustomer ? 'cash-customer' : fromCustomerId,
      toCustomerId: undefined,
      fromCurrency: finalFromCurrency,
      toCurrency: finalToCurrency,
      exchangeDirection: exchangeDirection,
      exchangeRate: currentRate ? (exchangeDirection === 'normal' ? currentRate.buyRate : currentRate.sellRate) : undefined,
      profitLoss: profitLoss,
      notes: isCashCustomer ? `عميل نقدي: ${cashCustomerName.trim()}${notes.trim() ? ' | ' + notes.trim() : ''}` : (notes.trim() || undefined),
      createdAt: new Date().toISOString(),
      createdBy: user?.id || '1',
      confirmedAt: exchangeDirection === 'normal' ? new Date().toISOString() : undefined,
      confirmedBy: exchangeDirection === 'normal' ? (user?.id || '1') : undefined,
    };

    // If transaction is confirmed (normal direction), update balance immediately
    if (exchangeDirection === 'normal') {
      // Calculate target amount with conversion
      let targetAmount = amt;
      if (finalFromCurrency !== finalToCurrency && currentRate) {
        if (finalFromCurrency === 'SDG') {
          targetAmount = amt / currentRate.sellRate;
        } else {
          targetAmount = amt * currentRate.buyRate;
        }
      }
      
      // للعميل المباشر النقدي: إضافة الرصيد للحساب
      if (isCashCustomer && toVaultId) {
        const vaultsData = storage.getVaults();
        const toVault = vaultsData.find(v => v.id === toVaultId);
        
        if (toVault) {
          // Add to vault balance
          if (finalToCurrency === 'SDG') {
            toVault.balanceSDG += targetAmount;
          } else {
            toVault.balanceAED += targetAmount;
          }
          
          storage.saveVaults(vaultsData);
          setVaults(vaultsData);
        }
      }
      // للعميل الموجود: إضافة الرصيد لرصيد العميل
      else if (!isCashCustomer && fromCustomerId) {
        const customersData = storage.getCustomers();
        const customer = customersData.find(c => c.id === fromCustomerId);
        
        if (customer) {
          // Add to customer balance
          if (finalToCurrency === 'SDG') {
            customer.balanceSDG += targetAmount;
          } else {
            customer.balanceAED += targetAmount;
          }
          
          storage.saveCustomers(customersData);
          setCustomers(customersData);
        }
      }
    }

    const updatedTransactions = [newTransaction, ...transactions];
    storage.saveTransactions(updatedTransactions);
    setTransactions(updatedTransactions);
    
    toast({
      title: 'تم الإضافة',
      description: exchangeDirection === 'normal' ? 'تم إضافة العملية وتحديث الرصيد' : 'تم إضافة العملية (في انتظار التأكيد)',
    });

    resetForm();
    setIsOpen(false);
  };

  const confirmTransaction = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || tx.status !== 'pending') return;

    const vaultsData = storage.getVaults();
    const customersData = storage.getCustomers();
    
    // لعمليات البنك: التأكيد الأول يحولها إلى "في الطريق للتسليم"
    if (tx.isBanakTransfer) {
      const updatedTx = {
        ...tx,
        status: 'in_transit' as TransactionStatus,
        confirmedAt: new Date().toISOString(),
        confirmedBy: user?.id || '1',
      };
      
      const updatedTransactions = transactions.map(t => t.id === txId ? updatedTx : t);
      storage.saveTransactions(updatedTransactions);
      setTransactions(updatedTransactions);
      
      toast({
        title: 'تم التأكيد',
        description: 'العملية الآن في الطريق للإستلام',
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
      
      // Check for negative balance
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
      // عملية إرسال بنكك: خصم من الحساب المصدر عند التأكيد فقط
      if (tx.isBanakTransfer) {
        if (tx.fromVaultId) {
          const fromVault = vaultsData.find(v => v.id === tx.fromVaultId);
          if (!fromVault) {
            toast({
              variant: 'destructive',
              title: 'خطأ',
              description: 'الحساب المصدر غير موجود',
            });
            return;
          }
          if (fromVault.balanceSDG < tx.amount) {
            toast({
              variant: 'destructive',
              title: 'خطأ',
              description: 'الرصيد غير كافٍ في الحساب',
            });
            return;
          }
          fromVault.balanceSDG -= tx.amount;
        }
      } else {
        // Calculate target amount with conversion
        let targetAmount = tx.amount;
        if (tx.fromCurrency !== tx.toCurrency && tx.exchangeRate) {
          if (tx.fromCurrency === 'SDG') {
            targetAmount = tx.amount / tx.exchangeRate;
          } else {
            targetAmount = tx.amount * tx.exchangeRate;
          }
        }
        
        if (tx.exchangeDirection === 'reverse') {
          // التحويل العكسي: نفس المنطق (عميل مباشر → خصم من الحساب، عميل موجود → خصم من رصيد العميل)
          if (tx.fromCustomerId === 'cash-customer' && tx.toVaultId) {
            // عميل مباشر نقدي: خصم من الحساب
            const toVault = vaultsData.find(v => v.id === tx.toVaultId);
            if (toVault) {
              const currentBalance = tx.fromCurrency === 'SDG' ? toVault.balanceSDG : toVault.balanceAED;
              if (currentBalance < tx.amount) {
                toast({
                  variant: 'destructive',
                  title: 'خطأ',
                  description: 'الرصيد غير كافٍ في الحساب',
                });
                return;
              }
              if (tx.fromCurrency === 'SDG') {
                toVault.balanceSDG -= tx.amount;
              } else {
                toVault.balanceAED -= tx.amount;
              }
            }
          } else if (tx.fromCustomerId && tx.fromCustomerId !== 'cash-customer') {
            // عميل موجود: خصم من رصيد العميل
            const customer = customersData.find(c => c.id === tx.fromCustomerId);
            if (customer) {
              const currentBalance = tx.fromCurrency === 'SDG' ? customer.balanceSDG : customer.balanceAED;
              if (currentBalance < tx.amount) {
                toast({
                  variant: 'destructive',
                  title: 'خطأ',
                  description: 'رصيد العميل غير كافٍ',
                });
                return;
              }
              if (tx.fromCurrency === 'SDG') {
                customer.balanceSDG -= tx.amount;
              } else {
                customer.balanceAED -= tx.amount;
              }
            }
          }
        } else {
          // عملية عادية (درهم→جنيه): الرصيد تمت إضافته عند الإنشاء
        }
      }
    }
    
    storage.saveVaults(vaultsData);
    storage.saveCustomers(customersData);
    setVaults(vaultsData);
    setCustomers(customersData);
    
    // Update transaction status
    const updatedTx = {
      ...tx,
      status: 'confirmed' as TransactionStatus,
      confirmedAt: new Date().toISOString(),
      confirmedBy: user?.id || '1',
    };
    
    const updatedTransactions = transactions.map(t => t.id === txId ? updatedTx : t);
    storage.saveTransactions(updatedTransactions);
    setTransactions(updatedTransactions);
    
    toast({
      title: 'تم التأكيد',
      description: tx.exchangeDirection === 'normal' 
        ? 'تم تأكيد وصول المبلغ وإضافته لحساب المستلم'
        : 'تم تأكيد العملية وتحديث الأرصدة',
    });
  };

  const deliverBanakTransaction = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || tx.status !== 'in_transit' || !tx.isBanakTransfer) return;

    const vaultsData = storage.getVaults();
    const mainVault = vaultsData.find(v => v.isMainVault);
    
    if (!mainVault) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'الخزنة الرئيسية غير موجودة',
      });
      return;
    }

    // حساب المبلغ بالدرهم بناءً على سعر الصرف
    const aedAmount = tx.amount / (tx.exchangeRate || 1);
    
    // إضافة المبلغ بالدرهم للخزنة الرئيسية
    mainVault.balanceAED += aedAmount;
    
    storage.saveVaults(vaultsData);
    setVaults(vaultsData);
    
    // تحديث حالة العملية إلى delivered
    const updatedTx = {
      ...tx,
      status: 'delivered' as TransactionStatus,
      approvedAt: new Date().toISOString(),
      approvedBy: user?.id || '1',
    };
    
    const updatedTransactions = transactions.map(t => t.id === txId ? updatedTx : t);
    storage.saveTransactions(updatedTransactions);
    setTransactions(updatedTransactions);
    
    toast({
      title: 'تم التسليم',
      description: `تم إضافة ${aedAmount.toFixed(2)} AED للخزنة الرئيسية`,
    });
  };

  const approveTransaction = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || tx.status !== 'confirmed') return;

    const vaultsData = storage.getVaults();
    const mainVault = vaultsData.find(v => v.isMainVault);
    
    if (!mainVault) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'الخزنة الرئيسية غير موجودة',
      });
      return;
    }
    
    // Calculate the target amount with conversion
    let targetAmount = tx.amount;
    if (tx.fromCurrency !== tx.toCurrency && tx.exchangeRate) {
      if (tx.fromCurrency === 'SDG') {
        targetAmount = tx.amount / tx.exchangeRate;
      } else {
        targetAmount = tx.amount * tx.exchangeRate;
      }
    }
    
    // Get recipient's account (toVaultId)
    const recipientVault = vaultsData.find(v => v.id === tx.toVaultId);
    if (!recipientVault) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'حساب المستلم غير موجود',
      });
      return;
    }
    
    // Check if recipient has enough balance
    const recipientBalance = tx.toCurrency === 'SDG' ? recipientVault.balanceSDG : recipientVault.balanceAED;
    if (recipientBalance < targetAmount) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'رصيد المستلم غير كافٍ',
      });
      return;
    }
    
    // Transfer from recipient to main vault
    if (tx.toCurrency === 'SDG') {
      recipientVault.balanceSDG -= targetAmount;
      mainVault.balanceSDG += targetAmount;
    } else {
      recipientVault.balanceAED -= targetAmount;
      mainVault.balanceAED += targetAmount;
    }
    
    storage.saveVaults(vaultsData);
    setVaults(vaultsData);
    
    // Update transaction status to approved
    const updatedTx = {
      ...tx,
      status: 'approved' as TransactionStatus,
      approvedAt: new Date().toISOString(),
      approvedBy: user?.id || '1',
    };
    
    const updatedTransactions = transactions.map(t => t.id === txId ? updatedTx : t);
    storage.saveTransactions(updatedTransactions);
    setTransactions(updatedTransactions);
    
    toast({
      title: 'تم الاعتماد',
      description: 'تم تحويل المبلغ من حساب المستلم إلى الخزنة الرئيسية',
    });
  };

  const cancelTransaction = (txId: string) => {
    const updatedTransactions = transactions.map(t =>
      t.id === txId ? { ...t, status: 'cancelled' as TransactionStatus } : t
    );
    storage.saveTransactions(updatedTransactions);
    setTransactions(updatedTransactions);
    
    toast({
      title: 'تم الإلغاء',
      description: 'تم إلغاء العملية',
    });
  };

  const resetForm = () => {
    setTransactionNumber('');
    setAmount('');
    setCustomerId('');
    setFromType('customer');
    setToType('vault');
    setFromVaultId('');
    setToVaultId('');
    setFromCustomerId('');
    setToCustomerId('');
    setExchangeDirection('normal');
    setNotes('');
    setIsCashCustomer(false);
    setCashCustomerName('');
  };

  const resetBanakForm = () => {
    setBanakSourceVaultId('');
    setBanakSelectedVaults([]);
    setBanakVaultAmounts({});
    setBanakVaultSupplierOperationNumbers({});
    setBanakMultipleSuppliers(false);
    setBanakSingleSupplierId('');
    setBanakSingleAmount('');
    setBanakSingleRate('');
    setBanakSingleOperationNumber('');
    setBanakSelectedSuppliers([]);
    setBanakSupplierRates({});
    setBanakNotes('');
  };

  const sendWhatsAppMessage = (whatsappNumber: string, supplierName: string, amount: number, rate: number) => {
    if (!whatsappNumber) return;
    
    const totalAmountAED = amount / rate;
    const senderNumber = '+249912988258';
    
    const message = encodeURIComponent(
      `السلام عليكم\n` +
      `تم ارسال قيمة بنكك\n` +
      `المبلغ المحدد: ${amount.toLocaleString()} SDG\n` +
      `سعر الصرف: ${rate}\n` +
      `المبلغ الكلي: ${totalAmountAED.toLocaleString()} درهم\n` +
      `من: ${senderNumber}`
    );
    
    // تحضير رابط واتساب
    const phone = whatsappNumber.replace(/[^0-9]/g, '');
    const whatsappUrl = `whatsapp://send?phone=${phone}&text=${message}`;

    // إذا كان التطبيق يعمل داخل نافذة معاينة (iframe)، افتح في تبويب جديد لتفادي رسالة "wa.me refused to connect"
    const isInIframe = (() => {
      try { return window.self !== window.top; } catch { return true; }
    })();

    if (isInIframe) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = whatsappUrl;
    }
  };

  const getSubVaultsTotalBanakBalance = () => {
    // حساب مجموع بنكك من الخزن الفرعية (غير الرئيسية وغير العملات الأجنبية)
    const subVaults = vaults.filter(v => !v.isMainVault && !v.isForeignCurrency);
    return subVaults.reduce((sum, v) => sum + v.balanceSDG, 0);
  };

  const getTotalBanakBalance = () => {
    const mainVault = vaults.find(v => v.isMainVault);
    if (!mainVault) return 0;
    // الرصيد الكلي = رصيد الخزنة الرئيسية + مجموع الخزن الفرعية
    return mainVault.balanceSDG + getSubVaultsTotalBanakBalance();
  };

  const getTotalSelectedAmount = () => {
    return banakSelectedVaults.reduce((sum, vaultId) => {
      const amount = parseFloat(banakVaultAmounts[vaultId] || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  };


  const handleBanakAdd = () => {
    // Validation - check if vaults are selected
    if (banakSelectedVaults.length === 0) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب اختيار حساب واحد على الأقل',
      });
      return;
    }

    // Validate vault amounts first
    const vaultData: Array<{vaultId: string, vault: any, requestedAmount: number}> = [];
    let totalRequestedAmount = 0;
    
    for (const vaultId of banakSelectedVaults) {
      const vault = vaults.find(v => v.id === vaultId);
      const requestedAmount = parseFloat(banakVaultAmounts[vaultId] || '0');
      
      // Validate amount
      if (isNaN(requestedAmount) || requestedAmount <= 0) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: `يجب إدخال مبلغ صحيح للحساب: ${vault?.name}`,
        });
        return;
      }

      // Check vault exists
      if (!vault) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'حساب غير موجود',
        });
        return;
      }

      // Check vault balance - warn early
      if (vault.balanceSDG < requestedAmount) {
        toast({
          variant: 'destructive',
          title: 'خطأ في الرصيد',
          description: `الرصيد غير كافٍ في ${vault.name}. الرصيد المتاح: ${vault.balanceSDG.toLocaleString()} SDG، المطلوب: ${requestedAmount.toLocaleString()} SDG. يرجى تعديل المبلغ أو إضافة حسابات أخرى.`,
        });
        return;
      }

      totalRequestedAmount += requestedAmount;
      vaultData.push({
        vaultId,
        vault,
        requestedAmount
      });
    }

    if (!banakMultipleSuppliers) {
      // Single supplier mode
      if (!banakSingleSupplierId) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'يجب اختيار المورد',
        });
        return;
      }

      const rate = parseFloat(banakSingleRate);
      if (isNaN(rate) || rate <= 0) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'يجب إدخال سعر صرف صحيح',
        });
        return;
      }

      // Get supplier info
      const supplier = suppliers.find(s => s.id === banakSingleSupplierId);
      if (!supplier) return;

      // Validate operation numbers for each vault that will be used
      const usedOperationNumbers = new Set<string>();
      for (const { vaultId, vault } of vaultData) {
        const opKey = `${vaultId}-${banakSingleSupplierId}`;
        const operationNumber = banakVaultSupplierOperationNumbers[opKey]?.trim() || '';
        
        if (!operationNumber) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: `يجب إدخال رقم العملية للحساب: ${vault.name}`,
          });
          return;
        }

        if (!/^\d{5}$/.test(operationNumber)) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: `رقم العملية يجب أن يكون 5 أرقام بالضبط للحساب: ${vault.name}`,
          });
          return;
        }

        if (usedOperationNumbers.has(operationNumber)) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: `رقم العملية ${operationNumber} مكرر. يجب أن يكون رقم العملية فريداً لكل إرسال`,
          });
          return;
        }

        const existingTx = transactions.find(t => t.bankOperationNumber === operationNumber);
        if (existingTx) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: `رقم العملية ${operationNumber} موجود مسبقاً في النظام`,
          });
          return;
        }

        usedOperationNumbers.add(operationNumber);
      }

      // Create transactions for each vault
      const newTransactions: Transaction[] = [];
      const vaultsData = [...vaults];

      for (const { vaultId, vault, requestedAmount } of vaultData) {
        const opKey = `${vaultId}-${banakSingleSupplierId}`;
        const operationNumber = banakVaultSupplierOperationNumbers[opKey].trim();
        const vaultToUpdate = vaultsData.find(v => v.id === vaultId);
        if (!vaultToUpdate) continue;

        // Deduct from vault
        vaultToUpdate.balanceSDG -= requestedAmount;

        // Create transaction
        const uniqueId = `${Date.now()}-${vaultId}-${Math.random().toString(36).substring(2, 9)}`;
        const newTransaction: Transaction = {
          id: uniqueId,
          transactionNumber: operationNumber,
          type: 'transfer',
          status: 'pending',
          amount: requestedAmount,
          currency: 'SDG',
          fromVaultId: vaultId,
          toCustomerId: banakSingleSupplierId,
          fromCurrency: 'SDG',
          toCurrency: 'SDG',
          exchangeRate: rate,
          isBanakTransfer: true,
          bankOperationNumber: operationNumber,
          whatsappNumber: supplier.whatsappNumber || supplier.whatsappGroup,
          notes: banakNotes.trim() ? `إرسال بنكك من ${vault.name}: ${banakNotes.trim()}` : `إرسال بنكك من ${vault.name}`,
          createdAt: new Date().toISOString(),
          createdBy: user?.id || '1',
        };

        newTransactions.push(newTransaction);
      }

      // Save all transactions and vaults
      const updatedTransactions = [...newTransactions, ...transactions];
      storage.saveTransactions(updatedTransactions);
      storage.saveVaults(vaultsData);
      setTransactions(updatedTransactions);
      setVaults(vaultsData);

      // Send WhatsApp message
      if (supplier.whatsappNumber || supplier.whatsappGroup) {
        sendWhatsAppMessage(supplier.whatsappNumber || supplier.whatsappGroup || '', supplier.name, totalRequestedAmount, rate);
      }

      toast({
        title: 'تم الإضافة',
        description: `تم إضافة ${newTransactions.length} عملية إرسال بنكك من ${banakSelectedVaults.length} حساب بإجمالي ${totalRequestedAmount.toLocaleString()} SDG`,
      });
    } else {
      // Multiple suppliers mode
      if (banakSelectedSuppliers.length === 0) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'يجب اختيار مورد واحد على الأقل',
        });
        return;
      }

      const validSuppliers = banakSelectedSuppliers.filter(supplierId => {
        const data = banakSupplierRates[supplierId];
        if (!data) return false;
        const amt = parseFloat(data.amount);
        const rate = parseFloat(data.rate);
        return !isNaN(amt) && amt > 0 && !isNaN(rate) && rate > 0;
      });

      if (validSuppliers.length === 0) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'يجب إدخال مبالغ وأسعار صرف صحيحة للموردين المحددين',
        });
        return;
      }

      // Calculate total amount needed for all suppliers
      const totalAmountNeeded = validSuppliers.reduce((sum, supplierId) => {
        const data = banakSupplierRates[supplierId];
        const amt = parseFloat(data.amount);
        return sum + amt;
      }, 0);

      // Check if total requested amount is sufficient
      if (totalRequestedAmount < totalAmountNeeded) {
        toast({
          variant: 'destructive',
          title: 'خطأ في الرصيد',
          description: `الرصيد المحدد غير كافٍ. المبلغ المطلوب للموردين: ${totalAmountNeeded.toLocaleString()} SDG، الرصيد المحدد: ${totalRequestedAmount.toLocaleString()} SDG. يرجى زيادة المبالغ من الحسابات أو إضافة حسابات أخرى.`,
        });
        return;
      }

      // Calculate distribution: which vaults will send to which suppliers
      // This is smart distribution based on available balances
      const distribution: Array<{vaultId: string, vault: any, supplierId: string, amount: number, rate: number}> = [];
      const vaultBalances = new Map<string, number>();
      
      // Initialize vault balances
      for (const { vaultId, requestedAmount } of vaultData) {
        vaultBalances.set(vaultId, requestedAmount);
      }

      // Distribute amounts to suppliers
      for (const supplierId of validSuppliers) {
        const data = banakSupplierRates[supplierId];
        const supplierAmount = parseFloat(data.amount);
        const rate = parseFloat(data.rate);
        let remainingAmount = supplierAmount;

        // Try to fulfill from available vaults
        for (const { vaultId, vault } of vaultData) {
          if (remainingAmount <= 0) break;
          
          const availableInVault = vaultBalances.get(vaultId) || 0;
          if (availableInVault <= 0) continue;

          const amountFromVault = Math.min(remainingAmount, availableInVault);
          distribution.push({
            vaultId,
            vault,
            supplierId,
            amount: amountFromVault,
            rate
          });

          vaultBalances.set(vaultId, availableInVault - amountFromVault);
          remainingAmount -= amountFromVault;
        }

        if (remainingAmount > 0.01) {
          const supplier = suppliers.find(s => s.id === supplierId);
          toast({
            variant: 'destructive',
            title: 'خطأ في التوزيع',
            description: `لا يمكن توفير المبلغ الكامل للمورد: ${supplier?.name}. ينقص: ${remainingAmount.toLocaleString()} SDG`,
          });
          return;
        }
      }

      // Now validate operation numbers only for actual transfers
      const usedOpNumbers = new Set<string>();
      for (const item of distribution) {
        const vault = vaults.find(v => v.id === item.vaultId);
        const supplier = suppliers.find(s => s.id === item.supplierId);
        const opKey = `${item.vaultId}-${item.supplierId}`;
        const operationNumber = banakVaultSupplierOperationNumbers[opKey]?.trim() || '';
        
        if (!operationNumber) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: `يجب إدخال رقم العملية للحساب: ${vault?.name} : ${supplier?.name}: المورد`,
          });
          return;
        }

        if (!/^\d{5}$/.test(operationNumber)) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: `رقم العملية يجب أن يكون 5 أرقام بالضبط للحساب: ${vault?.name} - المورد: ${supplier?.name}`,
          });
          return;
        }

        if (usedOpNumbers.has(operationNumber)) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: `رقم العملية ${operationNumber} مكرر. يجب أن يكون رقم العملية فريداً لكل إرسال`,
          });
          return;
        }

        const existingTx = transactions.find(t => t.bankOperationNumber === operationNumber);
        if (existingTx) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: `رقم العملية ${operationNumber} موجود مسبقاً في النظام`,
          });
          return;
        }

        usedOpNumbers.add(operationNumber);
      }

      // Create transactions based on distribution
      const newTransactions: Transaction[] = [];
      const vaultsData = [...vaults];

      for (const item of distribution) {
        const vaultToUpdate = vaultsData.find(v => v.id === item.vaultId);
        const supplier = suppliers.find(s => s.id === item.supplierId);
        if (!vaultToUpdate || !supplier) continue;

        const opKey = `${item.vaultId}-${item.supplierId}`;
        const operationNumber = banakVaultSupplierOperationNumbers[opKey].trim();

        // Deduct from vault
        vaultToUpdate.balanceSDG -= item.amount;

        // Create transaction
        const uniqueId = `${Date.now()}-${item.vaultId}-${item.supplierId}-${Math.random().toString(36).substring(2, 9)}`;
        const newTransaction: Transaction = {
          id: uniqueId,
          transactionNumber: operationNumber,
          type: 'transfer',
          status: 'pending',
          amount: item.amount,
          currency: 'SDG',
          fromVaultId: item.vaultId,
          toCustomerId: item.supplierId,
          fromCurrency: 'SDG',
          toCurrency: 'SDG',
          exchangeRate: item.rate,
          isBanakTransfer: true,
          bankOperationNumber: operationNumber,
          whatsappNumber: supplier.whatsappNumber || supplier.whatsappGroup,
          notes: banakNotes.trim() ? `إرسال بنكك من ${item.vault.name}: ${banakNotes.trim()}` : `إرسال بنكك من ${item.vault.name}`,
          createdAt: new Date().toISOString(),
          createdBy: user?.id || '1',
        };

        newTransactions.push(newTransaction);
      }

      // Save all transactions and vaults
      const updatedTransactions = [...newTransactions, ...transactions];
      storage.saveTransactions(updatedTransactions);
      storage.saveVaults(vaultsData);
      setTransactions(updatedTransactions);
      setVaults(vaultsData);

      // Send WhatsApp messages for each supplier
      const supplierTotals = new Map<string, {name: string, amount: number, rate: number, whatsapp: string}>();
      for (const item of distribution) {
        const supplier = suppliers.find(s => s.id === item.supplierId);
        if (!supplier) continue;
        
        const existing = supplierTotals.get(item.supplierId);
        if (existing) {
          existing.amount += item.amount;
        } else {
          supplierTotals.set(item.supplierId, {
            name: supplier.name,
            amount: item.amount,
            rate: item.rate,
            whatsapp: supplier.whatsappNumber || supplier.whatsappGroup || ''
          });
        }
      }

      supplierTotals.forEach((data, supplierId) => {
        if (data.whatsapp) {
          setTimeout(() => {
            sendWhatsAppMessage(data.whatsapp, data.name, data.amount, data.rate);
          }, 500);
        }
      });

      toast({
        title: 'تم الإضافة',
        description: `تم إضافة ${newTransactions.length} عملية إرسال بنكك لـ ${validSuppliers.length} مورد من ${banakSelectedVaults.length} حساب`,
      });
    }

    resetBanakForm();
    setIsBanakOpen(false);
  };

  const getStatusBadge = (tx: Transaction) => {
    const status = tx.status;
    
    // Check if transaction is confirmed but not approved yet
    if (status === 'confirmed' && !tx.approvedAt) {
      return <Badge className="bg-blue-500">مؤكد</Badge>;
    }
    
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">معتمد</Badge>;
      case 'confirmed':
        // If confirmed and has approvedAt, show as approved
        return tx.approvedAt ? <Badge className="bg-green-600">معتمد</Badge> : <Badge className="bg-blue-500">مؤكد</Badge>;
      case 'pending':
        return <Badge variant="secondary">في الانتظار</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">ملغي</Badge>;
      case 'in_transit':
        return <Badge className="bg-amber-500">في الطريق للاستلام</Badge>;
      case 'delivered':
        return <Badge className="bg-green-600">تم التسليم</Badge>;
    }
  };

  const getTypeName = (type: TransactionType, exchangeDirection?: ExchangeDirection) => {
    switch (type) {
      case 'deposit': return 'إيداع';
      case 'withdrawal': return 'سحب';
      case 'transfer': 
        if (exchangeDirection === 'normal') {
          return 'تحويل عادي';
        } else if (exchangeDirection === 'reverse') {
          return 'تحويل عكسي';
        }
        return 'تحويل';
    }
  };

  const getTransactionDirection = (tx: Transaction): 'incoming' | 'outgoing' => {
    if (tx.fromVaultId) return 'outgoing';
    if (tx.toVaultId) return 'incoming';
    return 'incoming';
  };

  const getAccountInfo = (tx: Transaction) => {
    const direction = getTransactionDirection(tx);
    
    if (direction === 'outgoing' && tx.fromVaultId) {
      const fromVault = vaults.find(v => v.id === tx.fromVaultId);
      const toName = tx.toCustomerId 
        ? (suppliers.find(s => s.id === tx.toCustomerId)?.name || customers.find(c => c.id === tx.toCustomerId)?.name || '-')
        : '-';
      return { from: fromVault?.name || '-', to: toName, direction: 'outgoing' as const };
    }
    
    if (direction === 'incoming' && tx.toVaultId) {
      const fromName = tx.fromCustomerId === 'cash-customer' 
        ? 'عميل نقدي'
        : (customers.find(c => c.id === tx.fromCustomerId)?.name || '-');
      const toVault = vaults.find(v => v.id === tx.toVaultId);
      return { from: fromName, to: toVault?.name || '-', direction: 'incoming' as const };
    }
    
    return { from: '-', to: '-', direction: 'incoming' as const };
  };

  const filteredTransactions = transactions.filter(tx => {
    // Filter by active tab
    if (activeTab !== 'all') {
      if (activeTab === 'cash') {
        // حركة النقدي: العمليات التي تبدأ بـ V- أو CASH-
        if (!tx.transactionNumber.startsWith('V-') && !tx.transactionNumber.startsWith('CASH-')) {
          return false;
        }
      } else if (activeTab === 'banak') {
        // إرسال بنكك: العمليات التي isBanakTransfer = true
        if (!tx.isBanakTransfer) return false;
      } else if (activeTab === 'normal') {
        // تحويل عادي: العمليات التي exchangeDirection = 'normal' وليست بنكك أو حركة نقدي
        if (tx.exchangeDirection !== 'normal' || tx.isBanakTransfer || tx.transactionNumber.startsWith('V-') || tx.transactionNumber.startsWith('CASH-')) {
          return false;
        }
      } else if (activeTab === 'reverse') {
        // تحويل عكسي: العمليات التي exchangeDirection = 'reverse' وليست بنكك أو حركة نقدي
        if (tx.exchangeDirection !== 'reverse' || tx.isBanakTransfer || tx.transactionNumber.startsWith('V-') || tx.transactionNumber.startsWith('CASH-')) {
          return false;
        }
      }
    }
    
    // Filter by date
    if (filterStartDate || filterEndDate) {
      const txDate = new Date(tx.createdAt);
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        if (txDate < start) return false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        if (txDate > end) return false;
      }
    }

    // Filter by account
    if (filterAccountId && filterAccountId !== 'all') {
      // Handle cash movement filter
      if (filterAccountId === 'cash-movement') {
        // Show only transactions that start with V- or CASH-
        if (!tx.transactionNumber.startsWith('V-') && !tx.transactionNumber.startsWith('CASH-')) {
          return false;
        }
      } else if (filterAccountId === 'all-vaults') {
        // Show all vault-related transactions
        const vaultIds = vaults.map(v => v.id);
        const isVaultRelated = vaultIds.includes(tx.fromVaultId || '') || vaultIds.includes(tx.toVaultId || '');
        if (!isVaultRelated) return false;
      } else if (filterAccountId === 'all-customers') {
        // Show all customer-related transactions
        const customerIds = customers.map(c => c.id);
        const isCustomerRelated = customerIds.includes(tx.fromCustomerId || '') || customerIds.includes(tx.toCustomerId || '') || tx.fromCustomerId === 'cash-customer';
        if (!isCustomerRelated) return false;
      } else if (filterAccountId === 'all-suppliers') {
        // Show all supplier-related transactions (Banak transfers)
        if (!tx.isBanakTransfer) return false;
      } else {
        const isRelated = tx.fromVaultId === filterAccountId || 
                         tx.toVaultId === filterAccountId ||
                         tx.fromCustomerId === filterAccountId ||
                         tx.toCustomerId === filterAccountId;
        if (!isRelated) return false;
      }
    }

    // Filter by direction
    if (filterDirection !== 'all') {
      const txDirection = getTransactionDirection(tx);
      if (txDirection !== filterDirection) return false;
    }

    // Filter by bank operation number
    if (searchBankOpNumber.trim() && tx.bankOperationNumber) {
      if (!tx.bankOperationNumber.includes(searchBankOpNumber.trim())) return false;
    }

    return true;
  });

  const handleExport = () => {
    toast({
      title: 'تصدير البيانات',
      description: 'جاري تصدير سجل العمليات...',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const totals = useMemo(() => {
    let totalSDG = 0;
    let totalAED = 0;
    
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'transfer' && tx.fromCurrency && tx.toCurrency) {
        if (tx.isBanakTransfer && tx.exchangeRate) {
          totalAED += tx.amount / tx.exchangeRate;
        } else if (tx.fromCurrency !== tx.toCurrency && tx.exchangeRate) {
          if (tx.toCurrency === 'SDG') {
            totalSDG += tx.fromCurrency === 'SDG' ? tx.amount / tx.exchangeRate : tx.amount * tx.exchangeRate;
          } else if (tx.toCurrency === 'AED') {
            totalAED += tx.fromCurrency === 'SDG' ? tx.amount / tx.exchangeRate : tx.amount * tx.exchangeRate;
          }
        }
      }
    });
    
    return { totalSDG, totalAED };
  }, [filteredTransactions]);

  const handleCashMovement = () => {
    const amt = parseFloat(cashAmount);
    if (isNaN(amt) || amt <= 0) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال مبلغ صحيح',
      });
      return;
    }

    if (!cashPersonName.trim()) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال اسم الشخص',
      });
      return;
    }

    const vaultsData = storage.getVaults();
    const mainVault = vaultsData.find(v => v.isMainVault);
    
    if (!mainVault) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'الخزنة الرئيسية غير موجودة',
      });
      return;
    }

    // Check if there's enough balance for payment
    if (cashMovementType === 'payment' && mainVault.balanceCash < amt) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'الرصيد النقدي غير كافٍ في الخزنة الرئيسية',
      });
      return;
    }

    // Update main vault cash balance
    if (cashMovementType === 'receipt') {
      mainVault.balanceCash = (mainVault.balanceCash || 0) + amt;
    } else {
      mainVault.balanceCash = (mainVault.balanceCash || 0) - amt;
    }

    storage.saveVaults(vaultsData);
    setVaults(vaultsData);

    // Create transaction record
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      transactionNumber: cashVoucherNumber,
      type: cashMovementType === 'receipt' ? 'deposit' : 'withdrawal',
      status: 'confirmed',
      amount: amt,
      currency: 'AED',
      vaultId: mainVault.id,
      notes: `نقدي: ${cashMovementType === 'receipt' ? 'استلام من' : 'تسليم إلى'} ${cashPersonName.trim()}${cashNotes.trim() ? ' - ' + cashNotes.trim() : ''}`,
      createdAt: new Date().toISOString(),
      createdBy: user?.id || '1',
      confirmedAt: new Date().toISOString(),
      confirmedBy: user?.id || '1',
    };

    const updatedTransactions = [newTransaction, ...transactions];
    storage.saveTransactions(updatedTransactions);
    setTransactions(updatedTransactions);

    toast({
      title: 'تم بنجاح',
      description: cashMovementType === 'receipt' ? 'تم إضافة المبلغ للخزنة الرئيسية' : 'تم خصم المبلغ من الخزنة الرئيسية',
    });

    // Reset form
    setCashAmount('');
    setCashPersonName('');
    setCashNotes('');
    setCashMovementType('receipt');
    setCashVoucherNumber('');
    setIsCashOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">العمليات</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة عمليات التحويل والصرف</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>تصدير</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            <span>طباعة</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full" dir="rtl">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="normal">تحويل عادي</TabsTrigger>
          <TabsTrigger value="reverse">تحويل عكسي</TabsTrigger>
          <TabsTrigger value="banak">إرسال بنكك</TabsTrigger>
          <TabsTrigger value="cash">حركة النقدي</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4" dir="rtl">
          <div className="flex gap-2 no-print justify-start">
            <Dialog open={isCashOpen} onOpenChange={(open) => {
            if (open) {
              // توليد رقم إذن صرف جديد عند فتح الـ dialog
              const voucherNum = `V-${Date.now().toString().slice(-8)}`;
              setCashVoucherNumber(voucherNum);
            }
            setIsCashOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button 
                size="sm"
                className="relative overflow-hidden flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--banak-gradient-start)), hsl(var(--banak-gradient-end)))',
                }}
              >
                <Plus className="h-4 w-4" />
                <span>حركة النقدي</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>حركة النقدي</DialogTitle>
                <DialogDescription>
                  إذن صرف أو استلام للخزنة الرئيسية
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">رقم الإذن</Label>
                    <div className="font-mono text-lg font-bold text-primary">{cashVoucherNumber}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>نوع الحركة *</Label>
                  <Select value={cashMovementType} onValueChange={(v) => setCashMovementType(v as 'receipt' | 'payment')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receipt">إذن استلام (إضافة للخزنة)</SelectItem>
                      <SelectItem value="payment">إذن صرف (خصم من الخزنة)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cashPersonName">
                    {cashMovementType === 'receipt' ? 'اسم الشخص المُستلِم منه' : 'اسم الشخص المُستلِم'} *
                  </Label>
                  <Input
                    id="cashPersonName"
                    type="text"
                    value={cashPersonName}
                    onChange={(e) => setCashPersonName(e.target.value)}
                    placeholder={cashMovementType === 'receipt' ? 'أدخل اسم الشخص المُستلِم منه' : 'أدخل اسم الشخص المُستلِم'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cashAmount">المبلغ *</Label>
                  <Input
                    id="cashAmount"
                    type="number"
                    step="0.01"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="1000.00"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cashNotes">الملاحظات (اختياري)</Label>
                  <Textarea
                    id="cashNotes"
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    placeholder="أدخل ملاحظات..."
                    rows={3}
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {cashMovementType === 'receipt' 
                      ? '✓ سيتم إضافة المبلغ للرصيد النقدي في الخزنة الرئيسية'
                      : '✓ سيتم خصم المبلغ من الرصيد النقدي في الخزنة الرئيسية'
                    }
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCashOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleCashMovement}>
                  {cashMovementType === 'receipt' ? 'إضافة' : 'صرف'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isBanakOpen} onOpenChange={setIsBanakOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm"
                className="relative overflow-hidden flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--banak-gradient-start)), hsl(var(--banak-gradient-end)))',
                }}
              >
                <Plus className="h-4 w-4" />
                <span>إرسال بنكك</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إرسال بنكك</DialogTitle>
                <DialogDescription>
                  إرسال مبالغ بنكك إلى موردين
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* عرض الرصيد الكلي بنكك */}
                <div className="bg-primary/10 p-2 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    الرصيد الكلي بنكك: <span className="font-bold text-primary">{getTotalBanakBalance().toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} SDG</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>اختر الحسابات *</Label>
                  <MultiSelect
                    options={vaults.filter(v => !v.isMainVault).map(v => ({
                      label: `${v.name} (${v.balanceSDG.toLocaleString()} SDG)`,
                      value: v.id
                    } as Option))}
                    selected={banakSelectedVaults}
                    onChange={(selected) => {
                      setBanakSelectedVaults(selected);
                      // Remove amounts for unselected vaults
                      const newAmounts = {...banakVaultAmounts};
                      Object.keys(newAmounts).forEach(id => {
                        if (!selected.includes(id)) {
                          delete newAmounts[id];
                        }
                      });
                      setBanakVaultAmounts(newAmounts);
                      
                      // Clean up operation numbers for unselected vaults
                      const newOpNumbers = {...banakVaultSupplierOperationNumbers};
                      Object.keys(newOpNumbers).forEach(key => {
                        const vaultId = key.split('-')[0];
                        if (!selected.includes(vaultId)) {
                          delete newOpNumbers[key];
                        }
                      });
                      setBanakVaultSupplierOperationNumbers(newOpNumbers);
                    }}
                    placeholder="اختر الحسابات..."
                  />
                </div>

                {banakSelectedVaults.length > 0 && (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
                      <Label>المبالغ من كل حساب *</Label>
                      {banakSelectedVaults.map(vaultId => {
                        const vault = vaults.find(v => v.id === vaultId);
                        if (!vault) return null;
                        const currentAmount = banakVaultAmounts[vaultId] || '';
                        return (
                          <div key={vaultId} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                            <Label className="font-semibold flex items-center justify-between">
                              <span>{vault.name}</span>
                              <span className="text-xs text-primary font-bold">
                                الرصيد: {vault.balanceSDG.toLocaleString()} SDG
                              </span>
                            </Label>
                            <div>
                              <Label htmlFor={`vault-amount-${vaultId}`} className="text-xs">
                                المبلغ المراد إرساله (قابل للتعديل)
                              </Label>
                              <Input
                                id={`vault-amount-${vaultId}`}
                                type="number"
                                step="0.01"
                                value={currentAmount}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBanakVaultAmounts({
                                    ...banakVaultAmounts,
                                    [vaultId]: val
                                  });
                                }}
                                onFocus={(e) => {
                                  // Auto-fill with available balance if empty
                                  if (!currentAmount) {
                                    setBanakVaultAmounts({
                                      ...banakVaultAmounts,
                                      [vaultId]: vault.balanceSDG.toString()
                                    });
                                  }
                                }}
                                placeholder={vault.balanceSDG.toString()}
                                dir="ltr"
                                className="text-lg font-bold"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      id="multipleSuppliers"
                      checked={banakMultipleSuppliers}
                      onChange={(e) => {
                        setBanakMultipleSuppliers(e.target.checked);
                        if (e.target.checked) {
                          setBanakSingleSupplierId('');
                          setBanakSingleAmount('');
                          setBanakSingleRate('');
                        } else {
                          setBanakSupplierRates({});
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="multipleSuppliers" className="cursor-pointer">
                      إرسال لعدة موردين
                    </Label>
                  </div>

                  {banakMultipleSuppliers ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>اختر الموردين *</Label>
                        <MultiSelect
                          options={suppliers.map(s => ({
                              label: `${s.name}${(s.whatsappNumber || s.whatsappGroup) ? ' ✓' : ''}`,
                              value: s.id
                            } as Option))}
                          selected={banakSelectedSuppliers}
                          onChange={(selected) => {
                            setBanakSelectedSuppliers(selected);
                            // Remove rates for unselected suppliers
                            const newRates = {...banakSupplierRates};
                            Object.keys(newRates).forEach(id => {
                              if (!selected.includes(id)) {
                                delete newRates[id];
                              }
                            });
                            setBanakSupplierRates(newRates);
                          }}
                          placeholder="اختر الموردين..."
                        />
                      </div>

                      {/* عرض المبلغ الإجمالي المتاح */}
                      {getTotalSelectedAmount() > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-950 p-2.5 rounded-lg mb-2">
                          <Label className="text-xs font-semibold">المبلغ الإجمالي المتاح للتوزيع:</Label>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                            {getTotalSelectedAmount().toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            <span className="text-xs mr-2">SDG</span>
                          </p>
                        </div>
                      )}

                      {banakSelectedSuppliers.length > 0 && (
                        <div className="space-y-3 border rounded-lg p-4 max-h-96 overflow-y-auto">
                          <Label className="font-bold text-primary">المبالغ وأسعار الصرف وأرقام العمليات *</Label>
                          <p className="text-xs text-muted-foreground">كل مورد من كل حساب يحتاج رقم عملية مختلف</p>
                          {banakSelectedSuppliers.map(supplierId => {
                            const supplier = suppliers.find(s => s.id === supplierId);
                            if (!supplier) return null;
                            const data = banakSupplierRates[supplierId] || { amount: '', rate: '', operationNumber: '' };
                            return (
                              <div key={supplierId} className="space-y-3 p-4 border-2 border-primary/30 rounded-lg bg-muted/50">
                                <Label className="font-bold text-lg text-primary">{supplier.name}</Label>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                  <div>
                                    <Label htmlFor={`supplier-amount-${supplierId}`} className="text-xs">
                                      المبلغ SDG *
                                    </Label>
                                    <Input
                                      id={`supplier-amount-${supplierId}`}
                                      type="number"
                                      step="0.01"
                                      value={data.amount}
                                      onChange={(e) => {
                                        setBanakSupplierRates({
                                          ...banakSupplierRates,
                                          [supplierId]: { ...data, amount: e.target.value }
                                        });
                                      }}
                                      placeholder="1000.00"
                                      dir="ltr"
                                      className="font-bold"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`supplier-rate-${supplierId}`} className="text-xs">
                                      سعر الصرف *
                                    </Label>
                                    <Input
                                      id={`supplier-rate-${supplierId}`}
                                      type="number"
                                      step="0.01"
                                      value={data.rate}
                                      onChange={(e) => {
                                        setBanakSupplierRates({
                                          ...banakSupplierRates,
                                          [supplierId]: { ...data, rate: e.target.value }
                                        });
                                      }}
                                      placeholder="880.00"
                                      dir="ltr"
                                      className="font-bold"
                                    />
                                  </div>
                                </div>
                                {data.amount && data.rate && (
                                  <p className="text-xs text-muted-foreground mb-2">
                                    = {(parseFloat(data.amount) / parseFloat(data.rate)).toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })} AED
                                  </p>
                                )}
                                <div className="space-y-2">
                                  <Label className="font-semibold text-sm">أرقام العمليات من كل حساب *</Label>
                                  {banakSelectedVaults.map(vaultId => {
                                    const vault = vaults.find(v => v.id === vaultId);
                                    if (!vault) return null;
                                    const opKey = `${vaultId}-${supplierId}`;
                                    const currentOpNumber = banakVaultSupplierOperationNumbers[opKey] || '';
                                    return (
                                      <div key={opKey} className="flex items-center gap-2 p-2 bg-background rounded border">
                                        <Label className="text-xs min-w-[120px] font-semibold">{vault.name}</Label>
                                        <Input
                                          type="text"
                                          inputMode="numeric"
                                          pattern="\d{5}"
                                          maxLength={5}
                                          value={currentOpNumber}
                                          onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                                            setBanakVaultSupplierOperationNumbers({
                                              ...banakVaultSupplierOperationNumbers,
                                              [opKey]: val
                                            });
                                          }}
                                          placeholder="12345"
                                          dir="ltr"
                                          className="flex-1 font-mono font-bold"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>اختر المورد *</Label>
                        <Select value={banakSingleSupplierId} onValueChange={setBanakSingleSupplierId}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المورد" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {suppliers.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} {(s.whatsappNumber || s.whatsappGroup) && '✓'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* عرض المبلغ الإجمالي المحدد من الحسابات */}
                      {getTotalSelectedAmount() > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-950 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">المبلغ الإجمالي المحدد:</Label>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {getTotalSelectedAmount().toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                              <span className="text-xs mr-2">SDG</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              سيتم إرسال هذا المبلغ للمورد المحدد
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="banakSingleRate">سعر الصرف (يدوي) *</Label>
                        <Input
                          id="banakSingleRate"
                          type="number"
                          step="0.01"
                          value={banakSingleRate}
                          onChange={(e) => setBanakSingleRate(e.target.value)}
                          placeholder="150.00"
                          dir="ltr"
                        />
                        {banakSingleRate && getTotalSelectedAmount() > 0 && (
                          <p className="text-xs text-muted-foreground">
                            المبلغ بالدرهم: {(getTotalSelectedAmount() / parseFloat(banakSingleRate)).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} AED
                          </p>
                        )}
                      </div>

                      {banakSingleSupplierId && banakSingleRate && getTotalSelectedAmount() > 0 && suppliers.find(s => s.id === banakSingleSupplierId) && (
                        <div className="space-y-3">
                          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                            <Label className="text-sm text-green-700 dark:text-green-300">
                              رقم الواتساب: {suppliers.find(s => s.id === banakSingleSupplierId)?.whatsappNumber || suppliers.find(s => s.id === banakSingleSupplierId)?.whatsappGroup || 'غير محدد'}
                            </Label>
                            {!(suppliers.find(s => s.id === banakSingleSupplierId)?.whatsappNumber || suppliers.find(s => s.id === banakSingleSupplierId)?.whatsappGroup) && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                ⚠️ يرجى إضافة رقم واتساب للمورد لإرسال الرسالة
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="font-semibold text-sm">أرقام العمليات من كل حساب *</Label>
                            <div className="space-y-2">
                              {banakSelectedVaults.map(vaultId => {
                                const vault = vaults.find(v => v.id === vaultId);
                                if (!vault) return null;
                                const opKey = `${vaultId}-${banakSingleSupplierId}`;
                                const currentOpNumber = banakVaultSupplierOperationNumbers[opKey] || '';
                                return (
                                  <div key={opKey} className="flex items-center gap-2 p-2 bg-background rounded border">
                                    <Label className="text-xs min-w-[120px] font-semibold">{vault.name}</Label>
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="\d{5}"
                                      maxLength={5}
                                      value={currentOpNumber}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                                        setBanakVaultSupplierOperationNumbers({
                                          ...banakVaultSupplierOperationNumbers,
                                          [opKey]: val
                                        });
                                      }}
                                      placeholder="12345"
                                      dir="ltr"
                                      className="flex-1 font-mono font-bold"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banakNotes">ملاحظات</Label>
                  <Textarea
                    id="banakNotes"
                    value={banakNotes}
                    onChange={(e) => setBanakNotes(e.target.value)}
                    placeholder="ملاحظات إضافية..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBanakOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleBanakAdd}>إرسال</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isOpen && exchangeDirection === 'normal'} onOpenChange={(open) => {
            if (open) {
              setExchangeDirection('normal');
            }
            setIsOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button 
                size="sm"
                className="flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--banak-gradient-start)), hsl(var(--banak-gradient-end)))',
                }}
              >
                <Plus className="h-4 w-4" />
                <span>تحويل عادي</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إضافة عملية جديدة</DialogTitle>
                <DialogDescription>
                  أدخل تفاصيل العملية (ستكون في حالة انتظار حتى التأكيد)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="type">نوع العملية *</Label>
                <Select value={exchangeDirection} onValueChange={(v) => {
                  setExchangeDirection(v as ExchangeDirection);
                  // إعادة تعيين القيم
                  setFromType('customer');
                  setToType('vault');
                  setFromVaultId('');
                  setToCustomerId('');
                  setIsCashCustomer(false);
                  setCashCustomerName('');
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">تحويل عادي (درهم مقابل جنيه)</SelectItem>
                    <SelectItem value="reverse">تحويل عكسي (جنيه مقابل درهم)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* رقم العملية إلزامي لجميع العمليات */}
              <div className="space-y-2">
                <Label htmlFor="txNumber">رقم العملية * (5 أرقام)</Label>
                <Input
                  id="txNumber"
                  value={transactionNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setTransactionNumber(value);
                  }}
                  placeholder="12345"
                  maxLength={5}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  أدخل رقم العملية (5 أرقام فقط - يجب أن يكون فريداً)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ {exchangeDirection === 'normal' ? '(بالدرهم)' : '(بالجنيه)'} *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000.00"
                  dir="ltr"
                />
              </div>
              
              {exchangeDirection === 'normal' ? (
                // التحويل العادي: من عميل → إلى حساب (ليس الخزنة الرئيسية)
                <>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 space-x-reverse mb-2">
                      <input
                        type="checkbox"
                        id="cashCustomer"
                        checked={isCashCustomer}
                        onChange={(e) => {
                          setIsCashCustomer(e.target.checked);
                          if (e.target.checked) {
                            setFromCustomerId('');
                          } else {
                            setCashCustomerName('');
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="cashCustomer" className="cursor-pointer">
                        عميل نقدي (تحويل مباشر بدون رصيد)
                      </Label>
                    </div>
                    
                    {isCashCustomer ? (
                      <>
                        <Label>اسم العميل النقدي *</Label>
                        <Input
                          value={cashCustomerName}
                          onChange={(e) => setCashCustomerName(e.target.value)}
                          placeholder="أدخل اسم العميل"
                        />
                      </>
                    ) : (
                      <>
                        <Label>من العميل *</Label>
                        <Select value={fromCustomerId} onValueChange={(v) => {
                          setFromCustomerId(v);
                          setFromType('customer');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر العميل" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  {/* إظهار حقل الحساب فقط للعميل المباشر النقدي */}
                  {isCashCustomer && (
                    <div className="space-y-2">
                      <Label>إلى الحساب *</Label>
                      <Select value={toVaultId} onValueChange={(v) => {
                        setToVaultId(v);
                        setToType('vault');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحساب" />
                        </SelectTrigger>
                        <SelectContent>
                          {vaults
                            .filter(v => !v.isMainVault)
                            .map(v => (
                              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* رسالة توضيحية للعميل الموجود */}
                  {!isCashCustomer && fromCustomerId && (
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        سيتم إضافة المبلغ إلى رصيد العميل المحدد
                      </p>
                    </div>
                  )}
                </>
              ) : (
                // التحويل العكسي: نفس المنطق (عميل مباشر → حساب، عميل موجود → رصيد العميل)
                <>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 space-x-reverse mb-2">
                      <input
                        type="checkbox"
                        id="cashCustomerReverse"
                        checked={isCashCustomer}
                        onChange={(e) => {
                          setIsCashCustomer(e.target.checked);
                          if (e.target.checked) {
                            setFromCustomerId('');
                          } else {
                            setCashCustomerName('');
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="cashCustomerReverse" className="cursor-pointer">
                        عميل نقدي (تحويل مباشر بدون رصيد)
                      </Label>
                    </div>
                    
                    {isCashCustomer ? (
                      <>
                        <Label>اسم العميل النقدي *</Label>
                        <Input
                          value={cashCustomerName}
                          onChange={(e) => setCashCustomerName(e.target.value)}
                          placeholder="أدخل اسم العميل"
                        />
                      </>
                    ) : (
                      <>
                        <Label>من العميل *</Label>
                        <Select value={fromCustomerId} onValueChange={(v) => {
                          setFromCustomerId(v);
                          setFromType('customer');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر العميل" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  {/* إظهار حقل الحساب فقط للعميل المباشر النقدي */}
                  {isCashCustomer && (
                    <div className="space-y-2">
                      <Label>إلى الحساب *</Label>
                      <Select value={toVaultId} onValueChange={(v) => {
                        setToVaultId(v);
                        setToType('vault');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحساب" />
                        </SelectTrigger>
                        <SelectContent>
                          {vaults
                            .filter(v => !v.isMainVault)
                            .map(v => (
                              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* رسالة توضيحية للعميل الموجود */}
                  {!isCashCustomer && fromCustomerId && (
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        سيتم إضافة المبلغ إلى رصيد العميل المحدد
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAdd}>إرسال</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isOpen && exchangeDirection === 'reverse'} onOpenChange={(open) => {
          if (open) {
            setExchangeDirection('reverse');
          }
          setIsOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button 
              size="sm"
              className="flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--banak-gradient-start)), hsl(var(--banak-gradient-end)))',
              }}
            >
              <Plus className="h-4 w-4" />
              <span>تحويل عكسي</span>
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      <Card dir="rtl">
      <CardHeader className="py-2 pb-1">
        <CardTitle className="text-base">فلترة العمليات</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label htmlFor="filterStartDate" className="text-xs">من تاريخ</Label>
              <Input
                id="filterStartDate"
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filterEndDate" className="text-xs">إلى تاريخ</Label>
              <Input
                id="filterEndDate"
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filterAccount" className="text-xs">الحساب/العميل</Label>
              <Select value={filterAccountId} onValueChange={setFilterAccountId}>
                <SelectTrigger id="filterAccount" className="h-9">
                  <SelectValue placeholder="جميع الحسابات" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">✓ جميع الحسابات</SelectItem>
                  <SelectSeparator />
                  <SelectItem value="all-vaults" className="font-bold text-primary">الحسابات</SelectItem>
                  {vaults.map(v => (
                    <SelectItem key={v.id} value={v.id} className="pr-6">{v.name}</SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="cash-movement" className="font-bold text-primary">حركة النقدي</SelectItem>
                  <SelectSeparator />
                  <SelectItem value="all-customers" className="font-bold text-primary">العملاء</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id} className="pr-6">{c.name}</SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="all-suppliers" className="font-bold text-primary">الموردين</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id} className="pr-6">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="filterDirection" className="text-xs">نوع التحويل</Label>
              <Select value={filterDirection} onValueChange={(v) => setFilterDirection(v as any)}>
                <SelectTrigger id="filterDirection" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="incoming">وارد</SelectItem>
                  <SelectItem value="outgoing">صادر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* حقل البحث برقم العملية البنكية */}
          <div className="mt-3 bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="space-y-1">
              <Label htmlFor="searchBankOpNumber" className="text-xs font-bold text-amber-900 dark:text-amber-100">
                البحث برقم العملية (إرسال بنكك) آخر 5 أرقام
              </Label>
              <Input
                id="searchBankOpNumber"
                type="text"
                maxLength={5}
                value={searchBankOpNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // أرقام فقط
                  setSearchBankOpNumber(value);
                }}
                placeholder="أدخل رقم العملية (5 أرقام)"
                dir="ltr"
                className="h-9 text-center font-bold"
              />
              {searchBankOpNumber && (
                <p className="text-xs text-muted-foreground">
                  عدد النتائج: {filteredTransactions.filter(t => t.bankOperationNumber?.includes(searchBankOpNumber)).length}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="transaction-log-card" dir="rtl">
        <CardHeader>
          <CardTitle>سجل العمليات</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">رقم العملية</TableHead>
                <TableHead className="text-center">التاريخ</TableHead>
                <TableHead className="text-center">النوع</TableHead>
                <TableHead className="text-center">من</TableHead>
                <TableHead className="text-center">إلى</TableHead>
                <TableHead className="text-center">المبلغ</TableHead>
                <TableHead className="text-center">Rate</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((tx) => {
                const accountInfo = getAccountInfo(tx);
                const isBanak = tx.isBanakTransfer;
                return (
                  <TableRow 
                    key={tx.id}
                    className={isBanak ? 'relative' : ''}
                    style={isBanak ? { 
                      background: 'linear-gradient(90deg, hsl(var(--banak-gradient-start)/0.08), hsl(var(--banak-gradient-end)/0.08))'
                    } : undefined}
                  >
                    <TableCell className="font-medium text-center tabular-nums relative z-10 whitespace-nowrap" dir="ltr">
                      <span className="text-xs">
                        {tx.bankOperationNumber || tx.transactionNumber}
                      </span>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap relative z-10" dir="ltr">
                      {new Date(tx.createdAt).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-center relative z-10 whitespace-nowrap">
                      <div className="flex flex-col items-center">
                        <span>{accountInfo.direction === 'incoming' ? 'تحويل وارد' : 'تحويل صادر'}</span>
                        {isBanak && <span className="text-xs text-muted-foreground">(بنكك)</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center relative z-10 whitespace-nowrap">{accountInfo.from}</TableCell>
                    <TableCell className="text-center relative z-10 whitespace-nowrap">{accountInfo.to}</TableCell>
                    <TableCell className="text-center whitespace-nowrap tabular-nums relative z-10" dir="ltr">
                      {isBanak ? (
                        <div className="flex flex-col items-center">
                          <span className="font-semibold">
                            {tx.exchangeRate ? (tx.amount / tx.exchangeRate).toLocaleString() : tx.amount.toLocaleString()} AED
                          </span>
                          <span className="text-xs text-muted-foreground">
                            بنكك: {tx.amount.toLocaleString()} SDG
                          </span>
                        </div>
                      ) : tx.type === 'transfer' && tx.fromCurrency !== tx.toCurrency && tx.exchangeRate ? (
                        <div className="flex flex-col items-center">
                          <span className="font-semibold">
                            {tx.fromCurrency === 'SDG' ? (tx.amount / tx.exchangeRate).toLocaleString() : (tx.amount * tx.exchangeRate).toLocaleString()} {tx.toCurrency}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({tx.amount.toLocaleString()} {tx.fromCurrency})
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span>{tx.amount.toLocaleString()} {tx.currency || tx.fromCurrency}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums relative z-10 whitespace-nowrap" dir="ltr">
                      {tx.exchangeRate ? (
                        <span className="text-sm font-medium">
                          {tx.exchangeRate.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center relative z-10 whitespace-nowrap">{getStatusBadge(tx)}</TableCell>
                    <TableCell className="text-center whitespace-nowrap relative z-10">
                      {tx.status === 'pending' && (
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmTransaction(tx.id)}
                          >
                            <CheckCircle className="ml-1 h-4 w-4" />
                            تأكيد
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => cancelTransaction(tx.id)}
                          >
                            <XCircle className="ml-1 h-4 w-4" />
                            إلغاء
                          </Button>
                        </div>
                      )}
                      {tx.status === 'in_transit' && tx.isBanakTransfer && (
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => deliverBanakTransaction(tx.id)}
                          >
                            <CheckCircle className="ml-1 h-4 w-4" />
                            تسليم نهائي
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        <CardContent className="border-t pt-4 print-show">
          <div className="flex justify-end gap-8">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">مجموع الدرهم</p>
              <p className="text-2xl font-bold text-primary" dir="ltr">
                {filteredTransactions
                  .filter(tx => tx.status === 'delivered')
                  .reduce((sum, tx) => {
                    if (tx.isBanakTransfer && tx.exchangeRate) {
                      return sum + (tx.amount / tx.exchangeRate);
                    }
                    if (tx.toCurrency === 'AED') {
                      return sum + tx.amount;
                    }
                    return sum;
                  }, 0)
                  .toLocaleString()} AED
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">مجموع بنكك</p>
              <p className="text-2xl font-bold text-primary" dir="ltr">
                {filteredTransactions
                  .filter(tx => tx.status === 'delivered')
                  .reduce((sum, tx) => {
                    if (tx.isBanakTransfer || tx.fromCurrency === 'SDG') {
                      return sum + tx.amount;
                    }
                    return sum;
                  }, 0)
                  .toLocaleString()} SDG
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* نسخ نفس المحتوى للتابات الأخرى مع إضافة الأزرار المناسبة */}
        <TabsContent value="cash" className="space-y-4" dir="rtl">
          <div className="flex gap-2 no-print justify-start">
            <Dialog open={isCashOpen} onOpenChange={(open) => {
              if (open) {
                const voucherNum = `V-${Date.now().toString().slice(-8)}`;
                setCashVoucherNumber(voucherNum);
              }
              setIsCashOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button 
                  size="sm"
                  className="relative overflow-hidden flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--banak-gradient-start)), hsl(var(--banak-gradient-end)))',
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span>حركة النقدي</span>
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
          {/* كروت الفلترة والبيانات */}
          <Card dir="rtl">
            <CardHeader className="py-2 pb-1">
              <CardTitle className="text-base">فلترة العمليات</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="filterStartDate2" className="text-xs">من تاريخ</Label>
                  <Input
                    id="filterStartDate2"
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="filterEndDate2" className="text-xs">إلى تاريخ</Label>
                  <Input
                    id="filterEndDate2"
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="transaction-log-card" dir="rtl">
            <CardHeader>
              <CardTitle>سجل عمليات حركة النقدي</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">رقم العملية</TableHead>
                    <TableHead className="text-center">التاريخ</TableHead>
                    <TableHead className="text-center">المبلغ</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium text-center" dir="ltr">{tx.bankOperationNumber}</TableCell>
                      <TableCell className="text-center" dir="ltr">
                        {new Date(tx.createdAt).toLocaleString('en-GB')}
                      </TableCell>
                      <TableCell className="text-center" dir="ltr">
                        {tx.exchangeRate ? (tx.amount / tx.exchangeRate).toLocaleString() : tx.amount.toLocaleString()} AED
                      </TableCell>
                      <TableCell className="text-center" dir="ltr">{tx.exchangeRate?.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(tx)}</TableCell>
                      <TableCell className="text-center">
                        {tx.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => confirmTransaction(tx.id)}>
                            <CheckCircle className="ml-1 h-4 w-4" /> تأكيد
                          </Button>
                        )}
                        {tx.status === 'in_transit' && (
                          <Button size="sm" variant="default" onClick={() => deliverBanakTransaction(tx.id)}>
                            <CheckCircle className="ml-1 h-4 w-4" /> تسليم نهائي
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardContent className="border-t pt-4 print-show">
              <div className="flex justify-end gap-8">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">مجموع الدرهم</p>
                  <p className="text-2xl font-bold text-primary" dir="ltr">
                    {filteredTransactions
                      .reduce((sum, tx) => {
                        if (tx.toCurrency === 'AED' || tx.currency === 'AED') {
                          return sum + tx.amount;
                        }
                        return sum;
                      }, 0)
                      .toLocaleString()} AED
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">مجموع بنكك</p>
                  <p className="text-2xl font-bold text-primary" dir="ltr">
                    {filteredTransactions
                      .reduce((sum, tx) => {
                        if (tx.fromCurrency === 'SDG' || tx.currency === 'SDG') {
                          return sum + tx.amount;
                        }
                        return sum;
                      }, 0)
                      .toLocaleString()} SDG
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab تحويل عادي */}
        <TabsContent value="normal" className="space-y-4" dir="rtl">
          <div className="flex gap-2 no-print justify-start">
            <Dialog open={isOpen && exchangeDirection === 'normal'} onOpenChange={(open) => {
              if (open) {
                setExchangeDirection('normal');
              }
              setIsOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button 
                  size="sm"
                  className="flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--banak-gradient-start)), hsl(var(--banak-gradient-end)))',
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span>تحويل عادي جديد</span>
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
          <Card dir="rtl">
            <CardHeader className="py-2 pb-1">
              <CardTitle className="text-base">فلترة العمليات</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="filterStartDate4" className="text-xs">من تاريخ</Label>
                  <Input
                    id="filterStartDate4"
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="filterEndDate4" className="text-xs">إلى تاريخ</Label>
                  <Input
                    id="filterEndDate4"
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="transaction-log-card" dir="rtl">
            <CardHeader>
              <CardTitle>سجل التحويلات العادية</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">رقم العملية</TableHead>
                    <TableHead className="text-center">التاريخ</TableHead>
                    <TableHead className="text-center">من</TableHead>
                    <TableHead className="text-center">المبلغ</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => {
                    const accountInfo = getAccountInfo(tx);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium text-center" dir="ltr">{tx.transactionNumber}</TableCell>
                        <TableCell className="text-center" dir="ltr">
                          {new Date(tx.createdAt).toLocaleString('en-GB')}
                        </TableCell>
                        <TableCell className="text-center">{accountInfo.from}</TableCell>
                        <TableCell className="text-center" dir="ltr">
                          {tx.fromCurrency !== tx.toCurrency && tx.exchangeRate ? (
                            <>
                              {(tx.amount * (tx.exchangeRate || 1)).toLocaleString()} {tx.toCurrency}
                              <div className="text-xs text-muted-foreground">({tx.amount.toLocaleString()} {tx.fromCurrency})</div>
                            </>
                          ) : (
                            `${tx.amount.toLocaleString()} ${tx.fromCurrency}`
                          )}
                        </TableCell>
                        <TableCell className="text-center" dir="ltr">{tx.exchangeRate?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(tx)}</TableCell>
                        <TableCell className="text-center">
                          {tx.status === 'pending' && (
                            <div className="flex justify-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => confirmTransaction(tx.id)}>
                                <CheckCircle className="ml-1 h-4 w-4" /> تأكيد
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => cancelTransaction(tx.id)}>
                                <XCircle className="ml-1 h-4 w-4" /> إلغاء
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
            <CardContent className="border-t pt-4 print-show">
              <div className="flex justify-end gap-8">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">مجموع الدرهم</p>
                  <p className="text-2xl font-bold text-primary" dir="ltr">
                    {filteredTransactions
                      .reduce((sum, tx) => {
                        if (tx.fromCurrency !== tx.toCurrency && tx.exchangeRate) {
                          return sum + (tx.amount * tx.exchangeRate);
                        }
                        return sum;
                      }, 0)
                      .toLocaleString()} AED
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">مجموع بنكك</p>
                  <p className="text-2xl font-bold text-primary" dir="ltr">
                    {filteredTransactions
                      .reduce((sum, tx) => {
                        if (tx.toCurrency === 'SDG') {
                          return sum + (tx.amount * (tx.exchangeRate || 1));
                        }
                        return sum;
                      }, 0)
                      .toLocaleString()} SDG
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab تحويل عكسي */}
        <TabsContent value="reverse" className="space-y-4" dir="rtl">
          <div className="flex gap-2 no-print justify-start">
            <Dialog open={isOpen && exchangeDirection === 'reverse'} onOpenChange={(open) => {
              if (open) {
                setExchangeDirection('reverse');
              }
              setIsOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button 
                  size="sm"
                  className="flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--banak-gradient-start)), hsl(var(--banak-gradient-end)))',
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span>تحويل عكسي جديد</span>
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
          <Card dir="rtl">
            <CardHeader className="py-2 pb-1">
              <CardTitle className="text-base">فلترة العمليات</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="filterStartDate5" className="text-xs">من تاريخ</Label>
                  <Input
                    id="filterStartDate5"
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="filterEndDate5" className="text-xs">إلى تاريخ</Label>
                  <Input
                    id="filterEndDate5"
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="transaction-log-card" dir="rtl">
            <CardHeader>
              <CardTitle>سجل التحويلات العكسية</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">رقم العملية</TableHead>
                    <TableHead className="text-center">التاريخ</TableHead>
                    <TableHead className="text-center">من</TableHead>
                    <TableHead className="text-center">المبلغ</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => {
                    const accountInfo = getAccountInfo(tx);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium text-center" dir="ltr">{tx.transactionNumber}</TableCell>
                        <TableCell className="text-center" dir="ltr">
                          {new Date(tx.createdAt).toLocaleString('en-GB')}
                        </TableCell>
                        <TableCell className="text-center">{accountInfo.from}</TableCell>
                        <TableCell className="text-center" dir="ltr">
                          {tx.fromCurrency !== tx.toCurrency && tx.exchangeRate ? (
                            <>
                              {(tx.amount / (tx.exchangeRate || 1)).toLocaleString()} {tx.toCurrency}
                              <div className="text-xs text-muted-foreground">({tx.amount.toLocaleString()} {tx.fromCurrency})</div>
                            </>
                          ) : (
                            `${tx.amount.toLocaleString()} ${tx.fromCurrency}`
                          )}
                        </TableCell>
                        <TableCell className="text-center" dir="ltr">{tx.exchangeRate?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(tx)}</TableCell>
                        <TableCell className="text-center">
                          {tx.status === 'pending' && (
                            <div className="flex justify-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => confirmTransaction(tx.id)}>
                                <CheckCircle className="ml-1 h-4 w-4" /> تأكيد
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => cancelTransaction(tx.id)}>
                                <XCircle className="ml-1 h-4 w-4" /> إلغاء
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
            <CardContent className="border-t pt-4 print-show">
              <div className="flex justify-end gap-8">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">مجموع الدرهم</p>
                  <p className="text-2xl font-bold text-primary" dir="ltr">
                    {filteredTransactions
                      .reduce((sum, tx) => {
                        if (tx.fromCurrency !== tx.toCurrency && tx.exchangeRate) {
                          return sum + (tx.amount / tx.exchangeRate);
                        }
                        return sum;
                      }, 0)
                      .toLocaleString()} AED
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">مجموع بنكك</p>
                  <p className="text-2xl font-bold text-primary" dir="ltr">
                    {filteredTransactions
                      .reduce((sum, tx) => {
                        if (tx.fromCurrency === 'SDG') {
                          return sum + tx.amount;
                        }
                        return sum;
                      }, 0)
                      .toLocaleString()} SDG
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Transactions;