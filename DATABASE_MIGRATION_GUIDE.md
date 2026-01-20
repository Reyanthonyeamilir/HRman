# Database Migration: Add Google Drive Link Support

## Summary
This migration adds support for applicants to submit either a PDF file OR a Google Drive link when applying for jobs.

## Changes Made

### 1. New Column Added
- `google_drive_link` (text, nullable) - Stores the Google Drive link submitted by applicant

### 2. Constraints Added
- Check constraint: Ensures at least one of `pdf_path` or `google_drive_link` is provided per application
- This prevents incomplete applications

### 3. Index Added
- Index on `google_drive_link` for faster queries when filtering applications

## How to Apply This Migration

### Using Supabase Dashboard:
1. Go to Supabase Dashboard → Your Project
2. Navigate to SQL Editor
3. Click "New Query"
4. Copy the contents of `supabase_add_google_drive_link.sql`
5. Paste into the SQL Editor
6. Click "Run"

### Using Supabase CLI:
```bash
# If you have supabase CLI installed
supabase db push
```

## Updated Schema

```sql
ALTER TABLE public.applications
ADD COLUMN google_drive_link text;

ALTER TABLE public.applications
ADD CONSTRAINT check_pdf_or_drive CHECK (
  (pdf_path IS NOT NULL AND pdf_path != '') OR 
  (google_drive_link IS NOT NULL AND google_drive_link != '')
);

CREATE INDEX idx_applications_google_drive_link ON public.applications(google_drive_link);
```

## Verification

After running the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'applications' AND column_name = 'google_drive_link';

-- Check if constraint exists
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'applications' AND constraint_name = 'check_pdf_or_drive';
```

## Application Code Changes

The application now supports:

### 1. Applicant Requirements Page (`/applicant/requirements`)
- Toggle between "📄 PDF File" and "🔗 Google Drive Link"
- Submit with either method
- Both validation and submission logic implemented

### 2. Backend (`lib/applicant.ts`)
- `submitApplication()` accepts `file` OR `google_drive_link`
- PDF uploads: Saved to Supabase Storage with `pdf_path`
- Google Drive links: Saved directly with `google_drive_link`

### 3. Application Display
- Shows submitted PDFs with signed URLs (1-hour expiry)
- Shows Google Drive links with clickable "Open in Google Drive" button
- Mobile-safe PDF viewing (native viewer on mobile, iframe on desktop)

### 4. Database
- `MyApplication` interface updated to include `google_drive_link`
- Type-safe queries and responses

## Rollback (if needed)

If you need to revert this change:

```sql
-- Drop the constraint
ALTER TABLE public.applications
DROP CONSTRAINT check_pdf_or_drive;

-- Drop the index
DROP INDEX idx_applications_google_drive_link;

-- Remove the column
ALTER TABLE public.applications
DROP COLUMN google_drive_link;
```

## Notes

- Existing applications will have `NULL` for `google_drive_link` (backward compatible)
- The check constraint ensures data integrity going forward
- Google Drive links are stored as plain text URLs
- HR and Super Admin can view both PDF and Google Drive submissions in the applications list
