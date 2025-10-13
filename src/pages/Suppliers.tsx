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
import { Plus, Users, Phone, MessageCircle, Trash2 } from 'lucide-react';
import { storage } from '@/lib/storage';
import { Supplier } from '@/types';
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

const SupplierCard = ({ supplier, onDelete }: { supplier: Supplier; onDelete: (id: string) => void }) => {
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
              {supplier.name}
            </span>
            {(supplier.whatsappNumber || supplier.whatsappGroup) && (
              <Badge variant="secondary" className="bg-green-600 text-white">
                <MessageCircle className="ml-1 h-3 w-3" />
                واتساب
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {supplier.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span dir="ltr">{supplier.phone}</span>
            </div>
          )}
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
              تفاصيل المورد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <p className="text-lg font-semibold">{supplier.name}</p>
            </div>
            {supplier.phone && (
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <p className="font-mono" dir="ltr">{supplier.phone}</p>
              </div>
            )}
            {supplier.whatsappNumber && (
              <div className="space-y-2">
                <Label>رقم الواتساب</Label>
                <p className="font-mono" dir="ltr">{supplier.whatsappNumber}</p>
              </div>
            )}
            {supplier.whatsappGroup && (
              <div className="space-y-2">
                <Label>رابط قروب الواتساب</Label>
                <p className="text-xs break-all" dir="ltr">{supplier.whatsappGroup}</p>
              </div>
            )}
            {supplier.notes && (
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <p className="text-sm">{supplier.notes}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>تاريخ الإضافة</Label>
              <p>{new Date(supplier.createdAt).toLocaleDateString('en-GB')}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="destructive" 
              onClick={() => {
                onDelete(supplier.id);
                setShowDetails(false);
              }}
            >
              <Trash2 className="ml-2 h-4 w-4" />
              حذف المورد
            </Button>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappGroup, setWhatsappGroup] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = () => {
    setSuppliers(storage.getSuppliers());
  };

  const handleAdd = () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يجب إدخال اسم المورد',
      });
      return;
    }

    // التحقق من عدم تكرار الاسم في الموردين أو العملاء
    const trimmedName = name.trim();
    const allCustomers = storage.getCustomers();
    const nameExists = suppliers.some(s => s.name.toLowerCase() === trimmedName.toLowerCase()) ||
                       allCustomers.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    
    if (nameExists) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'اسم الحساب موجود بالفعل، يجب أن يكون الاسم فريداً',
      });
      return;
    }

    const newSupplier: Supplier = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: phone.trim() || undefined,
      whatsappNumber: whatsappNumber.trim() || undefined,
      whatsappGroup: whatsappGroup.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedSuppliers = [...suppliers, newSupplier];
    storage.saveSuppliers(updatedSuppliers);
    setSuppliers(updatedSuppliers);
    
    toast({
      title: 'تم الإضافة',
      description: 'تم إضافة المورد بنجاح',
    });

    resetForm();
    setIsOpen(false);
  };

  const handleDelete = (id: string) => {
    const updatedSuppliers = suppliers.filter(s => s.id !== id);
    storage.saveSuppliers(updatedSuppliers);
    setSuppliers(updatedSuppliers);
    
    toast({
      title: 'تم الحذف',
      description: 'تم حذف المورد بنجاح',
    });
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setWhatsappNumber('');
    setWhatsappGroup('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">الموردين</h1>
          <p className="text-muted-foreground mt-1">إدارة بيانات الموردين الذين يشترون بنكك</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              إضافة مورد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة مورد جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات المورد الذي يشتري بنكك منك
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم المورد *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
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
              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات إضافية عن المورد..."
                  rows={3}
                />
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

      {suppliers.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Users className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-xl font-semibold">لا يوجد موردين</h3>
            <p className="text-muted-foreground">ابدأ بإضافة أول مورد يشتري بنكك منك</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {suppliers.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Suppliers;
