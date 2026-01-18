import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// User interface
export interface User {
  id: string
  email: string
  role: 'applicant' | 'hr' | 'super_admin'
  first_name?: string
  middle_name?: string
  last_name?: string
  phone?: string
  created_at?: string
  updated_at?: string
}

// Application interface
export interface MyApplication {
  id: string
  job_id: string
  job_title: string
  job_status: string
  pdf_path: string
  applicant_comment: string
  hr_comment: string
  submitted_at: string
  status: 'for_review' | 'shortlisted' | 'for_interview' | 'hired' | 'rejected'
  updated_at?: string
  hr_comment_at?: string
  hr_comment_by?: {
    first_name: string
    last_name: string
    role: string
  }
}

/* ---------- Get Current User ---------- */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.log('No active session');
      return null;
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (!existingProfile) {
      // Create profile if doesn't exist
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          email: session.user.email,
          role: 'applicant',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        return null;
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      first_name: profile.first_name,
      middle_name: profile.middle_name,
      last_name: profile.last_name,
      phone: profile.phone,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/* ---------- File Validation ---------- */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) return { valid: false, error: 'No file selected.' };
  
  const fileName = file.name.toLowerCase();
  const isPDF = fileName.endsWith('.pdf');
  if (!isPDF) return { valid: false, error: 'Only PDF files are allowed.' };
  
  if (file.size === 0) return { valid: false, error: 'File appears to be empty.' };
  
  return { valid: true };
}

/* ---------- Prepare File for Android ---------- */
export function prepareFileForAndroid(file: File): File {
  if (typeof navigator === 'undefined') return file;
  
  const isAndroid = /Android/i.test(navigator.userAgent);
  if (!isAndroid) return file;

  try {
    let cleanName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
    
    if (!cleanName.toLowerCase().endsWith('.pdf')) {
      cleanName = cleanName.replace(/\.[^/.]+$/, "") + '.pdf';
    }
    
    if (cleanName.length > 100) {
      const baseName = cleanName.slice(0, 96);
      cleanName = baseName + '.pdf';
    }

    return new File([file], cleanName, {
      type: 'application/pdf',
      lastModified: Date.now()
    });
  } catch (error) {
    console.warn('Failed to prepare file for Android:', error);
    return file;
  }
}

/* ---------- Simple Upload Function ---------- */
async function uploadFileToStorage(file: File, fileName: string, userId: string): Promise<any> {
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  
  console.log('Uploading file:', {
    fileName,
    userId,
    isAndroid,
    fileSize: file.size,
    fileType: file.type
  });

  let uploadFile = file;
  if (isAndroid && (file.type === '' || file.type !== 'application/pdf')) {
    console.log('Fixing Android PDF MIME type');
    uploadFile = new File([file], fileName, { 
      type: 'application/pdf',
      lastModified: Date.now()
    });
  }

  const { data, error } = await supabase.storage
    .from('applications')
    .upload(fileName, uploadFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'application/pdf'
    });

  if (error) {
    console.error('Upload error:', error.message);
    throw error;
  }

  console.log('File uploaded successfully');
  return data;
}

/* ---------- Submit Application ---------- */
export async function submitApplication({ job_id, file, applicant_comment }: {
  job_id: string; file: File; applicant_comment: string;
}): Promise<string> {
  try {
    console.log('Starting application submission...');
    
    // 1. Get user
    const user = await getCurrentUser();
    if (!user) throw new Error('Please sign in to submit an application.');
    
    // 2. Prepare file for Android only
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    let uploadFile = file;
    
    if (isAndroid) {
      uploadFile = prepareFileForAndroid(file);
    }
    
    // 3. Validate file (NO SIZE LIMIT)
    const validation = validateFile(uploadFile);
    if (!validation.valid) throw new Error(validation.error || 'Invalid file');
    
    // 4. Check job exists
    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('id, job_title, status')
      .eq('id', job_id)
      .eq('status', 'active')
      .single();
    
    if (jobError || !job) throw new Error('Job not found or no longer active.');
    
    // 5. Check if already applied
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id, status')
      .eq('job_id', job_id)
      .eq('applicant_id', user.id)
      .maybeSingle();
    
    if (existingApp) {
      throw new Error(`You have already applied for "${job.job_title}". You cannot apply again for the same position.`);
    }
    
    // 6. Create filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const fileName = `${user.id}-${job_id}-${timestamp}-${randomString}.pdf`;
    
    // 7. Upload file
    console.log('Uploading PDF:', { 
      size: uploadFile.size, 
      name: uploadFile.name,
      type: uploadFile.type 
    });
    await uploadFileToStorage(uploadFile, fileName, user.id);
    
    // 8. Save to database
    const applicationData = {
      job_id,
      applicant_id: user.id,
      pdf_path: fileName,
      applicant_comment: applicant_comment || null,
      status: 'for_review',
      submitted_at: new Date().toISOString()
    };
    
    const { data, error: insertError } = await supabase
      .from('applications')
      .insert(applicationData)
      .select()
      .single();
    
    if (insertError) {
      console.error('Database error:', insertError);
      
      // Clean up file
      try {
        await supabase.storage.from('applications').remove([fileName]);
      } catch (cleanupError) {
        console.warn('Failed to clean up file:', cleanupError);
      }
      
      throw new Error('Failed to save application. Please try again.');
    }
    
    console.log('Application submitted! ID:', data?.id);
    return data?.id || '';
    
  } catch (error: any) {
    console.error('Application Error:', error);
    
    let userMessage = error.message;
    
    if (error.message.includes('already applied')) {
      userMessage = error.message;
    }
    else if (error.message.includes('network') || error.message.includes('fetch')) {
      userMessage = 'Network connection issue. Please check your internet and try again.';
    }
    else if (error.message.includes('pdf') || error.message.includes('PDF')) {
      userMessage = 'Please select a valid PDF file.';
    }
    else if (error.message.includes('sign in') || error.message.includes('authenticated')) {
      userMessage = 'Please sign in to submit an application.';
    }
    else if (error.message.includes('Job not found')) {
      userMessage = 'This job is no longer available for applications.';
    }
    
    throw new Error(userMessage);
  }
}

