// app/administrator/applications/page.tsx
'use client'

import { useState, useEffect } from 'react'
import AdminHRSidebar, { MobileTopbar } from '@/components/adminhrsidebar'
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface Applicant {
  id: string
  email: string
  phone?: string
  role: string
  created_at: string
  first_name?: string
  middle_name?: string
  last_name?: string
  avatar_url?: string
  date_of_birth?: string
  age?: number
  address?: string
}

interface JobPosting {
  id: string
  job_title: string
  department: string
  location: string
  status: string
  date_posted: string
  created_by: string
  job_description?: string
  image_path?: string
}

interface Education {
  id: string
  profile_id: string
  course_qualification: string
  institution: string
  expected_finish?: string
  course_highlights?: string
  created_at?: string
  degree_level?: 'Elementary' | 'High School' | 'Vocational' | 'Associate' | 'Bachelors' | 'Masters' | 'Doctorate' | 'Post-Doctorate'
  year_graduated?: number
  degree_name?: string
  gpa?: number
  honors_awards?: string
}

interface WorkExperience {
  id: string
  profile_id: string
  job_title: string
  company: string
  start_date: string
  end_date?: string
  currently_working: boolean
  description?: string
  created_at?: string
}

interface Skill {
  id: string
  profile_id: string
  skill_name: string
  proficiency?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  years_of_experience?: number
  verified?: boolean
  created_at?: string
}

interface Eligibility {
  id: string
  profile_id: string
  eligibility_name: string
  license_number?: string
  rating?: string
  date_issued?: string
  expiry_date?: string
  issuing_authority?: string
  document_path?: string
  created_at?: string
}

interface Training {
  id: string
  profile_id: string
  training_name: string
  institution: string
  start_date?: string
  end_date?: string
  duration_hours?: number
  certificate_id?: string
  certificate_path?: string
  skills_learned?: string
  created_at?: string
}

interface Application {
  id: string
  job_id: string
  applicant_id: string
  pdf_path: string
  applicant_comment?: string
  hr_comment?: string
  hr_comment_by?: string
  hr_comment_at?: string
  interview_date?: string
  interview_status?: 'scheduled' | 'completed' | 'cancelled'
  interview_notes?: string
  status: 'for_review' | 'shortlisted' | 'for_interview' | 'hired' | 'rejected'
  submitted_at: string
  updated_at?: string
  applicant: Applicant
  job_posting: JobPosting
}

interface JobWithApplications {
  job: JobPosting
  applications: Application[]
  applicantCount: number
}

interface ApplicantFile {
  name: string
  url: string
  type: string
  size?: string
}

