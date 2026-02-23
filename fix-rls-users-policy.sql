-- =============================================
-- FIX RLS FOR USERS TABLE
-- Run this in Supabase SQL Editor
-- Allows login (read own profile), and admins to manage all users
-- =============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Service role full access" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Helper: true if current user is ADMIN (uses secure function to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- SELECT: own profile (login) or any row if admin (Users list page)
CREATE POLICY "Users can read own profile" ON public.users
FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- INSERT: only admins can create users
CREATE POLICY "Admins can insert users" ON public.users
FOR INSERT WITH CHECK (public.is_admin());

-- UPDATE: own row or admin
CREATE POLICY "Admins can update users" ON public.users
FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- DELETE: own row or admin
CREATE POLICY "Admins can delete users" ON public.users
FOR DELETE USING (auth.uid() = id OR public.is_admin());
