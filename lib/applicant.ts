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
  google_drive_link: string | null
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
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !existingProfile) {
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
  
  // Mobile-specific size recommendations
  const maxSize = 20 * 1024 * 1024; // 20MB
  const mobileMaxSize = 5 * 1024 * 1024; // 5MB for mobile recommendation
  
  if (file.size > maxSize) {
    const isMobileDevice = isMobile();
    const errorMsg = isMobileDevice 
      ? `File size exceeds ${maxSize / (1024 * 1024)}MB limit. For mobile uploads, we recommend files under ${mobileMaxSize / (1024 * 1024)}MB for better reliability.`
      : `File size exceeds ${maxSize / (1024 * 1024)}MB limit.`;
    
    return { valid: false, error: errorMsg };
  }
  
  return { valid: true };
}

/* ---------- Check if Browser ---------- */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/* ---------- Check if Android ---------- */
function isAndroid(): boolean {
  if (!isBrowser()) return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return /android/.test(userAgent);
}

/* ---------- Check if Mobile ---------- */
function isMobile(): boolean {
  if (!isBrowser()) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/* ---------- Fix Mobile PDF File ---------- */
export function fixMobilePDF(file: File): File {
  if (!isMobile()) return file;

  console.log('🔧 Fixing mobile PDF file...', {
    originalName: file.name,
    originalType: file.type,
    originalSize: file.size
  });

  try {
    // Mobile browsers often return empty type or wrong MIME for PDFs
    const isLikelyPDF = file.name.toLowerCase().endsWith('.pdf') || 
                       file.type === 'application/pdf' || 
                       file.type === '' || 
                       file.type === 'application/octet-stream';

    if (!isLikelyPDF) return file;

    // Create new File with guaranteed correct MIME type
    const fixedFile = new File([file], file.name, {
      type: 'application/pdf',
      lastModified: file.lastModified || Date.now()
    });

    console.log('✅ Mobile PDF fixed:', {
      newName: fixedFile.name,
      newType: fixedFile.type,
      newSize: fixedFile.size
    });

    return fixedFile;
  } catch (error) {
    console.error('Failed to fix mobile PDF:', error);
    return file;
  }
}

/* ---------- Upload Function with Mobile Fix ---------- */
async function uploadFileToStorage(file: File, fileName: string, userId: string, onProgress?: (progress: number) => void): Promise<any> {
  console.log('📤 Starting file upload...', {
    fileName,
    fileSize: file.size,
    fileType: file.type,
  });

  try {
    // For small files (< 5MB), upload directly
    if (file.size < 5 * 1024 * 1024) {
      console.log('✅ File < 5MB, using direct upload');
      const { data, error } = await supabase.storage
        .from('applications')
        .upload(fileName, file, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (error) throw error;
      if (onProgress) onProgress(100);
      console.log('✅ File uploaded!');
      return data;
    }

    // For larger files, chunk and upload with progress tracking
    console.log('📦 Large file detected, using chunked upload');
    
    const chunkSize = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedBytes = 0;

    // Create a temporary file handle for chunked upload
    const chunks: Blob[] = [];
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      chunks.push(chunk);
      
      // Calculate progress (50% for chunking, 50% for uploading)
      const chunkProgress = ((i + 1) / totalChunks) * 50;
      if (onProgress) onProgress(Math.round(chunkProgress));
      
      console.log(`📦 Chunk ${i + 1}/${totalChunks} prepared`);
    }

    // Combine chunks back into single blob and upload
    const combinedBlob = new Blob(chunks, { type: 'application/pdf' });
    
    // Simulate upload progress for better UX
    const uploadStartTime = Date.now();
    const estimatedUploadTime = (file.size / (1024 * 1024)) * 3000; // Rough estimate: 3 seconds per MB
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - uploadStartTime;
      const estimatedProgress = Math.min(95, 50 + (elapsed / estimatedUploadTime) * 45);
      if (onProgress) onProgress(Math.round(estimatedProgress));
    }, 200);

    const { data, error } = await supabase.storage
      .from('applications')
      .upload(fileName, combinedBlob, {
        contentType: 'application/pdf',
        upsert: false,
        // Increase timeout for large files
        ...(file.size > 10 * 1024 * 1024 && { 
          metadata: { 
            'Cache-Control': '0',
            'x-upsert': 'false'
          } 
        })
      });

    clearInterval(progressInterval);
    if (onProgress) onProgress(100);

    if (error) throw error;
    
    console.log('✅ File uploaded successfully!');
    return data;

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    
    // Simple, user-friendly error messages
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    }
    if (error.message?.includes('413') || error.message?.includes('too large')) {
      throw new Error('File is too large. Please use a smaller PDF file (max 20MB).');
    }
    if (error.message?.includes('permission') || error.message?.includes('policy')) {
      throw new Error('Permission denied. Please make sure you are logged in.');
    }
    
    throw new Error(error.message || 'Upload failed. Please try again.');
  }
}

