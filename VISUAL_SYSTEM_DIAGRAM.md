# 📋 Visual System Overview - PDF & Google Drive Submissions

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          APPLICATION FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (User Interface)                     │
│                /app/applicant/requirements/page.tsx                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LOGIN                                                              │
│   │                                                                 │
│   ├─→ [Select Job Posting from List]                              │
│        │                                                           │
│        ├─→ ┌──────────────────────────────────┐                   │
│            │ Choose Submission Method:        │                   │
│            │                                  │                   │
│            │ ○ 📄 PDF File Upload             │  ← Toggle         │
│            │ ○ 🔗 Google Drive Link          │  ← Toggle         │
│            │                                  │                   │
│            │ FILE PICKER (if PDF selected):  │                   │
│            │ [Choose PDF from device...]      │                   │
│            │                                  │                   │
│            │ URL INPUT (if Drive selected):  │                   │
│            │ [Paste Google Drive link...]     │                   │
│            │ ℹ️ How to share link (blue box)  │                   │
│            │                                  │                   │
│            │ COMMENTS (optional):            │                   │
│            │ [Enter your message...]          │                   │
│            │                                  │                   │
│            │ [Submit Application] ✅ Enabled  │  ← Only if        │
│            │ (greyed out if no file/link)     │    one method      │
│            └──────────────────────────────────┘    chosen          │
│        │                                                           │
│        └─→ SUBMIT & WAIT                                          │
│             │                                                     │
│             ├─→ ◼◼◼◼◼◼◼◼◼◼ 40% (Validating)                    │
│             ├─→ ◼◼◼◼◼◼◼◼◼◼ 75% (Uploading)                    │
│             └─→ ◼◼◼◼◼◼◼◼◼◼ 100% (Saving)                      │
│                                                                   │
│  SUCCESS: ✅ "Application submitted successfully!"                │
│                                                                   │
│  MY APPLICATIONS (List View):                                     │
│  ┌────────────────────────────────────────────────────┐           │
│  │ Job        │ Submitted | Submission Type | Status  │           │
│  ├────────────────────────────────────────────────────┤           │
│  │ Engineer   │ 3 days    │ 📄 PDF (view)   │ Review  │           │
│  │ Manager    │ 1 day     │ 🔗 Drive (open) │ Review  │           │
│  │ Designer   │ 2 days    │ 📄 PDF (view)   │ Hired   │           │
│  │ QA         │ Today     │ 🔗 Drive (open) │ Review  │           │
│  └────────────────────────────────────────────────────┘           │
│     (Can edit "for_review" applications)                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Data Processing)                       │
│                        /lib/applicant.ts                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  submitApplication({ job_id, file, google_drive_link, ... })      │
│                                                                      │
│  ┌─ Validation ─────────────────────────────────┐                  │
│  │ 1. User authenticated? ✓                      │                  │
│  │ 2. Job exists & active? ✓                     │                  │
│  │ 3. Not already applied? ✓                     │                  │
│  │ 4. Has PDF or Drive link? ✓                   │                  │
│  └──────────────────────────────────────────────┘                  │
│       │                                                             │
│       ├─→ FILE PATH                                                │
│       │   │                                                        │
│       │   └─→ Fix PDF for mobile if needed                         │
│       │       └─→ Validate file (size, type)                       │
│       │           └─→ Upload to Storage (chunked)                  │
│       │               └─→ Get storage path                         │
│       │                   └─→ pdf_path = "user-job-time-rand.pdf" │
│       │                       google_drive_link = NULL             │
│       │                                                            │
│       └─→ DRIVE LINK PATH                                         │
│           │                                                        │
│           └─→ Validate URL format & accessibility                 │
│               └─→ google_drive_link = "https://drive.google.../   │
│                   pdf_path = NULL                                 │
│                                                                   │
│  ┌─ Database Insert ──────────────────────────────┐               │
│  │ INSERT INTO applications:                      │               │
│  │ {                                              │               │
│  │   job_id: "uuid",                             │               │
│  │   applicant_id: "current_user",               │               │
│  │   pdf_path: null OR "path/to/file.pdf",       │ ← One or none │
│  │   google_drive_link: null OR "https://drive", │ ← One or none │
│  │   applicant_comment: "My thoughts",           │               │
│  │   status: "for_review",                       │               │
│  │   submitted_at: NOW()                         │               │
│  │ }                                              │               │
│  └────────────────────────────────────────────────┘               │
│       │                                                            │
│       └─→ CHECK CONSTRAINT: pdf_path OR google_drive_link EXISTS  │
│           (At least ONE must be not-null)                         │
│           │                                                       │
│           ├─→ ✓ VALID: Return success ID                         │
│           └─→ ✗ INVALID: Return error                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                         DATABASE (Storage)                           │
│                      PostgreSQL via Supabase                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TABLE: applications                                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Column              │ Type     │ Nullable │ Notes            │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ id                  │ UUID     │ NO       │ Primary Key      │  │
│  │ job_id              │ UUID     │ NO       │ Foreign Key      │  │
│  │ applicant_id        │ UUID     │ NO       │ Foreign Key      │  │
│  │ pdf_path            │ TEXT     │ YES ✓    │ Storage path     │  │
│  │ google_drive_link   │ TEXT     │ YES ✓    │ Drive URL        │  │
│  │ applicant_comment   │ TEXT     │ YES      │ User notes       │  │
│  │ status              │ TEXT     │ NO       │ for_review, etc  │  │
│  │ submitted_at        │ TIMESTAMP│ NO       │ Auto timestamp   │  │
│  │ hr_comment          │ TEXT     │ YES      │ HR feedback      │  │
│  │ updated_at          │ TIMESTAMP│ YES      │ Last change      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  CONSTRAINT: check_at_least_one_submission                         │
│  CHECK (pdf_path IS NOT NULL OR google_drive_link IS NOT NULL)     │
│         ↓                                                           │
│         Ensures users don't submit with BOTH fields empty          │
│                                                                      │
│  EXAMPLE DATA:                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ id  │ job_id│applicant_id│pdf_path │google_drive_link│status │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ 1   │ A1   │ U1        │ path.pdf│ NULL             │review │  │
│  │ 2   │ B1   │ U2        │ NULL    │ https://drive... │review │  │
│  │ 3   │ C1   │ U3        │ path.pdf│ NULL             │hired  │  │
│  │ 4   │ A1   │ U4        │ NULL    │ https://drive... │review │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ROW LEVEL SECURITY (RLS) Policies:                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Policy               │ Role       │ Can Do               │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ applicants_can_insert│ Applicant  │ INSERT own app       │  │
│  │ applicants_can_view  │ Applicant  │ SELECT own app       │  │
│  │ applicants_can_update│ Applicant  │ UPDATE own (status   │  │
│  │                     │            │ = for_review only)   │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ hr_can_view_all     │ HR         │ SELECT all apps      │  │
│  │ hr_can_update       │ HR         │ UPDATE all apps      │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ super_admin_full    │ Super Admin│ ALL permissions      │  │
│  │ _access             │            │ (INSERT, SELECT,     │  │
│  │                     │            │  UPDATE, DELETE)     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                     FILE STORAGE (Supabase Storage)                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Bucket: applications/                                             │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                                                            │   │
│  │ user123-job456-1705852800000-abc7def9.pdf               │   │
│  │ ├─ Owner: user123 (applicant)                           │   │
│  │ ├─ Size: 2.5 MB                                         │   │
│  │ ├─ Type: application/pdf                                │   │
│  │ └─ Signed URL (expires 1 hour):                         │   │
│  │    https://xyz.supabase.co/storage/v1/...?token=abc   │   │
│  │                                                          │   │
│  │ user789-job456-1705939200000-def1ghi3.pdf               │   │
│  │ ├─ Owner: user789 (applicant)                           │   │
│  │ ├─ Size: 1.8 MB                                         │   │
│  │ ├─ Type: application/pdf                                │   │
│  │ └─ Signed URL (expires 1 hour)                          │   │
│  │                                                          │   │
│  │ [Only PDFs stored here, not Google Drive files]         │   │
│  │                                                          │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Note: Google Drive submissions don't need storage                 │
│        (Links point directly to Google Drive servers)              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────┐
│                    HR/ADMIN VIEW (Dashboard)                         │
│                   /app/administrator/applications                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Applications List:                                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Applicant   │ Position    │ Submission    │ Status  │ Action │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ John Doe    │ Engineer    │ 📄 View PDF   │ Review  │ 📝 Edit│  │
│  │             │             │               │         │ ✅     │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ Jane Smith  │ Manager     │ 🔗 Open Drive │ Review  │ 📝 Edit│  │
│  │             │             │               │         │ ✅     │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ Bob Johnson │ Designer    │ 📄 View PDF   │ Hired   │ View   │  │
│  │             │             │               │         │        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Click "View PDF":                                                 │
│  ├─→ Opens signed URL in new tab                                 │
│  ├─→ Shows in iframe (desktop) or native viewer (mobile)         │
│  ├─→ Can download or print                                       │
│  └─→ Expires after 1 hour                                        │
│                                                                      │
│  Click "Open Drive":                                               │
│  ├─→ Opens Google Drive in new tab                               │
│  ├─→ Can view/download if they have access                       │
│  └─→ Never expires (controlled by applicant sharing)              │
│                                                                      │
│  Click "Edit":                                                     │
│  ├─→ Can update status (for_review → shortlisted, etc.)          │
│  ├─→ Can add HR comments                                         │
│  ├─→ Can schedule interview                                       │
│  └─→ Can see applicant's original submission                      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Timeline

