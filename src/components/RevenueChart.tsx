import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { format } from "date-fns";

export function RevenueChart() {
  const { payments, currency } = useApp();
  
  const currencySymbols = {
    SAR: "ر.س",
    USD: "USD", 
    EUR: "€",
    AED: "د.إ"
  };

  // تجميع البيانات حسب الشهر من المدفوعات المستلمة
  const monthlyData: { [key: string]: { month: string; revenue: number; count: number } } = {};
  
  // إنشاء الشهور الستة الأخيرة بقيم افتراضية
  const currentDate = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = format(date, 'MMM yyyy');
    
    monthlyData[monthKey] = {
      month: monthName,
      revenue: 0,
      count: 0
    };
  }
  
  // إضافة البيانات الفعلية من المدفوعات
  payments
    .filter(payment => payment.status === 'paid' && payment.paidDate)
    .forEach(payment => {
      const date = new Date(payment.paidDate!);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].revenue += payment.amount;
        monthlyData[monthKey].count += 1;
      }
    });

  // تحويل البيانات إلى مصفوفة مرتبة
  const chartData = Object.values(monthlyData)
    .sort((a, b) => {
      // ترتيب حسب التاريخ الفعلي وليس الاسم
      const dateA = new Date(a.month + ' 1');
      const dateB = new Date(b.month + ' 1'); 
      return dateA.getTime() - dateB.getTime();
    });

  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const avgMonthlyRevenue = chartData.length > 0 ? Math.round(totalRevenue / chartData.length) : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-success">
            الإيراد: {data.revenue.toLocaleString()} {currencySymbols[currency as keyof typeof currencySymbols]}
          </p>
          <p className="text-xs text-muted-foreground">
            عدد الدفعات: {data.count}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          الإيراد الشهري
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="revenue" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">إجمالي الإيراد</p>
            <p className="text-sm font-bold text-success">
              {totalRevenue.toLocaleString()} {currencySymbols[currency as keyof typeof currencySymbols]}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">متوسط شهري</p>
            <p className="text-sm font-bold text-primary">
              {avgMonthlyRevenue.toLocaleString()} {currencySymbols[currency as keyof typeof currencySymbols]}
            </p>
          </div>
        </div>
        
        {chartData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">لا توجد بيانات إيراد حالياً</p>
            <p className="text-xs text-muted-foreground">سيتم عرض البيانات عند وجود دفعات مستلمة</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}