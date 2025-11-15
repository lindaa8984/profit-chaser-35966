import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Home, MapPin, Plus, Trash2, Building2, Download, Upload, Edit2 } from "lucide-react";
import { ImportDialog } from "@/components/ImportDialog";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-helper";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/lib/translations";

interface GroundHouse {
  id: string;
  unit_number: string;
  floor: number;
  is_available: boolean;
  user_id: string;
  property_id: string | null;
  house_type?: string;
  location?: string;
}

interface Property {
  id: string;
  name: string;
  location: string;
}

export default function GroundHouses() {
  const { contracts, language } = useApp();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [groundHouses, setGroundHouses] = useState<GroundHouse[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingHouse, setEditingHouse] = useState<GroundHouse | null>(null);
  
  // للبيت المنفرد
  const [newHouseNumber, setNewHouseNumber] = useState("");
  const [houseLocation, setHouseLocation] = useState("");
  const [houseType, setHouseType] = useState("بيت");
  
  // للبيوت من عقار
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [numberOfHouses, setNumberOfHouses] = useState("1");
  const [housePrefix, setHousePrefix] = useState("B");

  useEffect(() => {
    document.title = "البيوت والفلل | إدارة البيوت";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'إدارة جميع البيوت الأرضية');
    }
    fetchGroundHouses();
    fetchProperties();
  }, [user]);

  const refreshGroundHouses = () => {
    fetchGroundHouses();
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

  const fetchGroundHouses = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('user_id', user.id)
        .eq('unit_type', 'ground_house');

      if (error) throw error;
      setGroundHouses(data || []);
    } catch (error) {
      console.error('Error fetching ground houses:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل البيوت الأرضية",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addStandaloneHouse = async () => {
    if (!newHouseNumber.trim() || !houseLocation.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('units')
        .insert({
          unit_number: newHouseNumber,
          floor: 1,
          is_available: true,
          user_id: user.id,
          property_id: null,
          unit_type: 'ground_house',
          house_type: houseType,
          location: houseLocation
        })
        .select()
        .single();

      if (error) throw error;

      setGroundHouses([...groundHouses, data]);
      setNewHouseNumber("");
      setHouseLocation("");
      setHouseType("بيت");
      setShowAddDialog(false);
      
      toast({
        title: "تم بنجاح",
        description: `تم إضافة ${houseType} بنجاح`
      });
    } catch (error) {
      console.error('Error adding ground house:', error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة البيت الأرضي",
        variant: "destructive"
      });
    }
  };

  const addHousesFromProperty = async () => {
    if (!selectedPropertyId || !numberOfHouses || !user) return;

    const numHouses = parseInt(numberOfHouses);
    if (numHouses < 1) return;

    try {
      const selectedProperty = properties.find(p => p.id === selectedPropertyId);
      if (!selectedProperty) return;

      // إنشاء بيوت متعددة
      const newHouses: any[] = [];
      for (let i = 1; i <= numHouses; i++) {
        newHouses.push({
          unit_number: `${housePrefix}-${i.toString().padStart(2, '0')}`,
          floor: 1,
          is_available: true,
          user_id: user.id,
          property_id: selectedPropertyId,
          unit_type: 'ground_house'
        });
      }

      const { data, error } = await supabase
        .from('units')
        .insert(newHouses)
        .select();

      if (error) throw error;

      setGroundHouses([...groundHouses, ...data]);
      setSelectedPropertyId("");
      setNumberOfHouses("1");
      setHousePrefix("B");
      setShowAddDialog(false);
      
      toast({
        title: "تم بنجاح",
        description: `تم إضافة ${numHouses} بيت أرضي من عقار ${selectedProperty.name}`
      });
    } catch (error) {
      console.error('Error adding houses from property:', error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة البيوت الأرضية",
        variant: "destructive"
      });
    }
  };

  const deleteHouse = async (houseId: string) => {
    try {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', houseId);

      if (error) throw error;

      setGroundHouses(groundHouses.filter(h => h.id !== houseId));
      
      toast({
        title: "تم بنجاح",
        description: "تم حذف البيت الأرضي بنجاح"
      });
    } catch (error) {
      console.error('Error deleting house:', error);
      toast({
        title: "خطأ",
        description: "فشل في حذف البيت الأرضي",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (house: GroundHouse) => {
    setEditingHouse(house);
    setNewHouseNumber(house.unit_number);
    setHouseLocation(house.location || "");
    setHouseType(house.house_type || "بيت");
    setShowEditDialog(true);
  };

  const updateHouse = async () => {
    if (!editingHouse || !newHouseNumber.trim() || !houseLocation.trim()) return;

    try {
      const { error } = await supabase
        .from('units')
        .update({
          unit_number: newHouseNumber,
          house_type: houseType,
          location: houseLocation
        })
        .eq('id', editingHouse.id);

      if (error) throw error;

      setGroundHouses(groundHouses.map(h => 
        h.id === editingHouse.id 
          ? { ...h, unit_number: newHouseNumber, house_type: houseType, location: houseLocation }
          : h
      ));
      
      setShowEditDialog(false);
      setEditingHouse(null);
      setNewHouseNumber("");
      setHouseLocation("");
      setHouseType("بيت");
      
      toast({
        title: "تم بنجاح",
        description: "تم تحديث البيت الأرضي بنجاح"
      });
    } catch (error) {
      console.error('Error updating house:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث البيت الأرضي",
        variant: "destructive"
      });
    }
  };

  // حساب حالة البيت بناءً على العقود النشطة
  const getHouseOccupancyStatus = (houseNumber: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const houseContract = contracts.find(c => {
      const endDate = new Date(c.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      return c.unitNumber === houseNumber &&
        endDate >= today &&
        c.status !== 'terminated';
    });
    
    return !!houseContract;
  };

  const filteredHouses = groundHouses.filter(house =>
    house.unit_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableCount = filteredHouses.filter(house => !getHouseOccupancyStatus(house.unit_number)).length;
  const occupiedCount = filteredHouses.filter(house => getHouseOccupancyStatus(house.unit_number)).length;

  if (loading) {
    return <div className="text-center py-12">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("groundHouses.title", language)}</h1>
          <p className="text-muted-foreground">{t("groundHouses.subtitle", language)}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowExportDialog(true)} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            {t("groundHouses.export", language)}
          </Button>
          <Button onClick={() => setShowImportDialog(true)} variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-1" />
            {t("groundHouses.import", language)}
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              {t("groundHouses.addNew", language)}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة بيت أرضي جديد</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="houseType">نوع العقار</Label>
                <Select value={houseType} onValueChange={setHouseType}>
                  <SelectTrigger id="houseType">
                    <SelectValue placeholder="اختر نوع العقار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="بيت">بيت</SelectItem>
                    <SelectItem value="فيلا">فيلا</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="houseNumber">رقم البيت</Label>
                <Input
                  id="houseNumber"
                  placeholder="مثال: B-01 أو فيلا-5"
                  value={newHouseNumber}
                  onChange={(e) => setNewHouseNumber(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="houseLocation">الموقع</Label>
                <Input
                  id="houseLocation"
                  placeholder="مثال: حي الياسمين، الرياض"
                  value={houseLocation}
                  onChange={(e) => setHouseLocation(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={addStandaloneHouse} 
                  disabled={!newHouseNumber.trim() || !houseLocation.trim()}
                  className="flex-1"
                >
                  إضافة
                </Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("groundHouses.totalHouses", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groundHouses.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-success">{t("groundHouses.availableHouses", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{availableCount}</div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-destructive">{t("groundHouses.occupiedHouses", language)}</CardTitle>
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
              placeholder={t("groundHouses.searchPlaceholder", language)}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Houses Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {filteredHouses.map((house) => {
          const isOccupied = getHouseOccupancyStatus(house.unit_number);
          
          return (
            <Card key={house.id} className="shadow-soft hover:shadow-elegant transition-shadow duration-300 group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {house.house_type || 'بيت'} رقم {house.unit_number}
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
                      <Badge variant="outline" className="text-xs">{house.house_type || 'بيت'}</Badge>
                    </div>
                  </div>
                  <Home className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {house.location && (
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">العنوان</p>
                    <p className="font-medium text-sm">{house.location}</p>
                  </div>
                )}
                <div className="text-sm">
                  <p className="text-muted-foreground text-xs">الحالة</p>
                  <p className="font-medium text-base">
                    {isOccupied ? 'مؤجر' : 'متاح للإيجار'}
                  </p>
                </div>
              
                <div className="flex justify-between items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs h-7"
                    onClick={() => openEditDialog(house)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    {t("groundHouses.edit", language)}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs h-7"
                    onClick={() => deleteHouse(house.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t("groundHouses.delete", language)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredHouses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">لا توجد بيوت أرضية مطابقة للبحث</p>
        </div>
      )}

      {showExportDialog && (
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تصدير البيوت الأرضية</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">سيتم تصدير جميع البيوت الأرضية إلى ملف Excel</p>
            <Button onClick={() => {
              const XLSX = require('xlsx');
              const data = groundHouses.map(house => ({
                'رقم البيت': house.unit_number,
                'النوع': house.house_type || 'بيت',
                'العنوان': house.location || '',
                'الحالة': getHouseOccupancyStatus(house.unit_number) ? 'مؤجر' : 'متاح للإيجار'
              }));
              const ws = XLSX.utils.json_to_sheet(data);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'البيوت');
              XLSX.writeFile(wb, 'البيوت_والفلل.xlsx');
              setShowExportDialog(false);
              toast({
                title: "تم التصدير بنجاح",
                description: "تم تصدير البيوت والفلل إلى ملف Excel"
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
        section="ground_houses"
      />

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل بيت أرضي</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="editHouseType">نوع العقار</Label>
              <Select value={houseType} onValueChange={setHouseType}>
                <SelectTrigger id="editHouseType">
                  <SelectValue placeholder="اختر نوع العقار" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="بيت">بيت</SelectItem>
                  <SelectItem value="فيلا">فيلا</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editHouseNumber">رقم البيت</Label>
              <Input
                id="editHouseNumber"
                placeholder="مثال: B-01 أو فيلا-5"
                value={newHouseNumber}
                onChange={(e) => setNewHouseNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editHouseLocation">الموقع</Label>
              <Input
                id="editHouseLocation"
                placeholder="مثال: حي الياسمين، الرياض"
                value={houseLocation}
                onChange={(e) => setHouseLocation(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={updateHouse} 
                disabled={!newHouseNumber.trim() || !houseLocation.trim()}
                className="flex-1"
              >
                حفظ التعديلات
              </Button>
              <Button variant="outline" onClick={() => {
                setShowEditDialog(false);
                setEditingHouse(null);
                setNewHouseNumber("");
                setHouseLocation("");
                setHouseType("بيت");
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
