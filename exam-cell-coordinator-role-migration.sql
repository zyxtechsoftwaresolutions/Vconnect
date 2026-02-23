-- Add EXAM_CELL_COORDINATOR to allowed user roles.
-- Run this on existing databases that have the users_role_check constraint.

-- Drop the existing role check constraint (PostgreSQL names it users_role_check)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Re-add the constraint with EXAM_CELL_COORDINATOR included
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'ADMIN', 'PRINCIPAL', 'HOD', 'COORDINATOR', 'EXAM_CELL_COORDINATOR',
    'CR', 'STUDENT', 'FACULTY', 'GUEST', 'LIBRARIAN', 'ACCOUNTANT'
  )
);
