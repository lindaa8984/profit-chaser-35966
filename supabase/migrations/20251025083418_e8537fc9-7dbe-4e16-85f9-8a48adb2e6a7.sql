-- Add house_type and location columns to units table for ground houses and shops
ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS house_type text,
ADD COLUMN IF NOT EXISTS location text;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_units_unit_type ON public.units(unit_type);

-- Add comment for documentation
COMMENT ON COLUMN public.units.house_type IS 'Type of house for ground houses (بيت, فيلا) or shop type';
COMMENT ON COLUMN public.units.location IS 'Physical location/address for standalone units (ground houses, shops)';