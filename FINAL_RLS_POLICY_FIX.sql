-- Final fix: Most permissive RLS policies for Google Drive links

-- Drop all existing policies first
DROP POLICY IF EXISTS "Applicants can insert their own applications" ON public.applications;
DROP POLICY IF EXISTS "Applicants can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "Applicants can update their own applications" ON public.applications;
DROP POLICY IF EXISTS "HR and Super Admin can view all applications" ON public.applications;
DROP POLICY IF EXISTS "HR and Super Admin can update applications" ON public.applications;
DROP POLICY IF EXISTS "Super Admin can delete applications" ON public.applications;

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Applicants can INSERT (simplified check)
CREATE POLICY "applicants_insert"
ON public.applications
FOR INSERT
WITH CHECK (auth.uid() = applicant_id);

-- Policy 2: Applicants can VIEW their own
CREATE POLICY "applicants_select"
ON public.applications
FOR SELECT
USING (auth.uid() = applicant_id);

-- Policy 3: Applicants can UPDATE their own
CREATE POLICY "applicants_update"
ON public.applications
FOR UPDATE
USING (auth.uid() = applicant_id)
WITH CHECK (auth.uid() = applicant_id);

-- Policy 4: HR/Super Admin VIEW all
CREATE POLICY "hr_admin_select"
ON public.applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('hr', 'super_admin')
  )
);

-- Policy 5: HR/Super Admin UPDATE
CREATE POLICY "hr_admin_update"
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

-- Policy 6: Super Admin DELETE
CREATE POLICY "super_admin_delete"
ON public.applications
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);
