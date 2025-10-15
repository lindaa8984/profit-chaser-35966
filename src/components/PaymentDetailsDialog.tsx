import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  User, 
  Building2, 
  Calendar, 
  X
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface PaymentDetailsDialogProps {
  payment: any;
  onClose: () => void;
}

export function PaymentDetailsDialog({ payment, onClose }: PaymentDetailsDialogProps) {
  const { contracts, clients, properties, currency } = useApp();

  const currencySymbols = {
    SAR: "ر.س",
    USD: "USD",
    EUR: "€",
    AED: "د.إ"
  };

  const getContract = (contractId: number | string) => {
    return contracts.find(c => c.id === (typeof contractId === 'number' ? contractId : parseInt(contractId.slice(0, 8), 16)));
  };

  const getClientName = (contractId: number | string) => {
    const contract = getContract(contractId);
    if (!contract) return "عقد غير موجود";
    const client = clients.find(c => c.id === contract.clientId);
    return client ? client.name : "عميل غير موجود";
  };

  const getPropertyName = (contractId: number | string) => {
    const contract = getContract(contractId);
    if (!contract) return "عقار غير موجود";
    const property = properties.find(p => p.id === contract.propertyId);
    return property ? property.name : "عقار غير موجود";
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "paid": return <Badge className="bg-success/10 text-success border-success/20">مدفوع</Badge>;
      case "pending": return <Badge className="bg-warning/10 text-warning border-warning/20">معلق</Badge>;
      case "overdue": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">متأخر</Badge>;
      default: return <Badge>{status}</Badge>;
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

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              تفاصيل الدفعة
            </DialogTitle>
          </div>
          <Button onClick={onClose} size="sm" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات الدفعة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                معلومات الدفعة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">المبلغ</p>
                  <p className="font-medium text-lg text-primary">
                    {payment.amount.toLocaleString()} {currencySymbols[currency as keyof typeof currencySymbols]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  {getStatusBadge(payment.status)}
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ الاستحقاق</p>
                  <p className="font-medium">{payment.dueDate}</p>
                </div>
                {payment.paidDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ الدفع</p>
                    <p className="font-medium">{payment.paidDate}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                <p className="font-medium">{getPaymentMethodLabel(payment.paymentMethod)}</p>
                {payment.paymentMethod === "cheque" && payment.bankName && (
                  <p className="text-sm text-muted-foreground mt-1">البنك: {payment.bankName}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* معلومات العقد */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  العميل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-foreground">{getClientName(payment.contractId)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  العقار
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-foreground">{getPropertyName(payment.contractId)}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}