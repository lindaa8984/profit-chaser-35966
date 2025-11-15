import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Property } from "@/contexts/AppContext";
import { useApp } from "@/contexts/AppContext";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Building2, Layers, Users, Hash } from "lucide-react";

interface PropertyDetailsDialogProps {
  property: Property;
  trigger: React.ReactNode;
  isEdit?: boolean;
}

export function PropertyDetailsDialog({ property, trigger, isEdit = false }: PropertyDetailsDialogProps) {
  const { updateProperty, currency, contracts } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(property);
  const currencySymbols = {
    AED: "د.إ",
    SAR: "ر.س",
    USD: "USD", 
    EUR: "€",
    OMR: "ر.ع",
    QAR: "ر.ق"
  };

  // حساب الوحدات المتاحة الفعلية بناءً على العقود النشطة
  const getActualAvailableUnits = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const actualTotalUnits = property.units?.length || property.totalUnits;
    
    const activeContracts = contracts.filter(c => {
      const endDate = new Date(c.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      return c.propertyId === property.id && 
        endDate >= today &&
        c.status !== 'terminated';
    });

    const occupiedUnits = activeContracts.length;
    return Math.max(0, actualTotalUnits - occupiedUnits);
  };

  const actualAvailableUnits = getActualAvailableUnits();
  const actualTotalUnits = property.units?.length || property.totalUnits;

  const handleSave = () => {
    // نمرر فقط الحقول القابلة للتعديل ونتجنب تمرير الوحدات
    const { name, location, floors, totalUnits, price, unitsPerFloor, unitFormat, status, type, currency } = formData;
    updateProperty(property.id, { name, location, floors, totalUnits, price, unitsPerFloor, unitFormat, status, type, currency });
    setIsOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "available": return <Badge className="bg-success/10 text-success border-success/20">متاح</Badge>;
      case "rented": return <Badge className="bg-warning/10 text-warning border-warning/20">مؤجر</Badge>;
      case "maintenance": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">صيانة</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch(type) {
      case "residential": return "سكني";
      case "commercial": return "تجاري";
      case "industrial": return "صناعي";
      default: return type;
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
            <DialogTitle>{isEdit ? "تعديل العقار" : "تفاصيل العقار"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "قم بتعديل معلومات العقار" : "عرض تفاصيل العقار"}
            </DialogDescription>
          </DialogHeader>

          {!isEdit ? (
            // View Mode
            <div className="space-y-6">
              {/* Header with property name and status */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-2">{property.name}</h3>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{property.location}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(property.status)}
                    <Badge variant="outline" className="bg-background/50">{getTypeBadge(property.type)}</Badge>
                  </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-background/60 rounded-lg p-4 text-center border border-border/50">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">الطوابق</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">{property.floors}</p>
                  </div>
                  
                  <div className="bg-background/60 rounded-lg p-4 text-center border border-border/50">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">إجمالي الوحدات</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">{actualTotalUnits}</p>
                  </div>
                  
                  <div className="bg-success/10 rounded-lg p-4 text-center border border-success/20">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Hash className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium text-success">المتاحة</span>
                    </div>
                    <p className="text-2xl font-bold text-success">{actualAvailableUnits}</p>
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                <h4 className="font-medium mb-3 text-foreground">ملخص العقار</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الوحدات المشغولة:</span>
                    <span className="font-medium text-destructive">{actualTotalUnits - actualAvailableUnits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">معدل الإشغال:</span>
                    <span className="font-medium">{actualTotalUnits > 0 ? Math.round(((actualTotalUnits - actualAvailableUnits) / actualTotalUnits) * 100) : 0}%</span>
                  </div>
                </div>
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
                  <Label htmlFor="name">اسم العقار</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="location">الموقع</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="floors">عدد الطوابق</Label>
                  <Input
                    id="floors"
                    type="number"
                    value={formData.floors}
                    onChange={(e) => setFormData({...formData, floors: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="totalUnits">إجمالي الوحدات</Label>
                  <Input
                    id="totalUnits"
                    type="number"
                    value={formData.totalUnits}
                    onChange={(e) => setFormData({...formData, totalUnits: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="price">السعر</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="unitsPerFloor">الوحدات في كل طابق</Label>
                  <Input
                    id="unitsPerFloor"
                    type="number"
                    value={formData.unitsPerFloor || ''}
                    onChange={(e) => setFormData({...formData, unitsPerFloor: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="unitFormat">نظام ترقيم الوحدات</Label>
                  <Select
                    value={formData.unitFormat || '101'}
                    onValueChange={(value) => setFormData({...formData, unitFormat: value})}
                  >
                    <SelectTrigger id="unitFormat">
                      <SelectValue placeholder="اختر نظام الترقيم" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="101">رقم الطابق + رقم الوحدة (101، 102، 201)</SelectItem>
                      <SelectItem value="01">ترقيم متسلسل (01، 02، 03)</SelectItem>
                      <SelectItem value="1">ترقيم بسيط (1، 2، 3)</SelectItem>
                      <SelectItem value="A1">حرف + رقم (A1، A2، B1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1 bg-gradient-primary">
                  حفظ التغييرات
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                  إلغاء
                </Button>
              </div>
              
              {/* معلومة مهمة */}
              {(formData.unitFormat !== property.unitFormat || formData.unitsPerFloor !== property.unitsPerFloor || formData.floors !== property.floors) && (
                <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                  <p className="text-primary font-medium">💡 ملاحظة هامة</p>
                  <p className="text-muted-foreground mt-1">
                    عند تغيير نظام ترقيم الوحدات، سيتم تحديث أرقام جميع الوحدات الموجودة تلقائياً مع الحفاظ على حالتها (متاحة/مشغولة) والعقود المرتبطة بها.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
