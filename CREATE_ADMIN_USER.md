# Create Admin User - Step by Step Guide

## Problem
The admin user exists in `public.users` table but NOT in `auth.users` table, which means authentication fails.

## Solution

### Option 1: Using Supabase Dashboard (RECOMMENDED - EASIEST)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Users**
4. Click **"Add User"** button (or **"Invite User"**)
5. Fill in:
   - **Email**: `admin@viet.edu.in`
   - **Password**: `admin123`
   - **Auto Confirm User**: ✅ (Check this box)
   - **Send Invite Email**: ❌ (Uncheck this)
6. Click **"Create User"**

7. After creating the user, you'll see their UUID (User ID). Note it down.

8. Now go to **SQL Editor** and run this query to update the `public.users` table:

```sql
-- Replace 'USER_UUID_FROM_AUTH' with the actual UUID from step 7
-- Or use the existing UUID if you want to keep it consistent
UPDATE public.users 
SET 
  id = '550e8400-e29b-41d4-a716-446655440001',
  name = 'System Administrator',
  role = 'ADMIN',
  department = 'CSE',
  is_active = true,
  updated_at = NOW()
WHERE email = 'admin@viet.edu.in';

-- If the user doesn't exist in public.users, insert it:
INSERT INTO public.users (
  id,
  email,
  name,
  role,
  department,
  is_active
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'admin@viet.edu.in',
  'System Administrator',
  'ADMIN',
  'CSE',
  true
) ON CONFLICT (email) DO UPDATE
SET 
  id = EXCLUDED.id,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  is_active = EXCLUDED.is_active;
```

### Option 2: Using SQL Script (ALTERNATIVE)

1. Go to Supabase Dashboard → **SQL Editor**
2. Run the script in `create-admin-user.sql` file
3. This will create the user directly in `auth.users` table

**Note**: If Option 2 doesn't work due to RLS/permissions, use Option 1 (Dashboard method).

## After Creating User

1. Try logging in with:
   - **Email**: `admin@viet.edu.in`
   - **Password**: `admin123`

2. If login still doesn't work, verify:
   ```sql
   -- Check auth.users
   SELECT id, email, email_confirmed_at, encrypted_password IS NOT NULL as has_password
   FROM auth.users 
   WHERE email = 'admin@viet.edu.in';
   
   -- Check public.users
   SELECT id, email, name, role, department, is_active
   FROM public.users 
   WHERE email = 'admin@viet.edu.in';
   ```

3. Both queries should return the admin user.

## Troubleshooting

### If password doesn't work:
- Reset the password in Supabase Dashboard: **Authentication** → **Users** → Click on admin user → **Reset Password**
- Or use the SQL method to reset password (requires pgcrypto extension)

### If user still can't log in:
- Check browser console for errors
- Verify environment variables are correct in `.env` file
- Ensure Supabase Auth is enabled in your project settings

