-- Add missing RLS policies for security

-- 1. Activation codes table - Only admins can manage codes
CREATE POLICY "Only admins can insert activation codes"
ON public.activation_codes
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update activation codes"
ON public.activation_codes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete activation codes"
ON public.activation_codes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all activation codes"
ON public.activation_codes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR used_by = auth.uid());

-- 2. Guest sessions - System managed only (explicit deny policies)
CREATE POLICY "Guest sessions created by system only"
ON public.guest_sessions
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Guest sessions cannot be manually updated"
ON public.guest_sessions
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Guest sessions cannot be manually deleted"
ON public.guest_sessions
FOR DELETE
TO authenticated
USING (false);

-- 3. Subscriptions - System managed only (explicit deny policies)
CREATE POLICY "Subscriptions managed by system only"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Subscriptions updated via RPC only"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Subscriptions cannot be deleted"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (false);

-- 4. Add server-side validation for activation codes
CREATE OR REPLACE FUNCTION public.activate_premium_with_code(_code text, _user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code_record activation_codes%ROWTYPE;
  v_end_date timestamp with time zone;
BEGIN
  -- Validate code format (XXXX-XXXX-XXXX-XXXX)
  IF _code !~ '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$' THEN
    RETURN json_build_object('success', false, 'error', 'صيغة كود غير صالحة');
  END IF;
  
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

-- Add comment to document security model
COMMENT ON TABLE public.guest_sessions IS 'System-managed table. Sessions are created and managed automatically via triggers. Direct user modification is not allowed.';
COMMENT ON TABLE public.subscriptions IS 'System-managed table. Subscriptions are managed via RPC functions only. Direct user modification is not allowed.';
COMMENT ON TABLE public.activation_codes IS 'Admin-only table. Only users with admin role can generate, view, and manage activation codes.';