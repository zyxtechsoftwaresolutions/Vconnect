-- Leave and Permission requests from students to mentors
-- Run in Supabase SQL Editor

-- Leave requests (Apply Leave from student dashboard)
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('SICK', 'CASUAL', 'EMERGENCY', 'OTHER')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_student ON leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_mentor ON leave_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- Permission requests (Seek Permission from student dashboard)
CREATE TABLE IF NOT EXISTS permission_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('LATE', 'EARLY', 'ABSENT', 'OTHER')),
    request_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_requests_student ON permission_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_permission_requests_mentor ON permission_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_permission_requests_status ON permission_requests(status);
