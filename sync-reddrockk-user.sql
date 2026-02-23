-- =============================================
-- SYNC reddrockk99@gmail.com TO public.users
-- This will create the user in public.users and set as ADMIN
-- =============================================

-- Insert the user into public.users table with ADMIN role
INSERT INTO public.users (
  id,
  email,
  name,
  role,
  department,
  is_active,
  created_at,
  updated_at
)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', 'System Administrator') as name,
  'ADMIN' as role,
  COALESCE(raw_user_meta_data->>'department', 'CSE') as department,
  true as is_active,
  created_at,
  updated_at
FROM auth.users 
WHERE email = 'reddrockk99@gmail.com'
ON CONFLICT (email) DO UPDATE
SET 
  id = EXCLUDED.id,
  name = COALESCE(EXCLUDED.name, 'System Administrator'),
  role = 'ADMIN',
  department = COALESCE(EXCLUDED.department, 'CSE'),
  is_active = true,
  updated_at = NOW();

-- Verify the user was created
SELECT 
  id,
  email,
  name,
  role,
  department,
  is_active
FROM public.users 
WHERE email = 'reddrockk99@gmail.com';

