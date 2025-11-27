import { createClient } from '@supabase/supabase-js'
import { User } from '@supabase/supabase-js'

// Define types based on your database schema
interface Profile {
  id: string
  email: string
  phone?: string
  role: 'applicant' | 'hr' | 'super_admin'
  created_at: string
  user_data?: any
}

interface JobPosting {
  id: string
  created_by: string
  job_title: string
  department?: string
  location?: string
  job_description?: string
  image_path?: string
  date_posted: string
  status: 'active' | 'closed'
}

interface Application {
  id: string
  job_id: string
  applicant_id: string
  pdf_path: string
  comment?: string
  submitted_at: string
  status: 'for_review' | 'shortlisted' | 'hired' | 'rejected'
  updated_at?: string
}

export class SupabaseHR {
  public supabase

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      
      if (error) {
        console.error('Error getting current user:', error)
        return {
          user: null,
          error: new Error(error.message)
        }
      }

      return {
        user,
        error: null
      }
    } catch (error: any) {
      console.error('Unexpected error in getCurrentUser:', error)
      return {
        user: null,
        error: error instanceof Error ? error : new Error('Failed to get current user')
      }
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string) {
    try {
      if (!userId) {
        return {
          profile: null,
          error: new Error('User ID is required')
        }
      }

      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error getting user profile:', error)
        return {
          profile: null,
          error: new Error(error.message)
        }
      }

      return {
        profile,
        error: null
      }
    } catch (error: any) {
      console.error('Unexpected error in getUserProfile:', error)
      return {
        profile: null,
        error: error instanceof Error ? error : new Error('Failed to get user profile')
      }
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      // Get total applications
      const { count: totalApplicants, error: applicantsError } = await this.supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      // Get active candidates (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { count: activeCandidates, error: activeError } = await this.supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .gte('submitted_at', thirtyDaysAgo.toISOString())

      // Get open positions
      const { count: openPositions, error: jobsError } = await this.supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Get pending reviews
      const { count: pendingReviews, error: reviewsError } = await this.supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'for_review')

      if (applicantsError || activeError || jobsError || reviewsError) {
        console.error('Error fetching dashboard stats:', { applicantsError, activeError, jobsError, reviewsError })
        throw new Error('Failed to fetch dashboard statistics')
      }

      return {
        totalApplicants: totalApplicants || 0,
        activeCandidates: activeCandidates || 0,
        openPositions: openPositions || 0,
        pendingReviews: pendingReviews || 0
      }
    } catch (error: any) {
      console.error('Error in getDashboardStats:', error)
      return {
        totalApplicants: 0,
        activeCandidates: 0,
        openPositions: 0,
        pendingReviews: 0
      }
    }
  }

  /**
   * Get recent activity for dashboard - SIMPLIFIED VERSION
   */
  async getRecentActivity() {
    try {
      // Get recent applications with basic info
      const { data: applications, error } = await this.supabase
        .from('applications')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching applications:', error)
        return []
      }

      if (!applications || applications.length === 0) return []

      // Get job titles for these applications
      const jobIds = applications.map(app => app.job_id).filter(Boolean)
      let jobs: any[] = []
      
      if (jobIds.length > 0) {
        const { data: jobsData, error: jobsError } = await this.supabase
          .from('job_postings')
          .select('id, job_title')
          .in('id', jobIds)

        if (!jobsError && jobsData) {
          jobs = jobsData
        }
      }

      // Get applicant info
      const applicantIds = applications.map(app => app.applicant_id).filter(Boolean)
      let profiles: any[] = []
      
      if (applicantIds.length > 0) {
        const { data: profilesData, error: profilesError } = await this.supabase
          .from('profiles')
          .select('id, email, user_data')
          .in('id', applicantIds)

        if (!profilesError && profilesData) {
          profiles = profilesData
        }
      }

      // Combine the data
      return applications.map(app => {
        const job = jobs.find(j => j.id === app.job_id)
        const profile = profiles.find(p => p.id === app.applicant_id)
        
        const applicantName = profile?.user_data?.name || 
                             profile?.email?.split('@')[0] || 
                             'Applicant'
        
        return {
          id: app.id,
          applicant_name: applicantName,
          job_title: job?.job_title || 'Unknown Position',
          action: 'Applied for position',
          timestamp: new Date(app.submitted_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          status: app.status
        }
      })
    } catch (error) {
      console.error('Error in getRecentActivity:', error)
      return []
    }
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(applicationId: string, status: string) {
    try {
      if (!applicationId || !status) {
        return {
          error: new Error('applicationId and status are required')
        }
      }

      const validStatuses = ['for_review', 'shortlisted', 'hired', 'rejected']
      if (!validStatuses.includes(status)) {
        return {
          error: new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
        }
      }

      const { error } = await this.supabase
        .from('applications')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (error) {
        console.error('Error updating application status:', error)
        return {
          error: new Error(error.message)
        }
      }

      return {
        error: null
      }
    } catch (error: any) {
      console.error('Unexpected error in updateApplicationStatus:', error)
      return {
        error: error instanceof Error ? error : new Error('Failed to update application status')
      }
    }
  }

  /**
   * Get all job postings
   */
  async getJobPostings() {
    try {
      const { data: jobPostings, error } = await this.supabase
        .from('job_postings')
        .select(`
          *,
          created_by:profiles!job_postings_created_by_fkey(
            id,
            email,
            role
          )
        `)
        .order('date_posted', { ascending: false })

      if (error) {
        return {
          jobPostings: [],
          error: new Error(error.message)
        }
      }

      return {
        jobPostings: jobPostings || [],
        error: null
      }
    } catch (error: any) {
      return {
        jobPostings: [],
        error: error instanceof Error ? error : new Error('Failed to fetch job postings')
      }
    }
  }

  /**
   * Verify HR access for a user
   */
  async verifyHRAccess(userId: string) {
    try {
      const { profile, error } = await this.getUserProfile(userId)
      
      if (error) {
        throw error
      }

      const hasHRAccess = profile && (profile.role === 'hr' || profile.role === 'super_admin')
      
      return {
        hasAccess: hasHRAccess,
        role: profile?.role,
        error: hasHRAccess ? null : new Error('HR access required')
      }
    } catch (error) {
      return {
        hasAccess: false,
        role: null,
        error: error instanceof Error ? error : new Error('Failed to verify HR access')
      }
    }
  }
}

// Export a singleton instance
export const supabaseHR = new SupabaseHR()