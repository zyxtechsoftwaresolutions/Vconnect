-- =============================================
-- SYNC EXISTING USERS
-- This script syncs existing users from auth.users to public.users
-- Run this if you have users in auth.users that don't exist in public.users
-- =============================================

-- Insert all users from auth.users into public.users
-- This will only insert users that don't already exist (by email)
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
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email) as name,
  COALESCE(au.raw_user_meta_data->>'role', 'STUDENT') as role,
  COALESCE(au.raw_user_meta_data->>'department', NULL) as department,
  true as is_active,
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.email = au.email
)
ON CONFLICT (email) DO UPDATE
SET
  id = EXCLUDED.id,  -- Update ID to match auth.users
  name = COALESCE(EXCLUDED.name, public.users.name),
  role = COALESCE(EXCLUDED.role, public.users.role),
  department = COALESCE(EXCLUDED.department, public.users.department),
  updated_at = NOW();

-- Update existing users to match IDs from auth.users
UPDATE public.users pu
SET 
  id = au.id,
  updated_at = NOW()
FROM auth.users au
WHERE pu.email = au.email
  AND pu.id != au.id;  -- Only update if IDs don't match

-- Verify the sync
SELECT 
  'auth.users' as source,
  COUNT(*) as user_count
FROM auth.users
UNION ALL
SELECT 
  'public.users' as source,
  COUNT(*) as user_count
FROM public.users;

-- Show users that exist in auth.users but not in public.users
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'name' as name,
  'Missing in public.users' as status
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.email = au.email
);

-- Show users that exist in public.users but not in auth.users
SELECT 
  pu.id,
  pu.email,
  pu.name,
  'Missing in auth.users' as status
FROM public.users pu
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.email = pu.email
);

