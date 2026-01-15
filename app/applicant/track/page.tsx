'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertCircle, CheckCircle2, Clock, FileText, User, 
  Building, MapPin, Calendar, MessageSquare, Download,
  RefreshCw, ChevronRight, Award, XCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface Application {
  id: string
  job_id: string
  applicant_id: string
  pdf_path: string
  applicant_comment?: string
  hr_comment?: string
  hr_comment_by?: string
  hr_comment_at?: string
  status: 'for_review' | 'shortlisted' | 'hired' | 'rejected'
  submitted_at: string
  updated_at?: string
  job_postings?: {
    job_title: string
    department: string
    location: string
  }
  hr_comment_profiles?: {
    first_name: string
    last_name: string
    role: string
  }
}

export default function TrackPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

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

      const { data: applicationsData, error } = await supabase
        .from('applications')
        .select(`
          *,
          job_postings (
            job_title,
            department,
            location
          ),
          hr_comment_profiles:hr_comment_by (
            first_name,
            last_name,
            role
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

      setApplications(validApplications)
      
    } catch (error) {
      console.error('❌ Error fetching applications:', error)
      setError('Failed to load applications. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchApplications()
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      'for_review': {
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: Clock,
        iconColor: 'text-blue-600',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        timelineColor: 'bg-blue-500'
      },
      'shortlisted': {
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: Award,
        iconColor: 'text-blue-600',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        timelineColor: 'bg-blue-500'
      },
      'hired': {
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: CheckCircle2,
        iconColor: 'text-blue-600',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        timelineColor: 'bg-blue-500'
      },
      'rejected': {
        color: 'from-red-500 to-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: XCircle,
        iconColor: 'text-red-600',
        badgeColor: 'bg-red-100 text-red-800 border-red-200',
        timelineColor: 'bg-red-500'
      }
    }

    return configs[status as keyof typeof configs] || configs.for_review
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'for_review': return 'Your application is under review by our HR team. We will contact you once a decision has been made.'
      case 'shortlisted': return 'Congratulations! Your application has been shortlisted for further consideration. You may be contacted for an interview.'
      case 'hired': return 'Congratulations! You have been selected for this position. HR will contact you with onboarding details.'
      case 'rejected': return 'Thank you for your application. Unfortunately, you were not selected for this position this time.'
      default: return 'Your application has been received and is being processed.'
    }
  }

  const getNextSteps = (status: string) => {
    switch (status) {
      case 'for_review': return 'Wait for HR review (typically 5-7 business days)'
      case 'shortlisted': return 'Prepare for potential interview contact'
      case 'hired': return 'Await HR contact for onboarding process'
      case 'rejected': return 'Consider applying for other suitable positions'
      default: return 'Check back for updates'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSignedUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('applications')
        .createSignedUrl(filePath, 3600)
      
      if (error) throw error
      return data.signedUrl
    } catch (error) {
      console.error('Error generating signed URL:', error)
      return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-blue-100"></div>
              <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-6 text-lg font-medium text-gray-700">Loading your applications...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your data</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Applications</h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">{error}</p>
            <Button 
              onClick={fetchApplications}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Application Tracker</h1>
              <p className="text-blue-100 mt-2">Monitor the progress of all your job applications</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm">
                <User className="h-3 w-3 mr-1" />
                {applications.length} Applications
              </Badge>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">For Review</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {applications.filter(app => app.status === 'for_review').length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Shortlisted</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {applications.filter(app => app.status === 'shortlisted').length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Award className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hired</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {applications.filter(app => app.status === 'hired').length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{applications.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <Card className="border-gray-200 shadow-lg">
            <CardContent className="py-12">
              <div className="text-center">
                <div className="h-20 w-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-6">
                  <FileText className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Applications Found</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  You haven't submitted any job applications yet. Start your journey by applying for available positions.
                </p>
                <Button 
                  onClick={() => window.location.href = '/applicant/requirements'}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  Browse Available Jobs
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900">Your Applications</h2>
              <p className="text-sm text-gray-600">
                Showing {applications.length} application{applications.length !== 1 ? 's' : ''}
              </p>
            </div>

            {applications.map((application) => {
              const config = getStatusConfig(application.status)
              const StatusIcon = config.icon
              const jobDetails = application.job_postings || {
                job_title: 'Position No Longer Available',
                department: 'N/A',
                location: 'N/A'
              }
              
              return (
                <Card 
                  key={application.id} 
                  className={`border-2 ${config.borderColor} bg-gradient-to-br from-white ${config.bgColor} shadow-lg hover:shadow-xl transition-shadow duration-300`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className={`h-12 w-12 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                            <StatusIcon className={`h-6 w-6 ${config.iconColor}`} />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-xl text-gray-900 mb-1">
                              {jobDetails.job_title}
                            </CardTitle>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                              {jobDetails.department && (
                                <span className="flex items-center gap-1">
                                  <Building className="h-4 w-4" />
                                  {jobDetails.department}
                                </span>
                              )}
                              {jobDetails.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {jobDetails.location}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Applied {formatDate(application.submitted_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Badge className={`${config.badgeColor} text-sm font-medium py-1.5 px-3`}>
                        {application.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-6">
                      {/* Status Message */}
                      <div className="p-4 rounded-lg bg-white border border-gray-200">
                        <div className="flex items-start gap-3">
                          <div className={`h-8 w-8 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <StatusIcon className={`h-4 w-4 ${config.iconColor}`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Current Status</p>
                            <p className="text-gray-700 mt-1">{getStatusMessage(application.status)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Applicant Comment */}
                      {application.applicant_comment && (
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-blue-900 mb-1">Your Comment</p>
                              <p className="text-blue-800">{application.applicant_comment}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* HR Comment (if exists) */}
                      {application.hr_comment && application.hr_comment_profiles && (
                        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-blue-900">HR Feedback</p>
                                {application.hr_comment_at && (
                                  <span className="text-xs text-blue-700">
                                    {new Date(application.hr_comment_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-blue-800 mb-3">{application.hr_comment}</p>
                              <div className="text-sm text-blue-700">
                                <span className="font-medium">
                                  {application.hr_comment_profiles.first_name} {application.hr_comment_profiles.last_name}
                                </span>
                                <span className="mx-2">•</span>
                                <span>{application.hr_comment_profiles.role}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Application Timeline */}
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-4">Application Timeline</h4>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className={`h-6 w-6 rounded-full ${config.timelineColor} flex items-center justify-center flex-shrink-0 mt-0.5`}></div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Application Submitted</p>
                              <p className="text-gray-600 text-sm mt-1">
                                {formatDate(application.submitted_at)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <div className={`h-6 w-6 rounded-full border-2 ${config.borderColor} flex items-center justify-center flex-shrink-0 mt-0.5`}></div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Current Status</p>
                              <p className="text-gray-600 text-sm mt-1">{getStatusMessage(application.status)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <ChevronRight className="h-3 w-3 text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Next Steps</p>
                              <p className="text-gray-600 text-sm mt-1">{getNextSteps(application.status)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const url = await getSignedUrl(application.pdf_path)
                            if (url) {
                              window.open(url, '_blank')
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          View Submitted PDF
                        </Button>
                        
                        {application.status === 'for_review' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = `/applicant/requirements?edit=${application.id}`}
                            className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            <FileText className="h-4 w-4" />
                            Update Application
                          </Button>
                        )}
                        
                        <div className="ml-auto text-xs text-gray-500">
                          Application ID: {application.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Information Section */}
        <Card className="mt-8 border-gray-200 bg-gradient-to-r from-gray-50 to-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Understanding Your Application Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">For Review</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Your application is being reviewed by our HR team. This process typically takes 5-7 business days.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Shortlisted</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Congratulations! Your application stands out. You may be contacted for an interview soon.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Hired</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      You've been selected! HR will contact you with onboarding details and next steps.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-800">Need Help?</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Contact HR department at hr@norsu.edu.ph for any questions about your application.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} NORSU Application Tracker • Human Resource Management System
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                Real-time Updates
              </span>
              <span>•</span>
              <span>Last refreshed: Just now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}