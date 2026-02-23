# 🔐 How to Create Users with Passwords

## ⚠️ Important Security Notice

**Supabase does not allow service role keys to be used in browser/client-side code** for security reasons. This means we cannot create users with passwords directly from the React app.

## ✅ Current Workflow

### Option 1: Create User in App, Set Password via Supabase Dashboard (Recommended for now)

1. **Create user in the app** (Users page):
   - Fill in name, email, role, department
   - **Don't set password** (leave it empty)
   - Click Save
   - User is created in `public.users` table

2. **Set password via Supabase Dashboard**:
   - Go to Supabase Dashboard → **Authentication** → **Users**
   - Click **"Add User"** or find the user by email
   - Set email and password
   - ✅ **Auto Confirm User**
   - The user can now login

3. **Sync user IDs** (if needed):
   ```sql
   -- Run in Supabase SQL Editor
   UPDATE public.users 
   SET id = (SELECT id FROM auth.users WHERE email = 'user@example.com')
   WHERE email = 'user@example.com';
   ```

### Option 2: Create User with Password via Supabase Dashboard

1. **Create in Supabase Dashboard first**:
   - Go to **Authentication** → **Users** → **Add User**
   - Email: user's email
   - Password: set password
   - ✅ Auto Confirm User
   - Click Create

2. **Then create in app**:
   - Use the same email
   - Fill in other details
   - The app will link to existing auth user

3. **Sync IDs**:
   ```sql
   UPDATE public.users 
   SET id = (SELECT id FROM auth.users WHERE email = 'user@example.com')
   WHERE email = 'user@example.com';
   ```

### Option 3: Use Password Reset Flow (Future Implementation)

For users created without passwords, you can implement:
1. Password reset email flow
2. First-time login password setup
3. Admin-initiated password reset

## 🚀 Future Solution: Server-Side API

For production, create a server-side API endpoint (using Supabase Edge Functions, Next.js API routes, or similar) that:
1. Uses the service role key securely on the server
2. Creates users in `auth.users`
3. Links them to `public.users`

Example structure:
```typescript
// Server-side API endpoint (Edge Function or API route)
export async function createUserWithPassword(userData) {
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // ✅ Safe on server
  );
  
  // Create auth user
  const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true
  });
  
  // Create database user with matching ID
  await supabaseAdmin.from('users').insert({
    id: authUser.user.id,
    email: userData.email,
    name: userData.name,
    role: userData.role,
    department: userData.department
  });
  
  return authUser;
}
```

## 📝 Current Status

✅ **Works:**
- Creating users in `public.users` table
- Editing user details
- Viewing users list

❌ **Doesn't Work from Browser:**
- Creating users in `auth.users` with password
- Setting passwords for existing users (due to security restrictions)

✅ **Workaround:**
- Create users via Supabase Dashboard
- Or create users in app, then add password via Dashboard

## 🔍 Quick SQL for Manual User Creation

If you need to quickly create a user with password:

```sql
-- Step 1: Create in auth.users (use Supabase Dashboard instead - easier)
-- OR use the sync script below after creating in Dashboard

-- Step 2: After creating in Dashboard, sync IDs:
UPDATE public.users 
SET id = (SELECT id FROM auth.users WHERE email = 'user@example.com')
WHERE email = 'user@example.com';

-- Verify:
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  pu.id as public_id,
  pu.email as public_email,
  pu.name,
  pu.role
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.email = pu.email
WHERE au.email = 'user@example.com' OR pu.email = 'user@example.com';
```

