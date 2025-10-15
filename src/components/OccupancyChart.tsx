import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Home, Users } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export function OccupancyChart() {
  const { properties } = useApp();
  
  const totalUnits = properties.reduce((sum, prop) => sum + prop.totalUnits, 0);
  const availableUnits = properties.reduce((sum, prop) => sum + prop.availableUnits, 0);
  const rentedUnits = properties.reduce((sum, prop) => sum + prop.rentedUnits, 0);
  
  const data = [
    {
      name: 'وحدات مؤجرة',
      value: rentedUnits,
      color: '#10b981',
      percentage: totalUnits > 0 ? Math.round((rentedUnits / totalUnits) * 100) : 0
    },
    {
      name: 'وحدات متاحة',
      value: availableUnits,
      color: '#6b7280',
      percentage: totalUnits > 0 ? Math.round((availableUnits / totalUnits) * 100) : 0
    }
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} وحدة ({data.percentage}%)
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
          <Home className="h-5 w-5 text-primary" />
          نسبة الإشغال
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <span className="text-sm text-muted-foreground">وحدات مؤجرة</span>
            </div>
            <span className="text-sm font-medium">{rentedUnits} وحدة ({data[0].percentage}%)</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-muted rounded-full"></div>
              <span className="text-sm text-muted-foreground">وحدات متاحة</span>
            </div>
            <span className="text-sm font-medium">{availableUnits} وحدة من {properties.length} عقار</span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">إجمالي الوحدات:</span>
            <span className="text-sm font-bold text-primary">{totalUnits} وحدة</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}