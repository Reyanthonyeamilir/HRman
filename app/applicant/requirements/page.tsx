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
import { Loader2, FileText, AlertCircle, CheckCircle2, Download, LogOut, Clock, Edit, X } from 'lucide-react'
import { 
  listActiveJobs, 
  submitApplication, 
  listMyApplications, 
  getSignedUrl, 
  getCurrentUser, 
  checkRecentApplication,
  updateApplication
} from '@/lib/applicant'

type Job = { id: string; job_title: string }
type Row = {
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

// Constants for anti-spam protection
const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
const MAX_APPLICATIONS_PER_DAY = 3 // Max applications per day across all jobs

function RequirementsContent() {
  const params = useSearchParams()
  const initPos = params.get('position') || '—'
  const router = useRouter()

  // form state
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [jobId, setJobId] = React.useState<string | null>(null)
  const [comment, setComment] = React.useState<string>('')
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
          job_title: String(j.job_title) 
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
          comment: editingApplication.comment // Keep original comment
        })
        
        setSuccess('Your application file has been successfully updated!')
        setEditingApplicationId(null)
        setEditingApplication(null)
        
      } else {
        // SUBMIT NEW APPLICATION
        const id = await submitApplication({ 
          job_id: jobId!, 
          file: file!, 
          comment 
        })
        
        setSuccess(`Application submitted successfully! Your reference number is #${id}`)
      }
      
      // Reset form
      setSubmittedFlag(true)
      setFile(null)
      setComment('')
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
    setComment('')
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
      setComment('') // Clear comment field since we're only replacing file
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Applications</h1>
          <p className="text-sm text-gray-600 mt-1">
            Submit new applications or update existing ones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm hidden sm:flex">
            Applicant Portal
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              const { supabase } = await import('@/lib/applicant')
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Cooldown Warning - Only show for new applications */}
      {!editingApplicationId && !cooldownData.canApply && cooldownData.message && (
        <Alert className="bg-amber-50 border-amber-200">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span>{cooldownData.message}</span>
              {cooldownData.nextAvailableTime && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800">
                  Available in {formatTimeRemaining(cooldownData.nextAvailableTime)}
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card className="border-blue-100">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Position</Badge>
              <span className="font-semibold text-gray-900 truncate">{position}</span>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <div className={`flex items-center gap-1 ${
                submittedFlag || editingApplicationId ? 'text-green-600' : 'text-blue-600'
              }`}>
                {submittedFlag || editingApplicationId ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {editingApplicationId ? 'Updating File' : submittedFlag ? 'Submitted' : 'Ready'}
                </span>
              </div>
              {editingApplicationId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearForm}
                  className="h-7 text-xs flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Cancel Update
                </Button>
              )}
            </div>
          </div>
          {editingApplication && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 font-medium">
                Updating file for: <span className="font-bold">{editingApplication.job_title}</span>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Submitted on {new Date(editingApplication.submitted_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-amber-600 mt-2">
                <strong>Note:</strong> You can only replace the PDF file. Comments and job position cannot be changed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mx-auto max-w-4xl animate-in fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="bg-green-50 border-green-200 mx-auto max-w-4xl animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span>{success}</span>
              <Badge variant="outline" className="bg-green-100 text-green-800">
                {editingApplicationId ? 'File Updated' : 'Application Submitted'}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Form Card */}
      <Card id="application-form" className="border-blue-100 shadow-sm mx-auto max-w-4xl">
        <CardHeader className={`${editingApplicationId ? 'bg-blue-50 border-blue-100' : 'bg-blue-50 border-blue-100'} border-b`}>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {editingApplicationId ? 'Replace Application File' : 'Submit New Application'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-4">
          {/* Form Grid - Responsive */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            {/* Job Select - Disabled when editing */}
            <div className="grid gap-2 md:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium text-gray-700">
                Job Position
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Select
                value={jobId || ''}
                onValueChange={(v: string) => {
                  setJobId(v || null)
                  const title = jobs.find(j => j.id === v)?.job_title ?? '—'
                  setPosition(title)
                  setError(null)
                }}
                disabled={loadingJobs || editingApplicationId !== null}
              >
                <SelectTrigger className="w-full">
                  {loadingJobs ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading available positions...
                    </div>
                  ) : editingApplicationId ? (
                    <div className="text-gray-600">{position}</div>
                  ) : (
                    <SelectValue placeholder="Select a job position..." />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.job_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingApplicationId && (
                <p className="text-xs text-blue-600">
                  Job position is locked when updating an existing application
                </p>
              )}
            </div>

            {/* File Input */}
            <div className="grid gap-2 md:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium text-gray-700">
                PDF Attachment
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Input 
                ref={fileInputRef}
                type="file" 
                accept="application/pdf" 
                onChange={onPick}
                className="cursor-pointer"
                required
              />
              <p className="text-xs text-gray-500">
                Maximum file size: 10MB. Only PDF files accepted.
              </p>
              {editingApplication && (
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-sm text-gray-700 font-medium">Current File:</p>
                  <p className="text-xs text-gray-600 truncate">
                    {editingApplication.pdf_path.split('/').pop()}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Select a new PDF file to replace the current one
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 md:col-span-2 lg:col-span-1 lg:flex-col lg:items-end lg:justify-end">
              <Button
                className={`min-w-[140px] ${
                  editingApplicationId 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
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
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
                disabled={submitting || (!file && !comment && !editingApplicationId)}
                className="min-w-[140px]"
              >
                {editingApplicationId ? 'Cancel' : 'Clear'}
              </Button>
            </div>
          </div>

          {/* Comment Section - Only for new applications */}
          {!editingApplicationId && (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Additional Comments (Optional)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add any additional notes or comments for the HR team..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Comments are only for new applications and cannot be edited later
              </p>
            </div>
          )}

          {/* Selected File Preview */}
          {file && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-blue-900 truncate">{file.name}</p>
                  <p className="text-sm text-blue-700">
                    Size: {(file.size / 1024 / 1024).toFixed(2)} MB • Type: PDF
                  </p>
                  {editingApplicationId && (
                    <p className="text-xs text-amber-600 mt-1">
                      This will replace your current uploaded file
                    </p>
                  )}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applications History */}
      <div className="space-y-4 mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Your Applications</h2>
            <p className="text-sm text-gray-600">View and manage your submitted applications</p>
          </div>
          {loadingTable && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading applications...
            </div>
          )}
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Job Title</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Status</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">File</TableHead>
                    <TableHead className="font-semibold hidden xl:table-cell">Comments</TableHead>
                    <TableHead className="font-semibold">Submitted</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {loadingTable ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading your applications...
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <FileText className="h-8 w-8 mx-auto text-gray-300" />
                            <p>No applications submitted yet.</p>
                            <p className="text-sm">Submit your first application above.</p>
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
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-blue-900">Important Information</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• You can only edit applications with "For Review" status</li>
                  <li>• When editing, you can only replace the PDF file (not comments or job position)</li>
                  <li>• New applications are limited to {MAX_APPLICATIONS_PER_DAY} per day</li>
                  <li>• You cannot apply to the same job within 24 hours of a previous application</li>
                  <li>• Once an application is reviewed by HR, it cannot be modified</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function formatDate(s: string) {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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
    const statusColors: Record<string, string> = {
      'for_review': 'bg-blue-100 text-blue-800 border-blue-200',
      'shortlisted': 'bg-green-100 text-green-800 border-green-200',
      'hired': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200',
      'active': 'bg-green-100 text-green-800 border-green-200',
      'closed': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    
    const displayStatus = status === 'for_review' ? 'For Review' : 
                         status === 'shortlisted' ? 'Shortlisted' :
                         status.charAt(0).toUpperCase() + status.slice(1)
    
    return (
      <Badge variant="outline" className={`${statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200'} font-medium`}>
        {displayStatus}
      </Badge>
    )
  }

  // Only 'for_review' applications can be edited
  const canEdit = row.status === 'for_review'

  return (
    <TableRow className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
      <TableCell className="font-medium">
        <div className="max-w-[150px] sm:max-w-[200px] truncate" title={row.job_title}>
          {row.job_title}
          {isEditing && (
            <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 border-blue-300 text-xs">
              Updating
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {getStatusBadge(row.status || row.job_status)}
      </TableCell>
      <TableCell className="hidden lg:table-cell max-w-[200px]">
        <div className="truncate text-sm text-gray-600" title={row.pdf_path}>
          {row.pdf_path.split('/').pop() || '—'}
        </div>
      </TableCell>
      <TableCell className="hidden xl:table-cell max-w-[250px]">
        <div className="truncate text-sm text-gray-600" title={row.comment}>
          {row.comment || '—'}
        </div>
      </TableCell>
      <TableCell className="text-sm text-gray-600">
        <div className="max-w-[120px] truncate" title={formatDate(row.submitted_at)}>
          {formatDate(row.submitted_at)}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {loadingUrl ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : url ? (
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="border-blue-200 hover:bg-blue-50"
            >
              <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">View</span>
              </a>
            </Button>
          ) : (
            <span className="text-gray-400 text-sm">—</span>
          )}
          
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className={`flex items-center gap-1 ${isEditing ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-100'}`}
              disabled={isEditing}
            >
              <Edit className="h-3 w-3" />
              <span className="hidden sm:inline">{isEditing ? 'Updating' : 'Replace File'}</span>
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