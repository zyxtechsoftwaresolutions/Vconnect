-- =============================================
-- CREATE 3 ADMIN USERS IN AUTH.USERS
-- Run this in Supabase SQL Editor
-- For full reset (remove all users first), use reset-users-and-create-admins.sql
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create 3 admin users in auth.users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'admin1@viet.edu.in', crypt('admin123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Admin 1","role":"ADMIN","department":"CSE"}', false, '', '', '', ''),
  ('550e8400-e29b-41d4-a716-446655440002', 'admin2@viet.edu.in', crypt('admin123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Admin 2","role":"ADMIN","department":"CSE"}', false, '', '', '', ''),
  ('550e8400-e29b-41d4-a716-446655440003', 'admin3@viet.edu.in', crypt('admin123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Admin 3","role":"ADMIN","department":"CSE"}', false, '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Insert 3 admin users in public.users table
INSERT INTO public.users (id, email, name, role, department, is_active, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'admin1@viet.edu.in', 'Admin 1', 'ADMIN', 'CSE', true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'admin2@viet.edu.in', 'Admin 2', 'ADMIN', 'CSE', true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 'admin3@viet.edu.in', 'Admin 3', 'ADMIN', 'CSE', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, department = EXCLUDED.department, is_active = EXCLUDED.is_active, updated_at = NOW();

-- Verify
SELECT id, email, name, role, department, is_active FROM public.users WHERE role = 'ADMIN';

