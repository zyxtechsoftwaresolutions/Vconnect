# ⚡ QUICK FIX: Deploy Edge Function in 5 Minutes

## The Problem
Supabase blocks service role keys in the browser. We need to use an Edge Function (server-side) instead.

## ✅ Solution: Deploy Edge Function

### Option 1: Via Supabase Dashboard (EASIEST - 2 minutes)

1. **Go to Supabase Dashboard** → Your Project
2. **Click "Edge Functions"** in the left sidebar
3. **Click "Create a new function"**
4. **Name it:** `create-user`
5. **Copy the entire code** from `supabase/functions/create-user/index.ts`
6. **Paste it** into the function editor
7. **Click "Deploy"**
8. **Done!** ✅

### Option 2: Via CLI (3 minutes)

```bash
# 1. Install Supabase CLI (if not installed)
npm install -g supabase

# 2. Login
supabase login

# 3. Link your project (get project-ref from Dashboard → Settings → General)
supabase link --project-ref YOUR_PROJECT_REF

# 4. Deploy the function
supabase functions deploy create-user
```

## 🧪 Test It

After deployment, try creating a user from the admin dashboard. It should work!

## ✅ What Happens Now

1. User fills form in admin dashboard
2. Frontend calls Edge Function (server-side)
3. Edge Function creates user in `auth.users` using service role key
4. Edge Function creates user in `public.users` with matching ID
5. User can login immediately!

## 🔍 Verify It's Working

Check the browser console - you should see:
- ✅ "Auth user created successfully via Edge Function"
- ✅ No more "Forbidden" errors

## 🆘 If Edge Function Not Found

If you get "404" or "Not Found" error:
1. Make sure you deployed the function
2. Check the function name is exactly `create-user`
3. Verify it's deployed in the same project

## 📝 Files Created

- `supabase/functions/create-user/index.ts` - Edge Function code
- `DEPLOY_EDGE_FUNCTION.md` - Detailed deployment guide
- Updated `src/pages/Users.tsx` - Now uses Edge Function

**Deploy the function and you're done!** 🚀

