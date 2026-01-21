# 🎯 Complete Application Submission System - Quick Start

## What's Ready ✅

Your application already supports:
- ✅ PDF file uploads with mobile support
- ✅ Google Drive link submissions
- ✅ User can choose which method
- ✅ Error logging and debugging
- ✅ Progress tracking for uploads

## What Needs Database Setup ⏳

The **database schema** needs one fix to make everything work.

---

## ⚡ IMMEDIATE ACTION REQUIRED

### 1. Run This SQL in Supabase

**Go to:** Supabase Dashboard → SQL Editor → New Query

**Copy and paste:** Everything from `COMPLETE_DATABASE_FIX.sql`

**Click:** ▶ Run

This single script will:
```
✓ Add google_drive_link column (if missing)
✓ Make pdf_path nullable (allows PDF-only or Drive-only)
✓ Add constraint: Must provide at least one (PDF OR Drive)
✓ Create proper RLS policies for all user roles
✓ Create index for fast lookups
```

### 2. Verify It Worked

Run these 3 queries to confirm:

**Query A:** Check columns
```sql
SELECT column_name, is_nullable FROM information_schema.columns 
WHERE table_name = 'applications' 
AND column_name IN ('pdf_path', 'google_drive_link');
```
Should show:
- `pdf_path` → `is_nullable = YES`
- `google_drive_link` → `is_nullable = YES`

**Query B:** Check constraint
```sql
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'applications' 
AND constraint_name = 'check_at_least_one_submission';
```
Should show: `check_at_least_one_submission`

**Query C:** Check RLS policies
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'applications';
```
Should show: 6 policies
- `applicants_can_insert`
- `applicants_can_view`
- `applicants_can_update`
- `hr_can_view_all`
- `hr_can_update`
- `super_admin_full_access`

### 3. Test in Browser

**Hard refresh:** Ctrl+Shift+R (or Cmd+Shift+R)

**Navigate to:** `/applicant/requirements`

**Test PDF:**
1. Click "📄 PDF File" toggle
2. Upload any PDF
3. Click "Submit Application"
4. Should succeed ✅

**Test Google Drive:**
1. Click "🔗 Google Drive Link" toggle
2. Paste: `https://drive.google.com/file/d/XXXX/view`
3. Click "Submit Application"
4. Should succeed ✅

---

## 🏗️ Architecture Overview

### Frontend (`/app/applicant/requirements/page.tsx`)
```
User Interface:
┌─────────────────────────────────────┐
│ Select submission method:            │
│ ○ 📄 PDF File                        │
│ ● 🔗 Google Drive Link               │
│                                      │
│ Paste link: [________________]       │
│                                      │
│ [Submit Application] (enabled)       │
└─────────────────────────────────────┘

Logic:
- Toggle between PDF and Drive input
- Show/hide file picker or URL field
- Enable submit only if one provided
- Progress bar for uploads
- Display existing applications
```

### Backend (`/lib/applicant.ts`)
```javascript
submitApplication({
  job_id,        // Which job applying for
  file,          // PDF file (null if Google Drive)
  google_drive_link,  // Drive URL (empty if PDF)
  applicant_comment,  // Optional notes
  onProgress     // Callback for progress bar
})

Logic:
IF file provided:
  ├─ Validate PDF (size, type)
  ├─ Upload to Supabase Storage
  ├─ Set pdf_path in database
  └─ Set google_drive_link = NULL

ELSE IF google_drive_link provided:
  ├─ Validate URL format
  ├─ Set pdf_path = NULL
  └─ Set google_drive_link in database

CONSTRAINT: At least one must exist!
```

### Database (`applications` table)
```sql
┌─────────────────────────────────────┐
│ Column              │ Type           │
├─────────────────────────────────────┤
│ id                  │ UUID (PK)      │
│ job_id              │ UUID (FK)      │
│ applicant_id        │ UUID (FK)      │
│ pdf_path            │ TEXT (NULL)    │ ← Optional
│ google_drive_link   │ TEXT (NULL)    │ ← Optional
│ applicant_comment   │ TEXT           │
│ status              │ 'for_review'   │
│ submitted_at        │ TIMESTAMP      │
│ CHECK               │ pdf_path OR    │
│                     │ google_drive   │
│                     │ link (≥1)      │
└─────────────────────────────────────┘

RLS Policies:
• Applicants: Can INSERT, VIEW own, UPDATE own (if for_review)
• HR: Can VIEW all, UPDATE all
• Super Admin: Full access (INSERT, SELECT, UPDATE, DELETE)
```

### File Storage (Supabase Storage)
```
Bucket: applications/
├─ {user_id}-{job_id}-{timestamp}-{random}.pdf
│  ├─ Signed URLs (1-hour expiry)
│  ├─ Mobile-safe MIME type
│  └─ Progress tracking during upload
└─ [Empty for Google Drive submissions]
```

---

## 👥 User Flows

### Applicant Submitting PDF
```
1. Login to applicant portal
2. Navigate to "Requirements" / "Submit Application"
3. Select job from dropdown
4. Click "📄 PDF File" toggle
5. Choose PDF from device
6. Add optional comments
7. Click "Submit Application"
8. Wait for upload (see progress bar)
9. See success message: "Application submitted!"
10. Application appears in "My Applications" list
```

### Applicant Submitting Google Drive Link
```
1. Login to applicant portal
2. Navigate to "Requirements" / "Submit Application"
3. Select job from dropdown
4. Click "🔗 Google Drive Link" toggle
5. Get shareable link from Google Drive
   - Right-click file
   - Share → Get link → Copy link
6. Paste link into URL field
7. Add optional comments
8. Click "Submit Application"
9. See success message instantly (no upload needed)
10. Application appears in "My Applications" list
```

