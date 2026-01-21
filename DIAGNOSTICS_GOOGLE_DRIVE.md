# 🔍 Google Drive Link Submission - Diagnostics Guide

The error "Database is not yet configured..." usually means one of these issues:

## 🎯 Check These 3 Things (In Order)

### 1. ✅ Verify Column Exists

In **Supabase Dashboard → Table Editor → applications**:
- Look for `google_drive_link` column
- Should be type: `text`
- If MISSING: Run this SQL:

```sql
ALTER TABLE public.applications
ADD COLUMN google_drive_link text;
```

---

### 2. ✅ Verify RLS Policies

In **Supabase Dashboard → Authentication → Policies → applications**:

You should see these 6 policies (NO MORE, NO LESS):
- [ ] Applicants can insert their own applications
- [ ] Applicants can view their own applications  
- [ ] Applicants can update their own applications
- [ ] HR and Super Admin can view all applications
- [ ] HR and Super Admin can update applications
- [ ] Super Admin can delete applications

**If you see more than 6 or different names:** Run the cleanup SQL:

```sql
-- Drop ALL policies
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

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Create clean policies
CREATE POLICY "Applicants can insert their own applications"
ON public.applications FOR INSERT
WITH CHECK (auth.uid() = applicant_id AND (pdf_path IS NOT NULL OR google_drive_link IS NOT NULL));

CREATE POLICY "Applicants can view their own applications"
ON public.applications FOR SELECT USING (auth.uid() = applicant_id);

CREATE POLICY "Applicants can update their own applications"
ON public.applications FOR UPDATE
USING (auth.uid() = applicant_id) WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "HR and Super Admin can view all applications"
ON public.applications FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'super_admin')));

CREATE POLICY "HR and Super Admin can update applications"
ON public.applications FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'super_admin')))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'super_admin')));

CREATE POLICY "Super Admin can delete applications"
ON public.applications FOR DELETE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
```

---

### 3. ✅ Check Your User Role

In **Supabase Dashboard → SQL Editor**, run:

```sql
SELECT id, email, role FROM public.profiles WHERE id = 'YOUR_USER_ID';
```

Replace `YOUR_USER_ID` with your logged-in user's ID.

**Expected result:** role should be `'applicant'` (lowercase)

If role is NULL or wrong, update it:

```sql
UPDATE public.profiles 
SET role = 'applicant' 
WHERE id = 'YOUR_USER_ID';
```

---

## 📋 Complete Checklist

Before trying to submit again:

- [ ] Column `google_drive_link` exists in applications table
- [ ] RLS is ENABLED on applications table
- [ ] Exactly 6 RLS policies (no duplicates)
- [ ] Your user role is set to 'applicant'
- [ ] Browser console shows no JavaScript errors
- [ ] You're using a valid Google Drive link (contains `drive.google.com` or `docs.google.com`)

---

## 🚀 After Fixing

1. **Refresh the page** (Ctrl+R or Cmd+R)
2. **Try submitting again** with a Google Drive link
3. **Check browser console** (F12) for detailed error messages
4. **Look for ✅ success message**

---

## 📊 If Still Getting Error

1. Open browser **Developer Tools** (F12)
2. Go to **Console** tab
3. Try submitting again
4. Copy the FULL error message from console
5. Share it - it will show exact database error

The console will show details like:
- `Database error details: { message: "...", code: "...", details: "..." }`

This helps identify the exact issue!

---

## Quick Test SQL

Run this to verify everything is set up:

```sql
-- Check column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'applications' AND column_name = 'google_drive_link';

-- Check RLS is enabled
SELECT tablename FROM pg_tables 
WHERE tablename = 'applications' AND schemaname = 'public';

-- Check policies exist
SELECT COUNT(*) as policy_count FROM pg_policies 
WHERE tablename = 'applications';
```

Should return:
- ✅ 1 row for column check
- ✅ 1 row for table check  
- ✅ 6 rows for policy count

---

**Still stuck? The console error will tell you exactly what's wrong!**
