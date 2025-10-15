import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Client } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

interface ClientDeleteButtonProps {
  client: Client;
}

export function ClientDeleteButton({ client }: ClientDeleteButtonProps) {
  const { deleteClient } = useApp();
  const { toast } = useToast();

  const handleDelete = async () => {
    deleteClient(client.id);
    toast({
      title: "تم الحذف بنجاح",
      description: "تم حذف العميل بنجاح",
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