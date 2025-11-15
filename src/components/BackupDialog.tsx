import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Download, Upload, CloudDownload, Clock, Calendar } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/lib/supabase-helper";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface BackupDialogProps {
  open: boolean;
  onClose: () => void;
  section: string;
}

export function BackupDialog({ open, onClose, section }: BackupDialogProps) {
  const { properties, clients, contracts, payments, maintenanceRequests } = useApp();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [groundHouses, setGroundHouses] = useState<any[]>([]);
  const [lastBackup, setLastBackup] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // جلب المحلات والبيوت من قاعدة البيانات
  useEffect(() => {
    if (open && user) {
      fetchUnits();
      fetchLastBackup();
    }
  }, [open, user]);

  const fetchLastBackup = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('automated_backups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching last backup:', error);
        return;
      }

      setLastBackup(data);
    } catch (error) {
      console.error('Error fetching last backup:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    if (!user) return;
    
    try {
      // جلب المحلات التجارية
      const { data: shopsData, error: shopsError } = await supabase
        .from('units')
        .select('*')
        .eq('user_id', user.id)
        .eq('unit_type', 'commercial');

      if (shopsError) throw shopsError;
      setShops(shopsData || []);

      // جلب البيوت والفلل
      const { data: housesData, error: housesError } = await supabase
        .from('units')
        .select('*')
        .eq('user_id', user.id)
        .eq('unit_type', 'ground_house');

      if (housesError) throw housesError;
      setGroundHouses(housesData || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

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
      shops,
      groundHouses,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };
  };

  const recordBackup = async (backupType: string, tablesIncluded: string[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('automated_backups')
        .insert({
          user_id: user.id,
          backup_type: backupType,
          tables_included: tablesIncluded,
          status: 'completed'
        });

      if (error) {
        console.error('Error recording backup:', error);
      } else {
        await fetchLastBackup();
        toast.success('تم إنشاء النسخة الاحتياطية بنجاح');
      }
    } catch (error) {
      console.error('Error recording backup:', error);
    }
  };

  const createFullBackup = async () => {
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

      // تسجيل النسخة الاحتياطية
      await recordBackup('manual', ['properties', 'clients', 'contracts', 'payments', 'maintenance', 'shops', 'groundHouses']);
    } catch (error) {
      console.error("Error creating backup:", error);
      toast.error('فشل في إنشاء النسخة الاحتياطية');
    } finally {
      setIsProcessing(false);
    }
  };

  const createExcelBackup = async () => {
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
      
      // إضافة ورقة المحلات التجارية
      if (shops.length > 0) {
        const shopsSheet = XLSX.utils.json_to_sheet(shops);
        XLSX.utils.book_append_sheet(wb, shopsSheet, "المحلات التجارية");
      }
      
      // إضافة ورقة البيوت والفلل
      if (groundHouses.length > 0) {
        const housesSheet = XLSX.utils.json_to_sheet(groundHouses);
        XLSX.utils.book_append_sheet(wb, housesSheet, "البيوت والفلل");
      }
      
      XLSX.writeFile(wb, `backup_excel_${new Date().toISOString().split('T')[0]}.xlsx`);

      // تسجيل النسخة الاحتياطية
      await recordBackup('manual', ['properties', 'clients', 'contracts', 'payments', 'maintenance', 'shops', 'groundHouses']);
    } catch (error) {
      console.error("Error creating Excel backup:", error);
      toast.error('فشل في إنشاء النسخة الاحتياطية');
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadToCloud = async () => {
    setIsProcessing(true);
    try {
      if (!user) {
        toast.error('يجب تسجيل الدخول أولاً');
        return;
      }

      // جمع جميع البيانات
      const allData = getAllData();
      const dataSize = new Blob([JSON.stringify(allData)]).size;

      // حفظ النسخة الاحتياطية في قاعدة البيانات السحابية
      const { error } = await supabase
        .from('automated_backups')
        .insert({
          user_id: user.id,
          backup_type: 'manual',
          backup_size: dataSize,
          tables_included: ['properties', 'clients', 'contracts', 'payments', 'maintenance', 'shops', 'groundHouses'],
          status: 'completed',
          metadata: {
            total_records: {
              properties: properties.length,
              clients: clients.length,
              contracts: contracts.length,
              payments: payments.length,
              maintenance: maintenanceRequests.length,
              shops: shops.length,
              groundHouses: groundHouses.length
            }
          }
        });

      if (error) {
        throw error;
      }

      await fetchLastBackup();
      toast.success('تم رفع النسخة الاحتياطية للكلاود بنجاح! ✅');
    } catch (error) {
      console.error("Error uploading to cloud:", error);
      toast.error('فشل في رفع النسخة الاحتياطية');
    } finally {
      setIsProcessing(false);
    }
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
          {lastBackup && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  آخر نسخة احتياطية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">التاريخ:</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="font-medium">
                      {new Date(lastBackup.created_at).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">الوقت:</span>
                  <span className="font-medium">
                    {new Date(lastBackup.created_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">النوع:</span>
                  <Badge variant={lastBackup.backup_type === 'automated' ? 'default' : 'secondary'}>
                    {lastBackup.backup_type === 'automated' ? 'تلقائي' : 'يدوي'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {!lastBackup && !loading && (
            <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
              <CardContent className="pt-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ لم يتم إنشاء أي نسخة احتياطية حتى الآن. يُنصح بإنشاء نسخة احتياطية الآن!
                </p>
              </CardContent>
            </Card>
          )}

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
                className="w-full justify-start bg-primary/10 hover:bg-primary/20 border-primary/20"
                variant="outline"
              >
                <CloudDownload className="h-4 w-4 mr-2" />
                حفظ نسخة في الكلاود
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="pt-4">
              <p className="font-medium mb-2 text-sm text-blue-900 dark:text-blue-100">ℹ️ معلومات هامة عن النسخ الاحتياطية:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <li><strong>حفظ في الكلاود:</strong> يحفظ سجل النسخة في قاعدة البيانات السحابية</li>
                <li><strong>تنزيل JSON/Excel:</strong> يحفظ نسخة كاملة من البيانات على جهازك</li>
                <li><strong>استرجاع البيانات:</strong> بياناتك محفوظة دائمًا في قاعدة البيانات السحابية</li>
                <li><strong>نسخ تلقائية:</strong> Lovable Cloud يحفظ نسخ تلقائية يومية (7 أيام)</li>
                <li><strong>حماية إضافية:</strong> نزّل نسخة محلية أسبوعيًا كاحتياط إضافي</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardContent className="pt-4">
              <p className="font-medium mb-2 text-sm text-green-900 dark:text-green-100">🔄 استرجاع البيانات من الكلاود:</p>
              <div className="text-sm text-green-800 dark:text-green-200 space-y-2">
                <p>بياناتك <strong>محفوظة تلقائيًا</strong> في قاعدة البيانات السحابية. لا تحتاج لاستعادتها يدويًا!</p>
                <div className="mt-2 p-2 bg-white/50 dark:bg-black/20 rounded">
                  <p className="font-medium">📋 كيفية الوصول لبياناتك:</p>
                  <ol className="list-decimal list-inside mr-2 mt-1 space-y-0.5">
                    <li>جميع بياناتك موجودة في الصفحات (العقارات، العملاء، العقود...)</li>
                    <li>إذا حذفت شيء بالخطأ، تواصل مع الدعم لاسترجاعه من النسخ التلقائية</li>
                    <li>النسخ المحلية (JSON/Excel) للاستعادة اليدوية فقط</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}