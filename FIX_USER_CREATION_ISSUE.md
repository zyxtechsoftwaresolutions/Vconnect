# 🔧 Fix User Creation Issues

## Current Situation
1. ❌ Failed to create `admin@viet.edu.in` in Authentication
2. ✅ Successfully created `reddrockk99@gmail.com` in Authentication
3. ❌ `reddrockk99@gmail.com` is NOT in `public.users` table

## ✅ Immediate Solution: Use Gmail Account as Admin

Since `reddrockk99@gmail.com` is already created in Authentication, let's sync it to `public.users` and make it an ADMIN:

### Step 1: Sync Gmail User to public.users

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run the script: `sync-reddrockk-user.sql`

This will:
- Create the user in `public.users` table
- Set role as `ADMIN`
- Set department as `CSE`

### Step 2: Test Login

Now you can login with:
- **Email**: `reddrockk99@gmail.com`
- **Password**: (the password you used when creating the user)

---

## 🔍 Diagnose admin@viet.edu.in Issue

The failure might be due to:
1. User already exists (even if deleted/soft-deleted)
2. Email constraint violation
3. Some other database constraint

### Step 1: Check What's Blocking It

Run this in SQL Editor: `check-admin-conflict.sql`

This will show you if there are any existing records blocking the creation.

### Step 2: Clean Up (if needed)

If you find existing records, run: `fix-admin-email-issue.sql`

**Note**: You might need to use Supabase Dashboard to completely remove soft-deleted users from `auth.users`:
1. Go to **Authentication** → **Users**
2. Look for `admin@viet.edu.in` (might show as deleted)
3. Permanently delete it if it exists

### Step 3: Try Creating Again

After cleanup, try creating `admin@viet.edu.in` again in Dashboard:
- **Authentication** → **Users** → **Add User**
- Email: `admin@viet.edu.in`
- Password: `admin123`
- ✅ Auto Confirm User
- ❌ Send Invite Email

---

## 🎯 Recommended Approach

**For now, use the Gmail account as admin:**

1. **Sync it to public.users** (run `sync-reddrockk-user.sql`)
2. **Login with Gmail credentials**
3. **Create admin@viet.edu.in later** through the Users page in the app (once logged in)

---

## 📝 Quick SQL Commands

### Sync Gmail User (Run This First):
```sql
INSERT INTO public.users (id, email, name, role, department, is_active)
SELECT 
  id,
  email,
  'System Administrator' as name,
  'ADMIN' as role,
  'CSE' as department,
  true as is_active
FROM auth.users 
WHERE email = 'reddrockk99@gmail.com'
ON CONFLICT (email) DO UPDATE
SET 
  id = EXCLUDED.id,
  role = 'ADMIN',
  department = 'CSE',
  is_active = true;
```

### Check Current Status:
```sql
-- Check auth.users
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email IN ('admin@viet.edu.in', 'reddrockk99@gmail.com');

-- Check public.users
SELECT id, email, name, role, department 
FROM public.users 
WHERE email IN ('admin@viet.edu.in', 'reddrockk99@gmail.com');
```

---

## 🚨 If Gmail User Also Fails to Sync

If the INSERT fails, check:
1. **Table exists**: `SELECT * FROM public.users LIMIT 1;`
2. **Permissions**: Ensure you have INSERT permissions
3. **Constraints**: Check if there are any unique constraints violating

Run this to check table structure:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public';
```

