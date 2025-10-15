import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, User, Phone, Download, Shield, Upload } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { ClientForm } from "@/components/ClientForm";
import { ClientDetailsDialog } from "@/components/ClientDetailsDialog";
import { ClientExportDialog } from "@/components/ClientExportDialog";
import { BackupDialog } from "@/components/BackupDialog";
import { IntelligentImportDialog } from "@/components/IntelligentImportDialog";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const { clients, properties, deleteClient } = useApp();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadge = (type: string) => {
    switch(type) {
      case "tenant": return <Badge className="bg-primary/10 text-primary border-primary/20">مستأجر</Badge>;
      case "owner": return <Badge className="bg-accent/10 text-accent border-accent/20">مالك</Badge>;
      case "buyer": return <Badge className="bg-success/10 text-success border-success/20">مشتري</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  const handleDeleteClient = (clientId: number) => {
    deleteClient(clientId);
    toast({
      title: "تم الحذف بنجاح",
      description: "تم حذف العميل بنجاح",
    });
  };

  const getPropertyNames = (propertyIds: number[]) => {
    return propertyIds.map(id => {
      const property = properties.find(p => p.id === id);
      return property ? property.name : `عقار ${id}`;
    }).join("، ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">العملاء</h1>
          <p className="text-muted-foreground">إدارة قاعدة بيانات العملاء</p>
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
          <ClientForm />
        </div>
      </div>

      {/* Search */}
      <Card className="shadow-soft">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في العملاء..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {filteredClients.map((client) => (
          <Card key={client.id} className="shadow-soft hover:shadow-elegant transition-shadow duration-300 group h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors">
                    {client.name}
                  </CardTitle>
                  <div className="mt-2">
                    {getTypeBadge(client.type)}
                  </div>
                </div>
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                {client.phone}
              </div>
              
              <div className="text-sm min-h-[3rem] flex flex-col justify-start">
                {client.properties.length > 0 ? (
                  <>
                    <p className="text-muted-foreground text-xs">العقارات</p>
                    <p className="font-medium text-primary text-base">{getPropertyNames(client.properties)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-xs">العقارات</p>
                    <p className="text-muted-foreground text-sm">لا توجد عقارات</p>
                  </>
                )}
              </div>
              
               <div className="flex justify-between items-center gap-1 pt-3 border-t border-border mt-auto">
                 <ClientDetailsDialog 
                   client={client} 
                   trigger={
                     <Button variant="outline" size="sm" className="flex-1 text-xs h-7">
                       عرض
                     </Button>
                   }
                 />
                 <ClientDetailsDialog 
                   client={client} 
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
                    onClick={() => handleDeleteClient(client.id)}
                    className="flex-1 text-xs h-7"
                  >
                    حذف
                  </Button>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">لا توجد عملاء مطابقين للبحث</p>
        </div>
      )}


      {/* Export Dialog */}
      <ClientExportDialog 
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      {/* Backup Dialog */}
      <BackupDialog 
        open={showBackupDialog}
        onClose={() => setShowBackupDialog(false)}
        section="clients"
      />

      {/* Intelligent Import Dialog */}
      <IntelligentImportDialog 
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />
    </div>
  );
}