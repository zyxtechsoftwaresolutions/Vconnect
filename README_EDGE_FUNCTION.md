# 🎯 Edge Function Solution - Complete Guide

## Why Edge Functions?

Supabase **blocks service role keys from being used in browser/client-side code** for security. This is a security feature, not a bug.

**Solution:** Use Supabase Edge Functions (server-side) that can safely use the service role key.

## 📁 File Structure

```
supabase/
  functions/
    create-user/
      index.ts          ← Edge Function code
```

## 🚀 Deployment Methods

### Method 1: Supabase Dashboard (Recommended for Quick Setup)

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click **"Create a new function"**
3. Name: `create-user`
4. Copy code from `supabase/functions/create-user/index.ts`
5. Paste and click **"Deploy"**

### Method 2: Supabase CLI

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy
supabase functions deploy create-user
```

## 🔧 How It Works

### Frontend (Browser)
```typescript
// Calls Edge Function via HTTP
fetch('https://your-project.supabase.co/functions/v1/create-user', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email, password, name, role, department })
})
```

### Edge Function (Server)
```typescript
// Runs server-side, can use service role key
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY  // ✅ Safe on server!
)

// Creates user in auth.users
await supabaseAdmin.auth.admin.createUser({...})

// Creates user in public.users
await supabaseAdmin.from('users').upsert({...})
```

## 🔒 Security

- ✅ Service role key stays on server (Edge Function)
- ✅ Never exposed to browser/client
- ✅ Only anon key used in frontend
- ✅ Edge Function validates requests

## 🧪 Testing

### Test via curl:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/create-user \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User",
    "role": "STUDENT",
    "department": "CSE"
  }'
```

### Test via Admin Dashboard:
1. Create a user from admin dashboard
2. Check console for success messages
3. Try logging in with the created user

## 📊 What Gets Created

1. **auth.users** - Authentication user (can login)
2. **public.users** - Application user (with matching ID)
3. **students** - Student record (if role is STUDENT)

## 🐛 Troubleshooting

### "Function not found" (404)
- Function not deployed
- Wrong function name
- Wrong project

### "Unauthorized" (401)
- Missing Authorization header
- Wrong anon key
- Function not properly configured

### "User already exists"
- User exists in auth.users
- Function handles this and updates password

## ✅ Benefits

- ✅ **Secure** - Service role key never in browser
- ✅ **Reliable** - Works consistently
- ✅ **Scalable** - Can handle bulk operations
- ✅ **Maintainable** - Server-side logic

## 🎉 Result

Users created from admin dashboard can **login immediately** without any manual steps!

