-- إضافة عمود user_id إلى جدول units للوحدات المستقلة
ALTER TABLE public.units 
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- تحديث السياسات لتسمح بالوصول للوحدات المستقلة
DROP POLICY IF EXISTS "Users can view units of their properties" ON public.units;
DROP POLICY IF EXISTS "Users can insert units for their properties" ON public.units;
DROP POLICY IF EXISTS "Users can update units of their properties" ON public.units;
DROP POLICY IF EXISTS "Users can delete units of their properties" ON public.units;

-- سياسة جديدة للعرض: الوحدات المرتبطة بعقار أو المستقلة
CREATE POLICY "Users can view their units"
ON public.units
FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = units.property_id
    AND properties.user_id = auth.uid()
  )
);

-- سياسة جديدة للإضافة
CREATE POLICY "Users can insert their units"
ON public.units
FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = units.property_id
    AND properties.user_id = auth.uid()
  )
);

-- سياسة جديدة للتحديث
CREATE POLICY "Users can update their units"
ON public.units
FOR UPDATE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = units.property_id
    AND properties.user_id = auth.uid()
  )
);

-- سياسة جديدة للحذف
CREATE POLICY "Users can delete their units"
ON public.units
FOR DELETE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = units.property_id
    AND properties.user_id = auth.uid()
  )
);

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_units_user_id ON public.units(user_id);
CREATE INDEX IF NOT EXISTS idx_units_unit_type_user_id ON public.units(unit_type, user_id);