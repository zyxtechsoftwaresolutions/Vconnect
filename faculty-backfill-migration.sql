  -- One-time backfill: create faculty table rows for existing users who have
  -- role FACULTY, HOD, or COORDINATOR but no row in faculty yet.
  -- Run this once in Supabase SQL Editor after deploying the app changes.

  INSERT INTO faculty (user_id, employee_id, department, is_active)
  SELECT
    u.id,
    'EMP-' || UPPER(REPLACE(u.id::text, '-', '')),
    COALESCE(u.department, 'CSE'),
    true
  FROM users u
  WHERE u.role IN ('FACULTY', 'HOD', 'COORDINATOR')
    AND NOT EXISTS (
      SELECT 1 FROM faculty f WHERE f.user_id = u.id
    )
  ON CONFLICT (employee_id) DO NOTHING;
