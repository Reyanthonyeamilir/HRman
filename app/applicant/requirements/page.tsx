'use client'

import { Suspense } from 'react'
import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

// Simple loading spinner component
const LoadingSpinner = () => (
  <div className="h-16 w-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
)

export default function RequirementsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="h-16 w-16 rounded-full border-4 border-blue-100"></div>
            <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading Application Portal...</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">Please wait while we prepare your dashboard</p>
        </div>
      </div>
    }>
      <RequirementsContent />
    </Suspense>
  )
}

type AppError = {
  type: 'AUTH' | 'NETWORK' | 'VALIDATION' | 'SUBMISSION' | 'LOADING' | 'FILE';
  message: string;
  details?: string;
  retryable?: boolean;
  timestamp?: Date;
}

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

const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000
const MAX_APPLICATIONS_PER_DAY = 3

const loadApplicantFunctions = async () => {
  if (typeof window === 'undefined') {
    return {
      listActiveJobs: async () => [],
      submitApplication: async () => { throw new Error('Not available during SSR') },
      listMyApplications: async () => [],
      getSignedUrl: async () => '',
      getCurrentUser: async () => null,
      updateApplication: async () => { throw new Error('Not available during SSR') },
      supabase: { auth: { signOut: async () => {} } }
    }
  }
  
  try {
    const module = await import('@/lib/applicant')
    return module
  } catch (error) {
    console.error('Failed to load applicant functions:', error)
    throw new Error('Failed to load application functions. Please refresh the page.')
  }
}

