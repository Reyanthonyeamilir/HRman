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

// User interface matching our database schema
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

/* ---------- Database Health Check ---------- */
export async function checkDatabaseHealth() {
  try {
    console.log('🔍 Checking database health...');
    
    // Check connection
    const { data: test, error: connError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (connError) {
      console.error('❌ Database connection error:', connError);
      return { healthy: false, error: connError.message };
    }
    
    // Check RLS
    const { data: profile, error: rlsError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (rlsError?.code === '42501') {
      console.error('❌ RLS policy error - missing policies');
      return { healthy: false, error: 'Missing RLS policies' };
    }
    
    console.log('✅ Database is healthy');
    return { healthy: true, error: null };
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return { healthy: false, error: String(error) };
  }
}

/* ---------- Profile Management ---------- */
export async function ensureUserProfile(userId: string, email: string): Promise<boolean> {
  try {
    console.log('🔄 Ensuring profile exists for:', userId);
    
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    // If profile doesn't exist, create it
    if (checkError?.code === 'PGRST116') {
      console.log('📝 Creating missing profile...');
      
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          role: 'applicant',
          created_at: new Date().toISOString()
        });

      if (createError) {
        console.error('❌ Failed to create profile:', createError);
        return false;
      }
      
      console.log('✅ Profile created successfully');
      return true;
    }

    if (checkError) {
      console.error('❌ Error checking profile:', checkError);
      return false;
    }

    console.log('✅ Profile already exists');
    return !!existingProfile;
  } catch (error) {
    console.error('❌ Error ensuring user profile:', error);
    return false;
  }
}

/* ---------- Auth Functions ---------- */
export async function signUp({ email, password, phone, first_name, last_name }: {
  email: string; 
  password: string; 
  phone?: string;
  first_name?: string;
  last_name?: string;
}) {
  try {
    console.log('👤 Starting signup for:', email);
    
    const { data, error } = await supabase.auth.signUp({
      email, 
      password, 
      options: { 
        data: { 
          phone: phone || '',
          first_name: first_name || '',
          last_name: last_name || ''
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) {
      console.error('❌ Auth signup error:', error);
      throw error;
    }

    // If user is created successfully, create their profile
    if (data.user) {
      console.log('✅ Auth user created, ensuring profile...');
      
      // Use ensureUserProfile function
      const profileCreated = await ensureUserProfile(data.user.id, email);
      
      if (profileCreated) {
        console.log('✅ Profile created/verified');
      } else {
        console.warn('⚠️ Profile may not have been created');
      }
    }

    return { 
      user: data.user,
      requiresEmailConfirmation: !data.session 
    };
  } catch (error) {
    console.error('❌ Sign up error:', error);
    throw error;
  }
}

export async function signIn({ email, password }: { email: string; password: string }) {
  try {
    console.log('🔐 Signing in:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
    
    console.log('✅ Signed in successfully:', data.user.id);
    
    // Ensure profile exists after sign in
    if (data.user) {
      await ensureUserProfile(data.user.id, data.user.email!);
    }
    
    return data.user;
  } catch (error) {
    console.error('❌ Sign in error:', error);
    throw error;
  }
}

export async function signOut() {
  try {
    console.log('👋 Signing out...');
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
    
    console.log('✅ Signed out successfully');
  } catch (error) {
    console.error('❌ Sign out error:', error);
    throw error;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    console.log('🔍 Getting current user...');
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log('❌ No active session');
      return null;
    }

    console.log('✅ Session found for user:', session.user.id);

    // First, ensure profile exists
    const profileExists = await ensureUserProfile(session.user.id, session.user.email!);
    
    if (!profileExists) {
      console.error('❌ Failed to ensure profile exists');
      return null;
    }

    // Then fetch the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      return null;
    }

    console.log('✅ Profile loaded:', profile.email);
    
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
    console.error('❌ Error getting current user:', error);
    return null;
  }
}

export async function updateUserProfile(updates: { 
  first_name?: string; 
  last_name?: string; 
  middle_name?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
}) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    console.log('📝 Updating profile for:', user.id);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.error('❌ Profile update error:', error);
      throw error;
    }
    
    console.log('✅ Profile updated successfully');
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    throw error;
  }
}

/* ---------- Application Functions ---------- */
export interface JobPosting {
  id: string
  job_title: string
  department?: string
  location?: string
  job_description?: string
  status: 'active' | 'closed'
  date_posted: string
  created_by: string
}

