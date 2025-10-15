import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Property } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

interface PropertyDeleteButtonProps {
  property: Property;
}

export function PropertyDeleteButton({ property }: PropertyDeleteButtonProps) {
  const { deleteProperty } = useApp();
  const { toast } = useToast();

  const handleDelete = async () => {
    deleteProperty(property.id);
    toast({
      title: "تم الحذف بنجاح",
      description: "تم حذف العقار بنجاح",
    });
  };

  return (
    <Button 
      variant="destructive" 
      size="sm" 
      onClick={handleDelete}
      className="px-2"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}