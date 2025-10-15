import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertTriangle, Brain, CheckCircle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from 'xlsx';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface AnalyzedData {
  properties: any[];
  clients: any[];
  contracts: any[];
  payments: any[];
  maintenance: any[];
  unknown: any[];
}

export function SmartImportDialog({ open, onClose }: ImportDialogProps) {
  const { addProperty, addClient, addContract, addPayment } = useApp();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<AnalyzedData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // منطق ذكي لتحليل نوع البيانات بناءً على الحقول
  const analyzeDataType = (item: any): string => {
    const keys = Object.keys(item).map(k => k.toLowerCase());
    
    // فحص العقارات
    const propertyKeywords = ['property', 'building', 'عقار', 'مبنى', 'وحدات', 'units', 'floors', 'أدوار', 'location', 'موقع'];
    const propertyMatch = keys.some(key => propertyKeywords.some(keyword => key.includes(keyword)));
    
    // فحص العملاء
    const clientKeywords = ['client', 'tenant', 'customer', 'عميل', 'مستأجر', 'زبون', 'phone', 'هاتف', 'email', 'بريد'];
    const clientMatch = keys.some(key => clientKeywords.some(keyword => key.includes(keyword)));
    
    // فحص العقود
    const contractKeywords = ['contract', 'عقد', 'start_date', 'end_date', 'تاريخ_بداية', 'تاريخ_نهاية', 'rent', 'ايجار'];
    const contractMatch = keys.some(key => contractKeywords.some(keyword => key.includes(keyword)));
    
    // فحص المدفوعات
    const paymentKeywords = ['payment', 'دفعة', 'amount', 'مبلغ', 'due_date', 'تاريخ_استحقاق', 'paid', 'مدفوع'];
    const paymentMatch = keys.some(key => paymentKeywords.some(keyword => key.includes(keyword)));
    
    // فحص الصيانة
    const maintenanceKeywords = ['maintenance', 'صيانة', 'repair', 'إصلاح', 'issue', 'مشكلة', 'status', 'حالة'];
    const maintenanceMatch = keys.some(key => maintenanceKeywords.some(keyword => key.includes(keyword)));
    
    // ترتيب الأولوية بناءً على دقة التطابق
    if (propertyMatch && (keys.includes('units') || keys.includes('وحدات'))) return 'properties';
    if (paymentMatch && (keys.includes('amount') || keys.includes('مبلغ'))) return 'payments';
    if (contractMatch && (keys.includes('rent') || keys.includes('ايجار'))) return 'contracts';
    if (clientMatch && (keys.includes('phone') || keys.includes('email'))) return 'clients';
    if (maintenanceMatch) return 'maintenance';
    
    return 'unknown';
  };

  const processExcelFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const allData: any[] = [];
        
        // معالجة جميع الأوراق في الملف
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          allData.push(...jsonData);
        });
        
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
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const processJsonFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        let allData: any[] = [];
        
        // إذا كان الملف يحتوي على أقسام منظمة
        if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
          Object.values(jsonData).forEach((section: any) => {
            if (Array.isArray(section)) {
              allData.push(...section);
            }
          });
        } else if (Array.isArray(jsonData)) {
          allData = jsonData;
        }
        
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
      }
    };
    
    reader.readAsText(file);
  };

  const analyzeData = (data: any[]) => {
    const analyzed: AnalyzedData = {
      properties: [],
      clients: [],
      contracts: [],
      payments: [],
      maintenance: [],
      unknown: []
    };

    data.forEach(item => {
      const type = analyzeDataType(item);
      analyzed[type as keyof AnalyzedData].push(item);
    });

    setAnalyzedData(analyzed);
    
    toast({
      title: "تم تحليل البيانات بذكاء",
      description: `تم تحليل ${data.length} عنصر وتوزيعهم على الأقسام المناسبة`,
    });
  };

  const importAnalyzedData = async () => {
    if (!analyzedData) return;
    
    setIsImporting(true);
    let totalImported = 0;

    try {
      // استيراد العقارات
      for (const item of analyzedData.properties) {
        try {
          addProperty({
            name: item["اسم العقار"] || item["name"] || item["property_name"] || item["Property Name"] || "",
            location: item["الموقع"] || item["location"] || item["Location"] || "",
            type: item["النوع"] || item["type"] || item["Type"] || "residential",
            status: item["الحالة"] || item["status"] || item["Status"] || "available",
            totalUnits: parseInt(item["إجمالي الوحدات"] || item["total_units"] || item["totalUnits"] || item["Units"] || "1"),
            availableUnits: parseInt(item["الوحدات المتاحة"] || item["available_units"] || item["availableUnits"] || item["Available Units"] || "1"),
            rentedUnits: 0,
            floors: parseInt(item["الأدوار"] || item["floors"] || item["Floors"] || "1"),
            price: parseFloat(item["السعر"] || item["price"] || item["Price"] || "0"),
            currency: item["العملة"] || item["currency"] || item["Currency"] || "SAR",
            units: []
          });
          totalImported++;
        } catch (error) {
          console.error("Error importing property:", error);
        }
      }

      // استيراد العملاء
      for (const item of analyzedData.clients) {
        try {
          addClient({
            name: item["اسم العميل"] || item["name"] || item["client_name"] || item["Name"] || "",
            email: item["البريد الإلكتروني"] || item["email"] || item["Email"] || "",
            phone: item["رقم الهاتف"] || item["phone"] || item["Phone"] || "",
            type: item["النوع"] || item["type"] || item["Type"] || "tenant",
            address: item["العنوان"] || item["address"] || item["Address"] || "",
            idNumber: item["رقم الهوية"] || item["id_number"] || item["ID Number"] || "",
            nationality: item["الجنسية"] || item["nationality"] || item["Nationality"] || "",
            properties: []
          });
          totalImported++;
        } catch (error) {
          console.error("Error importing client:", error);
        }
      }

      // استيراد المدفوعات
      for (const item of analyzedData.payments) {
        try {
          addPayment({
            contractId: item["رقم العقد"] || item["contract_id"] || item["Contract ID"] || "",
            amount: parseFloat(item["المبلغ"] || item["amount"] || item["Amount"] || "0"),
            currency: item["العملة"] || item["currency"] || item["Currency"] || "SAR",
            dueDate: item["تاريخ الاستحقاق"] || item["due_date"] || item["Due Date"] || new Date().toISOString().split('T')[0],
            paidDate: item["تاريخ الدفع"] || item["paid_date"] || item["Paid Date"] || null,
            paymentMethod: item["طريقة الدفع"] || item["payment_method"] || item["Payment Method"] || "cash",
            status: item["الحالة"] || item["status"] || item["Status"] || "pending"
          });
          totalImported++;
        } catch (error) {
          console.error("Error importing payment:", error);
        }
      }

      toast({
        title: "تم الاستيراد بنجاح",
        description: `تم استيراد ${totalImported} عنصر بذكاء عبر جميع الأقسام`,
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
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            الاستيراد الذكي للبيانات
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!analyzedData ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    رفع الملف للتحليل الذكي
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
                    {isProcessing ? "جاري التحليل الذكي..." : "اختيار ملف Excel أو JSON"}
                  </Button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </CardContent>
              </Card>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Brain className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-primary mb-1">الاستيراد الذكي</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>يحلل البيانات تلقائياً ويحدد نوعها</li>
                      <li>يوزع البيانات على الأقسام المناسبة</li>
                      <li>يدعم ملفات Excel متعددة الأوراق</li>
                      <li>يتعرف على الأسماء باللغتين العربية والإنجليزية</li>
                    </ul>
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
                    نتائج التحليل الذكي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(analyzedData).map(([section, items]) => (
                      items.length > 0 && (
                        <Badge key={section} variant="outline" className="justify-between p-2">
                          <span>{getSectionTitle(section, items.length)}</span>
                        </Badge>
                      )
                    ))}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={importAnalyzedData}
                      disabled={isImporting}
                      className="flex-1"
                    >
                      {isImporting ? "جاري الاستيراد..." : "استيراد البيانات"}
                    </Button>
                    
                    <Button
                      onClick={() => setAnalyzedData(null)}
                      variant="outline"
                    >
                      إعادة تحليل
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {analyzedData.unknown.length > 0 && (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-warning mb-1">
                        عناصر غير محددة ({analyzedData.unknown.length})
                      </p>
                      <p className="text-muted-foreground">
                        بعض العناصر لم يتم التعرف على نوعها تلقائياً
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}