export interface Application {
  id: string
  job_id: string
  applicant_id: string
  pdf_path: string
  applicant_comment?: string  // Renamed from 'comment'
  hr_comment?: string        // New field
  hr_comment_by?: string     // New field
  hr_comment_at?: string     // New field
  submitted_at: string
  status: 'for_review' | 'shortlisted' | 'hired' | 'rejected'
  updated_at?: string
  job_postings?: {
    job_title: string
    status: string
  }
  hr_comment_profiles?: {    // New field
    first_name: string
    last_name: string
    role: string
  }
}

export async function listActiveJobs(): Promise<JobPosting[]> {
  try {
    console.log('📋 Fetching active jobs...');
    
    const { data, error } = await supabase
      .from('job_postings')
      .select('*')
      .eq('status', 'active')
      .order('date_posted', { ascending: false });

    if (error) {
      console.error('❌ Error fetching active jobs:', error);
      throw error;
    }
    
    console.log(`✅ Found ${data?.length || 0} active jobs`);
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching active jobs:', error);
    throw error;
  }
}

export async function submitApplication({ job_id, file, applicant_comment }: {
  job_id: string;
  file: File;
  applicant_comment: string;
}) {
  try {
    console.log('🚀 Starting application submission...');
    console.log('📊 Submission details:', { job_id, file: file.name, applicant_commentLength: applicant_comment?.length });
    
    // 1. Get current user with enhanced error handling
    const user = await getCurrentUser();
    
    if (!user) {
      console.error('❌ No user found - not authenticated');
      throw new Error('Not authenticated. Please sign in to submit an application.');
    }

    console.log('✅ User authenticated:', { id: user.id, email: user.email });

    // 2. Validate file type
    if (file.type !== 'application/pdf') {
      console.error('❌ Invalid file type:', file.type);
      throw new Error('Only PDF files are allowed.');
    }

    // 3. Validate file size (10MB limit as per your page)
    if (file.size > 10 * 1024 * 1024) {
      console.error('❌ File too large:', file.size);
      throw new Error('File size must be less than 10MB.');
    }

    // 4. Check for spam protection
    const cooldownCheck = await checkRecentApplication(job_id);
    
    if (!cooldownCheck.canApply) {
      console.error('❌ Spam protection triggered:', cooldownCheck.message);
      throw new Error(cooldownCheck.message);
    }

    console.log('✅ Spam check passed');

    // 5. Verify job exists and is active
    console.log('🔍 Verifying job exists...');
    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('id, job_title, status')
      .eq('id', job_id)
      .eq('status', 'active')
      .single();

    if (jobError || !job) {
      console.error('❌ Job verification failed:', jobError);
      throw new Error('Job not found or no longer active. Please select a different position.');
    }

    console.log('✅ Job verified:', job.job_title);

    // 6. Check for duplicate applications
    console.log('🔍 Checking for duplicates...');
    const { data: existingApp, error: duplicateError } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', job_id)
      .eq('applicant_id', user.id)
      .maybeSingle();

    if (duplicateError) {
      console.error('❌ Duplicate check error:', duplicateError);
      // Continue anyway - don't fail on check error
    }

    if (existingApp) {
      console.error('❌ Duplicate application found');
      throw new Error('You have already applied to this position.');
    }

    console.log('✅ No duplicate found');

    // 7. Upload PDF file
    console.log('📤 Uploading file...');
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${job_id}-${Date.now()}.${fileExt}`;
    const filePath = `applications/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('applications')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw new Error(`File upload failed: ${uploadError.message}`);
    }

    console.log('✅ File uploaded:', filePath);

    // 8. Create application record
    console.log('🗂️ Inserting application record...');
    
    const applicationData = {
      job_id,
      applicant_id: user.id,
      pdf_path: filePath,
      applicant_comment: applicant_comment || null,  // Use new field name
      status: 'for_review',
      submitted_at: new Date().toISOString()
    };

    console.log('📝 Application data:', applicationData);

    const { data, error: insertError } = await supabase
      .from('applications')
      .insert(applicationData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Database insert error:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        fullError: insertError
      });
      
      // Clean up uploaded file if database insert fails
      console.log('🧹 Cleaning up uploaded file due to insert error...');
      await supabase.storage.from('applications').remove([filePath]);
      
      // User-friendly error messages based on error code
      if (insertError.code === '23503') {
        throw new Error('Database error: Invalid job or user. Please try again.');
      } else if (insertError.code === '23505') {
        throw new Error('You have already applied to this position.');
      } else {
        throw new Error(`Failed to submit application: ${insertError.message}`);
      }
    }
    
    console.log('✅ Application submitted successfully! ID:', data?.id);
    return data?.id || '';
    
  } catch (error) {
    console.error('❌ Error in submitApplication:', error);
    
    // Re-throw the error for the UI to handle
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }
}