### PDF Submission Journey
```
T+0s   User selects "📄 PDF File" & chooses file
       ↓
T+2s   Browser validates PDF (size, type)
       ↓
T+5s   Upload starts to Supabase Storage (progress bar: 10%)
       ↓
T+10s  Mid-upload (progress bar: 50%)
       ↓
T+15s  Upload complete (progress bar: 90%)
       ↓
T+16s  Database insert with pdf_path set, google_drive_link = NULL
       ↓
T+17s  ✅ Success! Application saved & visible in list
       ↓
       HR/Admin can view: Storage → Signed URL → Viewer
```

### Google Drive Submission Journey
```
T+0s   User selects "🔗 Google Drive Link" & pastes URL
       ↓
T+1s   Browser validates URL format
       ↓
T+2s   Database insert with google_drive_link set, pdf_path = NULL
       ↓
T+3s   ✅ Success! Application saved instantly (no upload needed)
       ↓
       HR/Admin can view: Click link → Google Drive
```

### Comparison
```
PDF Submission:
├─ Upload time: ~15 seconds (depends on file size)
├─ Storage: Supabase Storage bucket
├─ Viewing: Signed URL (1-hour expiry)
└─ Mobile: ✅ Works (fixed 40% issue)

Google Drive Submission:
├─ Upload time: Instant (only DB insert)
├─ Storage: Google Drive (not Supabase)
├─ Viewing: Direct Google Drive link
└─ Mobile: ✅ Works
```

