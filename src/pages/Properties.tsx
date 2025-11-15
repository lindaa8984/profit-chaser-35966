import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Building2, MapPin, Download, Shield, Upload, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyDetailsDialog } from "@/components/PropertyDetailsDialog";
import { PropertyExportDialog } from "@/components/PropertyExportDialog";
import { BackupDialog } from "@/components/BackupDialog";
import { IntelligentImportDialog } from "@/components/IntelligentImportDialog";
import { UnitsManagementDialog } from "@/components/UnitsManagementDialog";
import { PropertyDeleteButton } from "@/components/PropertyDeleteButton";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/translations";

export default function Properties() {
  const { properties, currency, contracts, language } = useApp();
  const { toast } = useToast();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [propertyFilter, setPropertyFilter] = useState<string>("all");

  // حساب الوحدات المتاحة والمشغولة بناءً على العقود النشطة فقط (مصدر الحقيقة الوحيد)
  const getPropertyActualUnits = (property: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // استخدام عدد الوحدات الفعلية (المضافة) بدلاً من totalUnits
    const actualTotalUnits = property.units?.length || property.totalUnits;
    
    // الحصول على جميع العقود النشطة لهذا العقار
    const activeContracts = contracts.filter(c => {
      const endDate = new Date(c.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      return c.propertyId === property.id && 
        endDate >= today &&
        c.status !== 'terminated';
    });

    // الوحدات المشغولة = عدد العقود النشطة (مصدر الحقيقة)
    const occupiedUnits = activeContracts.length;
    const availableUnits = Math.max(0, actualTotalUnits - occupiedUnits);

    return {
      availableUnits,
      occupiedUnits,
      totalUnits: actualTotalUnits
    };
  };

  const currencySymbols = {
    AED: "د.إ",
    SAR: "ر.س",
    USD: "USD", 
    EUR: "€",
    OMR: "ر.ع",
    QAR: "ر.ق"
  };

  const filteredProperties = properties.filter(property => {
    const matchesFilter = propertyFilter === "all" || property.id.toString() === propertyFilter;
    return matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "available": return <Badge className="bg-success/10 text-success border-success/20">{t("properties.available", language)}</Badge>;
      case "rented": return <Badge className="bg-warning/10 text-warning border-warning/20">{t("properties.rented", language)}</Badge>;
      case "maintenance": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">{t("properties.maintenance", language)}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch(type) {
      case "residential": return t("properties.residential", language);
      case "commercial": return t("properties.commercial", language);
      case "industrial": return t("properties.industrial", language);
      default: return type;
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("properties.title", language)}</h1>
          <p className="text-muted-foreground">{t("properties.subtitle", language)}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 ml-1" />
              <SelectValue placeholder={t("properties.filterByProperty", language)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("properties.allProperties", language)}</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id.toString()}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowExportDialog(true)} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            {t("properties.export", language)}
          </Button>
          <Button 
            onClick={() => setShowImportDialog(true)}
            variant="outline"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-1" />
            {t("properties.import", language)}
          </Button>
          <PropertyForm />
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {filteredProperties.map((property) => {
          const actualUnits = getPropertyActualUnits(property);
          
          return (
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
                  <p className="text-muted-foreground text-xs">{t("dashboard.availableUnits", language)}</p>
                  <p className="font-medium text-success text-base">{actualUnits.availableUnits} {t("properties.from", language)} {actualUnits.totalUnits}</p>
                </div>
              
              <div className="space-y-2">
                <UnitsManagementDialog 
                  property={property}
                  trigger={
                    <Button variant="outline" size="sm" className="w-full text-xs h-7">
                      <Shield className="h-3 w-3 mr-1" />
                      {t("properties.manageUnits", language)} ({property.units?.length || property.totalUnits})
                    </Button>
                  }
                />
                
                <div className="flex items-stretch gap-1">
                  <PropertyDetailsDialog 
                    property={property} 
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1 text-xs h-7">
                        {t("properties.view", language)}
                      </Button>
                    }
                  />
                  <PropertyDetailsDialog 
                    property={property} 
                    isEdit={true}
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1 text-xs h-7">
                        {t("properties.edit", language)}
                      </Button>
                    }
                  />
                  <PropertyDeleteButton property={property} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
        })}
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

      {/* Intelligent Import Dialog */}
      <IntelligentImportDialog 
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />
    </div>
  );
}
