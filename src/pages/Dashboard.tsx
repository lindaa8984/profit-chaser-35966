import { useState, useMemo, useCallback } from "react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Home, 
  FileText, 
  CreditCard, 
  TrendingUp,
  AlertCircle,
  CalendarX,
  Zap
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useNavigate } from "react-router-dom";
import { OccupancyChart } from "@/components/OccupancyChart";
import { RevenueChart } from "@/components/RevenueChart";
import { QuickEntryDialog } from "@/components/QuickEntryDialog";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/lib/translations";

export default function Dashboard() {
  const { properties, contracts, payments, maintenanceRequests, currency, language, userCompany } = useApp();
  const navigate = useNavigate();
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  
  // تفعيل نظام الإشعارات
  useNotifications();
  
  // تحديد العنوان بناءً على شركة المستخدم
  const pageTitle = userCompany 
    ? (language === "ar" ? userCompany.name : (userCompany.name_en || userCompany.name))
    : (language === "ar" ? "DIG لإدارة العقارات" : "DIG Property Management");
  
  const getCurrencySymbol = useCallback((code: string) => {
    const ar = { SAR: "ر.س", AED: "د.إ", USD: "دولار", EUR: "€" } as const;
    const en = { SAR: "SAR", AED: "AED", USD: "USD", EUR: "€" } as const;
    const map = language === "ar" ? ar : en;
    return (map as any)[code] ?? code;
  }, [language]);
  
  // تحسين الحسابات باستخدام useMemo لتجنب إعادة الحساب غير الضرورية
  const dashboardStats = useMemo(() => {
    const totalProperties = properties.length;
    const totalUnits = properties.reduce((sum, prop) => sum + prop.totalUnits, 0);
    const availableUnits = properties.reduce((sum, prop) => sum + prop.availableUnits, 0);
    const rentedUnits = properties.reduce((sum, prop) => sum + prop.rentedUnits, 0);
    const totalContracts = contracts.length;
    
    // حساب الإيراد الشهري من الدفعات المؤكدة للشهر الحالي فقط
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const monthlyRevenue = payments
      .filter(payment => {
        if (payment.status !== 'paid' || !payment.paidDate) return false;
        
        const paidDate = new Date(payment.paidDate);
        return paidDate >= currentMonthStart && paidDate <= currentMonthEnd;
      })
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    // حساب العقود على وشك الانتهاء (خلال 7 أيام)
    const upcomingExpirations = contracts.filter(contract => {
      const endDate = new Date(contract.endDate);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays > 0;
    }).length;
    
    // حساب المدفوعات المستحقة خلال 5 أيام من اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0); // بداية اليوم
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(today.getDate() + 5);
    
    const pendingPayments = payments.filter(payment => {
      if (payment.status !== "pending") return false;
      
      const dueDate = new Date(payment.dueDate);
      dueDate.setHours(0, 0, 0, 0); // بداية يوم الاستحقاق
      
      // إظهار الدفعات المستحقة من اليوم وحتى 5 أيام قادمة
      return dueDate >= today && dueDate <= fiveDaysFromNow;
    });
    const pendingAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    return {
      totalProperties,
      totalUnits,
      availableUnits,
      rentedUnits,
      totalContracts,
      monthlyRevenue,
      upcomingExpirations,
      pendingPayments,
      pendingAmount
    };
  }, [properties, contracts, payments]);
  
  const { 
    totalProperties, 
    totalUnits, 
    availableUnits, 
    rentedUnits, 
    totalContracts, 
    monthlyRevenue, 
    upcomingExpirations, 
    pendingPayments, 
    pendingAmount 
  } = dashboardStats;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("dashboard.title", language)}</h1>
          <p className="text-muted-foreground">{pageTitle} — {t("dashboard.subtitle", language)}</p>
        </div>
        <Button 
          onClick={() => setQuickEntryOpen(true)}
          className="bg-gradient-primary shadow-elegant hover:shadow-glow transition-all duration-300"
          size="lg"
        >
          <Zap className="h-5 w-5 mr-2" />
          {t("dashboard.quickEntry", language)}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.totalProperties", language)}
          value={totalProperties.toString()}
          icon={Building2}
          change={`${totalUnits} ${t("dashboard.totalUnits", language)}`}
          changeType="positive"
        />
        <StatCard
          title={t("dashboard.availableUnits", language)}
          value={availableUnits.toString()}
          icon={Home}
          change={t("dashboard.fromUnits", language, { count: totalUnits })}
          changeType="positive"
        />
        <StatCard
          title={t("dashboard.contractsExpiringSoon", language)}
          value={upcomingExpirations.toString()}
          icon={CalendarX}
          change={t("dashboard.needsFollowup", language)}
          changeType={upcomingExpirations > 0 ? "negative" : "positive"}
        />
        <StatCard
          title={t("dashboard.monthlyRevenue", language)}
          value={`${Math.round(monthlyRevenue).toLocaleString()} ${getCurrencySymbol(currency)}`}
          icon={CreditCard}
          change={t("dashboard.fromContracts", language, { count: totalContracts })}
          changeType="positive"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("dashboard.recentActivity", language)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* دمج جميع الأنشطة الحديثة وعرض آخر 5 فقط */}
            {[
              ...contracts.map(contract => ({
                id: `contract-${contract.id}`,
                type: 'contract' as const,
                date: contract.startDate,
                contract
              })),
              ...payments.filter(p => p.status === "paid").map(payment => ({
                id: `payment-${payment.id}`,
                type: 'payment' as const, 
                date: payment.paidDate || payment.dueDate,
                payment
              }))
            ]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map((activity) => {
              if (activity.type === 'contract') {
                const property = properties.find(p => p.id === activity.contract.propertyId);
                return (
                  <div key={activity.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t("dashboard.newContract", language)}</p>
                      <p className="text-xs text-muted-foreground">
                        {property?.name} - {activity.contract.monthlyRent.toLocaleString()} {getCurrencySymbol(currency)}
                      </p>
                    </div>
                  </div>
                );
              } else {
                const contract = contracts.find(c => c.id === activity.payment.contractId);
                const property = properties.find(p => p.id === contract?.propertyId);
                return (
                  <div key={activity.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t("dashboard.paidPayment", language)}</p>
                      <p className="text-xs text-muted-foreground">
                        {property?.name} - {activity.payment.amount.toLocaleString()} {getCurrencySymbol(currency)}
                      </p>
                    </div>
                  </div>
                );
              }
            })}
           </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              {t("dashboard.alertsAndTasks", language)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* العقود على وشك الانتهاء */}
            {upcomingExpirations > 0 && (
              <div 
                className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg cursor-pointer hover:bg-warning/20 transition-colors"
                onClick={() => navigate('/contracts?filter=expiring')}
              >
                <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{t("dashboard.contractsExpiring", language)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(upcomingExpirations === 1 ? "dashboard.contractExpiresInDays" : "dashboard.contractsExpireInDays", language, { count: upcomingExpirations })}
                  </p>
                </div>
              </div>
            )}
            
            {/* المدفوعات المجدولة */}
            {pendingPayments.length > 0 && (
              <div 
                className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg cursor-pointer hover:bg-destructive/20 transition-colors"
                onClick={() => navigate('/payments?filter=pending')}
              >
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{t("dashboard.scheduledPayments", language)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.paymentsTotal", language, { count: pendingPayments.length, amount: `${pendingAmount.toLocaleString()} ${getCurrencySymbol(currency)}` })}
                  </p>
                </div>
              </div>
            )}
            
            {/* طلبات الصيانة المعلقة */}
            {maintenanceRequests.filter(r => r.status === "pending").slice(0, 1).map((request) => {
              const property = properties.find(p => p.id === request.propertyId);
              
              return (
                <div key={request.id} className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{t("dashboard.newMaintenanceRequest", language)}</p>
                    <p className="text-xs text-muted-foreground">{property?.name} - {request.description}</p>
                  </div>
                </div>
              );
            })}
            
            {/* رسالة في حالة عدم وجود تنبيهات */}
            {upcomingExpirations === 0 && pendingPayments.length === 0 && maintenanceRequests.filter(r => r.status === "pending").length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">{t("dashboard.noNotifications", language)}</p>
                <p className="text-xs text-muted-foreground">{t("dashboard.allSystemsNormal", language)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Occupancy Chart */}
        <OccupancyChart />

        {/* Revenue Chart */}
        <RevenueChart />
      </div>

      <QuickEntryDialog open={quickEntryOpen} onOpenChange={setQuickEntryOpen} />
    </div>
  );
}
