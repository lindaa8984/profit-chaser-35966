import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { Building2, Plus, Trash2, Edit, Settings, Upload, Download, Archive, Users } from 'lucide-react';
import { format } from 'date-fns';

interface Company {
  id: string;
  name: string;
  name_en: string;
  logo_url: string | null;
  primary_color: string;
  subdomain: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

interface CompanyFeature {
  id: string;
  company_id: string;
  feature_name: string;
  is_enabled: boolean;
  limit_value: number | null;
}

interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  user_email?: string;
  user_name?: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

const AVAILABLE_FEATURES = [
  { name: 'export', label: 'تصدير البيانات', label_en: 'Export Data' },
  { name: 'advanced_reports', label: 'التقارير المتقدمة', label_en: 'Advanced Reports' },
  { name: 'maintenance', label: 'إدارة الصيانة', label_en: 'Maintenance Management' },
  { name: 'unlimited_properties', label: 'عقارات غير محدودة', label_en: 'Unlimited Properties' },
  { name: 'unlimited_users', label: 'مستخدمين غير محدودين', label_en: 'Unlimited Users' },
  { name: 'cloud_backup', label: 'النسخ الاحتياطي السحابي', label_en: 'Cloud Backup' },
  { name: 'api_access', label: 'الوصول للـ API', label_en: 'API Access' },
];

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showFeaturesDialog, setShowFeaturesDialog] = useState(false);
  const [companyFeatures, setCompanyFeatures] = useState<CompanyFeature[]>([]);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [companyUserCounts, setCompanyUserCounts] = useState<Record<string, number>>({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    logo_url: '',
    primary_color: '#3b82f6',
    subdomain: '',
    contact_email: '',
    contact_phone: '',
    address: '',
  });

  useEffect(() => {
    loadCompanies();
    loadAllUsers();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);

      // Load user counts for each company
      if (data && data.length > 0) {
        const counts: Record<string, number> = {};
        for (const company of data) {
          const { count, error: countError } = await supabase
            .from('company_users')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('is_active', true);
          
          if (!countError) {
            counts[company.id] = count || 0;
          }
        }
        setCompanyUserCounts(counts);
      }
    } catch (error: any) {
      console.error('Error loading companies:', error);
      toast.error('فشل تحميل الشركات');
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name
        `)
        .order('email');

      if (error) throw error;

      // Get user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const usersWithRoles = (data || []).map((user: any) => ({
        ...user,
        role: rolesData?.find((r: any) => r.user_id === user.id)?.role || 'guest'
      }));

      setAllUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error loading users:', error);
    }
  };

  const loadCompanyUsers = async (companyId: string) => {
    try {
      // Get company_users first
      const { data: companyUsersData, error: cuError } = await supabase
        .from('company_users')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (cuError) throw cuError;

      if (!companyUsersData || companyUsersData.length === 0) {
        setCompanyUsers([]);
        return;
      }

      // Get user ids
      const userIds = companyUsersData.map((cu: any) => cu.user_id);

      // Get profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        // Still show company_users even if profiles fail
        setCompanyUsers(companyUsersData.map((cu: any) => ({
          ...cu,
          user_email: 'غير متوفر',
          user_name: 'غير متوفر'
        })));
        return;
      }

      // Merge the data
      const formattedUsers = companyUsersData.map((cu: any) => {
        const profile = profilesData?.find((p: any) => p.id === cu.user_id);
        return {
          ...cu,
          user_email: profile?.email || 'غير متوفر',
          user_name: profile?.full_name || 'غير متوفر'
        };
      });

      setCompanyUsers(formattedUsers);
    } catch (error: any) {
      console.error('Error loading company users:', error);
      toast.error('فشل تحميل المستخدمين: ' + error.message);
    }
  };

  const loadCompanyFeatures = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('company_features')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;
      setCompanyFeatures(data || []);
    } catch (error: any) {
      console.error('Error loading features:', error);
      toast.error('فشل تحميل المزايا');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([formData])
        .select()
        .single();

      if (error) throw error;

      toast.success('تم إنشاء الشركة بنجاح');
      setShowAddDialog(false);
      setFormData({
        name: '',
        name_en: '',
        logo_url: '',
        primary_color: '#3b82f6',
        subdomain: '',
        contact_email: '',
        contact_phone: '',
        address: '',
      });
      loadCompanies();

      // Create default features for the new company
      const defaultFeatures = AVAILABLE_FEATURES.map(feature => ({
        company_id: data.id,
        feature_name: feature.name,
        is_enabled: true,
      }));

      await supabase.from('company_features').insert(defaultFeatures);
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error('فشل إنشاء الشركة: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompanyStatus = async (companyId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_active: !isActive })
        .eq('id', companyId);

      if (error) throw error;
      toast.success(isActive ? 'تم تعطيل الشركة' : 'تم تفعيل الشركة');
      loadCompanies();
    } catch (error: any) {
      toast.error('فشل تحديث حالة الشركة');
    }
  };

  const deleteCompany = async (companyId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الشركة؟ سيتم حذف جميع البيانات المرتبطة بها.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
      toast.success('تم حذف الشركة بنجاح');
      loadCompanies();
    } catch (error: any) {
      toast.error('فشل حذف الشركة: ' + error.message);
    }
  };

  const openFeaturesDialog = async (company: Company) => {
    setSelectedCompany(company);
    await loadCompanyFeatures(company.id);
    setShowFeaturesDialog(true);
  };

  const openUsersDialog = async (company: Company) => {
    setSelectedCompany(company);
    await loadCompanyUsers(company.id);
    setShowUsersDialog(true);
    setSelectedUserId('');
  };

  const addUserToCompany = async () => {
    if (!selectedCompany || !selectedUserId) {
      toast.error('يرجى اختيار مستخدم');
      return;
    }

    try {
      // Check if user is already in another company
      const { data: existingAssignment } = await supabase
        .from('company_users')
        .select('*, companies(name)')
        .eq('user_id', selectedUserId)
        .eq('is_active', true)
        .maybeSingle();

      if (existingAssignment) {
        toast.error(`المستخدم مرتبط بالفعل بشركة: ${existingAssignment.companies?.name}`);
        return;
      }

      // Add user to company
      const { error } = await supabase
        .from('company_users')
        .insert([{
          company_id: selectedCompany.id,
          user_id: selectedUserId,
          role: 'user',
          is_active: true
        }]);

      if (error) throw error;

      toast.success('تم إضافة المستخدم بنجاح');
      await loadCompanyUsers(selectedCompany.id);
      await loadCompanies(); // Reload to update counts
      setSelectedUserId('');
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error('فشل إضافة المستخدم: ' + error.message);
    }
  };

  const removeUserFromCompany = async (companyUserId: string) => {
    if (!selectedCompany) return;

    try {
      const { error } = await supabase
        .from('company_users')
        .update({ is_active: false })
        .eq('id', companyUserId);

      if (error) throw error;

      toast.success('تم إزالة المستخدم بنجاح');
      await loadCompanyUsers(selectedCompany.id);
      await loadCompanies(); // Reload to update counts
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast.error('فشل إزالة المستخدم');
    }
  };

  const toggleFeature = async (featureName: string, isEnabled: boolean) => {
    if (!selectedCompany) return;

    try {
      const existingFeature = companyFeatures.find(f => f.feature_name === featureName);

      if (existingFeature) {
        const { error } = await supabase
          .from('company_features')
          .update({ is_enabled: !isEnabled })
          .eq('id', existingFeature.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_features')
          .insert([{
            company_id: selectedCompany.id,
            feature_name: featureName,
            is_enabled: true,
          }]);

        if (error) throw error;
      }

      toast.success(isEnabled ? 'تم تعطيل الميزة' : 'تم تفعيل الميزة');
      loadCompanyFeatures(selectedCompany.id);
    } catch (error: any) {
      toast.error('فشل تحديث الميزة');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, companyId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة فقط');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    setUploadingLogo(true);
    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      // Update company with new logo URL
      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', companyId);

      if (updateError) throw updateError;

      toast.success('تم رفع الشعار بنجاح');
      loadCompanies();
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error('فشل رفع الشعار: ' + error.message);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const exportCompanyData = async (companyId: string) => {
    try {
      toast.loading('جاري تصدير البيانات...');

      // Fetch all company data
      const [company, properties, clients, contracts, payments, maintenance] = await Promise.all([
        supabase.from('companies').select('*').eq('id', companyId).single(),
        supabase.from('properties').select('*').eq('company_id', companyId),
        supabase.from('clients').select('*').eq('company_id', companyId),
        supabase.from('contracts').select('*').eq('company_id', companyId),
        supabase.from('payments').select('*').eq('company_id', companyId),
        supabase.from('maintenance_requests').select('*').eq('company_id', companyId),
      ]);

      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        company: company.data,
        properties: properties.data || [],
        clients: clients.data || [],
        contracts: contracts.data || [],
        payments: payments.data || [],
        maintenance: maintenance.data || [],
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${company.data.name}-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('تم تصدير البيانات بنجاح');
    } catch (error: any) {
      toast.dismiss();
      console.error('Export error:', error);
      toast.error('فشل تصدير البيانات');
    }
  };

  const importCompanyData = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        toast.loading('جاري استيراد البيانات...');
        
        const text = await file.text();
        const backupData = JSON.parse(text);

        // Validate backup structure
        if (!backupData.version || !backupData.company) {
          throw new Error('ملف النسخة الاحتياطية غير صالح');
        }

        // Note: This would need more sophisticated logic to handle conflicts
        toast.dismiss();
        toast.success('تم قراءة ملف النسخة الاحتياطية. قريباً سيتم دعم الاستعادة الكاملة.');
        
      } catch (error: any) {
        toast.dismiss();
        console.error('Import error:', error);
        toast.error('فشل استيراد البيانات: ' + error.message);
      }
    };
    
    input.click();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">إدارة الشركات</h1>
            <p className="text-muted-foreground">إضافة وإدارة الشركات والمزايا الخاصة بكل شركة</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={importCompanyData} className="gap-2">
              <Archive className="h-4 w-4" />
              استعادة نسخة احتياطية
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة شركة جديدة
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة شركة جديدة</DialogTitle>
                <DialogDescription>
                  أدخل معلومات الشركة الجديدة. سيتم إنشاء جميع المزايا تلقائياً.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">الاسم بالعربية *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="name_en">الاسم بالإنجليزية</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="subdomain">النطاق الفرعي</Label>
                    <Input
                      id="subdomain"
                      value={formData.subdomain}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                      placeholder="company-name"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      سيكون: company-name.yourdomain.com
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="primary_color">اللون الأساسي</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary_color"
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="w-20"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="logo_url">رابط الشعار</Label>
                  <Input
                    id="logo_url"
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_email">البريد الإلكتروني</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">رقم الهاتف</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">العنوان</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'جاري الإنشاء...' : 'إنشاء الشركة'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Companies List */}
        <div className="grid gap-4">
          {loading && companies.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                جاري التحميل...
              </CardContent>
            </Card>
          ) : companies.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                لا توجد شركات. قم بإضافة شركة جديدة للبدء.
              </CardContent>
            </Card>
          ) : (
            companies.map((company) => (
              <Card key={company.id} className="overflow-hidden">
                <CardHeader className="pb-3" style={{ borderLeftColor: company.primary_color, borderLeftWidth: 4 }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: company.primary_color + '20' }}>
                          <Building2 className="h-6 w-6" style={{ color: company.primary_color }} />
                        </div>
                      )}
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {company.name}
                          {!company.is_active && <Badge variant="secondary">معطل</Badge>}
                        </CardTitle>
                        <CardDescription>{company.name_en || 'لا يوجد اسم إنجليزي'}</CardDescription>
                      </div>
                    </div>
                     <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, company.id)}
                        className="hidden"
                        id={`logo-upload-${company.id}`}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openUsersDialog(company)}
                        title="إدارة المستخدمين"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => document.getElementById(`logo-upload-${company.id}`)?.click()}
                        disabled={uploadingLogo}
                        title="رفع شعار"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => exportCompanyData(company.id)}
                        title="نسخة احتياطية"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openFeaturesDialog(company)}
                        title="المزايا"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleCompanyStatus(company.id, company.is_active)}
                        title={company.is_active ? 'تعطيل' : 'تفعيل'}
                      >
                        {company.is_active ? '⏸️' : '▶️'}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteCompany(company.id)}
                        className="text-destructive hover:text-destructive"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">المستخدمين</p>
                      <p className="font-medium flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {companyUserCounts[company.id] || 0}
                      </p>
                    </div>
                    {company.subdomain && (
                      <div>
                        <p className="text-muted-foreground">النطاق الفرعي</p>
                        <p className="font-medium">{company.subdomain}</p>
                      </div>
                    )}
                    {company.contact_email && (
                      <div>
                        <p className="text-muted-foreground">البريد الإلكتروني</p>
                        <p className="font-medium">{company.contact_email}</p>
                      </div>
                    )}
                    {company.contact_phone && (
                      <div>
                        <p className="text-muted-foreground">رقم الهاتف</p>
                        <p className="font-medium">{company.contact_phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">تاريخ الإنشاء</p>
                      <p className="font-medium">{format(new Date(company.created_at), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Users Dialog */}
        <Dialog open={showUsersDialog} onOpenChange={setShowUsersDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>إدارة مستخدمي {selectedCompany?.name}</DialogTitle>
              <DialogDescription>
                إضافة أو إزالة المستخدمين المرتبطين بهذه الشركة
              </DialogDescription>
            </DialogHeader>

            {/* Add User Section */}
            <div className="space-y-3 pb-4 border-b">
              <Label>إضافة مستخدم جديد</Label>
              <div className="flex gap-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="اختر مستخدم" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers
                      .filter(user => !companyUsers.find(cu => cu.user_id === user.id))
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email} - {user.full_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={addUserToCompany} disabled={!selectedUserId}>
                  إضافة
                </Button>
              </div>
            </div>

            {/* Current Users List */}
            <div className="space-y-3">
              <Label>المستخدمون الحاليون ({companyUsers.length})</Label>
              {companyUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  لا يوجد مستخدمين مرتبطين بهذه الشركة
                </p>
              ) : (
                <div className="space-y-2">
                  {companyUsers.map((cu) => (
                    <div key={cu.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{cu.user_name || 'بدون اسم'}</p>
                        <p className="text-sm text-muted-foreground">{cu.user_email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{cu.role}</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeUserFromCompany(cu.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Features Dialog */}
        <Dialog open={showFeaturesDialog} onOpenChange={setShowFeaturesDialog}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>إدارة مزايا {selectedCompany?.name}</DialogTitle>
              <DialogDescription>
                قم بتفعيل أو تعطيل المزايا المتاحة لهذه الشركة
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {AVAILABLE_FEATURES.map((feature) => {
                const companyFeature = companyFeatures.find(f => f.feature_name === feature.name);
                const isEnabled = companyFeature?.is_enabled ?? true;

                return (
                  <div key={feature.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{feature.label}</p>
                      <p className="text-sm text-muted-foreground">{feature.label_en}</p>
                    </div>
                    <Button
                      variant={isEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleFeature(feature.name, isEnabled)}
                    >
                      {isEnabled ? 'مفعل' : 'معطل'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
