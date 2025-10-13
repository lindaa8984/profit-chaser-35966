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

  const handleClearVaults = () => {
    storage.saveVaults([]);
    storage.initializeDefaults(); // لإعادة إنشاء الخزنة الرئيسية
    toast({
      title: 'تم مسح الحسابات',
      description: 'تم مسح جميع الحسابات وإعادة إنشاء الخزنة الرئيسية',
    });
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleClearCustomers = () => {
    storage.saveCustomers([]);
    toast({
      title: 'تم مسح العملاء',
      description: 'تم مسح جميع بيانات العملاء بنجاح',
    });
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleClearSuppliers = () => {
    storage.saveSuppliers([]);
    toast({
      title: 'تم مسح الموردين',
      description: 'تم مسح جميع بيانات الموردين بنجاح',
    });
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleClearTransactions = () => {
    storage.saveTransactions([]);
    toast({
      title: 'تم مسح العمليات',
      description: 'تم مسح جميع العمليات المالية بنجاح',
    });
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleClearRates = () => {
    storage.saveRates([]);
    storage.initializeDefaults(); // لإعادة إنشاء السعر الافتراضي
    toast({
      title: 'تم مسح أسعار الصرف',
      description: 'تم مسح أسعار الصرف وإعادة إنشاء السعر الافتراضي',
    });
    setTimeout(() => window.location.reload(), 1000);
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

          <div className="space-y-3">
            <h3 className="font-semibold text-sm mb-3">مسح البيانات بشكل منفصل</h3>
            
            {/* مسح الحسابات */}
            <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div>
                <p className="font-medium text-destructive text-sm">مسح الحسابات</p>
                <p className="text-xs text-muted-foreground">حذف جميع الحسابات (الخزن)</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="ml-2 h-3 w-3" />
                    مسح
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>مسح جميع الحسابات</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف جميع الحسابات (الخزن) بشكل دائم. هل أنت متأكد؟
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearVaults} className="bg-destructive">
                      مسح
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* مسح العملاء */}
            <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div>
                <p className="font-medium text-destructive text-sm">مسح العملاء</p>
                <p className="text-xs text-muted-foreground">حذف جميع بيانات العملاء</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="ml-2 h-3 w-3" />
                    مسح
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>مسح جميع العملاء</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف جميع بيانات العملاء بشكل دائم. هل أنت متأكد؟
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearCustomers} className="bg-destructive">
                      مسح
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* مسح الموردين */}
            <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div>
                <p className="font-medium text-destructive text-sm">مسح الموردين</p>
                <p className="text-xs text-muted-foreground">حذف جميع بيانات الموردين</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="ml-2 h-3 w-3" />
                    مسح
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>مسح جميع الموردين</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف جميع بيانات الموردين بشكل دائم. هل أنت متأكد؟
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearSuppliers} className="bg-destructive">
                      مسح
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* مسح العمليات */}
            <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div>
                <p className="font-medium text-destructive text-sm">مسح العمليات</p>
                <p className="text-xs text-muted-foreground">حذف جميع العمليات المالية</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="ml-2 h-3 w-3" />
                    مسح
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>مسح جميع العمليات</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف جميع العمليات المالية بشكل دائم. هل أنت متأكد؟
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearTransactions} className="bg-destructive">
                      مسح
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* مسح أسعار الصرف */}
            <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div>
                <p className="font-medium text-destructive text-sm">مسح أسعار الصرف</p>
                <p className="text-xs text-muted-foreground">حذف سجل أسعار الصرف</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="ml-2 h-3 w-3" />
                    مسح
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>مسح أسعار الصرف</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف سجل أسعار الصرف بشكل دائم. هل أنت متأكد؟
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearRates} className="bg-destructive">
                      مسح
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>معلومات للمطورين</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-4 bg-primary/10 rounded-lg space-y-2">
              <p><span className="font-medium">المطور:</span> Mutaz Awad</p>
              <p><span className="font-medium">البريد الإلكتروني:</span> <a href="mailto:mutaz@union-sd.com" className="text-primary hover:underline" dir="ltr">mutaz@union-sd.com</a></p>
            </div>
            <div className="space-y-2">
              <p><span className="font-medium">التقنيات المستخدمة:</span> React, TypeScript, Tailwind CSS, Vite</p>
              <p><span className="font-medium">التخزين:</span> localStorage API</p>
              <p><span className="font-medium">المصادقة:</span> نظام بسيط (تجريبي)</p>
            </div>
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
