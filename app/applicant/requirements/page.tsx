'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, FileText, AlertCircle, CheckCircle2, Download, 
  LogOut, Clock, Edit, X, MessageSquare, User, Calendar,
  Building, MapPin, Eye, RefreshCw
} from 'lucide-react'
import { 
  listActiveJobs, 
  submitApplication, 
  listMyApplications, 
  getSignedUrl, 
  getCurrentUser, 
  checkRecentApplication,
  updateApplication
} from '@/lib/applicant'

type Job = { 
  id: string; 
  job_title: string;
  department?: string;
  location?: string;
}

type Row = {
  id: string
  job_id: string
  job_title: string
  job_status: string
  pdf_path: string
  applicant_comment: string
  hr_comment: string
  submitted_at: string
  status: 'for_review' | 'shortlisted' | 'hired' | 'rejected'
  updated_at?: string
  hr_comment_at?: string
  hr_comment_by?: {
    first_name: string
    last_name: string
    role: string
  }
}

// Constants for anti-spam protection
const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
const MAX_APPLICATIONS_PER_DAY = 3

function RequirementsContent() {
  const params = useSearchParams()
  const initPos = params.get('position') || '—'
  const router = useRouter()

  // form state
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [jobId, setJobId] = React.useState<string | null>(null)
  const [applicantComment, setApplicantComment] = React.useState<string>('')
  const [file, setFile] = React.useState<File | null>(null)
  const [submitting, setSubmitting] = React.useState<boolean>(false)
  const [editingApplicationId, setEditingApplicationId] = React.useState<string | null>(null)
  const [editingApplication, setEditingApplication] = React.useState<Row | null>(null)

  // visual mirrors
  const [position, setPosition] = React.useState<string>(initPos)
  const [submittedFlag, setSubmittedFlag] = React.useState<boolean>(false)

  // table state
  const [rows, setRows] = React.useState<Row[]>([])
  const [loadingTable, setLoadingTable] = React.useState<boolean>(true)
  const [loadingJobs, setLoadingJobs] = React.useState<boolean>(true)

  // error states
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  // auth state
  const [authChecked, setAuthChecked] = React.useState<boolean>(false)

  // Spam protection state
  const [cooldownData, setCooldownData] = React.useState<{
    canApply: boolean;
    nextAvailableTime: Date | null;
    message: string;
  }>({ canApply: true, nextAvailableTime: null, message: '' })

  // File input reference
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Check authentication on component mount
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login?next=/applicant/requirements')
          return
        }
        setAuthChecked(true)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login?next=/applicant/requirements')
      }
    }

    checkAuth()
  }, [router])

  // load jobs + my applications after auth is confirmed
  React.useEffect(() => {
    if (!authChecked) return

    let alive = true

    const loadData = async () => {
      try {
        setLoadingJobs(true)
        setError(null)
        
        const [activeJobs, myApplications] = await Promise.all([
          listActiveJobs(),
          listMyApplications()
        ])

        if (!alive) return

        const minimal: Job[] = (activeJobs ?? []).map((j: any) => ({ 
          id: j.id as string, 
          job_title: j.job_title,
          department: j.department,
          location: j.location
        }))
        setJobs(minimal)

        if (initPos && initPos !== '—') {
          const match = minimal.find(j => j.job_title === initPos)
          if (match) {
            setJobId(match.id)
            setPosition(match.job_title)
          }
        }

        setRows(myApplications as Row[])
        
        // Check spam protection for new applications
        await checkSpamProtection(myApplications as Row[])

      } catch (e: any) {
        console.error('Failed to load data:', e)
        if (alive) {
          setError(e?.message || 'Failed to load data. Please try again later.')
        }
      } finally {
        if (alive) {
          setLoadingJobs(false)
          setLoadingTable(false)
        }
      }
    }

    loadData()

    return () => {
      alive = false
    }
  }, [initPos, authChecked])

  // Check spam protection rules for NEW applications only
  const checkSpamProtection = async (applications: Row[]) => {
    if (!applications || applications.length === 0) {
      setCooldownData({
        canApply: true,
        nextAvailableTime: null,
        message: ''
      })
      return
    }

    // Check daily limit for NEW applications
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todaysApplications = applications.filter(app => {
      const appDate = new Date(app.submitted_at)
      return appDate >= today
    })

    if (todaysApplications.length >= MAX_APPLICATIONS_PER_DAY) {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      setCooldownData({
        canApply: false,
        nextAvailableTime: tomorrow,
        message: `You have reached the daily limit of ${MAX_APPLICATIONS_PER_DAY} new applications. You can apply again tomorrow.`
      })
      return
    }

    // Check for recent application to same job for NEW applications
    if (jobId) {
      const recentSameJob = applications.find(app => 
        app.job_id === jobId && 
        (Date.now() - new Date(app.submitted_at).getTime()) < COOLDOWN_PERIOD
      )

      if (recentSameJob) {
        const nextAvailable = new Date(new Date(recentSameJob.submitted_at).getTime() + COOLDOWN_PERIOD)
        setCooldownData({
          canApply: false,
          nextAvailableTime: nextAvailable,
          message: `You've already applied to this position recently. You can apply again after ${formatTimeRemaining(nextAvailable)}.`
        })
        return
      }
    }

    setCooldownData({
      canApply: true,
      nextAvailableTime: null,
      message: ''
    })
  }

  const formatTimeRemaining = (date: Date) => {
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

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setSubmittedFlag(false)
    setError(null)
  }

  async function onSubmit() {
    // Clear previous messages
    setError(null)
    setSuccess(null)

    // Validate for new applications
    if (!editingApplicationId) {
      if (!jobId) {
        setError('Please choose a job position first.')
        return
      }
      
      if (!cooldownData.canApply && cooldownData.message) {
        setError(cooldownData.message)
        return
      }
      
      if (!file) {
        setError('Please attach a PDF file of your requirements.')
        return
      }
    }

    // Validate file if provided
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed. Please upload a PDF file.')
        return
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB. Please choose a smaller file.')
        return
      }
    } else if (!editingApplicationId) {
      // New applications require a file
      setError('Please attach a PDF file of your requirements.')
      return
    }

    try {
      setSubmitting(true)

      if (editingApplicationId && editingApplication) {
        // UPDATE EXISTING APPLICATION - File is required for updates
        if (!file) {
          setError('Please select a new PDF file to replace the existing one.')
          return
        }

        await updateApplication(editingApplicationId, { 
          file, 
          applicant_comment: editingApplication.applicant_comment
        })
        
        setSuccess('Your application file has been successfully updated!')
        setEditingApplicationId(null)
        setEditingApplication(null)
        
      } else {
        // SUBMIT NEW APPLICATION
        const id = await submitApplication({ 
          job_id: jobId!, 
          file: file!, 
          applicant_comment: applicantComment
        })
        
        setSuccess(`Application submitted successfully! Your reference number is #${id}`)
      }
      
      // Reset form
      setSubmittedFlag(true)
      setFile(null)
      setApplicantComment('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Refresh applications list
      const data = await listMyApplications()
      setRows(data as Row[])
      
      // Re-check spam protection
      await checkSpamProtection(data as Row[])
      
    } catch (e: any) {
      console.error('Submission error:', e)
      
      // User-friendly error messages
      if (e.message.includes('cooldown') || e.message.includes('limit')) {
        setError(e.message)
      } else if (e.message.includes('authenticated')) {
        setError('Your session has expired. Please sign in again.')
        router.push('/login?next=/applicant/requirements')
      } else if (e.message.includes('PDF') || e.message.includes('file')) {
        setError(e.message)
      } else if (e.message.includes('for_review')) {
        setError('Cannot update application. It has already been processed by HR.')
      } else {
        setError('An error occurred. Please try again or contact support if the problem persists.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function clearForm() {
    setFile(null)
    setApplicantComment('')
    setSubmittedFlag(false)
    setError(null)
    setSuccess(null)
    setEditingApplicationId(null)
    setEditingApplication(null)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Function to handle editing an existing application - FILE REPLACEMENT ONLY
  const handleEditApplication = async (application: Row) => {
    // Only 'for_review' applications can be edited
    if (application.status && application.status !== 'for_review') {
      setError(`Cannot edit application that has been ${application.status}. Please contact HR for updates.`)
      return
    }

    try {
      setEditingApplicationId(application.id)
      setEditingApplication(application)
      setJobId(application.job_id)
      setPosition(application.job_title)
      setApplicantComment(application.applicant_comment)
      setFile(null)
      setError(null)
      setSuccess(null)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Scroll to form
      setTimeout(() => {
        document.getElementById('application-form')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }, 100)
      
    } catch (e: any) {
      console.error('Failed to load application for editing:', e)
      setError('Failed to load application for editing. Please try again.')
    }
  }

  // Update cooldown check when jobId changes (for new applications only)
  React.useEffect(() => {
    if (jobId && !editingApplicationId) {
      checkSpamProtection(rows)
    }
  }, [jobId, editingApplicationId])

  // Show loading while checking authentication
  if (!authChecked) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-blue-100"></div>
            <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Verifying your session...</p>
          <p className="text-sm text-gray-400 mt-1">Please wait while we secure your connection</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Job Applications Portal</h1>
              <p className="text-blue-100 mt-1">Submit applications and track your progress</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm">
                <User className="h-3 w-3 mr-1" />
                Applicant
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  const { supabase } = await import('@/lib/applicant')
                  await supabase.auth.signOut()
                  router.push('/login')
                }}
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Cooldown Warning - Only show for new applications */}
        {!editingApplicationId && !cooldownData.canApply && cooldownData.message && (
          <Alert className="mb-6 bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 shadow-sm">
            <Clock className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-800 ml-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="font-medium">{cooldownData.message}</span>
                {cooldownData.nextAvailableTime && (
                  <Badge variant="outline" className="bg-amber-200 text-amber-800 border-amber-300">
                    <Clock className="h-3 w-3 mr-1" />
                    Available in {formatTimeRemaining(cooldownData.nextAvailableTime)}
                  </Badge>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Applications</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{rows.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-100 bg-gradient-to-br from-green-50 to-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{jobs.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Building className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Daily Limit</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{MAX_APPLICATIONS_PER_DAY}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Form Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Submit New Application</h2>
              <p className="text-gray-600 mt-1">Apply for available positions in our organization</p>
            </div>
            {editingApplicationId && (
              <Button
                variant="outline"
                onClick={clearForm}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel Edit
              </Button>
            )}
          </div>

          {/* Status Card */}
          <Card className="mb-6 border-blue-100 bg-gradient-to-r from-blue-50 to-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    {editingApplicationId ? (
                      <Edit className="h-5 w-5 text-blue-600" />
                    ) : submittedFlag ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Current Position</p>
                    <p className="text-lg font-semibold text-gray-900 truncate max-w-xs">{position}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${
                      editingApplicationId 
                        ? 'bg-blue-100 text-blue-800 border-blue-300' 
                        : submittedFlag
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}
                  >
                    {editingApplicationId ? 'Editing Mode' : submittedFlag ? 'Submitted' : 'Ready to Submit'}
                  </Badge>
                </div>
              </div>
              
              {editingApplication && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Edit className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-blue-900">
                        Editing: <span className="font-bold">{editingApplication.job_title}</span>
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Submitted on {new Date(editingApplication.submitted_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-amber-600 mt-2 font-medium">
                        Note: You can only replace the PDF file. Comments and job position cannot be changed.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error & Success Alerts */}
          {error && (
            <Alert variant="destructive" className="mb-6 animate-in fade-in duration-300">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="ml-3">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 animate-in fade-in duration-300">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertDescription className="ml-3 text-green-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="font-medium">{success}</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    {editingApplicationId ? 'File Updated' : 'Application Submitted'}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Form Card */}
          <Card id="application-form" className="border-gray-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                {editingApplicationId ? 'Replace Application File' : 'Submit New Application'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Form Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Job Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    Job Position <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={jobId || ''}
                    onValueChange={(v: string) => {
                      setJobId(v || null)
                      const selectedJob = jobs.find(j => j.id === v)
                      setPosition(selectedJob?.job_title ?? '—')
                      setError(null)
                    }}
                    disabled={loadingJobs || editingApplicationId !== null}
                  >
                    <SelectTrigger className="w-full h-12">
                      {loadingJobs ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-gray-500">Loading positions...</span>
                        </div>
                      ) : editingApplicationId ? (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">{position}</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Select a position..." />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map(j => (
                        <SelectItem key={j.id} value={j.id} className="py-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{j.job_title}</span>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              {j.department && (
                                <span className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {j.department}
                                </span>
                              )}
                              {j.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {j.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingApplicationId && (
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Job position is locked when updating
                    </p>
                  )}
                </div>

                {/* File Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    PDF Attachment <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input 
                      ref={fileInputRef}
                      type="file" 
                      accept="application/pdf" 
                      onChange={onPick}
                      className="h-12 cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors"
                      required
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Maximum file size: 10MB • Only PDF files accepted
                  </p>
                  {editingApplication && (
                    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">Current File:</p>
                      <p className="text-xs text-gray-600 truncate">
                        {editingApplication.pdf_path.split('/').pop()}
                      </p>
                      <p className="text-xs text-amber-600 mt-2 font-medium">
                        Select a new PDF file to replace the current one
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 lg:items-end lg:justify-end">
                  <Button
                    className="h-12 min-w-full lg:min-w-[200px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
                    onClick={onSubmit}
                    disabled={
                      submitting || 
                      loadingJobs || 
                      (!cooldownData.canApply && !editingApplicationId) ||
                      (editingApplicationId ? !file : (!file || !jobId))
                    }
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        {editingApplicationId ? 'Uploading...' : 'Submitting...'}
                      </>
                    ) : editingApplicationId ? (
                      'Replace File'
                    ) : (
                      'Submit Application'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearForm}
                    disabled={submitting || (!file && !applicantComment && !editingApplicationId)}
                    className="h-12 min-w-full lg:min-w-[200px]"
                  >
                    {editingApplicationId ? 'Cancel Edit' : 'Clear Form'}
                  </Button>
                </div>
              </div>

              {/* Comment Section - Only for new applications */}
              {!editingApplicationId && (
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Additional Comments (Optional)
                  </label>
                  <Textarea
                    value={applicantComment}
                    onChange={(e) => setApplicantComment(e.target.value)}
                    placeholder="Add any additional notes or comments for the HR team..."
                    rows={4}
                    className="resize-none border-gray-300 focus:border-blue-400"
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Comments are only for new applications and cannot be edited later
                  </p>
                </div>
              )}

              {/* Selected File Preview */}
              {file && (
                <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 truncate max-w-xs">{file.name}</p>
                        <p className="text-sm text-gray-600">
                          Size: {(file.size / 1024 / 1024).toFixed(2)} MB • Type: PDF
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFile(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {editingApplicationId && (
                    <p className="text-sm text-amber-600 mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
                      This will replace your current uploaded file
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Applications History */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Your Applications</h2>
              <p className="text-gray-600 mt-1">Track and manage all your submitted applications</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setLoadingTable(true)
                try {
                  const data = await listMyApplications()
                  setRows(data as Row[])
                } catch (error) {
                  console.error('Failed to refresh:', error)
                } finally {
                  setLoadingTable(false)
                }
              }}
              disabled={loadingTable}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingTable ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <Card className="border-gray-200 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-white">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold text-gray-700 py-4">Job Title</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-4 hidden sm:table-cell">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-4 hidden lg:table-cell">File</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-4 hidden xl:table-cell">Your Comment</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-4">Submitted</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          {loadingTable ? (
                            <div className="flex flex-col items-center justify-center gap-3">
                              <div className="h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
                              <p className="text-gray-600 font-medium">Loading your applications...</p>
                              <p className="text-sm text-gray-400">Please wait a moment</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="h-16 w-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
                                <FileText className="h-8 w-8 text-gray-300" />
                              </div>
                              <div>
                                <p className="text-gray-500 text-lg font-medium">No applications yet</p>
                                <p className="text-gray-400 text-sm mt-1">
                                  Submit your first application using the form above
                                </p>
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => (
                        <SubmissionRow 
                          key={r.id} 
                          row={r} 
                          onEdit={() => handleEditApplication(r)}
                          isEditing={editingApplicationId === r.id}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="border-blue-100 bg-gradient-to-r from-blue-50 to-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Important Information</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">Editing:</span> Only applications with "For Review" status can be edited
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">File Replacement:</span> When editing, you can only replace the PDF file
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">Daily Limit:</span> Maximum {MAX_APPLICATIONS_PER_DAY} new applications per day
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">Cooldown Period:</span> 24-hour wait between applications to the same position
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">HR Review:</span> Once reviewed by HR, applications cannot be modified
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} Applicant Portal • NORSU Human Resource Management
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Secure Connection
              </span>
              <span>•</span>
              <span>Need help? Contact HR Department</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDate(s: string) {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function SubmissionRow({ 
  row, 
  onEdit,
  isEditing
}: { 
  row: Row
  onEdit: () => void
  isEditing: boolean
}) {
  const [url, setUrl] = React.useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = React.useState<boolean>(false)

  React.useEffect(() => {
    let alive = true
    setLoadingUrl(true)
    
    ;(async () => {
      if (!row.pdf_path) {
        setLoadingUrl(false)
        return
      }
      try {
        const u = await getSignedUrl(row.pdf_path)
        if (alive) setUrl(u)
      } catch (e) {
        console.error('[getSignedUrl] failed:', e)
      } finally {
        if (alive) setLoadingUrl(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [row.pdf_path])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'for_review': { 
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '⏳'
      },
      'shortlisted': { 
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '✅'
      },
      'hired': { 
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: '🏆'
      },
      'rejected': { 
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '❌'
      }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: '📋'
    }
    
    const displayStatus = status === 'for_review' ? 'For Review' : 
                         status === 'shortlisted' ? 'Shortlisted' :
                         status.charAt(0).toUpperCase() + status.slice(1)
    
    return (
      <Badge variant="outline" className={`${config.color} font-medium`}>
        <span className="mr-1">{config.icon}</span>
        {displayStatus}
      </Badge>
    )
  }

  // Only 'for_review' applications can be edited
  const canEdit = row.status === 'for_review'

  return (
    <TableRow className={`${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'} transition-colors`}>
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
            isEditing ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Building className={`h-5 w-5 ${isEditing ? 'text-blue-600' : 'text-gray-500'}`} />
          </div>
          <div>
            <div className="font-semibold text-gray-900 truncate max-w-[180px]">{row.job_title}</div>
            <div className="text-xs text-gray-500 mt-1">{row.job_status}</div>
            {isEditing && (
              <Badge className="mt-1 bg-blue-100 text-blue-700 border-blue-300 text-xs">
                Currently Editing
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell py-4">
        {getStatusBadge(row.status || row.job_status)}
      </TableCell>
      <TableCell className="hidden lg:table-cell py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600 truncate max-w-[120px]" title={row.pdf_path}>
            {row.pdf_path.split('/').pop()}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden xl:table-cell py-4 max-w-[200px]">
        {row.applicant_comment ? (
          <div className="group relative">
            <div className="truncate text-sm text-gray-600 cursor-help" title={row.applicant_comment}>
              {row.applicant_comment}
            </div>
            <div className="absolute left-0 top-full mt-2 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64">
              <div className="text-xs font-medium text-gray-700 mb-1">Your Comment:</div>
              <div className="text-sm text-gray-600">{row.applicant_comment}</div>
            </div>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        )}
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <div className="text-sm text-gray-600">
            {new Date(row.submitted_at).toLocaleDateString()}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {loadingUrl ? (
            <div className="h-8 w-8 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin"></div>
          ) : url ? (
            <Button 
              variant="outline" 
              size="sm"
              asChild
              className="border-gray-300 hover:bg-gray-50"
            >
              <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">View PDF</span>
              </a>
            </Button>
          ) : (
            <span className="text-gray-400 text-sm">—</span>
          )}
          
          {canEdit && (
            <Button
              variant={isEditing ? "secondary" : "outline"}
              size="sm"
              onClick={onEdit}
              disabled={isEditing}
              className={`flex items-center gap-2 ${
                isEditing 
                  ? 'bg-blue-100 text-blue-700 border-blue-300' 
                  : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">{isEditing ? 'Editing...' : 'Edit File'}</span>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

// Export the main component
export default function RequirementsPage() {
  return <RequirementsContent />
}