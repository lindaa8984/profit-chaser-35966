-- Fix companies RLS policies to allow admin insertion without company_id requirement
DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;

CREATE POLICY "Admins can insert companies"
ON public.companies
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Ensure the company_features policies work correctly for new companies
DROP POLICY IF EXISTS "Admins can manage company features" ON public.company_features;

CREATE POLICY "Admins can manage all company features"
ON public.company_features
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));