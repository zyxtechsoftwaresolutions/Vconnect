-- =============================================
-- AUTOMATIC USER SYNC TRIGGER
-- This trigger automatically creates a user in public.users
-- when a user is created in auth.users (Supabase Authentication)
-- =============================================

-- Step 1: Create a function that handles new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the new user into public.users table
  -- Use the same ID from auth.users to ensure they match
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
  VALUES (
    NEW.id,  -- Use the same UUID from auth.users
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),  -- Use name from metadata or email as fallback
    COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT'),  -- Use role from metadata or default to STUDENT
    COALESCE(NEW.raw_user_meta_data->>'department', NULL),  -- Use department from metadata if available
    true,  -- Set as active by default
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET
    id = NEW.id,  -- Update ID to match auth.users if it doesn't match
    name = COALESCE(NEW.raw_user_meta_data->>'name', public.users.name),
    role = COALESCE(NEW.raw_user_meta_data->>'role', public.users.role),
    department = COALESCE(NEW.raw_user_meta_data->>'department', public.users.department),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create the trigger that fires when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;

-- =============================================
-- VERIFICATION
-- =============================================

-- Test the trigger by checking if it exists:
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check if the function exists:
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- =============================================
-- NOTES
-- =============================================
-- 1. This trigger runs automatically when users are created via:
--    - Supabase Dashboard (Authentication > Users > Add User)
--    - Supabase Auth API (signUp, admin.createUser, etc.)
--    - Any other method that inserts into auth.users
--
-- 2. The trigger ensures:
--    - Users created in auth.users automatically get a record in public.users
--    - IDs match between both tables
--    - User metadata (name, role, department) is extracted from auth.users
--
-- 3. When creating users from admin dashboard:
--    - Create in auth.users first (using admin API)
--    - The trigger will automatically create in public.users
--    - Or create in both manually with matching IDs
--
-- 4. If you need to sync existing users:
--    Run the sync-existing-users.sql script