// Simple error display component
const MobileErrorToast = ({ errors, onDismiss }: { errors: AppError[], onDismiss: (index: number) => void }) => {
  if (errors.length === 0) return null

  return (
    <>
      {/* Desktop errors */}
      <div className="hidden sm:block mb-4 space-y-2">
        {errors.map((error, index) => (
          <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3 animate-in fade-in duration-300">
            <div className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-600 text-sm">!</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800 mb-1">
                  {error.type === 'AUTH' ? 'Authentication Error' :
                   error.type === 'NETWORK' ? 'Connection Error' :
                   error.type === 'VALIDATION' ? 'Validation Error' :
                   error.type === 'SUBMISSION' ? 'Submission Failed' :
                   error.type === 'LOADING' ? 'Loading Error' : 'File Error'}
                </p>
                <p className="text-sm text-red-700 break-words">{error.message}</p>
                <div className="flex gap-2 mt-2">
                  {error.retryable && (
                    <button
                      onClick={() => {
                        onDismiss(index)
                        window.location.reload()
                      }}
                      className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-2 py-1 rounded"
                    >
                      Try Again
                    </button>
                  )}
                  <button
                    onClick={() => onDismiss(index)}
                    className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <button
                onClick={() => onDismiss(index)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile floating error toast */}
      <div className="sm:hidden fixed top-4 left-4 right-4 z-50 space-y-2">
        {errors.slice(0, 2).map((error, index) => (
          <div
            key={`mobile-${index}`}
            className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg animate-in slide-in-from-top duration-300"
          >
            <div className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-600 text-sm">!</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800 truncate">
                  {error.type === 'NETWORK' ? 'Connection Error' : 
                   error.type === 'AUTH' ? 'Authentication Error' : 
                   'Error'}
                </p>
                <p className="text-xs text-red-700 mt-1 line-clamp-2">{error.message}</p>
              </div>
              <button
                onClick={() => onDismiss(index)}
                className="text-red-400 hover:text-red-600 flex-shrink-0"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
            {error.retryable && (
              <button
                onClick={() => {
                  onDismiss(index)
                  window.location.reload()
                }}
                className="text-xs text-red-600 hover:text-red-800 font-medium mt-2"
              >
                Try Again
              </button>
            )}
          </div>
        ))}
        {errors.length > 2 && (
          <div className="text-center text-xs text-gray-500">
            +{errors.length - 2} more errors
          </div>
        )}
      </div>
    </>
  )
}

// Simple status badge
const StatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { color: string, icon: string, text: string }> = {
    'for_review': { color: 'bg-blue-100 text-blue-800', icon: '⏳', text: 'Review' },
    'shortlisted': { color: 'bg-green-100 text-green-800', icon: '✅', text: 'Shortlisted' },
    'hired': { color: 'bg-emerald-100 text-emerald-800', icon: '🏆', text: 'Hired' },
    'rejected': { color: 'bg-red-100 text-red-800', icon: '❌', text: 'Rejected' }
  }
  
  const config = configs[status] || { color: 'bg-gray-100 text-gray-800', icon: '📋', text: status }
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </span>
  )
}

function RequirementsContent() {
  const params = useSearchParams()
  const initPos = params.get('position') || '—'
  const router = useRouter()

  // Simplified states
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [jobId, setJobId] = React.useState<string | null>(null)
  const [applicantComment, setApplicantComment] = React.useState<string>('')
  const [file, setFile] = React.useState<File | null>(null)
  const [submitting, setSubmitting] = React.useState<boolean>(false)
  const [editingApplicationId, setEditingApplicationId] = React.useState<string | null>(null)
  const [editingApplication, setEditingApplication] = React.useState<Row | null>(null)
  const [position, setPosition] = React.useState<string>(initPos)
  const [rows, setRows] = React.useState<Row[]>([])
  const [loadingTable, setLoadingTable] = React.useState<boolean>(false)
  const [loadingJobs, setLoadingJobs] = React.useState<boolean>(false)
  const [errors, setErrors] = React.useState<AppError[]>([])
  const [success, setSuccess] = React.useState<string | null>(null)
  const [authChecked, setAuthChecked] = React.useState<boolean>(false)
  const [cooldownData, setCooldownData] = React.useState({
    canApply: true,
    nextAvailableTime: null as Date | null,
    message: '',
    todaysCount: 0
  })
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [applicantFunctions, setApplicantFunctions] = React.useState<any>(null)
  const [loadingFunctions, setLoadingFunctions] = React.useState(false)

  // Add error
  const addError = React.useCallback((error: AppError) => {
    setErrors(prev => {
      const isDuplicate = prev.some(e => 
        e.type === error.type && 
        e.message === error.message &&
        Date.now() - (e.timestamp?.getTime() || 0) < 5000
      )
      return isDuplicate ? prev : [...prev, error]
    })
  }, [])

  // Remove error
  const removeError = React.useCallback((index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Load functions
  React.useEffect(() => {
    const loadFunctions = async () => {
      try {
        setLoadingFunctions(true)
        const functions = await loadApplicantFunctions()
        setApplicantFunctions(functions)
      } catch (error: any) {
        addError({
          type: 'LOADING',
          message: 'Failed to load application functions',
          details: error?.message,
          retryable: true,
          timestamp: new Date()
        })
      } finally {
        setLoadingFunctions(false)
      }
    }

    loadFunctions()
  }, [addError])

  // Check auth
  React.useEffect(() => {
    if (!applicantFunctions || loadingFunctions) return

    const checkAuth = async () => {
      try {
        const user = await applicantFunctions.getCurrentUser()
        if (!user) {
          addError({
            type: 'AUTH',
            message: 'Please sign in to access the application portal',
            retryable: false,
            timestamp: new Date()
          })
          setTimeout(() => {
            router.push('/login?next=/applicant/requirements')
          }, 2000)
          return
        }
        setAuthChecked(true)
      } catch (error: any) {
        console.error('Auth check failed:', error)
        addError({
          type: 'AUTH',
          message: 'Authentication check failed',
          details: error?.message,
          retryable: true,
          timestamp: new Date()
        })
      }
    }

    checkAuth()
  }, [applicantFunctions, loadingFunctions, router, addError])

  // Load data
  React.useEffect(() => {
    if (!authChecked || !applicantFunctions) return

    let alive = true

    const loadData = async () => {
      try {
        setLoadingJobs(true)
        setLoadingTable(true)
        
        const [activeJobs, myApplications] = await Promise.all([
          applicantFunctions.listActiveJobs(),
          applicantFunctions.listMyApplications()
        ])

        if (!alive) return

        setJobs(activeJobs || [])
        setRows(myApplications || [])

        if (initPos && initPos !== '—') {
          const match = (activeJobs || []).find((j: any) => j.job_title === initPos)
          if (match) {
            setJobId(match.id)
            setPosition(match.job_title)
          }
        }

        await checkSpamProtection(myApplications || [])

      } catch (e: any) {
        if (alive) {
          addError({
            type: 'LOADING',
            message: 'Failed to load job data and applications',
            details: e?.message,
            retryable: true,
            timestamp: new Date()
          })
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
  }, [authChecked, applicantFunctions, initPos, addError])

  const checkSpamProtection = async (applications: Row[]) => {
    if (!applications || applications.length === 0) {
      setCooldownData({
        canApply: true,
        nextAvailableTime: null,
        message: '',
        todaysCount: 0
      })
      return
    }

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
        message: `Daily limit reached (${MAX_APPLICATIONS_PER_DAY}/${MAX_APPLICATIONS_PER_DAY} applications)`,
        todaysCount: todaysApplications.length
      })
      return
    }

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
          message: `Recent application to this position detected`,
          todaysCount: todaysApplications.length
        })
        return
      }
    }

    setCooldownData({
      canApply: true,
      nextAvailableTime: null,
      message: '',
      todaysCount: todaysApplications.length
    })
  }

  const formatTimeRemaining = (date: Date) => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    
    if (diff <= 0) return 'now'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    
    setErrors(prev => prev.filter(e => e.type !== 'FILE' && e.type !== 'VALIDATION'))
    setSuccess(null)
    
    if (f) {
      if (f.type !== 'application/pdf') {
        addError({
          type: 'FILE',
          message: 'Only PDF files are allowed',
          retryable: false,
          timestamp: new Date()
        })
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }
      
      if (f.size > 10 * 1024 * 1024) {
        addError({
          type: 'FILE',
          message: 'File size must be less than 10MB',
          retryable: false,
          timestamp: new Date()
        })
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }
    }
    
    setFile(f)
  }

  async function onSubmit() {
    if (!applicantFunctions) {
      addError({
        type: 'LOADING',
        message: 'Application functions not loaded',
        retryable: true,
        timestamp: new Date()
      })
      return
    }

    setErrors([])
    setSuccess(null)

    if (!editingApplicationId) {
      if (!jobId) {
        addError({
          type: 'VALIDATION',
          message: 'Please select a job position',
          retryable: false,
          timestamp: new Date()
        })
        return
      }
      
      if (!cooldownData.canApply && cooldownData.message) {
        addError({
          type: 'VALIDATION',
          message: cooldownData.message,
          details: cooldownData.nextAvailableTime ? `Available in ${formatTimeRemaining(cooldownData.nextAvailableTime)}` : undefined,
          retryable: false,
          timestamp: new Date()
        })
        return
      }
      
      if (!file) {
        addError({
          type: 'VALIDATION',
          message: 'Please select a PDF file',
          retryable: false,
          timestamp: new Date()
        })
        return
      }
    }

    try {
      setSubmitting(true)

      if (editingApplicationId && editingApplication) {
        if (!file) {
          addError({
            type: 'VALIDATION',
            message: 'Please select a new PDF file',
            retryable: false,
            timestamp: new Date()
          })
          return
        }

        await applicantFunctions.updateApplication(editingApplicationId, { 
          file, 
          applicant_comment: editingApplication.applicant_comment
        })
        
        setSuccess('Application file updated successfully!')
        setEditingApplicationId(null)
        setEditingApplication(null)
        
      } else {
        const id = await applicantFunctions.submitApplication({ 
          job_id: jobId!, 
          file: file!, 
          applicant_comment: applicantComment
        })
        
        setSuccess(`Application submitted! Reference: #${id}`)
      }
      
      setFile(null)
      setApplicantComment('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      const data = await applicantFunctions.listMyApplications()
      setRows(data as Row[])
      
      await checkSpamProtection(data as Row[])
      
    } catch (e: any) {
      console.error('Submission error:', e)
      
      let errorType: AppError['type'] = 'SUBMISSION'
      let userMessage = 'An error occurred. Please try again.'
      
      if (e.message.includes('cooldown') || e.message.includes('limit')) {
        errorType = 'VALIDATION'
        userMessage = e.message
      } else if (e.message.includes('authenticated')) {
        errorType = 'AUTH'
        userMessage = 'Session expired. Please sign in again.'
        setTimeout(() => router.push('/login?next=/applicant/requirements'), 2000)
      } else if (e.message.includes('PDF') || e.message.includes('file')) {
        errorType = 'FILE'
        userMessage = e.message
      } else if (e.message.includes('for_review')) {
        errorType = 'VALIDATION'
        userMessage = 'Cannot update. Application has been processed by HR.'
      } else if (e.message.includes('network') || e.message.includes('fetch')) {
        errorType = 'NETWORK'
        userMessage = 'Network error. Please check your connection.'
      }
      
      addError({
        type: errorType,
        message: userMessage,
        details: e.message,
        retryable: true,
        timestamp: new Date()
      })
    } finally {
      setSubmitting(false)
    }
  }

  function clearForm() {
    setFile(null)
    setApplicantComment('')
    setErrors([])
    setSuccess(null)
    setEditingApplicationId(null)
    setEditingApplication(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleEditApplication = (application: Row) => {
    if (application.status && application.status !== 'for_review') {
      addError({
        type: 'VALIDATION',
        message: `Cannot edit ${application.status} application`,
        details: 'Please contact HR for updates',
        retryable: false,
        timestamp: new Date()
      })
      return
    }

    try {
      setEditingApplicationId(application.id)
      setEditingApplication(application)
      setJobId(application.job_id)
      setPosition(application.job_title)
      setApplicantComment(application.applicant_comment)
      setFile(null)
      setErrors([])
      setSuccess(null)
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      setTimeout(() => {
        document.getElementById('application-form')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }, 100)
      
    } catch (e: any) {
      console.error('Failed to load application for editing:', e)
      addError({
        type: 'LOADING',
        message: 'Failed to load application for editing',
        details: e.message,
        retryable: true,
        timestamp: new Date()
      })
    }
  }

  React.useEffect(() => {
    if (errors.length > 0) {
      const timer = setTimeout(() => {
        setErrors(prev => prev.slice(1))
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [errors])

  if (!authChecked || !applicantFunctions || loadingFunctions) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 font-medium">Loading Application Portal...</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">Please wait while we prepare your dashboard</p>
        </div>
      </div>
    )
  }

  const selectedJob = jobs.find(j => j.id === jobId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Link href="/applicant" className="p-2 hover:bg-gray-100 rounded-lg">
                <span className="text-gray-600">←</span>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Applications</h1>
                <p className="text-sm text-gray-600">Submit and manage job applications</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Error Display */}
        <MobileErrorToast errors={errors} onDismiss={removeError} />

        {/* Cooldown Warning */}
        {!editingApplicationId && !cooldownData.canApply && cooldownData.message && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-600">⏰</span>
              <p className="text-sm text-amber-800">{cooldownData.message}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Applications</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{rows.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Available Jobs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{jobs.length}</p>
          </div>
        </div>

        {/* Application Form */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {editingApplicationId ? 'Update Application' : 'New Application'}
            </h2>
            {editingApplicationId && (
              <button
                onClick={clearForm}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            )}
          </div>

          <div id="application-form" className="bg-white rounded-lg border border-gray-200 p-4">
            {/* Job Select */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Position *
              </label>
              <select
                value={jobId || ''}
                onChange={(e) => {
                  setJobId(e.target.value || null)
                  const selected = jobs.find(j => j.id === e.target.value)
                  setPosition(selected?.job_title || '—')
                }}
                disabled={loadingJobs || editingApplicationId !== null}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-50"
              >
                <option value="">Choose a job...</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.job_title}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload PDF *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={onPick}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <span className="text-gray-400 text-xl mb-2 block">📄</span>
                  <p className="text-sm text-gray-600">
                    {file ? file.name : 'Click to upload PDF'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Max 10MB • PDF only</p>
                </label>
              </div>
            </div>

            {/* Comments */}
            {!editingApplicationId && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  value={applicantComment}
                  onChange={(e) => setApplicantComment(e.target.value)}
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={onSubmit}
              disabled={submitting || (!file && !editingApplicationId) || (!jobId && !editingApplicationId)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : editingApplicationId ? 'Update Application' : 'Submit Application'}
            </button>

            {/* Clear Button */}
            <button
              onClick={clearForm}
              disabled={!file && !applicantComment && !editingApplicationId}
              className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-lg mt-2"
            >
              Clear Form
            </button>
          </div>
        </div>

        {/* Applications History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Application History</h2>
            <button
              onClick={async () => {
                setLoadingTable(true)
                try {
                  const data = await applicantFunctions.listMyApplications()
                  setRows(data as Row[])
                  await checkSpamProtection(data as Row[])
                } finally {
                  setLoadingTable(false)
                }
              }}
              disabled={loadingTable}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {loadingTable ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {loadingTable ? (
            <div className="text-center py-8">
              <LoadingSpinner />
              <p className="mt-2 text-gray-600">Loading applications...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <span className="text-gray-300 text-4xl mb-3 block">📋</span>
              <p className="text-gray-500">No applications yet</p>
              <p className="text-sm text-gray-400 mt-1">Submit your first application above</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Job Title</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Date</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium text-gray-900 text-sm">{row.job_title}</div>
                        </td>
                        <td className="p-3">
                          <StatusBadge status={row.status || row.job_status} />
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {new Date(row.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditApplication(row)}
                              disabled={row.status !== 'for_review'}
                              className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}