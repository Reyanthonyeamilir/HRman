-- Supabase RLS Policy Fix for Applications Table
-- This is the CORRECT and SECURE way to fix the RLS error
-- Run this SQL in Supabase SQL Editor to enable authenticated user uploads

-- ============================================================================
-- OPTION 1: QUICK FIX (For Development/Testing - NOT secure for production)
-- ============================================================================
-- Uncomment to disable RLS completely:
-- ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- OPTION 2: PRODUCTION-SAFE FIX (Recommended - with proper RLS policies)
-- ============================================================================

-- Step 1: Enable RLS on applications table
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing policies (if upgrading from previous setup)
DROP POLICY IF EXISTS "Applicants can insert their own applications" ON public.applications;
DROP POLICY IF EXISTS "Applicants can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "HR and admins can view all applications" ON public.applications;
DROP POLICY IF EXISTS "HR and admins can update applications" ON public.applications;
DROP POLICY IF EXISTS "Users can insert applications" ON public.applications;
DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
DROP POLICY IF EXISTS "HR can view all applications" ON public.applications;
DROP POLICY IF EXISTS "HR can update applications" ON public.applications;
DROP POLICY IF EXISTS "Service role can insert applications" ON public.applications;

-- Step 3: Create the correct policies for applicant uploads

-- Policy 1: Allow applicants to create their own applications
CREATE POLICY "Applicants can insert their own applications"
ON applications
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only create applications where applicant_id matches their own ID
  applicant_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'applicant'
  )
);

-- Policy 2: Allow applicants to view their own applications
CREATE POLICY "Applicants can view their own applications"
ON applications
FOR SELECT
TO authenticated
USING (
  applicant_id = auth.uid()
);

-- Policy 3: Allow HR and super_admin to view all applications
CREATE POLICY "HR and admins can view all applications"
ON applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('hr', 'super_admin')
  )
);

-- Policy 4: Allow HR and super_admin to update applications (for status changes)
CREATE POLICY "HR and admins can update applications"
ON applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('hr', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('hr', 'super_admin')
  )
);

-- ============================================================================
-- VERIFY: Check that policies are created correctly
-- ============================================================================
-- Run this query to see all policies on the applications table:
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'applications'
-- ORDER BY policyname;
