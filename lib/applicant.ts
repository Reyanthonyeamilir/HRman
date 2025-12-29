import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(url, anon)

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

/* ---------- Auth Functions ---------- */
export async function signUp({ email, password, phone, first_name, last_name }: {
  email: string; 
  password: string; 
  phone?: string;
  first_name?: string;
  last_name?: string;
}) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email, 
      password, 
      options: { 
        data: { 
          phone: phone || '',
          first_name: first_name || '',
          last_name: last_name || ''
        } 
      }
    })
    
    if (error) throw error

    // If user is created successfully, create their profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: email,
          phone: phone || null,
          first_name: first_name || null,
          last_name: last_name || null,
          role: 'applicant' // Default role for new signups
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Don't throw here - the user is created in auth, just profile failed
      }
    }

    return { 
      user: data.user,
      requiresEmailConfirmation: !data.session 
    }
  } catch (error) {
    console.error('Sign up error:', error)
    throw error
  }
}

export async function signIn({ email, password }: { email: string; password: string }) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.user
  } catch (error) {
    console.error('Sign in error:', error)
    throw error
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('Session error:', sessionError)
      return null
    }

    // Fetch user profile from database with proper error handling
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      
      // If profile doesn't exist, create one with default role
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([
          {
            id: session.user.id,
            email: session.user.email,
            role: 'applicant', // Default role
            first_name: session.user.user_metadata?.first_name || null,
            last_name: session.user.user_metadata?.last_name || null,
            phone: session.user.user_metadata?.phone || null
          }
        ])
        .select()
        .single()

      if (createError) {
        console.error('Profile creation error:', createError)
        return null
      }

      return {
        id: newProfile.id,
        email: newProfile.email,
        role: newProfile.role,
        first_name: newProfile.first_name,
        last_name: newProfile.last_name,
        phone: newProfile.phone,
        created_at: newProfile.created_at,
        updated_at: newProfile.updated_at
      }
    }

    // Return the user with profile data
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
    }

  } catch (error) {
    console.error('Error getting current user:', error)
    return null
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
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) throw error
  } catch (error) {
    console.error('Error updating profile:', error)
    throw error
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
  comment?: string
  submitted_at: string
  status: 'for_review' | 'shortlisted' | 'hired' | 'rejected'
  updated_at?: string
  job_postings?: {
    job_title: string
    status: string
  }
}

export async function listActiveJobs(): Promise<JobPosting[]> {
  try {
    const { data, error } = await supabase
      .from('job_postings')
      .select('*')
      .eq('status', 'active')
      .order('date_posted', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching active jobs:', error)
    throw error
  }
}

export async function submitApplication({ job_id, file, comment }: {
  job_id: string;
  file: File;
  comment: string;
}) {
  try {
    // Get current user with better error handling
    const user = await getCurrentUser()
    
    if (!user) {
      throw new Error('Not authenticated. Please sign in to submit an application.')
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are allowed.')
    }

    // Validate file size (10MB limit as per your page)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size must be less than 10MB.')
    }

    // Check for spam protection
    const cooldownCheck = await checkRecentApplication(job_id)
    if (!cooldownCheck.canApply) {
      throw new Error(cooldownCheck.message)
    }

    // Upload PDF file
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${job_id}-${Date.now()}.${fileExt}`
    const filePath = `applications/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('applications')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`File upload failed: ${uploadError.message}`)
    }

    // Create application record
    const { data, error } = await supabase
      .from('applications')
      .insert({
        job_id,
        applicant_id: user.id,
        pdf_path: filePath,
        comment: comment || null,
        status: 'for_review' // Default status from your schema
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('applications').remove([filePath])
      throw error
    }
    
    return data.id
  } catch (error) {
    console.error('Error submitting application:', error)
    throw error
  }
}

export interface MyApplication {
  id: string
  job_id: string
  job_title: string
  job_status: string
  pdf_path: string
  comment: string
  submitted_at: string
  status: 'for_review' | 'shortlisted' | 'hired' | 'rejected'
  updated_at?: string
}

