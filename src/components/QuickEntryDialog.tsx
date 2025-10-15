import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Building2, User, FileText, ArrowRight, ArrowLeft } from "lucide-react";
import { UnitSelector } from "./UnitSelector";
import { UnitsManagement } from "./UnitsManagement";
import { useApp } from "@/contexts/AppContext";
import { toast } from "@/hooks/use-toast";

interface QuickEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickEntryDialog({ open, onOpenChange }: QuickEntryDialogProps) {
  const { properties, clients, addProperty, addClient, addContract, updateProperty, currency, addPayment, reserveUnit, releaseUnit } = useApp();
  const [step, setStep] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [customUnits, setCustomUnits] = useState<any[]>([]);
  const [showUnitsManagement, setShowUnitsManagement] = useState(false);

  // Remove debug logging
  // console.log("الخطوة الحالية:", step);
  // console.log("العقار المحدد:", selectedProperty);
  // console.log("العميل المحدد:", selectedClient);

  // Property form data
  const [propertyData, setPropertyData] = useState({
    name: "",
    type: "",
    location: "",
    floors: "1",
    totalUnits: "",
    availableUnits: "",
    status: "available",
    useIntelligentNumbering: false,
    unitsPerFloor: "",
    unitFormat: "101",
  });

  // Client form data
  const [clientData, setClientData] = useState({
    name: "",
    phone: "",
    email: "",
    idNumber: "",
    nationality: "",
    address: "",
    type: "tenant",
  });

  // Contract form data
  const [contractData, setContractData] = useState({
    unitNumber: "",
    startDate: "",
    endDate: "",
    monthlyRent: "",
    paymentMethod: "",
    paymentSchedule: "monthly",
    paymentType: "later",
    numberOfPayments: "12",
    paymentDates: "",
    checkNumbers: "",
  });

  const resetForm = () => {
    setStep(1);
    setSelectedProperty(null);
    setSelectedClient(null);
    setIsAddingProperty(false);
    setIsAddingClient(false);
    setCustomUnits([]);
    setShowUnitsManagement(false);
    setPropertyData({ name: "", type: "", location: "", floors: "1", totalUnits: "", availableUnits: "", status: "available", useIntelligentNumbering: false, unitsPerFloor: "", unitFormat: "101" });
    setClientData({ name: "", phone: "", email: "", idNumber: "", nationality: "", address: "", type: "tenant" });
    setContractData({ unitNumber: "", startDate: "", endDate: "", monthlyRent: "", paymentMethod: "", paymentSchedule: "monthly", paymentType: "later", numberOfPayments: "12", paymentDates: "", checkNumbers: "" });
  };

  const calculateTotalUnits = () => {
    if (propertyData.useIntelligentNumbering) {
      const floors = Math.max(1, parseInt(propertyData.floors, 10) || 1);
      const unitsPerFloor = Math.max(1, parseInt(propertyData.unitsPerFloor, 10) || 1);
      return floors * unitsPerFloor;
    }
    return Math.max(0, parseInt(propertyData.totalUnits, 10) || 0);
  };

  const handlePropertySubmit = () => {
    const requiredFields = [propertyData.name, propertyData.type, propertyData.location, propertyData.availableUnits];
    if (propertyData.useIntelligentNumbering) {
      requiredFields.push(propertyData.floors, propertyData.unitsPerFloor);
    } else {
      requiredFields.push(propertyData.totalUnits);
    }

    if (requiredFields.some(field => !field)) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const floors = Math.max(1, parseInt(propertyData.floors, 10) || 1);
    const totalUnits = calculateTotalUnits();
    const availableUnits = Math.max(0, parseInt(propertyData.availableUnits, 10) || 0);
    
    if (availableUnits > totalUnits) {
      toast({ title: "خطأ", description: "عدد الوحدات المتاحة لا يمكن أن يكون أكبر من إجمالي الوحدات", variant: "destructive" });
      return;
    }

    const newProperty = {
      name: propertyData.name,
      type: propertyData.type,
      location: propertyData.location,
      floors,
      totalUnits,
      rentedUnits: totalUnits - availableUnits,
      availableUnits: availableUnits,
      price: 0,
      currency,
      status: propertyData.status,
      units: customUnits, // Use custom units if managed manually
      unitsPerFloor: propertyData.useIntelligentNumbering ? parseInt(propertyData.unitsPerFloor, 10) : undefined,
      unitFormat: propertyData.useIntelligentNumbering ? propertyData.unitFormat : undefined,
    };

    const propertyId = addProperty(newProperty);
    setSelectedProperty({ ...newProperty, id: propertyId });
    setIsAddingProperty(false);
    setStep(2);
  };

