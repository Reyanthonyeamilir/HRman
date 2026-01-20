# PDF Upload RLS Error - Complete Fix Guide

## Error You're Seeing
```
File upload failed: new row violates row-level security policy
```

This happens when trying to submit a job application with a PDF on mobile or desktop.

---

## Root Cause
Supabase's `applications` table has Row Level Security (RLS) **enabled** but the policies don't allow authenticated users to INSERT records.

---

## ✅ SOLUTION - DO THIS NOW

### Step 1: Go to Supabase SQL Editor
Open: https://app.supabase.com/project/YOUR_PROJECT_ID/sql/new

Replace `YOUR_PROJECT_ID` with your actual Supabase project ID.

### Step 2: Copy the SQL from `supabase_rls_fix.sql`

The file contains 4 working RLS policies:

```sql
-- Policy 1: Allow applicants to create their own applications
CREATE POLICY "Applicants can insert their own applications"
ON applications
FOR INSERT
TO authenticated
WITH CHECK (
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

-- Policy 3: Allow HR and admins to view all applications
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

-- Policy 4: Allow HR and admins to update applications
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
```

### Step 3: Execute in Supabase

1. Paste the SQL into the SQL Editor
2. Click the **Execute** or **Run** button
3. Wait for confirmation "success"

### Step 4: Verify Policies Were Created

Run this verification query in SQL Editor:

```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'applications'
ORDER BY policyname;
```

You should see 4 policies listed:
- ✅ Applicants can insert their own applications (INSERT)
- ✅ Applicants can view their own applications (SELECT)
- ✅ HR and admins can view all applications (SELECT)
- ✅ HR and admins can update applications (UPDATE)

---

## 🧪 Test Locally

### Start Dev Server
```bash
npm run dev
```

### Test Upload
1. Open: http://localhost:3000/applicant/requirements
2. Sign in as an applicant account
3. Select a job position
4. Choose a PDF file
5. Add optional notes
6. Click **Submit Application**
7. Watch progress bar: 40% → 50% → ... → 100%
8. Should see ✅ **"Application submitted successfully!"**

### Verify in Supabase
1. Go to Supabase Dashboard
2. Table Editor → Click `applications` table
3. You should see your new application row with:
   - `job_id`: The job you applied for
   - `applicant_id`: Your user ID
   - `pdf_path`: Path to uploaded PDF
   - `status`: "for_review"
   - `submitted_at`: Current timestamp

---

## 🚀 If Upload Works - Push to GitHub

```bash
# Test once more locally to be sure
npm run dev

# Then push to GitHub (auto-deploys to Netlify)
git push origin main
```

Netlify will auto-deploy the changes.

---

## ❌ If Upload Still Fails

### Check 1: Verify RLS is Enabled
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'applications';
```

Should show: `rowsecurity = true`

### Check 2: Check Policies Exist
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'applications';
```

Should show 4 policies (see Step 4 above)

### Check 3: Check Supabase Logs
1. Go to Supabase Dashboard
2. Click **Logs** (or **Webhooks** → **Logs**)
3. Look for error details
4. Common issues:
   - RLS still disabled or not created
   - `profiles` table doesn't exist or role column missing
   - User not authenticated
   - User doesn't have `applicant` role in profiles table

### Check 4: Verify User Profile
In Supabase Table Editor, check `profiles` table:
- Your user should exist
- `role` column should be `'applicant'`
- `id` should match your auth user ID

---

## 📋 Environment Variables Required

For local testing (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For Netlify:
- Set same 3 variables in Netlify Dashboard → Site Settings → Environment Variables

---

## 📱 Test on All Platforms

After confirming locally:

- [ ] Desktop Chrome: http://localhost:3000
- [ ] Desktop Firefox: http://localhost:3000
- [ ] Android Phone: http://192.168.x.x:3000 (use your machine's IP)
- [ ] iPhone: http://192.168.x.x:3000
- [ ] Production Netlify: https://your-netlify-domain.netlify.app

---

## 🎯 What the Policies Do

| Policy | Role | Action | Effect |
|--------|------|--------|--------|
| Policy 1 | Applicant | INSERT | Can create their own applications |
| Policy 2 | Applicant | SELECT | Can view their own applications |
| Policy 3 | HR/Admin | SELECT | Can view all applications |
| Policy 4 | HR/Admin | UPDATE | Can update application status |

This ensures:
- ✅ Users can only upload their own applications
- ✅ Users can only see their own applications
- ✅ HR can see and manage all applications
- ✅ Non-applicants cannot upload

---

## 🔧 Troubleshooting

### Problem: "Access denied" in SQL Editor
**Solution**: Your Supabase account might not have SQL Editor access. Use Supabase dashboard instead or contact Supabase support.

### Problem: "Relation applications does not exist"
**Solution**: The `applications` table doesn't exist. Make sure you've run the schema creation SQL first.

### Problem: Uploads still fail after SQL execution
**Solution**:
1. Refresh browser (clear cache): Ctrl+Shift+Delete
2. Try incognito/private browsing
3. Re-run the SQL to ensure policies were created
4. Check browser console for detailed error
5. Check Supabase logs for database errors

### Problem: Can see application in database but upload said failed
**Solution**: This sometimes happens due to network delays. Check Supabase database - if the record exists, the upload actually succeeded!

---

## 📞 Still Having Issues?

1. **Check Supabase Status**: https://status.supabase.io
2. **Check Network**: Is your internet stable?
3. **Check File**: Is it actually a valid PDF?
4. **Clear Cache**: Ctrl+Shift+Delete in browser
5. **Reload Page**: F5 to refresh
6. **Check Browser Console**: F12 → Console tab for error details

---

## ✅ Checklist Before Deployment

- [ ] SQL policies executed in Supabase SQL Editor
- [ ] 4 policies visible in `pg_policies` query
- [ ] Local upload test succeeds with progress bar
- [ ] Application visible in Supabase `applications` table
- [ ] PDF file visible in Supabase Storage `applications` bucket
- [ ] Tested on multiple devices (desktop, Android, iPhone)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Netlify environment
- [ ] Ready to: `git push origin main`
