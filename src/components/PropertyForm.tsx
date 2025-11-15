import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Building2 } from "lucide-react";
import { UnitsManagement } from "./UnitsManagement";
import { useApp } from "@/contexts/AppContext";
import { toast } from "@/hooks/use-toast";

export function PropertyForm() {
  const { addProperty, currency } = useApp();
  const [open, setOpen] = useState(false);
  const [customUnits, setCustomUnits] = useState<any[]>([]);
  const [showUnitsManagement, setShowUnitsManagement] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    location: "",
    floors: "1",
    totalUnits: "",
    availableUnits: "",
    status: "available",
    useIntelligentNumbering: true, // تفعيل الترقيم الذكي افتراضياً
    unitsPerFloor: "",
    unitFormat: "101", // الترقيم الافتراضي 101-102-201-202
  });

  const calculateTotalUnits = () => {
    if (formData.useIntelligentNumbering) {
      const floors = Math.max(1, parseInt(formData.floors, 10) || 1);
      const unitsPerFloor = Math.max(1, parseInt(formData.unitsPerFloor, 10) || 1);
      return floors * unitsPerFloor;
    }
    return Math.max(0, parseInt(formData.totalUnits, 10) || 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields = [formData.name, formData.type, formData.location, formData.availableUnits];
    if (formData.useIntelligentNumbering) {
      requiredFields.push(formData.floors, formData.unitsPerFloor);
    } else {
      requiredFields.push(formData.totalUnits);
    }

    if (requiredFields.some(field => !field)) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const floors = Math.max(1, parseInt(formData.floors, 10) || 1);
    const totalUnits = calculateTotalUnits();
    const availableUnits = Math.max(0, parseInt(formData.availableUnits, 10) || 0);
    
    if (availableUnits > totalUnits) {
      toast({ title: "خطأ", description: "عدد الوحدات المتاحة لا يمكن أن يكون أكبر من إجمالي الوحدات", variant: "destructive" });
      return;
    }

    addProperty({
      name: formData.name,
      type: formData.type,
      location: formData.location,
      floors,
      totalUnits,
      rentedUnits: totalUnits - availableUnits,
      availableUnits,
      price: 0, // لا يتم تحديد السعر في مرحلة إضافة العقار
      currency,
      status: formData.status,
      units: customUnits, // Use custom units if managed manually
      unitsPerFloor: formData.useIntelligentNumbering ? parseInt(formData.unitsPerFloor, 10) : undefined,
      unitFormat: formData.useIntelligentNumbering ? formData.unitFormat : undefined,
    });

    toast({ title: "تم بنجاح", description: "تم إضافة العقار بنجاح" });

    setFormData({ 
      name: "", 
      type: "", 
      location: "", 
      floors: "1", 
      totalUnits: "", 
      availableUnits: "", 
      status: "available",
      useIntelligentNumbering: true, // الترقيم الذكي افتراضياً
      unitsPerFloor: "",
      unitFormat: "101", // 101-102-201-202...
    });
    setCustomUnits([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary shadow-elegant">
          <Plus className="h-4 w-4 mr-2" />
          إضافة عقار جديد
        </Button>
      </DialogTrigger>
      <DialogContent className={`${showUnitsManagement ? 'sm:max-w-4xl' : 'sm:max-w-[560px]'} max-h-[95vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            إضافة عقار جديد
          </DialogTitle>
          <DialogDescription>أدخل تفاصيل العقار ثم اضغط حفظ.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">اسم العقار *</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">النوع *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData((p) => ({ ...p, type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">سكني</SelectItem>
                  <SelectItem value="commercial">تجاري</SelectItem>
                  <SelectItem value="industrial">صناعي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">الحالة</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">متاح</SelectItem>
                  <SelectItem value="rented">مؤجر</SelectItem>
                  <SelectItem value="maintenance">صيانة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="location">الموقع *</Label>
            <Input id="location" value={formData.location} onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))} />
          </div>
          
          {/* Intelligent Unit Numbering Toggle */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <Switch
              id="intelligent-numbering"
              checked={formData.useIntelligentNumbering}
              onCheckedChange={(checked) => setFormData((p) => ({ 
                ...p, 
                useIntelligentNumbering: checked,
                totalUnits: checked ? "" : p.totalUnits,
              }))}
            />
            <Label htmlFor="intelligent-numbering">ترقيم ذكي للوحدات</Label>
          </div>

          {formData.useIntelligentNumbering ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="floors">عدد الطوابق *</Label>
                  <Input 
                    id="floors" 
                    type="number" 
                    min="1" 
                    value={formData.floors} 
                    onChange={(e) => setFormData((p) => ({ ...p, floors: e.target.value }))} 
                  />
                </div>
                <div>
                  <Label htmlFor="unitsPerFloor">وحدات في كل طابق *</Label>
                  <Input 
                    id="unitsPerFloor" 
                    type="number" 
                    min="1" 
                    value={formData.unitsPerFloor} 
                    onChange={(e) => setFormData((p) => ({ ...p, unitsPerFloor: e.target.value }))} 
                  />
                </div>
                <div>
                  <Label htmlFor="unitFormat">صيغة الترقيم *</Label>
                  <Select value={formData.unitFormat} onValueChange={(v) => setFormData((p) => ({ ...p, unitFormat: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الصيغة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="101">101، 102، 201، 202 (طابق + رقم)</SelectItem>
                      <SelectItem value="01">01، 02، 03، 04 (ترقيم تسلسلي)</SelectItem>
                      <SelectItem value="1">1، 2، 3، 4 (أرقام بسيطة)</SelectItem>
                      <SelectItem value="A1">A1، A2، B1، B2 (حرف + رقم)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="availableUnits">عدد الوحدات المتاحة *</Label>
                <div className="flex gap-2">
                  <Input 
                    id="availableUnits" 
                    type="number" 
                    min="0" 
                    max={calculateTotalUnits()} 
                    value={formData.availableUnits} 
                    onChange={(e) => setFormData((p) => ({ ...p, availableUnits: e.target.value }))} 
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Open units management for manual selection
                      const totalUnits = calculateTotalUnits();
                      if (totalUnits > 0) {
                        // Generate all units first
                        const allUnits = [];
                        const floors = parseInt(formData.floors) || 1;
                        const unitsPerFloor = parseInt(formData.unitsPerFloor) || 1;
                        
                        for (let floor = 1; floor <= floors; floor++) {
                          for (let unit = 1; unit <= unitsPerFloor; unit++) {
                            let unitNumber = "";
                            
                            if (formData.unitFormat === "101") {
                              unitNumber = `${floor}${unit.toString().padStart(2, '0')}`;
                            } else if (formData.unitFormat === "01") {
                              const totalUnitIndex = (floor - 1) * unitsPerFloor + unit;
                              unitNumber = totalUnitIndex.toString().padStart(2, '0');
                            } else if (formData.unitFormat === "1") {
                              const totalUnitIndex = (floor - 1) * unitsPerFloor + unit;
                              unitNumber = totalUnitIndex.toString();
                            } else if (formData.unitFormat === "A1") {
                              const floorLetter = String.fromCharCode(64 + floor);
                              unitNumber = `${floorLetter}${unit}`;
                            }
                            
                            allUnits.push({
                              number: unitNumber,
                              floor: floor,
                              isAvailable: true,
                            });
                          }
                        }
                        setCustomUnits(allUnits);
                        // Enable manual units management mode temporarily
                        setShowUnitsManagement(true);
                      }
                    }}
                    disabled={!formData.floors || !formData.unitsPerFloor}
                  >
                    اختيار يدوي
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  الحد الأقصى: {calculateTotalUnits()} وحدة
                </p>
              </div>
              
              {formData.floors && formData.unitsPerFloor && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    إجمالي الوحدات: {calculateTotalUnits()} وحدة
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    مثال على أرقام الوحدات: {(() => {
                      const floors = parseInt(formData.floors) || 1;
                      const unitsPerFloor = parseInt(formData.unitsPerFloor) || 1;
                      const examples = [];
                      
                      for (let floor = 1; floor <= Math.min(2, floors); floor++) {
                        for (let unit = 1; unit <= Math.min(3, unitsPerFloor); unit++) {
                          if (formData.unitFormat === "101") {
                            examples.push(`${floor}${unit.toString().padStart(2, '0')}`);
                          } else if (formData.unitFormat === "01") {
                            const totalIndex = (floor - 1) * unitsPerFloor + unit;
                            examples.push(totalIndex.toString().padStart(2, '0'));
                          } else if (formData.unitFormat === "1") {
                            const totalIndex = (floor - 1) * unitsPerFloor + unit;
                            examples.push(totalIndex.toString());
                          } else if (formData.unitFormat === "A1") {
                            const floorLetter = String.fromCharCode(64 + floor);
                            examples.push(`${floorLetter}${unit}`);
                          }
                          if (examples.length >= 6) break;
                        }
                        if (examples.length >= 6) break;
                      }
                      
                      return examples.join('، ') + (examples.length < calculateTotalUnits() ? '...' : '');
                    })()}
                  </p>
                </div>
              )}

              {/* Manual Units Management */}
              {showUnitsManagement && (
                <div className="border rounded-lg p-4 bg-muted/20">
                  <div className="max-h-96 overflow-y-auto">
                    <UnitsManagement
                      floors={parseInt(formData.floors) || 1}
                      unitsPerFloor={parseInt(formData.unitsPerFloor) || 1}
                      unitFormat={formData.unitFormat}
                      onUnitsChange={(units) => {
                        setCustomUnits(units);
                        const availableCount = units.filter(u => u.isAvailable).length;
                        setFormData(p => ({ ...p, availableUnits: availableCount.toString() }));
                      }}
                      onAvailableUnitsChange={(count) => {
                        setFormData(p => ({ ...p, availableUnits: count.toString() }));
                      }}
                      propertyId={undefined}
                    />
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t bg-background/80 sticky bottom-0">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setShowUnitsManagement(false);
                        toast({ 
                          title: "تم الحفظ", 
                          description: `تم حفظ إعدادات الوحدات. الوحدات المتاحة: ${formData.availableUnits}` 
                        });
                      }}
                      className="bg-gradient-primary"
                    >
                      تأكيد وإغلاق
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUnitsManagement(false)}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
              
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="floors">عدد الطوابق</Label>
                <Input id="floors" type="number" min="1" value={formData.floors} onChange={(e) => setFormData((p) => ({ ...p, floors: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="totalUnits">إجمالي الوحدات *</Label>
                <Input id="totalUnits" type="number" min="0" value={formData.totalUnits} onChange={(e) => setFormData((p) => ({ ...p, totalUnits: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="availableUnits">عدد الوحدات المتاحة *</Label>
                <Input id="availableUnits" type="number" min="0" value={formData.availableUnits} onChange={(e) => setFormData((p) => ({ ...p, availableUnits: e.target.value }))} />
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1 bg-gradient-primary">حفظ</Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>إلغاء</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
