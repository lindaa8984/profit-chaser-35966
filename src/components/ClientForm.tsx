import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, User } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { toast } from "@/hooks/use-toast";

export function ClientForm() {
  const { addClient } = useApp();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    idNumber: "",
    nationality: "",
    address: "",
    type: "tenant",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.type) {
      toast({ title: "خطأ", description: "يرجى إدخال الاسم ورقم الجوال ونوع العميل", variant: "destructive" });
      return;
    }

    addClient({
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      idNumber: formData.idNumber,
      nationality: formData.nationality,
      address: formData.address,
      type: formData.type,
      properties: [],
    });

    toast({ title: "تم بنجاح", description: "تم إضافة العميل بنجاح" });

    setFormData({ name: "", phone: "", email: "", idNumber: "", nationality: "", address: "", type: "tenant" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary shadow-elegant">
          <Plus className="h-4 w-4 mr-2" />
          إضافة عميل جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            إضافة عميل جديد
          </DialogTitle>
          <DialogDescription>أدخل بيانات العميل ثم اضغط حفظ.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">الاسم *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="phone">الجوال *</Label>
              <Input id="phone" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">البريد</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="idNumber">رقم الهوية</Label>
              <Input id="idNumber" value={formData.idNumber} onChange={(e) => setFormData((p) => ({ ...p, idNumber: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="nationality">الجنسية</Label>
            <Input id="nationality" value={formData.nationality} onChange={(e) => setFormData((p) => ({ ...p, nationality: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="address">العنوان</Label>
            <Input id="address" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="type">نوع العميل *</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData((p) => ({ ...p, type: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="اختر النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">مستأجر</SelectItem>
                <SelectItem value="owner">مالك</SelectItem>
                <SelectItem value="buyer">مشتري</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1 bg-gradient-primary">حفظ</Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>إلغاء</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
