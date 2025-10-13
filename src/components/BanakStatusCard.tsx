import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import { Transaction } from '@/types';
import banakLogo from '@/assets/banak-logo.png';

interface BanakStatusCardProps {
  transactions: Transaction[];
  vaultLogoUrl?: string;
}

export const BanakStatusCard = ({ transactions, vaultLogoUrl }: BanakStatusCardProps) => {
  // Get active Banak transfers (pending or in_transit)
  const activeBanakTransfers = transactions.filter(
    t => t.isBanakTransfer && (t.status === 'pending' || t.status === 'in_transit')
  );

  const pendingTransfers = activeBanakTransfers.filter(t => t.status === 'pending');
  const inTransitTransfers = activeBanakTransfers.filter(t => t.status === 'in_transit');

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2">
          <img src={banakLogo} alt="بنكك" className="h-6 w-6" />
          تفاصيل بنكك
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 space-y-3 min-h-[160px] flex flex-col justify-center">
        {activeBanakTransfers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">لا توجد حركة لبنكك الآن</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending transfers - Show Banak logo with arrows */}
            {pendingTransfers.length > 0 && (
              <div className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <img src={banakLogo} alt="بنكك" className="h-16 w-16 animate-pulse" />
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((i) => (
                    <ChevronLeft 
                      key={i} 
                      className="h-8 w-8 text-green-600 dark:text-green-400 animate-bounce" 
                      style={{ animationDelay: `${i * 0.15}s` }}
                      strokeWidth={3}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-base text-foreground">في الطريق للمورد في إنتظار الموافقة</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pendingTransfers.length} {pendingTransfers.length === 1 ? 'عملية' : 'عمليات'}
                  </p>
                </div>
              </div>
            )}

            {/* In transit transfers - Show Banak logo with vault */}
            {inTransitTransfers.length > 0 && (
              <div className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <img src={banakLogo} alt="بنكك" className="h-16 w-16 animate-pulse" />
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((i) => (
                    <ChevronLeft 
                      key={i} 
                      className="h-8 w-8 text-amber-600 dark:text-amber-400 animate-bounce" 
                      style={{ animationDelay: `${i * 0.15}s` }}
                      strokeWidth={3}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-base text-foreground">في الطريق للإستلام في إنتظار الموافقة</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {inTransitTransfers.length} {inTransitTransfers.length === 1 ? 'عملية' : 'عمليات'} - إلي الخزنة الرئيسية
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
