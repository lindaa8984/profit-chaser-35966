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

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vaults, setVaults] = useState(storage.getVaults());
  const [customers, setCustomers] = useState(storage.getCustomers());
  const [suppliers, setSuppliers] = useState(storage.getSuppliers());
  const [rates, setRates] = useState(storage.getRates());
  const [isOpen, setIsOpen] = useState(false);
  const [isBanakOpen, setIsBanakOpen] = useState(false);
  
  // Filter states
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('all');
  const [filterDirection, setFilterDirection] = useState<'all' | 'incoming' | 'outgoing'>('all');
  
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
  const [banakMultipleSuppliers, setBanakMultipleSuppliers] = useState(false);
  const [banakSingleSupplierId, setBanakSingleSupplierId] = useState('');
  const [banakSingleAmount, setBanakSingleAmount] = useState('');
  const [banakSingleRate, setBanakSingleRate] = useState('');
  const [banakSelectedSuppliers, setBanakSelectedSuppliers] = useState<string[]>([]);
  const [banakSupplierRates, setBanakSupplierRates] = useState<{[key: string]: {amount: string, rate: string}}>({});
  const [banakNotes, setBanakNotes] = useState('');
  
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
    // Validation
    if (!transactionNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال رقم العملية',
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
    // يجب أن يكون إلى حساب (vault)
    if (!toVaultId) {
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
      status: 'pending',
      amount: amt,
      currency: finalFromCurrency,
      customerId: customerId || undefined,
      fromVaultId: undefined,
      toVaultId: toVaultId,
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
    };

    const updatedTransactions = [newTransaction, ...transactions];
    storage.saveTransactions(updatedTransactions);
    setTransactions(updatedTransactions);
    
    toast({
      title: 'تم الإضافة',
      description: 'تم إضافة العملية بنجاح (في انتظار التأكيد)',
    });

    resetForm();
    setIsOpen(false);
  };

  const confirmTransaction = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || tx.status !== 'pending') return;

    const vaultsData = storage.getVaults();
    const customersData = storage.getCustomers();
    
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
      // المبلغ يُضاف إلى حساب المستلم فقط (toVaultId)
      // لا يُخصم من أي مصدر لأن العميل النقدي دفع مباشرة
      
      // Calculate target amount with conversion
      let targetAmount = tx.amount;
      if (tx.fromCurrency !== tx.toCurrency && tx.exchangeRate) {
        if (tx.fromCurrency === 'SDG') {
          targetAmount = tx.amount / tx.exchangeRate;
        } else {
          targetAmount = tx.amount * tx.exchangeRate;
        }
      }
      
      // Add to recipient's account (toVaultId)
      if (tx.toVaultId) {
        const toVault = vaultsData.find(v => v.id === tx.toVaultId);
        if (toVault) {
          if (tx.toCurrency === 'SDG') {
            toVault.balanceSDG += targetAmount;
          } else {
            toVault.balanceAED += targetAmount;
          }
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
    setBanakMultipleSuppliers(false);
    setBanakSingleSupplierId('');
    setBanakSingleAmount('');
    setBanakSingleRate('');
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

  const handleBanakAdd = () => {
    // Validation
    if (!banakSourceVaultId) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب اختيار الحساب المصدر',
      });
      return;
    }

    // Get source vault and check balance
    const sourceVault = vaults.find(v => v.id === banakSourceVaultId);
    if (!sourceVault) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'الحساب المصدر غير موجود',
      });
      return;
    }

    if (!banakMultipleSuppliers) {
      // Single supplier validation
      if (!banakSingleSupplierId) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'يجب اختيار المورد',
        });
        return;
      }

      const amt = parseFloat(banakSingleAmount);
      if (isNaN(amt) || amt <= 0) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'يجب إدخال مبلغ صحيح',
        });
        return;
      }

      // Check if vault has sufficient balance
      if (sourceVault.balanceSDG < amt) {
        toast({
          variant: 'destructive',
          title: 'خطأ في الرصيد',
          description: `الرصيد غير كافٍ. الرصيد المتاح: ${sourceVault.balanceSDG.toLocaleString()} SDG`,
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

      // Create single transaction
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        transactionNumber: `BANAK-${Date.now()}`,
        type: 'transfer',
        status: 'pending',
        amount: amt,
        currency: 'SDG',
        fromVaultId: banakSourceVaultId,
        toCustomerId: banakSingleSupplierId,
        fromCurrency: 'SDG',
        toCurrency: 'SDG',
        exchangeRate: rate,
        isBanakTransfer: true,
        whatsappNumber: supplier.whatsappNumber || supplier.whatsappGroup,
        notes: banakNotes.trim() ? `إرسال بنكك: ${banakNotes.trim()}` : 'إرسال بنكك',
        createdAt: new Date().toISOString(),
        createdBy: user?.id || '1',
      };

      const updatedTransactions = [newTransaction, ...transactions];
      storage.saveTransactions(updatedTransactions);
      setTransactions(updatedTransactions);

      // خصم المبلغ من الخزنة المصدر
      const vaultsData = storage.getVaults();
      const vaultToUpdate = vaultsData.find(v => v.id === banakSourceVaultId);
      if (vaultToUpdate) {
        vaultToUpdate.balanceSDG -= amt;
        storage.saveVaults(vaultsData);
        setVaults(vaultsData);
      }

      // Send WhatsApp message automatically
      if (supplier.whatsappNumber || supplier.whatsappGroup) {
        sendWhatsAppMessage(supplier.whatsappNumber || supplier.whatsappGroup || '', supplier.name, amt, rate);
      }

      toast({
        title: 'تم الإضافة',
        description: 'تم إضافة عملية إرسال بنكك وتحديث رصيد الخزنة وإرسال رسالة واتساب',
      });
    } else {
      // Multiple suppliers validation
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

      // Calculate total amount to send
      const totalAmount = validSuppliers.reduce((sum, supplierId) => {
        const data = banakSupplierRates[supplierId];
        const amt = parseFloat(data.amount);
        return sum + amt;
      }, 0);

      // Check if vault has sufficient balance for all suppliers
      if (sourceVault.balanceSDG < totalAmount) {
        toast({
          variant: 'destructive',
          title: 'خطأ في الرصيد',
          description: `الرصيد غير كافٍ. المبلغ المطلوب: ${totalAmount.toLocaleString()} SDG، الرصيد المتاح: ${sourceVault.balanceSDG.toLocaleString()} SDG`,
        });
        return;
      }

      // خصم المبلغ الإجمالي من الخزنة المصدر
      const vaultsData = storage.getVaults();
      const vaultToUpdate = vaultsData.find(v => v.id === banakSourceVaultId);
      if (vaultToUpdate) {
        vaultToUpdate.balanceSDG -= totalAmount;
        storage.saveVaults(vaultsData);
        setVaults(vaultsData);
      }

      // Create transactions for each supplier
      validSuppliers.forEach(supplierId => {
        const data = banakSupplierRates[supplierId];
        const amt = parseFloat(data.amount);
        const rate = parseFloat(data.rate);
        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier) return;
        
        const newTransaction: Transaction = {
          id: Date.now().toString() + Math.random(),
          transactionNumber: `BANAK-${Date.now()}-${supplierId}`,
          type: 'transfer',
          status: 'pending',
          amount: amt,
          currency: 'SDG',
          fromVaultId: banakSourceVaultId,
          toCustomerId: supplierId,
          fromCurrency: 'SDG',
          toCurrency: 'SDG',
          exchangeRate: rate,
          isBanakTransfer: true,
          whatsappNumber: supplier.whatsappNumber || supplier.whatsappGroup,
          notes: banakNotes.trim() ? `إرسال بنكك: ${banakNotes.trim()}` : 'إرسال بنكك',
          createdAt: new Date().toISOString(),
          createdBy: user?.id || '1',
        };

        const updatedTransactions = [newTransaction, ...transactions];
        storage.saveTransactions(updatedTransactions);
        setTransactions(updatedTransactions);

        // Send WhatsApp message automatically
        if (supplier.whatsappNumber || supplier.whatsappGroup) {
          setTimeout(() => {
            sendWhatsAppMessage(supplier.whatsappNumber || supplier.whatsappGroup || '', supplier.name, amt, rate);
          }, 500);
        }
      });

      toast({
        title: 'تم الإضافة',
        description: `تم إضافة ${validSuppliers.length} عملية إرسال بنكك وتحديث رصيد الخزنة وإرسال رسائل واتساب`,
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
      const isRelated = tx.fromVaultId === filterAccountId || 
                       tx.toVaultId === filterAccountId ||
                       tx.fromCustomerId === filterAccountId ||
                       tx.toCustomerId === filterAccountId;
      if (!isRelated) return false;
    }

    // Filter by direction
    if (filterDirection !== 'all') {
      const txDirection = getTransactionDirection(tx);
      if (txDirection !== filterDirection) return false;
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">العمليات</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة عمليات التحويل والصرف</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>تصدير</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            <span>طباعة</span>
          </Button>
          <Dialog open={isBanakOpen} onOpenChange={setIsBanakOpen}>
            <DialogTrigger asChild>
              <Button 
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
                <div className="bg-primary/10 p-4 rounded-lg">
                  <Label className="text-sm text-muted-foreground">الرصيد الكلي بنكك</Label>
                  <p className="text-3xl font-bold text-primary mt-1">
                    {getTotalBanakBalance().toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    <span className="text-lg mr-2">SDG</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>اختر الحساب *</Label>
                  <Select value={banakSourceVaultId} onValueChange={setBanakSourceVaultId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      {vaults.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} (رصيد بنكك: {v.balanceSDG.toLocaleString()} SDG)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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

                      {banakSelectedSuppliers.length > 0 && (
                        <div className="space-y-3 border rounded-lg p-4 max-h-96 overflow-y-auto">
                          <Label>تفاصيل الموردين المحددين *</Label>
                          {banakSelectedSuppliers.map(supplierId => {
                            const supplier = suppliers.find(s => s.id === supplierId);
                            if (!supplier) return null;
                            return (
                              <div key={supplierId} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                                <Label className="font-semibold flex items-center justify-between">
                                  <span>{supplier.name}</span>
                                  {(supplier.whatsappNumber || supplier.whatsappGroup) && (
                                    <span className="text-xs text-green-600 font-normal">
                                      واتساب: {supplier.whatsappNumber || supplier.whatsappGroup}
                                    </span>
                                  )}
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs">المبلغ (SDG) *</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={banakSupplierRates[supplierId]?.amount || ''}
                                      onChange={(e) => setBanakSupplierRates({
                                        ...banakSupplierRates,
                                        [supplierId]: { amount: e.target.value, rate: banakSupplierRates[supplierId]?.rate || '' }
                                      })}
                                      dir="ltr"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">السعر (Rate) *</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={banakSupplierRates[supplierId]?.rate || ''}
                                      onChange={(e) => setBanakSupplierRates({
                                        ...banakSupplierRates,
                                        [supplierId]: { amount: banakSupplierRates[supplierId]?.amount || '', rate: e.target.value }
                                      })}
                                      dir="ltr"
                                    />
                                  </div>
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

                      <div className="space-y-2">
                        <Label htmlFor="banakSingleAmount">المبلغ بنكك (SDG) *</Label>
                        <Input
                          id="banakSingleAmount"
                          type="number"
                          step="0.01"
                          value={banakSingleAmount}
                          onChange={(e) => setBanakSingleAmount(e.target.value)}
                          placeholder="1000.00"
                          dir="ltr"
                        />
                      </div>

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
                      </div>

                      {banakSingleSupplierId && customers.find(c => c.id === banakSingleSupplierId) && (
                        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                          <Label className="text-sm text-green-700 dark:text-green-300">
                            رقم الواتساب: {customers.find(c => c.id === banakSingleSupplierId)?.whatsappNumber || 
                                          customers.find(c => c.id === banakSingleSupplierId)?.whatsappGroup || 
                                          'غير محدد'}
                          </Label>
                          {!(customers.find(c => c.id === banakSingleSupplierId)?.whatsappNumber || 
                             customers.find(c => c.id === banakSingleSupplierId)?.whatsappGroup) && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                              يرجى إضافة رقم واتساب للمورد من صفحة العملاء
                            </p>
                          )}
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
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>عملية جديدة</span>
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
                <Label htmlFor="txNumber">رقم العملية *</Label>
                <Input
                  id="txNumber"
                  value={transactionNumber}
                  onChange={(e) => setTransactionNumber(e.target.value)}
                  placeholder="TX-001"
                  dir="ltr"
                />
              </div>

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
                </>
              ) : (
                // التحويل العكسي: نفس التحويل العادي مع اختلاف السعر فقط
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
        </div>
      </div>

      
      <Card>
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
                  <SelectItem value="all">جميع الحسابات</SelectItem>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>الحسابات</SelectLabel>
                    {vaults.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>العملاء</SelectLabel>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>الموردين</SelectLabel>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectGroup>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل العمليات</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">رقم العملية</TableHead>
                <TableHead className="text-center">النوع</TableHead>
                <TableHead className="text-center">من</TableHead>
                <TableHead className="text-center">إلى</TableHead>
                <TableHead className="text-center">المبلغ</TableHead>
                <TableHead className="text-center">Rate</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">التاريخ</TableHead>
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
                  >
                    {isBanak && (
                      <td 
                        className="absolute inset-0 pointer-events-none opacity-10"
                        style={{
                          background: 'linear-gradient(90deg, hsl(var(--banak-gradient-start)), hsl(var(--banak-gradient-end)))',
                        }}
                      />
                    )}
                    <TableCell className="font-medium text-center tabular-nums relative z-10 whitespace-nowrap" dir="ltr">
                      {tx.transactionNumber}
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
                      <div className="flex flex-col items-center">
                        <span>{tx.amount.toLocaleString()} {tx.currency || tx.fromCurrency}</span>
                        {tx.type === 'transfer' && tx.fromCurrency !== tx.toCurrency && (
                          <span className="text-xs text-muted-foreground">→ {tx.toCurrency}</span>
                        )}
                      </div>
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
                    <TableCell className="text-center whitespace-nowrap relative z-10" dir="ltr">
                      {new Date(tx.createdAt).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
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
                      {tx.status === 'confirmed' && !tx.approvedAt && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approveTransaction(tx.id)}
                        >
                          <CheckCircle className="ml-1 h-4 w-4" />
                          اعتماد التحويل
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;

