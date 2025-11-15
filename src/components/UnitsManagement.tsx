import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, ToggleLeft, ToggleRight, Info } from "lucide-react";
import { UnitDetailsDialog } from "@/components/UnitDetailsDialog";
import { useApp } from "@/contexts/AppContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Unit {
  number: string;
  floor: number;
  isAvailable: boolean;
  unitType?: 'residential' | 'commercial';
}

interface UnitsManagementProps {
  floors: number;
  unitsPerFloor: number;
  unitFormat: string;
  onUnitsChange: (units: Unit[]) => void;
  onAvailableUnitsChange: (count: number) => void;
  propertyId?: number;
}

export function UnitsManagement({ 
  floors, 
  unitsPerFloor, 
  unitFormat, 
  onUnitsChange, 
  onAvailableUnitsChange,
  propertyId
}: UnitsManagementProps) {
  const { properties, contracts, clients } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState("");
  const [newUnitType, setNewUnitType] = useState<'residential' | 'commercial'>('residential');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [showUnitDetails, setShowUnitDetails] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCreateContractDialog, setShowCreateContractDialog] = useState(false);
  const [showOccupyAllDialog, setShowOccupyAllDialog] = useState(false);
  const [unitToToggle, setUnitToToggle] = useState<string | null>(null);
  const [unitToCreateContract, setUnitToCreateContract] = useState<string | null>(null);
  
  const property = propertyId ? properties.find(p => p.id === propertyId) : null;

  // Generate units automatically based on format
  const generateUnits = () => {
    const newUnits: Unit[] = [];
    
    for (let floor = 1; floor <= floors; floor++) {
      for (let unit = 1; unit <= unitsPerFloor; unit++) {
        let unitNumber = "";
        
        // ترقيم موحد: 101-102-201-202...
        if (unitFormat === "101") {
          unitNumber = `${floor}${unit.toString().padStart(2, '0')}`;
        } else if (unitFormat === "01") {
          const totalUnitIndex = (floor - 1) * unitsPerFloor + unit;
          unitNumber = totalUnitIndex.toString().padStart(2, '0');
        } else if (unitFormat === "1") {
          const totalUnitIndex = (floor - 1) * unitsPerFloor + unit;
          unitNumber = totalUnitIndex.toString();
        } else if (unitFormat === "A1") {
          const floorLetter = String.fromCharCode(64 + floor);
          unitNumber = `${floorLetter}${unit}`;
        }
        
        newUnits.push({
          number: unitNumber,
          floor: floor,
          isAvailable: true, // All available by default
          unitType: 'residential' // Default to residential
        });
      }
    }
    
    setUnits(newUnits);
    onUnitsChange(newUnits);
    onAvailableUnitsChange(newUnits.length);
  };

  // Generate units when format changes
  useEffect(() => {
    if (floors && unitsPerFloor && unitFormat && !isManualMode) {
      generateUnits();
    }
  }, [floors, unitsPerFloor, unitFormat, isManualMode]);

  // دالة للتحقق من حالة الوحدة بناء على العقود
  const getUnitOccupancyStatus = (unitNumber: string) => {
    if (!property) return false;
    
    const unitContract = contracts.find(c => 
      c.propertyId === property.id && 
      c.unitNumber === unitNumber &&
      new Date(c.endDate) > new Date() &&
      c.status !== 'terminated'
    );
    
    return !!unitContract; // true if there's an active contract
  };

  const toggleUnitAvailability = (unitNumber: string) => {
    const isOccupied = getUnitOccupancyStatus(unitNumber);

    // إذا كانت الوحدة متاحة (لا يوجد عقد) ونريد إشغالها
    if (!isOccupied) {
      // نطلب إنشاء عقد جديد
      setUnitToCreateContract(unitNumber);
      setShowCreateContractDialog(true);
      return;
    } else {
      // إذا كانت الوحدة مشغولة (يوجد عقد)، نفتح تفاصيل الوحدة
      const unit = units.find(u => u.number === unitNumber);
      if (unit && property) {
        setSelectedUnit(unit);
        setShowUnitDetails(true);
      }
      return;
    }
  };

  const performToggle = (unitNumber: string) => {
    const updatedUnits = units.map(unit => 
      unit.number === unitNumber 
        ? { ...unit, isAvailable: !unit.isAvailable }
        : unit
    );
    setUnits(updatedUnits);
    onUnitsChange(updatedUnits);
    onAvailableUnitsChange(updatedUnits.filter(u => u.isAvailable).length);
  };

  const handleConfirmToggle = () => {
    if (unitToToggle) {
      performToggle(unitToToggle);
      toast({
        title: "تم إنهاء العقد",
        description: `تم تحرير الوحدة ${unitToToggle} وإنهاء العقد المرتبط بها`
      });
    }
    setShowConfirmDialog(false);
    setUnitToToggle(null);
  };

  const occupyAll = () => {
    // التحقق من وجود عقود للوحدات المتاحة
    const availableUnits = units.filter(u => u.isAvailable);
    const unitsWithoutContracts = availableUnits.filter(unit => {
      const unitContract = property ? contracts.find(c => 
        c.propertyId === property.id && 
        c.unitNumber === unit.number &&
        new Date(c.endDate) > new Date()
      ) : null;
      return !unitContract;
    });

    if (unitsWithoutContracts.length > 0) {
      setShowOccupyAllDialog(true);
      return;
    }

    // إذا كانت جميع الوحدات المتاحة لها عقود، نشغلها مباشرة
    performOccupyAll();
  };

  const performOccupyAll = () => {
    const updatedUnits = units.map(unit => ({ ...unit, isAvailable: false }));
    setUnits(updatedUnits);
    onUnitsChange(updatedUnits);
    onAvailableUnitsChange(0);
  };

  const freeAll = () => {
    // التحقق من وجود وحدات مشغولة
    const occupiedUnits = units.filter(u => !u.isAvailable);
    if (occupiedUnits.length > 0) {
      // إظهار تأكيد لإنهاء جميع العقود
      toast({
        title: "تأكيد مطلوب",
        description: "يجب إنهاء العقود المرتبطة بالوحدات المشغولة أولاً. استخدم الإدارة الفردية للوحدات.",
        variant: "destructive"
      });
      return;
    }
    
    const updatedUnits = units.map(unit => ({ ...unit, isAvailable: true }));
    setUnits(updatedUnits);
    onUnitsChange(updatedUnits);
    onAvailableUnitsChange(updatedUnits.length);
  };

  const addManualUnit = () => {
    if (!newUnitNumber.trim()) return;
    
    if (units.find(unit => unit.number === newUnitNumber)) {
      return; // Unit already exists
    }

    const newUnit: Unit = {
      number: newUnitNumber,
      floor: 1, // Default floor for manual units
      isAvailable: true,
      unitType: newUnitType,
    };

    const updatedUnits = [...units, newUnit];
    setUnits(updatedUnits);
    onUnitsChange(updatedUnits);
    onAvailableUnitsChange(updatedUnits.filter(u => u.isAvailable).length);
    setNewUnitNumber("");
  };

  const removeUnit = (unitNumber: string) => {
    const updatedUnits = units.filter(unit => unit.number !== unitNumber);
    setUnits(updatedUnits);
    onUnitsChange(updatedUnits);
    onAvailableUnitsChange(updatedUnits.filter(u => u.isAvailable).length);
  };

  // حساب الإحصائيات بناء على العقود الفعلية
  const getActualUnitCounts = () => {
    if (!property) return { available: units.length, occupied: 0 };
    
    let occupied = 0;
    units.forEach(unit => {
      const hasActiveContract = contracts.find(c => 
        c.propertyId === property.id && 
        c.unitNumber === unit.number &&
        new Date(c.endDate) > new Date()
      );
      if (hasActiveContract) occupied++;
    });
    
    return {
      available: units.length - occupied,
      occupied: occupied
    };
  };

  const { available: availableCount, occupied: occupiedCount } = getActualUnitCounts();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">إدارة الوحدات</CardTitle>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Switch
            id="manual-mode"
            checked={isManualMode}
            onCheckedChange={setIsManualMode}
          />
          <Label htmlFor="manual-mode">الإدخال اليدوي للوحدات</Label>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Unit Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
            <div className="text-success font-medium">الوحدات المتاحة</div>
            <div className="text-success text-2xl font-bold">{availableCount}</div>
          </div>
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="text-destructive font-medium">الوحدات المشغولة</div>
            <div className="text-destructive text-2xl font-bold">{occupiedCount}</div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={freeAll}
            disabled={units.length === 0}
          >
            <ToggleLeft className="h-4 w-4 mr-2" />
            إتاحة الكل
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={occupyAll}
            disabled={units.length === 0}
          >
            <ToggleRight className="h-4 w-4 mr-2" />
            إشغال الكل
          </Button>
          {!isManualMode && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateUnits}
            >
              إعادة إنشاء الوحدات
            </Button>
          )}
        </div>

        <Separator />

        {/* Manual Unit Addition */}
        {isManualMode && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Select value={newUnitType} onValueChange={(value: 'residential' | 'commercial') => setNewUnitType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">سكنية</SelectItem>
                  <SelectItem value="commercial">تجارية</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="رقم الوحدة (مثال: 101)"
                value={newUnitNumber}
                onChange={(e) => setNewUnitNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addManualUnit()}
              />
              <Button 
                size="sm" 
                onClick={addManualUnit}
                disabled={!newUnitNumber.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Units List */}
        {units.length > 0 && (
          <div className="space-y-3">
            <Label>الوحدات:</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {units.map((unit) => {
                const isOccupied = getUnitOccupancyStatus(unit.number);
                return (
                  <div
                    key={unit.number}
                    className={`flex items-center justify-between p-2 border rounded-lg cursor-pointer transition-colors ${
                      !isOccupied
                        ? 'border-success/30 bg-success/5 hover:bg-success/10'
                        : 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10'
                    }`}
                    onClick={() => {
                      // دائماً استخدم toggleUnitAvailability للتحكم في المنطق
                      toggleUnitAvailability(unit.number);
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{unit.number}</span>
                      <span className="text-xs text-muted-foreground">
                        {unit.unitType === 'commercial' ? 'تجاري' : 'سكني'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isOccupied && property && (
                        <Info className="h-3 w-3 text-muted-foreground" />
                      )}
                      <Badge 
                        variant="outline" 
                        className={!isOccupied
                          ? "bg-success/10 text-success border-success/20" 
                          : "bg-destructive/10 text-destructive border-destructive/20"
                        }
                        style={{ fontSize: '10px', padding: '2px 6px' }}
                      >
                        {!isOccupied ? 'متاحة' : 'مشغولة'}
                      </Badge>
                      {isManualMode && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-destructive/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeUnit(unit.number);
                          }}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {units.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                لم يتم إضافة أي وحدات بعد
                {!isManualMode && floors && unitsPerFloor && (
                  <div className="mt-2">
                    <Button size="sm" onClick={generateUnits}>
                      إنشاء الوحدات تلقائياً
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Confirmation Dialog for Ending Contract */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>إنهاء تعاقد الوحدة</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من أنك تريد إنهاء تعاقد الوحدة {unitToToggle}؟ 
                سيتم إنهاء العقد وإتاحة الوحدة للإيجار مرة أخرى.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmToggle}
                className="bg-destructive hover:bg-destructive/90"
              >
                إنهاء التعاقد
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create Contract Dialog */}
        <AlertDialog open={showCreateContractDialog} onOpenChange={setShowCreateContractDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>إشغال الوحدة</AlertDialogTitle>
              <AlertDialogDescription>
                لا يوجد عقد صالح للوحدة {unitToCreateContract}. 
                هل تريد إنشاء عقد جديد لهذه الوحدة؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  setShowCreateContractDialog(false);
                  // التحويل المباشر إلى صفحة العقود مع تمرير بيانات الوحدة
                  if (property) {
                    navigate('/contracts', { 
                      state: { 
                        propertyId: property.id,
                        unitNumber: unitToCreateContract,
                        propertyName: property.name
                      } 
                    });
                  }
                  setUnitToCreateContract(null);
                }}
                className="bg-primary hover:bg-primary/90"
              >
                إنشاء عقد جديد
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Occupy All Dialog */}
        <AlertDialog open={showOccupyAllDialog} onOpenChange={setShowOccupyAllDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>إشغال جميع الوحدات</AlertDialogTitle>
              <AlertDialogDescription>
                يوجد وحدات متاحة بدون عقود صالحة. 
                يجب وجود عقود لجميع الوحدات قبل إشغالها. هل تريد المتابعة؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  setShowOccupyAllDialog(false);
                  toast({
                    title: "إنشاء عقود مطلوبة",
                    description: "يرجى إنشاء عقود للوحدات المتاحة أولاً",
                    variant: "destructive"
                  });
                }}
                className="bg-primary hover:bg-primary/90"
              >
                إنشاء عقود أولاً
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Unit Details Dialog */}
        {selectedUnit && property && (
          <UnitDetailsDialog
            unit={selectedUnit}
            property={property}
            open={showUnitDetails}
            onOpenChange={setShowUnitDetails}
          />
        )}
      </CardContent>
    </Card>
  );
}
