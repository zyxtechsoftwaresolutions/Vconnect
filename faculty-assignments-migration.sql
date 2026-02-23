-- Migration script to update faculty_assignments table schema
-- Run this script if you have an existing faculty_assignments table with the old schema

-- Drop the existing table if it exists
DROP TABLE IF EXISTS faculty_assignments CASCADE;

-- Create the new faculty_assignments table with the correct schema
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

-- Create indexes for better performance
CREATE INDEX idx_faculty_assignments_faculty_id ON faculty_assignments(faculty_id);
CREATE INDEX idx_faculty_assignments_department ON faculty_assignments(department);
CREATE INDEX idx_faculty_assignments_day ON faculty_assignments(day);
CREATE INDEX idx_faculty_assignments_period ON faculty_assignments(period);

-- Function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at column
CREATE TRIGGER update_faculty_assignments_updated_at 
    BEFORE UPDATE ON faculty_assignments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data
INSERT INTO faculty_assignments (
    faculty_id, 
    faculty_name, 
    department, 
    day, 
    period, 
    time_slot, 
    subject, 
    class_name, 
    room
) VALUES 
    ('faculty-1', 'Dr. Priya Sharma', 'CSE', 'Monday', 0, '9:10 - 10:00', 'Data Structures', 'CSE-A', 'CSE-101'),
    ('faculty-1', 'Dr. Priya Sharma', 'CSE', 'Monday', 3, '11:40 - 12:30', 'Database Systems', 'CSE-A', 'CSE-103'),
    ('faculty-2', 'Prof. Meera Patel', 'CSE', 'Monday', 1, '10:00 - 10:50', 'Operating Systems', 'CSE-B', 'CSE-102'),
    ('faculty-3', 'Dr. Rajesh Kumar', 'CSE', 'Monday', 4, '1:30 - 2:20', 'Computer Networks', 'CSE-C', 'CSE-104'),
    ('faculty-4', 'Prof. Amit Kumar', 'ECE', 'Monday', 0, '9:10 - 10:00', 'Digital Electronics', 'ECE-A', 'ECE-101'),
    ('faculty-5', 'Dr. Sunita Verma', 'ECE', 'Monday', 1, '10:00 - 10:50', 'Communication Systems', 'ECE-B', 'ECE-102'),
    ('faculty-6', 'Prof. Deepak Sharma', 'EEE', 'Monday', 0, '9:10 - 10:00', 'Electrical Machines', 'EEE-A', 'EEE-101'),
    ('faculty-7', 'Dr. Manoj Kumar', 'CIVIL', 'Monday', 0, '9:10 - 10:00', 'Structural Analysis', 'CIVIL-A', 'CIVIL-101'),
    ('faculty-8', 'Prof. Vikram Singh', 'MECH', 'Monday', 0, '9:10 - 10:00', 'Thermodynamics', 'MECH-A', 'MECH-101'),
    ('faculty-9', 'Dr. Aditya Sharma', 'AME', 'Monday', 0, '9:10 - 10:00', 'Aerodynamics', 'AME-A', 'AME-101'),
    ('faculty-10', 'Prof. Business Manager', 'MBA', 'Monday', 0, '9:10 - 10:00', 'Business Management', 'MBA-A', 'MBA-101'); 