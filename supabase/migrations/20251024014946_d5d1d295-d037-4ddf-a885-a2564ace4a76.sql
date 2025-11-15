-- إضافة عمود unit_type لتحديد نوع الوحدة (سكني، تجاري، بيت أرضي)
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS unit_type text DEFAULT 'residential' CHECK (unit_type IN ('residential', 'commercial', 'ground_house'));

-- تحديث الوحدات الموجودة لتكون سكنية افتراضياً
UPDATE public.units 
SET unit_type = 'residential' 
WHERE unit_type IS NULL;

-- إنشاء فهرس لتسريع البحث حسب نوع الوحدة
CREATE INDEX IF NOT EXISTS idx_units_unit_type ON public.units(unit_type);