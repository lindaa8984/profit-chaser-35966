import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, 
  FileSpreadsheet, 
  AlertTriangle, 
  Brain, 
  CheckCircle, 
  AlertCircle,
  Users,
  Building,
  FileText,
  CreditCard,
  Wrench
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ProcessedItem {
  id: string;
  data: any;
  type: string;
  confidence: number;
  isDuplicate?: boolean;
  duplicateReason?: string;
  validationErrors: string[];
}

interface AnalyzedData {
  properties: ProcessedItem[];
  clients: ProcessedItem[];
  contracts: ProcessedItem[];
  payments: ProcessedItem[];
  maintenance: ProcessedItem[];
  unknown: ProcessedItem[];
}

interface DuplicateCheck {
  properties: Map<string, any>;
  clients: Map<string, any>;
  contracts: Map<string, any>;
}

export function IntelligentImportDialog({ open, onClose }: ImportDialogProps) {
  const { 
    addProperty, 
    addClient, 
    addContract, 
    addPayment, 
    addMaintenanceRequest,
    properties,
    clients,
    contracts
  } = useApp();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<AnalyzedData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // نظام ذكي أكثر تطوراً لتحليل نوع البيانات
  const analyzeDataType = (item: any): { type: string; confidence: number } => {
    const keys = Object.keys(item).map(k => k.toLowerCase());
    const values = Object.values(item).map(v => String(v).toLowerCase());
    
    let scores = {
      properties: 0,
      clients: 0,
      contracts: 0,
      payments: 0,
      maintenance: 0
    };

    // تحليل العقارات - نقاط أعلى للكلمات المحددة
    const propertyKeywords = [
      { words: ['property', 'building', 'عقار', 'مبنى'], weight: 3 },
      { words: ['units', 'وحدات', 'floors', 'أدوار'], weight: 2 },
      { words: ['location', 'موقع', 'address', 'عنوان'], weight: 1 },
      { words: ['residential', 'commercial', 'سكني', 'تجاري'], weight: 2 }
    ];

    // تحليل العملاء
    const clientKeywords = [
      { words: ['client', 'tenant', 'customer', 'عميل', 'مستأجر'], weight: 3 },
      { words: ['phone', 'هاتف', 'mobile', 'جوال'], weight: 2 },
      { words: ['email', 'بريد'], weight: 2 },
      { words: ['id_number', 'رقم_هوية', 'national_id'], weight: 2 },
      { words: ['nationality', 'جنسية'], weight: 1 }
    ];

    // تحليل العقود
    const contractKeywords = [
      { words: ['contract', 'عقد', 'agreement', 'اتفاقية'], weight: 3 },
      { words: ['start_date', 'end_date', 'تاريخ_بداية', 'تاريخ_نهاية'], weight: 2 },
      { words: ['rent', 'rental', 'ايجار', 'إيجار'], weight: 2 },
      { words: ['unit_number', 'رقم_وحدة'], weight: 2 },
      { words: ['duration', 'مدة'], weight: 1 }
    ];

    // تحليل المدفوعات
    const paymentKeywords = [
      { words: ['payment', 'دفعة', 'installment', 'قسط'], weight: 3 },
      { words: ['amount', 'مبلغ', 'value', 'قيمة'], weight: 2 },
      { words: ['due_date', 'تاريخ_استحقاق'], weight: 2 },
      { words: ['paid', 'مدفوع', 'pending', 'معلق'], weight: 1 },
      { words: ['receipt', 'إيصال', 'invoice', 'فاتورة'], weight: 1 }
    ];

    // تحليل الصيانة
    const maintenanceKeywords = [
      { words: ['maintenance', 'صيانة', 'repair', 'إصلاح'], weight: 3 },
      { words: ['issue', 'problem', 'مشكلة', 'عطل'], weight: 2 },
      { words: ['priority', 'أولوية', 'urgent', 'عاجل'], weight: 1 },
      { words: ['description', 'وصف', 'details', 'تفاصيل'], weight: 1 }
    ];

    const keywordSets = {
      properties: propertyKeywords,
      clients: clientKeywords,
      contracts: contractKeywords,
      payments: paymentKeywords,
      maintenance: maintenanceKeywords
    };

    // حساب النقاط لكل نوع
    for (const [type, keywords] of Object.entries(keywordSets)) {
      for (const keywordGroup of keywords) {
        for (const keyword of keywordGroup.words) {
          const keyMatches = keys.filter(key => key.includes(keyword)).length;
          const valueMatches = values.filter(value => value.includes(keyword)).length;
          scores[type as keyof typeof scores] += (keyMatches + valueMatches) * keywordGroup.weight;
        }
      }
    }

    // تحديد النوع الأكثر احتمالاً
    const maxScore = Math.max(...Object.values(scores));
    const bestType = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || 'unknown';
    
    // حساب مستوى الثقة (0-1)
    const totalPossibleScore = Math.max(15, maxScore); // الحد الأدنى 15 نقطة
    const confidence = Math.min(1, maxScore / totalPossibleScore);

    return { type: bestType, confidence };
  };

  // التحقق من التكرارات
  const checkForDuplicates = (item: any, type: string, existingData: DuplicateCheck): { isDuplicate: boolean; reason?: string } => {
    switch (type) {
      case 'properties':
        const propertyKey = `${item.name || item["اسم العقار"] || ""}-${item.location || item["الموقع"] || ""}`.toLowerCase();
        if (existingData.properties.has(propertyKey)) {
          return { isDuplicate: true, reason: "عقار بنفس الاسم والموقع موجود بالفعل" };
        }
        // التحقق من البيانات الموجودة في النظام
        const existingProperty = properties.find(p => 
          p.name.toLowerCase() === (item.name || item["اسم العقار"] || "").toLowerCase() &&
          p.location.toLowerCase() === (item.location || item["الموقع"] || "").toLowerCase()
        );
        if (existingProperty) {
          return { isDuplicate: true, reason: "عقار موجود في النظام بالفعل" };
        }
        existingData.properties.set(propertyKey, item);
        break;

      case 'clients':
        const email = item.email || item["البريد الإلكتروني"] || "";
        const phone = item.phone || item["رقم الهاتف"] || "";
        const idNumber = item.id_number || item["رقم الهوية"] || "";
        
        const clientKey = `${email}-${phone}-${idNumber}`.toLowerCase();
        if (existingData.clients.has(clientKey)) {
          return { isDuplicate: true, reason: "عميل بنفس البيانات موجود في الملف" };
        }
        
        // التحقق من العملاء الموجودين
        const existingClient = clients.find(c => 
          (email && c.email.toLowerCase() === email.toLowerCase()) ||
          (phone && c.phone === phone) ||
          (idNumber && c.idNumber === idNumber)
        );
        if (existingClient) {
          return { isDuplicate: true, reason: "عميل موجود في النظام بالفعل" };
        }
        existingData.clients.set(clientKey, item);
        break;

      case 'contracts':
        const clientName = item.client_name || item["اسم العميل"] || "";
        const propertyName = item.property_name || item["اسم العقار"] || "";
        const unitNumber = item.unit_number || item["رقم الوحدة"] || "";
        
        const contractKey = `${clientName}-${propertyName}-${unitNumber}`.toLowerCase();
        if (existingData.contracts.has(contractKey)) {
          return { isDuplicate: true, reason: "عقد بنفس العميل والعقار ورقم الوحدة موجود في الملف" };
        }
        
        // التحقق من العقود الموجودة (هنا نحتاج لربط الأسماء بالمعرفات)
        existingData.contracts.set(contractKey, item);
        break;
    }
    
    return { isDuplicate: false };
  };

  // التحقق من صحة البيانات
  const validateItem = (item: any, type: string): string[] => {
    const errors: string[] = [];
    
    switch (type) {
      case 'properties':
        if (!item.name && !item["اسم العقار"]) errors.push("اسم العقار مطلوب");
        if (!item.location && !item["الموقع"]) errors.push("موقع العقار مطلوب");
        break;
        
      case 'clients':
        if (!item.name && !item["اسم العميل"]) errors.push("اسم العميل مطلوب");
        const email = item.email || item["البريد الإلكتروني"];
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push("البريد الإلكتروني غير صحيح");
        }
        break;
        
      case 'contracts':
        if (!item.client_name && !item["اسم العميل"]) errors.push("اسم العميل مطلوب");
        if (!item.property_name && !item["اسم العقار"]) errors.push("اسم العقار مطلوب");
        break;
        
      case 'payments':
        if (!item.amount && !item["المبلغ"]) errors.push("مبلغ الدفعة مطلوب");
        break;
    }
    
    return errors;
  };

  const processExcelFile = (file: File) => {
    setIsProcessing(true);
    setProcessingStep("قراءة الملف...");
    setProgress(10);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        setProcessingStep("تحليل بنية الملف...");
        setProgress(25);
        
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const allData: any[] = [];
        
        // معالجة جميع الأوراق
        workbook.SheetNames.forEach((sheetName, index) => {
          setProcessingStep(`معالجة ورقة: ${sheetName}`);
          setProgress(30 + (index / workbook.SheetNames.length) * 30);
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          allData.push(...jsonData);
        });
        
        setProcessingStep("تحليل البيانات بالذكاء الاصطناعي...");
        setProgress(70);
        
        analyzeData(allData);
      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast({
          title: "خطأ في معالجة الملف",
          description: "تأكد من صحة تنسيق الملف",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        setProgress(100);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const processJsonFile = (file: File) => {
    setIsProcessing(true);
    setProcessingStep("قراءة ملف JSON...");
    setProgress(20);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        setProgress(40);
        const jsonData = JSON.parse(e.target?.result as string);
        
        let allData: any[] = [];
        
        setProcessingStep("استخراج البيانات...");
        setProgress(60);
        
        if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
          Object.values(jsonData).forEach((section: any) => {
            if (Array.isArray(section)) {
              allData.push(...section);
            }
          });
        } else if (Array.isArray(jsonData)) {
          allData = jsonData;
        }
        
        setProcessingStep("تحليل البيانات بالذكاء الاصطناعي...");
        setProgress(80);
        
        analyzeData(allData);
      } catch (error) {
        console.error("Error processing JSON file:", error);
        toast({
          title: "خطأ في معالجة الملف",
          description: "تأكد من صحة تنسيق ملف JSON",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        setProgress(100);
      }
    };
    
    reader.readAsText(file);
  };

  const analyzeData = (data: any[]) => {
    setProcessingStep("تصنيف البيانات والتحقق من التكرارات...");
    
    const analyzed: AnalyzedData = {
      properties: [],
      clients: [],
      contracts: [],
      payments: [],
      maintenance: [],
      unknown: []
    };

    const duplicateCheck: DuplicateCheck = {
      properties: new Map(),
      clients: new Map(),
      contracts: new Map()
    };

    data.forEach((item, index) => {
      setProgress(80 + (index / data.length) * 15);
      
      const { type, confidence } = analyzeDataType(item);
      const { isDuplicate, reason } = checkForDuplicates(item, type, duplicateCheck);
      const validationErrors = validateItem(item, type);
      
      const processedItem: ProcessedItem = {
        id: `${type}_${index}_${Date.now()}`,
        data: item,
        type,
        confidence,
        isDuplicate,
        duplicateReason: reason,
        validationErrors
      };
      
      if (type === 'unknown') {
        analyzed.unknown.push(processedItem);
      } else {
        analyzed[type as keyof Omit<AnalyzedData, 'unknown'>].push(processedItem);
      }
    });

    // تحديد العناصر المختارة تلقائياً (غير المكررة وبدون أخطاء)
    const autoSelected = new Set<string>();
    Object.values(analyzed).flat().forEach(item => {
      if (!item.isDuplicate && item.validationErrors.length === 0) {
        autoSelected.add(item.id);
      }
    });
    
    setSelectedItems(autoSelected);
    setAnalyzedData(analyzed);
    setProgress(100);
    
    const totalItems = data.length;
    const duplicates = Object.values(analyzed).flat().filter(item => item.isDuplicate).length;
    const errors = Object.values(analyzed).flat().filter(item => item.validationErrors.length > 0).length;
    
    toast({
      title: "تم التحليل الذكي بنجاح",
      description: `تم تحليل ${totalItems} عنصر، تم العثور على ${duplicates} تكرار و ${errors} خطأ`,
    });
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const importSelectedData = async () => {
    if (!analyzedData) return;
    
    setIsImporting(true);
    let totalImported = 0;
    const allItems = Object.values(analyzedData).flat();
    const selectedItemsToImport = allItems.filter(item => selectedItems.has(item.id));

    try {
      for (let i = 0; i < selectedItemsToImport.length; i++) {
        const item = selectedItemsToImport[i];
        setProcessingStep(`استيراد ${item.type}: ${i + 1}/${selectedItemsToImport.length}`);
        setProgress((i / selectedItemsToImport.length) * 100);
        
        try {
          switch (item.type) {
            case 'properties':
              addProperty({
                name: item.data["اسم العقار"] || item.data["name"] || item.data["property_name"] || "",
                location: item.data["الموقع"] || item.data["location"] || "",
                type: item.data["النوع"] || item.data["type"] || "residential",
                status: item.data["الحالة"] || item.data["status"] || "available",
                totalUnits: parseInt(item.data["إجمالي الوحدات"] || item.data["total_units"] || item.data["units"] || "1"),
                availableUnits: parseInt(item.data["الوحدات المتاحة"] || item.data["available_units"] || "1"),
                rentedUnits: 0,
                floors: parseInt(item.data["الأدوار"] || item.data["floors"] || "1"),
                price: parseFloat(item.data["السعر"] || item.data["price"] || "0"),
                currency: item.data["العملة"] || item.data["currency"] || "SAR",
                units: []
              });
              break;
              
            case 'clients':
              addClient({
                name: item.data["اسم العميل"] || item.data["name"] || item.data["client_name"] || "",
                email: item.data["البريد الإلكتروني"] || item.data["email"] || "",
                phone: item.data["رقم الهاتف"] || item.data["phone"] || "",
                type: item.data["النوع"] || item.data["type"] || "tenant",
                address: item.data["العنوان"] || item.data["address"] || "",
                idNumber: item.data["رقم الهوية"] || item.data["id_number"] || "",
                nationality: item.data["الجنسية"] || item.data["nationality"] || "",
                properties: []
              });
              break;
              
            case 'payments':
              addPayment({
                contractId: parseInt(item.data["رقم العقد"] || item.data["contract_id"] || "1"),
                amount: parseFloat(item.data["المبلغ"] || item.data["amount"] || "0"),
                currency: item.data["العملة"] || item.data["currency"] || "SAR",
                dueDate: item.data["تاريخ الاستحقاق"] || item.data["due_date"] || new Date().toISOString().split('T')[0],
                paidDate: item.data["تاريخ الدفع"] || item.data["paid_date"] || undefined,
                paymentMethod: item.data["طريقة الدفع"] || item.data["payment_method"] || "cash",
                status: item.data["الحالة"] || item.data["status"] || "pending"
              });
              break;
              
            case 'maintenance':
              addMaintenanceRequest({
                propertyId: parseInt(item.data["رقم العقار"] || item.data["property_id"] || "1"),
                description: item.data["الوصف"] || item.data["description"] || "",
                priority: item.data["الأولوية"] || item.data["priority"] || "medium",
                status: item.data["الحالة"] || item.data["status"] || "pending",
                requestDate: item.data["تاريخ الطلب"] || item.data["request_date"] || new Date().toISOString().split('T')[0]
              });
              break;
          }
          totalImported++;
        } catch (error) {
          console.error(`Error importing ${item.type}:`, error);
        }
      }

      toast({
        title: "تم الاستيراد بنجاح",
        description: `تم استيراد ${totalImported} من ${selectedItemsToImport.length} عنصر بنجاح`,
      });

      onClose();
    } catch (error) {
      toast({
        title: "خطأ في الاستيراد",
        description: "حدث خطأ أثناء استيراد البيانات",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setProgress(100);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setProgress(0);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      processExcelFile(file);
    } else if (fileExtension === 'json') {
      processJsonFile(file);
    } else {
      toast({
        title: "نوع ملف غير مدعوم",
        description: "يرجى اختيار ملف Excel أو JSON",
        variant: "destructive",
      });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getSectionIcon = (section: string) => {
    const icons = {
      properties: Building,
      clients: Users,
      contracts: FileText,
      payments: CreditCard,
      maintenance: Wrench,
      unknown: AlertTriangle
    };
    return icons[section as keyof typeof icons] || AlertTriangle;
  };

  const getSectionTitle = (section: string, count: number) => {
    const titles = {
      properties: "العقارات",
      clients: "العملاء", 
      contracts: "العقود",
      payments: "المدفوعات",
      maintenance: "الصيانة",
      unknown: "غير محدد"
    };
    return `${titles[section as keyof typeof titles]} (${count})`;
  };

  const selectAllSection = (section: string) => {
    if (!analyzedData) return;
    
    const sectionItems = analyzedData[section as keyof AnalyzedData];
    const validItems = sectionItems.filter(item => !item.isDuplicate && item.validationErrors.length === 0);
    
    const newSelection = new Set(selectedItems);
    validItems.forEach(item => newSelection.add(item.id));
    setSelectedItems(newSelection);
  };

  const deselectAllSection = (section: string) => {
    if (!analyzedData) return;
    
    const sectionItems = analyzedData[section as keyof AnalyzedData];
    const newSelection = new Set(selectedItems);
    sectionItems.forEach(item => newSelection.delete(item.id));
    setSelectedItems(newSelection);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            الاستيراد الذكي المطور
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!analyzedData ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    رفع الملف للتحليل الذكي المتقدم
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleFileSelect}
                    disabled={isProcessing}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {isProcessing ? "جاري المعالجة..." : "اختيار ملف Excel أو JSON"}
                  </Button>
                  
                  {isProcessing && (
                    <div className="space-y-2">
                      <Progress value={progress} className="w-full" />
                      <p className="text-sm text-muted-foreground text-center">{processingStep}</p>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </CardContent>
              </Card>

              <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Brain className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-primary mb-2">المزايا الذكية الجديدة</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>كشف التكرارات الذكي</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>التحقق من صحة البيانات</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>تصنيف ذكي بمستوى ثقة</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>اختيار انتقائي للاستيراد</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    نتائج التحليل الذكي المتقدم
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analyzedData).map(([section, items]) => {
                      if (items.length === 0) return null;
                      
                      const Icon = getSectionIcon(section);
                      const validItems = items.filter(item => !item.isDuplicate && item.validationErrors.length === 0);
                      const duplicateItems = items.filter(item => item.isDuplicate);
                      const errorItems = items.filter(item => item.validationErrors.length > 0);
                      
                      return (
                        <div key={section} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="font-medium">{getSectionTitle(section, items.length)}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => selectAllSection(section)}
                                disabled={validItems.length === 0}
                              >
                                تحديد الكل
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deselectAllSection(section)}
                              >
                                إلغاء الكل
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mb-2 text-xs">
                            {validItems.length > 0 && (
                              <Badge variant="outline" className="text-green-700 border-green-200">
                                {validItems.length} صحيح
                              </Badge>
                            )}
                            {duplicateItems.length > 0 && (
                              <Badge variant="outline" className="text-orange-700 border-orange-200">
                                {duplicateItems.length} مكرر
                              </Badge>
                            )}
                            {errorItems.length > 0 && (
                              <Badge variant="outline" className="text-red-700 border-red-200">
                                {errorItems.length} خطأ
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {items.slice(0, 5).map((item) => (
                              <div key={item.id} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={selectedItems.has(item.id)}
                                  onCheckedChange={() => toggleItemSelection(item.id)}
                                  disabled={item.isDuplicate || item.validationErrors.length > 0}
                                />
                                <div className="flex-1 truncate">
                                  {JSON.stringify(item.data).substring(0, 50)}...
                                </div>
                                <div className="flex gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(item.confidence * 100)}%
                                  </Badge>
                                  {item.isDuplicate && (
                                    <div className="relative group">
                                      <AlertCircle className="h-3 w-3 text-orange-500" />
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        {item.duplicateReason}
                                      </div>
                                    </div>
                                  )}
                                  {item.validationErrors.length > 0 && (
                                    <div className="relative group">
                                      <AlertTriangle className="h-3 w-3 text-red-500" />
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        {item.validationErrors.join(", ")}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {items.length > 5 && (
                              <p className="text-xs text-muted-foreground text-center">
                                و {items.length - 5} عنصر آخر...
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={importSelectedData}
                      disabled={isImporting || selectedItems.size === 0}
                      className="flex-1"
                    >
                      {isImporting ? "جاري الاستيراد..." : `استيراد (${selectedItems.size}) عنصر`}
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setAnalyzedData(null);
                        setSelectedItems(new Set());
                        setProgress(0);
                      }}
                      variant="outline"
                    >
                      إعادة تحليل
                    </Button>
                  </div>
                  
                  {isImporting && (
                    <div className="space-y-2 mt-3">
                      <Progress value={progress} className="w-full" />
                      <p className="text-sm text-muted-foreground text-center">{processingStep}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}