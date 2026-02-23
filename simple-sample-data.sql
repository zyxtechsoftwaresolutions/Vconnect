-- Simple Sample Data Insertion for VIET VConnect Portal
-- This script only inserts data into core tables that are most likely to exist

-- =============================================
-- FIX USER ROLE CONSTRAINT FIRST
-- =============================================

-- Drop the existing check constraint (if it exists)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new check constraint with all required roles
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('ADMIN', 'PRINCIPAL', 'HOD', 'COORDINATOR', 'CR', 'STUDENT', 'FACULTY', 'GUEST', 'LIBRARIAN', 'ACCOUNTANT'));

-- =============================================
-- SAMPLE USERS INSERTION (3 admin users only)
-- =============================================

-- Insert 3 admin users only
INSERT INTO users (id, email, name, role, department, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin1@viet.edu.in', 'Admin 1', 'ADMIN', 'CSE', true),
('550e8400-e29b-41d4-a716-446655440002', 'admin2@viet.edu.in', 'Admin 2', 'ADMIN', 'CSE', true),
('550e8400-e29b-41d4-a716-446655440003', 'admin3@viet.edu.in', 'Admin 3', 'ADMIN', 'CSE', true)
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- NO SAMPLE STUDENTS (removed - admins only)
-- =============================================

-- Students table remains empty. To add students, uncomment and run:
/*
INSERT INTO students (
    id, name, register_id, regulation, email, class, department, 
    attendance, phone_number, father_name, father_occupation, father_mobile,
    mother_name, mother_occupation, mother_mobile, apaar_id, aadhar_id,
    address, health_issues, seat_quota, caste, role, is_active,
    attendance_percentage, is_hostler, blood_group, date_of_birth, gender,
    skills, languages, hobbies
) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'Arjun Reddy', '23NT1A0501', 'R23', 'student1@viet.edu.in', 'CSE-A', 'CSE', 
'Present', '+91 9876543210', 'Raghava Reddy', 'Engineer', '+91 9876543201',
'Lakshmi Reddy', 'Teacher', '+91 9876543202', 'APAAR001', '123456789012',
'Hyderabad, Telangana', NULL, 'MQ', 'OC', 'STUDENT', true,
85.5, true, 'B+', '2005-06-15', 'Male',
ARRAY['JavaScript', 'React', 'Node.js'], ARRAY['English', 'Hindi', 'Telugu'], ARRAY['Reading', 'Coding', 'Music']),

('550e8400-e29b-41d4-a716-446655440102', 'Priya Sharma', '23NT1A0502', 'R23', 'student2@viet.edu.in', 'CSE-A', 'CSE', 
'Present', '+91 9876543211', 'Vijay Sharma', 'Doctor', '+91 9876543203',
'Sunita Sharma', 'Homemaker', '+91 9876543204', 'APAAR002', '123456789013',
'Mumbai, Maharashtra', NULL, 'MQ', 'OC', 'STUDENT', true,
92.3, false, 'A+', '2005-08-20', 'Female',
ARRAY['Python', 'Machine Learning', 'Data Science'], ARRAY['English', 'Hindi', 'Marathi'], ARRAY['Painting', 'Dancing', 'Reading']),

('550e8400-e29b-41d4-a716-446655440103', 'Ravi Kumar', '23NT1A0401', 'R23', 'student3@viet.edu.in', 'ECE-A', 'ECE', 
'Present', '+91 9876543212', 'Suresh Kumar', 'Businessman', '+91 9876543205',
'Meera Kumar', 'Nurse', '+91 9876543206', 'APAAR003', '123456789014',
'Delhi, NCR', NULL, 'MQ', 'OBC', 'STUDENT', true,
78.9, true, 'O+', '2004-12-10', 'Male',
ARRAY['C++', 'Embedded Systems', 'IoT'], ARRAY['English', 'Hindi'], ARRAY['Gaming', 'Cricket', 'Photography']),

('550e8400-e29b-41d4-a716-446655440104', 'Sneha Patel', '23NT1A0503', 'R23', 'student4@viet.edu.in', 'CSE-B', 'CSE', 
'Present', '+91 9876543213', 'Rajesh Patel', 'Lawyer', '+91 9876543207',
'Kavita Patel', 'Accountant', '+91 9876543208', 'APAAR004', '123456789015',
'Ahmedabad, Gujarat', NULL, 'MQ', 'OC', 'STUDENT', true,
95.1, false, 'AB+', '2005-03-25', 'Female',
ARRAY['Java', 'Spring Boot', 'MySQL'], ARRAY['English', 'Hindi', 'Gujarati'], ARRAY['Singing', 'Cooking', 'Travel']),

('550e8400-e29b-41d4-a716-446655440105', 'Rahul Gupta', '23NT1A0402', 'R23', 'student5@viet.edu.in', 'ECE-B', 'ECE', 
'Present', '+91 9876543214', 'Amit Gupta', 'Professor', '+91 9876543209',
'Pooja Gupta', 'Designer', '+91 9876543210', 'APAAR005', '123456789016',
'Bangalore, Karnataka', NULL, 'MQ', 'OC', 'STUDENT', true,
88.2, true, 'B-', '2004-09-05', 'Male',
ARRAY['VLSI', 'Digital Electronics', 'Verilog'], ARRAY['English', 'Hindi', 'Kannada'], ARRAY['Chess', 'Swimming', 'Movies'])
ON CONFLICT (register_id) DO NOTHING;
*/

-- =============================================
-- SAMPLE BOOKS INSERTION (if books table exists)
-- =============================================

-- Try to insert books (will fail silently if table doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'books') THEN
        INSERT INTO books (id, title, author, isbn, total_copies, available_copies, category, published_year, description) VALUES
        ('550e8400-e29b-41d4-a716-446655440601', 'Data Structures and Algorithms', 'Thomas H. Cormen', '978-0262033848', 5, 3, 'Computer Science', 2009, 'Comprehensive guide to data structures and algorithms'),
        ('550e8400-e29b-41d4-a716-446655440602', 'Database System Concepts', 'Abraham Silberschatz', '978-0073523323', 4, 2, 'Computer Science', 2010, 'Fundamental concepts of database systems'),
        ('550e8400-e29b-41d4-a716-446655440603', 'Digital Electronics', 'Morris Mano', '978-0132774208', 6, 4, 'Electronics', 2011, 'Digital logic and computer design'),
        ('550e8400-e29b-41d4-a716-446655440604', 'Operating System Concepts', 'Abraham Silberschatz', '978-1118063330', 3, 1, 'Computer Science', 2012, 'Operating system principles and concepts'),
        ('550e8400-e29b-41d4-a716-446655440605', 'Computer Networks', 'Andrew S. Tanenbaum', '978-0132126953', 4, 2, 'Computer Science', 2010, 'Computer networking principles')
        ON CONFLICT (isbn) DO NOTHING;
    END IF;
END $$;

-- =============================================
-- SAMPLE TECH NEWS INSERTION (if tech_news table exists)
-- =============================================

-- Try to insert tech news (will fail silently if table doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tech_news') THEN
        INSERT INTO tech_news (id, title, content, department, source_url, published_date, is_published, tags) VALUES
        ('550e8400-e29b-41d4-a716-446655440701', 'AI Breakthrough in Computer Vision', 'Researchers have developed a new AI model that significantly improves computer vision accuracy...', 'CSE', 'https://example.com/ai-breakthrough', '2024-01-15', true, ARRAY['AI', 'Computer Vision', 'Machine Learning']),
        ('550e8400-e29b-41d4-a716-446655440702', '5G Technology Advancements', 'Latest developments in 5G technology show promising results for IoT applications...', 'ECE', 'https://example.com/5g-advancements', '2024-01-14', true, ARRAY['5G', 'IoT', 'Telecommunications']),
        ('550e8400-e29b-41d4-a716-446655440703', 'Sustainable Energy Solutions', 'New renewable energy technologies are being developed for smart grid systems...', 'EEE', 'https://example.com/sustainable-energy', '2024-01-13', true, ARRAY['Renewable Energy', 'Smart Grid', 'Sustainability']),
        ('550e8400-e29b-41d4-a716-446655440704', 'Web Development Trends 2024', 'Latest trends in web development including new frameworks and methodologies...', 'CSE', 'https://example.com/web-dev-trends', '2024-01-12', true, ARRAY['Web Development', 'JavaScript', 'React']),
        ('550e8400-e29b-41d4-a716-446655440705', 'Cybersecurity Best Practices', 'Essential cybersecurity practices for protecting digital assets and data...', 'CSE', 'https://example.com/cybersecurity', '2024-01-11', true, ARRAY['Cybersecurity', 'Data Protection', 'Best Practices'])
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check if data was inserted successfully
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Students', COUNT(*) FROM students
ORDER BY table_name; 