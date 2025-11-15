import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, ToggleLeft, ToggleRight, Maximize2, Minimize2, X, Info } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { UnitDetailsDialog } from "@/components/UnitDetailsDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@/contexts/AppContext";

interface UnitsManagementDialogProps {
  property: Property;
  trigger?: React.ReactNode;
}

export function UnitsManagementDialog({ property, trigger }: UnitsManagementDialogProps) {
  const { updateProperty, contracts, clients } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [units, setUnits] = useState(property.units || []);
  const [selectedUnit, setSelectedUnit] = useState<typeof units[0] | null>(null);
  const [showUnitDetails, setShowUnitDetails] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCreateContractDialog, setShowCreateContractDialog] = useState(false);
  const [showOccupyAllDialog, setShowOccupyAllDialog] = useState(false);
  const [unitToToggle, setUnitToToggle] = useState<string | null>(null);
  const [unitToCreateContract, setUnitToCreateContract] = useState<string | null>(null);

  useEffect(() => {
    setUnits(property.units || []);
  }, [property.units]);

  // دالة للتحقق من حالة الوحدة بناء على العقود النشطة (مصدر الحقيقة الوحيد)
  const getUnitOccupancyStatus = (unitNumber: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // فحص العقود النشطة فقط - هذا هو مصدر الحقيقة
    const unitContract = contracts.find(c => {
      const endDate = new Date(c.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      return c.propertyId === property.id && 
        c.unitNumber === unitNumber &&
        endDate >= today &&
        c.status !== 'terminated';
    });
    
    // إذا كان هناك عقد نشط، الوحدة مشغولة - وإلا فهي متاحة
    return !!unitContract;
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
      if (unit) {
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
    updateProperty(property.id, { ...property, units: updatedUnits });
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
    const availableUnits = units.filter(u => !getUnitOccupancyStatus(u.number));
    const unitsWithoutContracts = availableUnits.filter(unit => {
      const unitContract = contracts.find(c => 
        c.propertyId === property.id && 
        c.unitNumber === unit.number &&
        new Date(c.endDate) > new Date()
      );
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
    updateProperty(property.id, { ...property, units: updatedUnits });
  };

  const freeAll = () => {
    // التحقق من وجود وحدات مشغولة
    const occupiedUnits = units.filter(u => getUnitOccupancyStatus(u.number));
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
    updateProperty(property.id, { ...property, units: updatedUnits });
  };

  const availableCount = units.filter(unit => !getUnitOccupancyStatus(unit.number)).length;
  const occupiedCount = units.filter(unit => getUnitOccupancyStatus(unit.number)).length;
  const commercialCount = units.filter(unit => unit.unitType === 'commercial').length;
  const commercialAvailableCount = units.filter(unit => 
    unit.unitType === 'commercial' && !getUnitOccupancyStatus(unit.number)
  ).length;

  // Group units by floor for better display
  const unitsByFloor = units.reduce((acc, unit) => {
    if (!acc[unit.floor]) {
      acc[unit.floor] = [];
    }
    acc[unit.floor].push(unit);
    return acc;
  }, {} as Record<number, typeof units>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            إدارة الوحدات ({units.length})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={`${isFullscreen ? 'max-w-none w-screen h-screen' : 'sm:max-w-7xl w-[95vw]'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <DialogTitle className="text-lg font-bold">
              إدارة الوحدات
            </DialogTitle>
            <p className="text-base font-medium text-primary mt-1">
              {property.name}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              إضافة وتعديل وحدات العقار وحالة توفرها
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" 
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 p-0"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost" 
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Unit Statistics */}
          <div className={`grid gap-3 ${commercialCount > 0 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-3'}`}>
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
              <div className="text-primary font-medium text-sm">إجمالي الوحدات</div>
              <div className="text-primary text-2xl font-bold">{units.length}</div>
            </div>
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
              <div className="text-destructive font-medium text-sm">الوحدات المشغولة</div>
              <div className="text-destructive text-2xl font-bold">{occupiedCount}</div>
            </div>
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-center">
              <div className="text-success font-medium text-sm">الوحدات المتاحة</div>
              <div className="text-success text-2xl font-bold">{availableCount}</div>
            </div>
            {commercialCount > 0 && (
              <>
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                  <div className="text-blue-700 dark:text-blue-300 font-medium text-sm">إجمالي المحلات</div>
                  <div className="text-blue-700 dark:text-blue-300 text-2xl font-bold">{commercialCount}</div>
                </div>
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-center">
                  <div className="text-cyan-700 dark:text-cyan-300 font-medium text-sm">المحلات المتاحة</div>
                  <div className="text-cyan-700 dark:text-cyan-300 text-2xl font-bold">{commercialAvailableCount}</div>
                </div>
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                  <div className="text-orange-700 dark:text-orange-300 font-medium text-sm">المحلات المشغولة</div>
                  <div className="text-orange-700 dark:text-orange-300 text-2xl font-bold">{commercialCount - commercialAvailableCount}</div>
                </div>
              </>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={freeAll}
              disabled={units.length === 0 || availableCount === units.length}
              className="flex items-center gap-2"
            >
              <ToggleLeft className="h-4 w-4" />
              إتاحة الكل
            </Button>
            <Button 
              variant="outline" 
              onClick={occupyAll}
              disabled={units.length === 0 || occupiedCount === units.length}
              className="flex items-center gap-2"
            >
              <ToggleRight className="h-4 w-4" />
              إشغال الكل
            </Button>
          </div>

          {units.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد وحدات في هذا العقار
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">الوحدات حسب الطوابق:</h3>
              {Object.entries(unitsByFloor)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([floor, floorUnits]) => (
                <Card key={floor} className="border border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      الطابق {floor} ({floorUnits.length} {floorUnits.length === 1 ? 'وحدة' : 'وحدات'})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {floorUnits
                        .sort((a, b) => a.number.localeCompare(b.number))
                        .map((unit) => {
                          const isOccupied = getUnitOccupancyStatus(unit.number);
                          return (
                            <div
                              key={unit.number}
                              className={`
                                p-3 border rounded-lg cursor-pointer transition-all duration-200
                                hover:scale-[1.02] hover:shadow-md relative
                                 ${isOccupied
                                   ? 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10'
                                   : 'border-success/30 bg-success/5 hover:bg-success/10'
                                 }
                               `}
                               onClick={() => toggleUnitAvailability(unit.number)}
                             >
                               <div className="flex flex-col gap-1">
                                 <div className="flex items-center justify-between">
                                   <div className="font-semibold text-lg">{unit.number}</div>
                                   <Badge 
                                     variant="outline" 
                                     className={`text-xs ${!isOccupied
                                       ? "bg-success/10 text-success border-success/20" 
                                       : "bg-destructive/10 text-destructive border-destructive/20"
                                     }`}
                                   >
                                     {!isOccupied ? 'متاحة' : 'مشغولة'}
                                   </Badge>
                                 </div>
                                 <Badge variant="secondary" className="text-xs w-fit">
                                   {unit.unitType === 'commercial' ? 'تجاري' : 'سكني'}
                                 </Badge>
                               </div>
                             </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
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
                  navigate('/contracts', { 
                    state: { 
                      propertyId: property.id,
                      unitNumber: unitToCreateContract,
                      propertyName: property.name
                    } 
                  });
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
        {selectedUnit && (
          <UnitDetailsDialog
            unit={selectedUnit}
            property={property}
            open={showUnitDetails}
            onOpenChange={setShowUnitDetails}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
