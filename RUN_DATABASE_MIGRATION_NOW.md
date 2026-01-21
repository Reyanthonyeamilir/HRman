# 🚀 URGENT: Run This Database Migration

Your application code is ready, but the database needs the `google_drive_link` column added. Follow these steps NOW:

## Quick Fix (5 minutes)

### Step 1: Open Supabase Dashboard
1. Go to https://app.supabase.com
2. Sign in and select your project
3. Look for the **"SQL Editor"** in the left sidebar

### Step 2: Create New Query
1. Click **"New Query"** (or the "+" button)
2. You'll see a blank SQL editor

### Step 3: Copy the Migration SQL
The SQL to run is in this file:
```
supabase_add_google_drive_link.sql
```

**Copy the entire content:**
```sql
-- Add google_drive_link column to applications table
-- This allows applicants to submit either a PDF file or a Google Drive link

ALTER TABLE public.applications
ADD COLUMN google_drive_link text;

-- Add a constraint to ensure at least one of pdf_path or google_drive_link is provided
ALTER TABLE public.applications
ADD CONSTRAINT check_pdf_or_drive CHECK (
  (pdf_path IS NOT NULL AND pdf_path != '') OR 
  (google_drive_link IS NOT NULL AND google_drive_link != '')
);

-- Optional: Create an index on google_drive_link for faster queries
CREATE INDEX idx_applications_google_drive_link ON public.applications(google_drive_link);

-- Add comment explaining the column
COMMENT ON COLUMN public.applications.google_drive_link IS 'Google Drive link (folder, file, or document) submitted by applicant as alternative to PDF file';
```

### Step 4: Paste into SQL Editor
1. Click in the white editor area
2. Paste the SQL code (Ctrl+V)

### Step 5: Run the Migration
1. Click the **"Run"** button (or press Ctrl+Enter)
2. Wait a few seconds...
3. You should see: ✅ **"Success"** message at the bottom

### Step 6: Verify Success
If you see this, the migration worked:
```
Started executing query
Finished executing query successfully
```

---

## ✅ After Running the Migration

Once complete:
1. Go back to your app
2. Try submitting with Google Drive link again
3. It should work! 🎉

---

## Troubleshooting

### If you see: "Constraint already exists"
- The constraint was already added (that's fine)
- The table should have the column

### If you see: "Column already exists"
- The column was already added (that's fine)
- Everything is set up

### If you see: Other errors
- Double-check you copied the SQL exactly
- Make sure you're in the right project
- Try running each part separately if needed

---

## Alternative: Using Supabase CLI

If you have Supabase CLI installed:
```bash
cd c:\Users\Administrator\Desktop\hrman\HRman
supabase db push
```

---

## 🔍 How to Verify It Worked

After running the migration, you can verify:

1. In Supabase Dashboard → **Table Editor**
2. Click on **applications** table
3. Check the columns list
4. You should see: `google_drive_link` (text type)

---

**⚠️ Important:** Your application code is ready and waiting. Just run this SQL and everything will work!

Run this NOW and your Google Drive submissions will be working in seconds. 🚀
