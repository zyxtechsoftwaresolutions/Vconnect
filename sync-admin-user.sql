-- =============================================
-- SYNC ADMIN USER AFTER CREATING IN AUTH
-- Run this AFTER creating user in Supabase Dashboard
-- Replace 'USER_UUID_FROM_AUTH' with actual UUID from Dashboard
-- =============================================

-- Option 1: Update existing admin user with the UUID from auth.users
-- First, get the UUID from auth.users
-- SELECT id, email FROM auth.users WHERE email = 'admin@viet.edu.in';
-- Then use that UUID below:

UPDATE public.users 
SET 
  id = (SELECT id FROM auth.users WHERE email = 'admin@viet.edu.in'),
  name = 'System Administrator',
  role = 'ADMIN',
  department = 'CSE',
  is_active = true,
  updated_at = NOW()
WHERE email = 'admin@viet.edu.in';

-- If admin user doesn't exist in public.users, insert it:
INSERT INTO public.users (
  id,
  email,
  name,
  role,
  department,
  is_active
)
SELECT 
  id,
  email,
  'System Administrator',
  'ADMIN',
  'CSE',
  true
FROM auth.users 
WHERE email = 'admin@viet.edu.in'
ON CONFLICT (email) DO UPDATE
SET 
  id = EXCLUDED.id,
  name = 'System Administrator',
  role = 'ADMIN',
  department = 'CSE',
  is_active = true,
  updated_at = NOW();

-- Verify both tables are in sync
SELECT 
  'auth.users' as table_name,
  id,
  email,
  email_confirmed_at IS NOT NULL as is_confirmed
FROM auth.users 
WHERE email = 'admin@viet.edu.in'

UNION ALL

SELECT 
  'public.users' as table_name,
  id::text,
  email,
  is_active as is_confirmed
FROM public.users 
WHERE email = 'admin@viet.edu.in';