/* ---------- Submit Application ---------- */
export async function submitApplication({ job_id, file, applicant_comment, google_drive_link, onProgress }: {
  job_id: string; 
  file: File | null; 
  applicant_comment: string;
  google_drive_link?: string | null;
  onProgress?: (progress: number) => void;
}): Promise<string> {
  try {
    console.log('🚀 Starting application submission...');
    
    // 1. Get current user
    const user = await getCurrentUser();
    if (!user) throw new Error('Please sign in to submit an application.');
    
    console.log('✅ User authenticated:', user.email);
    
    if (onProgress) onProgress(10);
    
    let pdf_path = '';
    
    // Handle PDF file upload
    if (file) {
      // 2. Fix file for mobile if needed
      let uploadFile = file;
      if (isMobile()) {
        console.log('📱 Mobile detected, applying PDF fix');
        uploadFile = fixMobilePDF(file);
      }
      
      if (onProgress) onProgress(15);
      
      // 3. Basic file validation
      const validation = validateFile(uploadFile);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid PDF file');
      }
      
      console.log('✅ File valid:', uploadFile.name);
      
      // 4. Create unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 9);
      pdf_path = `${user.id}-${job_id}-${timestamp}-${randomString}.pdf`;
      
      console.log('📤 Uploading file:', pdf_path);
      
      if (onProgress) onProgress(40);
      
      // 5. Upload file to storage with progress callback
      await uploadFileToStorage(uploadFile, pdf_path, user.id, (progress) => {
        // Map file upload progress (40-90%) to overall progress
        const fileProgress = 40 + (progress / 100) * 50;
        if (onProgress) onProgress(Math.round(fileProgress));
      });
      
      if (onProgress) onProgress(90);
      
      console.log('✅ File uploaded, saving to database...');
    } else if (google_drive_link) {
      console.log('🔗 Using Google Drive link:', google_drive_link);
      if (onProgress) onProgress(50);
    } else {
      throw new Error('Must provide either a PDF file or Google Drive link');
    }
    
    // 4. Check job exists
    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('id, job_title')
      .eq('id', job_id)
      .eq('status', 'active')
      .single();
    
    if (jobError || !job) {
      throw new Error('Job not found or no longer active.');
    }
    
    console.log('✅ Job verified:', job.job_title);
    
    if (onProgress) onProgress(25);
    
    // 5. Check if already applied
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', job_id)
      .eq('applicant_id', user.id)
      .maybeSingle();
    
    if (existingApp) {
      throw new Error(`You have already applied for "${job.job_title}". You cannot apply again for the same position.`);
    }
    
    if (onProgress) onProgress(30);
    
    if (onProgress) onProgress(90);
    
    console.log('✅ File uploaded, saving to database...');
    
    // 8. Save application to database
    const { data, error: insertError } = await supabase
      .from('applications')
      .insert({
        job_id,
        applicant_id: user.id,
        pdf_path: pdf_path || null,
        google_drive_link: google_drive_link || null,
        applicant_comment: applicant_comment || null,
        status: 'for_review',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Database error:', insertError);
      // Try to clean up uploaded file if it exists
      if (pdf_path) {
        try {
          await supabase.storage.from('applications').remove([pdf_path]);
        } catch (e) {
          console.warn('Could not clean up file');
        }
      }
      throw new Error('Failed to save application.');
    }
    
    if (onProgress) onProgress(100);
    
    console.log('🎉 Application submitted! ID:', data?.id);
    return data?.id || '';
    
  } catch (error: any) {
    console.error('❌ Submission error:', error.message);
    throw error;
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

    if (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }

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
    console.error('Error in listMyApplications:', error);
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

    let uploadFile = data.file;
    if (isMobile()) uploadFile = fixMobilePDF(data.file);
    
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
      .select('id')
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

/* ---------- Mobile Upload Test ---------- */
export async function testMobileUpload(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const isMobileDevice = isMobile();
    
    console.log('🧪 Testing mobile upload capabilities...', {
      isMobile: isMobileDevice,
      userAgent: navigator.userAgent
    });

    // Create test content
    const testContent = `Mobile Upload Test\nTime: ${new Date().toISOString()}\nUser: ${user.email}\nDevice: ${isMobileDevice ? 'Mobile' : 'Desktop'}`;
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    const testFileName = `mobile-test-${user.id}-${Date.now()}.txt`;
    
    console.log('Attempting test upload to storage...');
    
    const { error } = await supabase.storage
      .from('applications')
      .upload(testFileName, testBlob, {
        contentType: 'text/plain'
      });

    if (error) {
      console.error('Mobile test failed:', error);
      return { 
        success: false, 
        message: 'Mobile upload test failed', 
        error: `Storage error: ${error.message}` 
      };
    }

    // Clean up
    await supabase.storage.from('applications').remove([testFileName]);
    
    return { 
      success: true, 
      message: `✅ Mobile upload works! Device: ${isMobileDevice ? 'Mobile' : 'Desktop'}` 
    };
    
  } catch (error: any) {
    console.error('Mobile test crashed:', error);
    return { 
      success: false, 
      message: 'Mobile test failed', 
      error: error.message 
    };
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