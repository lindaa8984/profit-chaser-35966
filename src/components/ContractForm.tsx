import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Plus, Calendar, CalendarIcon, Upload, X, ChevronsUpDown, Check } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { UnitSelector } from "./UnitSelector";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn, formatDateDDMMYYYY, parseDateDDMMYYYY } from "@/lib/utils";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;

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
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [shops, setShops] = useState<any[]>([]);
    const [groundHouses, setGroundHouses] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        propertyType: "unit", // unit, shop, ground_house
        propertyId: "",
        shopId: "",
        groundHouseId: "",
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
        paymentAmounts: "", // مبالغ الدفعات
        checkNumbers: "", // أرقام الشيكات
        bankName: "", // اسم البنك للشيكات
        paymentType: "" // "now" or "later"
    });

    // جلب المحلات والبيوت الأرضية
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                // جلب المحلات التجارية من جدول units مع معلومات العقار
                const { data: shopsData } = await supabase
                    .from('units')
                    .select(`
                        *,
                        properties (
                            id,
                            name
                        )
                    `)
                    .eq('user_id', user.id)
                    .eq('unit_type', 'commercial')
                    .eq('is_available', true);
                
                setShops(shopsData || []);

                // جلب البيوت الأرضية من جدول units (جميع البيوت)
                const { data: housesData } = await supabase
                    .from('units')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('unit_type', 'ground_house')
                    .order('unit_number', { ascending: true });
                
                setGroundHouses(housesData || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [user]);

    useEffect(() => {
        if (contract && isEdit) {
            setFormData({
                propertyType: contract.propertyType || "unit",
                propertyId: contract.propertyId?.toString() || "",
                shopId: contract.shopId || "",
                groundHouseId: contract.groundHouseId || "",
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
                paymentAmounts: contract.paymentAmounts || "",
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
                propertyType: "unit",
                propertyId: prefilledData.propertyId.toString(),
                unitNumber: prefilledData.unitNumber
            }));
            setOpen(true);
        }
    }, [prefilledData]);

    const availableProperties = properties.filter(property => property.availableUnits > 0);
    const selectedProperty = properties.find(p => p.id === parseInt(formData.propertyId));

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // التحقق من نوع الملف
        if (file.type !== 'application/pdf') {
            toast({ title: "خطأ", description: "يرجى رفع ملف PDF فقط", variant: "destructive" });
            return;
        }

        // التحقق من حجم الملف (10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast({ title: "خطأ", description: "حجم الملف يجب أن يكون أقل من 10MB", variant: "destructive" });
            return;
        }

        setContractFile(file);
    };

    const uploadContractFile = async (contractId: string): Promise<string | null> => {
        if (!contractFile || !user) return null;

        try {
            setUploading(true);
            
            // إنشاء اسم فريد للملف
            const fileExt = contractFile.name.split('.').pop();
            const fileName = `${user.id}/${contractId}_${Date.now()}.${fileExt}`;

            // رفع الملف
            const { error: uploadError, data } = await supabase.storage
                .from('contracts')
                .upload(fileName, contractFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            return data.path;
        } catch (error) {
            console.error('Error uploading file:', error);
            toast({ title: "خطأ", description: "فشل رفع ملف العقد", variant: "destructive" });
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // التحقق من الحقول المطلوبة بناءً على نوع العقار
        const hasRequiredPropertyFields = 
            (formData.propertyType === 'unit' && formData.propertyId && formData.unitNumber) ||
            (formData.propertyType === 'shop' && formData.shopId) ||
            (formData.propertyType === 'ground_house' && formData.groundHouseId);

        if (!hasRequiredPropertyFields || !formData.clientId || !formData.startDate || !formData.endDate || !formData.monthlyRent || !formData.paymentMethod || !formData.paymentSchedule) {
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

        // التحقق من مجموع الدفعات - يجب أن يساوي قيمة العقد في جميع الحالات
        if (formData.paymentAmounts) {
            const amounts = formData.paymentAmounts.split(', ').map(a => parseFloat(a));
            const totalPayments = amounts.reduce((sum, amount) => sum + amount, 0);
            const yearlyRent = parseFloat(formData.monthlyRent);
            
            if (Math.abs(totalPayments - yearlyRent) > 0.01) {
                toast({
                    title: "خطأ في التقسيم",
                    description: `مجموع الدفعات (${totalPayments.toLocaleString()}) لا يتطابق مع مبلغ الإيجار الكلي (${yearlyRent.toLocaleString()}). يجب أن يكون المجموع مساوياً تماماً لقيمة العقد.`,
                    variant: "destructive"
                });
                return;
            }
        }

        const contractData: any = {
            propertyType: formData.propertyType,
            clientId: parseInt(formData.clientId),
            startDate: formData.startDate,
            endDate: formData.endDate,
            monthlyRent: parseFloat(formData.monthlyRent), // هذا سيكون الإيجار السنوي
            currency: currency,
            paymentSchedule: formData.paymentSchedule,
            paymentMethod: formData.paymentMethod,
            numberOfPayments: formData.numberOfPayments,
            checkDates: formData.checkDates,
            paymentDates: formData.paymentDates,
            paymentAmounts: formData.paymentAmounts, // ✅ إضافة المبالغ المخصصة
            checkNumbers: formData.checkNumbers,
            bankName: formData.bankName
        };

        // إضافة البيانات حسب نوع العقار
        if (formData.propertyType === 'unit') {
            contractData.propertyId = parseInt(formData.propertyId);
            contractData.unitNumber = formData.unitNumber;
        } else if (formData.propertyType === 'shop') {
            contractData.shopId = formData.shopId;
        } else if (formData.propertyType === 'ground_house') {
            contractData.groundHouseId = formData.groundHouseId;
        }

        if (isEdit && contract) {
            await updateContract(contract.id, contractData);
            await new Promise(resolve => setTimeout(resolve, 500)); // انتظار لتحديث البيانات
            toast({
                title: "تم بنجاح",
                description: "تم تحديث العقد بنجاح"
            });
        } else {
            // التحقق من صحة البيانات بناءً على نوع العقار قبل المتابعة
            if (formData.propertyType === 'unit') {
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
            }
            
            // تأخير قصير لمنع الضغط المزدوج السريع
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // دع addContract يولد الID وأرجعه - فقط بعد نجاح الحجز
            const contractUuid = await addContract(contractData);
            
            if (!contractUuid) {
                // Rollback unit reservation if contract creation failed (فقط للوحدات)
                if (formData.propertyType === 'unit') {
                    releaseUnit(parseInt(formData.propertyId), formData.unitNumber);
                }
                return;
            }

            // رفع ملف العقد إذا وُجد
            let uploadedFilePath: string | null = null;
            if (contractFile) {
                uploadedFilePath = await uploadContractFile(contractUuid);
                if (uploadedFilePath) {
                    // Wait a moment for the contract to be fully created, then update with file path
                    setTimeout(async () => {
                        // Find the integer ID for the newly created contract
                        const { data: contractsData } = await supabase
                            .from('contracts')
                            .select('id')
                            .eq('id', contractUuid)
                            .single();
                        
                        if (contractsData) {
                            const contractIntId = parseInt(contractsData.id.slice(0, 8), 16);
                            await updateContract(contractIntId, { contractFileUrl: uploadedFilePath });
                        }
                    }, 1000);
                }
            }

            // إنشاء الدفعات بناءً على الجدولة
            const paymentDates = formData.paymentDates.split(', ');
            const checkNumbers = formData.checkNumbers ? formData.checkNumbers.split(', ') : [];
            
            // حساب قيمة الدفعة بناءً على الإيجار السنوي وعدد الدفعات
            const yearlyRent = contractData.monthlyRent; // الآن هذا الإيجار السنوي
            const numberOfPayments = parseInt(formData.paymentSchedule);
            
            // استخدام المبالغ المخصصة إذا كانت موجودة، وإلا احسبها بالتساوي
            const paymentAmounts = formData.paymentAmounts ? formData.paymentAmounts.split(', ').map(a => parseFloat(a)) : [];
            const useCustomAmounts = paymentAmounts.length === paymentDates.length && paymentAmounts.every(a => !isNaN(a));
            
            const defaultPaymentAmount = yearlyRent / numberOfPayments;

            for (let index = 0; index < paymentDates.length; index++) {
                const date = paymentDates[index];
                const isFirstPayment = index === 0;
                const shouldPayNow = formData.paymentType === 'now' && isFirstPayment;
                const dueDate = new Date(date);
                const today = new Date();
                const daysDifference = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                // تحديد حالة الدفعة - جميع الدفعات غير المدفوعة تكون متاحة للتأكيم
                let status: 'paid' | 'pending' | 'scheduled' | 'overdue' = 'pending';
                
                if (shouldPayNow) {
                    status = 'paid'; // الدفعة الأولى مدفوعة
                }
                
                // إنشاء رقم الشيك إذا كانت طريقة الدفع شيك وتوفر أرقام الشيكات
                let checkNumber = undefined;
                if (contractData.paymentMethod === 'cheque' && checkNumbers.length > 0) {
                    checkNumber = checkNumbers[index];
                }
                
                // استخدام المبلغ المخصص أو المبلغ الافتراضي
                const paymentAmount = useCustomAmounts ? paymentAmounts[index] : defaultPaymentAmount;
                
                await addPayment({
                    contractId: contractUuid,
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
            propertyType: "unit",
            propertyId: "",
            shopId: "",
            groundHouseId: "",
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
            paymentAmounts: "",
            checkNumbers: "",
            bankName: "",
            paymentType: ""
        });
        setContractFile(null);
        
        setOpen(false);
        if (onClose) onClose();
    };

    const calculatePaymentDates = () => {
        if (!formData.startDate || !formData.paymentSchedule || !formData.endDate) return;

        // ✅ التحقق من صحة التواريخ لتجنب التجميد عند الكتابة اليدوية
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(formData.startDate) || !dateRegex.test(formData.endDate)) return;

        // لا تُعيد التوليد في وضع التعديل إذا كان لدى العقد تواريخ دفعات محفوظة بعدد يطابق الاختيار الحالي
        const desiredCount = parseInt(formData.paymentSchedule);
        if (isEdit && formData.paymentDates?.trim()) {
            const existingDates = formData.paymentDates.split(',').map(d => d.trim()).filter(Boolean);
            if (existingDates.length === desiredCount) {
                // احترام التوزيعات اليدوية المحفوظة وعدم استبدالها تلقائياً
                return;
            }
        }

        const startDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);

        // ✅ التحقق من أن القيم ليست NaN قبل الحساب
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

        const dates: string[] = [];
        let currentDate = new Date(startDate);

        // عدد الدفعات من الاختيار مباشرة
        const numberOfPayments = desiredCount;
        if (!numberOfPayments || numberOfPayments < 1 || numberOfPayments > 12) return;

        // حساب الفترة بين كل دفعة بالأيام
        const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysBetweenPayments = Math.floor(totalDays / numberOfPayments);

        // توليد تواريخ الدفعات
        for (let i = 0; i < numberOfPayments; i++) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + daysBetweenPayments);
        }

        // حساب المبالغ المتساوية (يُستخدم كبداية فقط عند تغيير العدد)
        const yearlyRent = parseFloat(formData.monthlyRent) || 0;
        const paymentAmount = (yearlyRent / numberOfPayments).toFixed(2);
        const amounts = Array(numberOfPayments).fill(paymentAmount);

        setFormData(prev => ({
            ...prev,
            numberOfPayments: numberOfPayments.toString(),
            paymentDates: dates.join(', '),
            // في وضع التعديل: لا نُجبر المبالغ إذا كان للمستخدم مبالغ محفوظة بنفس الطول
            paymentAmounts: (isEdit && prev.paymentAmounts?.split(',').filter(Boolean).length === numberOfPayments)
                ? prev.paymentAmounts
                : amounts.join(', ')
        }));
    };

    useEffect(() => {
        calculatePaymentDates();
    }, [formData.startDate, formData.endDate, formData.paymentSchedule, formData.monthlyRent]);
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
                <DialogContent className="sm:max-w-[600px] max-h-[84vh] overflow-y-auto top-[8vh] translate-y-0">
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
                    shops={shops}
                    groundHouses={groundHouses}
                    clients={clients}
                    currencySymbols={currencySymbols}
                    currency={currency}
                    isEdit={isEdit}
                    contractFile={contractFile}
                    onFileSelect={handleFileSelect}
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
            <DialogContent className="sm:max-w-[600px] max-h-[84vh] overflow-y-auto top-[8vh] translate-y-0">
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
                    shops={shops}
                    groundHouses={groundHouses}
                    clients={clients}
                    currencySymbols={currencySymbols}
                    currency={currency}
                    isEdit={false}
                    contractFile={contractFile}
                    onFileSelect={handleFileSelect}
                    onCancel={() => {
                        setOpen(false);
                        // تنظيف البيانات عند الإلغاء
                        setFormData({
                            propertyType: "unit",
                            propertyId: "",
                            shopId: "",
                            groundHouseId: "",
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
                            paymentAmounts: "",
                            checkNumbers: "",
                            bankName: "",
                            paymentType: ""
                        });
                        setContractFile(null);
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
    shops,
    groundHouses,
    clients, 
    currencySymbols, 
    currency, 
    isEdit,
    onCancel,
    contractFile,
    onFileSelect
}: any) {
    const [openProperty, setOpenProperty] = useState(false);
    const [openShop, setOpenShop] = useState(false);
    const [openGroundHouse, setOpenGroundHouse] = useState(false);
    const [openClient, setOpenClient] = useState(false);
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* نوع العقار */}
            <div>
                <Label htmlFor="propertyType">نوع العقار *</Label>
                <select
                    id="propertyType"
                    value={formData.propertyType}
                    onChange={(e) => {
                        setFormData((prev: any) => ({
                            ...prev,
                            propertyType: e.target.value,
                            propertyId: "",
                            shopId: "",
                            groundHouseId: "",
                            unitNumber: ""
                        }));
                    }}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    required
                >
                    <option value="unit">وحدة سكنية</option>
                    <option value="shop">محل تجاري</option>
                    <option value="ground_house">بيت أو فلا</option>
                </select>
            </div>

            {/* اختيار العقار حسب النوع */}
            {formData.propertyType === 'unit' && (
                <>
                    <div>
                        <Label htmlFor="propertyId">العقار *</Label>
                <Popover open={openProperty} onOpenChange={setOpenProperty}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openProperty}
                            className="w-full justify-between"
                        >
                            {formData.propertyId
                                ? properties.find((property: any) => property.id.toString() === formData.propertyId)?.name
                                : "اختر العقار"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                        <Command>
                            <CommandInput placeholder="ابحث عن العقار..." />
                            <CommandEmpty>لا توجد نتائج</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                                {properties.map((property: any) => (
                                    <CommandItem
                                        key={property.id}
                                        value={property.name}
                                        onSelect={() => {
                                            setFormData((prev: any) => ({ ...prev, propertyId: property.id.toString() }));
                                            setOpenProperty(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                formData.propertyId === property.id.toString() ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {property.name} {property.availableUnits > 0 ? `- وحدات متاحة: ${property.availableUnits}` : ''}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* رقم الوحدة */}
            <UnitSelector
                property={properties.find(p => p.id === parseInt(formData.propertyId)) || null}
                selectedUnit={formData.unitNumber}
                onUnitSelect={(unitNumber) => setFormData((prev: any) => ({ ...prev, unitNumber }))}
            />
                </>
            )}

            {/* اختيار المحل التجاري */}
            {formData.propertyType === 'shop' && (
                <div>
                    <Label htmlFor="shopId">المحل التجاري *</Label>
                    <Popover open={openShop} onOpenChange={setOpenShop}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openShop}
                                className="w-full justify-between h-auto min-h-[40px]"
                            >
                                {formData.shopId ? (
                                    <div className="flex flex-col items-start text-right w-full">
                                        <span>محل رقم {shops.find((shop: any) => shop.id === formData.shopId)?.unit_number}</span>
                                        {shops.find((shop: any) => shop.id === formData.shopId)?.property_id && (
                                            <span className="text-xs text-muted-foreground">
                                                العقار: {shops.find((shop: any) => shop.id === formData.shopId)?.properties?.name}
                                            </span>
                                        )}
                                        {!shops.find((shop: any) => shop.id === formData.shopId)?.property_id && shops.find((shop: any) => shop.id === formData.shopId)?.location && (
                                            <span className="text-xs text-muted-foreground">
                                                الموقع: {shops.find((shop: any) => shop.id === formData.shopId)?.location}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    "اختر المحل"
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                            <Command>
                                <CommandInput placeholder="ابحث عن المحل..." />
                                <CommandEmpty>لا توجد نتائج</CommandEmpty>
                                <CommandGroup className="max-h-64 overflow-auto">
                                    {shops.map((shop: any) => {
                                        const searchValue = shop.property_id && shop.properties 
                                            ? `${shop.unit_number} ${shop.properties.name} ${shop.properties.location || ''}`
                                            : `${shop.unit_number} ${shop.location || 'محل منفرد'}`;
                                        
                                        return (
                                            <CommandItem
                                                key={shop.id}
                                                value={searchValue}
                                                onSelect={() => {
                                                    setFormData((prev: any) => ({ ...prev, shopId: shop.id }));
                                                    setOpenShop(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        formData.shopId === shop.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <div className="flex flex-col">
                                                    <span>محل رقم {shop.unit_number}</span>
                                                    {shop.property_id && shop.properties && (
                                                        <span className="text-xs text-muted-foreground">
                                                            العقار: {shop.properties.name}
                                                            {shop.properties.location && ` - ${shop.properties.location}`}
                                                        </span>
                                                    )}
                                                    {!shop.property_id && shop.location && (
                                                        <span className="text-xs text-muted-foreground">
                                                            الموقع: {shop.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            )}

            {/* اختيار البيت أو الفلا */}
            {formData.propertyType === 'ground_house' && (
                <div>
                    <Label htmlFor="groundHouseId">بيت أو فلا *</Label>
                    <Popover open={openGroundHouse} onOpenChange={setOpenGroundHouse}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openGroundHouse}
                                className="w-full justify-between h-auto min-h-[40px]"
                            >
                                {formData.groundHouseId ? (
                                    <div className="flex flex-col items-start text-right w-full">
                                        <span>{groundHouses.find((house: any) => house.id === formData.groundHouseId)?.house_type || 'بيت'} رقم {groundHouses.find((house: any) => house.id === formData.groundHouseId)?.unit_number}</span>
                                        {groundHouses.find((house: any) => house.id === formData.groundHouseId)?.location && (
                                            <span className="text-xs text-muted-foreground">
                                                {groundHouses.find((house: any) => house.id === formData.groundHouseId)?.location}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    "اختر البيت أو الفلا"
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                            <Command>
                                <CommandInput placeholder="ابحث عن البيت..." />
                                <CommandEmpty>لا توجد بيوت مضافة</CommandEmpty>
                                <CommandGroup className="max-h-64 overflow-auto">
                                    {groundHouses.map((house: any) => {
                                        const isAvailable = house.is_available;
                                        return (
                                            <CommandItem
                                                key={house.id}
                                                value={`${house.house_type || 'بيت'} ${house.unit_number} ${house.location || ''}`}
                                                disabled={!isAvailable}
                                                onSelect={() => {
                                                    if (isAvailable) {
                                                        setFormData((prev: any) => ({ ...prev, groundHouseId: house.id }));
                                                        setOpenGroundHouse(false);
                                                    }
                                                }}
                                                className={!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        formData.groundHouseId === house.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <div className="flex flex-col flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span>{house.house_type || 'بيت'} رقم {house.unit_number}</span>
                                                        <span className={cn(
                                                            "text-xs px-2 py-0.5 rounded-full",
                                                            isAvailable 
                                                                ? "bg-success/10 text-success" 
                                                                : "bg-destructive/10 text-destructive"
                                                        )}>
                                                            {isAvailable ? 'متاح' : 'مشغول'}
                                                        </span>
                                                    </div>
                                                    {house.location && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {house.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            )}

            {/* العميل */}
            <div>
                <Label htmlFor="clientId">العميل *</Label>
                <Popover open={openClient} onOpenChange={setOpenClient}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openClient}
                            className="w-full justify-between"
                        >
                            {formData.clientId
                                ? clients.find((client: any) => client.id.toString() === formData.clientId)?.name
                                : "اختر العميل"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                        <Command>
                            <CommandInput placeholder="ابحث عن العميل..." />
                            <CommandEmpty>لا توجد نتائج</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                                {clients.map((client: any) => (
                                    <CommandItem
                                        key={client.id}
                                        value={`${client.name} ${client.phone}`}
                                        onSelect={() => {
                                            setFormData((prev: any) => ({ ...prev, clientId: client.id.toString() }));
                                            setOpenClient(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                formData.clientId === client.id.toString() ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {client.name} - {client.phone}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* تواريخ العقد */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>تاريخ بداية العقد *</Label>
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            placeholder="DD-MM-YYYY أو DD/MM/YYYY"
                            value={formData.startDate ? (formData.startDate.match(/^\d{4}-\d{2}-\d{2}$/) ? formatDateDDMMYYYY(formData.startDate) : formData.startDate) : ''}
                            onChange={(e) => {
                                // السماح بالكتابة الحرة - لا تحويل أثناء الكتابة
                                setFormData((prev: any) => ({ ...prev, startDate: e.target.value }));
                            }}
                            onBlur={(e) => {
                                // بعد الانتهاء من الكتابة، تحويل التاريخ
                                const value = e.target.value.trim();
                                if (!value) return;
                                
                                const parsedDate = parseDateDDMMYYYY(value);
                                
                                // التحقق من صحة التاريخ المحول
                                if (parsedDate && parsedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                    const startDate = new Date(parsedDate);
                                    if (!isNaN(startDate.getTime())) {
                                        // تحديث تاريخ البداية
                                        setFormData((prev: any) => ({ ...prev, startDate: parsedDate }));
                                        
                                        // تحديث تاريخ النهاية تلقائيًا بعد سنة
                                        const newEndDate = new Date(startDate);
                                        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
                                        setFormData((prev: any) => ({ 
                                            ...prev, 
                                            endDate: format(newEndDate, "yyyy-MM-dd")
                                        }));
                                    }
                                }
                            }}
                            className="flex-1"
                            dir="ltr"
                            style={{ direction: 'ltr', textAlign: 'left' }}
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                >
                                    <CalendarIcon className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                    mode="single"
                                    selected={formData.startDate ? new Date(formData.startDate) : undefined}
                                    onSelect={(date) => {
                                        if (date) {
                                            const startDate = format(date, "yyyy-MM-dd");
                                            const newEndDate = new Date(date);
                                            newEndDate.setFullYear(newEndDate.getFullYear() + 1);
                                            const endDateString = format(newEndDate, "yyyy-MM-dd");
                                            
                                            setFormData((prev: any) => ({ 
                                                ...prev, 
                                                startDate,
                                                endDate: endDateString
                                            }));
                                        }
                                    }}
                                    initialFocus
                                    className="pointer-events-auto"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div>
                    <Label>تاريخ نهاية العقد *</Label>
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            placeholder="DD-MM-YYYY أو DD/MM/YYYY"
                            value={formData.endDate ? (formData.endDate.match(/^\d{4}-\d{2}-\d{2}$/) ? formatDateDDMMYYYY(formData.endDate) : formData.endDate) : ''}
                            onChange={(e) => {
                                // السماح بالكتابة الحرة - لا تحويل أثناء الكتابة
                                setFormData((prev: any) => ({ ...prev, endDate: e.target.value }));
                            }}
                            onBlur={(e) => {
                                // بعد الانتهاء من الكتابة، تحويل التاريخ
                                const value = e.target.value.trim();
                                if (!value) return;
                                
                                const parsedDate = parseDateDDMMYYYY(value);
                                
                                // التحقق من صحة التاريخ المحول
                                if (parsedDate && parsedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                    const endDate = new Date(parsedDate);
                                    if (!isNaN(endDate.getTime())) {
                                        setFormData((prev: any) => ({ ...prev, endDate: parsedDate }));
                                    }
                                }
                            }}
                            className="flex-1"
                            dir="ltr"
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                >
                                    <CalendarIcon className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                    mode="single"
                                    selected={formData.endDate ? new Date(formData.endDate) : undefined}
                                    onSelect={(date) => {
                                        if (date) {
                                            setFormData((prev: any) => ({ 
                                                ...prev, 
                                                endDate: format(date, "yyyy-MM-dd")
                                            }));
                                        }
                                    }}
                                    initialFocus
                                    className="pointer-events-auto"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
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
                                (parseFloat(formData.monthlyRent) / parseInt(formData.paymentSchedule)).toFixed(2)
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
                        <SelectItem value="1">1 - دفعة</SelectItem>
                        <SelectItem value="2">2 - دفعتين</SelectItem>
                        <SelectItem value="3">3 - دفعات</SelectItem>
                        <SelectItem value="4">4 - دفعات</SelectItem>
                        <SelectItem value="5">5 - دفعات</SelectItem>
                        <SelectItem value="6">6 - دفعات</SelectItem>
                        <SelectItem value="7">7 - دفعات</SelectItem>
                        <SelectItem value="8">8 - دفعات</SelectItem>
                        <SelectItem value="9">9 - دفعات</SelectItem>
                        <SelectItem value="10">10 - دفعات</SelectItem>
                        <SelectItem value="11">11 - دفعة</SelectItem>
                        <SelectItem value="12">12 - دفعة</SelectItem>
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

            {/* جدول الدفعات للتعديل - لجميع طرق الدفع */}
            {formData.paymentDates && formData.paymentMethod && (
                <div className="space-y-3">
                    <Label>تفاصيل الدفعات (يمكن التعديل)</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                        {formData.paymentDates.split(', ').map((date, index) => {
                            const amounts = formData.paymentAmounts ? formData.paymentAmounts.split(', ') : [];
                            const checkNumbers = formData.checkNumbers ? formData.checkNumbers.split(', ') : [];
                            
                            return (
                                <div key={index} className={`grid ${formData.paymentMethod === 'cheque' ? 'grid-cols-3' : 'grid-cols-2'} gap-3 p-3 bg-muted/50 rounded-md`}>
                                    <div>
                                        <Label className="text-xs">التاريخ {index + 1}</Label>
                                        <div className="flex gap-1">
                                             <Input
                                                type="text"
                                                placeholder="DD-MM-YYYY أو DD/MM/YYYY"
                                                value={date ? (date.match(/^\d{4}-\d{2}-\d{2}$/) ? formatDateDDMMYYYY(date) : date) : ''}
                                                onChange={(e) => {
                                                    // السماح بالكتابة الحرة
                                                    const paymentDates = formData.paymentDates.split(', ');
                                                    paymentDates[index] = e.target.value;
                                                    setFormData((prev: any) => ({ 
                                                        ...prev, 
                                                        paymentDates: paymentDates.join(', ')
                                                    }));
                                                }}
                                                onBlur={(e) => {
                                                    // بعد الانتهاء، تحويل التاريخ
                                                    const value = e.target.value.trim();
                                                    if (!value) return;
                                                    
                                                    const parsedDate = parseDateDDMMYYYY(value);
                                                    if (parsedDate && parsedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                                        const paymentDates = formData.paymentDates.split(', ');
                                                        paymentDates[index] = parsedDate;
                                                        setFormData((prev: any) => ({ 
                                                            ...prev, 
                                                            paymentDates: paymentDates.join(', ')
                                                        }));
                                                    }
                                                }}
                                                className="h-9 text-xs flex-1"
                                                dir="ltr"
                                            />
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-9 w-9 p-0 shrink-0"
                                                    >
                                                        <CalendarIcon className="h-3 w-3" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <CalendarComponent
                                                        mode="single"
                                                        selected={date ? new Date(date) : undefined}
                                                        onSelect={(selectedDate) => {
                                                            if (selectedDate) {
                                                                const paymentDates = formData.paymentDates.split(', ');
                                                                paymentDates[index] = format(selectedDate, "yyyy-MM-dd");
                                                                setFormData((prev: any) => ({ 
                                                                    ...prev, 
                                                                    paymentDates: paymentDates.join(', ')
                                                                }));
                                                            }
                                                        }}
                                                        initialFocus
                                                        className="pointer-events-auto"
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs">المبلغ {index + 1}</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="h-9 text-sm"
                                            placeholder="المبلغ"
                                            value={amounts[index] || ''}
                                            onChange={(e) => {
                                                const newAmounts = [...amounts];
                                                newAmounts[index] = e.target.value;
                                                setFormData((prev: any) => ({ 
                                                    ...prev, 
                                                    paymentAmounts: newAmounts.join(', ')
                                                }));
                                            }}
                                        />
                                    </div>
                                    {formData.paymentMethod === 'cheque' && (
                                        <div>
                                            <Label className="text-xs">رقم الشيك {index + 1}</Label>
                                            <Input
                                                className="h-9 text-sm"
                                                placeholder="رقم الشيك"
                                                value={checkNumbers[index] || ''}
                                                onChange={(e) => {
                                                    const newCheckNumbers = [...checkNumbers];
                                                    newCheckNumbers[index] = e.target.value;
                                                    setFormData((prev: any) => ({ 
                                                        ...prev, 
                                                        checkNumbers: newCheckNumbers.join(', ')
                                                    }));
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* خيار الدفع الفوري للعقود الجديدة فقط */}
            {!isEdit && (
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
            {/* تم نقل هذا القسم إلى جدول الدفعات أعلاه */}

            {/* رفع ملف العقد (للعقود الجديدة فقط) */}
            {!isEdit && (
                <div>
                    <Label htmlFor="contract-upload" className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        إرفاق ملف العقد (اختياري)
                    </Label>
                    <div className="mt-2">
                        {!contractFile ? (
                            <label 
                                htmlFor="contract-upload" 
                                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors cursor-pointer"
                            >
                                <Upload className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    اضغط لرفع ملف PDF
                                </span>
                            </label>
                        ) : (
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Upload className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">{contractFile.name}</span>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onFileSelect({ target: { files: null } })}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <Input
                            id="contract-upload"
                            type="file"
                            accept="application/pdf"
                            onChange={onFileSelect}
                            className="hidden"
                        />
                        <p className="text-xs text-muted-foreground mt-1">PDF فقط، حد أقصى 10MB</p>
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
