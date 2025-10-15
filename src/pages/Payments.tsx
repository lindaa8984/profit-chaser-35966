import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Shield, Upload, Calendar } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { PaymentDetailsDialog } from "@/components/PaymentDetailsDialog";
import { PaymentExportDialog } from "@/components/PaymentExportDialog";
import { PaymentEditDialog } from "@/components/PaymentEditDialog";
import { BackupDialog } from "@/components/BackupDialog";
import { IntelligentImportDialog } from "@/components/IntelligentImportDialog";

import { GroupedPaymentCard } from "@/components/GroupedPaymentCard";
import { useToast } from "@/components/ui/use-toast";

export default function Payments() {
  const { payments, contracts, clients, properties, currency, confirmPayment, updatePayment } = useApp();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchByDate, setSearchByDate] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showChequeSearch, setShowChequeSearch] = useState(false);
  const [chequeSearchTerm, setChequeSearchTerm] = useState("");

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'pending') {
      setFilterStatus('pending');
      toast({
        title: "المدفوعات المعلقة",
        description: "تم عرض المدفوعات المعلقة فقط",
      });
    }
  }, [searchParams, toast]);

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

  const getPropertyName = (contractId: number | string) => {
    const contract = contracts.find(c => c.id === (typeof contractId === 'number' ? contractId : parseInt(contractId.slice(0, 8), 16)));
    if (!contract) return "عقار غير محدد";
    const property = properties.find(p => p.id === contract.propertyId);
    return property ? property.name : "عقار غير موجود";
  };

  // دالة مساعدة للبحث بالتاريخ مع صيغ مختلفة
  const matchesDateFlexible = (dateToSearch: string, searchQuery: string) => {
    if (!searchQuery) return true;
    
    // إزالة المسافات والحروف الزائدة
    const cleanSearch = searchQuery.trim().replace(/[^\d/-]/g, '');
    
    // تحويل التاريخ لصيغ مختلفة للمقارنة
    const date = new Date(dateToSearch);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // صيغ مختلفة للتاريخ
    const formats = [
      dateToSearch, // YYYY-MM-DD
      `${day}/${month}/${year}`, // DD/MM/YYYY
      `${month}/${day}/${year}`, // MM/DD/YYYY
      `${day}-${month}-${year}`, // DD-MM-YYYY
      `${month}-${day}-${year}`, // MM-DD-YYYY
      `${day}/${month}`, // DD/MM
      `${month}/${day}`, // MM/DD
      `${day}-${month}`, // DD-MM
      `${month}-${day}`, // MM-DD
      `0${month}` === cleanSearch ? true : false, // للشهر فقط مثل "09"
      month === cleanSearch ? true : false, // للشهر بدون صفر
    ];
    
    return formats.some(format => 
      typeof format === 'string' && format.includes(cleanSearch)
    ) || formats.includes(true);
  };

  const filteredPayments = payments.filter(payment => {
    // إذا كان البحث في الشيكات مفعل، أظهر الشيكات فقط
    if (showChequeSearch) {
      if (payment.paymentMethod !== 'cheque') return false;
      
      // بحث في الشيكات برقم الشيك أو التاريخ مع صيغ مرنة
      const matchesChequeSearch = !chequeSearchTerm || 
        (payment.checkNumber && payment.checkNumber.includes(chequeSearchTerm)) ||
        matchesDateFlexible(payment.dueDate, chequeSearchTerm) ||
        (payment.paidDate && matchesDateFlexible(payment.paidDate, chequeSearchTerm));
      
      const matchesFilter = filterStatus === "all" || payment.status === filterStatus;
      return matchesChequeSearch && matchesFilter;
    }
    
    // البحث العادي في جميع المدفوعات
    const clientName = getClientName(payment.contractId);
    const matchesSearch = 
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.dueDate.includes(searchTerm) ||
      (payment.paidDate && payment.paidDate.includes(searchTerm));
    
    const matchesDateFilter = !searchByDate || 
      payment.dueDate === searchByDate ||
      (payment.paidDate && payment.paidDate === searchByDate);
    
    const matchesFilter = filterStatus === "all" || payment.status === filterStatus;
    return matchesSearch && matchesFilter && matchesDateFilter;
  });

  // تجميع الدفعات حسب العقد
  const groupedPayments = filteredPayments.reduce((acc, payment) => {
    const contractId = payment.contractId;
    if (!acc[contractId]) {
      acc[contractId] = [];
    }
    acc[contractId].push(payment);
    return acc;
  }, {} as Record<number, typeof filteredPayments>);


  const handleView = (payment: any) => {
    setSelectedPayment(payment);
  };

  const handleEdit = (payment: any) => {
    setEditingPayment(payment);
  };

  const handleConfirmPayment = (payment: any) => {
    confirmPayment(payment.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المدفوعات</h1>
          <p className="text-muted-foreground">إدارة مدفوعات الإيجارات</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              setShowChequeSearch(!showChequeSearch);
              if (showChequeSearch) {
                setChequeSearchTerm("");
              }
              setSearchTerm("");
              setSearchByDate("");
            }}
            variant={showChequeSearch ? "default" : "outline"}
            className={showChequeSearch ? "bg-gradient-primary" : ""}
          >
            <Search className="h-4 w-4 mr-1" />
            {showChequeSearch ? "إظهار الكل" : "بحث الشيكات"}
          </Button>
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
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="shadow-soft">
        <CardContent className="p-6">
          {showChequeSearch ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Search className="h-4 w-4" />
                بحث في الشيكات فقط
              </div>
              <div className="flex gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="رقم الشيك أو التاريخ (YYYY-MM-DD)..."
                    value={chequeSearchTerm}
                    onChange={(e) => setChequeSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background min-w-[140px]"
                >
                  <option value="all">جميع الشيكات</option>
                  <option value="pending">معلق</option>
                  <option value="paid">مدفوع</option>
                  <option value="overdue">متأخر</option>
                  <option value="scheduled">مجدول</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في المدفوعات (العميل أو التاريخ)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative min-w-[180px]">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="البحث بالتاريخ..."
                  value={searchByDate}
                  onChange={(e) => setSearchByDate(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background min-w-[140px]"
              >
                <option value="all">جميع المدفوعات</option>
                <option value="pending">معلق</option>
                <option value="paid">مدفوع</option>
                <option value="overdue">متأخر</option>
                <option value="scheduled">مجدول</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grouped Payments */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Object.entries(groupedPayments).map(([contractId, contractPayments]) => (
          <GroupedPaymentCard
            key={contractId}
            contractId={parseInt(contractId)}
            clientName={getClientName(parseInt(contractId))}
            propertyName={getPropertyName(parseInt(contractId))}
            payments={contractPayments}
            currency={currency}
            currencySymbols={currencySymbols}
            onViewPayment={handleView}
            onEditPayment={handleEdit}
            onConfirmPayment={handleConfirmPayment}
          />
        ))}
      </div>

      {Object.keys(groupedPayments).length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">لا توجد مدفوعات مطابقة للبحث</p>
        </div>
      )}

      {/* Payment Details Dialog */}
      {selectedPayment && (
        <PaymentDetailsDialog 
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      )}

      {/* Export Dialog */}
      <PaymentExportDialog 
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      {/* Backup Dialog */}
      <BackupDialog 
        open={showBackupDialog}
        onClose={() => setShowBackupDialog(false)}
        section="payments"
      />

      {/* Intelligent Import Dialog */}
      <IntelligentImportDialog 
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />

      {/* Payment Edit Dialog */}
      <PaymentEditDialog 
        payment={editingPayment}
        open={!!editingPayment}
        onClose={() => setEditingPayment(null)}
      />

    </div>
  );
}