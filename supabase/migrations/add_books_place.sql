-- Add book location/place column for librarian to record where each book is kept.
-- Run this in Supabase Dashboard → SQL Editor if the column does not exist yet.

ALTER TABLE books
ADD COLUMN IF NOT EXISTS place text;

COMMENT ON COLUMN books.place IS 'Location/shelf of the book in the library (e.g. Rack A-12, Section 3)';
