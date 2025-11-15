import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Store, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  FileText,
  Calendar,
  CreditCard,
  X,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { formatDateDDMMYYYY, parseDateDDMMYYYY } from "@/lib/utils";

interface Shop {
  id: string;
  unit_number: string;
  floor: number;
  is_available: boolean;
  user_id: string;
  property_id: string | null;
  name?: string;
  location?: string;
}

interface Property {
  id: string;
  name: string;
  location: string;
}

interface ShopDetailsDialogProps {
  shop: Shop;
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopDetailsDialog({ shop, property, open, onOpenChange }: ShopDetailsDialogProps) {
  const { clients, contracts, payments } = useApp();
  const { toast } = useToast();
  const [showEndContractDialog, setShowEndContractDialog] = useState(false);

  // Get shop's active contract and client data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const shopContract = contracts.find(c => {
    const endDate = new Date(c.endDate);
    endDate.setHours(0, 0, 0, 0);
    
    return c.unitNumber === shop.unit_number &&
      endDate >= today &&
      c.status !== 'terminated';
  });
  
  const client = shopContract ? clients.find(c => c.id === shopContract.clientId) : null;
  
  // Get payments from contract
  const getContractPayments = () => {
    if (!shopContract) return [];

    const paymentDatesStr = shopContract.paymentDates || '';
    const paymentAmountsStr = shopContract.paymentAmounts || '';

    if (!paymentDatesStr) return [];

    const dates = paymentDatesStr
      .split(',')
      .map(d => d.trim())
      .filter(Boolean);

    const amounts = paymentAmountsStr
      ? paymentAmountsStr.split(',').map(a => parseFloat(a.trim()))
      : [];

    const isoDates = dates.map(d => parseDateDDMMYYYY(d) || d);

    const paymentsForContract = payments
      .filter(p => p.contractId === shopContract.id)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return isoDates.map((isoDate, index) => {
      const matchByDate = paymentsForContract.find(p => p.dueDate === isoDate || p.dueDate === dates[index]);
      const matchByIndex = paymentsForContract[index];
      const matched = matchByDate || matchByIndex;

      return {
        id: matched?.id || `temp-${index}`,
        contractId: shopContract.id,
        amount: (amounts[index] ?? matched?.amount ?? 0),
        currency: shopContract.currency,
        dueDate: dates[index],
        paidDate: matched?.paidDate,
        paymentMethod: shopContract.paymentMethod,
        status: (matched?.status || 'pending') as 'paid' | 'pending' | 'scheduled' | 'overdue',
      };
    });
  };

  const shopPayments = shopContract ? getContractPayments() : [];

  const handleEndContract = async () => {
    if (shopContract) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // Update contract status
      const { error } = await supabase
        .from('contracts')
        .update({ 
          end_date: yesterdayStr,
          status: 'terminated'
        })
        .eq('id', String(shopContract.id));

      if (error) {
        console.error('Error ending contract:', error);
        toast({
          title: "خطأ",
          description: "فشل في إنهاء العقد",
          variant: "destructive"
        });
        return;
      }

      // Update shop to be available
      const { error: shopError } = await supabase
        .from('units')
        .update({ is_available: true })
        .eq('id', shop.id);

      if (shopError) {
        console.error('Error updating shop:', shopError);
      }
      
      setShowEndContractDialog(false);
      onOpenChange(false);
      toast({
        title: "تم إنهاء العقد",
        description: `تم إنهاء عقد المحل ${shop.unit_number} وإتاحته للإيجار`
      });
    }
  };

  const paidPayments = shopPayments.filter(p => p.status === 'paid');
  const pendingPayments = shopPayments.filter(p => p.status === 'pending');
  const overduePayments = shopPayments.filter(p => p.status === 'overdue');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Store className="h-5 w-5" />
                تفاصيل المحل {shop.unit_number}
              </DialogTitle>
              <p className="text-base font-medium text-primary mt-1">
                {property.name}
              </p>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shop Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  معلومات المحل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>رقم المحل:</Label>
                  <span className="font-medium">{shop.unit_number}</span>
                </div>
                
                {shop.name && (
                  <div className="flex items-center justify-between">
                    <Label>اسم المحل:</Label>
                    <span className="font-medium">{shop.name}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <Label>الطابق:</Label>
                  <span className="font-medium">{shop.floor}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>الحالة:</Label>
                  <Badge 
                    variant="outline" 
                    className={shopContract 
                      ? "bg-destructive/10 text-destructive border-destructive/20" 
                      : "bg-success/10 text-success border-success/20"
                    }
                  >
                    {shopContract ? 'مشغول' : 'متاح'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Tenant Information */}
            {shopContract && client ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    معلومات المستأجر
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>الاسم:</Label>
                    <span className="font-medium">{client.name}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      الهاتف:
                    </Label>
                    <span className="font-medium">{client.phone}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      البريد:
                    </Label>
                    <span className="font-medium">{client.email}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>رقم الهوية:</Label>
                    <span className="font-medium">{client.idNumber}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>الجنسية:</Label>
                    <span className="font-medium">{client.nationality}</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center text-muted-foreground">
                    <Store className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>المحل متاح</p>
                    <p className="text-sm">لا يوجد مستأجر حالياً</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contract Information */}
            {shopContract && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    تفاصيل العقد
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div>
                      <Label className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        تاريخ البداية:
                      </Label>
                      <p className="font-medium">{formatDateDDMMYYYY(shopContract.startDate)}</p>
                    </div>
                    
                    <div>
                      <Label className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        تاريخ النهاية:
                      </Label>
                      <p className="font-medium">{formatDateDDMMYYYY(shopContract.endDate)}</p>
                    </div>
                    
                    <div>
                      <Label className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4" />
                        الإيجار السنوي:
                      </Label>
                      <p className="font-medium">{shopContract.monthlyRent.toLocaleString()} {shopContract.currency}</p>
                    </div>
                    
                    <div>
                      <Label>طريقة الدفع:</Label>
                      <p className="font-medium">{shopContract.paymentMethod}</p>
                    </div>
                  </div>

                  {/* Contract File Attachment */}
                  {shopContract.contractFileUrl && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="text-sm font-medium">ملف العقد المرفق</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const { data, error } = await supabase.storage
                                .from('contracts')
                                .download(shopContract.contractFileUrl!);

                              if (error) throw error;

                              const url = window.URL.createObjectURL(data);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `contract_${shopContract.id}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);

                              toast({
                                title: "تم بنجاح",
                                description: "تم تحميل ملف العقد"
                              });
                            } catch (error) {
                              console.error('Error downloading file:', error);
                              toast({
                                title: "خطأ",
                                description: "فشل تحميل الملف",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          تحميل
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Contract Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowEndContractDialog(true)}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      إنهاء العقد
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Summary */}
            {shopPayments.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    ملخص الدفعات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 bg-success/10 border border-success/20 rounded-lg text-center">
                      <div className="text-success font-medium">الدفعات المسددة</div>
                      <div className="text-success text-2xl font-bold">{paidPayments.length}</div>
                      <div className="text-success text-sm">
                        {paidPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} {shopContract?.currency}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg text-center">
                      <div className="text-warning font-medium">الدفعات المجدولة</div>
                      <div className="text-warning text-2xl font-bold">{pendingPayments.length}</div>
                      <div className="text-warning text-sm">
                        {pendingPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} {shopContract?.currency}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                      <div className="text-destructive font-medium">الدفعات المتأخرة</div>
                      <div className="text-destructive text-2xl font-bold">{overduePayments.length}</div>
                      <div className="text-destructive text-sm">
                        {overduePayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} {shopContract?.currency}
                      </div>
                    </div>
                  </div>

                  {/* Recent Payments */}
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <h4 className="font-medium">آخر الدفعات:</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {shopPayments
                        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                        .map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline"
                                className={payment.status === 'paid' 
                                  ? "bg-success/10 text-success border-success/20"
                                  : payment.status === 'overdue'
                                  ? "bg-destructive/10 text-destructive border-destructive/20"
                                  : "bg-warning/10 text-warning border-warning/20"
                                }
                              >
                                {payment.status === 'paid' ? 'مسددة' : payment.status === 'overdue' ? 'متأخرة' : 'مجدولة'}
                              </Badge>
                              <span className="text-sm">{payment.dueDate}</span>
                            </div>
                            <span className="font-medium">{payment.amount.toLocaleString()} {payment.currency}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* End Contract Confirmation Dialog */}
      <AlertDialog open={showEndContractDialog} onOpenChange={setShowEndContractDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إنهاء العقد</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إنهاء عقد المحل {shop.unit_number}؟ 
              سيتم تحديث حالة المحل إلى متاح للإيجار.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndContract}>
              تأكيد الإنهاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
