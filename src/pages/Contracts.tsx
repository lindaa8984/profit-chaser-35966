import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Calendar, User, Edit2, Eye, RefreshCw, Download, Trash2, Upload, Filter, X } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { ContractForm } from "@/components/ContractForm";
import { ContractDetailsDialog } from "@/components/ContractDetailsDialog";
import { ContractExportDialog } from "@/components/ContractExportDialog";
import { ContractRenewalDialog } from "@/components/ContractRenewalDialog";

import { IntelligentImportDialog } from "@/components/IntelligentImportDialog";
import { formatDateDDMMYYYY } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

export default function Contracts() {
  const { contracts, properties, clients, currency, updateContract, deleteContract, terminateContract } = useApp();
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContract, setSelectedContract] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<number | null>(null);
  const [showCreateContractForm, setShowCreateContractForm] = useState(false);
  const [prefilledData, setPrefilledData] = useState<any>(null);

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'expiring') {
      setFilterType('expiring');
      toast({
        title: "العقود على وشك الانتهاء",
        description: "تم عرض العقود التي تنتهي خلال 30 يوم",
      });
    }
  }, [searchParams, toast]);

  // التحقق من وجود بيانات وحدة مُمررة من صفحة العقارات
  useEffect(() => {
    if (location.state && location.state.propertyId && location.state.unitNumber) {
      setPrefilledData({
        propertyId: location.state.propertyId,
        unitNumber: location.state.unitNumber,
        propertyName: location.state.propertyName
      });
      setShowCreateContractForm(true);
      toast({
        title: "إنشاء عقد جديد",
        description: `سيتم إنشاء عقد جديد للوحدة ${location.state.unitNumber} في ${location.state.propertyName}`,
      });
    }
  }, [location.state, toast]);

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

  const filteredContracts = contracts
    .filter(contract => {
      const propertyName = getPropertyName(contract.propertyId);
      const clientName = getClientName(contract.clientId);
      const matchesSearch = propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             clientName.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFilter = true;
      if (filterType === 'expiring') {
        const endDate = new Date(contract.endDate);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        matchesFilter = diffDays <= 30 && diffDays > 0 && contract.status !== 'terminated';
      } else if (filterType === 'terminated') {
        matchesFilter = contract.status === 'terminated';
      } else if (filterType === 'active') {
        matchesFilter = contract.status !== 'terminated';
      }

      // فلترة حسب العقار المحدد
      let matchesProperty = true;
      if (selectedPropertyFilter !== null) {
        matchesProperty = contract.propertyId === selectedPropertyFilter;
      }
      
      return matchesSearch && matchesFilter && matchesProperty;
    })
    .sort((a, b) => {
      // ترتيب حسب رقم الوحدة
      if (!a.unitNumber || !b.unitNumber) return 0;
      
      // استخراج الأرقام من رقم الوحدة
      const numA = parseInt(a.unitNumber.replace(/[^0-9]/g, '')) || 0;
      const numB = parseInt(b.unitNumber.replace(/[^0-9]/g, '')) || 0;
      
      return numA - numB;
    });

  const getPaymentScheduleLabel = (schedule: string) => {
    const numPayments = parseInt(schedule);
    if (!isNaN(numPayments)) {
      return numPayments === 1 ? "دفعة واحدة" : 
             numPayments === 2 ? "دفعتين" : 
             `${numPayments} دفعات`;
    }
    // للتوافق مع البيانات القديمة
    switch(schedule) {
      case "monthly": return "شهري";
      case "quarterly": return "ربع سنوي";
      case "semi_annual": return "نصف سنوي";
      case "annually": return "سنوي";
      default: return schedule;
    }
  };

  const handleEdit = (contract: any) => {
    setSelectedContract(contract);
    setIsEditMode(true);
  };

  const handleView = (contract: any) => {
    setSelectedContract(contract);
    setIsEditMode(false);
  };

  const handleRenew = (contract: any) => {
    setSelectedContract(contract);
    setShowRenewalDialog(true);
  };

  const handleTerminate = async (contract: any) => {
    try {
      await terminateContract(contract.id);
    } catch (error) {
      // Error is already handled in terminateContract
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">العقود</h1>
          <p className="text-muted-foreground">إدارة عقود الإيجار والبيع</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              variant="outline"
            >
              <Filter className="h-4 w-4 mr-1" />
              {filterType === 'all' ? 'جميع العقود' : 
               filterType === 'active' ? 'العقود النشطة' : 
               filterType === 'expiring' ? 'على وشك الانتهاء' : 
               'العقود المنتهية'}
            </Button>
            {showFilterDropdown && (
              <div className="absolute left-0 mt-2 w-48 bg-background border border-border rounded-md shadow-lg z-50">
                <button
                  onClick={() => {
                    setFilterType('all');
                    setShowFilterDropdown(false);
                  }}
                  className="w-full text-right px-4 py-2 hover:bg-accent transition-colors"
                >
                  جميع العقود
                </button>
                <button
                  onClick={() => {
                    setFilterType('active');
                    setShowFilterDropdown(false);
                  }}
                  className="w-full text-right px-4 py-2 hover:bg-accent transition-colors"
                >
                  العقود النشطة
                </button>
                <button
                  onClick={() => {
                    setFilterType('expiring');
                    setShowFilterDropdown(false);
                  }}
                  className="w-full text-right px-4 py-2 hover:bg-accent transition-colors"
                >
                  على وشك الانتهاء
                </button>
                <button
                  onClick={() => {
                    setFilterType('terminated');
                    setShowFilterDropdown(false);
                  }}
                  className="w-full text-right px-4 py-2 hover:bg-accent transition-colors"
                >
                  العقود المنتهية
                </button>
              </div>
            )}
          </div>
          <Button 
            onClick={() => setShowExportDialog(true)}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-1" />
            تصدير
          </Button>
          <Button 
            onClick={() => setShowImportDialog(true)}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-1" />
            استيراد
          </Button>
          <ContractForm
            prefilledData={prefilledData}
            onClose={() => {
              setShowCreateContractForm(false);
              setPrefilledData(null);
            }}
          />
        </div>
      </div>

      {/* Search and Property Filter */}
      <Card className="shadow-soft">
        <CardContent className="p-6">
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في العقود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 items-center min-w-[250px]">
              <Select 
                value={selectedPropertyFilter?.toString() || "all"} 
                onValueChange={(value) => setSelectedPropertyFilter(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="جميع العقارات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع العقارات</SelectItem>
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPropertyFilter !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPropertyFilter(null)}
                  className="h-10 w-10 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredContracts.map((contract) => (
          <Card key={contract.id} className={`shadow-soft hover:shadow-elegant transition-shadow duration-300 group ${contract.status === 'terminated' ? 'opacity-75 border-muted' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {getPropertyName(contract.propertyId)}
                  </CardTitle>
                  <div className="mt-2 flex gap-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      {getPaymentScheduleLabel(contract.paymentSchedule)}
                    </Badge>
                    {contract.status === 'terminated' && (
                      <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                        منتهي
                      </Badge>
                    )}
                  </div>
                </div>
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {getClientName(contract.clientId)}
              </div>
              {contract.unitNumber && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>وحدة: {contract.unitNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span dir="ltr">{formatDateDDMMYYYY(contract.startDate)} - {formatDateDDMMYYYY(contract.endDate)}</span>
                {contract.status === 'terminated' && contract.terminatedDate && (
                  <span className="text-xs text-destructive" dir="ltr">(أنهي في: {formatDateDDMMYYYY(contract.terminatedDate)})</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleView(contract)}
                >
                  <Eye className="h-2.5 w-2.5 mr-1" />
                  عرض
                </Button>
                {contract.status !== 'terminated' && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleEdit(contract)}
                    >
                      <Edit2 className="h-2.5 w-2.5 mr-1" />
                      تعديل
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleRenew(contract)}
                    >
                      <RefreshCw className="h-2.5 w-2.5 mr-1" />
                      تجديد
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleTerminate(contract)}
                    >
                      <Trash2 className="h-2.5 w-2.5 mr-1" />
                      إنهاء
                    </Button>
                  </>
                )}
                {contract.status === 'terminated' && (
                  <div className="col-span-1 text-center text-sm text-muted-foreground py-2">
                    عقد منتهي
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredContracts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">لا توجد عقود مطابقة للبحث</p>
        </div>
      )}

      {/* Contract Details/Edit Dialog */}
      {selectedContract && (
        <>
          {isEditMode ? (
            <ContractForm 
              contract={selectedContract} 
              isEdit={true}
              onClose={() => {
                setSelectedContract(null);
                setIsEditMode(false);
              }}
            />
          ) : (
            <ContractDetailsDialog 
              contract={selectedContract}
              onClose={() => setSelectedContract(null)}
            />
          )}
        </>
      )}

      {/* Create Contract Form Dialog */}
      {showCreateContractForm && (
        <ContractForm 
          prefilledData={prefilledData}
          onClose={() => {
            setShowCreateContractForm(false);
            setPrefilledData(null);
          }}
        />
      )}

      {/* Export Dialog */}
      <ContractExportDialog 
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      {/* Intelligent Import Dialog */}
      <IntelligentImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />

      {/* Renewal Dialog */}
      {selectedContract && (
        <ContractRenewalDialog 
          contract={selectedContract}
          open={showRenewalDialog}
          onClose={() => {
            setShowRenewalDialog(false);
            setSelectedContract(null);
          }}
        />
      )}

    </div>
  );
}
