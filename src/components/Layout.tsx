import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Building2, 
  Home, 
  Users, 
  FileText, 
  CreditCard, 
  Wrench,
  BarChart3,
  LogOut,
  Shield,
  Clock
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { currency, setCurrency, theme, setTheme, language, setLanguage } = useApp();
  const { signOut, userRole, sessionExpiry, isSessionValid } = useAuth();

  const getTimeRemaining = () => {
    if (!sessionExpiry) return '';
    const now = new Date();
    const diff = sessionExpiry.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}س ${minutes}د`;
  };

  const navigationItems = [
    {
      name: "لوحة التحكم",
      href: "/",
      icon: Home,
    },
    {
      name: "العقارات",
      href: "/properties",
      icon: Building2,
    },
    {
      name: "العملاء",
      href: "/clients",
      icon: Users,
    },
    {
      name: "العقود",
      href: "/contracts",
      icon: FileText,
    },
    {
      name: "المدفوعات",
      href: "/payments",
      icon: CreditCard,
    },
    {
      name: "الصيانة",
      href: "/maintenance",
      icon: Wrench,
    },
    {
      name: "التقارير",
      href: "/reports",
      icon: BarChart3,
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed top-0 right-0 w-64 h-screen bg-card border-l border-border shadow-soft z-40 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">DIG لإدارة العقارات</h1>
              <p className="text-xs text-muted-foreground">إدارة متكاملة</p>
            </div>
          </div>

          <nav className="space-y-2 mb-6">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 text-right",
                      isActive ? "bg-gradient-primary shadow-soft" : "hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Settings */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">اللغة</span>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-16 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">AR</SelectItem>
                    <SelectItem value="en">EN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">العملة</span>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="OMR">OMR</SelectItem>
                    <SelectItem value="QAR">QAR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">المظهر</span>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-16 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">طبيعي</SelectItem>
                    <SelectItem value="dark">داكن</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* User Info & Session Status - At the very bottom */}
          <div className="border-t border-border pt-4 mt-4 space-y-3">
            {userRole && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">نوع الحساب</span>
                  <Badge variant={userRole === 'premium' || userRole === 'admin' ? 'default' : 'secondary'}>
                    {userRole === 'admin' ? 'مدير' : userRole === 'premium' ? 'مدفوع' : 'زائر'}
                  </Badge>
                </div>
                
                {userRole === 'guest' && sessionExpiry && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">الوقت المتبقي</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className={isSessionValid ? 'text-foreground' : 'text-destructive'}>
                        {getTimeRemaining()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={signOut}
            >
              <LogOut className="h-5 w-5" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 relative mr-64">
        {children}
      </main>
    </div>
  );
}