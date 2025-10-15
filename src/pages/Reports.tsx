import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  DollarSign,
  Building2,
  Users,
  ClipboardList,
  PieChart
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export default function Reports() {
  const { properties, contracts, payments, maintenanceRequests, currency } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [selectedProperty, setSelectedProperty] = useState("all");

  const currencySymbols = useMemo(() => ({
    SAR: "ر.س",
    USD: "USD", 
    EUR: "€",
    AED: "د.إ",
    OMR: "ر.ع",
    QAR: "ر.ق"
  }), []);

  // تحسين حساب إحصائيات التقارير
  const reportStats = useMemo(() => {
    const totalRevenue = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const occupancyRate = properties.length > 0 
      ? ((properties.reduce((sum, p) => sum + p.rentedUnits, 0) / 
         properties.reduce((sum, p) => sum + p.totalUnits, 0)) * 100).toFixed(1)
      : 0;

    const maintenanceCosts = maintenanceRequests
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + 0, 0);
      
    return { totalRevenue, occupancyRate, maintenanceCosts };
  }, [payments, properties, maintenanceRequests]);

  const { totalRevenue, occupancyRate, maintenanceCosts } = reportStats;

  const reports = [
    {
      id: "financial",
      title: "التقرير المالي",
      description: "إجمالي الإيرادات والمصروفات",
      icon: DollarSign,
      color: "text-green-600",
      value: `${totalRevenue.toLocaleString()} ${currencySymbols[currency as keyof typeof currencySymbols]}`,
      type: "financial"
    },
    {
      id: "occupancy",
      title: "تقرير الإشغال",
      description: "معدل إشغال الوحدات",
      icon: Building2,
      color: "text-blue-600",
      value: `${occupancyRate}%`,
      type: "occupancy"
    },
    {
      id: "maintenance",
      title: "تقرير الصيانة",
      description: "تكاليف وطلبات الصيانة",
      icon: ClipboardList,
      color: "text-orange-600",
      value: `${maintenanceCosts.toLocaleString()} ${currencySymbols[currency as keyof typeof currencySymbols]}`,
      type: "maintenance"
    },
    {
      id: "contracts",
      title: "تقرير العقود",
      description: "حالة العقود والتجديدات",
      icon: FileText,
      color: "text-purple-600",
      value: `${contracts.length} عقد`,
      type: "contracts"
    },
    {
      id: "clients",
      title: "تقرير العملاء",
      description: "إحصائيات العملاء والمستأجرين",
      icon: Users,
      color: "text-indigo-600",
      value: `${contracts.length} مستأجر`,
      type: "clients"
    },
    {
      id: "performance",
      title: "تقرير الأداء",
      description: "أداء العقارات والاستثمارات",
      icon: TrendingUp,
      color: "text-teal-600",
      value: "تحليل شامل",
      type: "performance"
    }
  ];

  const handleExportReport = useCallback((reportType: string) => {
    // منطق تصدير التقرير - يمكن تطويره لاحقاً
    // تم إزالة console.log لتحسين الأداء
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">التقارير</h1>
          <p className="text-muted-foreground">تقارير شاملة لجميع جوانب إدارة العقارات</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">يومي</SelectItem>
              <SelectItem value="weekly">أسبوعي</SelectItem>
              <SelectItem value="monthly">شهري</SelectItem>
              <SelectItem value="quarterly">ربعي</SelectItem>
              <SelectItem value="yearly">سنوي</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="اختر العقار" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع العقارات</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id.toString()}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="detailed">تقارير مفصلة</TabsTrigger>
          <TabsTrigger value="analytics">تحليلات متقدمة</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* ملخص الأداء العام */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                ملخص الأداء العام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="text-center p-4 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">إجمالي الإيرادات</div>
                </div>
                <div className="text-center p-4 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{occupancyRate}%</div>
                  <div className="text-sm text-muted-foreground">معدل الإشغال</div>
                </div>
                <div className="text-center p-4 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {maintenanceRequests.length.toString()}
                  </div>
                  <div className="text-sm text-muted-foreground">طلبات الصيانة</div>
                </div>
                <div className="text-center p-4 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{contracts.length.toString()}</div>
                  <div className="text-sm text-muted-foreground">العقود النشطة</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <Card key={report.id} className="shadow-soft hover:shadow-elegant transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-secondary ${report.color}`}>
                      <report.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-2xl font-bold text-foreground">
                      {report.value}
                    </div>
                    <Badge variant="secondary">
                      <Calendar className="h-3 w-3 mr-1" />
                      {selectedPeriod === "monthly" ? "شهري" : 
                       selectedPeriod === "yearly" ? "سنوي" : 
                       selectedPeriod === "weekly" ? "أسبوعي" : "يومي"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleExportReport(report.type)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      تصدير
                    </Button>
                    <Button variant="ghost" size="sm">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      عرض
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>التقارير المفصلة</CardTitle>
              <p className="text-muted-foreground">اختر نوع التقرير للحصول على تفاصيل أكثر</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {reports.map((report) => (
                  <div key={report.id} className="p-4 border border-border rounded-lg hover:bg-secondary transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <report.icon className={`h-5 w-5 ${report.color}`} />
                        <h3 className="font-medium">{report.title}</h3>
                      </div>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        عرض التفاصيل
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                    <div className="text-lg font-semibold text-foreground">{report.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>التحليلات المتقدمة</CardTitle>
              <p className="text-muted-foreground">رسوم بيانية وتحليلات تفصيلية للأداء</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="p-6 border border-border rounded-lg">
                  <h3 className="font-medium mb-4">اتجاه الإيرادات</h3>
                  <div className="h-40 bg-secondary rounded flex items-center justify-center">
                    <p className="text-muted-foreground">مخطط الإيرادات الشهرية</p>
                  </div>
                </div>
                <div className="p-6 border border-border rounded-lg">
                  <h3 className="font-medium mb-4">توزيع أنواع العقارات</h3>
                  <div className="h-40 bg-secondary rounded flex items-center justify-center">
                    <p className="text-muted-foreground">مخطط دائري للعقارات</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}