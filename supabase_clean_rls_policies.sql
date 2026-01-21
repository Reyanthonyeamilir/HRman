-- Clean up and fix RLS policies for applications table
-- Remove all conflicting policies and create clear, working ones

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "applicants_insert_own" ON public.applications;
DROP POLICY IF EXISTS "applicants_insert_own_applications" ON public.applications;
DROP POLICY IF EXISTS "applicants_update_own" ON public.applications;
DROP POLICY IF EXISTS "applicants_update_own_applications" ON public.applications;
DROP POLICY IF EXISTS "applicants_view_own" ON public.applications;
DROP POLICY IF EXISTS "applicants_view_own_applications" ON public.applications;
DROP POLICY IF EXISTS "HR can update applications" ON public.applications;
DROP POLICY IF EXISTS "HR can view all applications" ON public.applications;
DROP POLICY IF EXISTS "hr_delete_applications" ON public.applications;
DROP POLICY IF EXISTS "hr_update_applications" ON public.applications;
DROP POLICY IF EXISTS "Super admin full access to applications" ON public.applications;
DROP POLICY IF EXISTS "Users can insert their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Step 3: Create clean, working policies

-- Policy 1: Applicants can INSERT their own applications (with PDF or Google Drive link)
CREATE POLICY "Applicants can insert their own applications"
ON public.applications
FOR INSERT
WITH CHECK (
  auth.uid() = applicant_id
  AND (pdf_path IS NOT NULL OR google_drive_link IS NOT NULL)
);

-- Policy 2: Applicants can VIEW their own applications
CREATE POLICY "Applicants can view their own applications"
ON public.applications
FOR SELECT
USING (auth.uid() = applicant_id);

-- Policy 3: Applicants can UPDATE their own applications (for editing)
CREATE POLICY "Applicants can update their own applications"
ON public.applications
FOR UPDATE
USING (auth.uid() = applicant_id)
WITH CHECK (auth.uid() = applicant_id);

-- Policy 4: HR and Super Admin can VIEW all applications
CREATE POLICY "HR and Super Admin can view all applications"
ON public.applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('hr', 'super_admin')
  )
);

-- Policy 5: HR and Super Admin can UPDATE applications (add comments, change status)
CREATE POLICY "HR and Super Admin can update applications"
ON public.applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('hr', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('hr', 'super_admin')
  )
);

-- Policy 6: Super Admin can DELETE applications
CREATE POLICY "Super Admin can delete applications"
ON public.applications
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);
