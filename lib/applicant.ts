'use client'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

export interface JobPosting {
  id: string;
  job_title: string;
  department?: string;
  location?: string;
  job_description?: string;
  status: 'active' | 'closed';
  date_posted: string;
  created_by: string;
}

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  pdf_path: string;
  applicant_comment?: string;
  submitted_at: string;
  status: 'for_review' | 'shortlisted' | 'for_interview' | 'hired' | 'rejected';
  updated_at?: string;
  hr_comment?: string;
  hr_comment_by?: string;
  hr_comment_at?: string;
  interview_date?: string;
  interview_status?: 'scheduled' | 'completed' | 'cancelled';
  interview_notes?: string;
  job_title?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'applicant' | 'hr' | 'super_admin';
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

// Validate PDF file
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'No file selected' }
  }

  // Check file type
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'Only PDF files are allowed' }
  }

  // Check file size (max 20MB)
  const maxSize = 20 * 1024 * 1024 // 20MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 20MB limit' }
  }

  // Check if file is empty
  if (file.size === 0) {
    return { valid: false, error: 'File appears to be empty' }
  }

  return { valid: true }
}

// Get current user
export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.error('Auth error:', error)
      return null
    }

    // Get profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return null
    }

    return profile as UserProfile
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

// List active jobs
export const listActiveJobs = async (): Promise<JobPosting[]> => {
  try {
    const { data, error } = await supabase
      .from('job_postings')
      .select('*')
      .eq('status', 'active')
      .order('date_posted', { ascending: false })

    if (error) {
      console.error('List jobs error:', error)
      throw error
    }

    return data as JobPosting[]
  } catch (error) {
    console.error('List jobs error:', error)
    return []
  }
}

// Check if already applied for a job
export const checkAlreadyApplied = async (jobId: string): Promise<{ applied: boolean; message: string }> => {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { applied: false, message: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('applicant_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Check application error:', error)
      return { applied: false, message: 'Error checking application' }
    }

    if (data) {
      return { applied: true, message: 'You have already applied for this position' }
    }

    return { applied: false, message: '' }
  } catch (error) {
    console.error('Check application error:', error)
    return { applied: false, message: 'Error checking application' }
  }
}

// Submit application (using client-side Supabase)
export const submitApplication = async ({ 
  job_id, 
  file, 
  applicant_comment = '',
  onProgress 
}: { 
  job_id: string; 
  file: File; 
  applicant_comment?: string;
  onProgress?: (progress: number) => void;
}): Promise<string> => {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Please sign in to submit an application')
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Check if already applied
    const alreadyApplied = await checkAlreadyApplied(job_id)
    if (alreadyApplied.applied) {
      throw new Error(alreadyApplied.message)
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('job_title')
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      throw new Error('Job not found')
    }

    // Upload file to Supabase Storage with progress tracking
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `applications/${fileName}`

    console.log('Uploading file to:', filePath)

    // Simulate progress for mobile if needed
    if (onProgress) {
      onProgress(10) // Starting
      setTimeout(() => onProgress(30), 500)
      setTimeout(() => onProgress(60), 1000)
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('applications')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf'
      })

    if (onProgress) onProgress(90)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Create application record
    const { data: application, error: insertError } = await supabase
      .from('applications')
      .insert({
        job_id,
        applicant_id: user.id,
        pdf_path: uploadData.path,
        applicant_comment,
        status: 'for_review',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('applications').remove([uploadData.path])
      console.error('Insert error:', insertError)
      throw new Error(`Failed to save application: ${insertError.message}`)
    }

    if (onProgress) onProgress(100)

    // Log the action
    await supabase.from('task_logs').insert({
      user_id: user.id,
      user_email: user.email,
      action: 'submit_application',
      entity_type: 'application',
      entity_id: application.id,
      entity_name: job.job_title,
      details: { job_id, file_name: file.name }
    })

    return application.id

  } catch (error: any) {
    console.error('Submit application error:', error)
    throw error
  }
}

