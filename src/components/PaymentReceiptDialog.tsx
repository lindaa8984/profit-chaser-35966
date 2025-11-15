import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Printer, 
  X,
  Building2,
  User,
  Calendar,
  CreditCard,
  FileText
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { formatDateDDMMYYYY } from "@/lib/utils";
import { t } from "@/lib/translations";

interface PaymentReceiptDialogProps {
  payment: any;
  onClose: () => void;
}

export function PaymentReceiptDialog({ payment, onClose }: PaymentReceiptDialogProps) {
  const { contracts, clients, properties, currency, language } = useApp();
  const contentRef = useRef<HTMLDivElement>(null);

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

  const getPaymentMethodLabel = (method: string) => {
    switch(method) {
      case "cash": return "نقدي";
      case "cheque": return "شيك";
      case "bank_transfer": return "حوالة بنكية";
      case "card": return "بطاقة ائتمان";
      default: return method;
    }
  };

  const handlePrint = useReactToPrint({
    contentRef,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 2cm 1.5cm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `
  });

  const currentDate = new Date().toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full print:overflow-visible print:border-0 print:shadow-none">
        <DialogHeader className="flex flex-row items-center justify-between print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            إيصال الدفع
          </DialogTitle>
          <div className="flex gap-2">
            <Button onClick={handlePrint} size="sm" className="bg-gradient-primary">
              <Printer className="h-4 w-4 mr-1" />
              طباعة
            </Button>
            <Button onClick={onClose} size="sm" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Receipt Content */}
        <div ref={contentRef} className="receipt-content space-y-6 p-6 bg-background">
          {/* Header */}
          <div className="text-center space-y-3 border-b-2 border-primary pb-4">
            <h1 className="text-3xl font-bold text-primary">
              {language === 'ar' ? 'إيصال دفع' : 'PAYMENT RECEIPT'}
            </h1>
            <p className="text-2xl font-semibold text-foreground">
              {t('layout.companyName', language)}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'PAYMENT RECEIPT' : 'إيصال دفع'}
            </p>
          </div>

          {/* Receipt Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">
                {language === 'ar' ? 'رقم الإيصال' : 'Receipt Number'}
              </p>
              <p className="font-bold text-lg" dir="ltr">#{payment.id}</p>
            </div>
            <div className="text-left" dir="ltr">
              <p className="text-muted-foreground">
                {language === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}
              </p>
              <p className="font-medium">{currentDate}</p>
            </div>
          </div>

          <Separator />

          {/* Client & Property Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <User className="h-5 w-5" />
                <span>{language === 'ar' ? 'معلومات العميل' : 'Client Information'}</span>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="font-medium text-lg">{getClientName(payment.contractId)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Building2 className="h-5 w-5" />
                <span>{language === 'ar' ? 'العقار' : 'Property'}</span>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="font-medium text-lg">{getPropertyName(payment.contractId)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-semibold text-lg">
              <CreditCard className="h-5 w-5" />
              <span>{language === 'ar' ? 'تفاصيل الدفعة' : 'Payment Details'}</span>
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-lg border border-primary/20 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {payment.amount.toLocaleString()} {currencySymbols[currency as keyof typeof currencySymbols]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                  </p>
                  <p className="text-xl font-semibold">{getPaymentMethodLabel(payment.paymentMethod)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}
                  </p>
                  <p className="font-medium" dir="ltr">{formatDateDDMMYYYY(payment.dueDate)}</p>
                </div>
                {payment.paidDate && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {language === 'ar' ? 'تاريخ الدفع' : 'Payment Date'}
                    </p>
                    <p className="font-medium" dir="ltr">{formatDateDDMMYYYY(payment.paidDate)}</p>
                  </div>
                )}
              </div>

              {payment.paymentMethod === "cheque" && payment.checkNumber && (
                <div className="bg-background p-3 rounded border border-border">
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'ar' ? 'رقم الشيك' : 'Check Number'}
                  </p>
                  <p className="font-semibold text-lg">{payment.checkNumber}</p>
                  {payment.bankName && (
                    <>
                      <p className="text-sm text-muted-foreground mt-2 mb-1">
                        {language === 'ar' ? 'اسم البنك' : 'Bank Name'}
                      </p>
                      <p className="font-medium">{payment.bankName}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <div className="text-center space-y-2 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'هذا إيصال رسمي يؤكد استلام المبلغ المذكور أعلاه' 
                : 'This is an official receipt confirming receipt of the above amount'}
            </p>
            <p className="text-xs text-muted-foreground">
              {language === 'ar'
                ? 'تم إصدار هذا الإيصال إلكترونياً ولا يحتاج إلى توقيع'
                : 'This receipt is issued electronically and does not require a signature'}
            </p>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
