import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Cloud, FileSpreadsheet } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import * as XLSX from 'xlsx';
import { formatDateDDMMYYYY } from "@/lib/utils";

interface ContractExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ContractExportDialog({ open, onClose }: ContractExportDialogProps) {
  const { contracts, properties, clients, payments, currency } = useApp();
  const [isExporting, setIsExporting] = useState(false);

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

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "عميل غير موجود";
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
    return contracts.map(contract => {
      const contractPayments = payments.filter(p => p.contractId === contract.id);
      const paidPayments = contractPayments.filter(p => p.status === 'paid');
      const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
      
      return {
        "اسم العميل": getClientName(contract.clientId),
        "العقار المرتبط": getPropertyName(contract.propertyId),
        "قيمة الإيجار": `${contract.monthlyRent.toLocaleString()} ${currencySymbols[currency as keyof typeof currencySymbols]}`,
        "تاريخ البداية": formatDateDDMMYYYY(contract.startDate),
        "تاريخ النهاية": formatDateDDMMYYYY(contract.endDate),
        "طريقة الدفع": getPaymentMethodLabel(contract.paymentMethod),
        "عدد الدفعات": contract.numberOfPayments || "غير محدد",
        "رقم الوحدة": contract.unitNumber || "غير محدد",
        "عدد الدفعات المدفوعة": paidPayments.length,
        "إجمالي المبلغ المدفوع": `${totalPaid.toLocaleString()} ${currencySymbols[currency as keyof typeof currencySymbols]}`
      };
    });
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const data = prepareExportData();
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "العقود");
      XLSX.writeFile(wb, `contracts_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      // سيتم إضافة مكتبة PDF لاحقاً
      console.log("PDF export functionality will be implemented");
      // Placeholder for PDF export
      alert("سيتم إضافة تصدير PDF قريباً");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCloud = () => {
    // Placeholder for cloud export - user will add their code here
    console.log("Cloud export - user will implement this");
    alert("تصدير الكلاود - سيتم ربطه بالاستضافة لاحقاً");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            تصدير العقود
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