// Enhanced mobile upload via API route
export const submitApplicationViaAPI = async ({ 
  job_id, 
  file, 
  applicant_comment = '',
  onProgress 
}: { 
  job_id: string; 
  file: File; 
  applicant_comment?: string;
  onProgress?: (progress: number) => void;
}): Promise<string> => {
  try {
    // Get auth session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      throw new Error('Please sign in to submit an application')
    }

    // Validate file before upload
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const formData = new FormData()
    formData.append('job_id', job_id)
    formData.append('file', file)
    formData.append('applicant_comment', applicant_comment)
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100)
          console.log('Mobile upload progress:', progress)
          onProgress(progress)
        }
      })
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            if (response.success) {
              resolve(response.id)
            } else {
              reject(new Error(response.error || 'Upload failed'))
            }
          } catch (error) {
            reject(new Error('Invalid response from server'))
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText)
            reject(new Error(errorResponse.error || `Upload failed: ${xhr.status}`))
          } catch {
            reject(new Error(`Upload failed with status: ${xhr.status}`))
          }
        }
      }
      
      xhr.onerror = () => {
        reject(new Error('Network error. Please check your connection.'))
      }
      
      xhr.ontimeout = () => {
        reject(new Error('Upload timeout. Please try again.'))
      }
      
      xhr.open('POST', '/api/upload-application')
      xhr.setRequestHeader('Accept', 'application/json')
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
      xhr.timeout = 120000 // 2 minute timeout for large files
      xhr.send(formData)
    })
    
  } catch (error: any) {
    console.error('API upload error:', error)
    throw error
  }
}

// List user's applications
export const listMyApplications = async (): Promise<Application[]> => {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Please sign in to view applications')
    }

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job_postings(job_title)
      `)
      .eq('applicant_id', user.id)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('List applications error:', error)
      throw error
    }

    // Transform data to include job_title
    const applications = data.map((app: any) => ({
      ...app,
      job_title: app.job_postings?.job_title || 'Unknown Position'
    }))

    return applications as Application[]
  } catch (error) {
    console.error('List applications error:', error)
    return []
  }
}

// Update application (for editing)
export const updateApplication = async (
  applicationId: string, 
  { file, applicant_comment }: { file: File; applicant_comment?: string }
): Promise<void> => {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Please sign in to update application')
    }

    // Get current application
    const { data: currentApp, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('applicant_id', user.id)
      .single()

    if (fetchError || !currentApp) {
      throw new Error('Application not found or unauthorized')
    }

    // Check if application can be edited
    if (currentApp.status !== 'for_review') {
      throw new Error(`Cannot edit application with status: ${currentApp.status}`)
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Upload new file
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `applications/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('applications')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf'
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Delete old file from storage
    await supabase.storage.from('applications').remove([currentApp.pdf_path])

    // Update application record
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        pdf_path: uploadData.path,
        applicant_comment: applicant_comment || currentApp.applicant_comment,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)

    if (updateError) {
      // Clean up new file if update fails
      await supabase.storage.from('applications').remove([uploadData.path])
      console.error('Update error:', updateError)
      throw new Error(`Failed to update application: ${updateError.message}`)
    }

    // Log the action
    await supabase.from('task_logs').insert({
      user_id: user.id,
      user_email: user.email,
      action: 'update_application',
      entity_type: 'application',
      entity_id: applicationId,
      details: { old_file: currentApp.pdf_path, new_file: uploadData.path }
    })

  } catch (error: any) {
    console.error('Update application error:', error)
    throw error
  }
}

// Get signed URL for PDF preview
export const getSignedUrl = async (path: string): Promise<string> => {
  try {
    const { data, error } = await supabase.storage
      .from('applications')
      .createSignedUrl(path, 3600) // 1 hour expiry

    if (error) {
      console.error('Get signed URL error:', error)
      throw error
    }

    return data.signedUrl
  } catch (error) {
    console.error('Get signed URL error:', error)
    throw error
  }
}

// Sign out
export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Sign out error:', error)
    throw error
  }
}