/* ---------- List Applications ---------- */
export async function listMyApplications(): Promise<MyApplication[]> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Please sign in to view your applications.');

    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        pdf_path,
        applicant_comment,
        hr_comment,
        hr_comment_by,
        hr_comment_at,
        submitted_at,
        status,
        updated_at,
        interview_date,
        interview_status,
        interview_notes,
        job_postings!inner (
          job_title,
          status
        ),
        profiles!hr_comment_by (
          first_name,
          last_name,
          role
        )
      `)
      .eq('applicant_id', user.id)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    return (applications || []).map((app: any) => ({
      id: app.id,
      job_id: app.job_id,
      job_title: app.job_postings?.job_title || 'Unknown Job',
      job_status: app.job_postings?.status || 'unknown',
      pdf_path: app.pdf_path,
      applicant_comment: app.applicant_comment || '',
      hr_comment: app.hr_comment || '',
      submitted_at: app.submitted_at,
      status: app.status || 'for_review',
      updated_at: app.updated_at,
      hr_comment_at: app.hr_comment_at,
      hr_comment_by: app.profiles ? {
        first_name: app.profiles.first_name,
        last_name: app.profiles.last_name,
        role: app.profiles.role
      } : undefined
    }));
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
}

/* ---------- List Active Jobs ---------- */
export async function listActiveJobs(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('job_postings')
      .select('*')
      .eq('status', 'active')
      .order('date_posted', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching active jobs:', error);
    throw error;
  }
}

/* ---------- Get Signed URL ---------- */
export async function getSignedUrl(filePath: string): Promise<string> {
  try {
    if (!filePath) throw new Error('No file path provided');
    
    const { data, error } = await supabase.storage
      .from('applications')
      .createSignedUrl(filePath, 60 * 60);

    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
}

/* ---------- Update Application ---------- */
export async function updateApplication(
  applicationId: string, 
  data: { file: File; applicant_comment: string }
): Promise<string> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existingApp, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('applicant_id', user.id)
      .single();

    if (fetchError) throw new Error('Application not found or no permission to edit');
    
    if (existingApp.status !== 'for_review') {
      throw new Error(`Cannot edit application that has been ${existingApp.status}.`);
    }

    const validation = validateFile(data.file);
    if (!validation.valid) throw new Error(validation.error || 'Invalid file');

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const fileName = `${user.id}-${existingApp.job_id}-${timestamp}-${randomString}.pdf`;

    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    let uploadFile = data.file;
    if (isAndroid) uploadFile = prepareFileForAndroid(data.file);
    
    await uploadFileToStorage(uploadFile, fileName, user.id);

    if (existingApp.pdf_path) {
      try {
        await supabase.storage.from('applications').remove([existingApp.pdf_path]);
      } catch (storageError) {
        console.warn('Failed to delete old file:', storageError);
      }
    }

    const { data: updatedApp, error: updateError } = await supabase
      .from('applications')
      .update({
        pdf_path: fileName,
        applicant_comment: data.applicant_comment || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateError) throw updateError;
    
    return updatedApp.id;

  } catch (error) {
    console.error('Error updating application:', error);
    throw error;
  }
}

/* ---------- Check if Already Applied ---------- */
export async function checkAlreadyApplied(jobId: string): Promise<{ applied: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { applied: false, message: 'Not authenticated' };

    const { data: existingApp, error } = await supabase
      .from('applications')
      .select('id, job_postings!inner(job_title)')
      .eq('job_id', jobId)
      .eq('applicant_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking application:', error);
      return { applied: false, message: '' };
    }

    if (existingApp) {
      const { data: job } = await supabase
        .from('job_postings')
        .select('job_title')
        .eq('id', jobId)
        .single();
      
      const jobTitle = job?.job_title || 'this position';
      return { 
        applied: true, 
        message: `You have already applied for "${jobTitle}". You cannot apply again for the same position.`
      };
    }

    return { applied: false, message: '' };
  } catch (error) {
    console.error('Error checking application:', error);
    return { applied: false, message: '' };
  }
}

/* ---------- Sign Out ---------- */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}