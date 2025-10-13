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
import { Switch } from '@/components/ui/switch';
import { Plus, Users } from 'lucide-react';
import { storage } from '@/lib/storage';
import { Customer } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const CustomerCard = ({ customer }: { customer: Customer }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setShowDetails(true)}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Users className="ml-2 h-5 w-5 text-primary" />
              {customer.name}
            </span>
            {customer.isRecurring && (
              <Badge variant="secondary">ثابت</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between p-3 bg-primary/10 rounded-lg">
            <span className="text-sm font-medium">الرصيد (AED)</span>
            <span className="text-xl font-bold text-primary">
              {customer.balanceAED.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            اضغط لعرض التفاصيل الكاملة
          </p>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              تفاصيل العميل
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <p className="text-lg font-semibold">{customer.name}</p>
            </div>
            {customer.accountNumber && (
              <div className="space-y-2">
                <Label>رقم الحساب</Label>
                <p className="font-mono" dir="ltr">{customer.accountNumber}</p>
              </div>
            )}
            {customer.phone && (
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <p className="font-mono" dir="ltr">{customer.phone}</p>
              </div>
            )}
            {customer.email && (
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <p className="font-mono" dir="ltr">{customer.email}</p>
              </div>
            )}
            {customer.whatsappNumber && (
              <div className="space-y-2">
                <Label>رقم الواتساب</Label>
                <p className="font-mono" dir="ltr">{customer.whatsappNumber}</p>
              </div>
            )}
            {customer.whatsappGroup && (
              <div className="space-y-2">
                <Label>رابط قروب الواتساب</Label>
                <p className="text-xs break-all" dir="ltr">{customer.whatsappGroup}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>النوع</Label>
              <div className="flex gap-2">
                {customer.isRecurring ? (
                  <Badge variant="secondary">عميل ثابت</Badge>
                ) : (
                  <Badge variant="outline">عميل عادي</Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>تاريخ الإضافة</Label>
              <p>{new Date(customer.createdAt).toLocaleDateString('en-GB')}</p>
            </div>
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-lg">الأرصدة</Label>
              <div className="flex justify-between p-4 bg-muted rounded-lg">
                <span className="font-medium">الجنيه السوداني (SDG)</span>
                <span className="text-xl font-bold">
                  {customer.balanceSDG.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between p-4 bg-primary/10 rounded-lg">
                <span className="font-medium">الدرهم الإماراتي (AED)</span>
                <span className="text-xl font-bold text-primary">
                  {customer.balanceAED.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappGroup, setWhatsappGroup] = useState('');
  const [balanceSDG, setBalanceSDG] = useState('');
  const [balanceAED, setBalanceAED] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    setCustomers(storage.getCustomers());
  };

  const handleAdd = () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال اسم العميل',
      });
      return;
    }

    // التحقق من عدم تكرار الاسم في العملاء أو الموردين
    const trimmedName = name.trim();
    const allSuppliers = storage.getSuppliers();
    const nameExists = customers.some(c => c.name.toLowerCase() === trimmedName.toLowerCase()) ||
                       allSuppliers.some(s => s.name.toLowerCase() === trimmedName.toLowerCase());
    
    if (nameExists) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'اسم الحساب موجود بالفعل، يجب أن يكون الاسم فريداً',
      });
      return;
    }

    const newCustomer: Customer = {
      id: Date.now().toString(),
      name: name.trim(),
      accountNumber: accountNumber.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      whatsappNumber: whatsappNumber.trim() || undefined,
      whatsappGroup: whatsappGroup.trim() || undefined,
      balanceSDG: parseFloat(balanceSDG) || 0,
      balanceAED: parseFloat(balanceAED) || 0,
      isRecurring,
      createdAt: new Date().toISOString(),
    };

    const updatedCustomers = [...customers, newCustomer];
    storage.saveCustomers(updatedCustomers);
    setCustomers(updatedCustomers);
    
    toast({
      title: 'تم الإضافة',
      description: 'تم إضافة العميل بنجاح',
    });

    setName('');
    setAccountNumber('');
    setPhone('');
    setEmail('');
    setWhatsappNumber('');
    setWhatsappGroup('');
    setBalanceSDG('');
    setBalanceAED('');
    setIsRecurring(false);
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">العملاء</h1>
          <p className="text-muted-foreground mt-1">إدارة بيانات العملاء</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              إضافة عميل
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة عميل جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات العميل الجديد
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم العميل *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">رقم الحساب</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="مثال: ACC-001"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+249123456789"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">رقم الواتساب</Label>
                <Input
                  id="whatsappNumber"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="249912988258"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsappGroup">رابط قروب الواتساب</Label>
                <Input
                  id="whatsappGroup"
                  value={whatsappGroup}
                  onChange={(e) => setWhatsappGroup(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="balanceSDG">الرصيد (جنيه سوداني)</Label>
                  <Input
                    id="balanceSDG"
                    type="number"
                    step="0.01"
                    value={balanceSDG}
                    onChange={(e) => setBalanceSDG(e.target.value)}
                    placeholder="0.00"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balanceAED">الرصيد (درهم إماراتي)</Label>
                  <Input
                    id="balanceAED"
                    type="number"
                    step="0.01"
                    value={balanceAED}
                    onChange={(e) => setBalanceAED(e.target.value)}
                    placeholder="0.00"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
                <Label htmlFor="recurring">عميل ثابت</Label>
              </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {customers.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>
    </div>
  );
};

export default Customers;
