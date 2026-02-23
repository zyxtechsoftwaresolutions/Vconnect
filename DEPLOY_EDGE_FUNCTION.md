# 🚀 Deploy Supabase Edge Function for User Creation

## Why This Is Needed

Supabase blocks service role keys from being used in browser/client-side code for security. The Edge Function runs server-side, so it can safely use the service role key.

## 📋 Step-by-Step Deployment

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

Or download from: https://github.com/supabase/cli/releases

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Your Project

```bash
supabase link --project-ref your-project-ref
```

To find your project ref:
- Go to Supabase Dashboard
- Go to Settings → General
- Copy the "Reference ID"

### Step 4: Deploy the Function

```bash
supabase functions deploy create-user
```

### Step 5: Get Function URL

After deployment, you'll get a URL like:
```
https://your-project-ref.supabase.co/functions/v1/create-user
```

## 🔧 Alternative: Quick Deploy via Dashboard

1. Go to Supabase Dashboard → Edge Functions
2. Click "Create a new function"
3. Name it: `create-user`
4. Copy the code from `supabase/functions/create-user/index.ts`
5. Paste it into the function editor
6. Click "Deploy"

## ✅ After Deployment

The frontend will automatically use the Edge Function instead of trying to use the service role key directly.

## 🧪 Test the Function

You can test it with curl:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/create-user \
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

## 🔒 Security Note

The Edge Function uses the service role key from environment variables (automatically set by Supabase). It's never exposed to the client.

