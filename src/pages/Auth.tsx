import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Mail, Lock, User, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { toast } from 'sonner';

const signUpSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
  password: z.string().min(6, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
  fullName: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
});

const signInSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
  password: z.string().min(1, { message: "كلمة المرور مطلوبة" }),
});

const activationCodeSchema = z.string()
  .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'صيغة الكود غير صالحة (XXXX-XXXX-XXXX-XXXX)')
  .length(19, 'طول الكود غير صحيح');

const Auth = () => {
  const navigate = useNavigate();
  const { user, signUp, signIn, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Sign Up Form
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    fullName: '',
  });
  const [signUpErrors, setSignUpErrors] = useState<any>({});

  // Sign In Form
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });
  const [signInErrors, setSignInErrors] = useState<any>({});

  // Activation Code
  const [activationCode, setActivationCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpErrors({});
    
    const result = signUpSchema.safeParse(signUpData);
    if (!result.success) {
      const errors: any = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0]] = issue.message;
      });
      setSignUpErrors(errors);
      return;
    }

    setIsLoading(true);
    
    try {
      // Check IP before registration
      const { data: ipCheckData, error: ipCheckError } = await supabase.functions.invoke('check-ip', {
        body: { action: 'check' }
      });

      if (ipCheckError) {
        toast.error('حدث خطأ في التحقق من العنوان');
        setIsLoading(false);
        return;
      }

      if (!ipCheckData.allowed) {
        toast.error(ipCheckData.reason || 'غير مسموح بالتسجيل من هذا العنوان');
        setIsLoading(false);
        return;
      }

      // Proceed with registration
      const signUpResult = await signUp(signUpData.email, signUpData.password, signUpData.fullName);
      
      // Record IP after successful registration
      if (signUpResult?.user && !signUpResult.error) {
        await supabase.functions.invoke('check-ip', {
          body: { 
            action: 'record',
            userId: signUpResult.user.id
          }
        });
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء التسجيل');
      if (import.meta.env.DEV) {
        console.error('Sign up error:', error);
      }
    }
    
    setIsLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInErrors({});
    
    const result = signInSchema.safeParse(signInData);
    if (!result.success) {
      const errors: any = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0]] = issue.message;
      });
      setSignInErrors(errors);
      return;
    }

    setIsLoading(true);
    await signIn(signInData.email, signInData.password);
    setIsLoading(false);
  };

  const handleActivateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً لتفعيل الكود');
      return;
    }

    // Validate code format
    const validation = activationCodeSchema.safeParse(activationCode.trim());
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsActivating(true);
    try {
      const { data, error } = await supabase.rpc('activate_premium_with_code', {
        _code: validation.data,
        _user_id: user.id
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };

      if (result.success) {
        toast.success(result.message || 'تم تفعيل الاشتراك بنجاح');
        setActivationCode('');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        toast.error(result.error || 'فشل التفعيل');
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء التفعيل');
      if (import.meta.env.DEV) {
        console.error('Activation error:', error);
      }
    } finally {
      setIsActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">نظام إدارة العقارات</CardTitle>
          <CardDescription>
            سجل دخول أو أنشئ حساب جديد للمتابعة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">دخول</TabsTrigger>
              <TabsTrigger value="signup">حساب جديد</TabsTrigger>
              <TabsTrigger value="activate">تفعيل</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4 mt-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="example@email.com"
                      className="pr-10"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      required
                    />
                  </div>
                  {signInErrors.email && (
                    <p className="text-sm text-destructive">{signInErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      className="pr-10"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      required
                    />
                  </div>
                  {signInErrors.password && (
                    <p className="text-sm text-destructive">{signInErrors.password}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary shadow-soft hover:shadow-elegant transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">الاسم الكامل</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="محمد أحمد"
                      className="pr-10"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  {signUpErrors.fullName && (
                    <p className="text-sm text-destructive">{signUpErrors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="example@email.com"
                      className="pr-10"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                    />
                  </div>
                  {signUpErrors.email && (
                    <p className="text-sm text-destructive">{signUpErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      className="pr-10"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      required
                    />
                  </div>
                  {signUpErrors.password && (
                    <p className="text-sm text-destructive">{signUpErrors.password}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    6 أحرف على الأقل
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary shadow-soft hover:shadow-elegant transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
                </Button>
              </form>
              
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  سيتم إنشاء حساب زائر بجلسة 8 ساعات تلقائياً
                </p>
              </div>
            </TabsContent>

            <TabsContent value="activate" className="space-y-4 mt-4">
              <form onSubmit={handleActivateCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="activation-code">كود التفعيل</Label>
                  <div className="relative">
                    <KeyRound className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="activation-code"
                      type="text"
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      className="pr-10 font-mono uppercase"
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    أدخل كود التفعيل للحصول على اشتراك سنوي
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary shadow-soft hover:shadow-elegant transition-all"
                  disabled={isActivating || !user}
                >
                  {isActivating ? 'جاري التفعيل...' : 'تفعيل الاشتراك'}
                </Button>
              </form>
              
              {!user && (
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                    يجب تسجيل الدخول أولاً لتفعيل الكود
                  </p>
                </div>
              )}

              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">ميزات الاشتراك السنوي:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>وصول كامل لجميع الميزات</li>
                  <li>بدون حد زمني للجلسة</li>
                  <li>صلاحية لمدة سنة كاملة</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