  const handleClientSubmit = () => {
    if (!clientData.name || !clientData.phone || !clientData.type) {
      toast({ title: "خطأ", description: "يرجى إدخال الاسم ورقم الجوال ونوع العميل", variant: "destructive" });
      return;
    }

    const newClient = {
      name: clientData.name,
      phone: clientData.phone,
      email: clientData.email,
      idNumber: clientData.idNumber,
      nationality: clientData.nationality,
      address: clientData.address,
      type: clientData.type,
      properties: [],
    };

    const clientId = addClient(newClient);
    setSelectedClient({ ...newClient, id: clientId });
    setIsAddingClient(false);
    setStep(3);
  };

  const handleContractSubmit = async () => {
    if (!contractData.startDate || !contractData.endDate || !contractData.monthlyRent || !contractData.paymentMethod || !contractData.paymentSchedule) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const startDate = new Date(contractData.startDate);
    const endDate = new Date(contractData.endDate);

    if (endDate <= startDate) {
      toast({ title: "خطأ", description: "تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية", variant: "destructive" });
      return;
    }

    // Generate payment dates based on schedule
    const generatePaymentDates = (start: Date, end: Date, schedule: string) => {
      const dates = [];
      const current = new Date(start);
      
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        
        if (schedule === 'monthly') {
          current.setMonth(current.getMonth() + 1);
        } else if (schedule === 'quarterly') {
          current.setMonth(current.getMonth() + 3);
        } else if (schedule === 'semi_annual') {
          current.setMonth(current.getMonth() + 6);
        } else if (schedule === 'annually') {
          current.setFullYear(current.getFullYear() + 1);
        }
      }
      
      return dates;
    };

    const paymentDates = generatePaymentDates(startDate, endDate, contractData.paymentSchedule);
    
    // إنشاء العقد بدون تحديد المعرف (ستتم إضافته تلقائياً)
    const newContract = {
      propertyId: selectedProperty.id,
      clientId: selectedClient.id,
      startDate: contractData.startDate,
      endDate: contractData.endDate,
      monthlyRent: parseFloat(contractData.monthlyRent),
      currency: currency,
      paymentSchedule: contractData.paymentSchedule,
      paymentMethod: contractData.paymentMethod,
      unitNumber: contractData.unitNumber,
      numberOfPayments: paymentDates.length.toString(),
      paymentDates: paymentDates.join(', '),
      checkNumbers: contractData.checkNumbers || "",
    };

    // الحصول على معرف العقد الفعلي بعد إنشاؤه
    const contractId = await addContract(newContract);
    
    if (!contractId) {
      // Rollback unit reservation if contract creation failed
      await releaseUnit(selectedProperty.id, contractData.unitNumber);
      return;
    }

    // Reserve the unit
    if (!(await reserveUnit(selectedProperty.id, contractData.unitNumber, selectedClient.id))) {
      toast({
        title: "خطأ",
        description: "هذه الوحدة مشغولة بالفعل. يرجى اختيار وحدة أخرى.",
        variant: "destructive"
      });
      return;
    }

    // Create payments based on schedule
    const yearlyRent = parseFloat(contractData.monthlyRent);
    const paymentAmount = contractData.paymentSchedule === 'monthly' ? yearlyRent / 12 :
                        contractData.paymentSchedule === 'quarterly' ? yearlyRent / 4 :
                        contractData.paymentSchedule === 'semi_annual' ? yearlyRent / 2 :
                        yearlyRent;

