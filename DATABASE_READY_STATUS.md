# ✅ Column Already Exists - Almost Ready!

Good news! Your database already has the `google_drive_link` column. Just need to add the constraint for data integrity.

## Quick Fix (2 minutes)

### Run This SQL:

Go to **Supabase Dashboard → SQL Editor → New Query** and run:

```sql
-- Add constraint to ensure at least one of pdf_path or google_drive_link is provided
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.applications
    ADD CONSTRAINT check_pdf_or_drive CHECK (
      (pdf_path IS NOT NULL AND pdf_path != '') OR 
      (google_drive_link IS NOT NULL AND google_drive_link != '')
    );
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_google_drive_link ON public.applications(google_drive_link);
```

### What This Does:
- ✅ Adds data integrity check (at least PDF or link required)
- ✅ Creates performance index
- ✅ Skips if already exists (won't error)

### After Running:
**Google Drive link submissions will work immediately!** 🚀

---

## If You Want to Skip This

The column exists, so Google Drive submissions **should already work**. Try submitting a link now and it should save successfully.

The constraint is optional (but recommended for data integrity).

---

## Current Database Status

Your `applications` table has:
- ✅ `google_drive_link` column (text) - **READY**
- ✅ `pdf_path` column - **EXISTING**
- ✅ All other required columns - **READY**

**You're ready to go!** Try submitting with Google Drive link now. 🎉
