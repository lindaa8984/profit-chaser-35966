import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Building2, MapPin, Download, Shield, Upload } from "lucide-react";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyDetailsDialog } from "@/components/PropertyDetailsDialog";
import { PropertyExportDialog } from "@/components/PropertyExportDialog";
import { BackupDialog } from "@/components/BackupDialog";
import { IntelligentImportDialog } from "@/components/IntelligentImportDialog";
import { UnitsManagementDialog } from "@/components/UnitsManagementDialog";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

export default function Properties() {
  const { properties, currency, deleteProperty } = useApp();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const currencySymbols = {
    AED: "د.إ",
    SAR: "ر.س",
    USD: "USD", 
    EUR: "€",
    OMR: "ر.ع",
    QAR: "ر.ق"
  };

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "available": return <Badge className="bg-success/10 text-success border-success/20">متاح</Badge>;
      case "rented": return <Badge className="bg-warning/10 text-warning border-warning/20">مؤجر</Badge>;
      case "maintenance": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">صيانة</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch(type) {
      case "residential": return "سكني";
      case "commercial": return "تجاري";
      case "industrial": return "صناعي";
      default: return type;
    }
  };

  const handleDeleteProperty = (propertyId: number) => {
    deleteProperty(propertyId);
    toast({
      title: "تم الحذف بنجاح",
      description: "تم حذف العقار بنجاح",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">العقارات</h1>
          <p className="text-muted-foreground">إدارة محفظة العقارات</p>
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
          <PropertyForm />
        </div>
      </div>

      {/* Search */}
      <Card className="shadow-soft">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في العقارات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {filteredProperties.map((property) => (
          <Card key={property.id} className="shadow-soft hover:shadow-elegant transition-shadow duration-300 group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors">
                    {property.name}
                  </CardTitle>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    {property.location}
                  </div>
                  <div className="flex gap-1 mt-2">
                    {getStatusBadge(property.status)}
                    <Badge variant="outline" className="text-xs">{getTypeBadge(property.type)}</Badge>
                  </div>
                </div>
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="text-muted-foreground text-xs">الوحدات المتاحة</p>
                <p className="font-medium text-success text-base">{property.availableUnits} من {property.totalUnits}</p>
              </div>
              
              <div className="space-y-2">
                <UnitsManagementDialog 
                  property={property}
                  trigger={
                    <Button variant="outline" size="sm" className="w-full text-xs h-7">
                      <Shield className="h-3 w-3 mr-1" />
                      إدارة الوحدات ({property.units?.length || property.totalUnits})
                    </Button>
                  }
                />
                
                <div className="flex justify-between items-center gap-1">
                  <PropertyDetailsDialog 
                    property={property} 
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1 text-xs h-7">
                        عرض
                      </Button>
                    }
                  />
                  <PropertyDetailsDialog 
                    property={property} 
                    isEdit={true}
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1 text-xs h-7">
                        تعديل
                      </Button>
                    }
                  />
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDeleteProperty(property.id)}
                    className="flex-1 text-xs h-7"
                  >
                    حذف
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">لا توجد عقارات مطابقة للبحث</p>
        </div>
      )}

      {/* Export Dialog */}
      <PropertyExportDialog 
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      {/* Backup Dialog */}
      <BackupDialog 
        open={showBackupDialog}
        onClose={() => setShowBackupDialog(false)}
        section="properties"
      />

      {/* Intelligent Import Dialog */}
      <IntelligentImportDialog 
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />
    </div>
  );
}