### HR Reviewing Applications
```
1. Login as HR
2. Navigate to HR Dashboard / Applications
3. See all applications (both PDF and Drive submissions)
4. Can:
   - 📄 Download PDF applications
   - 🔗 Open Google Drive links in new tab
   - 💬 Add comments
   - ✅ Change status (shortlist, interview, hire, reject)
   - 🔄 Update interview details
```

### Super Admin Full Access
```
1. Login as Super Admin
2. Can do everything HR can do, PLUS:
   - View HR comments and history
   - Delete applications
   - View all user activity logs
   - Manage job postings
   - Manage user accounts
```

---

## 📊 Data Flow Diagram

```
USER SUBMISSION
        │
        ├─→ Chooses PDF File
        │   ├─ Browser file picker
        │   ├─ Validate (size, type)
        │   ├─ Upload to Storage (progress %)
        │   └─ Save to DB: pdf_path = path, drive_link = NULL
        │
        └─→ Chooses Google Drive Link
            ├─ Paste URL
            ├─ Validate (format, accessibility)
            └─ Save to DB: pdf_path = NULL, drive_link = url

DATABASE CHECK:
    At least one (pdf_path OR google_drive_link) must exist
    ├─ ✅ Application saved
    └─ ❌ Error: "Provide PDF or Google Drive link"

HR/ADMIN VIEW:
    Query: SELECT * FROM applications
    ├─ See both types in one list
    ├─ View PDF: Click link → Download/Preview
    └─ View Drive: Click link → Opens in new tab
```

---

## 🔐 Security & Access Control

### RLS (Row Level Security) Policies

**Applicants:**
- Can INSERT their own applications only
- Can VIEW their own applications only
- Can UPDATE own applications ONLY if status = 'for_review'
- Cannot see other applicants' applications
- Cannot modify applications with final status

**HR Users:**
- Can VIEW all applications (any applicant, any job)
- Can UPDATE comments and status
- Cannot DELETE (Super Admin only)
- Cannot see password/sensitive data

**Super Admin:**
- Can do everything (INSERT, SELECT, UPDATE, DELETE)
- Can view all data including HR activity
- Can delete applications and users
- Can modify any field including statuses

---

## 🐛 Troubleshooting

### "Database column missing" error
**Solution:** Run `COMPLETE_DATABASE_FIX.sql` in Supabase

### "400 Bad Request" when submitting
**Solutions:**
1. Hard refresh browser: `Ctrl+Shift+R`
2. Clear local storage: F12 → Storage → Clear all
3. Check browser console (F12) for detailed error
4. Verify RLS policies applied (see Query C above)

### PDF upload stuck at 40% (on mobile)
**This should be fixed now!** If not:
1. Hard refresh browser
2. Try on WiFi (not mobile data)
3. Check file size (< 20MB recommended)
4. Try different PDF file

### Can submit but doesn't appear in list
**Causes:**
1. Need to refresh page (F5)
2. Check you're logged in as correct user
3. Check job was "active" at submission time
4. Check application wasn't deleted

### HR can't see applications
**Causes:**
1. HR user doesn't have 'hr' role
2. RLS policies not applied
3. Need to refresh page
4. Check browser console for errors

---

## ✅ Checklist - Before Deployment

- [ ] Run `COMPLETE_DATABASE_FIX.sql` in Supabase
- [ ] Verify all 3 verification queries pass
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Test PDF submission (desktop)
- [ ] Test PDF submission (mobile)
- [ ] Test Google Drive submission (desktop)
- [ ] Test Google Drive submission (mobile)
- [ ] Login as HR, verify can see both types
- [ ] Login as Super Admin, verify full access
- [ ] Check no console errors (F12)
- [ ] Load test with multiple applications
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on different devices (Windows, Mac, Android, iOS)

---

## 📝 API Reference

### submitApplication()
```typescript
await submitApplication({
  job_id: "uuid-of-job",
  file: File | null,                 // PDF file or null
  applicant_comment: "My thoughts",
  google_drive_link?: "https://drive.google.com/file/d/...",
  onProgress: (percent) => console.log(percent)
});

Returns: string (application ID)
Throws: Error (with message)
```

### listMyApplications()
```typescript
const apps = await listMyApplications();

Returns:
[{
  id: "uuid",
  job_id: "uuid",
  job_title: "Software Engineer",
  pdf_path: "path-to-file" or null,
  google_drive_link: "https://drive..." or null,
  applicant_comment: "string",
  status: "for_review",
  submitted_at: "2024-01-21T10:00:00Z"
}, ...]
```

---

## 🚀 Deployment Steps

1. **Verify database** (queries above)
2. **Test locally** (npm run dev)
3. **Build** (npm run build)
4. **Deploy to Netlify**
   - Push to GitHub
   - Netlify auto-deploys
   - Set env variables in Netlify UI
5. **Test in production**
6. **Monitor for errors** (check Supabase logs)

---

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **SQL Syntax:** https://www.postgresql.org/docs/
- **Next.js API Routes:** https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **RLS Documentation:** https://supabase.com/docs/guides/auth/row-level-security

---

**Status:** ✅ Code ready | ⏳ Database setup needed  
**Time to Complete:** ~10 minutes  
**Difficulty:** Easy (single SQL script)  
**Support:** Check console errors (F12) if issues arise
