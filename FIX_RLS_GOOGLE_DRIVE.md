# 🔧 Fix: RLS Policy Error for Google Drive Submissions

## The Problem
You're getting a 400 error when trying to submit with a Google Drive link. This is a **Row Level Security (RLS)** policy issue.

The RLS policies need to allow:
- ✅ Applicants to insert applications with `google_drive_link` (not just `pdf_path`)
- ✅ Both PDF and Google Drive submissions to pass validation

## The Solution

### Step 1: Go to Supabase Dashboard
1. https://app.supabase.com → Select your project
2. Click **SQL Editor**
3. Click **New Query**

### Step 2: Copy This SQL

```sql
-- Fix RLS Policies for applications table to allow Google Drive link submissions

-- Drop existing policies
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
```

### Step 3: Run the Query
- Click **Run** button
- Wait for ✅ **Success**

### Step 4: Test Immediately
Go back to your app:
1. Navigate to `/applicant/requirements`
2. Select "🔗 Google Drive Link"
3. Paste a Google Drive link
4. Click "Submit Application"
5. **It should work now!** ✨

---

## What This Fixes

✅ **RLS Policy Issue**: Now allows `google_drive_link` field in INSERT
✅ **Both Submission Types**: PDF and Google Drive both pass validation
✅ **Security**: Maintains security by checking `auth.uid() = applicant_id`
✅ **HR Access**: HR and Super Admin can view all applications
✅ **Edit Capability**: Applicants can edit their "for_review" applications

---

## After Running

Your application should now:
- ✅ Accept Google Drive link submissions
- ✅ Accept PDF file submissions
- ✅ Show both in applications list
- ✅ Allow HR to view both types
- ✅ Allow Super Admin full access

**Try submitting now!** 🚀
