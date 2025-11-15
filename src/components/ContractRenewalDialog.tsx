import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { AlertTriangle, RefreshCw, CalendarIcon } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { cn, formatDateDDMMYYYY } from "@/lib/utils";

interface ContractRenewalDialogProps {
  contract: any;
  open: boolean;
  onClose: () => void;
}

export function ContractRenewalDialog({ contract, open, onClose }: ContractRenewalDialogProps) {
  const { renewContract } = useApp();
  const { toast } = useToast();
  const [newEndDate, setNewEndDate] = useState("");

  // تعيين تاريخ النهاية الجديد تلقائياً عند فتح الحوار
  useEffect(() => {
    if (open && contract?.endDate) {
      const currentEndDate = new Date(contract.endDate);
      const newDate = new Date(currentEndDate);
      newDate.setFullYear(currentEndDate.getFullYear() + 1);
      
      // تنسيق التاريخ للـ input
      const formattedDate = newDate.toISOString().split('T')[0];
      setNewEndDate(formattedDate);
    }
  }, [open, contract?.endDate]);

  const handleRenewalConfirm = () => {
    if (!newEndDate) {
      toast({
        title: "خطأ",
        description: "يجب إدخال تاريخ النهاية الجديد",
        variant: "destructive",
      });
      return;
    }
    handleRenewal();
  };

  const handleRenewal = () => {
    try {
      renewContract(contract.id, newEndDate);
      toast({
        title: "تم بنجاح",
        description: "تم تجديد العقد بنجاح",
      });
      onClose();
      setNewEndDate("");
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تجديد العقد",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    onClose();
    setNewEndDate("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            تجديد العقد
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-md">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="text-sm">هل أنت متأكد من رغبتك في تجديد هذا العقد؟</p>
          </div>

          <div className="space-y-2">
            <Label>تاريخ النهاية الجديد</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-right font-normal",
                    !newEndDate && "text-muted-foreground"
                  )}
                  dir="ltr"
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {newEndDate ? formatDateDDMMYYYY(newEndDate) : "اختر التاريخ"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={newEndDate ? new Date(newEndDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setNewEndDate(format(date, "yyyy-MM-dd"));
                    }
                  }}
                  disabled={(date) => date < new Date(contract.endDate)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleRenewalConfirm} className="flex-1">
              تأكيد التجديد
            </Button>
            <Button onClick={handleClose} variant="outline" className="flex-1">
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}