export interface MyApplication {
  id: string
  job_id: string
  job_title: string
  job_status: string
  pdf_path: string
  applicant_comment: string  // Updated field name
  hr_comment: string        // New field
  submitted_at: string
  status: 'for_review' | 'shortlisted' | 'hired' | 'rejected'
  updated_at?: string
  hr_comment_at?: string    // New field
  hr_comment_by?: {         // New field
    first_name: string
    last_name: string
    role: string
  }
}

export async function listMyApplications(): Promise<MyApplication[]> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated. Please sign in to view your applications.');
    }

    console.log('📋 Fetching applications for user:', user.id);

    const { data, error } = await supabase
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
        job_postings (
          job_title,
          status
        ),
        hr_comment_profiles:hr_comment_by (
          first_name,
          last_name,
          role
        )
      `)
      .eq('applicant_id', user.id)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching applications:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} applications`);

    // Transform the data to match our interface
    return (data || []).map((app: any) => {
      const jobPosting = Array.isArray(app.job_postings) ? app.job_postings[0] : app.job_postings;
      const hrCommentProfile = Array.isArray(app.hr_comment_profiles) ? app.hr_comment_profiles[0] : app.hr_comment_profiles;
      
      return {
        id: app.id,
        job_id: app.job_id,
        job_title: jobPosting?.job_title || 'Unknown Job',
        job_status: jobPosting?.status || 'unknown',
        pdf_path: app.pdf_path,
        applicant_comment: app.applicant_comment || '',  // Updated field name
        hr_comment: app.hr_comment || '',               // New field
        submitted_at: app.submitted_at,
        status: app.status || 'for_review',
        updated_at: app.updated_at,
        hr_comment_at: app.hr_comment_at,
        hr_comment_by: hrCommentProfile ? {
          first_name: hrCommentProfile.first_name,
          last_name: hrCommentProfile.last_name,
          role: hrCommentProfile.role
        } : undefined
      };
    });
  } catch (error) {
    console.error('❌ Error fetching applications:', error);
    throw error;
  }
}

export async function getSignedUrl(filePath: string): Promise<string> {
  try {
    if (!filePath) {
      throw new Error('No file path provided');
    }

    console.log('🔗 Generating signed URL for:', filePath);
    
    const { data, error } = await supabase.storage
      .from('applications')
      .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

    if (error) {
      console.error('❌ Error generating signed URL:', error);
      throw error;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('❌ Error generating signed URL:', error);
    throw error;
  }
}

export async function getJobDetails(jobId: string): Promise<JobPosting | null> {
  try {
    console.log('🔍 Fetching job details for:', jobId);
    
    const { data, error } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('❌ Error fetching job details:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching job details:', error);
    throw error;
  }
}

/* ---------- Anti-Spam Functions ---------- */
export interface CheckCooldownResult {
  canApply: boolean
  nextAvailableTime: Date | null
  message: string
}

// Helper function for formatting time remaining
function formatTimeRemaining(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0) return 'now';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

export async function checkRecentApplication(jobId: string): Promise<CheckCooldownResult> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const MAX_APPLICATIONS_PER_DAY = 3;

    // Get all user's applications
    const applications = await listMyApplications();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check daily limit
    const todaysApplications = applications.filter(app => {
      const appDate = new Date(app.submitted_at);
      return appDate >= today;
    });

    if (todaysApplications.length >= MAX_APPLICATIONS_PER_DAY) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return {
        canApply: false,
        nextAvailableTime: tomorrow,
        message: `You have reached the daily limit of ${MAX_APPLICATIONS_PER_DAY} applications. You can apply again tomorrow.`
      };
    }

    // Check for recent application to same job
    const recentSameJob = applications.find(app => 
      app.job_id === jobId && 
      (Date.now() - new Date(app.submitted_at).getTime()) < COOLDOWN_PERIOD
    );

    if (recentSameJob) {
      const nextAvailable = new Date(new Date(recentSameJob.submitted_at).getTime() + COOLDOWN_PERIOD);
      
      return {
        canApply: false,
        nextAvailableTime: nextAvailable,
        message: `You've already applied to this position recently. You can apply again after ${formatTimeRemaining(nextAvailable)}.`
      };
    }

    return {
      canApply: true,
      nextAvailableTime: null,
      message: ''
    };

  } catch (error) {
    console.error('❌ Error checking recent applications:', error);
    throw error;
  }
}

