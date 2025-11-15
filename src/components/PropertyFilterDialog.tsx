import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";

interface PropertyFilterDialogProps {
  open: boolean;
  onClose: () => void;
  onFilter: (propertyId: string | null) => void;
}

export function PropertyFilterDialog({ open, onClose, onFilter }: PropertyFilterDialogProps) {
  const { properties } = useApp();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");

  const handleApply = () => {
    if (selectedProperty === "all") {
      onFilter(null);
    } else {
      onFilter(selectedProperty);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>عرض عقار محدد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">اختر العقار</label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger>
                <SelectValue placeholder="اختر عقار" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">عرض كل العقارات</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id.toString()}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleApply} className="flex-1">
              تطبيق
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
