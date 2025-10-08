import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Wallet,
  Users,
  PackageSearch,
  ArrowRightLeft,
  TrendingUp,
  FileText,
  LogOut,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'الرئيسية' },
    { path: '/vaults', icon: Wallet, label: 'الأرصدة' },
    { path: '/transactions', icon: ArrowRightLeft, label: 'العمليات' },
    { path: '/customers', icon: Users, label: 'العملاء' },
    { path: '/suppliers', icon: PackageSearch, label: 'الموردين' },
    { path: '/rates', icon: TrendingUp, label: 'أسعار الصرف' },
    { path: '/reports', icon: FileText, label: 'التقارير' },
    { path: '/settings', icon: Settings, label: 'الإعدادات' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-l border-border flex flex-col">
          <div className="p-6 border-b border-border">
            <h1 className="text-xl font-bold text-foreground">نظام الصرافة</h1>
            <p className="text-sm text-muted-foreground mt-1">{user?.username}</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    isActive && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <Icon className="ml-3 h-5 w-5" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="ml-3 h-5 w-5" />
              تسجيل الخروج
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
