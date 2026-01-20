-- Supabase RLS Policy Fix for Applications Table
-- Run this SQL in Supabase SQL Editor to enable uploads

-- 1. First, check if RLS is enabled and disable it temporarily to see current policies
-- Go to Supabase Dashboard > SQL Editor and run this script

-- 2. OPTION A: Disable RLS completely (for development/testing)
-- Uncomment this if you just want to test uploads work
-- ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;

-- 3. OPTION B: Enable RLS with proper policies (RECOMMENDED for production)

-- First enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (replace with your actual policy names)
DROP POLICY IF EXISTS "Applicants can insert own applications" ON public.applications;
DROP POLICY IF EXISTS "Applicants can view own applications" ON public.applications;
DROP POLICY IF EXISTS "HR can view all applications" ON public.applications;
DROP POLICY IF EXISTS "HR can update applications" ON public.applications;
DROP POLICY IF EXISTS "Service role can do anything" ON public.applications;

-- Policy 1: Allow authenticated users to INSERT their own applications
CREATE POLICY "Users can insert applications"
ON public.applications FOR INSERT
WITH CHECK (
  auth.uid() = applicant_id
);

-- Policy 2: Allow users to SELECT (view) their own applications
CREATE POLICY "Users can view own applications"
ON public.applications FOR SELECT
USING (
  auth.uid() = applicant_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('hr', 'super_admin')
);

-- Policy 3: Allow HR/super_admin to UPDATE applications
CREATE POLICY "HR can update applications"
ON public.applications FOR UPDATE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('hr', 'super_admin')
);

-- Policy 4: Allow service role (API) to INSERT without restrictions
-- This is needed for the API route to work
CREATE POLICY "Service role can insert applications"
ON public.applications FOR INSERT
WITH CHECK (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'applications'
ORDER BY policyname;
