-- Create clients table FIRST
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  id_number text NOT NULL,
  nationality text NOT NULL,
  address text,
  client_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create properties table
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  location text NOT NULL,
  floors integer NOT NULL,
  total_units integer NOT NULL,
  rented_units integer NOT NULL DEFAULT 0,
  available_units integer NOT NULL,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'AED',
  status text NOT NULL,
  units_per_floor integer,
  unit_format text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create units table (references both properties and clients)
CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  floor integer NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  rented_by uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(property_id, unit_number)
);

-- Create contracts table
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  unit_number text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  monthly_rent numeric NOT NULL,
  currency text NOT NULL DEFAULT 'AED',
  payment_schedule text NOT NULL,
  payment_method text NOT NULL,
  number_of_payments text,
  check_dates text,
  payment_dates text,
  check_numbers text,
  bank_name text,
  status text NOT NULL DEFAULT 'active',
  terminated_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'AED',
  due_date date NOT NULL,
  paid_date date,
  payment_method text NOT NULL,
  check_number text,
  bank_name text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create maintenance_requests table
CREATE TABLE public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  description text NOT NULL,
  priority text NOT NULL,
  status text NOT NULL,
  request_date date NOT NULL,
  completed_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- RLS for clients
CREATE POLICY "Users can view their own clients"
ON public.clients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own clients"
ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients"
ON public.clients FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients"
ON public.clients FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS for properties
CREATE POLICY "Users can view their own properties"
ON public.properties FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own properties"
ON public.properties FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own properties"
ON public.properties FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own properties"
ON public.properties FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS for units
CREATE POLICY "Users can view units of their properties"
ON public.units FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = units.property_id AND properties.user_id = auth.uid()));
CREATE POLICY "Users can insert units for their properties"
ON public.units FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = units.property_id AND properties.user_id = auth.uid()));
CREATE POLICY "Users can update units of their properties"
ON public.units FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = units.property_id AND properties.user_id = auth.uid()));
CREATE POLICY "Users can delete units of their properties"
ON public.units FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.properties WHERE properties.id = units.property_id AND properties.user_id = auth.uid()));

-- RLS for contracts
CREATE POLICY "Users can view their own contracts"
ON public.contracts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contracts"
ON public.contracts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contracts"
ON public.contracts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contracts"
ON public.contracts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS for payments
CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own payments"
ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own payments"
ON public.payments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own payments"
ON public.payments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS for maintenance_requests
CREATE POLICY "Users can view their own maintenance requests"
ON public.maintenance_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own maintenance requests"
ON public.maintenance_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own maintenance requests"
ON public.maintenance_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own maintenance requests"
ON public.maintenance_requests FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();