export async function updateApplication(
  applicationId: string, 
  data: { file: File; applicant_comment: string }  // Updated field name
): Promise<string> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    console.log('🔄 Updating application:', applicationId);

    // Check if application exists and belongs to user
    const { data: existingApp, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('applicant_id', user.id)
      .single();

    if (fetchError) {
      console.error('❌ Application fetch error:', fetchError);
      throw new Error('Application not found or you do not have permission to edit it');
    }

    // Check if application can be edited (only "for_review" applications can be edited)
    if (existingApp.status !== 'for_review') {
      throw new Error(`Cannot edit application that has been ${existingApp.status}.`);
    }

    let filePath = existingApp.pdf_path;

    // Validate and upload new file if provided
    if (data.file) {
      if (data.file.type !== 'application/pdf') {
        throw new Error('Only PDF files are allowed.');
      }

      if (data.file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB.');
      }

      // Upload new PDF file
      const fileExt = data.file.name.split('.').pop();
      const fileName = `${user.id}-${existingApp.job_id}-${Date.now()}-updated.${fileExt}`;
      filePath = `applications/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('applications')
        .upload(filePath, data.file);

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      // Delete old file if exists
      if (existingApp.pdf_path) {
        try {
          await supabase.storage
            .from('applications')
            .remove([existingApp.pdf_path]);
        } catch (storageError) {
          console.warn('⚠️ Failed to delete old file:', storageError);
          // Continue with upload even if delete fails
        }
      }
    }

    // Update application record
    const { data: updatedApp, error: updateError } = await supabase
      .from('applications')
      .update({
        pdf_path: filePath,
        applicant_comment: data.applicant_comment || null,  // Use new field name
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update error:', updateError);
      throw updateError;
    }
    
    console.log('✅ Application updated:', updatedApp.id);
    return updatedApp.id;

  } catch (error) {
    console.error('❌ Error updating application:', error);
    throw error;
  }
}

/* ---------- HR Comment Functions ---------- */
export async function addHRComment(applicationId: string, comment: string) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Check if user is HR or Superadmin
    if (user.role !== 'hr' && user.role !== 'super_admin') {
      throw new Error('Unauthorized: Only HR or Superadmin can add comments');
    }

    console.log('💬 Adding HR comment to application:', applicationId);

    const { data, error } = await supabase
      .from('applications')
      .update({
        hr_comment: comment,
        hr_comment_by: user.id,
        hr_comment_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select(`
        *,
        hr_comment_profiles:hr_comment_by (
          first_name,
          last_name,
          role
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error adding HR comment:', error);
      throw new Error('Failed to add comment');
    }

    console.log('✅ HR comment added successfully');

    // Create notification for applicant
    await createNotification({
      user_id: data.applicant_id,
      type: 'hr_comment',
      title: 'HR Comment Added',
      message: `HR has added a comment to your application for ${data.job_postings?.job_title || 'a position'}`,
      related_entity_type: 'application',
      related_entity_id: applicationId,
      created_by: user.id
    });

    return data;
  } catch (error) {
    console.error('❌ Error adding HR comment:', error);
    throw error;
  }
}

