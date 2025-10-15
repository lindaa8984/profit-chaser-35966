import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Cloud, FileSpreadsheet } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import * as XLSX from 'xlsx';

interface PropertyExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PropertyExportDialog({ open, onClose }: PropertyExportDialogProps) {
  const { properties, currency } = useApp();
  const [isExporting, setIsExporting] = useState(false);

  const currencySymbols = {
    SAR: "ر.س",
    USD: "USD",
    EUR: "€",
    AED: "د.إ"
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case "available": return "متاح";
      case "rented": return "مؤجر";
      case "maintenance": return "صيانة";
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case "residential": return "سكني";
      case "commercial": return "تجاري";
      case "industrial": return "صناعي";
      default: return type;
    }
  };

  const prepareExportData = () => {
    return properties.map(property => ({
      "اسم العقار": property.name,
      "الموقع": property.location,
      "النوع": getTypeLabel(property.type),
      "الحالة": getStatusLabel(property.status),
      "إجمالي الوحدات": property.totalUnits,
      "الوحدات المتاحة": property.availableUnits
    }));
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const data = prepareExportData();
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "العقارات");
      XLSX.writeFile(wb, `properties_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            تصدير العقارات
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