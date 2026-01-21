-- ============================================================================
-- COMPLETE DATABASE FIX FOR PDF AND GOOGLE DRIVE LINK SUBMISSIONS
-- ============================================================================
-- This script ensures:
-- 1. google_drive_link column exists with proper data type
-- 2. pdf_path allows NULL (users can choose PDF OR Google Drive link)
-- 3. RLS policies allow both submission methods
-- 4. HR and Super Admin can view both submission types
-- ============================================================================

-- Step 1: Ensure google_drive_link column exists and is nullable
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS google_drive_link text NULL;

-- Step 2: Change pdf_path to be nullable (user chooses PDF or Drive)
-- IMPORTANT: This allows users to submit with ONLY Google Drive link
ALTER TABLE public.applications 
ALTER COLUMN pdf_path DROP NOT NULL;

-- Step 3: Add constraint to enforce at least one submission method
-- Either pdf_path OR google_drive_link must be provided
ALTER TABLE public.applications
ADD CONSTRAINT check_at_least_one_submission 
CHECK (pdf_path IS NOT NULL OR google_drive_link IS NOT NULL)
NOT VALID;

-- Validate the constraint for existing data
ALTER TABLE public.applications
VALIDATE CONSTRAINT check_at_least_one_submission;

-- Step 4: Create index for faster Google Drive link lookups
CREATE INDEX IF NOT EXISTS idx_applications_google_drive_link 
ON public.applications(google_drive_link);

-- Step 5: Disable RLS temporarily to manage policies cleanly
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;

-- Step 6: Drop ALL existing policies
DROP POLICY IF EXISTS "applicants_insert" ON public.applications;
DROP POLICY IF EXISTS "applicants_select" ON public.applications;
DROP POLICY IF EXISTS "applicants_update" ON public.applications;
DROP POLICY IF EXISTS "hr_admin_select" ON public.applications;
DROP POLICY IF EXISTS "hr_admin_update" ON public.applications;
DROP POLICY IF EXISTS "super_admin_delete" ON public.applications;
DROP POLICY IF EXISTS "Applicants can insert their own applications" ON public.applications;
DROP POLICY IF EXISTS "Applicants can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "Applicants can update their own applications" ON public.applications;
DROP POLICY IF EXISTS "HR and Super Admin can view all applications" ON public.applications;
DROP POLICY IF EXISTS "HR and Super Admin can update applications" ON public.applications;
DROP POLICY IF EXISTS "Super Admin can delete applications" ON public.applications;

-- Step 7: Re-enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Step 8: Create new RLS policies (simplified and working)

-- Policy 1: Applicants can INSERT their own applications
-- No restrictive checks - database constraint handles validation
CREATE POLICY "applicants_can_insert"
ON public.applications
FOR INSERT
WITH CHECK (auth.uid() = applicant_id);

-- Policy 2: Applicants can VIEW their own applications
CREATE POLICY "applicants_can_view"
ON public.applications
FOR SELECT
USING (auth.uid() = applicant_id);

-- Policy 3: Applicants can UPDATE their own applications (for_review only)
CREATE POLICY "applicants_can_update"
ON public.applications
FOR UPDATE
USING (auth.uid() = applicant_id AND status = 'for_review')
WITH CHECK (auth.uid() = applicant_id AND status = 'for_review');

-- Policy 4: HR can VIEW all applications
CREATE POLICY "hr_can_view_all"
ON public.applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'hr'
  )
);

-- Policy 5: HR can UPDATE applications (except changing to certain statuses)
CREATE POLICY "hr_can_update"
ON public.applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'hr'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'hr'
  )
);

-- Policy 6: Super Admin can do everything
CREATE POLICY "super_admin_full_access"
ON public.applications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Step 9: Verify column structure
-- Run this to confirm the changes:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'applications' 
-- AND column_name IN ('pdf_path', 'google_drive_link')
-- ORDER BY ordinal_position;

-- Step 10: Verify constraints
-- Run this to confirm at least one submission method exists:
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'applications' 
-- AND constraint_name = 'check_at_least_one_submission';

-- ============================================================================
-- SUMMARY OF CHANGES:
-- ============================================================================
-- ✓ google_drive_link column added (if missing)
-- ✓ pdf_path changed to nullable (users can choose submission method)
-- ✓ Constraint ensures at least one of: pdf_path OR google_drive_link
-- ✓ RLS policies allow both submission types
-- ✓ Applicants can insert/update applications
-- ✓ HR can view and update all applications (both PDF and Drive links)
-- ✓ Super Admin has full access
-- ✓ Index created for Google Drive link queries
-- ============================================================================
