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
async function uploadFileToStorage(file: File, fileName: string, userId: string): Promise<any> {
  console.log('📱 Starting file upload...', {
    fileName,
    userId,
    originalFileType: file.type,
    originalFileName: file.name,
    fileSize: file.size,
    isMobile: isMobile()
  });

  // STEP 1: Fix mobile file if needed
  let uploadFile = file;
  if (isMobile()) {
    console.log('🔄 Applying mobile PDF fix...');
    uploadFile = fixMobilePDF(file);
  }

  // STEP 2: Verify file is readable (mobile specific) - OPTIONAL, less blocking
  if (isMobile()) {
    try {
      console.log('🔍 Quick file readability check on mobile...');
      // Timeout the readability check itself to avoid blocking mobile
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve();
          reader.onerror = () => reject(new Error('File cannot be read'));
          // Only read first 512 bytes instead of 1KB for faster check
          reader.readAsArrayBuffer(uploadFile.slice(0, Math.min(uploadFile.size, 512)));
        }),
        new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('File check timeout')), 3000); // 3 second timeout for this check
        })
      ]);
      console.log('✅ File readable on mobile');
    } catch (readError: any) {
      // Don't fail the upload, just log warning - file may still be uploadable
      console.warn('⚠️ Mobile file readability check skipped:', readError.message);
      console.warn('Proceeding with upload anyway...');
    }
  }

  // STEP 3: Simple upload with only necessary options
  const uploadOptions: any = {
    contentType: 'application/pdf',  // CRITICAL for mobile
    upsert: false
  };

  console.log('🚀 Starting upload with options:', uploadOptions);

  // STEP 4: Create upload promise with timeout
  const uploadPromise = supabase.storage
    .from('applications')
    .upload(fileName, uploadFile, uploadOptions);

  // Add timeout for mobile (120 seconds) - increased from 90 for slower networks
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Upload timeout after 120 seconds')), 120000);
  });

  let lastError = null;
  
  // Try up to 3 times with longer delays for mobile networks
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`📤 Upload attempt ${attempt}/3...`);
      
      const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;
      
      if (error) {
        lastError = error;
        console.warn(`⚠️ Upload attempt ${attempt} failed:`, error.message);
        
        // Wait before retry (3 seconds for better mobile recovery)
        if (attempt < 3) {
          const delayMs = 3000 * attempt; // Progressive delay: 3s, 6s
          console.log(`⏳ Waiting ${delayMs/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
      } else {
        console.log('✅ UPLOAD SUCCESSFUL!');
        return data;
      }
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Upload attempt ${attempt} crashed:`, error);
      if (attempt < 3) {
        const delayMs = 3000 * attempt;
        console.log(`⏳ Waiting ${delayMs/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
    }
  }

  // STEP 5: If all retries failed
  console.error('❌ ALL UPLOAD ATTEMPTS FAILED:', lastError);
  
  // User-friendly error messages for mobile with specific guidance
  if (isMobile()) {
    if (lastError?.message?.includes('timeout')) {
      throw new Error('Upload took too long (network may be slow). Try: 1) Use WiFi instead of mobile data, 2) Reduce file size, 3) Try again with a stable connection.');
    }
    if (lastError?.message?.includes('network') || lastError?.message?.includes('fetch')) {
      throw new Error('Network connection unstable. This is common on mobile. Try: 1) Switch to WiFi, 2) Move to area with better signal, 3) Close other apps using data.');
    }
    if (lastError?.message?.includes('413') || lastError?.message?.includes('large')) {
      throw new Error('File too large for upload. Compress your PDF or try a smaller file (under 5MB recommended for mobile, max 20MB).');
    }
    if (lastError?.message?.includes('permission') || lastError?.message?.includes('policy')) {
      throw new Error('Upload permission denied. Please ensure you are logged in with the correct account.');
    }
  }
  
  throw lastError || new Error('Upload failed after 3 attempts. Please check your connection and try again.');
}

/* ---------- Submit Application ---------- */
export async function submitApplication({ job_id, file, applicant_comment }: {
  job_id: string; file: File; applicant_comment: string;
}): Promise<string> {
  try {
    console.log('🚀 STARTING APPLICATION SUBMISSION...');
    
    // 1. Get user
    const user = await getCurrentUser();
    if (!user) throw new Error('Please sign in to submit an application.');
    
    console.log('👤 User authenticated:', user.email);
    
    // 2. Always fix file for mobile
    let uploadFile = file;
    if (isMobile()) {
      console.log('📱 Mobile device detected, applying PDF fix');
      uploadFile = fixMobilePDF(file);
    }
    
    // 3. Validate file
    const validation = validateFile(uploadFile);
    if (!validation.valid) {
      console.error('❌ File validation failed:', validation.error);
      throw new Error(validation.error || 'Invalid file');
    }
    
    console.log('✅ File validated:', {
      name: uploadFile.name,
      type: uploadFile.type,
      size: uploadFile.size
    });
    
    // 4. Check job exists and is active
    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('id, job_title, status')
      .eq('id', job_id)
      .eq('status', 'active')
      .single();
    
    if (jobError || !job) {
      console.error('❌ Job not found:', jobError);
      throw new Error('Job not found or no longer active.');
    }
    
    console.log('✅ Job found:', job.job_title);
    
    // 5. Check if already applied
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id, status')
      .eq('job_id', job_id)
      .eq('applicant_id', user.id)
      .maybeSingle();
    
    if (existingApp) {
      console.log('❌ Already applied to this job');
      throw new Error(`You have already applied for "${job.job_title}". You cannot apply again for the same position.`);
    }
    
    // 6. Create unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const fileName = `${user.id}-${job_id}-${timestamp}-${randomString}.pdf`;
    
    console.log('📄 Uploading PDF:', { 
      fileName,
      size: uploadFile.size, 
      name: uploadFile.name,
      type: uploadFile.type 
    });
    
    // 7. UPLOAD FILE (with mobile-proof handling)
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
    
    console.log('💾 Saving to database...');
    
    const { data, error: insertError } = await supabase
      .from('applications')
      .insert(applicationData)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Database error:', insertError);
      
      // Clean up uploaded file
      try {
        await supabase.storage.from('applications').remove([fileName]);
        console.log('🧹 Cleaned up uploaded file');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up file:', cleanupError);
      }
      
      throw new Error('Failed to save application. Please try again.');
    }
    
    console.log('✅ APPLICATION SUBMITTED! ID:', data?.id);
    return data?.id || '';
    
  } catch (error: any) {
    console.error('❌ APPLICATION ERROR:', {
      message: error.message,
      stack: error.stack,
      isMobile: isMobile()
    });
    
    // MOBILE-SPECIFIC ERROR MESSAGES
    let userMessage = error.message;
    
    if (isMobile()) {
      if (error.message.includes('timeout')) {
        userMessage = '⏱️ Upload timed out. For mobile: Keep files under 5MB and use WiFi for faster uploads.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        userMessage = '📶 Mobile network unstable. Switch to WiFi or check your connection.';
      } else if (error.message.includes('corrupted') || error.message.includes('read')) {
        userMessage = '📄 File issue. Try selecting the PDF again or check file integrity.';
      } else if (error.message.includes('too large') || error.message.includes('size')) {
        userMessage = '📁 File too large for mobile upload. Recommended: under 5MB for reliable upload.';
      } else if (error.message.includes('already applied')) {
        userMessage = error.message; // Keep this message
      } else if (error.message.includes('sign in')) {
        userMessage = '🔑 Please sign in again.';
      } else if (error.message.includes('Job not found')) {
        userMessage = '⚠️ This job is no longer available.';
      } else if (error.message.includes('PDF') || error.message.includes('pdf')) {
        userMessage = '📄 Please select a valid PDF file.';
      }
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