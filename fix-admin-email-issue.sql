-- =============================================
-- FIX admin@viet.edu.in CREATION ISSUE
-- This will completely remove any traces and allow recreation
-- =============================================

-- Step 1: Check what exists
SELECT 'Checking existing records...' as step;

SELECT 
  'auth.users' as table_name,
  id,
  email,
  deleted_at
FROM auth.users 
WHERE email = 'admin@viet.edu.in';

SELECT 
  'public.users' as table_name,
  id,
  email,
  name
FROM public.users 
WHERE email = 'admin@viet.edu.in';

-- Step 2: Hard delete from auth.users (if exists as deleted)
-- Note: You may need to use Supabase Dashboard for this as auth.users is protected
-- Or try:
DELETE FROM auth.users 
WHERE email = 'admin@viet.edu.in' 
  AND deleted_at IS NOT NULL;

-- Step 3: Delete from public.users
DELETE FROM public.users 
WHERE email = 'admin@viet.edu.in';

-- Step 4: Verify deletion
SELECT 'Verification - should return no rows:' as step;

SELECT id, email FROM auth.users WHERE email = 'admin@viet.edu.in';
SELECT id, email FROM public.users WHERE email = 'admin@viet.edu.in';

-- After running this, try creating the user again in Supabase Dashboard

