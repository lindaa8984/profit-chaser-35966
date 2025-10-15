import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ActivationCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivationCodeDialog({ open, onOpenChange }: ActivationCodeDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleActivate = async () => {
    if (!code.trim()) {
      toast.error('الرجاء إدخال كود التفعيل');
      return;
    }

    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('activate_premium_with_code', {
        _code: code.trim().toUpperCase(),
        _user_id: user.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string; end_date?: string };

      if (result.success) {
        toast.success(result.message || 'تم تفعيل الاشتراك بنجاح! صلاحيتك صالحة لمدة سنة');
        setCode('');
        onOpenChange(false);
        // Reload page to update subscription status
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(result.error || 'فشل تفعيل الكود');
      }
    } catch (error: any) {
      console.error('Error activating code:', error);
      toast.error('حدث خطأ أثناء تفعيل الكود');
    } finally {
      setLoading(false);
    }
  };

  const formatCode = (value: string) => {
    // Remove non-alphanumeric characters
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Add dashes every 4 characters
    const parts = clean.match(/.{1,4}/g) || [];
    return parts.join('-').substring(0, 19); // XXXX-XXXX-XXXX-XXXX
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            تفعيل الاشتراك السنوي
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="activation-code">كود التفعيل</Label>
            <Input
              id="activation-code"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(formatCode(e.target.value))}
              className="text-center text-lg tracking-wider font-mono"
              maxLength={19}
              dir="ltr"
            />
            <p className="text-sm text-muted-foreground text-center">
              أدخل كود التفعيل المكون من 16 حرف
            </p>
          </div>
          <Button
            onClick={handleActivate}
            disabled={loading || code.length < 19}
            className="w-full"
          >
            {loading ? 'جاري التفعيل...' : 'تفعيل الاشتراك'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
