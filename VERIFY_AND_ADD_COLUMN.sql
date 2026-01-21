-- VERIFY AND ADD google_drive_link column if missing

-- First, check if column exists
-- If this returns 0 rows, the column doesn't exist

-- Add column if it doesn't exist (safe to run multiple times)
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS google_drive_link text;

-- Add index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_applications_google_drive_link 
ON public.applications(google_drive_link);

-- Verify the column was created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'applications' 
AND column_name = 'google_drive_link';
