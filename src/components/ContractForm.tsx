import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, Calendar } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { toast } from "@/hooks/use-toast";
import { UnitSelector } from "./UnitSelector";

interface ContractFormProps {
    contract?: any;
    isEdit?: boolean;
    onClose?: () => void;
    prefilledData?: {
        propertyId: number;
        unitNumber: string;
        propertyName: string;
    } | null;
}

export function ContractForm({ contract = null, isEdit = false, onClose, prefilledData = null }: ContractFormProps) {
    const { properties, clients, addContract, updateContract, currency, updateProperty, addPayment, reserveUnit, releaseUnit } = useApp();
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        propertyId: "",
        clientId: "",
        unitNumber: "",
        startDate: "",
        endDate: "",
        monthlyRent: "", // هذا سيكون الإيجار السنوي الآن
        paymentMethod: "",
        paymentSchedule: "",
        numberOfPayments: "",
        checkDates: "",
        paymentDates: "",
        checkNumbers: "", // أرقام الشيكات
        bankName: "", // اسم البنك للشيكات
        paymentType: "" // "now" or "later"
    });

    useEffect(() => {
        if (contract && isEdit) {
            setFormData({
                propertyId: contract.propertyId.toString(),
                clientId: contract.clientId.toString(),
                unitNumber: contract.unitNumber || "",
                startDate: contract.startDate,
                endDate: contract.endDate,
                monthlyRent: contract.monthlyRent.toString(),
                paymentMethod: contract.paymentMethod,
                paymentSchedule: contract.paymentSchedule,
                numberOfPayments: contract.numberOfPayments || "",
                checkDates: contract.checkDates || "",
                paymentDates: contract.paymentDates || "",
                checkNumbers: contract.checkNumbers || "",
                bankName: contract.bankName || "",
                paymentType: "later" // Default for editing
            });
            setOpen(true);
        }
    }, [contract, isEdit]);

    // التعامل مع البيانات المُمررة من إدارة الوحدات
    useEffect(() => {
        if (prefilledData) {
            setFormData(prev => ({
                ...prev,
                propertyId: prefilledData.propertyId.toString(),
                unitNumber: prefilledData.unitNumber
            }));
            setOpen(true);
        }
    }, [prefilledData]);

    const availableProperties = properties.filter(property => property.availableUnits > 0);
    const selectedProperty = properties.find(p => p.id === parseInt(formData.propertyId));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.propertyId || !formData.clientId || !formData.startDate || !formData.endDate || !formData.monthlyRent || !formData.paymentMethod || !formData.paymentSchedule) {
            toast({
                title: "خطأ",
                description: "يرجى ملء جميع الحقول المطلوبة",
                variant: "destructive"
            });
            return;
        }

        // التحقق من حقل البنك للشيكات
        if (formData.paymentMethod === "cheque" && !formData.bankName) {
            toast({
                title: "خطأ",
                description: "يرجى إدخال اسم البنك للشيكات",
                variant: "destructive"
            });
            return;
        }

        if (!isEdit && !formData.paymentType) {
            toast({
                title: "خطأ",
                description: "يرجى اختيار موعد الدفع",
                variant: "destructive"
            });
            return;
        }

        const startDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);

        if (endDate <= startDate) {
            toast({
                title: "خطأ",
                description: "تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية",
                variant: "destructive"
            });
            return;
        }

        const contractData = {
            propertyId: parseInt(formData.propertyId),
            clientId: parseInt(formData.clientId),
            startDate: formData.startDate,
            endDate: formData.endDate,
            monthlyRent: parseFloat(formData.monthlyRent), // هذا سيكون الإيجار السنوي
            currency: currency,
            paymentSchedule: formData.paymentSchedule,
            paymentMethod: formData.paymentMethod,
            unitNumber: formData.unitNumber,
            numberOfPayments: formData.numberOfPayments,
            checkDates: formData.checkDates,
            paymentDates: formData.paymentDates,
            checkNumbers: formData.checkNumbers,
            bankName: formData.bankName
        };

        if (isEdit && contract) {
            updateContract(contract.id, contractData);
            toast({
                title: "تم بنجاح",
                description: "تم تحديث العقد بنجاح"
            });
        } else {
            // التحقق من صحة البيانات قبل المتابعة
            if (!formData.unitNumber) {
                toast({
                    title: "خطأ",
                    description: "يرجى اختيار رقم الوحدة",
                    variant: "destructive"
                });
                return;
            }

            // Reserve the unit first - التحقق من نجاح الحجز قبل المتابعة
            const reservationSuccess = await reserveUnit(parseInt(formData.propertyId), formData.unitNumber, parseInt(formData.clientId));
            if (!reservationSuccess) {
                toast({
                    title: "خطأ",
                    description: "هذه الوحدة مشغولة بالفعل. يرجى اختيار وحدة أخرى.",
                    variant: "destructive"
                });
                return;
            }
            
            // دع addContract يولد الID وأرجعه - فقط بعد نجاح الحجز
            const contractId = await addContract(contractData);
            
            if (!contractId) {
                // Rollback unit reservation if contract creation failed
                releaseUnit(parseInt(formData.propertyId), formData.unitNumber);
                return;
            }

            // إنشاء الدفعات بناءً على الجدولة
            const paymentDates = formData.paymentDates.split(', ');
            const checkNumbers = formData.checkNumbers ? formData.checkNumbers.split(', ') : [];
            
            // حساب قيمة الدفعة بناءً على الإيجار السنوي وجدولة الدفع
            const yearlyRent = contractData.monthlyRent; // الآن هذا الإيجار السنوي
            const paymentAmount = formData.paymentSchedule === 'monthly' ? yearlyRent / 12 :
                                formData.paymentSchedule === 'quarterly' ? yearlyRent / 4 :
                                formData.paymentSchedule === 'semi_annual' ? yearlyRent / 2 :
                                yearlyRent;

            for (let index = 0; index < paymentDates.length; index++) {
                const date = paymentDates[index];
                const isFirstPayment = index === 0;
                const shouldPayNow = formData.paymentType === 'now' && isFirstPayment;
                const dueDate = new Date(date);
                const today = new Date();
                const daysDifference = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                // تحديد حالة الدفعة - جميع الدفعات غير المدفوعة تكون متاحة للتأكيد
                let status: 'paid' | 'pending' | 'scheduled' | 'overdue' = 'pending';
                
                if (shouldPayNow) {
                    status = 'paid'; // الدفعة الأولى مدفوعة
                }
                
                // إنشاء رقم الشيك إذا كانت طريقة الدفع شيك وتوفر أرقام الشيكات
                let checkNumber = undefined;
                if (contractData.paymentMethod === 'cheque' && checkNumbers.length > 0) {
                    checkNumber = checkNumbers[index];
                }
                
                await addPayment({
                    contractId: contractId,
                    amount: paymentAmount,
                    currency: contractData.currency,
                    dueDate: date,
                    paidDate: shouldPayNow ? new Date().toISOString().split('T')[0] : undefined,
                    paymentMethod: contractData.paymentMethod,
                    checkNumber: checkNumber,
                    bankName: contractData.paymentMethod === 'cheque' ? contractData.bankName : undefined,
                    status: status
                });
            }
            
            const paidCount = formData.paymentType === 'now' ? 1 : 0;
            const pendingCount = paymentDates.filter((date, index) => {
                if (index === 0 && formData.paymentType === 'later') return true;
                const dueDate = new Date(date);
                const today = new Date();
                const daysDifference = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return daysDifference <= 5 && daysDifference >= 0 && !(index === 0 && formData.paymentType === 'now');
            }).length;
            const scheduledCount = paymentDates.length - paidCount - pendingCount;
            
            toast({
                title: "تم بنجاح",
                description: formData.paymentType === 'now' 
                    ? `تم إنشاء العقد وتأكيد الدفعة الأولى. مجدول: ${scheduledCount} دفعة، معلق: ${pendingCount} دفعة`
                    : `تم إنشاء العقد. مجدول: ${scheduledCount} دفعة، معلق: ${pendingCount} دفعة`
            });
        }

        setFormData({
            propertyId: "",
            clientId: "",
            unitNumber: "",
            startDate: "",
            endDate: "",
            monthlyRent: "",
            paymentMethod: "",
            paymentSchedule: "",
            numberOfPayments: "",
            checkDates: "",
            paymentDates: "",
            checkNumbers: "",
            bankName: "",
            paymentType: ""
        });
        
        setOpen(false);
        if (onClose) onClose();
    };

    const calculatePaymentDates = () => {
        if (!formData.startDate || !formData.paymentSchedule || !formData.endDate) return;

        const startDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);
        const dates = [];
        let currentDate = new Date(startDate);

        // Calculate number of payments based on schedule and contract duration
        let numberOfPayments = 0;
        
        switch (formData.paymentSchedule) {
            case 'monthly':
                const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                              (endDate.getMonth() - startDate.getMonth());
                numberOfPayments = Math.floor(months) + 1; // +1 for the start month
                // But ensure it's exactly 12 for a full year
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
            default:
                return;
        }

        // Generate payment dates
        for (let i = 0; i < numberOfPayments; i++) {
            dates.push(currentDate.toISOString().split('T')[0]);
            
            switch (formData.paymentSchedule) {
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

        setFormData(prev => ({
            ...prev,
            numberOfPayments: dates.length.toString(),
            paymentDates: dates.join(', ')
        }));
    };

    useEffect(() => {
        calculatePaymentDates();
    }, [formData.startDate, formData.endDate, formData.paymentSchedule]);

    const currencySymbols = {
        SAR: "ر.س",
        USD: "USD",
        EUR: "€",
        AED: "د.إ"
    };

    if (isEdit) {
        return (
            <Dialog open={open} onOpenChange={(openState) => {
                setOpen(openState);
                if (!openState && onClose) onClose();
            }}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>تعديل العقد</DialogTitle>
                        <DialogDescription>
                            قم بتعديل تفاصيل العقد والحفظ عند الانتهاء
                        </DialogDescription>
                    </DialogHeader>
                    <FormContent 
                        formData={formData}
                        setFormData={setFormData}
                        handleSubmit={handleSubmit}
                        availableProperties={properties}
                        properties={properties}
                        clients={clients}
                        currencySymbols={currencySymbols}
                        currency={currency}
                        isEdit={isEdit}
                        onCancel={() => {
                            setOpen(false);
                            if (onClose) onClose();
                        }}
                    />
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-primary shadow-elegant">
                    <Plus className="h-4 w-4 mr-2" />
                    إنشاء عقد جديد
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>إنشاء عقد جديد</DialogTitle>
                    <DialogDescription>
                        أدخل تفاصيل العقد الجديد وسيتم حفظه في النظام
                    </DialogDescription>
                </DialogHeader>
                <FormContent 
                    formData={formData}
                    setFormData={setFormData}
                    handleSubmit={handleSubmit}
                    availableProperties={availableProperties}
                    properties={properties}
                    clients={clients}
                    currencySymbols={currencySymbols}
                    currency={currency}
                    isEdit={false}
                    onCancel={() => {
                        setOpen(false);
                        // تنظيف البيانات عند الإلغاء
                        setFormData({
                            propertyId: "",
                            clientId: "",
                            unitNumber: "",
                            startDate: "",
                            endDate: "",
                            monthlyRent: "",
                            paymentMethod: "",
                            paymentSchedule: "",
                            numberOfPayments: "",
                            checkDates: "",
                            paymentDates: "",
                            checkNumbers: "",
                            bankName: "",
                            paymentType: ""
                        });
                        if (onClose) onClose();
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}

function FormContent({ 
    formData, 
    setFormData, 
    handleSubmit, 
    availableProperties, 
    properties,
    clients, 
    currencySymbols, 
    currency, 
    isEdit,
    onCancel 
}: any) {
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* العقار */}
            <div>
                <Label htmlFor="propertyId">العقار *</Label>
                <Select value={formData.propertyId} onValueChange={(value) => setFormData((prev: any) => ({ ...prev, propertyId: value }))}>
                    <SelectTrigger>
                        <SelectValue placeholder="اختر العقار" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableProperties.map((property: any) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                                {property.name} - وحدات متاحة: {property.availableUnits}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* العميل */}
            <div>
                <Label htmlFor="clientId">العميل *</Label>
                <Select value={formData.clientId} onValueChange={(value) => setFormData((prev: any) => ({ ...prev, clientId: value }))}>
                    <SelectTrigger>
                        <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                        {clients.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                                {client.name} - {client.phone}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* رقم الوحدة */}
            <UnitSelector
                property={properties.find(p => p.id === parseInt(formData.propertyId)) || null}
                selectedUnit={formData.unitNumber}
                onUnitSelect={(unitNumber) => setFormData((prev: any) => ({ ...prev, unitNumber }))}
            />

            {/* تواريخ العقد */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="startDate">تاريخ بداية العقد *</Label>
                    <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => {
                            const startDate = e.target.value;
                            const newEndDate = new Date(startDate);
                            newEndDate.setFullYear(newEndDate.getFullYear() + 1);
                            const endDateString = newEndDate.toISOString().split('T')[0];
                            
                            setFormData((prev: any) => ({ 
                                ...prev, 
                                startDate,
                                endDate: endDateString
                            }));
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="endDate">تاريخ نهاية العقد *</Label>
                    <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, endDate: e.target.value }))}
                    />
                </div>
            </div>

            {/* قيمة الإيجار */}
            <div>
                <Label htmlFor="monthlyRent">قيمة الإيجار السنوي *</Label>
                <div className="flex gap-2">
                    <Input
                        id="monthlyRent"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.monthlyRent}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, monthlyRent: e.target.value }))}
                        placeholder="60000"
                        className="flex-1"
                    />
                    <div className="flex items-center px-3 bg-muted rounded-md">
                        <span className="text-sm text-muted-foreground">
                            {currencySymbols[currency as keyof typeof currencySymbols]}
                        </span>
                    </div>
                </div>
                {formData.monthlyRent && formData.paymentSchedule && (
                    <div className="mt-2 p-2 bg-muted/50 rounded-md">
                        <p className="text-sm text-muted-foreground">
                            قيمة الدفعة الواحدة: {
                                formData.paymentSchedule === 'monthly' ? (parseFloat(formData.monthlyRent) / 12).toFixed(2) :
                                formData.paymentSchedule === 'quarterly' ? (parseFloat(formData.monthlyRent) / 4).toFixed(2) :
                                formData.paymentSchedule === 'semi_annual' ? (parseFloat(formData.monthlyRent) / 2).toFixed(2) :
                                formData.monthlyRent
                            } {currencySymbols[currency as keyof typeof currencySymbols]}
                        </p>
                    </div>
                )}
            </div>

            {/* طريقة الدفع */}
            <div>
                <Label htmlFor="paymentMethod">طريقة الدفع *</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => setFormData((prev: any) => ({ ...prev, paymentMethod: value }))}>
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

            {/* اسم البنك للشيكات */}
            {formData.paymentMethod === "cheque" && (
                <div>
                    <Label htmlFor="bankName">اسم البنك *</Label>
                    <Input
                        id="bankName"
                        value={formData.bankName}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, bankName: e.target.value }))}
                        placeholder="مثال: البنك الأهلي السعودي"
                    />
                </div>
            )}

            {/* جدولة الدفع */}
            <div>
                <Label htmlFor="paymentSchedule">جدولة الدفع *</Label>
                <Select value={formData.paymentSchedule} onValueChange={(value) => setFormData((prev: any) => ({ ...prev, paymentSchedule: value }))}>
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

            {/* عدد الدفعات */}
            {formData.numberOfPayments && (
                <div>
                    <Label>عدد الدفعات المتوقعة</Label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{formData.numberOfPayments} دفعة</span>
                    </div>
                </div>
            )}

            {/* تواريخ الشيكات */}
            {formData.paymentMethod === "cheque" && (
                <div>
                    <Label htmlFor="checkDates">تواريخ الشيكات</Label>
                    <Input
                        id="checkDates"
                        value={formData.checkDates}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, checkDates: e.target.value }))}
                        placeholder="2024-01-01, 2024-02-01, 2024-03-01"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        أدخل التواريخ مفصولة بفواصل (مثال: 2024-01-01, 2024-02-01)
                    </p>
                </div>
            )}

            {/* تواريخ الدفعات */}
            {formData.paymentDates && (
                <div>
                    <Label>تواريخ الدفعات المتوقعة</Label>
                    <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">{formData.paymentDates}</p>
                    </div>
                </div>
            )}

            {/* خيار الدفع الفوري للعقود الجديدة فقط */}
            {!isEdit && formData.paymentDates && (
                <div>
                    <Label>موعد الدفع *</Label>
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <input
                                type="radio"
                                id="payNow"
                                name="paymentType"
                                value="now"
                                checked={formData.paymentType === 'now'}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, paymentType: e.target.value }))}
                                className="w-4 h-4"
                            />
                            <Label htmlFor="payNow" className="text-sm font-normal cursor-pointer">
                                دفع الآن (سيتم تأكيد الدفعة الأولى وإضافتها للإيرادات)
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <input
                                type="radio"
                                id="payLater"
                                name="paymentType"
                                value="later"
                                checked={formData.paymentType === 'later'}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, paymentType: e.target.value }))}
                                className="w-4 h-4"
                            />
                            <Label htmlFor="payLater" className="text-sm font-normal cursor-pointer">
                                دفع لاحقاً (جميع الدفعات ستكون معلقة)
                            </Label>
                        </div>
                    </div>
                </div>
            )}

            {/* إدخال أرقام الشيكات إذا كانت طريقة الدفع شيك */}
            {formData.paymentMethod === 'cheque' && formData.paymentDates && (
                <div className="space-y-3">
                    <Label>أرقام الشيكات *</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {formData.paymentDates.split(', ').map((date, index) => (
                            <div key={index} className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor={`checkDate${index}`}>التاريخ {index + 1}</Label>
                                    <Input
                                        id={`checkDate${index}`}
                                        type="date"
                                        value={date}
                                        onChange={(e) => {
                                            const paymentDates = formData.paymentDates.split(', ');
                                            paymentDates[index] = e.target.value;
                                            setFormData((prev: any) => ({ 
                                                ...prev, 
                                                paymentDates: paymentDates.join(', ')
                                            }));
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`checkNumber${index}`}>رقم الشيك {index + 1}</Label>
                                    <Input
                                        id={`checkNumber${index}`}
                                        placeholder={`رقم الشيك ${index + 1}`}
                                        value={formData.checkNumbers.split(', ')[index] || ''}
                                        onChange={(e) => {
                                            const checkNumbers = formData.checkNumbers.split(', ');
                                            checkNumbers[index] = e.target.value;
                                            setFormData((prev: any) => ({ 
                                                ...prev, 
                                                checkNumbers: checkNumbers.join(', ')
                                            }));
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-gradient-primary">
                    {isEdit ? "حفظ التعديلات" : "إنشاء العقد"}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                    إلغاء
                </Button>
            </div>
        </form>
    );
}