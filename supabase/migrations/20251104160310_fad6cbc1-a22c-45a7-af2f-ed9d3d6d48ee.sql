-- =====================================================
-- Migration: Multi-Tenant System with Companies
-- =====================================================

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  subdomain TEXT UNIQUE,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create company_features table for managing features per company
CREATE TABLE IF NOT EXISTS public.company_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  limit_value INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, feature_name)
);

-- 3. Create company_users table to link users to companies
CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- 4. Add company_id to existing tables
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_company_id ON public.properties(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_company_id ON public.maintenance_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_units_company_id ON public.units(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);

-- 6. Enable RLS on new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- 7. Create function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_users
  WHERE user_id = _user_id
    AND is_active = true
  LIMIT 1
$$;

-- 8. Create function to check if user has feature access
CREATE OR REPLACE FUNCTION public.has_company_feature(_company_id UUID, _feature_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_enabled
     FROM public.company_features
     WHERE company_id = _company_id
       AND feature_name = _feature_name
     LIMIT 1),
    true  -- Default to true if feature not explicitly set
  )
$$;

-- 9. RLS Policies for companies table
CREATE POLICY "Users can view their company"
  ON public.companies FOR SELECT
  USING (id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update companies"
  ON public.companies FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete companies"
  ON public.companies FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. RLS Policies for company_features
CREATE POLICY "Users can view their company features"
  ON public.company_features FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage company features"
  ON public.company_features FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 11. RLS Policies for company_users
CREATE POLICY "Users can view their company users"
  ON public.company_users FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage company users"
  ON public.company_users FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 12. Update RLS policies for existing tables to include company isolation
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
CREATE POLICY "Users can view their company properties"
  ON public.properties FOR SELECT
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;
CREATE POLICY "Users can insert their company properties"
  ON public.properties FOR INSERT
  WITH CHECK (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
CREATE POLICY "Users can update their company properties"
  ON public.properties FOR UPDATE
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;
CREATE POLICY "Users can delete their company properties"
  ON public.properties FOR DELETE
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

-- Similar updates for clients table
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Users can view their company clients"
  ON public.clients FOR SELECT
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
CREATE POLICY "Users can insert their company clients"
  ON public.clients FOR INSERT
  WITH CHECK (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
CREATE POLICY "Users can update their company clients"
  ON public.clients FOR UPDATE
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
CREATE POLICY "Users can delete their company clients"
  ON public.clients FOR DELETE
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

-- Similar updates for contracts table
DROP POLICY IF EXISTS "Users can view their own contracts" ON public.contracts;
CREATE POLICY "Users can view their company contracts"
  ON public.contracts FOR SELECT
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert their own contracts" ON public.contracts;
CREATE POLICY "Users can insert their company contracts"
  ON public.contracts FOR INSERT
  WITH CHECK (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;
CREATE POLICY "Users can update their company contracts"
  ON public.contracts FOR UPDATE
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can delete their own contracts" ON public.contracts;
CREATE POLICY "Users can delete their company contracts"
  ON public.contracts FOR DELETE
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

-- Similar updates for payments table
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their company payments"
  ON public.payments FOR SELECT
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
CREATE POLICY "Users can insert their company payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
CREATE POLICY "Users can update their company payments"
  ON public.payments FOR UPDATE
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can delete their own payments" ON public.payments;
CREATE POLICY "Users can delete their company payments"
  ON public.payments FOR DELETE
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

-- Similar updates for maintenance_requests table
DROP POLICY IF EXISTS "Users can view their own maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Users can view their company maintenance requests"
  ON public.maintenance_requests FOR SELECT
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert their own maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Users can insert their company maintenance requests"
  ON public.maintenance_requests FOR INSERT
  WITH CHECK (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their own maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Users can update their company maintenance requests"
  ON public.maintenance_requests FOR UPDATE
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can delete their own maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Users can delete their company maintenance requests"
  ON public.maintenance_requests FOR DELETE
  USING (
    (company_id IS NULL AND user_id = auth.uid()) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

-- Similar updates for units table
DROP POLICY IF EXISTS "Users can view their units" ON public.units;
CREATE POLICY "Users can view their company units"
  ON public.units FOR SELECT
  USING (
    (company_id IS NULL AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM properties WHERE properties.id = units.property_id AND properties.user_id = auth.uid()
    ))) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert their units" ON public.units;
CREATE POLICY "Users can insert their company units"
  ON public.units FOR INSERT
  WITH CHECK (
    (company_id IS NULL AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM properties WHERE properties.id = units.property_id AND properties.user_id = auth.uid()
    ))) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their units" ON public.units;
CREATE POLICY "Users can update their company units"
  ON public.units FOR UPDATE
  USING (
    (company_id IS NULL AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM properties WHERE properties.id = units.property_id AND properties.user_id = auth.uid()
    ))) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can delete their units" ON public.units;
CREATE POLICY "Users can delete their company units"
  ON public.units FOR DELETE
  USING (
    (company_id IS NULL AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM properties WHERE properties.id = units.property_id AND properties.user_id = auth.uid()
    ))) OR
    (company_id = public.get_user_company_id(auth.uid()))
  );

-- 13. Add triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_features_updated_at
  BEFORE UPDATE ON public.company_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Insert default company for existing users (optional - helps migration)
-- This will be done manually via the admin interface