export async function listMyApplications(): Promise<MyApplication[]> {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      throw new Error('Not authenticated. Please sign in to view your applications.')
    }

    console.log('Fetching applications for user:', user.id)

    // First, let's check if the tables exist and are accessible
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        pdf_path,
        comment,
        submitted_at,
        status,
        updated_at,
        job_postings (
          job_title,
          status
        )
      `)
      .eq('applicant_id', user.id)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

    console.log('Raw applications data:', data)

    // Transform the data to match our interface
    return (data || []).map((app: any) => {
      // Handle cases where job_postings might be null or an array
      const jobPosting = Array.isArray(app.job_postings) ? app.job_postings[0] : app.job_postings
      
      return {
        id: app.id,
        job_id: app.job_id,
        job_title: jobPosting?.job_title || 'Unknown Job',
        job_status: jobPosting?.status || 'unknown',
        pdf_path: app.pdf_path,
        comment: app.comment || '',
        submitted_at: app.submitted_at,
        status: app.status || 'for_review',
        updated_at: app.updated_at
      }
    })
  } catch (error) {
    console.error('Error fetching applications:', error)
    throw error
  }
}

export async function getSignedUrl(filePath: string): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('applications')
      .createSignedUrl(filePath, 60 * 60) // 1 hour expiry

    if (error) throw error
    return data.signedUrl
  } catch (error) {
    console.error('Error generating signed URL:', error)
    throw error
  }
}

export async function getJobDetails(jobId: string): Promise<JobPosting | null> {
  try {
    const { data, error } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching job details:', error)
    throw error
  }
}

/* ---------- New Functions for Anti-Spam and Editing ---------- */

export interface CheckCooldownResult {
  canApply: boolean
  nextAvailableTime: Date | null
  message: string
}

// Helper function for formatting time remaining
function formatTimeRemaining(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  
  if (diff <= 0) return 'now'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`
  }
  return `${minutes} minute${minutes > 1 ? 's' : ''}`
}

export async function checkRecentApplication(jobId: string): Promise<CheckCooldownResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    const MAX_APPLICATIONS_PER_DAY = 3

    // Get all user's applications
    const applications = await listMyApplications()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Check daily limit
    const todaysApplications = applications.filter(app => {
      const appDate = new Date(app.submitted_at)
      return appDate >= today
    })

    if (todaysApplications.length >= MAX_APPLICATIONS_PER_DAY) {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      return {
        canApply: false,
        nextAvailableTime: tomorrow,
        message: `You have reached the daily limit of ${MAX_APPLICATIONS_PER_DAY} applications. You can apply again tomorrow.`
      }
    }

    // Check for recent application to same job
    const recentSameJob = applications.find(app => 
      app.job_id === jobId && 
      (Date.now() - new Date(app.submitted_at).getTime()) < COOLDOWN_PERIOD
    )

    if (recentSameJob) {
      const nextAvailable = new Date(new Date(recentSameJob.submitted_at).getTime() + COOLDOWN_PERIOD)
      
      return {
        canApply: false,
        nextAvailableTime: nextAvailable,
        message: `You've already applied to this position recently. You can apply again after ${formatTimeRemaining(nextAvailable)}.`
      }
    }

    return {
      canApply: true,
      nextAvailableTime: null,
      message: ''
    }

  } catch (error) {
    console.error('Error checking recent applications:', error)
    throw error
  }
}

