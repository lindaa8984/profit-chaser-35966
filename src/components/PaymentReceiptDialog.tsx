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
  const { contracts, clients, properties, currency, language, payments } = useApp();
  const contentRef = useRef<HTMLDivElement>(null);

  const currencySymbols = {
    ar: {
      SAR: "ر.س",
      USD: "دولار",
      EUR: "يورو",
      AED: "د.إ"
    },
    en: {
      SAR: "SAR",
      USD: "USD",
      EUR: "EUR",
      AED: "AED"
    }
  };

  const getContract = (contractId: number | string) => {
    return contracts.find(c => c.id === (typeof contractId === 'number' ? contractId : parseInt(contractId.slice(0, 8), 16)));
  };

  const getPaymentNumber = () => {
    const contract = getContract(payment.contractId);
    if (!contract) return null;
    
    const contractPayments = payments
      .filter(p => p.contractId === payment.contractId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    const currentIndex = contractPayments.findIndex(p => p.id === payment.id);
    if (currentIndex === -1) return null;
    
    return {
      current: currentIndex + 1,
      total: contractPayments.length
    };
  };

  const getPaymentPeriod = () => {
    const dueDate = new Date(payment.dueDate);
    const monthName = dueDate.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
    return monthName;
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
      case "cash": return t('receipt.cash', language);
      case "cheque": return t('receipt.cheque', language);
      case "bank_transfer": return t('receipt.bankTransfer', language);
      case "card": return t('receipt.card', language);
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

  const currentDate = new Date().toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const contract = getContract(payment.contractId);
  const paymentNumber = getPaymentNumber();
  const paymentPeriod = getPaymentPeriod();

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full print:overflow-visible print:border-0 print:shadow-none">
        <DialogHeader className="flex flex-row items-center justify-between print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t('receipt.title', language)}
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
              {t('receipt.title', language)}
            </h1>
            <p className="text-2xl font-semibold text-foreground">
              {t('layout.companyName', language)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('receipt.titleEnglish', language)}
            </p>
          </div>

          {/* Receipt Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">
                {t('receipt.receiptNumber', language)}
              </p>
              <p className="font-bold text-lg" dir="ltr">#{payment.id}</p>
            </div>
            <div className="text-left" dir="ltr">
              <p className="text-muted-foreground">
                {t('receipt.issueDate', language)}
              </p>
              <p className="font-medium">{currentDate}</p>
            </div>
          </div>

          {/* Contract & Payment Info */}
          <div className="bg-muted/20 p-4 rounded-lg space-y-2 text-sm">
            {contract && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'رقم العقد' : 'Contract Number'}:
                </span>
                <span className="font-semibold" dir="ltr">#{contract.id}</span>
              </div>
            )}
            {paymentNumber && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'رقم الدفعة' : 'Payment Number'}:
                </span>
                <span className="font-semibold">
                  {language === 'ar' 
                    ? `الدفعة ${paymentNumber.current} من ${paymentNumber.total}`
                    : `Payment ${paymentNumber.current} of ${paymentNumber.total}`
                  }
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {language === 'ar' ? 'الفترة المستحقة' : 'Payment Period'}:
              </span>
              <span className="font-semibold">{paymentPeriod}</span>
            </div>
            {contract?.unitNumber && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'رقم الوحدة' : 'Unit Number'}:
                </span>
                <span className="font-semibold">{contract.unitNumber}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Client & Property Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <User className="h-5 w-5" />
                <span>{t('receipt.clientInfo', language)}</span>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="font-medium text-lg">{getClientName(payment.contractId)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Building2 className="h-5 w-5" />
                <span>{t('receipt.property', language)}</span>
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
              <span>{t('receipt.paymentDetails', language)}</span>
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-lg border border-primary/20 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('receipt.amountPaid', language)}
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {payment.amount.toLocaleString()} {currencySymbols[language as keyof typeof currencySymbols][currency as keyof typeof currencySymbols.ar]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('receipt.paymentMethod', language)}
                  </p>
                  <p className="text-xl font-semibold">{getPaymentMethodLabel(payment.paymentMethod)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {t('receipt.dueDate', language)}
                  </p>
                  <p className="font-medium" dir="ltr">{formatDateDDMMYYYY(payment.dueDate)}</p>
                </div>
                {payment.paidDate && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {t('receipt.paymentDate', language)}
                    </p>
                    <p className="font-medium" dir="ltr">{formatDateDDMMYYYY(payment.paidDate)}</p>
                  </div>
                )}
              </div>

              {payment.paymentMethod === "cheque" && payment.checkNumber && (
                <div className="bg-background p-3 rounded border border-border">
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('receipt.checkNumber', language)}
                  </p>
                  <p className="font-semibold text-lg">{payment.checkNumber}</p>
                  {payment.bankName && (
                    <>
                      <p className="text-sm text-muted-foreground mt-2 mb-1">
                        {t('receipt.bankName', language)}
                      </p>
                      <p className="font-medium">{payment.bankName}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          {payment.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <FileText className="h-4 w-4" />
                  <span>{t('receipt.notesLabel', language)}</span>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{payment.notes}</p>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Footer */}
          <div className="text-center space-y-2 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {t('receipt.footer', language)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('receipt.electronicNote', language)}
            </p>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
