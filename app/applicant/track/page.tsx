'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabaseClient'

interface Application {
  id: string
  job_id: string
  applicant_id: string
  pdf_path: string
  comment?: string
  status: 'for_review' | 'shortlisted' | 'hired' | 'rejected'
  submitted_at: string
  job_postings?: {
    job_title: string
    department: string
    location: string
  }
}

export default function TrackPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please log in to view your applications')
        setLoading(false)
        return
      }

      console.log('🔍 Fetching applications for user:', user.id)

      // Fixed query with correct foreign key relationship
      const { data: applicationsData, error } = await supabase
        .from('applications')
        .select(`
          *,
          job_postings (
            job_title,
            department,
            location
          )
        `)
        .eq('applicant_id', user.id)
        .order('submitted_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching applications:', error)
        throw error
      }

      console.log('✅ Applications fetched:', applicationsData)

      // Filter out applications with missing job_posting data
      const validApplications = (applicationsData || []).filter(app => 
        app.job_postings !== null && app.job_postings !== undefined
      )

      // Log any applications with missing job_postings for debugging
      const invalidApplications = (applicationsData || []).filter(app => 
        app.job_postings === null || app.job_postings === undefined
      )

      if (invalidApplications.length > 0) {
        console.warn('⚠️ Applications with missing job_postings:', invalidApplications)
      }

      setApplications(validApplications)
      
    } catch (error) {
      console.error('❌ Error fetching applications:', error)
      setError('Failed to load applications. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'for_review': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'shortlisted': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'hired': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'for_review':
        return (
          <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'shortlisted':
        return (
          <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'hired':
        return (
          <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      case 'rejected':
        return (
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'for_review': return 'Your application is under review by our HR team'
      case 'shortlisted': return 'Congratulations! Your application has been shortlisted for further consideration'
      case 'hired': return 'Congratulations! You have been selected for this position'
      case 'rejected': return 'Thank you for your application. Unfortunately, you were not selected for this position'
      default: return 'Your application has been received'
    }
  }

  // Safe function to get job posting details
  const getJobDetails = (application: Application) => {
    if (!application.job_postings) {
      return {
        title: 'Position No Longer Available',
        department: 'N/A',
        location: 'N/A'
      }
    }

    return {
      title: application.job_postings.job_title || 'Unknown Position',
      department: application.job_postings.department || 'N/A',
      location: application.job_postings.location || 'N/A'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Track Application Status</h1>
          <p className="text-gray-600 mt-1">Monitor the progress of your job applications</p>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading your applications...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Track Application Status</h1>
          <p className="text-gray-600 mt-1">Monitor the progress of your job applications</p>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
              <svg className="h-8 w-8 text-red-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 font-medium mb-2">Error Loading Applications</p>
              <p className="text-red-700 text-sm mb-4">{error}</p>
              <button
                onClick={fetchApplications}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Track Application Status</h1>
        <p className="text-gray-600 mt-1">Monitor the progress of your job applications</p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <svg className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg mb-2">No applications found</p>
            <p className="text-gray-400 text-sm mb-6">
              When you submit job applications, they will appear here for tracking.
            </p>
            <button
              onClick={fetchApplications}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => {
            const jobDetails = getJobDetails(application)
            
            return (
              <Card key={application.id} className="border-blue-100 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-gray-900">
                        {jobDetails.title}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {jobDetails.department} • {jobDetails.location}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(application.status)}`}>
                      {getStatusIcon(application.status)}
                      {application.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-700 mb-2">
                        {getStatusMessage(application.status)}
                      </p>
                      
                      {application.comment && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <p className="text-sm font-medium text-blue-900 mb-1">Comment from HR:</p>
                          <p className="text-sm text-blue-800">{application.comment}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 border-l-2 border-blue-200 pl-4 text-sm">
                      <div>
                        <div className="font-semibold text-gray-900">Application Submitted</div>
                        <div className="text-slate-500">
                          {new Date(application.submitted_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-semibold text-gray-900">Current Status</div>
                        <div className="text-slate-500">{getStatusMessage(application.status)}</div>
                      </div>

                      {application.status === 'shortlisted' && (
                        <div>
                          <div className="font-semibold text-gray-900">Next Steps</div>
                          <div className="text-slate-500">You may be contacted for an interview</div>
                        </div>
                      )}

                      {application.status === 'hired' && (
                        <div>
                          <div className="font-semibold text-gray-900">Next Steps</div>
                          <div className="text-slate-500">HR will contact you with onboarding details</div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="text-xs text-slate-500 text-center pt-4 border-t border-gray-200">
        NORSU • Human Resource Management
      </div>

      {/* Debug info - remove in production */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-gray-700">Debug Information</summary>
          <div className="mt-2 space-y-2 text-xs">
            <p><strong>Total applications:</strong> {applications.length}</p>
            <p><strong>User ID:</strong> {typeof window !== 'undefined' ? localStorage.getItem('user_id') : 'N/A'}</p>
            <button 
              onClick={fetchApplications}
              className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700"
            >
              Refresh Data
            </button>
          </div>
        </details>
      </div>
    </div>
  )
}