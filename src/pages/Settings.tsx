import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const Settings = () => {
  const { toast } = useToast();

  const handleClearData = () => {
    storage.clearAll();
    storage.initializeDefaults();
    
    toast({
      title: 'تم مسح البيانات',
      description: 'تم مسح جميع البيانات وإعادة تعيين النظام',
    });
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleResetDefaults = () => {
    storage.initializeDefaults();
    
    toast({
      title: 'تم إعادة التعيين',
      description: 'تم إعادة تعيين البيانات الافتراضية',
    });
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">إدارة إعدادات النظام</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات النظام</CardTitle>
          <CardDescription>
            نظام إدارة الصرافة - الإصدار 1.0.0
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">العملات المدعومة</p>
              <p className="text-lg font-medium mt-1">SDG, AED</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">نوع التخزين</p>
              <p className="text-lg font-medium mt-1">Local Storage</p>
            </div>
          </div>
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 ml-2 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">ملاحظة هامة</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  يتم حفظ جميع البيانات محلياً في متصفحك. لا يتم مشاركة البيانات مع أي خادم خارجي.
                  قد يؤدي مسح بيانات المتصفح إلى فقدان جميع البيانات المحفوظة.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إدارة البيانات</CardTitle>
          <CardDescription>
            خيارات متقدمة لإدارة بيانات النظام
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">إعادة تعيين البيانات الافتراضية</p>
              <p className="text-sm text-muted-foreground">
                إعادة إنشاء المستخدم الافتراضي والخزنة الرئيسية
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <RefreshCw className="ml-2 h-4 w-4" />
                  إعادة تعيين
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>إعادة تعيين البيانات الافتراضية</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم إعادة إنشاء المستخدم الافتراضي والخزنة الرئيسية وسعر الصرف الافتراضي.
                    هل تريد المتابعة؟
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetDefaults}>
                    متابعة
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div>
              <p className="font-medium text-destructive">مسح جميع البيانات</p>
              <p className="text-sm text-muted-foreground">
                حذف جميع الخزن، العملاء، العمليات، والبيانات الأخرى (لا يمكن التراجع)
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="ml-2 h-4 w-4" />
                  مسح الكل
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>تحذير: مسح جميع البيانات</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم حذف جميع البيانات بشكل دائم ولا يمكن استرجاعها.
                    هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    نعم، مسح جميع البيانات
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>معلومات للمطورين</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">التقنيات المستخدمة:</span> React, TypeScript, Tailwind CSS</p>
            <p><span className="font-medium">التخزين:</span> localStorage API</p>
            <p><span className="font-medium">المصادقة:</span> نظام بسيط (تجريبي)</p>
            <p className="text-muted-foreground mt-4">
              للإنتاج الفعلي، يُنصح باستخدام قاعدة بيانات حقيقية ونظام مصادقة آمن.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
