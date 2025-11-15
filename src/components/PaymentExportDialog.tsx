import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Cloud, FileSpreadsheet } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import * as XLSX from 'xlsx';
import { formatDateDDMMYYYY } from "@/lib/utils";

interface PaymentExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PaymentExportDialog({ open, onClose }: PaymentExportDialogProps) {
  const { payments, contracts, clients, currency } = useApp();
  const [isExporting, setIsExporting] = useState(false);

  const currencySymbols = {
    SAR: "ر.س",
    USD: "USD",
    EUR: "€",
    AED: "د.إ"
  };

  const getClientName = (contractId: number | string) => {
    const contract = contracts.find(c => c.id === (typeof contractId === 'number' ? contractId : parseInt(contractId.slice(0, 8), 16)));
    if (!contract) return "عقد غير موجود";
    const client = clients.find(c => c.id === contract.clientId);
    return client ? client.name : "عميل غير موجود";
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case "paid": return "مدفوع";
      case "pending": return "مجدول";
      case "overdue": return "متأخر";
      default: return status;
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

  const prepareExportData = () => {
    return payments.map(payment => ({
      "اسم العميل": getClientName(payment.contractId),
      "المبلغ": `${payment.amount.toLocaleString()} ${currencySymbols[currency as keyof typeof currencySymbols]}`,
      "الحالة": getStatusLabel(payment.status),
      "تاريخ الاستحقاق": formatDateDDMMYYYY(payment.dueDate),
      "تاريخ الدفع": payment.paidDate ? formatDateDDMMYYYY(payment.paidDate) : "غير مدفوع",
      "طريقة الدفع": getPaymentMethodLabel(payment.paymentMethod)
    }));
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const data = prepareExportData();
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "المدفوعات");
      XLSX.writeFile(wb, `payments_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      alert("سيتم إضافة تصدير PDF قريباً");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCloud = () => {
    console.log("Cloud sync - user will implement this");
    alert("مزامنة الكلاود - سيتم ربطه بالاستضافة لاحقاً");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            تصدير المدفوعات
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">خيارات التصدير</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={exportToExcel}
                disabled={isExporting}
                className="w-full justify-start"
                variant="outline"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                تصدير إلى Excel
              </Button>

              <Button
                onClick={exportToPDF}
                disabled={isExporting}
                className="w-full justify-start"
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                تصدير إلى PDF
              </Button>

              <Button
                onClick={exportToCloud}
                disabled={isExporting}
                className="w-full justify-start"
                variant="outline"
              >
                <Cloud className="h-4 w-4 mr-2" />
                مزامنة
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}