---

## Security Layers

```
Layer 1: Authentication
├─ User must be logged in
├─ Supabase Auth session verified
└─ applicant_id = auth.uid()

Layer 2: Authorization (RLS)
├─ Applicants: Can only access own applications
├─ HR: Can view all, update (not delete)
└─ Super Admin: Full access

Layer 3: Data Validation
├─ PDF: Size check (max 50MB)
├─ PDF: Type check (application/pdf)
├─ Drive: URL format validation
└─ Drive: Not empty/valid URL

Layer 4: Database Constraints
├─ pdf_path OR google_drive_link (at least one)
├─ status CHECK (valid statuses only)
├─ Foreign keys validated
└─ Timestamps auto-set

Layer 5: Storage Security
├─ PDF files in secure bucket
├─ Signed URLs expire (1 hour)
├─ Drive links: User controls sharing
└─ No unauthenticated access
```

---

## Error Handling Flow

```
User Submits → Validation → Upload/Save → Error?

✓ No file/link selected
  → ❌ "Must provide PDF or Google Drive link"
  → UI: Submit button disabled (greyed out)

✓ File too large
  → ❌ "File too large (max 50MB)"
  → UI: Toast alert

✓ Invalid Drive URL
  → ❌ "Invalid Google Drive link"
  → UI: Toast alert

✓ Upload fails
  → ❌ "Upload failed, please retry"
  → UI: Toast + retry button

✓ Database insert fails (RLS)
  → ❌ "Permission denied"
  → UI: Toast + "Contact support"

✓ Database insert fails (constraint)
  → ❌ "Submission incomplete"
  → UI: Toast + console error details

✓ All good!
  → ✅ "Application submitted successfully!"
  → UI: Application appears in list
  → Redirect to success page (optional)
```

---

## Success Criteria ✅

- ✅ Applicant can upload PDF (mobile + desktop)
- ✅ Applicant can submit Google Drive link
- ✅ Can't submit with neither method
- ✅ Can't submit with both methods (only one)
- ✅ HR can view both types
- ✅ Super Admin has full access
- ✅ Mobile PDF upload not stuck at 40%
- ✅ Signed URLs expire properly
- ✅ RLS prevents unauthorized access
- ✅ Database constraints enforced
- ✅ Progress bar shows during upload
- ✅ Error messages are clear
- ✅ No console JavaScript errors

---

**After running COMPLETE_DATABASE_FIX.sql, this entire system becomes operational!**
