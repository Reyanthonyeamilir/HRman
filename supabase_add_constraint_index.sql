-- Add constraint and index for google_drive_link (column already exists)
-- This ensures data integrity and performance

-- Add a constraint to ensure at least one of pdf_path or google_drive_link is provided
-- Skip if constraint already exists
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

-- Create index on google_drive_link for faster queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_applications_google_drive_link ON public.applications(google_drive_link);

-- Add column comment if not already added
COMMENT ON COLUMN public.applications.google_drive_link IS 'Google Drive link (folder, file, or document) submitted by applicant as alternative to PDF file';
