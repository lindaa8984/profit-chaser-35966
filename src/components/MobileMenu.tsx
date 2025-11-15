import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Building2, 
  Home, 
  Users, 
  FileText, 
  CreditCard, 
  Wrench,
  BarChart3,
  Menu,
  X,
  Store
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { t } from "@/lib/translations";

const navigationItems = [
  { nameKey: "navigation.dashboard", href: "/", icon: Home },
  { nameKey: "navigation.properties", href: "/properties", icon: Building2 },
  { nameKey: "navigation.shops", href: "/shops", icon: Store },
  { nameKey: "navigation.groundHouses", href: "/ground-houses", icon: Home },
  { nameKey: "navigation.clients", href: "/clients", icon: Users },
  { nameKey: "navigation.contracts", href: "/contracts", icon: FileText },
  { nameKey: "navigation.payments", href: "/payments", icon: CreditCard },
  { nameKey: "navigation.maintenance", href: "/maintenance", icon: Wrench },
  { nameKey: "navigation.reports", href: "/reports", icon: BarChart3 },
];

export function MobileMenu() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { language } = useApp();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-64 p-0">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base text-foreground">DIG</h1>
                <p className="text-xs text-muted-foreground">{language === "ar" ? "إدارة العقارات" : "Property Management"}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href} onClick={() => setOpen(false)}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      language === "ar" ? "text-right" : "text-left",
                      isActive ? "bg-gradient-primary shadow-soft" : "hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {t(item.nameKey, language)}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
