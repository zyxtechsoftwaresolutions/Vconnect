-- Exam Seating Generator: rooms, sessions, allocations
-- Run in Supabase SQL Editor

-- Exam rooms (halls/classrooms used for exams) with seating capacity
CREATE TABLE IF NOT EXISTS exam_rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    rows INTEGER NOT NULL DEFAULT 5 CHECK (rows > 0 AND rows <= 50),
    cols INTEGER NOT NULL DEFAULT 6 CHECK (cols > 0 AND cols <= 30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_rooms_department ON exam_rooms(department);

-- Exam sessions (e.g. "Final Dec 2024 - Slot 1")
CREATE TABLE IF NOT EXISTS exam_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    exam_date DATE,
    subject VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seating allocation: which student sits where in which room for which session
CREATE TABLE IF NOT EXISTS exam_seating_allocations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    row_num INTEGER NOT NULL CHECK (row_num >= 0),
    col_num INTEGER NOT NULL CHECK (col_num >= 0),
    bench_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, room_id, row_num, col_num)
);

CREATE INDEX IF NOT EXISTS idx_exam_alloc_session ON exam_seating_allocations(session_id);
CREATE INDEX IF NOT EXISTS idx_exam_alloc_room ON exam_seating_allocations(room_id);