export async function getApplicationWithComments(applicationId: string): Promise<Application> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    console.log('🔍 Fetching application with comments:', applicationId);

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job_postings (
          job_title,
          status
        ),
        hr_comment_profiles:hr_comment_by (
          first_name,
          last_name,
          role
        )
      `)
      .eq('id', applicationId)
      .eq('applicant_id', user.id) // Ensure user owns this application
      .single();

    if (error) {
      console.error('❌ Error fetching application:', error);
      throw new Error('Failed to load application details');
    }

    console.log('✅ Application loaded with comments');
    return data;
  } catch (error) {
    console.error('❌ Error fetching application with comments:', error);
    throw error;
  }
}

export async function deleteApplication(applicationId: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    console.log('🗑️ Deleting application:', applicationId);

    // Check if application exists and belongs to user
    const { data: existingApp, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('applicant_id', user.id)
      .single();

    if (fetchError) {
      throw new Error('Application not found or you do not have permission to delete it');
    }

    // Check if application can be deleted (only "for_review" applications can be deleted)
    if (existingApp.status !== 'for_review') {
      throw new Error(`Cannot delete application that has been ${existingApp.status}.`);
    }

    // Delete file from storage
    if (existingApp.pdf_path) {
      try {
        await supabase.storage
          .from('applications')
          .remove([existingApp.pdf_path]);
      } catch (storageError) {
        console.warn('⚠️ Failed to delete file from storage:', storageError);
        // Continue with deletion even if file delete fails
      }
    }

    // Delete application record
    const { error: deleteError } = await supabase
      .from('applications')
      .delete()
      .eq('id', applicationId);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      throw deleteError;
    }

    console.log('✅ Application deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting application:', error);
    throw error;
  }
}

/* ---------- Profile Data Functions ---------- */
export async function getWorkExperiences() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('work_experiences')
      .select('*')
      .eq('profile_id', user.id)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching work experiences:', error);
    throw error;
  }
}

export async function getEducations() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('educations')
      .select('*')
      .eq('profile_id', user.id)
      .order('year_graduated', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching educations:', error);
    throw error;
  }
}

export async function getTrainings() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('trainings')
      .select('*')
      .eq('profile_id', user.id)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching trainings:', error);
    throw error;
  }
}

export async function getSkills() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching skills:', error);
    throw error;
  }
}

export async function getEligibilities() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('eligibilities')
      .select('*')
      .eq('profile_id', user.id)
      .order('date_issued', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching eligibilities:', error);
    throw error;
  }
}

/* ---------- Notification Functions ---------- */
interface NotificationInput {
  user_id: string
  type: 'application_update' | 'hr_comment' | 'status_change' | 'general' | 'new_application'
  title: string
  message: string
  related_entity_type?: 'application' | 'job_posting' | 'profile'
  related_entity_id?: string
  created_by?: string
}

async function createNotification(notification: NotificationInput) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        ...notification,
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('❌ Error creating notification:', error);
    } else {
      console.log('✅ Notification created');
    }
  } catch (error) {
    console.error('❌ Error creating notification:', error);
  }
}

/* ---------- Admin/HR Functions ---------- */
export async function getAllUsers(): Promise<User[]> {
  try {
    const user = await getCurrentUser();
    
    // Only allow super_admin and HR roles to access all users
    if (!user || !['hr', 'super_admin'].includes(user.role)) {
      throw new Error('Unauthorized: Insufficient permissions');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }
}

export async function updateUserRole(userId: string, newRole: User['role']): Promise<void> {
  try {
    const currentUser = await getCurrentUser();
    
    // Only allow super_admin to change roles
    if (!currentUser || currentUser.role !== 'super_admin') {
      throw new Error('Unauthorized: Only super administrators can change user roles');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    throw error;
  }
}

// Dashboard statistics functions
export interface DashboardStats {
  totalUsers?: number
  totalApplicants?: number
  activeJobs?: number
  totalApplications?: number
  pendingReviews?: number
}

export async function getDashboardStats(role: User['role']): Promise<DashboardStats> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    let stats: DashboardStats = {};

    switch (role) {
      case 'super_admin':
        const [usersCount, jobsCount, applicationsCount] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('job_postings').select('*', { count: 'exact', head: true }),
          supabase.from('applications').select('*', { count: 'exact', head: true })
        ]);

        stats = {
          totalUsers: usersCount.count || 0,
          activeJobs: jobsCount.count || 0,
          totalApplications: applicationsCount.count || 0,
          pendingReviews: applicationsCount.count || 0
        };
        break;

      case 'hr':
        const [applicantsCount, hrJobsCount, hrApplicationsCount] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'applicant'),
          supabase.from('job_postings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('applications').select('*', { count: 'exact', head: true })
        ]);

        stats = {
          totalApplicants: applicantsCount.count || 0,
          totalUsers: applicantsCount.count || 0,
          activeJobs: hrJobsCount.count || 0,
          totalApplications: hrApplicationsCount.count || 0,
          pendingReviews: hrApplicationsCount.count || 0
        };
        break;

      case 'applicant':
        const myApplications = await listMyApplications();
        const activeJobs = await listActiveJobs();

        stats = {
          totalApplications: myApplications.length,
          activeJobs: activeJobs.length
        };
        break;
    }

    return stats;
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    throw error;
  }
}

/* ---------- Utility Functions ---------- */
export async function initializeDatabase() {
  console.log('🔧 Initializing database...');
  
  try {
    // Check database health
    const health = await checkDatabaseHealth();
    
    if (!health.healthy) {
      console.warn('⚠️ Database health check failed:', health.error);
    }
    
    // Ensure current user has profile
    const user = await getCurrentUser();
    
    if (user) {
      console.log('✅ Database initialized for user:', user.email);
    } else {
      console.log('ℹ️ No user logged in, database ready');
    }
    
    return { success: true, user: user?.email };
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return { success: false, error: String(error) };
  }
}

// Initialize on import (optional)
// Comment this out if you don't want automatic initialization
// initializeDatabase().catch(console.error);