-- Fix function search path security warnings
-- Update all functions to have immutable search_path

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update is_guest_session_valid function (already has search_path, but ensure it's correct)
CREATE OR REPLACE FUNCTION public.is_guest_session_valid(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guest_sessions
    WHERE user_id = _user_id
      AND is_active = true
      AND session_end > now()
  )
$$;

-- Update has_role function (already has search_path, but ensure it's correct)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update is_subscription_active function (already has search_path, but ensure it's correct)
CREATE OR REPLACE FUNCTION public.is_subscription_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = _user_id
      AND is_active = true
      AND (end_date IS NULL OR end_date > now())
  )
$$;

-- Update generate_activation_code function (already has search_path, but ensure it's correct)
CREATE OR REPLACE FUNCTION public.generate_activation_code(_duration_days integer DEFAULT 365)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'غير مصرح لك بإنشاء أكواد التفعيل';
  END IF;

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

-- Update handle_new_user function (already has search_path, but ensure it's correct)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign role based on email
  IF NEW.email = 'azooz@admin.com' THEN
    -- Admin user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
    
    -- Create premium subscription (10 years)
    INSERT INTO public.subscriptions (user_id, plan_type, end_date)
    VALUES (NEW.id, 'premium', now() + INTERVAL '10 years');
  ELSE
    -- Regular guest user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'guest');
    
    -- Create guest subscription with 8-hour session
    INSERT INTO public.subscriptions (user_id, plan_type, end_date)
    VALUES (NEW.id, 'guest', now() + INTERVAL '1 year');
    
    -- Create guest session (8 hours)
    INSERT INTO public.guest_sessions (user_id, session_start, session_end)
    VALUES (NEW.id, now(), now() + INTERVAL '8 hours');
  END IF;
  
  RETURN NEW;
END;
$$;