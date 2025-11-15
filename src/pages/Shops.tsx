import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Store, MapPin, Download, Plus, Trash2, Building2, Upload, Edit2, Settings } from "lucide-react";
import { ImportDialog } from "@/components/ImportDialog";
import { ShopsManagementDialog } from "@/components/ShopsManagementDialog";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-helper";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/lib/translations";

interface Shop {
  id: string;
  unit_number: string;
  floor: number;
  is_available: boolean;
  user_id: string;
  property_id: string | null;
}

interface Property {
  id: string;
  name: string;
  location: string;
}

export default function Shops() {
  const { contracts, language } = useApp();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [shops, setShops] = useState<Shop[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [filterType, setFilterType] = useState<"all" | "property" | "standalone">("all");
  const [showManagementDialog, setShowManagementDialog] = useState(false);
  const [selectedPropertyForManagement, setSelectedPropertyForManagement] = useState<{ propertyId: string, shops: Shop[] } | null>(null);
  
  // للمحل المنفرد
  const [newShopNumber, setNewShopNumber] = useState("");
  const [shopLocation, setShopLocation] = useState("");
  
  // للمحلات من عقار
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [numberOfShops, setNumberOfShops] = useState("1");
  const [shopPrefix, setShopPrefix] = useState("M");
  const [shopName, setShopName] = useState(""); // اسم المحل (اختياري)

  useEffect(() => {
    document.title = "المحلات التجارية | إدارة المحلات";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'إدارة جميع المحلات التجارية المرتبطة بالعقارات والمستقلة');
    }
    fetchShops();
    fetchProperties();
  }, [user]);

  const refreshShops = () => {
    fetchShops();
  };

  const fetchProperties = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, location')
        .eq('user_id', user.id);

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchShops = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('user_id', user.id)
        .eq('unit_type', 'commercial');

      if (error) throw error;
      setShops(data || []);
    } catch (error) {
      console.error('Error fetching shops:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل المحلات التجارية",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addStandaloneShop = async () => {
    if (!newShopNumber.trim() || !shopLocation.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('units')
        .insert({
          unit_number: newShopNumber,
          floor: 1,
          is_available: true,
          user_id: user.id,
          property_id: null,
          unit_type: 'commercial',
          location: shopLocation
        })
        .select()
        .single();

      if (error) throw error;

      setShops([...shops, data]);
      setNewShopNumber("");
      setShopLocation("");
      setShowAddDialog(false);
      
      toast({
        title: "تم بنجاح",
        description: "تم إضافة المحل التجاري بنجاح"
      });
    } catch (error) {
      console.error('Error adding shop:', error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة المحل التجاري",
        variant: "destructive"
      });
    }
  };

  const addShopsFromProperty = async () => {
    if (!selectedPropertyId || !numberOfShops || !user) return;

    const numShops = parseInt(numberOfShops);
    if (numShops < 1) return;

    try {
      const selectedProperty = properties.find(p => p.id === selectedPropertyId);
      if (!selectedProperty) return;

      // إنشاء محلات متعددة
      const newShops: any[] = [];
      for (let i = 1; i <= numShops; i++) {
        const shopData: any = {
          unit_number: `${shopPrefix}-${i.toString().padStart(2, '0')}`,
          floor: 1,
          is_available: true,
          user_id: user.id,
          property_id: selectedPropertyId,
          unit_type: 'commercial'
        };
        
        // إضافة اسم المحل إذا تم إدخاله
        if (shopName.trim()) {
          shopData.name = shopName;
        }
        
        newShops.push(shopData);
      }

      const { data, error } = await supabase
        .from('units')
        .insert(newShops)
        .select();

      if (error) throw error;

      setShops([...shops, ...data]);
      setSelectedPropertyId("");
      setNumberOfShops("1");
      setShopPrefix("M");
      setShopName("");
      setShowAddDialog(false);
      
      toast({
        title: "تم بنجاح",
        description: `تم إضافة ${numShops} محل تجاري من عقار ${selectedProperty.name}`
      });
    } catch (error) {
      console.error('Error adding shops from property:', error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة المحلات التجارية",
        variant: "destructive"
      });
    }
  };

  const deleteShop = async (shopId: string) => {
    try {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', shopId);

      if (error) throw error;

      setShops(shops.filter(s => s.id !== shopId));
      
      toast({
        title: "تم بنجاح",
        description: "تم حذف المحل التجاري بنجاح"
      });
    } catch (error) {
      console.error('Error deleting shop:', error);
      toast({
        title: "خطأ",
        description: "فشل في حذف المحل التجاري",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (shop: Shop) => {
    setEditingShop(shop);
    setNewShopNumber(shop.unit_number);
    setShopLocation((shop as any).location || "");
    setShowEditDialog(true);
  };

  const updateShop = async () => {
    if (!editingShop || !newShopNumber.trim()) return;

    try {
      const updateData: any = {
        unit_number: newShopNumber
      };

      // إضافة الموقع فقط إذا كان المحل منفرد (غير مرتبط بعقار)
      if (!editingShop.property_id && shopLocation.trim()) {
        updateData.location = shopLocation;
      }

      const { error } = await supabase
        .from('units')
        .update(updateData)
        .eq('id', editingShop.id);

      if (error) throw error;

      setShops(shops.map(s => 
        s.id === editingShop.id 
          ? { ...s, unit_number: newShopNumber, location: shopLocation }
          : s
      ));
      
      setShowEditDialog(false);
      setEditingShop(null);
      setNewShopNumber("");
      setShopLocation("");
      
      toast({
        title: "تم بنجاح",
        description: "تم تحديث المحل التجاري بنجاح"
      });
    } catch (error) {
      console.error('Error updating shop:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث المحل التجاري",
        variant: "destructive"
      });
    }
  };

  // حساب حالة المحل بناءً على العقود النشطة
  const getShopOccupancyStatus = (shopNumber: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const shopContract = contracts.find(c => {
      const endDate = new Date(c.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      return c.unitNumber === shopNumber &&
        endDate >= today &&
        c.status !== 'terminated';
    });
    
    return !!shopContract;
  };

  const filteredShops = shops.filter(shop => {
    const matchesSearch = shop.unit_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === "property") {
      return matchesSearch && shop.property_id !== null;
    } else if (filterType === "standalone") {
      return matchesSearch && shop.property_id === null;
    }
    
    return matchesSearch;
  });

  // تجميع المحلات حسب العقار
  const groupedByProperty: { [propertyId: string]: Shop[] } = {};
  const standaloneShops: Shop[] = [];

  filteredShops.forEach(shop => {
    if (shop.property_id) {
      if (!groupedByProperty[shop.property_id]) {
        groupedByProperty[shop.property_id] = [];
      }
      groupedByProperty[shop.property_id].push(shop);
    } else {
      standaloneShops.push(shop);
    }
  });

  const availableCount = filteredShops.filter(shop => !getShopOccupancyStatus(shop.unit_number)).length;
  const occupiedCount = filteredShops.filter(shop => getShopOccupancyStatus(shop.unit_number)).length;

  if (loading) {
    return <div className="text-center py-12">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("shops.title", language)}</h1>
          <p className="text-muted-foreground">{t("shops.subtitle", language)}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filterType === "all" ? "default" : "outline"}
            onClick={() => setFilterType("all")}
            size="sm"
          >
            {t("shops.all", language)}
          </Button>
          <Button 
            variant={filterType === "property" ? "default" : "outline"}
            onClick={() => setFilterType("property")}
            size="sm"
          >
            {t("shops.fromProperty", language)}
          </Button>
          <Button 
            variant={filterType === "standalone" ? "default" : "outline"}
            onClick={() => setFilterType("standalone")}
            size="sm"
          >
            {t("shops.standalone", language)}
          </Button>
          <Button onClick={() => setShowExportDialog(true)} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            {t("shops.export", language)}
          </Button>
          <Button onClick={() => setShowImportDialog(true)} variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-1" />
            {t("shops.import", language)}
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                {t("shops.addNew", language)}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إضافة محل تجاري جديد</DialogTitle>
              </DialogHeader>
            
            <Tabs defaultValue="standalone" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="standalone">
                  <Store className="h-4 w-4 ml-2" />
                  محل منفرد
                </TabsTrigger>
                <TabsTrigger value="property">
                  <Building2 className="h-4 w-4 ml-2" />
                  من عقار
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="standalone" className="space-y-4">
                <div>
                  <Label htmlFor="shopNumber">رقم المحل</Label>
                  <Input
                    id="shopNumber"
                    placeholder="مثال: M-01"
                    value={newShopNumber}
                    onChange={(e) => setNewShopNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="shopLocation">الموقع</Label>
                  <Input
                    id="shopLocation"
                    placeholder="مثال: شارع الخليج، دبي"
                    value={shopLocation}
                    onChange={(e) => setShopLocation(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={addStandaloneShop} 
                    disabled={!newShopNumber.trim() || !shopLocation.trim()}
                  >
                    إضافة محل منفرد
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    إلغاء
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="property" className="space-y-4">
                <div>
                  <Label htmlFor="property">اختر العقار</Label>
                  <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر عقار..." />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name} - {property.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedPropertyId && (
                  <>
                    <div>
                      <Label htmlFor="shopPrefix">بادئة رقم المحل</Label>
                      <Input
                        id="shopPrefix"
                        placeholder="مثال: M"
                        value={shopPrefix}
                        onChange={(e) => setShopPrefix(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        سيتم إنشاء المحلات بأرقام: {shopPrefix}-01, {shopPrefix}-02, إلخ...
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="numShops">عدد المحلات</Label>
                      <Input
                        id="numShops"
                        type="number"
                        min="1"
                        max="50"
                        placeholder="مثال: 5"
                        value={numberOfShops}
                        onChange={(e) => setNumberOfShops(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="shopName">اسم المحل (اختياري)</Label>
                      <Input
                        id="shopName"
                        placeholder="مثال: محل ملابس"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                      />
                    </div>
                  </>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={addShopsFromProperty} 
                    disabled={!selectedPropertyId || !numberOfShops || parseInt(numberOfShops) < 1}
                  >
                    إضافة محلات من عقار
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    إلغاء
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("shops.totalShops", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shops.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-success">{t("shops.availableShops", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{availableCount}</div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-destructive">{t("shops.occupiedShops", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{occupiedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="shadow-soft">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("shops.searchPlaceholder", language)}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Shops Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {/* المحلات المجمعة حسب العقار */}
        {Object.entries(groupedByProperty).map(([propertyId, propertyShops]) => {
          const property = properties.find(p => p.id === propertyId);
          const availableInProperty = propertyShops.filter(shop => !getShopOccupancyStatus(shop.unit_number)).length;
          const occupiedInProperty = propertyShops.filter(shop => getShopOccupancyStatus(shop.unit_number)).length;
          
          return (
            <Card key={propertyId} className="shadow-soft hover:shadow-elegant transition-shadow duration-300 group flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {property?.name || "عقار"}
                    </CardTitle>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {propertyShops.length} {propertyShops.length === 1 ? 'محل' : 'محلات'}
                      </Badge>
                      {availableInProperty > 0 && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          {availableInProperty} متاح
                        </Badge>
                      )}
                      {occupiedInProperty > 0 && (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          {occupiedInProperty} مشغول
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <div className="space-y-3 flex-1">
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">{t("common.location", language)}</p>
                    <p className="font-medium text-base">
                      {property?.location || "غير محدد"}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">المحلات التجارية</p>
                    <p className="font-bold text-lg">{propertyShops.length}</p>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => {
                    setSelectedPropertyForManagement({ propertyId, shops: propertyShops });
                    setShowManagementDialog(true);
                  }}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  إدارة المحلات
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {/* المحلات المنفردة */}
        {standaloneShops.map((shop) => {
          const isOccupied = getShopOccupancyStatus(shop.unit_number);
          
          return (
            <Card key={shop.id} className="shadow-soft hover:shadow-elegant transition-shadow duration-300 group flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      محل رقم {shop.unit_number}
                    </CardTitle>
                    <div className="flex gap-1 mt-2">
                      <Badge 
                        variant="outline" 
                        className={isOccupied
                          ? "bg-destructive/10 text-destructive border-destructive/20" 
                          : "bg-success/10 text-success border-success/20"
                        }
                      >
                        {isOccupied ? 'مشغول' : 'متاح'}
                      </Badge>
                    </div>
                  </div>
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <div className="space-y-3 flex-1">
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">{t("common.location", language)}</p>
                    <p className="font-medium text-base">{(shop as any).location || "غير محدد"}</p>
                  </div>
                </div>
              
                <div className="flex justify-between items-center gap-1 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs h-7"
                    onClick={() => openEditDialog(shop)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    {t("shops.edit", language)}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs h-7"
                    onClick={() => deleteShop(shop.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t("shops.delete", language)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredShops.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">لا توجد محلات تجارية مطابقة للبحث</p>
        </div>
      )}

      {showExportDialog && (
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تصدير المحلات التجارية</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">سيتم تصدير جميع المحلات التجارية إلى ملف Excel</p>
            <Button onClick={() => {
              const XLSX = require('xlsx');
              const data = shops.map(shop => ({
                'رقم المحل': shop.unit_number,
                'النوع': shop.property_id ? properties.find(p => p.id === shop.property_id)?.name : 'محل منفرد',
                'الحالة': getShopOccupancyStatus(shop.unit_number) ? 'مشغول' : 'متاح'
              }));
              const ws = XLSX.utils.json_to_sheet(data);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'المحلات');
              XLSX.writeFile(wb, 'المحلات_التجارية.xlsx');
              setShowExportDialog(false);
              toast({
                title: "تم التصدير بنجاح",
                description: "تم تصدير المحلات التجارية إلى ملف Excel"
              });
            }}>
              تصدير الآن
            </Button>
          </DialogContent>
        </Dialog>
      )}

      <ImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        section="shops"
      />

      {/* Shops Management Dialog */}
      {selectedPropertyForManagement && (
        <ShopsManagementDialog
          shops={selectedPropertyForManagement.shops}
          property={properties.find(p => p.id === selectedPropertyForManagement.propertyId)!}
          open={showManagementDialog}
          onOpenChange={setShowManagementDialog}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل محل تجاري</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="editShopNumber">رقم المحل</Label>
              <Input
                id="editShopNumber"
                placeholder="مثال: M-01"
                value={newShopNumber}
                onChange={(e) => setNewShopNumber(e.target.value)}
              />
            </div>
            {editingShop && !editingShop.property_id && (
              <div>
                <Label htmlFor="editShopLocation">الموقع</Label>
                <Input
                  id="editShopLocation"
                  placeholder="مثال: شارع الخليج، دبي"
                  value={shopLocation}
                  onChange={(e) => setShopLocation(e.target.value)}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button 
                onClick={updateShop} 
                disabled={!newShopNumber.trim()}
                className="flex-1"
              >
                حفظ التعديلات
              </Button>
              <Button variant="outline" onClick={() => {
                setShowEditDialog(false);
                setEditingShop(null);
                setNewShopNumber("");
                setShopLocation("");
              }}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
