# Supabase Setup Guide

## Required Environment Variables

Create a `.env` file in the root directory of your project with the following variables:

```env
VITE_SUPABASE_URL=https://kerzrawkrzlyxovqlubl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlcnpyYXdrcnpseXhvdnFsdWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MzQ4MjksImV4cCI6MjA4MTAxMDgyOX0.L3qrZ5_th0599QJVCXD5uQ7mtKRVR8RcN_UDNnirbsY
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## How to Get These Keys

1. **Go to your Supabase project dashboard**
2. **Navigate to Settings > API**
3. **Copy the following:**
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `VITE_SUPABASE_SERVICE_ROLE_KEY`

## Important Notes

- **anon key**: Used for regular user operations (login, signup, etc.)
- **service_role key**: Used for admin operations (create users, update passwords, etc.)
- **NEVER expose the service_role key in client-side code in production**
- **The service_role key bypasses Row Level Security (RLS)**

## Current Configuration

Your current configuration:
- ✅ **Project ID**: `kerzrawkrzlyxovqlubl`
- ✅ **anon key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlcnpyYXdrcnpseXhvdnFsdWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MzQ4MjksImV4cCI6MjA4MTAxMDgyOX0.L3qrZ5_th0599QJVCXD5uQ7mtKRVR8RcN_UDNnirbsY`

**You still need to add the service_role key to your .env file!** 