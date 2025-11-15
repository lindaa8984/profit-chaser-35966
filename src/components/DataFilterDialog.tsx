import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";

interface DataFilterDialogProps {
  open: boolean;
  onClose: () => void;
  onFilter: (propertyId: string | null) => void;
  title?: string;
}

export function DataFilterDialog({ open, onClose, onFilter, title = "عرض البيانات" }: DataFilterDialogProps) {
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">فلترة حسب العقار</label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger>
                <SelectValue placeholder="اختر عقار" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العقارات</SelectItem>
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
              عرض
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
