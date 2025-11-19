'use client'

import { useState, useEffect } from 'react'
import HRSidebar from '@/components/HRSidebar'
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabaseClient'

interface Applicant {
  id: string
  email: string
  phone?: string
  role: string
  created_at: string
}

interface JobPosting {
  id: string
  job_title: string
  department: string
  location: string
  status: string
}

interface Application {
  id: string
  job_id: string
  applicant_id: string
  pdf_path: string
  comment?: string
  submitted_at: string
  applicant: Applicant
  job_posting: JobPosting
}

export default function HRTagPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 Fetching applications...')

      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          profiles!applications_applicant_id_fkey(
            id,
            email,
            phone,
            role,
            created_at
          ),
          job_postings!applications_job_id_fkey(
            id,
            job_title,
            department,
            location,
            status
          )
        `)
        .order('submitted_at', { ascending: false })

      if (appsError) {
        console.error('Error with joined query:', appsError)
        
        const { data: simpleApplications, error: simpleError } = await supabase
          .from('applications')
          .select('*')
          .order('submitted_at', { ascending: false })

        if (simpleError) throw simpleError

        if (!simpleApplications || simpleApplications.length === 0) {
          console.log('No applications found in database')
          setApplications([])
          return
        }

        const applicationsWithDetails = await Promise.all(
          simpleApplications.map(async (app) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', app.applicant_id)
              .single()

            const { data: jobData } = await supabase
              .from('job_postings')
              .select('*')
              .eq('id', app.job_id)
              .single()

            return {
              ...app,
              profiles: profileData,
              job_postings: jobData
            }
          })
        )

        const transformed = transformApplications(applicationsWithDetails)
        setApplications(transformed)
        return
      }

      console.log('Joined query successful:', applicationsData)
      const transformed = transformApplications(applicationsData || [])
      setApplications(transformed)

    } catch (err) {
      console.error('❌ Error in fetchApplications:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while fetching applications')
    } finally {
      setLoading(false)
    }
  }

  const transformApplications = (apps: any[]): Application[] => {
    return apps.map((app) => {
      const applicant = app.profiles
      const jobPosting = app.job_postings

      return {
        id: app.id,
        job_id: app.job_id,
        applicant_id: app.applicant_id,
        pdf_path: app.pdf_path,
        comment: app.comment || undefined,
        submitted_at: app.submitted_at,
        applicant: {
          id: applicant?.id || app.applicant_id,
          email: applicant?.email || 'Unknown Email',
          phone: applicant?.phone || '',
          role: applicant?.role || 'applicant',
          created_at: applicant?.created_at || new Date().toISOString()
        },
        job_posting: {
          id: jobPosting?.id || app.job_id,
          job_title: jobPosting?.job_title || 'Unknown Position',
          department: jobPosting?.department || 'N/A',
          location: jobPosting?.location || 'N/A',
          status: jobPosting?.status || 'unknown'
        }
      }
    })
  }

  const downloadResume = async (pdfPath: string, applicantName: string, jobTitle: string) => {
    try {
      console.log('📥 Downloading resume:', pdfPath)
      const { data, error } = await supabase.storage
        .from('applications')
        .createSignedUrl(pdfPath, 60)

      if (error) {
        console.error('Storage error:', error)
        throw error
      }

      window.open(data.signedUrl, '_blank')
      
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30'
      case 'closed': return 'bg-slate-500/20 text-slate-700 border-slate-500/30'
      case 'draft': return 'bg-amber-500/20 text-amber-700 border-amber-500/30'
      default: return 'bg-blue-500/20 text-blue-700 border-blue-500/30'
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
    return departmentColors[department.toLowerCase()] || 'bg-slate-500/20 text-slate-700 border-slate-500/30'
  }

  const filteredApplications = applications.filter(app => 
    selectedStatus === 'all' || app.job_posting.status === selectedStatus
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <HRSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-lg mt-4 text-gray-600">Loading applications...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <HRSidebar 
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Application Management</h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6">
          {/* Header Section */}
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Application Management</h1>
            <p className="text-gray-600 mt-2">
              Manage and review job applications from candidates
            </p>
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
                onClick={fetchApplications}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Stats and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-6 mb-4 lg:mb-0">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{applications.length}</div>
                  <div className="text-sm text-gray-500">Total Applications</div>
                </div>
                <div className="h-8 w-px bg-gray-300"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {applications.filter(app => app.job_posting.status === 'active').length}
                  </div>
                  <div className="text-sm text-gray-500">Active Jobs</div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-wrap gap-2">
                  {['all', 'active', 'closed', 'draft'].map((status) => (
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
                  onClick={fetchApplications}
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

          {/* Applications Grid */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Applications ({filteredApplications.length})
            </h2>
            
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <svg className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-lg mb-2">No applications found</p>
                <p className="text-gray-400 text-sm mb-4">
                  {selectedStatus !== 'all' 
                    ? `No applications for ${selectedStatus} jobs.`
                    : 'When candidates submit applications, they will appear here.'
                  }
                </p>
                {selectedStatus !== 'all' && (
                  <Button 
                    onClick={() => setSelectedStatus('all')}
                    variant="outline"
                  >
                    View All Applications
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {filteredApplications.map((application) => (
                  <div 
                    key={application.id} 
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Card Header */}
                    <div className="p-4 lg:p-6 border-b border-blue-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg line-clamp-1">
                            {application.job_posting.job_title}
                          </h3>
                          <p className="text-gray-600 text-sm mt-1">{application.job_posting.location}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(application.job_posting.status)}`}>
                          {application.job_posting.status.charAt(0).toUpperCase() + application.job_posting.status.slice(1)}
                        </span>
                      </div>
                      
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getDepartmentColor(application.job_posting.department)}`}>
                        {application.job_posting.department}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 lg:p-6">
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-gray-700">
                          <svg className="h-4 w-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-medium text-gray-900 truncate">{application.applicant.email}</span>
                        </div>
                        
                        {application.applicant.phone && (
                          <div className="flex items-center text-sm text-gray-700">
                            <svg className="h-4 w-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {application.applicant.phone}
                          </div>
                        )}
                        
                        <div className="flex items-center text-sm text-gray-700">
                          <svg className="h-4 w-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Applied on {formatDate(application.submitted_at)}
                        </div>

                        {application.comment && (
                          <div className="text-sm">
                            <p className="font-medium text-gray-700 mb-1">Comment:</p>
                            <p className="text-gray-600 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                              {application.comment}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-4 lg:p-6 border-t border-blue-200 bg-blue-100/50 rounded-b-xl">
                      <div className="flex justify-between items-center">
                        <Button
                          onClick={() => downloadResume(
                            application.pdf_path,
                            application.applicant.email,
                            application.job_posting.job_title
                          )}
                          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white border-0"
                          size="sm"
                        >
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Resume
                        </Button>
                        
                        <span className="text-xs text-gray-500">
                          ID: {application.applicant.id.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}