-- Fix infinite recursion in company_users RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their company users" ON public.company_users;

-- Recreate the policy using the existing get_user_company_id function to avoid recursion
CREATE POLICY "Users can view their company users"
ON public.company_users
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Ensure admins can fully manage companies and company_users
DROP POLICY IF EXISTS "Admins can manage company users" ON public.company_users;

CREATE POLICY "Admins can insert company users"
ON public.company_users
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update company users"
ON public.company_users
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete company users"
ON public.company_users
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));