# 🔧 Complete Database Fix Guide - PDF & Google Drive Submissions

## Overview
This guide fixes your database to support **dual submission methods**:
- **PDF File**: Applicant uploads a PDF document
- **Google Drive Link**: Applicant provides a shareable Google Drive link
- **User Choice**: Each applicant decides which method to use

## Problem This Solves
- ❌ "Database column missing" error
- ❌ RLS policies blocking submissions
- ❌ PDF required when users want to submit Google Drive link only
- ❌ HR/Admin unable to see submissions

## What Changes
```
BEFORE (PDF Required):
┌─ applications table ─┐
│ pdf_path: NOT NULL  │  ← User MUST upload PDF
│ google_drive_link   │  ← Cannot be used alone
└─────────────────────┘

AFTER (Flexible Submission):
┌────────────────────────┐
│ pdf_path: NULLABLE     │  ← Optional
│ google_drive_link: txt │  ← Optional
│ CHECK: At least one    │  ← One MUST be provided
└────────────────────────┘
```

## Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query** button

### Step 2: Copy and Run the SQL Script
1. Open file: `COMPLETE_DATABASE_FIX.sql` in your project
2. **Copy entire SQL content** (Ctrl+A, Ctrl+C)
3. **Paste into Supabase SQL Editor** (Ctrl+V)
4. Click **▶ Run** button (or Ctrl+Enter)
5. Wait for completion (should show ✅ success)

### Step 3: Verify Changes
Run these verification queries in the SQL Editor:

**Query 1: Check column structure**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'applications' 
AND column_name IN ('pdf_path', 'google_drive_link')
ORDER BY ordinal_position;
```
Expected Result:
```
column_name         | data_type | is_nullable
─────────────────────────────────────────────
pdf_path            | text      | YES
google_drive_link   | text      | YES
```

**Query 2: Check constraint exists**
```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'applications' 
AND constraint_name = 'check_at_least_one_submission';
```
Expected Result:
```
constraint_name              | constraint_type
──────────────────────────────────────────────
check_at_least_one_submission | CHECK
```

**Query 3: Check RLS policies**
```sql
SELECT policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'applications'
ORDER BY policyname;
```
Expected Result: Should show 6 policies
- `applicants_can_insert`
- `applicants_can_update`
- `applicants_can_view`
- `hr_can_update`
- `hr_can_view_all`
- `super_admin_full_access`

## How It Works Now

### For Applicants
```javascript
// OPTION 1: Upload PDF
User selects "📄 PDF File" toggle
→ Picks file from device
→ System validates PDF (max 50MB, 20MB for mobile)
→ Uploads to Supabase Storage
→ Saves pdf_path in database (google_drive_link = NULL)

// OPTION 2: Submit Google Drive Link
User selects "🔗 Google Drive Link" toggle
→ Pastes shareable Google Drive URL
→ System validates URL format
→ Saves google_drive_link in database (pdf_path = NULL)

// VALIDATION
✓ Must provide at least one (PDF OR Google Drive link)
✓ Cannot submit with neither
✓ Can update if application status = 'for_review'
```

### For HR & Super Admin
```
Application List View:
┌─────────────────────────────────────┐
│ Applicant    | Submission Type      │
├─────────────────────────────────────┤
│ John Doe     | 📄 PDF (view link)   │  ← Can preview
│ Jane Smith   | 🔗 Google Drive link │  ← Can access
│ Bob Johnson  | 📄 PDF (view link)   │  ← Can preview
└─────────────────────────────────────┘