export async function updateApplication(
  applicationId: string, 
  data: { file: File; comment: string }
): Promise<string> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Check if application exists and belongs to user
    const { data: existingApp, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('applicant_id', user.id)
      .single()

    if (fetchError) {
      throw new Error('Application not found or you do not have permission to edit it')
    }

    // Check if application can be edited (only "for_review" applications can be edited)
    if (existingApp.status !== 'for_review') {
      throw new Error(`Cannot edit application that has been ${existingApp.status}.`)
    }

    let filePath = existingApp.pdf_path

    // Validate and upload new file if provided
    if (data.file) {
      if (data.file.type !== 'application/pdf') {
        throw new Error('Only PDF files are allowed.')
      }

      if (data.file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB.')
      }

      // Delete old file if exists
      if (existingApp.pdf_path) {
        try {
          await supabase.storage
            .from('applications')
            .remove([existingApp.pdf_path])
        } catch (storageError) {
          console.warn('Failed to delete old file:', storageError)
          // Continue with upload even if delete fails
        }
      }

      // Upload new PDF file
      const fileExt = data.file.name.split('.').pop()
      const fileName = `${user.id}-${existingApp.job_id}-${Date.now()}-updated.${fileExt}`
      filePath = `applications/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('applications')
        .upload(filePath, data.file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`File upload failed: ${uploadError.message}`)
      }
    }

    // Update application record
    const { data: updatedApp, error: updateError } = await supabase
      .from('applications')
      .update({
        pdf_path: filePath,
        comment: data.comment || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single()

    if (updateError) throw updateError
    
    return updatedApp.id

  } catch (error) {
    console.error('Error updating application:', error)
    throw error
  }
}

export async function deleteApplication(applicationId: string): Promise<void> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Check if application exists and belongs to user
    const { data: existingApp, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('applicant_id', user.id)
      .single()

    if (fetchError) {
      throw new Error('Application not found or you do not have permission to delete it')
    }

    // Check if application can be deleted (only "for_review" applications can be deleted)
    if (existingApp.status !== 'for_review') {
      throw new Error(`Cannot delete application that has been ${existingApp.status}.`)
    }

    // Delete file from storage
    if (existingApp.pdf_path) {
      try {
        await supabase.storage
          .from('applications')
          .remove([existingApp.pdf_path])
      } catch (storageError) {
        console.warn('Failed to delete file from storage:', storageError)
        // Continue with deletion even if file delete fails
      }
    }

    // Delete application record
    const { error: deleteError } = await supabase
      .from('applications')
      .delete()
      .eq('id', applicationId)

    if (deleteError) throw deleteError

  } catch (error) {
    console.error('Error deleting application:', error)
    throw error
  }
}

// Admin/HR functions for user management
export async function getAllUsers(): Promise<User[]> {
  try {
    const user = await getCurrentUser()
    
    // Only allow super_admin and HR roles to access all users
    if (!user || !['hr', 'super_admin'].includes(user.role)) {
      throw new Error('Unauthorized: Insufficient permissions')
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

export async function updateUserRole(userId: string, newRole: User['role']): Promise<void> {
  try {
    const currentUser = await getCurrentUser()
    
    // Only allow super_admin to change roles
    if (!currentUser || currentUser.role !== 'super_admin') {
      throw new Error('Unauthorized: Only super administrators can change user roles')
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) throw error
  } catch (error) {
    console.error('Error updating user role:', error)
    throw error
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
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    let stats: DashboardStats = {}

    switch (role) {
      case 'super_admin':
        // Super admin can see everything
        const [usersCount, jobsCount, applicationsCount] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('job_postings').select('*', { count: 'exact', head: true }),
          supabase.from('applications').select('*', { count: 'exact', head: true })
        ])

        stats = {
          totalUsers: usersCount.count || 0,
          activeJobs: jobsCount.count || 0,
          totalApplications: applicationsCount.count || 0,
          pendingReviews: applicationsCount.count || 0
        }
        break

      case 'hr':
        // HR can see applicants and applications
        const [applicantsCount, hrJobsCount, hrApplicationsCount] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'applicant'),
          supabase.from('job_postings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('applications').select('*', { count: 'exact', head: true })
        ])

        stats = {
          totalApplicants: applicantsCount.count || 0,
          totalUsers: applicantsCount.count || 0,
          activeJobs: hrJobsCount.count || 0,
          totalApplications: hrApplicationsCount.count || 0,
          pendingReviews: hrApplicationsCount.count || 0
        }
        break

      case 'applicant':
        // Applicants can see their own applications
        const myApplications = await listMyApplications()
        const activeJobs = await listActiveJobs()

        stats = {
          totalApplications: myApplications.length,
          activeJobs: activeJobs.length
        }
        break
    }

    return stats
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    throw error
  }
}

/* ---------- Profile Functions ---------- */

// Additional profile functions based on your schema
export async function getWorkExperiences() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('work_experiences')
      .select('*')
      .eq('profile_id', user.id)
      .order('start_date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching work experiences:', error)
    throw error
  }
}

export async function getEducations() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('educations')
      .select('*')
      .eq('profile_id', user.id)
      .order('year_graduated', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching educations:', error)
    throw error
  }
}

export async function getTrainings() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('trainings')
      .select('*')
      .eq('profile_id', user.id)
      .order('start_date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching trainings:', error)
    throw error
  }
}

export async function getSkills() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching skills:', error)
    throw error
  }
}

export async function getEligibilities() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('eligibilities')
      .select('*')
      .eq('profile_id', user.id)
      .order('date_issued', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching eligibilities:', error)
    throw error
  }
}