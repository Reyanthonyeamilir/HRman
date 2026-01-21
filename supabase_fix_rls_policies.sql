-- Fix RLS Policies for applications table to allow Google Drive link submissions

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update their own applications" ON public.applications;
DROP POLICY IF EXISTS "HR can view all applications" ON public.applications;
DROP POLICY IF EXISTS "HR can update applications" ON public.applications;

-- Enable RLS on applications table
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Applicants can insert their own applications (with PDF or Google Drive link)
CREATE POLICY "Users can insert their own applications"
ON public.applications
FOR INSERT
WITH CHECK (
  auth.uid() = applicant_id
  AND (pdf_path IS NOT NULL OR google_drive_link IS NOT NULL)
);

-- Policy 2: Applicants can view their own applications
CREATE POLICY "Users can view their own applications"
ON public.applications
FOR SELECT
USING (auth.uid() = applicant_id);

-- Policy 3: Applicants can update their own applications (for editing)
CREATE POLICY "Users can update their own applications"
ON public.applications
FOR UPDATE
USING (auth.uid() = applicant_id)
WITH CHECK (auth.uid() = applicant_id);

-- Policy 4: HR can view all applications
CREATE POLICY "HR can view all applications"
ON public.applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('hr', 'super_admin')
  )
);

-- Policy 5: HR can update applications (add comments, change status)
CREATE POLICY "HR can update applications"
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

-- Policy 6: Super admin can do everything
CREATE POLICY "Super admin full access to applications"
ON public.applications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);
