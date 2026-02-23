-- =============================================
-- CHECK WHY admin@viet.edu.in CREATION FAILED
-- Run this to diagnose the issue
-- =============================================

-- Check if admin@viet.edu.in exists in auth.users
SELECT 
  'auth.users' as table_name,
  id,
  email,
  email_confirmed_at,
  created_at,
  deleted_at
FROM auth.users 
WHERE email = 'admin@viet.edu.in';

-- Check if admin@viet.edu.in exists in public.users
SELECT 
  'public.users' as table_name,
  id,
  email,
  name,
  role,
  department,
  is_active
FROM public.users 
WHERE email = 'admin@viet.edu.in';

-- Check if there's a deleted user with this email (soft delete)
SELECT 
  'deleted auth.users' as info,
  id,
  email,
  deleted_at
FROM auth.users 
WHERE email = 'admin@viet.edu.in' 
  AND deleted_at IS NOT NULL;

-- Check current user (reddrockk99@gmail.com)
SELECT 
  'Current user (reddrockk99)' as info,
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'reddrockk99@gmail.com';

