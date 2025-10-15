import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Property } from "@/contexts/AppContext";
import { useApp } from "@/contexts/AppContext";

interface UnitSelectorProps {
  property: Property | null;
  selectedUnit: string;
  onUnitSelect: (unitNumber: string) => void;
}

export function UnitSelector({ property, selectedUnit, onUnitSelect }: UnitSelectorProps) {
  const { contracts } = useApp();
  const [showOccupiedWarning, setShowOccupiedWarning] = useState(false);

  // تم إزالة console.log لتحسين الأداء

  // دالة للتحقق من حالة الوحدة بناء على العقود والبيانات المحفوظة
  const getUnitOccupancyStatus = (unitNumber: string) => {
    if (!property) return false;
    
    // فحص العقود الفعالة أولاً (العقود غير المنتهية الصلاحية وغير المنهية)
    const activeContract = contracts.find(c => 
      c.propertyId === property.id && 
      c.unitNumber === unitNumber &&
      new Date(c.endDate) > new Date() &&
      c.status !== 'terminated'
    );
    
    // إذا كان هناك عقد فعال، فالوحدة مشغولة
    if (activeContract) {
      return true;
    }
    
    // فحص حالة الوحدة المحفوظة في البيانات
    const unitData = property.units.find(u => u.number === unitNumber);
    
    // إذا لم توجد بيانات للوحدة، اعتبرها غير متاحة للأمان
    if (!unitData) {
      return true;
    }
    
    // الوحدة مشغولة إذا كانت محفوظة كغير متاحة
    return !unitData.isAvailable;
  };

  if (!property || !property.units || property.units.length === 0) {
    // تم إزالة console.log لتحسين الأداء
    return (
      <div>
        <Label>رقم الوحدة</Label>
        <div className="p-2 text-sm text-muted-foreground bg-muted rounded">
          لا توجد وحدات متاحة لهذا العقار
        </div>
      </div>
    );
  }

  const availableUnits = property.units.filter(unit => !getUnitOccupancyStatus(unit.number));
  const occupiedUnits = property.units.filter(unit => getUnitOccupancyStatus(unit.number));

  const handleUnitChange = (unitNumber: string) => {
    const isOccupied = getUnitOccupancyStatus(unitNumber);
    
    if (isOccupied) {
      setShowOccupiedWarning(true);
      setTimeout(() => setShowOccupiedWarning(false), 3000);
      return;
    }
    
    setShowOccupiedWarning(false);
    onUnitSelect(unitNumber);
  };

  // Group units by floor for better organization
  const unitsByFloor = property.units.reduce((acc, unit) => {
    const floor = unit.floor;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(unit);
    return acc;
  }, {} as Record<number, typeof property.units>);

  return (
    <div className="space-y-3">
      <Label htmlFor="unitNumber">رقم الوحدة *</Label>
      
      <Select value={selectedUnit} onValueChange={handleUnitChange}>
        <SelectTrigger>
          <SelectValue placeholder="اختر رقم الوحدة" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(unitsByFloor)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([floor, units]) => (
              <div key={floor}>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/50">
                  الطابق {floor}
                </div>
                {units
                  .sort((a, b) => a.number.localeCompare(b.number))
                  .map((unit) => {
                    const isOccupied = getUnitOccupancyStatus(unit.number);
                    return (
                      <SelectItem 
                        key={unit.number} 
                        value={unit.number}
                        disabled={isOccupied}
                        className={isOccupied ? "opacity-50" : ""}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>وحدة {unit.number}</span>
                          {!isOccupied ? (
                            <Badge variant="outline" className="ml-2 bg-success/10 text-success border-success/20">
                              متاحة
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="ml-2 bg-destructive/10 text-destructive border-destructive/20">
                              مشغولة
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
              </div>
            ))}
        </SelectContent>
      </Select>

      {showOccupiedWarning && (
        <Alert className="border-warning/20 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            هذه الوحدة مشغولة بالفعل. يرجى اختيار وحدة أخرى متاحة.
          </AlertDescription>
        </Alert>
      )}

      {property.units.length > 0 && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-2 bg-success/10 border border-success/20 rounded">
            <div className="text-success font-medium">الوحدات المتاحة</div>
            <div className="text-success text-lg font-bold">{availableUnits.length}</div>
          </div>
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded">
            <div className="text-destructive font-medium">الوحدات المشغولة</div>
            <div className="text-destructive text-lg font-bold">{occupiedUnits.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}