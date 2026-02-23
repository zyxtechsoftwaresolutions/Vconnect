-- BS&H Department Migration Script
-- This script adds support for Basic Sciences & Humanities department
-- for first-year B.Tech students

-- =============================================
-- DEPARTMENT ENUM UPDATE (if using enum type)
-- =============================================

-- If your database uses an enum type for departments, you'll need to add BS&H
-- Note: This is a simplified approach - in production, you might need to recreate the enum

-- For PostgreSQL with enum types:
-- ALTER TYPE department_enum ADD VALUE 'BS&H';

-- =============================================
-- ADD BS&H CLASSES TO EXISTING TABLES
-- =============================================

-- Add BS&H classes to the classes table if it exists
INSERT INTO classes (name, department, semester, academic_year, coordinator_id, created_at, updated_at)
VALUES 
  ('BS&H-A', 'BS&H', 1, '2024-25', (SELECT id FROM users WHERE role = 'HOD' AND department = 'BS&H' LIMIT 1), NOW(), NOW()),
  ('BS&H-B', 'BS&H', 1, '2024-25', (SELECT id FROM users WHERE role = 'HOD' AND department = 'BS&H' LIMIT 1), NOW(), NOW()),
  ('BS&H-C', 'BS&H', 1, '2024-25', (SELECT id FROM users WHERE role = 'HOD' AND department = 'BS&H' LIMIT 1), NOW(), NOW()),
  ('BS&H-D', 'BS&H', 1, '2024-25', (SELECT id FROM users WHERE role = 'HOD' AND department = 'BS&H' LIMIT 1), NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- ADD BS&H SUBJECTS
-- =============================================

-- Add BS&H subjects to subjects table if it exists
INSERT INTO subjects (name, department, semester, academic_year, created_at, updated_at)
VALUES 
  ('Engineering Mathematics', 'BS&H', 1, '2024-25', NOW(), NOW()),
  ('Engineering Physics', 'BS&H', 1, '2024-25', NOW(), NOW()),
  ('Engineering Chemistry', 'BS&H', 1, '2024-25', NOW(), NOW()),
  ('Engineering Drawing', 'BS&H', 1, '2024-25', NOW(), NOW()),
  ('Basic Electronics', 'BS&H', 1, '2024-25', NOW(), NOW()),
  ('Programming Fundamentals', 'BS&H', 1, '2024-25', NOW(), NOW()),
  ('Technical Communication', 'BS&H', 1, '2024-25', NOW(), NOW()),
  ('Workshop Practice', 'BS&H', 1, '2024-25', NOW(), NOW()),
  ('Environmental Science', 'BS&H', 1, '2024-25', NOW(), NOW()),
  ('Professional Ethics', 'BS&H', 1, '2024-25', NOW(), NOW()),
  ('English Communication', 'BS&H', 1, '2024-25', NOW(), NOW()),
  ('Digital Logic Design', 'BS&H', 1, '2024-25', NOW(), NOW())
ON CONFLICT (name, department) DO NOTHING;

-- =============================================
-- ADD BS&H ROOMS
-- =============================================

-- Add BS&H rooms to rooms table if it exists
INSERT INTO rooms (name, department, capacity, room_type, created_at, updated_at)
VALUES 
  ('BS&H-001', 'BS&H', 60, 'CLASSROOM', NOW(), NOW()),
  ('BS&H-002', 'BS&H', 60, 'CLASSROOM', NOW(), NOW()),
  ('BS&H-003', 'BS&H', 60, 'CLASSROOM', NOW(), NOW()),
  ('BS&H-004', 'BS&H', 60, 'CLASSROOM', NOW(), NOW()),
  ('BS&H-Lab1', 'BS&H', 30, 'LABORATORY', NOW(), NOW()),
  ('BS&H-Lab2', 'BS&H', 30, 'LABORATORY', NOW(), NOW()),
  ('BS&H-Lab3', 'BS&H', 30, 'LABORATORY', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- CREATE BS&H HOD USER (if needed)
-- =============================================

-- Create a BS&H HOD user if one doesn't exist
INSERT INTO users (id, email, name, role, department, is_active, created_at, updated_at)
VALUES 
  (uuid_generate_v4(), 'bsh.hod@viet.edu.in', 'Dr. BS&H HOD', 'HOD', 'BS&H', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- ADD BS&H FACULTY MEMBERS (if needed)
-- =============================================

-- Add some BS&H faculty members
INSERT INTO faculty (id, user_id, employee_id, department, subjects, designation, office_location, office_hours, is_active, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
  u.id,
  'BSH001',
  'BS&H',
  ARRAY['Engineering Mathematics', 'Engineering Physics'],
  'Associate Professor',
  'Block BS&H, Room 101',
  '9:00 AM - 5:00 PM',
  true,
  NOW(),
  NOW()
FROM users u 
WHERE u.email = 'bsh.hod@viet.edu.in'
ON CONFLICT (employee_id) DO NOTHING;

-- =============================================
-- UPDATE EXISTING CONSTRAINTS (if needed)
-- =============================================

-- If you have CHECK constraints on department fields, you may need to update them
-- Example: ALTER TABLE students DROP CONSTRAINT IF EXISTS check_department;
-- ALTER TABLE students ADD CONSTRAINT check_department CHECK (department IN ('CSE', 'ECE', 'EEE', 'CIVIL', 'MECH', 'AME', 'MBA', 'MCA', 'DIPLOMA', 'BBA', 'BCA', 'BS&H'));

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify BS&H department has been added
SELECT 'BS&H Department Check' as check_type, 
       COUNT(*) as count, 
       'users' as table_name 
FROM users 
WHERE department = 'BS&H'

UNION ALL

SELECT 'BS&H Classes Check' as check_type, 
       COUNT(*) as count, 
       'classes' as table_name 
FROM classes 
WHERE department = 'BS&H'

UNION ALL

SELECT 'BS&H Subjects Check' as check_type, 
       COUNT(*) as count, 
       'subjects' as table_name 
FROM subjects 
WHERE department = 'BS&H'

UNION ALL

SELECT 'BS&H Rooms Check' as check_type, 
       COUNT(*) as count, 
       'rooms' as table_name 
FROM rooms 
WHERE department = 'BS&H';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- The BS&H department is now fully integrated into the system
-- Students can be assigned to BS&H department
-- After first year completion, they can be transferred to other departments
-- All existing functionality remains intact 