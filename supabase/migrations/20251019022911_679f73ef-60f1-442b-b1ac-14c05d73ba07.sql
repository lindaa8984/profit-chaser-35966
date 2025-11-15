-- إضافة حقل payment_amounts لحفظ مبالغ الدفعات المخصصة
ALTER TABLE public.contracts 
ADD COLUMN payment_amounts text;