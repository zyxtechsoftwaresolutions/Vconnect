-- Complete Database Schema for VIET VConnect Portal
-- This file contains all tables needed for full functionality

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CORE USER MANAGEMENT TABLES
-- =============================================

-- Users table (core user accounts)
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'PRINCIPAL', 'HOD', 'COORDINATOR', 'EXAM_CELL_COORDINATOR', 'CR', 'STUDENT', 'FACULTY', 'GUEST', 'LIBRARIAN', 'ACCOUNTANT')),
    department VARCHAR(100),
    profile_picture TEXT DEFAULT '',
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table (detailed student information)
CREATE TABLE students (
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

-- Faculty table (detailed faculty information)
CREATE TABLE faculty (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    subjects TEXT[],
    assigned_classes TEXT[],
    designation VARCHAR(100),
    office_location VARCHAR(255),
    office_hours VARCHAR(255),
    phone_number VARCHAR(20),
    specialization TEXT,
    qualification TEXT,
    experience_years INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CLASS AND ACADEMIC MANAGEMENT
-- =============================================

-- Classes table
CREATE TABLE classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    semester INTEGER NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    coordinator_id UUID REFERENCES users(id),
    cr_ids UUID[],
    student_ids UUID[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timetable table
CREATE TABLE timetables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 8),
    subject VARCHAR(100) NOT NULL,
    faculty_id UUID REFERENCES users(id),
    room_number VARCHAR(50),
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, day_of_week, period_number)
);

-- =============================================
-- ATTENDANCE MANAGEMENT
-- =============================================

-- Attendance records table
CREATE TABLE attendance_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    period INTEGER NOT NULL,
    subject VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE')),
    marked_by UUID REFERENCES users(id),
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MEETINGS AND EVENTS
-- =============================================

-- Meetings table
CREATE TABLE meetings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_by UUID REFERENCES users(id),
    attendees UUID[],
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
    meeting_type VARCHAR(50),
    duration_minutes INTEGER,
    agenda TEXT,
    minutes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- GROUPS AND MESSAGING
-- =============================================

-- Groups table
CREATE TABLE groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    members UUID[],
    admins UUID[],
    is_private BOOLEAN DEFAULT false,
    department VARCHAR(100),
    class_id UUID REFERENCES classes(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'FILE', 'IMAGE', 'VIDEO', 'AUDIO')),
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message reactions table
CREATE TABLE message_reactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction_type)
);

-- =============================================
-- FILE AND MEDIA MANAGEMENT
-- =============================================

-- Files table
CREATE TABLE files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    uploaded_for VARCHAR(50), -- 'GROUP', 'MEETING', 'ASSIGNMENT', etc.
    reference_id UUID, -- ID of the related entity (group_id, meeting_id, etc.)
    department VARCHAR(100),
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- LIBRARY MANAGEMENT
-- =============================================

-- Books table
CREATE TABLE books (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(50) UNIQUE,
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    category VARCHAR(100),
    published_year INTEGER,
    publisher VARCHAR(255),
    description TEXT,
    location VARCHAR(100),
    added_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Book issues table
CREATE TABLE book_issues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    issued_by UUID REFERENCES users(id),
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE NOT NULL,
    returned_at TIMESTAMP WITH TIME ZONE,
    received_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'RETURNED', 'OVERDUE')),
    fine_amount DECIMAL(10,2) DEFAULT 0.00,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FEE MANAGEMENT
-- =============================================

-- Fee structure table
CREATE TABLE fee_structures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fee_type VARCHAR(100) NOT NULL,
    custom_name VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    semester INTEGER,
    academic_year VARCHAR(20),
    is_recurring BOOLEAN DEFAULT false,
    description TEXT,
    department VARCHAR(100),
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student fee records table
CREATE TABLE student_fee_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE,
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    paid_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE')),
    transaction_id VARCHAR(255),
    payment_method VARCHAR(50),
    late_fees_applied DECIMAL(10,2) DEFAULT 0.00,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE payment_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    fee_record_ids UUID[],
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE')),
    transaction_reference VARCHAR(255),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CONTENT MANAGEMENT (TECH NEWS, CAROUSEL)
-- =============================================

-- Tech news table
CREATE TABLE tech_news (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    author_id UUID REFERENCES users(id),
    department VARCHAR(100),
    tags TEXT[],
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Carousel images table
CREATE TABLE carousel_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    department VARCHAR(100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ACADEMIC CURRICULUM
-- =============================================

-- Academic curriculum documents table
CREATE TABLE curriculum_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('syllabus', 'mid1_timetable', 'academic_calendar')),
    file_url TEXT NOT NULL,
    file_size VARCHAR(50),
    department VARCHAR(100) NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    download_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FACULTY ASSIGNMENTS
-- =============================================

-- Faculty assignments table
CREATE TABLE faculty_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    faculty_id VARCHAR(100) NOT NULL,
    faculty_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    day VARCHAR(20) NOT NULL,
    period INTEGER NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    room VARCHAR(50) NOT NULL,
    assigned_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(faculty_id, day, period)
);

