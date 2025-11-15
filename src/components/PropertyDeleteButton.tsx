import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Property } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PropertyDeleteButtonProps {
  property: Property;
}

export function PropertyDeleteButton({ property }: PropertyDeleteButtonProps) {
  const { deleteProperty } = useApp();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    deleteProperty(property.id);
    toast({
      title: "تم الحذف بنجاح",
      description: "تم حذف العقار بنجاح",
    });
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Button 
        variant="destructive" 
        size="sm" 
        onClick={() => setShowDeleteDialog(true)}
        className="flex-1 text-xs h-7"
      >
        حذف
      </Button>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف العقار "{property.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>لا</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              نعم
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}