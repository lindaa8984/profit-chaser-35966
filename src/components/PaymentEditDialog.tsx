import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/ui/use-toast";

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
}

interface PaymentEditDialogProps {
  payment: Payment | null;
  open: boolean;
  onClose: () => void;
}

export function PaymentEditDialog({ payment, open, onClose }: PaymentEditDialogProps) {
  const { updatePayment } = useApp();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    amount: payment?.amount || 0,
    dueDate: payment?.dueDate || '',
    paymentMethod: payment?.paymentMethod || 'cash',
    bankName: payment?.bankName || '',
    status: (payment?.status || 'pending') as 'paid' | 'pending' | 'scheduled' | 'overdue'
  });

  const handleSave = () => {
    if (!payment) return;
    
    updatePayment(payment.id, {
      amount: formData.amount,
      dueDate: formData.dueDate,
      paymentMethod: formData.paymentMethod,
      bankName: formData.bankName,
      status: formData.status as 'paid' | 'pending' | 'scheduled' | 'overdue'
    });
    
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
            <Label htmlFor="dueDate">تاريخ الاستحقاق</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
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
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="scheduled">مجدول</SelectItem>
                <SelectItem value="overdue">متأخر</SelectItem>
              </SelectContent>
            </Select>
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