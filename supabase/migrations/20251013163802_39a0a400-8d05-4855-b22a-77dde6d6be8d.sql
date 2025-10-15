-- Update app_role enum to include admin
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';

-- Update has_role function to handle admin role
-- (no change needed, it already works with the enum)

-- Insert admin role for the current user (Muatz@azoz84)
-- First, get the user_id from profiles table
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find user by email from auth.users
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'Muatz@azoz84';
  
  -- If user exists, add admin role
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;