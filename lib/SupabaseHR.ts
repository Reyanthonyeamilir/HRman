import { createClient } from '@supabase/supabase-js'

export class SupabaseHR {
  private supabase

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
      console.log('Getting current user...')
      const { data: { user }, error } = await this.supabase.auth.getUser()
      
      if (error) {
        console.error('Error getting current user:', error)
        return {
          user: null,
          error: new Error(error.message)
        }
      }

      console.log('Current user:', user?.id)
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
      console.log('Getting user profile for:', userId)
      
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

      console.log('User profile found:', profile?.id)
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
   * Get all applications with applicant and job posting details
   */
  async getApplicationsWithDetails() {
    try {
      console.log('Fetching applications with details...')
      
      const { data: applications, error } = await this.supabase
        .from('applications')
        .select(`
          *,
          applicant:profiles!applications_applicant_id_fkey(
            id,
            email,
            phone,
            role,
            created_at,
            user_data
          ),
          job_posting:job_postings!applications_job_id_fkey(
            id,
            job_title,
            department,
            location,
            status,
            job_description
          )
        `)
        .order('submitted_at', { ascending: false })

      if (error) {
        console.error('Error fetching applications:', error)
        return {
          applications: [],
          error: new Error(error.message)
        }
      }

      console.log(`Found ${applications?.length || 0} applications`)
      return {
        applications: applications || [],
        error: null
      }
    } catch (error: any) {
      console.error('Unexpected error in getApplicationsWithDetails:', error)
      return {
        applications: [],
        error: error instanceof Error ? error : new Error('Failed to fetch applications')
      }
    }
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(applicationId: string, status: string) {
    try {
      console.log(`Updating application ${applicationId} to status: ${status}`)
      
      if (!applicationId || !status) {
        return {
          error: new Error('applicationId and status are required')
        }
      }

      // Validate status
      const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected']
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

      console.log('Application status updated successfully')
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
   * Get applications by status
   */
  async getApplicationsByStatus(status: string) {
    try {
      const { data: applications, error } = await this.supabase
        .from('applications')
        .select(`
          *,
          applicant:profiles!applications_applicant_id_fkey(
            id,
            email,
            phone,
            role,
            created_at,
            user_data
          ),
          job_posting:job_postings!applications_job_id_fkey(
            id,
            job_title,
            department,
            location,
            status
          )
        `)
        .eq('status', status)
        .order('submitted_at', { ascending: false })

      if (error) {
        return {
          applications: [],
          error: new Error(error.message)
        }
      }

      return {
        applications: applications || [],
        error: null
      }
    } catch (error: any) {
      return {
        applications: [],
        error: error instanceof Error ? error : new Error(`Failed to fetch ${status} applications`)
      }
    }
  }

  /**
   * Get application by ID with full details
   */
  async getApplicationById(applicationId: string) {
    try {
      const { data: application, error } = await this.supabase
        .from('applications')
        .select(`
          *,
          applicant:profiles!applications_applicant_id_fkey(
            id,
            email,
            phone,
            role,
            created_at,
            user_data
          ),
          job_posting:job_postings!applications_job_id_fkey(
            id,
            job_title,
            department,
            location,
            status,
            job_description
          )
        `)
        .eq('id', applicationId)
        .single()

      if (error) {
        return {
          application: null,
          error: new Error(error.message)
        }
      }

      return {
        application,
        error: null
      }
    } catch (error: any) {
      return {
        application: null,
        error: error instanceof Error ? error : new Error('Failed to fetch application')
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
   * Get job posting by ID
   */
  async getJobPostingById(jobId: string) {
    try {
      const { data: jobPosting, error } = await this.supabase
        .from('job_postings')
        .select(`
          *,
          created_by:profiles!job_postings_created_by_fkey(
            id,
            email,
            role
          )
        `)
        .eq('id', jobId)
        .single()

      if (error) {
        return {
          jobPosting: null,
          error: new Error(error.message)
        }
      }

      return {
        jobPosting,
        error: null
      }
    } catch (error: any) {
      return {
        jobPosting: null,
        error: error instanceof Error ? error : new Error('Failed to fetch job posting')
      }
    }
  }

  /**
   * Get applications for a specific job posting
   */
  async getApplicationsByJobId(jobId: string) {
    try {
      const { data: applications, error } = await this.supabase
        .from('applications')
        .select(`
          *,
          applicant:profiles!applications_applicant_id_fkey(
            id,
            email,
            phone,
            role,
            created_at,
            user_data
          )
        `)
        .eq('job_id', jobId)
        .order('submitted_at', { ascending: false })

      if (error) {
        return {
          applications: [],
          error: new Error(error.message)
        }
      }

      return {
        applications: applications || [],
        error: null
      }
    } catch (error: any) {
      return {
        applications: [],
        error: error instanceof Error ? error : new Error('Failed to fetch applications for job')
      }
    }
  }

  /**
   * Add comment to application
   */
  async addApplicationComment(applicationId: string, comment: string) {
    try {
      const { error } = await this.supabase
        .from('applications')
        .update({ 
          comment,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (error) {
        return {
          error: new Error(error.message)
        }
      }

      return {
        error: null
      }
    } catch (error: any) {
      return {
        error: error instanceof Error ? error : new Error('Failed to add comment')
      }
    }
  }

  /**
   * Get application statistics
   */
  async getApplicationStats() {
    try {
      // Get total applications
      const { count: total, error: totalError } = await this.supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      // Get applications by status
      const { data: statusCounts, error: statusError } = await this.supabase
        .from('applications')
        .select('status')

      if (totalError || statusError) {
        throw new Error('Failed to fetch application statistics')
      }

      // Count applications by status
      const statusStats = statusCounts?.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      return {
        stats: {
          total: total || 0,
          byStatus: statusStats
        },
        error: null
      }
    } catch (error: any) {
      return {
        stats: {
          total: 0,
          byStatus: {}
        },
        error: error instanceof Error ? error : new Error('Failed to fetch application statistics')
      }
    }
  }

  /**
   * Download file from storage (for PDFs)
   */
  async downloadFile(bucket: string, path: string) {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .download(path)

      return {
        data,
        error: error ? new Error(error.message) : null
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to download file')
      }
    }
  }

  /**
   * Get signed URL for file download
   */
  async getSignedUrl(bucket: string, path: string, expiresIn: number = 60) {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

      return {
        url: data?.signedUrl || null,
        error: error ? new Error(error.message) : null
      }
    } catch (error) {
      return {
        url: null,
        error: error instanceof Error ? error : new Error('Failed to generate signed URL')
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