-- =============================================
-- NOTIFICATIONS
-- =============================================

-- Notifications table
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('INFO', 'SUCCESS', 'WARNING', 'ERROR')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Students indexes
CREATE INDEX idx_students_register_id ON students(register_id);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_department ON students(department);
CREATE INDEX idx_students_class ON students(class);
CREATE INDEX idx_students_mentor_id ON students(mentor_id);

-- Faculty indexes
CREATE INDEX idx_faculty_employee_id ON faculty(employee_id);
CREATE INDEX idx_faculty_department ON faculty(department);

-- Classes indexes
CREATE INDEX idx_classes_department ON classes(department);
CREATE INDEX idx_classes_coordinator_id ON classes(coordinator_id);

-- Attendance indexes
CREATE INDEX idx_attendance_student_id ON attendance_records(student_id);
CREATE INDEX idx_attendance_class_id ON attendance_records(class_id);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_attendance_marked_by ON attendance_records(marked_by);

-- Meetings indexes
CREATE INDEX idx_meetings_scheduled_by ON meetings(scheduled_by);
CREATE INDEX idx_meetings_date_time ON meetings(date_time);
CREATE INDEX idx_meetings_status ON meetings(status);

-- Groups indexes
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_department ON groups(department);

-- Messages indexes
CREATE INDEX idx_messages_group_id ON messages(group_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Files indexes
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_uploaded_for ON files(uploaded_for);
CREATE INDEX idx_files_department ON files(department);

-- Books indexes
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_available_copies ON books(available_copies);

-- Book issues indexes
CREATE INDEX idx_book_issues_book_id ON book_issues(book_id);
CREATE INDEX idx_book_issues_student_id ON book_issues(student_id);
CREATE INDEX idx_book_issues_status ON book_issues(status);

-- Fee indexes
CREATE INDEX idx_fee_structures_department ON fee_structures(department);
CREATE INDEX idx_fee_structures_academic_year ON fee_structures(academic_year);

-- Student fee records indexes
CREATE INDEX idx_student_fee_records_student_id ON student_fee_records(student_id);
CREATE INDEX idx_student_fee_records_status ON student_fee_records(status);

-- Faculty assignments indexes
CREATE INDEX idx_faculty_assignments_faculty_id ON faculty_assignments(faculty_id);
CREATE INDEX idx_faculty_assignments_department ON faculty_assignments(department);
CREATE INDEX idx_faculty_assignments_day ON faculty_assignments(day);
CREATE INDEX idx_faculty_assignments_period ON faculty_assignments(period);

-- Tech news indexes
CREATE INDEX idx_tech_news_department ON tech_news(department);
CREATE INDEX idx_tech_news_is_published ON tech_news(is_published);

-- Carousel indexes
CREATE INDEX idx_carousel_images_order_index ON carousel_images(order_index);
CREATE INDEX idx_carousel_images_is_active ON carousel_images(is_active);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faculty_updated_at BEFORE UPDATE ON faculty FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fee_structures_updated_at BEFORE UPDATE ON fee_structures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_fee_records_updated_at BEFORE UPDATE ON student_fee_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tech_news_updated_at BEFORE UPDATE ON tech_news FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carousel_images_updated_at BEFORE UPDATE ON carousel_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_curriculum_documents_updated_at BEFORE UPDATE ON curriculum_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faculty_assignments_updated_at BEFORE UPDATE ON faculty_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA INSERTION (3 admin users only)
-- =============================================

-- Insert 3 admin users only
INSERT INTO users (email, name, role, department) 
VALUES 
    ('admin1@viet.edu.in', 'Admin 1', 'ADMIN', 'CSE'),
    ('admin2@viet.edu.in', 'Admin 2', 'ADMIN', 'CSE'),
    ('admin3@viet.edu.in', 'Admin 3', 'ADMIN', 'CSE')
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- VERIFICATION QUERY
-- =============================================

-- Verify all tables were created successfully
SELECT 
    table_name, 
    column_count,
    row_count
FROM (
    SELECT 
        t.table_name,
        COUNT(c.column_name) as column_count,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = t.table_name) as row_count
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'pg_%'
    GROUP BY t.table_name
) subquery
ORDER BY table_name; 