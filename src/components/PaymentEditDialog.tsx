import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { cn, formatDateDDMMYYYY } from "@/lib/utils";

interface Payment {
  id: number;
  contractId: number;
  amount: number;
  currency: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod: string;
  checkNumber?: string;
  bankName?: string;
  status: 'paid' | 'pending' | 'scheduled' | 'overdue';
  notes?: string;
}

interface PaymentEditDialogProps {
  payment: Payment | null;
  open: boolean;
  onClose: () => void;
}

export function PaymentEditDialog({ payment, open, onClose }: PaymentEditDialogProps) {
  const { updatePayment, updateContract, payments, contracts } = useApp();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    amount: payment?.amount || 0,
    dueDate: payment?.dueDate || '',
    paymentMethod: payment?.paymentMethod || 'cash',
    bankName: payment?.bankName || '',
    status: (payment?.status || 'pending') as 'paid' | 'pending' | 'scheduled' | 'overdue',
    notes: payment?.notes || ''
  });

  // تحديث formData عند تغيير payment
  useEffect(() => {
    if (payment) {
      setFormData({
        amount: payment.amount,
        dueDate: payment.dueDate,
        paymentMethod: payment.paymentMethod,
        bankName: payment.bankName || '',
        status: payment.status,
        notes: payment.notes || ''
      });
    }
  }, [payment]);

  const handleSave = async () => {
    if (!payment) return;
    
    // التحقق من تناسق مجموع الدفعات مع الإيجار الكلي
    const contract = contracts.find(c => c.id === payment.contractId);
    if (contract) {
      // جمع كل الدفعات للعقد
      const contractPayments = payments.filter(p => p.contractId === payment.contractId);
      
      // حساب المجموع الجديد بعد التعديل
      const newTotal = contractPayments.reduce((sum, p) => {
        if (p.id === payment.id) {
          return sum + formData.amount;
        }
        return sum + p.amount;
      }, 0);
      
      // التحقق من التطابق مع الإيجار الكلي
      if (Math.abs(newTotal - contract.monthlyRent) > 0.01) {
        toast({
          title: "خطأ في التقسيم",
          description: `مجموع الدفعات (${newTotal.toLocaleString()}) لا يتطابق مع مبلغ الإيجار الكلي (${contract.monthlyRent.toLocaleString()})`,
          variant: "destructive",
        });
        return;
      }
      
      // ✅ تحديث paymentAmounts في العقد
      const updatedAmounts = contractPayments.map(p => {
        if (p.id === payment.id) {
          return formData.amount;
        }
        return p.amount;
      });
      
      await updateContract(contract.id, {
        paymentAmounts: updatedAmounts.join(', ')
      });
    }
    
    await updatePayment(payment.id, {
      amount: formData.amount,
      dueDate: formData.dueDate,
      paymentMethod: formData.paymentMethod,
      bankName: formData.bankName,
      status: formData.status as 'paid' | 'pending' | 'scheduled' | 'overdue',
      notes: formData.notes
    });
    
    // الانتظار قليلاً لضمان تحديث البيانات
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast({
      title: "تم التحديث",
      description: "تم تحديث بيانات الدفعة بنجاح",
    });
    
    onClose();
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل الدفعة</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">المبلغ</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            />
          </div>
          
          <div className="space-y-2">
            <Label>تاريخ الاستحقاق</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-right font-normal",
                    !formData.dueDate && "text-muted-foreground"
                  )}
                  dir="ltr"
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {formData.dueDate ? formatDateDDMMYYYY(formData.dueDate) : "اختر التاريخ"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={formData.dueDate ? new Date(formData.dueDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setFormData({ ...formData, dueDate: format(date, "yyyy-MM-dd") });
                    }
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">طريقة الدفع</Label>
            <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">نقدي</SelectItem>
                <SelectItem value="cheque">شيك</SelectItem>
                <SelectItem value="bank_transfer">حوالة بنكية</SelectItem>
                <SelectItem value="card">بطاقة ائتمان</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* حقل البنك للشيكات */}
          {formData.paymentMethod === "cheque" && (
            <div className="space-y-2">
              <Label htmlFor="bankName">اسم البنك</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="مثال: البنك الأهلي السعودي"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="status">الحالة</Label>
            <Select value={formData.status} onValueChange={(value: 'paid' | 'pending' | 'scheduled' | 'overdue') => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">مدفوع</SelectItem>
                <SelectItem value="pending">مجدول</SelectItem>
                <SelectItem value="scheduled">مجدول</SelectItem>
                <SelectItem value="overdue">متأخر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <textarea
              id="notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="أضف ملاحظات إضافية (اختياري)"
            />
          </div>
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            حفظ التغييرات
          </Button>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}