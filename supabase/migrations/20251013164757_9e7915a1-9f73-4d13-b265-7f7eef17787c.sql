-- Update handle_new_user trigger to make azooz@admin.com an admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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