-- Create IP tracking table
CREATE TABLE IF NOT EXISTS public.ip_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_date timestamp with time zone NOT NULL DEFAULT now(),
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  is_blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster IP lookups
CREATE INDEX idx_ip_address ON public.ip_tracking(ip_address);
CREATE INDEX idx_user_id ON public.ip_tracking(user_id);

-- Enable RLS
ALTER TABLE public.ip_tracking ENABLE ROW LEVEL SECURITY;

-- Only admins can view IP tracking
CREATE POLICY "Only admins can view IP tracking"
ON public.ip_tracking
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- System can insert IP tracking (via edge function)
CREATE POLICY "System can insert IP tracking"
ON public.ip_tracking
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only admins can update IP tracking
CREATE POLICY "Only admins can update IP tracking"
ON public.ip_tracking
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add function to check if IP is allowed to register
CREATE OR REPLACE FUNCTION public.check_ip_registration(
  _ip_address text,
  _user_agent text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_count integer;
  v_is_blocked boolean;
  v_last_registration timestamp with time zone;
BEGIN
  -- Check if IP is blocked
  SELECT is_blocked INTO v_is_blocked
  FROM public.ip_tracking
  WHERE ip_address = _ip_address
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_is_blocked THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'IP address is blocked'
    );
  END IF;
  
  -- Count registrations from this IP
  SELECT COUNT(*), MAX(registration_date)
  INTO v_existing_count, v_last_registration
  FROM public.ip_tracking
  WHERE ip_address = _ip_address;
  
  -- Block if more than 3 registrations from same IP
  IF v_existing_count >= 3 THEN
    -- Block the IP
    UPDATE public.ip_tracking
    SET is_blocked = true,
        block_reason = 'Multiple registration attempts'
    WHERE ip_address = _ip_address;
    
    RETURN json_build_object(
      'allowed', false,
      'reason', 'تم تجاوز الحد الأقصى للتسجيلات من هذا العنوان'
    );
  END IF;
  
  -- Check if last registration was within 24 hours
  IF v_last_registration IS NOT NULL AND 
     v_last_registration > (now() - INTERVAL '24 hours') THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'يرجى الانتظار 24 ساعة قبل التسجيل مرة أخرى'
    );
  END IF;
  
  RETURN json_build_object('allowed', true);
END;
$$;

-- Function to record IP after successful registration
CREATE OR REPLACE FUNCTION public.record_ip_registration(
  _ip_address text,
  _user_id uuid,
  _user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ip_tracking (
    ip_address,
    user_id,
    user_agent,
    registration_date,
    last_seen
  ) VALUES (
    _ip_address,
    _user_id,
    _user_agent,
    now(),
    now()
  );
END;
$$;