export default function HRTagPage() {
  const [jobsWithApplications, setJobsWithApplications] = useState<JobWithApplications[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobWithApplications | null>(null)
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [applicantDetails, setApplicantDetails] = useState<{
    educations: Education[]
    workExperiences: WorkExperience[]
    skills: Skill[]
    eligibilities: Eligibility[]
    trainings: Training[]
    files: ApplicantFile[]
  }>({ 
    educations: [], 
    workExperiences: [], 
    skills: [],
    eligibilities: [],
    trainings: [],
    files: [] 
  })
  const [hrComment, setHrComment] = useState('')
  const [status, setStatus] = useState<Application['status']>('for_review')
  const [saving, setSaving] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [viewMode, setViewMode] = useState<'jobs' | 'applicants'>('jobs')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'application' | 'qualifications'>('profile')
  const [stats, setStats] = useState({
    totalApplications: 0,
    forReview: 0,
    shortlisted: 0,
    forInterview: 0,
    hired: 0,
    rejected: 0
  })
  const [exportingJobId, setExportingJobId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [interviewDate, setInterviewDate] = useState('')
  const [interviewTime, setInterviewTime] = useState('')
  const [interviewNotes, setInterviewNotes] = useState('')
  const [interviewLocation, setInterviewLocation] = useState('')
  const [interviewStatus, setInterviewStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled')
  const router = useRouter()

  useEffect(() => {
    fetchCurrentUser()
    fetchJobsWithApplications()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Auth error:', authError)
        return
      }
      
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          console.error('Profile error:', profileError)
          return
        }
        
        setCurrentUser(profile)
        console.log('Current user set:', { id: profile.id, email: profile.email, role: profile.role })
      }
    } catch (err) {
      console.error('Error fetching current user:', err)
    }
  }

  const fetchJobsWithApplications = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 Fetching jobs with applications...')

      // First, check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('User not authenticated:', authError)
        throw new Error('Please log in to view applications')
      }

      // Get current user profile to check role
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching user profile:', profileError)
        throw new Error('Unable to verify user permissions')
      }

      console.log('Current user role:', currentUserProfile?.role)

      // Try to fetch applications with complex query first
      console.log('Fetching applications with complex query...')
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          applicant:profiles!applications_applicant_id_fkey(
            id,
            email,
            phone,
            role,
            created_at,
            first_name,
            middle_name,
            last_name,
            avatar_url,
            date_of_birth,
            age,
            address
          ),
          job_posting:job_postings!applications_job_id_fkey(
            id,
            job_title,
            department,
            location,
            status,
            date_posted,
            created_by,
            job_description,
            image_path
          )
        `)
        .order('submitted_at', { ascending: false })

      if (appsError) {
        console.error('❌ Error fetching applications with complex query:', {
          message: appsError.message,
          details: appsError.details,
          hint: appsError.hint,
          code: appsError.code
        })
        
        // Try a simpler query if the complex one fails
        console.log('Trying simpler query...')
        const { data: simpleData, error: simpleError } = await supabase
          .from('applications')
          .select('*')
          .order('submitted_at', { ascending: false })

        if (simpleError) {
          throw new Error(`Failed to fetch applications: ${simpleError.message}`)
        }
        
        console.log(`✅ Fetched ${simpleData?.length || 0} applications with simple query`)
        
        // For simple data, we need to fetch applicant and job details separately
        const enrichedApplications = await Promise.all(
          (simpleData || []).map(async (app) => {
            const [applicantResult, jobResult] = await Promise.all([
              supabase
                .from('profiles')
                .select('id, email, phone, role, created_at, first_name, middle_name, last_name, avatar_url, date_of_birth, age, address')
                .eq('id', app.applicant_id)
                .single(),
              supabase
                .from('job_postings')
                .select('id, job_title, department, location, status, date_posted, created_by, job_description, image_path')
                .eq('id', app.job_id)
                .single()
            ])
            
            return {
              ...app,
              applicant: applicantResult.data || {
                id: app.applicant_id,
                email: 'Unknown Email',
                phone: '',
                role: 'applicant',
                created_at: new Date().toISOString()
              },
              job_posting: jobResult.data || {
                id: app.job_id,
                job_title: 'Unknown Position',
                department: 'N/A',
                location: 'N/A',
                status: 'unknown',
                date_posted: new Date().toISOString(),
                created_by: ''
              }
            }
          })
        )

        // Calculate statistics
        const totalApps = enrichedApplications.length || 0
        const forReview = enrichedApplications.filter(app => app.status === 'for_review').length || 0
        const shortlisted = enrichedApplications.filter(app => app.status === 'shortlisted').length || 0
        const forInterview = enrichedApplications.filter(app => app.status === 'for_interview').length || 0
        const hired = enrichedApplications.filter(app => app.status === 'hired').length || 0
        const rejected = enrichedApplications.filter(app => app.status === 'rejected').length || 0
        
        setStats({
          totalApplications: totalApps,
          forReview,
          shortlisted,
          forInterview,
          hired,
          rejected
        })

        // Group applications by job_id
        const applicationsByJob: Record<string, any[]> = {}
        
        enrichedApplications.forEach(app => {
          const jobId = app.job_id
          if (!applicationsByJob[jobId]) {
            applicationsByJob[jobId] = []
          }
          applicationsByJob[jobId].push(app)
        })

        // Fetch all jobs
        const { data: jobsData, error: jobsError } = await supabase
          .from('job_postings')
          .select('*')
          .order('date_posted', { ascending: false })

        if (jobsError) throw jobsError

        if (!jobsData || jobsData.length === 0) {
          console.log('No jobs found in database')
          setJobsWithApplications([])
          return
        }

        // Combine jobs with their applications
        const jobsWithApps = jobsData.map(job => ({
          job,
          applications: applicationsByJob[job.id] || [],
          applicantCount: applicationsByJob[job.id]?.length || 0
        }))

        setJobsWithApplications(jobsWithApps)
        return
      }

      console.log(`✅ Fetched ${applicationsData?.length || 0} applications`)

      // Calculate statistics
      const totalApps = applicationsData?.length || 0
      const forReview = applicationsData?.filter(app => app.status === 'for_review').length || 0
      const shortlisted = applicationsData?.filter(app => app.status === 'shortlisted').length || 0
      const forInterview = applicationsData?.filter(app => app.status === 'for_interview').length || 0
      const hired = applicationsData?.filter(app => app.status === 'hired').length || 0
      const rejected = applicationsData?.filter(app => app.status === 'rejected').length || 0
      
      setStats({
        totalApplications: totalApps,
        forReview,
        shortlisted,
        forInterview,
        hired,
        rejected
      })

      // Group applications by job_id
      const applicationsByJob: Record<string, Application[]> = {}
      
      applicationsData?.forEach(app => {
        const jobId = app.job_id
        if (!applicationsByJob[jobId]) {
          applicationsByJob[jobId] = []
        }
        
        applicationsByJob[jobId].push({
          id: app.id,
          job_id: app.job_id,
          applicant_id: app.applicant_id,
          pdf_path: app.pdf_path,
          applicant_comment: app.applicant_comment || undefined,
          hr_comment: app.hr_comment || undefined,
          hr_comment_by: app.hr_comment_by || undefined,
          hr_comment_at: app.hr_comment_at || undefined,
          interview_date: app.interview_date || undefined,
          interview_status: app.interview_status || undefined,
          interview_notes: app.interview_notes || undefined,
          status: app.status || 'for_review',
          submitted_at: app.submitted_at,
          updated_at: app.updated_at,
          applicant: app.applicant ? {
            id: app.applicant.id || app.applicant_id,
            email: app.applicant.email || 'Unknown Email',
            phone: app.applicant.phone || '',
            role: app.applicant.role || 'applicant',
            created_at: app.applicant.created_at || new Date().toISOString(),
            first_name: app.applicant.first_name,
            middle_name: app.applicant.middle_name,
            last_name: app.applicant.last_name,
            avatar_url: app.applicant.avatar_url,
            date_of_birth: app.applicant.date_of_birth,
            age: app.applicant.age,
            address: app.applicant.address
          } : {
            id: app.applicant_id,
            email: 'Unknown Email',
            phone: '',
            role: 'applicant',
            created_at: new Date().toISOString(),
            first_name: undefined,
            middle_name: undefined,
            last_name: undefined,
            avatar_url: undefined,
            date_of_birth: undefined,
            age: undefined,
            address: undefined
          },
          job_posting: app.job_posting || {
            id: app.job_id,
            job_title: 'Unknown Position',
            department: 'N/A',
            location: 'N/A',
            status: 'unknown',
            date_posted: new Date().toISOString(),
            created_by: ''
          }
        })
      })

      // Fetch all jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_postings')
        .select('*')
        .order('date_posted', { ascending: false })

      if (jobsError) throw jobsError

      if (!jobsData || jobsData.length === 0) {
        console.log('No jobs found in database')
        setJobsWithApplications([])
        return
      }

      // Combine jobs with their applications
      const jobsWithApps = jobsData.map(job => ({
        job,
        applications: applicationsByJob[job.id] || [],
        applicantCount: applicationsByJob[job.id]?.length || 0
      }))

      setJobsWithApplications(jobsWithApps)

    } catch (err) {
      console.error('❌ Error in fetchJobsWithApplications:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while fetching jobs')
      
      // Even if there's an error with applications, still try to fetch jobs
      try {
        const { data: jobsData, error: jobsError } = await supabase
          .from('job_postings')
          .select('*')
          .order('date_posted', { ascending: false })

        if (!jobsError && jobsData) {
          setJobsWithApplications(jobsData.map(job => ({
            job,
            applications: [],
            applicantCount: 0
          })))
        }
      } catch (jobsErr) {
        console.error('Error fetching jobs:', jobsErr)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchApplicantDetails = async (applicantId: string, pdfPath?: string) => {
    try {
      setLoadingDetails(true)
      
      // Fetch details sequentially to avoid lock issues
      const educationsResult = await supabase
        .from('educations')
        .select('*')
        .eq('profile_id', applicantId)
        .order('expected_finish', { ascending: false })
      
      const workExperiencesResult = await supabase
        .from('work_experiences')
        .select('*')
        .eq('profile_id', applicantId)
        .order('start_date', { ascending: false })
      
      const skillsResult = await supabase
        .from('skills')
        .select('*')
        .eq('profile_id', applicantId)
        .order('created_at', { ascending: false })
      
      const eligibilitiesResult = await supabase
        .from('eligibilities')
        .select('*')
        .eq('profile_id', applicantId)
        .order('created_at', { ascending: false })
      
      const trainingsResult = await supabase
        .from('trainings')
        .select('*')
        .eq('profile_id', applicantId)
        .order('created_at', { ascending: false })

      // Fetch additional files from storage
      let files: ApplicantFile[] = []
      
      if (pdfPath) {
        try {
          const { data: resumeData, error: resumeError } = await supabase.storage
            .from('applications')
            .createSignedUrl(pdfPath, 3600)
          
          if (!resumeError && resumeData) {
            files.push({
              name: 'Resume.pdf',
              url: resumeData.signedUrl,
              type: 'pdf',
              size: 'Document'
            })
          }
        } catch (fileErr) {
          console.error('Error fetching resume:', fileErr)
        }
      }

      setApplicantDetails({
        educations: educationsResult.data || [],
        workExperiences: workExperiencesResult.data || [],
        skills: skillsResult.data || [],
        eligibilities: eligibilitiesResult.data || [],
        trainings: trainingsResult.data || [],
        files: files
      })
    } catch (err) {
      console.error('Error fetching applicant details:', err)
      setError('Failed to load applicant details')
    } finally {
      setLoadingDetails(false)
    }
  }

  const fetchApplicantFullData = async (applicantId: string): Promise<{
    educations: Education[]
    workExperiences: WorkExperience[]
    skills: Skill[]
    eligibilities: Eligibility[]
    trainings: Training[]
  }> => {
    try {
      const educationsResult = await supabase
        .from('educations')
        .select('*')
        .eq('profile_id', applicantId)
        .order('year_graduated', { ascending: false })
      
      const workExperiencesResult = await supabase
        .from('work_experiences')
        .select('*')
        .eq('profile_id', applicantId)
        .order('start_date', { ascending: false })
      
      const skillsResult = await supabase
        .from('skills')
        .select('*')
        .eq('profile_id', applicantId)
        .order('created_at', { ascending: false })
      
      const eligibilitiesResult = await supabase
        .from('eligibilities')
        .select('*')
        .eq('profile_id', applicantId)
        .order('created_at', { ascending: false })
      
      const trainingsResult = await supabase
        .from('trainings')
        .select('*')
        .eq('profile_id', applicantId)
        .order('created_at', { ascending: false })

      return {
        educations: educationsResult.data || [],
        workExperiences: workExperiencesResult.data || [],
        skills: skillsResult.data || [],
        eligibilities: eligibilitiesResult.data || [],
        trainings: trainingsResult.data || []
      }
    } catch (err) {
      console.error('Error fetching applicant full data:', err)
      return {
        educations: [],
        workExperiences: [],
        skills: [],
        eligibilities: [],
        trainings: []
      }
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return bytes + ' bytes'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const viewJobApplicants = (jobWithApps: JobWithApplications) => {
    setSelectedJob(jobWithApps)
    setViewMode('applicants')
  }

  const viewApplicantProfile = async (application: Application) => {
    setSelectedApplicant(application.applicant)
    setSelectedApplication(application)
    setActiveTab('profile')
    await fetchApplicantDetails(application.applicant_id, application.pdf_path)
  }

  const sendEmailNotification = async (application: Application, newStatus: Application['status'], hrComment?: string) => {
    try {
      const statusMessages = {
        for_review: 'Your application is under review',
        shortlisted: 'Congratulations! Your application has been shortlisted',
        for_interview: 'Congratulations! You have been invited for an interview',
        hired: 'Congratulations! You have been hired for the position',
        rejected: 'Update regarding your job application'
      }

      const emailData = {
        to: application.applicant.email,
        subject: `Application Update: ${application.job_posting.job_title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2f67ff;">NORSU HR Portal - Application Update</h2>
            <p>Dear ${application.applicant.first_name || 'Applicant'},</p>
            <p>We would like to inform you about the status of your application for the position of <strong>${application.job_posting.job_title}</strong>.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2f67ff; margin-top: 0;">Status: ${newStatus.replace('_', ' ').toUpperCase()}</h3>
              <p><strong>Message:</strong> ${statusMessages[newStatus]}</p>
              ${hrComment ? `<p><strong>Comment from HR:</strong> ${hrComment}</p>` : ''}
            </div>

            <p>You can track your application status by logging into your applicant portal.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 14px;">
                Best regards,<br>
                NORSU Human Resource Management<br>
                hr@norsu.edu.ph<br>
                (035) 123-4567
              </p>
            </div>
          </div>
        `
      }

      console.log('Sending email notification:', emailData)
      
      // Send email via API route
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Email API failed: ${response.status} - ${errorText}`)
      }

      return true
    } catch (error) {
      console.error('Error sending email notification:', error)
      throw error
    }
  }

  const sendInterviewEmail = async (
    application: Application, 
    date: string, 
    time: string, 
    location: string, 
    notes?: string
  ) => {
    try {
      const formattedDate = new Date(`${date}T${time}`).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      const formattedTime = new Date(`${date}T${time}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })

      const emailData = {
        to: application.applicant.email,
        subject: `Interview Invitation: ${application.job_posting.job_title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2f67ff;">NORSU HR Portal - Interview Invitation</h2>
            <p>Dear ${application.applicant.first_name || 'Applicant'},</p>
            <p>Congratulations! Your application for the position of <strong>${application.job_posting.job_title}</strong> has been shortlisted for an interview.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2f67ff;">
              <h3 style="color: #2f67ff; margin-top: 0;">Interview Details</h3>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Time:</strong> ${formattedTime}</p>
              ${location ? `<p><strong>Location:</strong> ${location}</p>` : '<p><strong>Location:</strong> To be confirmed</p>'}
              ${notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ''}
              <p><em>Please arrive 15 minutes before your scheduled interview time.</em></p>
            </div>

            <p>Please confirm your availability for this interview by replying to this email.</p>
            <p>If you need to reschedule, please contact us at least 24 hours before the scheduled time.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 14px;">
                Best regards,<br>
                NORSU Human Resource Management<br>
                hr@norsu.edu.ph<br>
                (035) 123-4567
              </p>
            </div>
          </div>
        `
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Email API failed: ${response.status} - ${errorText}`)
      }

      return true
    } catch (error) {
      console.error('Error sending interview email:', error)
      throw error
    }
  }

  const createNotification = async (application: Application, newStatus: Application['status'], hrComment?: string) => {
    try {
      const notificationData = {
        user_id: application.applicant_id,
        type: 'status_change',
        title: 'Application Status Updated',
        message: `Your application for ${application.job_posting.job_title} has been updated to ${newStatus.replace('_', ' ')}. ${hrComment ? `HR Comment: ${hrComment}` : ''}`,
        related_entity_type: 'application',
        related_entity_id: application.id,
        created_by: currentUser?.id
      }

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationData)

      if (notificationError) throw notificationError

      return true
    } catch (err) {
      console.error('Error creating notification:', err)
      throw err
    }
  }

  const logTask = async (action: string, entityType: string, entityId: string, entityName: string, details: any) => {
    try {
      if (!currentUser) return

      const taskLogData = {
        user_id: currentUser.id,
        user_email: currentUser.email,
        action: action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        details: details
      }

      const { error: logError } = await supabase
        .from('task_logs')
        .insert(taskLogData)

      if (logError) console.error('Error logging task:', logError)
    } catch (err) {
      console.error('Error creating task log:', err)
    }
  }

  const updateApplicationStatus = async (applicationId: string, newStatus: Application['status'], hrComment?: string) => {
    try {
      setSaving(true)
      
      const application = selectedApplication!
      
      // First, check if current user is HR or Super Admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Allow both HR and Super Admin to update status
      if (!currentUserProfile || (currentUserProfile.role !== 'hr' && currentUserProfile.role !== 'super_admin')) {
        throw new Error('Only HR and Super Admin can update application status')
      }
      
      // Prepare update data
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }
      
      // If status is 'for_interview', add interview details
      if (newStatus === 'for_interview' && interviewDate && interviewTime) {
        const interviewDateTime = new Date(`${interviewDate}T${interviewTime}`).toISOString()
        updateData.interview_date = interviewDateTime
        updateData.interview_status = interviewStatus
        updateData.interview_notes = interviewNotes || hrComment
      }
      
      if (hrComment) {
        updateData.hr_comment = hrComment
        updateData.hr_comment_by = user.id
        updateData.hr_comment_at = new Date().toISOString()
      }
      
      // Update application in database
      console.log('Updating application with data:', updateData)
      const { error: updateError } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', applicationId)

      if (updateError) {
        console.error('Update error details:', updateError)
        throw new Error(`Failed to update application: ${updateError.message}`)
      }

      console.log('✅ Application updated successfully')

      // Try to send email notification
      let emailSuccess = false
      try {
        if (newStatus === 'for_interview') {
          emailSuccess = await sendInterviewEmail(application, interviewDate, interviewTime, interviewLocation, interviewNotes || hrComment)
        } else {
          emailSuccess = await sendEmailNotification(application, newStatus, hrComment)
        }
        
        if (emailSuccess) {
          console.log('✅ Email notification sent successfully')
        }
      } catch (emailErr) {
        console.warn('⚠️ Email notification failed:', emailErr)
        // Continue even if email fails
      }
      
      // Try to create notification in database
      let notificationSuccess = false
      try {
        notificationSuccess = await createNotification(application, newStatus, hrComment)
        if (notificationSuccess) {
          console.log('✅ Notification created successfully')
        }
      } catch (notificationErr) {
        console.warn('⚠️ Notification creation failed:', notificationErr)
        // Continue even if notification fails
      }
      
      // Try to log the task
      try {
        await logTask(
          'update_application_status',
          'application',
          applicationId,
          `Application for ${application.job_posting.job_title}`,
          {
            old_status: application.status,
            new_status: newStatus,
            hr_comment: hrComment || null,
            applicant_email: application.applicant.email,
            job_title: application.job_posting.job_title,
            email_sent: emailSuccess,
            notification_created: notificationSuccess,
            interview_scheduled: newStatus === 'for_interview',
            interview_date: newStatus === 'for_interview' ? `${interviewDate}T${interviewTime}` : null
          }
        )
        console.log('✅ Task logged successfully')
      } catch (logErr) {
        console.warn('⚠️ Task logging failed:', logErr)
        // Continue even if logging fails
      }

      // Refresh data
      await fetchJobsWithApplications()
      
      if (selectedJob) {
        const updatedJob = jobsWithApplications.find(j => j.job.id === selectedJob.job.id)
        if (updatedJob) {
          setSelectedJob(updatedJob)
        }
      }
      
      // Reset form
      setSelectedApplication(null)
      setHrComment('')
      setStatus('for_review')
      setInterviewDate('')
      setInterviewTime('')
      setInterviewNotes('')
      setInterviewLocation('')
      setInterviewStatus('scheduled')

      // Show success message
      alert('Application status updated successfully!')
      
    } catch (err) {
      console.error('❌ Error updating application:', err)
      setError(`Failed to update application status: ${err instanceof Error ? err.message : 'Please try again.'}`)
    } finally {
      setSaving(false)
    }
  }

  const downloadResume = async (pdfPath: string) => {
    try {
      console.log('📥 Downloading resume:', pdfPath)
      const { data, error } = await supabase.storage
        .from('applications')
        .download(pdfPath)

      if (error) {
        console.error('Storage error:', error)
        throw error
      }

      // Create a blob URL for the file
      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = pdfPath.split('/').pop() || 'resume.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
    } catch (err) {
      console.error('Error downloading resume:', err)
      setError('Failed to download resume: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (e) {
      return dateString
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30'
      case 'closed': return 'bg-slate-500/20 text-slate-700 border-slate-500/30'
      default: return 'bg-blue-500/20 text-blue-700 border-blue-500/30'
    }
  }

  const getApplicationStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'for_review': return 'bg-blue-500/20 text-blue-700 border-blue-500/30'
      case 'shortlisted': return 'bg-amber-500/20 text-amber-700 border-amber-500/30'
      case 'for_interview': return 'bg-purple-500/20 text-purple-700 border-purple-500/30'
      case 'hired': return 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30'
      case 'rejected': return 'bg-red-500/20 text-red-700 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-700 border-gray-500/30'
    }
  }

  const getDepartmentColor = (department: string) => {
    const departmentColors: { [key: string]: string } = {
      'engineering': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
      'design': 'bg-purple-500/20 text-purple-700 border-purple-500/30',
      'marketing': 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
      'sales': 'bg-orange-500/20 text-orange-700 border-orange-500/30',
      'hr': 'bg-pink-500/20 text-pink-700 border-pink-500/30',
      'finance': 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30',
      'it': 'bg-cyan-500/20 text-cyan-700 border-cyan-500/30',
      'administration': 'bg-violet-500/20 text-violet-700 border-violet-500/30'
    }
    return departmentColors[department?.toLowerCase()] || 'bg-slate-500/20 text-slate-700 border-slate-500/30'
  }

  const getApplicantFullName = (applicant: Applicant): string => {
    const parts = [
      applicant.first_name,
      applicant.middle_name,
      applicant.last_name
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'No Name Provided'
  }

  const getProficiencyColor = (proficiency?: string) => {
    switch (proficiency?.toLowerCase()) {
      case 'beginner': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'intermediate': return 'bg-green-100 text-green-800 border-green-200'
      case 'advanced': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'expert': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredJobs = jobsWithApplications.filter(jobWithApps => {
    const matchesSearch = searchQuery === '' || 
      jobWithApps.job.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jobWithApps.job.department?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = selectedStatus === 'all' || jobWithApps.job.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  const filteredApplications = selectedJob?.applications.filter(app => {
    const applicantName = getApplicantFullName(app.applicant).toLowerCase()
    const applicantEmail = app.applicant.email.toLowerCase()
    const searchLower = searchQuery.toLowerCase()
    
    return searchQuery === '' || 
      applicantName.includes(searchLower) ||
      applicantEmail.includes(searchLower) ||
      app.status.includes(searchLower)
  }) || []

  const backToJobs = () => {
    setSelectedJob(null)
    setViewMode('jobs')
    setSearchQuery('')
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return '📄'
      case 'doc':
      case 'docx':
        return '📝'
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️'
      default:
        return '📎'
    }
  }

  const exportJobApplicantsToCSV = async (jobWithApps: JobWithApplications) => {
    try {
      setExportingJobId(jobWithApps.job.id)
      console.log(`📊 Exporting applicants for job: ${jobWithApps.job.job_title}`)

      // Prepare data for CSV
      const csvData = [[
        'Applicant ID', 'Full Name', 'Email', 'Phone', 'Date of Birth', 'Age', 'Address',
        'Job Applied', 'Department', 'Location', 'Application Status', 'Date Applied', 
        'HR Comment', 'Interview Date', 'Interview Status', 'Interview Notes', 'Resume Path',
        // Education
        'Highest Education Level', 'Education Institution', 'Course/Qualification', 
        'Degree Name', 'Year Graduated', 'GPA', 'Honors/Awards', 'Expected Finish',
        // Work Experience
        'Current Job Title', 'Current Company', 'Work Start Date', 'Work End Date', 
        'Currently Working', 'Work Description',
        // Skills
        'Skills (comma separated)', 'Proficiency Levels', 'Years of Experience',
        // Eligibilities
        'Eligibilities/Certifications', 'License Numbers', 'Ratings', 
        'Date Issued', 'Expiry Date', 'Issuing Authority',
        // Trainings
        'Trainings/Seminars', 'Training Institutions', 'Training Duration (hours)',
        'Certificate IDs', 'Skills Learned'
      ]]
      
      // Process each applicant for this job
      for (const application of jobWithApps.applications) {
        // Fetch all detailed information for this applicant
        const applicantData = await fetchApplicantFullData(application.applicant_id)
        
        // Format education information
        const highestEducation = applicantData.educations.length > 0 ? applicantData.educations[0] : null
        const educationLevel = highestEducation?.degree_level || 'Not provided'
        const educationInstitution = highestEducation?.institution || 'Not provided'
        const courseQualification = highestEducation?.course_qualification || 'Not provided'
        const degreeName = highestEducation?.degree_name || 'Not provided'
        const yearGraduated = highestEducation?.year_graduated?.toString() || 'Not provided'
        const gpa = highestEducation?.gpa?.toString() || 'Not provided'
        const honorsAwards = highestEducation?.honors_awards || 'Not provided'
        const expectedFinish = highestEducation?.expected_finish ? formatDate(highestEducation.expected_finish) : 'Not provided'
        
        // Format work experience
        const currentWork = applicantData.workExperiences.find(exp => exp.currently_working) || 
                          (applicantData.workExperiences.length > 0 ? applicantData.workExperiences[0] : null)
        const currentJobTitle = currentWork?.job_title || 'Not provided'
        const currentCompany = currentWork?.company || 'Not provided'
        const workStartDate = currentWork?.start_date ? formatDate(currentWork.start_date) : 'Not provided'
        const workEndDate = currentWork?.end_date ? formatDate(currentWork.end_date) : 
                          (currentWork?.currently_working ? 'Present' : 'Not provided')
        const currentlyWorking = currentWork?.currently_working ? 'Yes' : 'No'
        const workDescription = currentWork?.description || 'Not provided'
        
        // Format skills
        const skills = applicantData.skills.map(skill => skill.skill_name).join(', ')
        const proficiencies = applicantData.skills.map(skill => skill.proficiency || 'Not specified').join(', ')
        const yearsOfExperience = applicantData.skills
          .filter(skill => skill.years_of_experience)
          .map(skill => `${skill.skill_name}: ${skill.years_of_experience} years`)
          .join('; ')
        
        // Format eligibilities
        const eligibilities = applicantData.eligibilities.map(el => el.eligibility_name).join(', ')
        const licenseNumbers = applicantData.eligibilities.map(el => el.license_number || 'N/A').join(', ')
        const ratings = applicantData.eligibilities.map(el => el.rating || 'N/A').join(', ')
        const datesIssued = applicantData.eligibilities.map(el => el.date_issued ? formatDate(el.date_issued) : 'N/A').join(', ')
        const expiryDates = applicantData.eligibilities.map(el => el.expiry_date ? formatDate(el.expiry_date) : 'N/A').join(', ')
        const issuingAuthorities = applicantData.eligibilities.map(el => el.issuing_authority || 'N/A').join(', ')
        
        // Format trainings
        const trainings = applicantData.trainings.map(t => t.training_name).join(', ')
        const trainingInstitutions = applicantData.trainings.map(t => t.institution).join(', ')
        const trainingDurations = applicantData.trainings.map(t => t.duration_hours?.toString() || 'N/A').join(', ')
        const certificateIds = applicantData.trainings.map(t => t.certificate_id || 'N/A').join(', ')
        const skillsLearned = applicantData.trainings.map(t => t.skills_learned || 'N/A').join('; ')
        
        // Create row for this applicant
        const row = [
          application.applicant_id.substring(0, 8),
          getApplicantFullName(application.applicant),
          application.applicant.email,
          application.applicant.phone || 'Not provided',
          application.applicant.date_of_birth ? formatDate(application.applicant.date_of_birth) : 'Not provided',
          application.applicant.age?.toString() || 'Not provided',
          application.applicant.address || 'Not provided',
          application.job_posting.job_title,
          application.job_posting.department,
          application.job_posting.location,
          application.status,
          formatDate(application.submitted_at),
          application.hr_comment || 'No comment',
          application.interview_date ? formatDateTime(application.interview_date) : 'Not scheduled',
          application.interview_status || 'Not scheduled',
          application.interview_notes || 'No notes',
          application.pdf_path,
          // Education
          educationLevel,
          educationInstitution,
          courseQualification,
          degreeName,
          yearGraduated,
          gpa,
          honorsAwards,
          expectedFinish,
          // Work Experience
          currentJobTitle,
          currentCompany,
          workStartDate,
          workEndDate,
          currentlyWorking,
          workDescription,
          // Skills
          skills || 'No skills listed',
          proficiencies || 'Not specified',
          yearsOfExperience || 'Not specified',
          // Eligibilities
          eligibilities || 'No eligibilities',
          licenseNumbers || 'N/A',
          ratings || 'N/A',
          datesIssued || 'N/A',
          expiryDates || 'N/A',
          issuingAuthorities || 'N/A',
          // Trainings
          trainings || 'No trainings',
          trainingInstitutions || 'N/A',
          trainingDurations || 'N/A',
          certificateIds || 'N/A',
          skillsLearned || 'N/A'
        ]
        
        csvData.push(row)
      }
      
      // Convert to CSV string
      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n')
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Create a safe filename
      const jobTitle = jobWithApps.job.job_title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const date = new Date().toISOString().split('T')[0]
      a.download = `applicants_${jobTitle}_${date}.csv`
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      console.log(`✅ Exported ${jobWithApps.applications.length} applicants for "${jobWithApps.job.job_title}"`)
      
    } catch (err) {
      console.error('Error exporting job applicants to CSV:', err)
      alert('Failed to export CSV file: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setExportingJobId(null)
    }
  }

  const exportAllToCSV = async () => {
    try {
      console.log('📊 Exporting all applications...')

      // Prepare data for CSV
      const csvData = [[
        'Applicant ID', 'Full Name', 'Email', 'Phone', 'Date of Birth', 'Age', 'Address',
        'Job Applied', 'Department', 'Location', 'Application Status', 'Date Applied', 
        'HR Comment', 'Interview Date', 'Interview Status', 'Interview Notes', 'Resume Path'
      ]]
      
      for (const jobWithApps of jobsWithApplications) {
        for (const application of jobWithApps.applications) {
          const row = [
            application.applicant.id.substring(0, 8),
            getApplicantFullName(application.applicant),
            application.applicant.email,
            application.applicant.phone || 'N/A',
            application.applicant.date_of_birth ? formatDate(application.applicant.date_of_birth) : 'N/A',
            application.applicant.age?.toString() || 'N/A',
            application.applicant.address || 'N/A',
            application.job_posting.job_title,
            application.job_posting.department,
            application.job_posting.location,
            application.status,
            formatDate(application.submitted_at),
            application.hr_comment || 'No comment',
            application.interview_date ? formatDateTime(application.interview_date) : 'Not scheduled',
            application.interview_status || 'Not scheduled',
            application.interview_notes || 'No notes',
            application.pdf_path
          ]
          csvData.push(row)
        }
      }
      
      // Convert to CSV string
      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n')
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `all_applications_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      console.log(`✅ Exported all applications`)
      
    } catch (err) {
      console.error('Error exporting to CSV:', err)
      alert('Failed to export CSV file')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHRSidebar 
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
        <div className="lg:pl-64">
          <MobileTopbar onMenu={() => setSidebarOpen(true)} />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-lg mt-4 text-gray-600">Loading applications...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHRSidebar 
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      
      <div className="lg:pl-64">
        <MobileTopbar onMenu={() => setSidebarOpen(true)} />
        
        <main className="p-4 md:p-6">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  {viewMode === 'jobs' ? 'Job Applications' : `Applicants for: ${selectedJob?.job.job_title}`}
                </h1>
                <p className="text-gray-600 mt-2">
                  {viewMode === 'jobs' 
                    ? 'View jobs and their applicants' 
                    : `Manage applications for ${selectedJob?.job.job_title}`
                  }
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {viewMode === 'applicants' && (
                  <>
                    <Button 
                      onClick={backToJobs}
                      variant="outline"
                      className="whitespace-nowrap"
                    >
                      ← Back to Jobs
                    </Button>
                    {selectedJob && selectedJob.applications.length > 0 && (
                      <Button 
                        onClick={() => exportJobApplicantsToCSV(selectedJob)}
                        variant="outline"
                        className="whitespace-nowrap bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        disabled={exportingJobId === selectedJob.job.id}
                      >
                        {exportingJobId === selectedJob.job.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export This Job's Applicants
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
                
                {viewMode === 'jobs' && (
                  <>
                    <Button 
                      onClick={exportAllToCSV}
                      variant="outline"
                      className="whitespace-nowrap bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export All Applications
                    </Button>
                    
                    <Button 
                      onClick={() => router.push('/administrator/view-applications')}
                      variant="outline"
                      className="whitespace-nowrap bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      View All Applicants
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Statistics */}
            {viewMode === 'jobs' && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalApplications}</div>
                  <div className="text-sm text-gray-600">Total Applications</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-2xl font-bold text-blue-600">{stats.forReview}</div>
                  <div className="text-sm text-gray-600">For Review</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-2xl font-bold text-amber-600">{stats.shortlisted}</div>
                  <div className="text-sm text-gray-600">Shortlisted</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-2xl font-bold text-purple-600">{stats.forInterview}</div>
                  <div className="text-sm text-gray-600">For Interview</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-2xl font-bold text-emerald-600">{stats.hired}</div>
                  <div className="text-sm text-gray-600">Hired</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                  <div className="text-sm text-gray-600">Rejected</div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800">{error}</p>
              </div>
              <Button 
                onClick={fetchJobsWithApplications}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder={viewMode === 'jobs' ? "Search jobs..." : "Search applicants..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-wrap gap-2">
                  {['all', 'active', 'closed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                        selectedStatus === status
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
                <Button 
                  onClick={fetchJobsWithApplications}
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          {viewMode === 'jobs' ? (
            /* Jobs List View */
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Jobs with Applications ({filteredJobs.length})
              </h2>
              
              {filteredJobs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <svg className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 text-lg mb-2">No jobs with applications found</p>
                  <p className="text-gray-400 text-sm">
                    {searchQuery ? 'No jobs match your search.' : 'When applicants submit applications, they will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                  {filteredJobs.map((jobWithApps) => (
                    <div 
                      key={jobWithApps.job.id} 
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 hover:-translate-y-1"
                    >
                      {/* Card Header */}
                      <div className="p-4 lg:p-6 border-b border-blue-200">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-lg line-clamp-1">
                              {jobWithApps.job.job_title}
                            </h3>
                            <p className="text-gray-600 text-sm mt-1">{jobWithApps.job.location}</p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(jobWithApps.job.status)}`}>
                            {jobWithApps.job.status.charAt(0).toUpperCase() + jobWithApps.job.status.slice(1)}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getDepartmentColor(jobWithApps.job.department || '')}`}>
                            {jobWithApps.job.department || 'No Department'}
                          </span>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            {jobWithApps.applicantCount} Applicant{jobWithApps.applicantCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 lg:p-6">
                        <div className="space-y-3">
                          <div className="flex items-center text-sm text-gray-700">
                            <svg className="h-4 w-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Posted on {formatDate(jobWithApps.job.date_posted)}
                          </div>
                          
                          <div className="pt-2">
                            <div className="text-sm text-gray-500 mb-1">Application Status Breakdown:</div>
                            <div className="flex flex-wrap gap-1">
                              {['for_review', 'shortlisted', 'for_interview', 'hired', 'rejected'].map((status) => {
                                const count = jobWithApps.applications.filter(app => app.status === status).length
                                if (count === 0) return null
                                return (
                                  <span 
                                    key={status} 
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getApplicationStatusColor(status as Application['status'])}`}
                                  >
                                    {count} {status.replace('_', ' ')}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="p-4 lg:p-6 border-t border-blue-200 bg-blue-100/50 rounded-b-xl">
                        <div className="flex flex-col gap-3">
                          <Button
                            onClick={() => viewJobApplicants(jobWithApps)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={jobWithApps.applicantCount === 0}
                          >
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {jobWithApps.applicantCount === 0 ? 'No Applicants' : `View ${jobWithApps.applicantCount} Applicant${jobWithApps.applicantCount !== 1 ? 's' : ''}`}
                          </Button>
                          
                          {jobWithApps.applicantCount > 0 && (
                            <Button
                              onClick={() => exportJobApplicantsToCSV(jobWithApps)}
                              variant="outline"
                              className="w-full border-green-200 text-green-700 hover:bg-green-50"
                              disabled={exportingJobId === jobWithApps.job.id}
                            >
                              {exportingJobId === jobWithApps.job.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                                  Exporting...
                                </>
                              ) : (
                                <>
                                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Export Applicants (CSV)
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Applicants List View for Selected Job */
            <div className="mb-6">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Applicants Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Applicants for {selectedJob?.job.job_title}
                      </h2>
                      <p className="text-gray-600 text-sm mt-1">
                        {selectedJob?.job.department} • {selectedJob?.job.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(selectedJob?.job.status || '')}`}>
                        {selectedJob?.job.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Applicants List */}
                {filteredApplications.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-gray-500 text-lg mb-2">No applicants found</p>
                    <p className="text-gray-400 text-sm">
                      {searchQuery ? 'No applicants match your search.' : 'No applicants have applied for this job yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredApplications.map((application) => (
                      <div key={application.id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          {/* Applicant Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              {application.applicant.avatar_url ? (
                                <img
                                  src={application.applicant.avatar_url}
                                  alt={getApplicantFullName(application.applicant)}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-100"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
                                  <span className="text-lg text-blue-600 font-bold">
                                    {getApplicantFullName(application.applicant).charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {getApplicantFullName(application.applicant)}
                                </h3>
                                <p className="text-gray-600 text-sm">{application.applicant.email}</p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {application.applicant.phone && (
                                <span className="inline-flex items-center text-sm text-gray-600">
                                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  {application.applicant.phone}
                                </span>
                              )}
                              <span className="inline-flex items-center text-sm text-gray-600">
                                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Applied: {formatDate(application.submitted_at)}
                              </span>
                              {application.interview_date && (
                                <span className="inline-flex items-center text-sm text-purple-600">
                                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Interview: {formatDateTime(application.interview_date)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status and Actions */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getApplicationStatusColor(application.status)}`}>
                              {application.status.replace('_', ' ').toUpperCase()}
                              {application.interview_status && application.status === 'for_interview' && (
                                <span className="ml-2 text-xs">({application.interview_status})</span>
                              )}
                            </span>
                            
                            <div className="flex gap-2">
                              <Button
                                onClick={() => viewApplicantProfile(application)}
                                variant="outline"
                                size="sm"
                                title="View Full Profile"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </Button>
                              
                              <Button
                                onClick={() => downloadResume(application.pdf_path)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                size="sm"
                                title="Download Resume"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </Button>
                              
                              <Button
                                onClick={() => {
                                  setSelectedApplication(application)
                                  setHrComment(application.hr_comment || '')
                                  setStatus(application.status)
                                  if (application.interview_date) {
                                    const date = new Date(application.interview_date)
                                    setInterviewDate(date.toISOString().split('T')[0])
                                    setInterviewTime(date.toTimeString().split(' ')[0].substring(0, 5))
                                  }
                                  setInterviewNotes(application.interview_notes || '')
                                  setInterviewStatus(application.interview_status || 'scheduled')
                                }}
                                variant="outline"
                                size="sm"
                                title="Update Status"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Interview Details */}
                        {application.interview_date && (
                          <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-purple-800">
                                  <svg className="h-4 w-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Interview Scheduled: {formatDateTime(application.interview_date)}
                                </p>
                                {application.interview_status && (
                                  <p className="text-xs text-purple-600 mt-1">
                                    Status: <span className="font-medium">{application.interview_status}</span>
                                  </p>
                                )}
                              </div>
                              {application.interview_notes && (
                                <button
                                  onClick={() => alert(`Interview Notes:\n\n${application.interview_notes}`)}
                                  className="text-xs text-purple-600 hover:text-purple-800"
                                >
                                  View Notes
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* HR Comment */}
                        {application.hr_comment && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">HR Comment:</span> {application.hr_comment}
                            </p>
                            {application.hr_comment_at && (
                              <p className="text-xs text-gray-500 mt-1">
                                Commented on: {formatDate(application.hr_comment_at)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Applicant Comment */}
                        {application.applicant_comment && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Applicant Note:</span> {application.applicant_comment}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Status Update Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Update Application Status</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as Application['status'])
                    if (e.target.value !== 'for_interview') {
                      setInterviewDate('')
                      setInterviewTime('')
                      setInterviewNotes('')
                      setInterviewLocation('')
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="for_review">For Review</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="for_interview">For Interview</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Interview scheduling section */}
              {status === 'for_interview' && (
                <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-800">Interview Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Interview Date *
                      </label>
                      <input
                        type="date"
                        value={interviewDate}
                        onChange={(e) => setInterviewDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Interview Time *
                      </label>
                      <input
                        type="time"
                        value={interviewTime}
                        onChange={(e) => setInterviewTime(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interview Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={interviewLocation}
                      onChange={(e) => setInterviewLocation(e.target.value)}
                      placeholder="e.g., HR Office, Building A"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interview Status
                    </label>
                    <select
                      value={interviewStatus}
                      onChange={(e) => setInterviewStatus(e.target.value as any)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HR Comment {status === 'for_interview' ? '(Will be included in interview invitation)' : ''}
                </label>
                <textarea
                  value={hrComment}
                  onChange={(e) => setHrComment(e.target.value)}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder={status === 'for_interview' 
                    ? "Add notes for the interview invitation..." 
                    : "Add a comment for the applicant..."
                  }
                />
                {status === 'for_interview' && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Interview Notes (Optional)
                    </label>
                    <textarea
                      value={interviewNotes}
                      onChange={(e) => setInterviewNotes(e.target.value)}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="Specific instructions, materials to bring, etc."
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  This comment will be sent via email and stored as a notification for the applicant.
                  {status === 'for_interview' && ' Interview details will be included in the invitation email.'}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => {
                    setSelectedApplication(null)
                    setInterviewDate('')
                    setInterviewTime('')
                    setInterviewNotes('')
                    setInterviewLocation('')
                  }}
                  variant="outline"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateApplicationStatus(selectedApplication.id, status, hrComment)}
                  disabled={saving || (status === 'for_interview' && (!interviewDate || !interviewTime))}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : status === 'for_interview' ? (
                    'Schedule Interview & Notify'
                  ) : (
                    'Update Status & Notify'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applicant Profile Modal */}
      {selectedApplicant && selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {getApplicantFullName(selectedApplicant)}
                  </h3>
                  <p className="text-gray-600">
                    Application for: <span className="font-semibold">{selectedApplication.job_posting.job_title}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedApplicant(null)
                    setApplicantDetails({ 
                      educations: [], 
                      workExperiences: [], 
                      skills: [],
                      eligibilities: [],
                      trainings: [],
                      files: [] 
                    })
                    setActiveTab('profile')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Tabs */}
              <div className="mt-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'profile'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile Information
                  </button>
                  <button
                    onClick={() => setActiveTab('qualifications')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'qualifications'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Qualifications
                  </button>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'documents'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documents & Files
                  </button>
                  <button
                    onClick={() => setActiveTab('application')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'application'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Application Details
                  </button>
                </nav>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {loadingDetails ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading applicant details...</p>
                </div>
              ) : (
                <>
                  {/* Profile Tab */}
                  {activeTab === 'profile' && (
                    <div className="space-y-8">
                      {/* Personal Information */}
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
                            <p className="text-gray-900">{selectedApplicant.email}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Phone</p>
                            <p className="text-gray-900">{selectedApplicant.phone || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Date of Birth</p>
                            <p className="text-gray-900">
                              {selectedApplicant.date_of_birth ? formatDate(selectedApplicant.date_of_birth) : 'Not provided'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Age</p>
                            <p className="text-gray-900">{selectedApplicant.age || 'Not provided'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm font-medium text-gray-500 mb-1">Address</p>
                            <p className="text-gray-900">{selectedApplicant.address || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Education Section */}
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Education</h4>
                        {applicantDetails.educations.length > 0 ? (
                          <div className="space-y-4">
                            {applicantDetails.educations.map((edu) => (
                              <div key={edu.id} className="border-l-4 border-blue-500 pl-4 py-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h5 className="font-medium text-gray-900">{edu.course_qualification}</h5>
                                    <p className="text-gray-600">{edu.institution}</p>
                                  </div>
                                  {edu.degree_level && (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                      {edu.degree_level}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                                  {edu.degree_name && (
                                    <div>
                                      <p className="font-medium text-gray-700">Degree</p>
                                      <p className="text-gray-600">{edu.degree_name}</p>
                                    </div>
                                  )}
                                  {edu.year_graduated && (
                                    <div>
                                      <p className="font-medium text-gray-700">Year Graduated</p>
                                      <p className="text-gray-600">{edu.year_graduated}</p>
                                    </div>
                                  )}
                                  {edu.gpa && (
                                    <div>
                                      <p className="font-medium text-gray-700">GPA</p>
                                      <p className="text-gray-600">{edu.gpa.toFixed(2)}</p>
                                    </div>
                                  )}
                                  {edu.expected_finish && (
                                    <div>
                                      <p className="font-medium text-gray-700">Expected Completion</p>
                                      <p className="text-gray-600">{formatDate(edu.expected_finish)}</p>
                                    </div>
                                  )}
                                </div>
                                
                                {edu.honors_awards && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium text-gray-700">Honors & Awards:</p>
                                    <p className="text-gray-600 text-sm">{edu.honors_awards}</p>
                                  </div>
                                )}
                                {edu.course_highlights && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium text-gray-700">Course Highlights:</p>
                                    <p className="text-gray-600 text-sm">{edu.course_highlights}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No education information provided</p>
                        )}
                      </div>

                      {/* Work Experience Section */}
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Work Experience</h4>
                        {applicantDetails.workExperiences.length > 0 ? (
                          <div className="space-y-4">
                            {applicantDetails.workExperiences.map((work) => (
                              <div key={work.id} className="border-l-4 border-green-500 pl-4 py-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h5 className="font-medium text-gray-900">{work.job_title}</h5>
                                    <p className="text-gray-600">{work.company}</p>
                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      {formatDate(work.start_date)} - {work.currently_working ? 'Present' : (work.end_date ? formatDate(work.end_date) : 'Not specified')}
                                    </div>
                                  </div>
                                  {work.currently_working && (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                      Current
                                    </span>
                                  )}
                                </div>
                                {work.description && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium text-gray-700">Description:</p>
                                    <p className="text-gray-600 text-sm">{work.description}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No work experience provided</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Qualifications Tab */}
                  {activeTab === 'qualifications' && (
                    <div className="space-y-8">
                      {/* Skills Section */}
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Skills</h4>
                        {applicantDetails.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-3">
                            {applicantDetails.skills.map((skill) => (
                              <div key={skill.id} className="bg-gray-50 rounded-lg p-4 min-w-[200px] border border-gray-200">
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="font-medium text-gray-900">{skill.skill_name}</h5>
                                  {skill.verified && (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                      Verified
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {skill.proficiency && (
                                    <div className="flex items-center">
                                      <span className="text-sm text-gray-600 mr-2">Proficiency:</span>
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getProficiencyColor(skill.proficiency)}`}>
                                        {skill.proficiency}
                                      </span>
                                    </div>
                                  )}
                                  {skill.years_of_experience && (
                                    <div className="flex items-center">
                                      <span className="text-sm text-gray-600 mr-2">Experience:</span>
                                      <span className="text-sm font-medium">{skill.years_of_experience} year(s)</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No skills information provided</p>
                        )}
                      </div>

                      {/* Eligibilities Section */}
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Eligibilities & Certifications</h4>
                        {applicantDetails.eligibilities.length > 0 ? (
                          <div className="space-y-4">
                            {applicantDetails.eligibilities.map((elig) => (
                              <div key={elig.id} className="border-l-4 border-purple-500 pl-4 py-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h5 className="font-medium text-gray-900">{elig.eligibility_name}</h5>
                                    {elig.issuing_authority && (
                                      <p className="text-gray-600 text-sm">{elig.issuing_authority}</p>
                                    )}
                                  </div>
                                  {elig.rating && (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                      Rating: {elig.rating}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                                  {elig.license_number && (
                                    <div>
                                      <p className="font-medium text-gray-700">License Number</p>
                                      <p className="text-gray-600">{elig.license_number}</p>
                                    </div>
                                  )}
                                  {elig.date_issued && (
                                    <div>
                                      <p className="font-medium text-gray-700">Date Issued</p>
                                      <p className="text-gray-600">{formatDate(elig.date_issued)}</p>
                                    </div>
                                  )}
                                  {elig.expiry_date && (
                                    <div>
                                      <p className="font-medium text-gray-700">Expiry Date</p>
                                      <p className="text-gray-600">{formatDate(elig.expiry_date)}</p>
                                    </div>
                                  )}
                                  {elig.document_path && (
                                    <div>
                                      <p className="font-medium text-gray-700">Document</p>
                                      <a 
                                        href="#" 
                                        onClick={(e) => {
                                          e.preventDefault();
                                          if (elig.document_path) {
                                            downloadResume(elig.document_path);
                                          }
                                        }}
                                        className="text-blue-600 hover:underline"
                                      >
                                        Download Certificate
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No eligibilities or certifications provided</p>
                        )}
                      </div>

                      {/* Trainings Section */}
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Trainings & Seminars</h4>
                        {applicantDetails.trainings.length > 0 ? (
                          <div className="space-y-4">
                            {applicantDetails.trainings.map((training) => (
                              <div key={training.id} className="border-l-4 border-amber-500 pl-4 py-2">
                                <h5 className="font-medium text-gray-900">{training.training_name}</h5>
                                <p className="text-gray-600">{training.institution}</p>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                                  {training.start_date && training.end_date && (
                                    <div>
                                      <p className="font-medium text-gray-700">Duration</p>
                                      <p className="text-gray-600">
                                        {formatDate(training.start_date)} - {formatDate(training.end_date)}
                                      </p>
                                    </div>
                                  )}
                                  {training.duration_hours && (
                                    <div>
                                      <p className="font-medium text-gray-700">Duration Hours</p>
                                      <p className="text-gray-600">{training.duration_hours} hours</p>
                                    </div>
                                  )}
                                  {training.certificate_id && (
                                    <div>
                                      <p className="font-medium text-gray-700">Certificate ID</p>
                                      <p className="text-gray-600">{training.certificate_id}</p>
                                    </div>
                                  )}
                                  {training.certificate_path && (
                                    <div>
                                      <p className="font-medium text-gray-700">Certificate</p>
                                      <a 
                                        href="#" 
                                        onClick={(e) => {
                                          e.preventDefault();
                                          if (training.certificate_path) {
                                            downloadResume(training.certificate_path);
                                          }
                                        }}
                                        className="text-blue-600 hover:underline"
                                      >
                                        Download Certificate
                                      </a>
                                    </div>
                                  )}
                                </div>
                                
                                {training.skills_learned && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium text-gray-700">Skills Learned:</p>
                                    <p className="text-gray-600 text-sm">{training.skills_learned}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No trainings or seminars provided</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Documents Tab */}
                  {activeTab === 'documents' && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-6">Documents & Files</h4>
                      {applicantDetails.files.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {applicantDetails.files.map((file, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all">
                              <div className="flex items-start">
                                <div className="text-2xl mr-3">{getFileIcon(file.type)}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{file.name}</p>
                                  <p className="text-sm text-gray-500">{file.type.toUpperCase()} • {file.size}</p>
                                </div>
                              </div>
                              <div className="mt-4">
                                <Button
                                  onClick={() => window.open(file.url, '_blank')}
                                  variant="outline"
                                  size="sm"
                                  className="w-full mr-2"
                                >
                                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View File
                                </Button>
                                <Button
                                  onClick={() => {
                                    const link = document.createElement('a')
                                    link.href = file.url
                                    link.download = file.name
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-2"
                                >
                                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <svg className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-gray-500 text-lg mb-2">No documents available</p>
                          <p className="text-gray-400">The applicant hasn't uploaded any additional documents.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Application Tab */}
                  {activeTab === 'application' && (
                    <div className="space-y-6">
                      {/* Application Status */}
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Application Status</h4>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getApplicationStatusColor(selectedApplication.status)}`}>
                              {selectedApplication.status.replace('_', ' ').toUpperCase()}
                              {selectedApplication.interview_status && selectedApplication.status === 'for_interview' && (
                                <span className="ml-2 text-xs">({selectedApplication.interview_status})</span>
                              )}
                            </span>
                            <p className="text-sm text-gray-600 mt-1">
                              Applied on {formatDate(selectedApplication.submitted_at)}
                            </p>
                            {selectedApplication.updated_at && (
                              <p className="text-sm text-gray-500 mt-1">
                                Last updated: {formatDate(selectedApplication.updated_at)}
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedApplication(selectedApplication)
                              setHrComment(selectedApplication.hr_comment || '')
                              setStatus(selectedApplication.status)
                              if (selectedApplication.interview_date) {
                                const date = new Date(selectedApplication.interview_date)
                                setInterviewDate(date.toISOString().split('T')[0])
                                setInterviewTime(date.toTimeString().split(' ')[0].substring(0, 5))
                              }
                              setInterviewNotes(selectedApplication.interview_notes || '')
                              setInterviewStatus(selectedApplication.interview_status || 'scheduled')
                            }}
                            variant="outline"
                          >
                            Update Status
                          </Button>
                        </div>
                      </div>

                      {/* Interview Details */}
                      {selectedApplication.interview_date && (
                        <div className="bg-purple-50 rounded-lg border border-purple-200 p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Interview Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-sm font-medium text-gray-500 mb-1">Interview Date & Time</p>
                              <p className="text-gray-900 font-medium">{formatDateTime(selectedApplication.interview_date)}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500 mb-1">Interview Status</p>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                selectedApplication.interview_status === 'scheduled' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                selectedApplication.interview_status === 'completed' ? 'bg-green-100 text-green-800 border border-green-200' :
                                'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                                {selectedApplication.interview_status?.toUpperCase() || 'SCHEDULED'}
                              </span>
                            </div>
                          </div>
                          {selectedApplication.interview_notes && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-gray-500 mb-1">Interview Notes</p>
                              <p className="text-gray-700">{selectedApplication.interview_notes}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Job Details */}
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Job Title</p>
                            <p className="text-gray-900 font-medium">{selectedApplication.job_posting.job_title}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Department</p>
                            <p className="text-gray-900">{selectedApplication.job_posting.department}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Location</p>
                            <p className="text-gray-900">{selectedApplication.job_posting.location}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Job Status</p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedApplication.job_posting.status)}`}>
                              {selectedApplication.job_posting.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        {selectedApplication.job_posting.job_description && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-500 mb-1">Job Description</p>
                            <p className="text-gray-700 text-sm">{selectedApplication.job_posting.job_description}</p>
                          </div>
                        )}
                      </div>

                      {/* HR Comments */}
                      {selectedApplication.hr_comment && (
                        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">HR Comments</h4>
                          <p className="text-gray-700">{selectedApplication.hr_comment}</p>
                          {selectedApplication.hr_comment_at && (
                            <p className="text-sm text-gray-500 mt-2">
                              Commented on: {formatDate(selectedApplication.hr_comment_at)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Applicant Comments */}
                      {selectedApplication.applicant_comment && (
                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">Applicant Note</h4>
                          <p className="text-gray-700">{selectedApplication.applicant_comment}</p>
                        </div>
                      )}

                      {/* Resume Section */}
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Submitted Resume</h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="bg-blue-100 p-3 rounded-lg mr-4">
                              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Resume.pdf</p>
                              <p className="text-sm text-gray-500">Submitted application document</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => downloadResume(selectedApplication.pdf_path)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Resume
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Applicant ID: <span className="font-mono">{selectedApplicant.id.substring(0, 8)}...</span>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setSelectedApplication(selectedApplication)
                      setHrComment(selectedApplication.hr_comment || '')
                      setStatus(selectedApplication.status)
                      if (selectedApplication.interview_date) {
                        const date = new Date(selectedApplication.interview_date)
                        setInterviewDate(date.toISOString().split('T')[0])
                        setInterviewTime(date.toTimeString().split(' ')[0].substring(0, 5))
                      }
                      setInterviewNotes(selectedApplication.interview_notes || '')
                      setInterviewStatus(selectedApplication.interview_status || 'scheduled')
                    }}
                    variant="outline"
                  >
                    Update Status
                  </Button>
                  <Button
                    onClick={() => downloadResume(selectedApplication.pdf_path)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Resume
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}