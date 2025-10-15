import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Download, Upload, CloudDownload } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import * as XLSX from 'xlsx';

interface BackupDialogProps {
  open: boolean;
  onClose: () => void;
  section: string;
}

export function BackupDialog({ open, onClose, section }: BackupDialogProps) {
  const { properties, clients, contracts, payments, maintenanceRequests } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);

  const getSectionTitle = (section: string) => {
    switch(section) {
      case "properties": return "العقارات";
      case "clients": return "العملاء";
      case "contracts": return "العقود";
      case "payments": return "المدفوعات";
      case "maintenance": return "الصيانة";
      default: return "البيانات";
    }
  };

  const getAllData = () => {
    return {
      properties,
      clients,
      contracts,
      payments,
      maintenanceRequests,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };
  };

  const createFullBackup = () => {
    setIsProcessing(true);
    try {
      const data = getAllData();
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_complete_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating backup:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const createExcelBackup = () => {
    setIsProcessing(true);
    try {
      const wb = XLSX.utils.book_new();
      
      // إضافة ورقة العقارات
      const propertiesSheet = XLSX.utils.json_to_sheet(properties);
      XLSX.utils.book_append_sheet(wb, propertiesSheet, "العقارات");
      
      // إضافة ورقة العملاء
      const clientsSheet = XLSX.utils.json_to_sheet(clients);
      XLSX.utils.book_append_sheet(wb, clientsSheet, "العملاء");
      
      // إضافة ورقة العقود
      const contractsSheet = XLSX.utils.json_to_sheet(contracts);
      XLSX.utils.book_append_sheet(wb, contractsSheet, "العقود");
      
      // إضافة ورقة المدفوعات
      const paymentsSheet = XLSX.utils.json_to_sheet(payments);
      XLSX.utils.book_append_sheet(wb, paymentsSheet, "المدفوعات");
      
      // إضافة ورقة الصيانة
      const maintenanceSheet = XLSX.utils.json_to_sheet(maintenanceRequests);
      XLSX.utils.book_append_sheet(wb, maintenanceSheet, "الصيانة");
      
      XLSX.writeFile(wb, `backup_excel_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Error creating Excel backup:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadToCloud = () => {
    alert("رفع النسخة الاحتياطية للكلاود - سيتم ربطه بالاستضافة لاحقاً");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            النسخ الاحتياطي - {getSectionTitle(section)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">خيارات النسخ الاحتياطي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={createFullBackup}
                disabled={isProcessing}
                className="w-full justify-start"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                نسخة احتياطية كاملة (JSON)
              </Button>

              <Button
                onClick={createExcelBackup}
                disabled={isProcessing}
                className="w-full justify-start"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                نسخة احتياطية Excel
              </Button>

              <Button
                onClick={uploadToCloud}
                disabled={isProcessing}
                className="w-full justify-start"
                variant="outline"
              >
                <CloudDownload className="h-4 w-4 mr-2" />
                رفع للكلاود
              </Button>
            </CardContent>
          </Card>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">ملاحظات هامة:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>النسخة الاحتياطية تشمل جميع البيانات</li>
              <li>احتفظ بالنسخ في مكان آمن</li>
              <li>يُنصح بعمل نسخة احتياطية أسبوعياً</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}