import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  User, 
  Building2, 
  Calendar, 
  CreditCard, 
  MapPin,
  Edit2,
  X,
  Upload,
  Download,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { formatDateDDMMYYYY } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ContractDetailsDialogProps {
  contract: any;
  onClose: () => void;
}

export function ContractDetailsDialog({ contract, onClose }: ContractDetailsDialogProps) {
  const { properties, clients, currency, updateContract } = useApp();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [contractFileUrl, setContractFileUrl] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  // Update contractFileUrl whenever contract changes
  useEffect(() => {
    setContractFileUrl(contract.contractFileUrl || null);
  }, [contract]);

  const currencySymbols = {
    SAR: "ر.س",
    USD: "USD",
    EUR: "€",
    AED: "د.إ"
  };

  const getPropertyName = (propertyId: number) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? property.name : "عقار غير موجود";
  };

  const getPropertyLocation = (propertyId: number) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? property.location : "موقع غير محدد";
  };

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "عميل غير موجود";
  };

  const getClientInfo = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? { phone: client.phone, email: client.email, nationality: client.nationality } : null;
  };

  const getPaymentScheduleLabel = (schedule: string) => {
    switch(schedule) {
      case "monthly": return "شهري";
      case "quarterly": return "ربع سنوي";
      case "semi_annual": return "نصف سنوي";
      case "annually": return "سنوي";
      default: return schedule;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch(method) {
      case "cash": return "نقدي";
      case "cheque": return "شيك";
      case "bank_transfer": return "حوالة بنكية";
      case "card": return "بطاقة ائتمان";
      default: return method;
    }
  };

  const clientInfo = getClientInfo(contract.clientId);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);

    try {
      // إنشاء اسم فريد للملف
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${contract.uuid || contract.id}_${Date.now()}.${fileExt}`;

      // رفع الملف
      const { error: uploadError, data } = await supabase.storage
        .from('contracts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // الحصول على رابط الملف
      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      // تحديث العقد برابط الملف
      await updateContract(contract.id, { contractFileUrl: data.path });
      setContractFileUrl(data.path);

      toast({ title: "تم بنجاح", description: "تم رفع ملف العقد بنجاح" });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({ title: "خطأ", description: "فشل رفع الملف", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFileDownload = async () => {
    if (!contractFileUrl) return;

    try {
      const { data, error } = await supabase.storage
        .from('contracts')
        .download(contractFileUrl);

      if (error) throw error;

      // إنشاء رابط التحميل
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract_${contract.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "تم بنجاح", description: "تم تحميل ملف العقد" });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({ title: "خطأ", description: "فشل تحميل الملف", variant: "destructive" });
    }
  };

  const handleFileDelete = async () => {
    if (!contractFileUrl) return;

    try {
      const { error } = await supabase.storage
        .from('contracts')
        .remove([contractFileUrl]);

      if (error) throw error;

      await updateContract(contract.id, { contractFileUrl: null });
      setContractFileUrl(null);

      toast({ title: "تم بنجاح", description: "تم حذف ملف العقد" });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({ title: "خطأ", description: "فشل حذف الملف", variant: "destructive" });
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              تفاصيل العقد
            </DialogTitle>
            <DialogDescription>
              عرض جميع تفاصيل العقد ومعلومات العقار والعميل
            </DialogDescription>
          </div>
          <Button onClick={onClose} size="sm" variant="outline">
            <X className="h-4 w-4 mr-1" />
            إنهاء
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات العقار والعميل */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  معلومات العقار
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium text-foreground">{getPropertyName(contract.propertyId)}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {getPropertyLocation(contract.propertyId)}
                  </div>
                </div>
                {contract.unitNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الوحدة</p>
                    <p className="font-medium">{contract.unitNumber}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  معلومات العميل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium text-foreground">{getClientName(contract.clientId)}</p>
                  {clientInfo && (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{clientInfo.phone}</p>
                      <p>{clientInfo.email}</p>
                      <p>{clientInfo.nationality}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* تفاصيل العقد */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                تفاصيل العقد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    تاريخ البداية:
                  </p>
                  <p className="font-medium" dir="ltr">{formatDateDDMMYYYY(contract.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    تاريخ النهاية:
                  </p>
                  <p className="font-medium" dir="ltr">{formatDateDDMMYYYY(contract.endDate)}</p>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    الإيجار السنوي:
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-lg">
                      {contract.monthlyRent.toLocaleString()} {currencySymbols[currency as keyof typeof currencySymbols]}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">طريقة الدفع:</p>
                  <p className="font-medium">{getPaymentMethodLabel(contract.paymentMethod)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* معلومات الدفع */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                معلومات الدفع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                  <p className="font-medium">{getPaymentMethodLabel(contract.paymentMethod)}</p>
                </div>
                {contract.numberOfPayments && (
                  <div>
                    <p className="text-sm text-muted-foreground">عدد الدفعات</p>
                    <p className="font-medium">{contract.numberOfPayments} دفعة</p>
                  </div>
                )}
              </div>

              {contract.checkDates && contract.paymentMethod === "cheque" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">تواريخ الشيكات</p>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm">{contract.checkDates}</p>
                  </div>
                </div>
              )}

              {contract.paymentDates && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">تواريخ الدفعات المتوقعة</p>
                  <div className="p-3 bg-muted rounded-md max-h-32 overflow-y-auto">
                    <p className="text-sm">{contract.paymentDates}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* إرفاق العقد */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                إرفاق العقد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!contractFileUrl ? (
                <div>
                  <Label htmlFor="contract-file" className="cursor-pointer">
                    <div className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {uploading ? "جاري الرفع..." : "اضغط لرفع ملف PDF"}
                      </span>
                    </div>
                  </Label>
                  <Input
                    id="contract-file"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-2">الحد الأقصى للملف: 10MB</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* أزرار التحكم */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">ملف العقد المرفق</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setShowPdfViewer(!showPdfViewer)}
                        className="bg-gradient-primary"
                      >
                        {showPdfViewer ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            إخفاء
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            عرض
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleFileDownload}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        تحميل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleFileDelete}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        حذف
                      </Button>
                    </div>
                  </div>
                  
                  {/* عارض PDF - يظهر عند الضغط على زر عرض */}
                  {showPdfViewer && (
                    <div className="w-full h-[500px] border rounded-lg overflow-hidden bg-muted/20 animate-in fade-in slide-in-from-top-4 duration-300">
                      <iframe
                        src={`${supabase.storage.from('contracts').getPublicUrl(contractFileUrl).data.publicUrl}#toolbar=1`}
                        className="w-full h-full"
                        title="عقد الإيجار"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}