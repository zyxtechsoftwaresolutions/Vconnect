-- =============================================
-- RESET ADMIN PASSWORD
-- Run this if you need to reset the admin password
-- =============================================

-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the password for admin user
UPDATE auth.users 
SET 
  encrypted_password = crypt('admin123', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'admin@viet.edu.in';

-- Verify the update
SELECT 
  id,
  email,
  email_confirmed_at,
  encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email = 'admin@viet.edu.in';

