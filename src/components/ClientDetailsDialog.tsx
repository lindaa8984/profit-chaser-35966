import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Client } from "@/contexts/AppContext";
import { useApp } from "@/contexts/AppContext";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, CreditCard, MapPin, Flag } from "lucide-react";

interface ClientDetailsDialogProps {
  client: Client;
  trigger: React.ReactNode;
  isEdit?: boolean;
}

export function ClientDetailsDialog({ client, trigger, isEdit = false }: ClientDetailsDialogProps) {
  const { updateClient } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(client);

  const handleSave = () => {
    updateClient(client.id, formData);
    setIsOpen(false);
  };

  const getTypeBadge = (type: string) => {
    switch(type) {
      case "tenant": return <Badge className="bg-primary/10 text-primary border-primary/20">مستأجر</Badge>;
      case "owner": return <Badge className="bg-success/10 text-success border-success/20">مالك</Badge>;
      case "broker": return <Badge className="bg-warning/10 text-warning border-warning/20">وسيط</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? "تعديل العميل" : "تفاصيل العميل"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "قم بتعديل معلومات العميل" : "عرض تفاصيل العميل"}
            </DialogDescription>
          </DialogHeader>

          {!isEdit ? (
            // View Mode
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">الاسم</p>
                      <p className="font-medium">{client.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                      <p className="font-medium">{client.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                      <p className="font-medium">{client.email}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">رقم الهوية</p>
                      <p className="font-medium">{client.idNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">الجنسية</p>
                      <p className="font-medium">{client.nationality}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">العنوان</p>
                      <p className="font-medium">{client.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">نوع العميل</p>
                {getTypeBadge(client.type)}
              </div>

              <div className="flex justify-center pt-4 border-t">
                <Button 
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                  className="px-8"
                >
                  إنهاء
                </Button>
              </div>
            </div>
          ) : (
            // Edit Mode
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">الاسم</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="idNumber">رقم الهوية</Label>
                  <Input
                    id="idNumber"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="nationality">الجنسية</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="address">العنوان</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  حفظ التغييرات
                </Button>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}