Permissions:
✓ HR: Can view all applications (both types)
✓ HR: Can update comments and status
✓ Super Admin: Full access (view, edit, delete)
```

## Troubleshooting

### Issue 1: "constraint_name already exists"
**Cause**: Constraint was already created
**Solution**: This is fine! Script handles it with `NOT VALID` then `VALIDATE`
**Action**: Continue to next step

### Issue 2: "permission denied" when running SQL
**Cause**: Your Supabase user doesn't have admin rights
**Solution**: 
1. Go to Supabase Dashboard
2. Settings → Roles and Permissions
3. Verify your user has `authenticated` or `postgres` role
4. Try again

### Issue 3: Still seeing "Database column missing" error
**Cause**: Browser cache or old client code
**Solution**:
1. Hard refresh browser: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
2. Clear application data:
   - Open DevTools: **F12**
   - Storage tab → Local Storage → Delete all
   - Refresh page
3. Try submission again

### Issue 4: "400 Bad Request" error
**Cause**: RLS policies still restrictive (old policies cached)
**Solution**:
1. Clear Supabase cache:
   - SQL Editor → New Query
   - Run: `SELECT pg_catalog.pg_sleep(2);` (2-second pause)
   - Refresh browser (F5)
2. Try submission again

## Testing Checklist

After applying the fix:

- [ ] **Desktop PDF Test**
  - Navigate: `/applicant/requirements`
  - Select: "📄 PDF File" toggle
  - Upload: Any PDF file
  - Click: "Submit Application"
  - Expected: ✅ Success

- [ ] **Desktop Google Drive Test**
  - Navigate: `/applicant/requirements`
  - Select: "🔗 Google Drive Link" toggle
  - Paste: Valid Google Drive share link
  - Click: "Submit Application"
  - Expected: ✅ Success

- [ ] **Mobile PDF Test**
  - Use: Android/iOS device
  - Select: "📄 PDF File" toggle
  - Upload: PDF from device
  - Expected: ✅ Completes (no 40% stuck)

- [ ] **Mobile Google Drive Test**
  - Use: Android/iOS device
  - Select: "🔗 Google Drive Link" toggle
  - Paste: Valid share link
  - Expected: ✅ Success

- [ ] **HR View Test**
  - Login as: HR user
  - Navigate: HR applications view
  - See: Both PDF and Google Drive submissions
  - Can: Click to open/view

- [ ] **Super Admin View Test**
  - Login as: Super Admin user
  - See: All applications
  - Can: Edit, delete, change status

## Important Notes

⚠️ **Column Naming**
- Database: `google_drive_link` (snake_case)
- Your code uses: `google_drive_link` ✅ Matches!

⚠️ **Data Type**
- Google Drive links stored as: `text` (plain string)
- Can store: URLs up to 65,535 characters

⚠️ **Backward Compatibility**
- Existing PDF submissions: Still work (pdf_path has data)
- Existing empty google_drive_link: Set to NULL ✅

⚠️ **Performance**
- Index created on google_drive_link: Faster queries
- No migration needed for existing data

## Next Steps

1. ✅ Run `COMPLETE_DATABASE_FIX.sql` in Supabase
2. ✅ Verify with provided verification queries
3. ✅ Hard refresh browser (Ctrl+Shift+R)
4. ✅ Test submissions (PDF and Google Drive)
5. ✅ Check HR/Admin viewing
6. ✅ Deploy to production

## Support

**If you still get errors:**
1. Open browser DevTools: **F12**
2. Go to **Console** tab
3. Copy the error message
4. Share the error details

**Common error messages:**
```
"Database error" → Check Step 2 completed
"Column doesn't exist" → Run verification Query 1
"Permission denied" → Check Supabase role permissions
"400 Bad Request" → Try browser hard refresh
```

## Success Indicators

✅ All 6 RLS policies shown in verification Query 3  
✅ `pdf_path` shows `is_nullable = YES`  
✅ `google_drive_link` exists in database  
✅ PDF uploads work on mobile  
✅ Google Drive links accepted  
✅ HR can see both submission types  
✅ No console errors in browser  

---

**Time to Complete**: ~5 minutes  
**Difficulty**: Easy  
**No Code Changes Required**: The SQL handles everything!