    for (let index = 0; index < paymentDates.length; index++) {
      const date = paymentDates[index];
      const isFirstPayment = index === 0;
      const shouldPayNow = contractData.paymentType === 'now' && isFirstPayment;
      const dueDate = new Date(date);
      const today = new Date();
      const daysDifference = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let status: 'paid' | 'pending' | 'scheduled' | 'overdue' = 'scheduled';
      
      if (shouldPayNow) {
        status = 'paid';
      } else if (isFirstPayment && contractData.paymentType === 'later') {
        status = 'pending';
      } else if (daysDifference <= 5 && daysDifference >= 0) {
        status = 'pending';
      }
      // إنشاء رقم الشيك إذا كانت طريقة الدفع شيك وتوفر أرقام الشيكات
      let checkNumber = undefined;
      const checkNumbers = contractData.checkNumbers ? contractData.checkNumbers.split(', ') : [];
      if (contractData.paymentMethod === 'cheque' && checkNumbers.length > 0) {
        checkNumber = checkNumbers[index];
      }
      
      await addPayment({
        contractId: contractId,
        amount: paymentAmount,
        currency: currency,
        dueDate: date,
        paidDate: shouldPayNow ? new Date().toISOString().split('T')[0] : undefined,
        paymentMethod: contractData.paymentMethod,
        checkNumber: checkNumber,
        status: status
      });
    }
    
    const paidCount = contractData.paymentType === 'now' ? 1 : 0;
    const pendingCount = paymentDates.filter((date, index) => {
      if (index === 0 && contractData.paymentType === 'later') return true;
      const dueDate = new Date(date);
      const today = new Date();
      const daysDifference = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysDifference <= 5 && daysDifference >= 0 && !(index === 0 && contractData.paymentType === 'now');
    }).length;
    const scheduledCount = paymentDates.length - paidCount - pendingCount;

    toast({ 
      title: "تم بنجاح", 
      description: contractData.paymentType === 'now' 
        ? `تم إنشاء العقد وتأكيد الدفعة الأولى. مجدول: ${scheduledCount} دفعة، معلق: ${pendingCount} دفعة`
        : `تم إنشاء العقد. مجدول: ${scheduledCount} دفعة، معلق: ${pendingCount} دفعة`
    });
    
