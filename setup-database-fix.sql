-- 🚨 FIXED DATABASE SETUP SCRIPT
-- Run this in your Supabase SQL Editor to fix authentication issues
-- This script handles existing data gracefully

-- =============================================
-- STEP 1: CHECK EXISTING STRUCTURE
-- =============================================

-- First, let's see what already exists
SELECT 'Current Database Status:' as info;

-- Check if tables exist
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'students', 'faculty', 'classes');

-- Check existing users
SELECT 'Existing users in users table:' as info;
SELECT id, email, name, role, department, is_active FROM users LIMIT 10;

-- Check existing auth users
SELECT 'Existing auth users:' as info;
SELECT id, email, raw_user_meta_data FROM auth.users LIMIT 10;

-- =============================================
-- STEP 2: CREATE MISSING TABLES (if needed)
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table only if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'PRINCIPAL', 'HOD', 'COORDINATOR', 'CR', 'STUDENT', 'FACULTY', 'GUEST', 'LIBRARIAN', 'ACCOUNTANT')),
    department VARCHAR(100),
    profile_picture TEXT DEFAULT '',
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create students table only if it doesn't exist
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    register_id VARCHAR(100) UNIQUE NOT NULL,
    regulation VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    class VARCHAR(50) NOT NULL,
    department VARCHAR(100) NOT NULL,
    attendance VARCHAR(50) DEFAULT 'Present',
    phone_number VARCHAR(20) NOT NULL,
    father_name VARCHAR(255),
    father_occupation VARCHAR(255),
    father_mobile VARCHAR(20),
    mother_name VARCHAR(255),
    mother_occupation VARCHAR(255),
    mother_mobile VARCHAR(20),
    apaar_id VARCHAR(100),
    aadhar_id VARCHAR(100),
    address TEXT,
    health_issues TEXT,
    seat_quota VARCHAR(50),
    caste VARCHAR(50),
    role VARCHAR(50) DEFAULT 'STUDENT',
    is_active BOOLEAN DEFAULT true,
    attendance_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_hostler BOOLEAN DEFAULT false,
    blood_group VARCHAR(10),
    date_of_birth DATE,
    gender VARCHAR(20),
    emergency_contact JSONB,
    hostel_details JSONB,
    transport_details JSONB,
    skills TEXT[],
    languages TEXT[],
    hobbies TEXT[],
    career_goals TEXT,
    placement_status VARCHAR(50) DEFAULT 'NOT_PLACED',
    placement_details JSONB,
    mentor_id UUID REFERENCES users(id),
    library_records JSONB[],
    achievements JSONB[],
    academic_records JSONB[],
    attendance_records JSONB[],
    fee_records JSONB[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- STEP 3: CREATE AUTH USERS (3 admin users only)
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin1@viet.edu.in') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES ('550e8400-e29b-41d4-a716-446655440001', 'admin1@viet.edu.in', crypt('admin123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Admin 1","role":"ADMIN","department":"CSE"}', false, '', '', '', '');
        RAISE NOTICE 'Admin 1 created';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin2@viet.edu.in') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES ('550e8400-e29b-41d4-a716-446655440002', 'admin2@viet.edu.in', crypt('admin123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Admin 2","role":"ADMIN","department":"CSE"}', false, '', '', '', '');
        RAISE NOTICE 'Admin 2 created';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin3@viet.edu.in') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES ('550e8400-e29b-41d4-a716-446655440003', 'admin3@viet.edu.in', crypt('admin123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Admin 3","role":"ADMIN","department":"CSE"}', false, '', '', '', '');
        RAISE NOTICE 'Admin 3 created';
    END IF;
END $$;

-- =============================================
-- STEP 4: INSERT USERS INTO USERS TABLE (3 admins only)
-- =============================================

INSERT INTO users (id, email, name, role, department, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin1@viet.edu.in', 'Admin 1', 'ADMIN', 'CSE', true),
('550e8400-e29b-41d4-a716-446655440002', 'admin2@viet.edu.in', 'Admin 2', 'ADMIN', 'CSE', true),
('550e8400-e29b-41d4-a716-446655440003', 'admin3@viet.edu.in', 'Admin 3', 'ADMIN', 'CSE', true)
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- STEP 5: NO SAMPLE STUDENTS (removed - admins only)
-- =============================================

-- Students table remains empty
-- To add students later, run appropriate INSERT statements

-- =============================================
-- STEP 6: VERIFY FINAL SETUP
-- =============================================

-- Final verification
SELECT 'Final Database Status:' as info;

-- Check final counts
SELECT 'Users Table' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Students Table' as table_name, COUNT(*) as count FROM students
UNION ALL
SELECT 'Auth Users' as table_name, COUNT(*) as count FROM auth.users;

-- Show all users
SELECT 'All users in users table:' as info;
SELECT id, email, name, role, department, is_active FROM users ORDER BY role, name;

-- Show all students
SELECT 'All students in students table:' as info;
SELECT id, name, email, department, role FROM students ORDER BY name;

-- Show auth users
SELECT 'All auth users:' as info;
SELECT id, email, raw_user_meta_data FROM auth.users ORDER BY email;







