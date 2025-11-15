import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { MobileMenu } from "@/components/MobileMenu";
import { Building2, Home, Users, FileText, CreditCard, Wrench, BarChart3, LogOut, Shield, Clock, Store, Key } from "lucide-react";
import { ActivationCodeDialog } from "@/components/ActivationCodeDialog";
import { useState } from "react";
import { t } from "@/lib/translations";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { currency, setCurrency, theme, setTheme, language, setLanguage, userCompany } = useApp();
  const { signOut, userRole, sessionExpiry, isSessionValid, user } = useAuth();
  const [showActivation, setShowActivation] = useState(false);
  
  // Always use "The First Office" in both languages
  const companyName = t("layout.companyName", language);

  const getTimeRemaining = () => {
    if (!sessionExpiry) return "";
    const now = new Date();
    const diff = sessionExpiry.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}س ${minutes}د`;
  };

  const navigationItems = [
    {
      nameKey: "navigation.dashboard",
      href: "/",
      icon: Home,
    },
    {
      nameKey: "navigation.properties",
      href: "/properties",
      icon: Building2,
    },
    {
      nameKey: "navigation.shops",
      href: "/shops",
      icon: Store,
    },
    {
      nameKey: "navigation.groundHouses",
      href: "/ground-houses",
      icon: Home,
    },
    {
      nameKey: "navigation.clients",
      href: "/clients",
      icon: Users,
    },
    {
      nameKey: "navigation.contracts",
      href: "/contracts",
      icon: FileText,
    },
    {
      nameKey: "navigation.payments",
      href: "/payments",
      icon: CreditCard,
    },
    {
      nameKey: "navigation.maintenance",
      href: "/maintenance",
      icon: Wrench,
    },
    {
      nameKey: "navigation.reports",
      href: "/reports",
      icon: BarChart3,
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border shadow-sm z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-bold text-base text-foreground">{companyName}</h1>
        </div>
        <MobileMenu />
      </header>

      {/* Sidebar - Desktop Only */}
      <aside className={cn(
        "hidden md:block fixed top-0 w-64 h-screen bg-card border-border shadow-soft z-40 overflow-y-auto",
        language === "ar" ? "right-0 border-l" : "left-0 border-r"
      )}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">
                {companyName}
              </h1>
              <p className="text-xs text-muted-foreground">{t("layout.appSubtitle", language)}</p>
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
                      "w-full justify-start gap-3",
                      language === "ar" ? "text-right" : "text-left",
                      isActive ? "bg-gradient-primary shadow-soft" : "hover:bg-muted",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {t(item.nameKey, language)}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Settings */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{t("layout.language", language)}</span>
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
                <span className="text-xs text-muted-foreground">{t("layout.currency", language)}</span>
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
                <span className="text-xs text-muted-foreground">{t("layout.theme", language)}</span>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-16 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t("layout.lightTheme", language)}</SelectItem>
                    <SelectItem value="dark">{t("layout.darkTheme", language)}</SelectItem>
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
                  <span className="text-xs text-muted-foreground">{t("layout.accountType", language)}</span>
                  <Badge variant={userRole === "premium" || userRole === "admin" ? "default" : "secondary"}>
                    {userRole === "admin" ? t("layout.admin", language) : userRole === "premium" ? t("layout.premium", language) : t("layout.guest", language)}
                  </Badge>
                </div>

                {userRole === "guest" && sessionExpiry && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t("layout.timeRemaining", language)}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className={isSessionValid ? "text-foreground" : "text-destructive"}>
                        {getTimeRemaining()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Activation Button for Guest Users */}
                {userRole === "guest" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 bg-gradient-primary text-white hover:bg-primary/90"
                    onClick={() => setShowActivation(true)}
                  >
                    <Key className="h-4 w-4" />
                    {language === "ar" ? "تفعيل الاشتراك" : "Activate Subscription"}
                  </Button>
                )}
              </div>
            )}

            {/* Admin Panel Link - Only for Super Admin */}
            {userRole === 'admin' && user?.email === 'm_azoz84@yahoo.com' && (
              <Link to="/admin">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full gap-3",
                    language === "ar" ? "justify-start" : "justify-start flex-row-reverse",
                    location.pathname === "/admin" && "bg-muted"
                  )}
                >
                  <Shield className="h-5 w-5" />
                  {language === "ar" ? "لوحة الإدارة" : "Admin Panel"}
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              className={cn(
                "w-full gap-3 text-destructive hover:text-destructive hover:bg-destructive/10",
                language === "ar" ? "justify-start" : "justify-start flex-row-reverse"
              )}
              onClick={signOut}
            >
              <LogOut className="h-5 w-5" />
              {t("layout.logout", language)}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-4 md:p-6 pt-20 md:pt-6 min-h-screen",
        language === "ar" ? "md:mr-64" : "md:ml-64"
      )}>{children}</main>

      {/* Activation Dialog */}
      <ActivationCodeDialog open={showActivation} onOpenChange={setShowActivation} />
    </div>
  );
}