    resetForm();
    onOpenChange(false);
  };

  const availableProperties = properties.filter(property => property.availableUnits > 0);

  return (
    <Dialog open={open} onOpenChange={(openState) => {
      if (!openState) resetForm();
      onOpenChange(openState);
    }}>
      <DialogContent className={`${showUnitsManagement ? 'sm:max-w-4xl' : 'sm:max-w-[600px]'} max-h-[95vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            إدخال سريع - الخطوة {step} من 3
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Property Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              اختيار أو إضافة عقار
            </div>

            {!isAddingProperty ? (
              <div className="space-y-4">
                <div>
                  <Label>اختر عقار موجود</Label>
                  <Select value={selectedProperty?.id?.toString() || ""} onValueChange={(value) => {
                    const property = availableProperties.find(p => p.id.toString() === value);
                    setSelectedProperty(property);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العقار" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProperties.map((property) => (
                        <SelectItem key={property.id} value={property.id.toString()}>
                          {property.name} - وحدات متاحة: {property.availableUnits}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-center">
                  <span className="text-sm text-muted-foreground">أو</span>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddingProperty(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة عقار جديد
                </Button>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={() => setStep(2)} 
                    disabled={!selectedProperty}
                    className="flex-1 bg-gradient-primary"
                  >
                    التالي <ArrowLeft className="h-4 w-4 mr-2" />
                  </Button>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">اسم العقار *</Label>
                  <Input id="name" value={propertyData.name} onChange={(e) => setPropertyData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">النوع *</Label>
                    <Select value={propertyData.type} onValueChange={(v) => setPropertyData(p => ({ ...p, type: v }))}>
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
                    <Select value={propertyData.status} onValueChange={(v) => setPropertyData(p => ({ ...p, status: v }))}>
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
                  <Input id="location" value={propertyData.location} onChange={(e) => setPropertyData(p => ({ ...p, location: e.target.value }))} />
                </div>
                
                 {/* Intelligent Unit Numbering Toggle */}
                 <div className="flex items-center space-x-2 space-x-reverse">
                   <Switch
                     id="intelligent-numbering-quick"
                     checked={propertyData.useIntelligentNumbering}
                     onCheckedChange={(checked) => setPropertyData((p) => ({ 
                       ...p, 
                       useIntelligentNumbering: checked,
                       totalUnits: checked ? "" : p.totalUnits,
                     }))}
                   />
                   <Label htmlFor="intelligent-numbering-quick">ترقيم ذكي للوحدات</Label>
                 </div>

                {propertyData.useIntelligentNumbering ? (
                  <>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div>
                         <Label htmlFor="floors">عدد الطوابق *</Label>
                         <Input 
                           id="floors" 
                           type="number" 
                           min="1" 
                           value={propertyData.floors} 
                           onChange={(e) => setPropertyData((p) => ({ ...p, floors: e.target.value }))} 
                         />
                       </div>
                       <div>
                         <Label htmlFor="unitsPerFloor">وحدات في كل طابق *</Label>
                         <Input 
                           id="unitsPerFloor" 
                           type="number" 
                           min="1" 
                           value={propertyData.unitsPerFloor} 
                           onChange={(e) => setPropertyData((p) => ({ ...p, unitsPerFloor: e.target.value }))} 
                         />
                       </div>
                       <div>
                         <Label htmlFor="unitFormat">صيغة الترقيم *</Label>
                         <Select value={propertyData.unitFormat} onValueChange={(v) => setPropertyData((p) => ({ ...p, unitFormat: v }))}>
                           <SelectTrigger>
                             <SelectValue placeholder="اختر الصيغة" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="101">101، 102، 201، 202</SelectItem>
                             <SelectItem value="01">01، 02، 03، 04</SelectItem>
                             <SelectItem value="1">1، 2، 3، 4</SelectItem>
                             <SelectItem value="A1">A1، A2، B1، B2</SelectItem>
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
                            value={propertyData.availableUnits} 
                            onChange={(e) => setPropertyData((p) => ({ ...p, availableUnits: e.target.value }))} 
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
                                const floors = parseInt(propertyData.floors) || 1;
                                const unitsPerFloor = parseInt(propertyData.unitsPerFloor) || 1;
                                
                                for (let floor = 1; floor <= floors; floor++) {
                                  for (let unit = 1; unit <= unitsPerFloor; unit++) {
                                    let unitNumber = "";
                                    
                                    if (propertyData.unitFormat === "101") {
                                      unitNumber = `${floor}${unit.toString().padStart(2, '0')}`;
                                    } else if (propertyData.unitFormat === "01") {
                                      const totalUnitIndex = (floor - 1) * unitsPerFloor + unit;
                                      unitNumber = totalUnitIndex.toString().padStart(2, '0');
                                    } else if (propertyData.unitFormat === "1") {
                                      const totalUnitIndex = (floor - 1) * unitsPerFloor + unit;
                                      unitNumber = totalUnitIndex.toString();
                                    } else if (propertyData.unitFormat === "A1") {
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
                            disabled={!propertyData.floors || !propertyData.unitsPerFloor}
                          >
                            اختيار يدوي
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          الحد الأقصى: {calculateTotalUnits()} وحدة
                        </p>
                      </div>
                    
                     {propertyData.floors && propertyData.unitsPerFloor && (
                       <div className="p-3 bg-muted rounded-lg">
                         <p className="text-sm text-muted-foreground">
                           إجمالي الوحدات: {calculateTotalUnits()} وحدة
                         </p>
                       </div>
                      )}

                       {/* Manual Units Management */}
                       {showUnitsManagement && (
                         <div className="border rounded-lg p-4 bg-muted/20">
                           <div className="max-h-96 overflow-y-auto">
                             <UnitsManagement
                               floors={parseInt(propertyData.floors) || 1}
                               unitsPerFloor={parseInt(propertyData.unitsPerFloor) || 1}
                               unitFormat={propertyData.unitFormat}
                               onUnitsChange={(units) => {
                                 setCustomUnits(units);
                                 const availableCount = units.filter(u => u.isAvailable).length;
                                 setPropertyData(p => ({ ...p, availableUnits: availableCount.toString() }));
                               }}
                               onAvailableUnitsChange={(count) => {
                                 setPropertyData(p => ({ ...p, availableUnits: count.toString() }));
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
                                   description: `تم حفظ إعدادات الوحدات. الوحدات المتاحة: ${propertyData.availableUnits}` 
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
                      <Input id="floors" type="number" min="1" value={propertyData.floors} onChange={(e) => setPropertyData(p => ({ ...p, floors: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="totalUnits">إجمالي الوحدات *</Label>
                      <Input id="totalUnits" type="number" min="0" value={propertyData.totalUnits} onChange={(e) => setPropertyData(p => ({ ...p, totalUnits: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="availableUnits">عدد الوحدات المتاحة *</Label>
                      <Input id="availableUnits" type="number" min="0" value={propertyData.availableUnits} onChange={(e) => setPropertyData(p => ({ ...p, availableUnits: e.target.value }))} />
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button type="button" onClick={handlePropertySubmit} className="flex-1 bg-gradient-primary">حفظ العقار</Button>
                  <Button type="button" variant="outline" onClick={() => setIsAddingProperty(false)} className="flex-1">رجوع</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Client Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              اختيار أو إضافة عميل
            </div>

            {!isAddingClient ? (
              <div className="space-y-4">
                <div>
                  <Label>اختر عميل موجود</Label>
                  <Select value={selectedClient?.id?.toString() || ""} onValueChange={(value) => {
                    const client = clients.find(c => c.id.toString() === value);
                    setSelectedClient(client);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name} - {client.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-center">
                  <span className="text-sm text-muted-foreground">أو</span>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddingClient(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة عميل جديد
                </Button>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={() => setStep(3)} 
                    disabled={!selectedClient}
                    className="flex-1 bg-gradient-primary"
                  >
                    التالي <ArrowLeft className="h-4 w-4 mr-2" />
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                    السابق <ArrowRight className="h-4 w-4 mr-2" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">الاسم *</Label>
                    <Input id="name" value={clientData.name} onChange={(e) => setClientData(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="phone">الجوال *</Label>
                    <Input id="phone" value={clientData.phone} onChange={(e) => setClientData(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">البريد</Label>
                    <Input id="email" type="email" value={clientData.email} onChange={(e) => setClientData(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="idNumber">رقم الهوية</Label>
                    <Input id="idNumber" value={clientData.idNumber} onChange={(e) => setClientData(p => ({ ...p, idNumber: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="nationality">الجنسية</Label>
                  <Input id="nationality" value={clientData.nationality} onChange={(e) => setClientData(p => ({ ...p, nationality: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="address">العنوان</Label>
                  <Input id="address" value={clientData.address} onChange={(e) => setClientData(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="type">نوع العميل *</Label>
                  <Select value={clientData.type} onValueChange={(v) => setClientData(p => ({ ...p, type: v }))}>
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
                  <Button type="button" onClick={handleClientSubmit} className="flex-1 bg-gradient-primary">حفظ العميل</Button>
                  <Button type="button" variant="outline" onClick={() => setIsAddingClient(false)} className="flex-1">رجوع</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Contract Creation */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              إنشاء العقد
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-3">ملخص البيانات:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="font-medium text-muted-foreground">العقار:</span>
                    <p className="font-medium">{selectedProperty?.name || "غير محدد"}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedProperty?.type} - {selectedProperty?.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      وحدات متاحة: {selectedProperty?.availableUnits}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-muted-foreground">العميل:</span>
                    <p className="font-medium">{selectedClient?.name || "غير محدد"}</p>
                    <p className="text-xs text-muted-foreground">{selectedClient?.phone}</p>
                    <p className="text-xs text-muted-foreground">{selectedClient?.email}</p>
                  </div>
                </div>
              </div>

              <UnitSelector
                property={selectedProperty || null}
                selectedUnit={contractData.unitNumber}
                onUnitSelect={(unitNumber) => setContractData(p => ({ ...p, unitNumber }))}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">تاريخ بداية العقد *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={contractData.startDate}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      setContractData(p => {
                        // Auto-calculate end date (one year later)
                        const startDate = new Date(newStartDate);
                        const endDate = new Date(startDate);
                        endDate.setFullYear(startDate.getFullYear() + 1);
                        endDate.setDate(endDate.getDate() - 1); // One day before to make it exactly one year
                        
                        return { 
                          ...p, 
                          startDate: newStartDate,
                          endDate: endDate.toISOString().split('T')[0]
                        };
                      });
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">تاريخ نهاية العقد *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={contractData.endDate}
                    onChange={(e) => setContractData(p => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="monthlyRent">قيمة الإيجار السنوي *</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={contractData.monthlyRent}
                  onChange={(e) => setContractData(p => ({ ...p, monthlyRent: e.target.value }))}
                  placeholder="120000"
                />
              </div>

              <div>
                <Label htmlFor="paymentSchedule">جدولة الدفع *</Label>
                <Select value={contractData.paymentSchedule} onValueChange={(value) => setContractData(p => ({ ...p, paymentSchedule: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر جدولة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">شهري</SelectItem>
                    <SelectItem value="quarterly">ربع سنوي</SelectItem>
                    <SelectItem value="semi_annual">نصف سنوي</SelectItem>
                    <SelectItem value="annually">سنوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="paymentMethod">طريقة الدفع *</Label>
                <Select value={contractData.paymentMethod} onValueChange={(value) => setContractData(p => ({ ...p, paymentMethod: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="cheque">شيك</SelectItem>
                    <SelectItem value="bank_transfer">حوالة بنكية</SelectItem>
                    <SelectItem value="card">بطاقة ائتمان</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="paymentType">موعد الدفعة الأولى *</Label>
                <Select value={contractData.paymentType} onValueChange={(value) => setContractData(p => ({ ...p, paymentType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر موعد الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">دفع الآن (سيتم تأكيد الدفعة الأولى وإضافتها للإيرادات)</SelectItem>
                    <SelectItem value="later">دفع لاحقاً (جميع الدفعات ستكون مجدولة)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* أرقام الشيكات */}
              {contractData.paymentMethod === 'cheque' && contractData.paymentSchedule && contractData.startDate && contractData.endDate && (
                <div className="space-y-4">
                  <Label>أرقام الشيكات *</Label>
                  <div className="space-y-3">
                    {(() => {
                      // Calculate payment dates
                      const startDate = new Date(contractData.startDate);
                      const endDate = new Date(contractData.endDate);
                      const dates = [];
                      let currentDate = new Date(startDate);
                      
                      let numberOfPayments = 0;
                      switch (contractData.paymentSchedule) {
                        case 'monthly':
                          const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                        (endDate.getMonth() - startDate.getMonth());
                          numberOfPayments = Math.floor(months) + 1;
                          if (months >= 11 && months <= 12) numberOfPayments = 12;
                          break;
                        case 'quarterly':
                          numberOfPayments = 4;
                          break;
                        case 'semi_annual':
                          numberOfPayments = 2;
                          break;
                        case 'annually':
                          numberOfPayments = 1;
                          break;
                      }

                      for (let i = 0; i < numberOfPayments; i++) {
                        dates.push(currentDate.toISOString().split('T')[0]);
                        
                        switch (contractData.paymentSchedule) {
                          case 'monthly':
                            currentDate.setMonth(currentDate.getMonth() + 1);
                            break;
                          case 'quarterly':
                            currentDate.setMonth(currentDate.getMonth() + 3);
                            break;
                          case 'semi_annual':
                            currentDate.setMonth(currentDate.getMonth() + 6);
                            break;
                          case 'annually':
                            currentDate.setFullYear(currentDate.getFullYear() + 1);
                            break;
                        }
                      }

                      const checkNumbers = contractData.checkNumbers ? contractData.checkNumbers.split(',') : [];
                      
                      return dates.map((date, index) => (
                        <div key={index} className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`checkDate${index}`}>التاريخ {index + 1}</Label>
                            <Input
                              id={`checkDate${index}`}
                              type="date"
                              value={date}
                              onChange={(e) => {
                                const newDates = [...dates];
                                newDates[index] = e.target.value;
                                setContractData(p => ({ ...p, paymentDates: newDates.join(', ') }));
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`checkNumber${index}`}>رقم الشيك {index + 1}</Label>
                            <Input
                              id={`checkNumber${index}`}
                              value={checkNumbers[index] || ''}
                              onChange={(e) => {
                                const newCheckNumbers = [...checkNumbers];
                                newCheckNumbers[index] = e.target.value;
                                while (newCheckNumbers.length < dates.length) {
                                  newCheckNumbers.push('');
                                }
                                setContractData(p => ({ ...p, checkNumbers: newCheckNumbers.join(',') }));
                              }}
                              placeholder={`رقم الشيك ${index + 1}`}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleContractSubmit} className="flex-1 bg-gradient-primary">
                  إنشاء العقد
                </Button>
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                  السابق <ArrowRight className="h-4 w-4 mr-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}