# 🔧 Fix Admin Login Issue

## Problem
- Admin user exists in `public.users` table ✅
- Admin user does NOT exist in `auth.users` table ❌
- Cannot login because Supabase Auth requires users to be in `auth.users`

## ✅ Solution (Choose ONE method)

### Method 1: Supabase Dashboard (RECOMMENDED - EASIEST) ⭐

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Create User in Auth**
   - Go to: **Authentication** → **Users**
   - Click **"Add User"** or **"Invite User"** button
   - Fill in the form:
     ```
     Email: admin@viet.edu.in
     Password: admin123
     ✅ Auto Confirm User (IMPORTANT: Check this!)
     ❌ Send Invite Email (Uncheck this)
     ```
   - Click **"Create User"**
   - **Note the User ID (UUID)** that appears

3. **Sync public.users table**
   - Go to: **SQL Editor**
   - Run the script: `sync-admin-user.sql`
   - This will update `public.users` to match the UUID from `auth.users`

4. **Test Login**
   - Email: `admin@viet.edu.in`
   - Password: `admin123`

---

### Method 2: Using SQL Script (ALTERNATIVE)

If Method 1 doesn't work, try this:

1. **Go to SQL Editor** in Supabase Dashboard

2. **Run the script**: `create-admin-user.sql`
   - This attempts to create the user directly in `auth.users`
   - **Note**: This method may fail due to RLS/permissions

3. **Verify user was created**:
   ```sql
   SELECT id, email, email_confirmed_at 
   FROM auth.users 
   WHERE email = 'admin@viet.edu.in';
   ```

4. **If user was created, test login**

---

## 🔍 Verification Queries

After creating the user, verify it exists in both tables:

```sql
-- Check auth.users
SELECT 
  id, 
  email, 
  email_confirmed_at IS NOT NULL as email_confirmed,
  encrypted_password IS NOT NULL as has_password,
  created_at
FROM auth.users 
WHERE email = 'admin@viet.edu.in';

-- Check public.users
SELECT 
  id, 
  email, 
  name, 
  role, 
  department, 
  is_active
FROM public.users 
WHERE email = 'admin@viet.edu.in';

-- Both should return the admin user
```

## 🚨 Troubleshooting

### If login still doesn't work:

1. **Check password**:
   - Try resetting password in Dashboard: **Authentication** → **Users** → Click admin → **Reset Password**
   - Or run `reset-admin-password.sql`

2. **Check email confirmation**:
   - In Dashboard, ensure `email_confirmed_at` is set (not NULL)
   - If NULL, the user needs to confirm email (or use "Auto Confirm" when creating)

3. **Check environment variables**:
   - Verify `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Restart dev server after changing `.env`

4. **Check browser console**:
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

5. **Verify Supabase Auth is enabled**:
   - Go to **Authentication** → **Settings**
   - Ensure **Enable Email Auth** is ON

---

## 📝 Quick Reference

**Login Credentials:**
- Email: `admin@viet.edu.in`
- Password: `admin123`

**User Details:**
- Name: System Administrator
- Role: ADMIN
- Department: CSE
- User ID (should match in both tables): `550e8400-e29b-41d4-a716-446655440001` (or UUID from Dashboard)

