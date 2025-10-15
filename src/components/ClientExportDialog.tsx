import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Cloud, FileSpreadsheet } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import * as XLSX from 'xlsx';

interface ClientExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ClientExportDialog({ open, onClose }: ClientExportDialogProps) {
  const { clients, properties } = useApp();
  const [isExporting, setIsExporting] = useState(false);

  const getTypeLabel = (type: string) => {
    switch(type) {
      case "tenant": return "مستأجر";
      case "owner": return "مالك";
      case "buyer": return "مشتري";
      default: return type;
    }
  };

  const getPropertyNames = (propertyIds: number[]) => {
    return propertyIds.map(id => {
      const property = properties.find(p => p.id === id);
      return property ? property.name : `عقار ${id}`;
    }).join("، ");
  };

  const prepareExportData = () => {
    return clients.map(client => ({
      "اسم العميل": client.name,
      "البريد الإلكتروني": client.email,
      "رقم الهاتف": client.phone,
      "النوع": getTypeLabel(client.type),
      "العقارات المرتبطة": getPropertyNames(client.properties)
    }));
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const data = prepareExportData();
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "العملاء");
      XLSX.writeFile(wb, `clients_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            تصدير العملاء
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