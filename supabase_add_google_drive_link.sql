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
