-- =============================================
-- RESET ALL USERS AND CREATE 3 ADMIN USERS
-- Run this in Supabase SQL Editor to remove all users and create only 3 admins
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- STEP 1: DELETE ALL EXISTING USERS
-- =============================================

-- Delete from public.users table
DELETE FROM public.users;

-- Delete from auth.users (Supabase auth table)
-- If this fails, delete users manually via Supabase Dashboard > Authentication > Users
DELETE FROM auth.users;

-- =============================================
-- STEP 2: CREATE 3 ADMIN USERS IN AUTH.USERS
-- =============================================

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin1@viet.edu.in', crypt('admin123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Admin 1","role":"ADMIN","department":"CSE"}', false, '', '', '', ''),
('550e8400-e29b-41d4-a716-446655440002', 'admin2@viet.edu.in', crypt('admin123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Admin 2","role":"ADMIN","department":"CSE"}', false, '', '', '', ''),
('550e8400-e29b-41d4-a716-446655440003', 'admin3@viet.edu.in', crypt('admin123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Admin 3","role":"ADMIN","department":"CSE"}', false, '', '', '', '');

-- =============================================
-- STEP 3: INSERT 3 ADMIN USERS INTO USERS TABLE
-- =============================================

INSERT INTO users (id, email, name, role, department, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin1@viet.edu.in', 'Admin 1', 'ADMIN', 'CSE', true),
('550e8400-e29b-41d4-a716-446655440002', 'admin2@viet.edu.in', 'Admin 2', 'ADMIN', 'CSE', true),
('550e8400-e29b-41d4-a716-446655440003', 'admin3@viet.edu.in', 'Admin 3', 'ADMIN', 'CSE', true);

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Users reset complete. 3 admin users created:' as info;
SELECT id, email, name, role, department, is_active FROM users;
