# ⚡ QUICK START - 3 STEPS TO FIX

## Your Goal ✅
Applicants can submit applications with:
- **Option 1:** Upload PDF file
- **Option 2:** Paste Google Drive link
- **Choice:** Each applicant decides which one to use

Your code is ready. Database needs 1-minute setup.

---

## Step 1️⃣: Run SQL in Supabase (1 minute)

### Go Here:
1. Open: https://app.supabase.com
2. Select your project
3. Click: **SQL Editor** (left sidebar)
4. Click: **New Query**

### Run This:
1. Open: `COMPLETE_DATABASE_FIX.sql` file in your project
2. Copy all content (Ctrl+A, Ctrl+C)
3. Paste in Supabase (Ctrl+V)
4. Click: **▶ Run** button

### Expected:
- Green checkmark ✅
- No errors
- Takes ~5 seconds

---

## Step 2️⃣: Verify It Worked (1 minute)

Copy & run these 3 queries in Supabase (one at a time):

### Query 1:
```sql
SELECT column_name, is_nullable FROM information_schema.columns 
WHERE table_name = 'applications' 
AND column_name IN ('pdf_path', 'google_drive_link');
```
**Expected:** Both columns show `is_nullable = YES`

### Query 2:
```sql
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'applications' 
AND constraint_name = 'check_at_least_one_submission';
```
**Expected:** Shows `check_at_least_one_submission`

### Query 3:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'applications';
```
**Expected:** 6 policies listed

---

## Step 3️⃣: Test in Browser (2 minutes)

### Hard Refresh:
- Windows: `Ctrl+Shift+R`
- Mac: `Cmd+Shift+R`

### Test PDF Upload:
1. Go to: `http://localhost:3000/applicant/requirements`
2. Select job from dropdown
3. Click toggle: **"📄 PDF File"**
4. Upload any PDF file
5. Add comment (optional)
6. Click: **"Submit Application"**
7. Expected: ✅ Success message appears

### Test Google Drive Link:
1. Go to: `http://localhost:3000/applicant/requirements`
2. Select job from dropdown
3. Click toggle: **"🔗 Google Drive Link"**
4. Paste: Any Google Drive share link like:
   ```
   https://drive.google.com/file/d/1ABC2DEF3GHI4JKL5MNO6PQR7STU8VWX/view
   ```
5. Add comment (optional)
6. Click: **"Submit Application"**
7. Expected: ✅ Success message appears instantly

---

## What Changed? 🔄

### Database
```
BEFORE:
❌ pdf_path: Required (NOT NULL)
❌ google_drive_link: Doesn't exist

AFTER:
✅ pdf_path: Optional (can be NULL)
✅ google_drive_link: Added (can be NULL)
✅ Rule: At least one must be provided
```

### Your Code
✅ Already supports both - no changes needed!

### RLS Policies
✅ Created 6 clean policies:
- Applicants can submit + view own
- HR can view + update all
- Super Admin full access

---

## If You Get Errors ⚠️

### Error: "Database column missing"
- Run: `COMPLETE_DATABASE_FIX.sql` (see Step 1)

### Error: "400 Bad Request"
- Hard refresh: `Ctrl+Shift+R`
- Open DevTools: `F12`
- Check Console tab for details

### Error: "Permission denied"
- Check Supabase user role (should be `postgres`)
- Settings → Database → Roles

### Upload stuck or slow
- Check file size (< 20MB for mobile)
- Try WiFi instead of mobile data
- Check internet connection

---

## Result 🎉

After completing all 3 steps:

✅ Applicants can upload PDF  
✅ Applicants can submit Google Drive link  
✅ Users choose which method  
✅ HR can see both types  
✅ Super Admin has full access  
✅ Mobile works without 40% stuck issue  
✅ No code changes needed  

---

## Files Created for You

| File | Purpose |
|------|---------|
| `COMPLETE_DATABASE_FIX.sql` | Main SQL to run in Supabase |
| `DATABASE_FIX_GUIDE.md` | Detailed troubleshooting guide |
| `SUBMISSION_SYSTEM_COMPLETE.md` | Full architecture documentation |
| `QUICK_START_3STEPS.md` | This file - quick reference |

---

**Total Time:** ~5 minutes  
**Difficulty:** ⭐ Easy (just run SQL)  
**Ready to Deploy:** Yes ✅

---

## Need Help?

1. Check browser console: `F12 → Console tab`
2. Look for "Database error details:" message
3. Share that error message
4. Solution will be specific to your error

**Common fixes:**
- Hard refresh browser
- Clear browser cache (Ctrl+Shift+Delete)
- Run SQL again in Supabase
- Check Supabase project is correct one
