import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { Layout } from '@/components/Layout';
import { Copy, Plus, Trash2, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface ActivationCode {
  id: string;
  code: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  duration_days: number;
}

export default function Admin() {
  const navigate = useNavigate();
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState('365');

  const generateCode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_activation_code', {
        _duration_days: parseInt(duration)
      });

      if (error) throw error;

      toast.success(`تم إنشاء الكود: ${data}`);
      loadCodes();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error generating code:', error);
      }
      toast.error('فشل إنشاء الكود: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activation_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error loading codes:', error);
      }
      toast.error('فشل تحميل الأكواد');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('تم نسخ الكود');
  };

  const deleteCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('activation_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('تم حذف الكود');
      loadCodes();
    } catch (error: any) {
      toast.error('فشل حذف الكود');
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">لوحة الإدارة</h1>
            <p className="text-muted-foreground">إدارة أكواد التفعيل والمستخدمين</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/companies')} variant="outline" className="gap-2">
              <Building2 className="h-4 w-4" />
              إدارة الشركات
            </Button>
            <Button onClick={() => navigate('/create-admin')} className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء مستخدم مدير
            </Button>
          </div>
        </div>

        {/* Generate Code Section */}
        <Card>
          <CardHeader>
            <CardTitle>إنشاء كود تفعيل جديد</CardTitle>
            <CardDescription>
              قم بإنشاء كود تفعيل لمنح المستخدمين اشتراك premium
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="duration">مدة الاشتراك (بالأيام)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="365"
                />
              </div>
              <Button 
                onClick={generateCode} 
                disabled={loading}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                إنشاء كود
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Codes List Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>جميع أكواد التفعيل</CardTitle>
                <CardDescription>
                  عرض وإدارة الأكواد المُنشأة
                </CardDescription>
              </div>
              <Button variant="outline" onClick={loadCodes} disabled={loading}>
                تحديث
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {codes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد أكواد. قم بإنشاء كود جديد أعلاه.
              </div>
            ) : (
              <div className="space-y-2">
                {codes.map((code) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-mono font-bold">
                          {code.code}
                        </code>
                        <Badge variant={code.is_used ? 'secondary' : 'default'}>
                          {code.is_used ? 'مستخدم' : 'متاح'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        المدة: {code.duration_days} يوم • 
                        تم الإنشاء: {format(new Date(code.created_at), 'dd/MM/yyyy')}
                        {code.is_used && code.used_at && (
                          <> • تم الاستخدام: {format(new Date(code.used_at), 'dd/MM/yyyy')}</>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!code.is_used && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyCode(code.code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCode(code.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
