import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  User, 
  Building2, 
  Calendar, 
  CreditCard, 
  MapPin,
  Edit2,
  X
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { format } from "date-fns";

interface ContractDetailsDialogProps {
  contract: any;
  onClose: () => void;
}

export function ContractDetailsDialog({ contract, onClose }: ContractDetailsDialogProps) {
  const { properties, clients, currency } = useApp();

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
                  <p className="font-medium">{format(new Date(contract.startDate), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    تاريخ النهاية:
                  </p>
                  <p className="font-medium">{format(new Date(contract.endDate), 'dd/MM/yyyy')}</p>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}