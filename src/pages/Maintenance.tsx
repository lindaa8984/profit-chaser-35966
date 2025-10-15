import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Wrench, Building2, Calendar, Plus, Download, Shield, Upload } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { MaintenanceExportDialog } from "@/components/MaintenanceExportDialog";
import { BackupDialog } from "@/components/BackupDialog";
import { IntelligentImportDialog } from "@/components/IntelligentImportDialog";

export default function Maintenance() {
  const { maintenanceRequests, properties } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const getPropertyName = (propertyId: number) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? property.name : "عقار غير موجود";
  };

  const filteredRequests = maintenanceRequests.filter(request => {
    const propertyName = getPropertyName(request.propertyId);
    return propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           request.description.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "pending": return <Badge className="bg-warning/10 text-warning border-warning/20">معلق</Badge>;
      case "in_progress": return <Badge className="bg-primary/10 text-primary border-primary/20">قيد التنفيذ</Badge>;
      case "completed": return <Badge className="bg-success/10 text-success border-success/20">مكتمل</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case "high": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">عالية</Badge>;
      case "medium": return <Badge className="bg-warning/10 text-warning border-warning/20">متوسطة</Badge>;
      case "low": return <Badge className="bg-muted/10 text-muted-foreground border-muted/20">منخفضة</Badge>;
      default: return <Badge>{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الصيانة</h1>
          <p className="text-muted-foreground">إدارة طلبات الصيانة</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowExportDialog(true)}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-1" />
            تصدير
          </Button>
          <Button 
            onClick={() => setShowBackupDialog(true)}
            variant="outline"
          >
            <Shield className="h-4 w-4 mr-1" />
            نسخ احتياطي
          </Button>
          <Button 
            onClick={() => setShowImportDialog(true)}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-1" />
            استيراد
          </Button>
          <Button className="bg-gradient-primary shadow-elegant">
            <Plus className="h-4 w-4 mr-2" />
            طلب صيانة جديد
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="shadow-soft">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في طلبات الصيانة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Requests Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="shadow-soft hover:shadow-elegant transition-shadow duration-300 group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {getPropertyName(request.propertyId)}
                  </CardTitle>
                  <div className="flex gap-2 mt-2">
                    {getStatusBadge(request.status)}
                    {getPriorityBadge(request.priority)}
                  </div>
                </div>
                <Wrench className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">الوصف</p>
                <p className="font-medium">{request.description}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                تاريخ الطلب: {request.requestDate}
              </div>
              {request.completedDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  تاريخ الإنجاز: {request.completedDate}
                </div>
              )}
              <div className="flex gap-2 pt-3">
                <Button variant="outline" size="sm" className="flex-1">
                  عرض التفاصيل
                </Button>
                {request.status !== "completed" && (
                  <Button size="sm" className="flex-1 bg-gradient-success">
                    تحديث الحالة
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">لا توجد طلبات صيانة مطابقة للبحث</p>
        </div>
      )}

      {/* Export Dialog */}
      <MaintenanceExportDialog 
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      {/* Backup Dialog */}
      <BackupDialog 
        open={showBackupDialog}
        onClose={() => setShowBackupDialog(false)}
        section="maintenance"
      />

      {/* Intelligent Import Dialog */}
      <IntelligentImportDialog 
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />
    </div>
  );
}