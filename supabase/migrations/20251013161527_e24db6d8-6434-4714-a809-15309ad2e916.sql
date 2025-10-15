-- Create activation codes table
CREATE TABLE public.activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  is_used boolean NOT NULL DEFAULT false,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  duration_days integer NOT NULL DEFAULT 365
);

-- Enable RLS
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- Only allow users to check their own used codes
CREATE POLICY "Users can view their own used codes"
ON public.activation_codes
FOR SELECT
TO authenticated
USING (used_by = auth.uid());

-- Create function to activate premium subscription with code
CREATE OR REPLACE FUNCTION public.activate_premium_with_code(_code text, _user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record activation_codes%ROWTYPE;
  v_end_date timestamp with time zone;
BEGIN
  -- Check if code exists and is valid
  SELECT * INTO v_code_record
  FROM public.activation_codes
  WHERE code = _code
    AND is_used = false
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'كود غير صالح أو منتهي الصلاحية');
  END IF;
  
  -- Calculate end date
  v_end_date := now() + (v_code_record.duration_days || ' days')::interval;
  
  -- Mark code as used
  UPDATE public.activation_codes
  SET is_used = true,
      used_by = _user_id,
      used_at = now()
  WHERE id = v_code_record.id;
  
  -- Update user role to premium
  UPDATE public.user_roles
  SET role = 'premium'
  WHERE user_id = _user_id;
  
  -- Update subscription
  UPDATE public.subscriptions
  SET plan_type = 'premium',
      end_date = v_end_date,
      is_active = true,
      updated_at = now()
  WHERE user_id = _user_id;
  
  RETURN json_build_object(
    'success', true, 
    'end_date', v_end_date,
    'message', 'تم تفعيل الاشتراك بنجاح'
  );
END;
$$;

-- Create function to generate activation code (admin only)
CREATE OR REPLACE FUNCTION public.generate_activation_code(_duration_days integer DEFAULT 365)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  -- Generate random code (format: XXXX-XXXX-XXXX-XXXX)
  v_code := upper(
    substring(md5(random()::text) from 1 for 4) || '-' ||
    substring(md5(random()::text) from 1 for 4) || '-' ||
    substring(md5(random()::text) from 1 for 4) || '-' ||
    substring(md5(random()::text) from 1 for 4)
  );
  
  -- Insert code
  INSERT INTO public.activation_codes (code, duration_days)
  VALUES (v_code, _duration_days);
  
  RETURN v_code;
END;
$$;