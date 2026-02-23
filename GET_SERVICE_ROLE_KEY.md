# 🔑 Get Your Service Role Key

## **URGENT: You need this key to fix password updates!**

### **Step 1: Go to Supabase Dashboard**
1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Click on your project: **kerzrawkrzlyxovqlubl**

### **Step 2: Navigate to API Settings**
1. In the left sidebar, click **Settings**
2. Click **API**

### **Step 3: Copy the Service Role Key**
1. Look for **"service_role key"** (it's a long string starting with `eyJ...`)
2. **Copy the entire key** (it's much longer than the anon key)
3. **⚠️ WARNING: This key has admin privileges - keep it secret!**

### **Step 4: Add to Your .env File**
Add this line to your `.env` file:

```env
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlcnpyYXdrcnpseXhvdnFsdWJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQzNDgyOSwiZXhwIjoyMDgxMDEwODI5fQ.example
```

**Replace the example with your actual service role key!**

### **Step 5: Restart Your App**
1. Stop your development server (Ctrl+C)
2. Run `npm run dev` again
3. Check console for "Service Role Key available: true"

### **Why This Key is Needed:**
- **Anon key**: Can only do basic operations (login, signup)
- **Service role key**: Can do admin operations (create users, update passwords)
- **Your error**: "403 Forbidden" means you don't have admin permissions
- **Solution**: Use the service role key for admin functions

### **Security Note:**
- The service role key bypasses all security rules
- In production, admin operations should be done server-side
- For development/testing, this is fine





