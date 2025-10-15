import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, Plus, ArrowLeft } from "lucide-react";
import { ContractForm } from "@/components/ContractForm";
import { useApp } from "@/contexts/AppContext";

const Index = () => {
    const { properties, clients, contracts } = useApp();

    const stats = [
        {
            title: "العقارات",
            value: properties.length,
            icon: Building2,
            link: "/properties",
            color: "text-primary"
        },
        {
            title: "العملاء",
            value: clients.length,
            icon: Users,
            link: "/clients",
            color: "text-accent"
        },
        {
            title: "العقود",
            value: contracts.length,
            icon: FileText,
            link: "/contracts",
            color: "text-success"
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto p-6">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-foreground mb-2">نظام إدارة العقارات</h1>
                    <p className="text-muted-foreground text-lg">إدارة شاملة لعقاراتك وعملائك وعقودك</p>
                    <Link to="/">
                        <Button className="mt-4 bg-gradient-primary shadow-elegant">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            الذهاب إلى لوحة التحكم
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-6 md:grid-cols-3 mb-8">
                    {stats.map((stat, index) => (
                        <Link key={index} to={stat.link}>
                            <Card className="shadow-soft hover:shadow-elegant transition-shadow duration-300 group cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {stat.title}
                                    </CardTitle>
                                    <stat.icon className={`h-4 w-4 ${stat.color} group-hover:scale-110 transition-transform`} />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                                    <p className="text-xs text-muted-foreground">
                                        اضغط لعرض التفاصيل
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Quick Actions */}
                <Card className="shadow-soft">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            الإجراءات السريعة
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Link to="/properties">
                                <Button variant="outline" className="w-full h-16 text-right justify-start">
                                    <Building2 className="h-5 w-5 ml-2" />
                                    <div>
                                        <div className="font-medium">إضافة عقار جديد</div>
                                        <div className="text-sm text-muted-foreground">أضف عقار إلى محفظتك</div>
                                    </div>
                                </Button>
                            </Link>

                            <Link to="/clients">
                                <Button variant="outline" className="w-full h-16 text-right justify-start">
                                    <Users className="h-5 w-5 ml-2" />
                                    <div>
                                        <div className="font-medium">إضافة عميل جديد</div>
                                        <div className="text-sm text-muted-foreground">أضف عميل إلى قاعدة البيانات</div>
                                    </div>
                                </Button>
                            </Link>

                            <ContractForm />
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <div className="mt-8">
                    <h2 className="text-2xl font-bold text-foreground mb-4">النشاط الأخير</h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Recent Properties */}
                        <Card className="shadow-soft">
                            <CardHeader>
                                <CardTitle className="text-lg">العقارات الأخيرة</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {properties.slice(0, 3).map((property) => (
                                        <div key={property.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                            <div>
                                                <p className="font-medium">{property.name}</p>
                                                <p className="text-sm text-muted-foreground">{property.location}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium">{property.availableUnits} متاحة</p>
                                                <p className="text-sm text-muted-foreground">{property.totalUnits} إجمالي</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Link to="/properties">
                                    <Button variant="outline" className="w-full mt-4">
                                        عرض جميع العقارات
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Recent Clients */}
                        <Card className="shadow-soft">
                            <CardHeader>
                                <CardTitle className="text-lg">العملاء الأخيرة</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {clients.slice(0, 3).map((client) => (
                                        <div key={client.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                            <div>
                                                <p className="font-medium">{client.name}</p>
                                                <p className="text-sm text-muted-foreground">{client.phone}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium">{client.type}</p>
                                                <p className="text-sm text-muted-foreground">{client.nationality}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Link to="/clients">
                                    <Button variant="outline" className="w-full mt-4">
                                        عرض جميع العملاء
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Index;
