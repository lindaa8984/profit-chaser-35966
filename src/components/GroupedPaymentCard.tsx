import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, CreditCard, Calendar, Eye, Edit2, CheckCircle, User, Building2 } from "lucide-react";
import { Payment } from "@/contexts/AppContext";

interface GroupedPaymentCardProps {
  contractId: number;
  clientName: string;
  propertyName: string;
  payments: Payment[];
  currency: string;
  currencySymbols: Record<string, string>;
  onViewPayment: (payment: Payment) => void;
  onEditPayment: (payment: Payment) => void;
  onConfirmPayment: (payment: Payment) => void;
}

export function GroupedPaymentCard({
  contractId,
  clientName,
  propertyName,
  payments,
  currency,
  currencySymbols,
  onViewPayment,
  onEditPayment,
  onConfirmPayment
}: GroupedPaymentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "paid": return <Badge className="bg-success/10 text-success border-success/20">مدفوع</Badge>;
      case "pending": return <Badge className="bg-warning/10 text-warning border-warning/20">معلق</Badge>;
      case "scheduled": return <Badge className="bg-muted text-muted-foreground border-muted">مجدول</Badge>;
      case "overdue": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">متأخر</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch(method) {
      case "cash": return "نقدي";
      case "cheque": return "شيك";
      case "bank_transfer": return "حوالة بنكية";
      case "card": return "بطاقة ائتمان";
      default: return method;
    }
  };

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidCount = payments.filter(p => p.status === 'paid').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const overdueCount = payments.filter(p => p.status === 'overdue').length;
  const scheduledCount = payments.filter(p => p.status === 'scheduled').length;

  // أحدث دفعة معلقة أو متأخرة أو مجدولة
  const nextDuePayment = payments
    .filter(p => p.status === 'pending' || p.status === 'overdue' || p.status === 'scheduled')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  return (
    <Card className="shadow-soft hover:shadow-elegant transition-shadow duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-primary transition-colors flex items-center gap-2">
              <User className="h-4 w-4" />
              {clientName}
            </CardTitle>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Building2 className="h-3 w-3" />
              {propertyName}
            </div>
            <div className="mt-2 flex gap-2 flex-wrap">
              {paidCount > 0 && (
                <Badge className="bg-success/10 text-success border-success/20">
                  {paidCount} مدفوع
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge className="bg-warning/10 text-warning border-warning/20">
                  {pendingCount} معلق
                </Badge>
              )}
              {overdueCount > 0 && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                  {overdueCount} متأخر
                </Badge>
              )}
              {scheduledCount > 0 && (
                <Badge className="bg-muted text-muted-foreground border-muted">
                  {scheduledCount} مجدول
                </Badge>
              )}
            </div>
          </div>
          <CreditCard className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-lg text-primary">
            إجمالي: {totalAmount.toLocaleString()} {currencySymbols[currency]}
          </span>
        </div>
        
        {nextDuePayment && (
          <div className="p-3 bg-muted/50 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">الدفعة التالية:</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {nextDuePayment.dueDate}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-primary">
                    {nextDuePayment.amount.toLocaleString()} {currencySymbols[currency]}
                  </span>
                </div>
                {nextDuePayment.paymentMethod === 'cheque' && nextDuePayment.checkNumber && (
                  <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded mt-1 inline-block">
                    رقم الشيك: {nextDuePayment.checkNumber}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {getStatusBadge(nextDuePayment.status)}
                {(nextDuePayment.status === 'pending' || nextDuePayment.status === 'scheduled' || nextDuePayment.status === 'overdue') && 
                 (nextDuePayment.paymentMethod === 'cheque' || nextDuePayment.paymentMethod === 'cash') && (
                  <Button 
                    size="sm" 
                    className="bg-gradient-success text-xs"
                    onClick={() => onConfirmPayment(nextDuePayment)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    تأكيد
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="flex gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    إخفاء التفاصيل
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    عرض جميع الدفعات ({payments.length})
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="space-y-2 mt-3">
            {payments.map((payment) => (
              <div key={payment.id} className="p-3 border border-border rounded-md bg-background/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(payment.status)}
                      <span className="text-sm text-muted-foreground">
                        {getPaymentMethodLabel(payment.paymentMethod)}
                      </span>
                      {payment.paymentMethod === 'cheque' && payment.checkNumber && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          رقم الشيك: {payment.checkNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      استحقاق: {payment.dueDate}
                    </div>
                    {payment.paidDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        دُفع: {payment.paidDate}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-primary">
                        {payment.amount.toLocaleString()} {currencySymbols[currency]}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewPayment(payment)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      عرض
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onEditPayment(payment)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      تعديل
                    </Button>
                    {(payment.status === "pending" || payment.status === "scheduled" || payment.status === "overdue") && 
                     (payment.paymentMethod === 'cheque' || payment.paymentMethod === 'cash') && (
                      <Button 
                        size="sm" 
                        className="bg-gradient-success"
                        onClick={() => onConfirmPayment(payment)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        تأكيد
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}