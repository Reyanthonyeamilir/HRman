import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(url, anon)

// User interface matching our database schema
export interface User {
  id: string
  email: string
  role: 'applicant' | 'hr' | 'super_admin' // Updated to match database
  name?: string
  created_at?: string
}

/* ---------- Auth Functions ---------- */
export async function signUp({ email, password, phone, name }: {
  email: string; 
  password: string; 
  phone?: string;
  name?: string;
}) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email, 
      password, 
      options: { 
        data: { 
          phone: phone || '',
          name: name || ''
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
          name: name || null,
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
            name: session.user.user_metadata?.name || null,
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
        name: newProfile.name,
        created_at: newProfile.created_at
      }
    }

    // Return the user with profile data
    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      name: profile.name,
      created_at: profile.created_at
    }

  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function updateUserProfile(updates: { name?: string; phone?: string }) {
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

    console.log('User authenticated:', user.id)

    // Validate file type
    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are allowed.')
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB.')
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
        comment: comment || null
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
}

export async function listMyApplications(): Promise<MyApplication[]> {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      throw new Error('Not authenticated. Please sign in to view your applications.')
    }

    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        pdf_path,
        comment,
        submitted_at,
        job_postings!inner(
          job_title,
          status
        )
      `)
      .eq('applicant_id', user.id)
      .order('submitted_at', { ascending: false })

    if (error) throw error

    // Transform the data to match our interface
    return (data || []).map((app: any) => ({
      id: app.id,
      job_id: app.job_id,
      job_title: app.job_postings?.job_title || 'Unknown Job',
      job_status: app.job_postings?.status || 'unknown',
      pdf_path: app.pdf_path,
      comment: app.comment || '',
      submitted_at: app.submitted_at
    }))
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

// Admin/HR functions for user management
export async function getAllUsers(): Promise<User[]> {
  try {
    const user = await getCurrentUser()
    
    // Only allow super_admin and HR roles to access all users (removed 'admin')
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
    
    // Only allow super_admin to change roles (removed 'admin')
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
          pendingReviews: applicationsCount.count || 0 // Simplified for demo
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
          totalUsers: applicantsCount.count || 0, // For HR dashboard compatibility
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