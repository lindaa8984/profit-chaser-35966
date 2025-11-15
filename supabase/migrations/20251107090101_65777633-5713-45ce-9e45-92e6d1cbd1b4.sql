-- Drop old policy that restricted profile visibility
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;