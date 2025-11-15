-- Make property_id nullable in units table to allow standalone ground houses
ALTER TABLE public.units 
ALTER COLUMN property_id DROP NOT NULL;