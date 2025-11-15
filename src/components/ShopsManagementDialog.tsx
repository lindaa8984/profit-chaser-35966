import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Store, 
  MapPin
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { ShopDetailsDialog } from "./ShopDetailsDialog";

interface Shop {
  id: string;
  unit_number: string;
  floor: number;
  is_available: boolean;
  user_id: string;
  property_id: string | null;
  name?: string;
}

interface Property {
  id: string;
  name: string;
  location: string;
}

interface ShopsManagementDialogProps {
  shops: Shop[];
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopsManagementDialog({ 
  shops, 
  property, 
  open, 
  onOpenChange 
}: ShopsManagementDialogProps) {
  const { contracts } = useApp();
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [showShopDetails, setShowShopDetails] = useState(false);

  // Get contract for each shop
  const getShopContract = (shop: Shop) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return contracts.find(c => {
      const endDate = new Date(c.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      return c.unitNumber === shop.unit_number &&
        endDate >= today &&
        c.status !== 'terminated';
    });
  };

  const availableShops = shops.filter(shop => !getShopContract(shop));
  const occupiedShops = shops.filter(shop => !!getShopContract(shop));

  const handleShopClick = (shop: Shop) => {
    setSelectedShop(shop);
    setShowShopDetails(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Store className="h-5 w-5" />
              إدارة المحلات التجارية
            </DialogTitle>
            <p className="text-base font-medium text-primary mt-1">
              {property.name}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" />
              {property.location}
            </p>
          </div>
        </DialogHeader>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <div className="text-primary font-medium text-sm">إجمالي المحلات</div>
            <div className="text-primary text-2xl font-bold">{shops.length}</div>
          </div>
          
          <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-center">
            <div className="text-success font-medium text-sm">المتاحة</div>
            <div className="text-success text-2xl font-bold">{availableShops.length}</div>
          </div>
          
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
            <div className="text-destructive font-medium text-sm">المشغولة</div>
            <div className="text-destructive text-2xl font-bold">{occupiedShops.length}</div>
          </div>
        </div>

        <Separator />

        {/* Shops Grid - organized by floor */}
        <div className="space-y-4 mt-4">
          <h4 className="font-semibold text-base">المحلات:</h4>
          
          {/* Group shops by floor */}
          {Array.from(new Set(shops.map(s => s.floor)))
            .sort((a, b) => a - b)
            .map((floor) => {
              const floorShops = shops.filter(s => s.floor === floor);
              
              return (
                <div key={floor} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Store className="h-4 w-4" />
                    <span>الطابق {floor} ({floorShops.length} {floorShops.length === 1 ? 'محل' : 'محلات'})</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {floorShops
                      .sort((a, b) => a.unit_number.localeCompare(b.unit_number))
                      .map((shop) => {
                        const isOccupied = !!getShopContract(shop);
                        
                        return (
                          <Card 
                            key={shop.id} 
                            className="shadow-soft hover:shadow-elegant transition-all duration-300 cursor-pointer group"
                            onClick={() => handleShopClick(shop)}
                          >
                            <CardContent className="p-4 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <Store className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-lg group-hover:text-primary transition-colors">
                                  {shop.unit_number}
                                </span>
                                {shop.name && (
                                  <span className="text-xs text-muted-foreground truncate w-full">
                                    {shop.name}
                                  </span>
                                )}
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
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              );
            })}
        </div>
      </DialogContent>
      
      {/* Shop Details Dialog */}
      {selectedShop && (
        <ShopDetailsDialog
          shop={selectedShop}
          property={property}
          open={showShopDetails}
          onOpenChange={setShowShopDetails}
        />
      )}
    </Dialog>
  );
}
