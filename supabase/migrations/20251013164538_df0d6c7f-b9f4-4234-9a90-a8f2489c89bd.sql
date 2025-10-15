-- Create admin user with simple credentials
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Insert into auth.users (this will trigger the handle_new_user function)
  -- Note: We can't directly insert into auth.users, so we'll just ensure
  -- the role is set if the user signs up with this email
  
  -- Find user by email if exists
  SELECT id INTO new_user_id 
  FROM auth.users 
  WHERE email = 'azooz@admin.com';
  
  -- If user exists, make them admin
  IF new_user_id IS NOT NULL THEN
    -- Delete any existing roles for this user
    DELETE FROM public.user_roles WHERE user_id = new_user_id;
    
    -- Add admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin');
    
    -- Update subscription to premium
    UPDATE public.subscriptions
    SET plan_type = 'premium',
        end_date = now() + INTERVAL '10 years',
        is_active = true
    WHERE user_id = new_user_id;
  END IF;
END $$;