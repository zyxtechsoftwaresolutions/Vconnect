# 🚨 CRITICAL SETUP GUIDE - Fix Authentication Issues

## ❌ Current Problem
Your application has authentication issues because:
1. **Missing Supabase credentials** - No `.env` file
2. **Database not properly set up** - Tables may be missing
3. **User accounts not created** - No admin/HOD users exist

## ✅ IMMEDIATE FIX REQUIRED

### Step 1: Create Environment File (.env)
Create a file named `.env` in your project root (same folder as package.json):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**To get these values:**
1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Open your project
4. Go to **Settings** → **API**
5. Copy **Project URL** and **anon public key**

### Step 2: Set Up Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the entire content of `complete-database-schema.sql`
3. Click **Run** to execute

### Step 3: Insert Sample Data
1. In the same SQL Editor, copy and paste `simple-sample-data.sql`
2. Click **Run** to execute

### Step 4: Create Admin Users
Run `reset-users-and-create-admins.sql` in your Supabase SQL Editor to remove all existing users and create 3 admin accounts. Or run the SQL from `setup-database.sql` which creates 3 admin users.

## 🔐 Test Credentials (3 admin users)

After setup, you can test with:

- **Admin 1**: `admin1@viet.edu.in` / `admin123`
- **Admin 2**: `admin2@viet.edu.in` / `admin123`
- **Admin 3**: `admin3@viet.edu.in` / `admin123`

## 🚨 Common Issues & Solutions

### Issue: "Missing Supabase environment variables"
**Solution**: Create the `.env` file as shown above

### Issue: "Invalid login credentials"
**Solution**: 
1. Check that users exist in both `auth.users` and `users` tables
2. Verify passwords are properly hashed
3. Ensure Supabase Auth is enabled

### Issue: "Table does not exist"
**Solution**: Run the complete database schema SQL file

### Issue: "Permission denied"
**Solution**: Check Row Level Security (RLS) policies in Supabase

## 📋 Verification Checklist

- [ ] `.env` file created with correct credentials
- [ ] Database schema executed successfully
- [ ] Sample data inserted
- [ ] 3 admin users created in both auth.users and users tables
- [ ] Development server restarted
- [ ] Console shows "Supabase environment variables loaded successfully"

## 🆘 Still Having Issues?

1. **Check browser console** for specific error messages
2. **Verify Supabase project** is active and not paused
3. **Check database logs** in Supabase dashboard
4. **Ensure RLS policies** allow read/write access

## 🎯 Next Steps

Once authentication works:
1. Test all user roles (Admin, HOD, Coordinator, Student)
2. Verify data loading in dashboard
3. Test CRUD operations
4. Check department-based access control

---

**⚠️ IMPORTANT**: Do NOT commit the `.env` file to version control. It contains sensitive credentials.







