'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

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
  status?: 'active' | 'closed';
  job_description?: string;
  date_posted?: string;
}

type Row = {
  id: string
  job_id: string
  job_title: string
  pdf_path: string
  applicant_comment: string
  hr_comment: string
  submitted_at: string
  status: 'for_review' | 'shortlisted' | 'for_interview' | 'hired' | 'rejected'
  updated_at?: string
  hr_comment_at?: string
  hr_comment_by?: {
    first_name: string
    last_name: string
    role: string
  }
  applicant_id?: string
  interview_date?: string
  interview_status?: 'scheduled' | 'completed' | 'cancelled'
  interview_notes?: string
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
      validateFile: () => ({ valid: false, error: 'Not available during SSR' }),
      testMobileUpload: async () => ({ success: false, message: 'Not available during SSR' }),
      signOut: async () => {},
      checkRecentApplication: async () => ({ canApply: true, message: '' })
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

const MobileErrorToast = ({ errors, onDismiss }: { errors: AppError[], onDismiss: (index: number) => void }) => {
  if (errors.length === 0) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50 space-y-2">
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
                {error.type === 'NETWORK' ? 'Connection Issue' : 
                 error.type === 'AUTH' ? 'Sign In Required' : 
                 error.type === 'FILE' ? 'File Error' :
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
  )
}

const StatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { color: string, icon: string, text: string }> = {
    'for_review': { color: 'bg-blue-100 text-blue-800', icon: '⏳', text: 'Under Review' },
    'shortlisted': { color: 'bg-green-100 text-green-800', icon: '✅', text: 'Shortlisted' },
    'for_interview': { color: 'bg-purple-100 text-purple-800', icon: '👔', text: 'Interview' },
    'hired': { color: 'bg-emerald-100 text-emerald-800', icon: '🏆', text: 'Hired' },
    'rejected': { color: 'bg-red-100 text-red-800', icon: '❌', text: 'Not Selected' }
  }
  
  const config = configs[status] || { color: 'bg-gray-100 text-gray-800', icon: '📋', text: status }
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </span>
  )
}

const MobileLoadingOverlay = ({ message, progress }: { message: string, progress?: number }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center p-4">
    <div className="bg-white rounded-xl p-6 max-w-sm w-full">
      <div className="flex flex-col items-center">
        <div className="h-16 w-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin mb-4"></div>
        <p className="text-gray-900 font-medium text-center mb-2">{message}</p>
        {progress !== undefined && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{progress}%</p>
          </>
        )}
        <p className="text-xs text-gray-500 text-center mt-3">Please wait...</p>
      </div>
    </div>
  </div>
)

const JobDetailsPreview = ({ job, onClose }: { 
  job: Job | null, 
  onClose: () => void 
}) => {
  if (!job) return null

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const parseDescription = (description?: string) => {
    if (!description) return 'No description available.'
    
    const lines = description.split('\n').filter(line => line.trim())
    return lines.map((line, index) => (
      <p key={index} className="mb-2 text-gray-700">{line}</p>
    ))
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Job Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              📍 {job.location || 'Location not specified'}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              🏢 {job.department || 'Department not specified'}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
              📅 Posted: {formatDate(job.date_posted)}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
            <div className="prose max-w-none">
              {parseDescription(job.job_description)}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">About this Position</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Review the job description above before applying.</p>
              <p>Make sure your resume matches the requirements.</p>
              <p>You can add additional notes in the application form.</p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 rounded-lg transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}

const EditApplicationForm = ({ 
  application, 
  onUpdate, 
  onCancel,
  submitting,
  uploadProgress 
}: { 
  application: Row,
  onUpdate: (file: File | null, comment: string) => Promise<void>,
  onCancel: () => void,
  submitting: boolean,
  uploadProgress: number
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [comment, setComment] = useState<string>(application.applicant_comment || '')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const selectedFile = files[0]
      
      if (selectedFile.type !== 'application/pdf') {
        alert('Only PDF files are allowed')
        return
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
      }
      
      setFile(selectedFile)
    }
  }

  const handleSubmit = async () => {
    if (!file) {
      alert('Please select a new PDF file to update')
      return
    }
    await onUpdate(file, comment)
  }

  const handleClear = () => {
    setFile(null)
    setComment('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Update Resume (PDF) *</p>
        <div className="flex items-center gap-3">
          <label className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="border border-gray-300 rounded-lg px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  {file ? `✓ ${file.name}` : 'Select new PDF file'}
                </span>
                <span className="text-gray-400">📄</span>
              </div>
            </div>
          </label>
          {file && (
            <button
              onClick={handleClear}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">Current file: {application.pdf_path.split('/').pop()}</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Update Notes (Optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Update your notes for HR..."
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>

      {uploadProgress > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !file}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {submitting ? 'Updating...' : 'Update Application'}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

const MobileDebugButton = ({ onTest }: { onTest: () => void }) => {
  const [show, setShow] = useState(false)
  
  useEffect(() => {
    const isAndroid = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent)
    const isIOS = typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
    setShow(isAndroid || isIOS)
  }, [])
  
  if (!show) return null
  
  return (
    <button
      onClick={onTest}
      className="fixed bottom-24 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg z-50 hover:bg-purple-700 active:bg-purple-800 transition-colors"
      title="Test Mobile Upload"
    >
      🧪 Test
    </button>
  )
}

function RequirementsContent() {
  const params = useSearchParams()
  const initPos = params.get('position') || '—'
  const router = useRouter()

  const [jobs, setJobs] = useState<Job[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [applicantComment, setApplicantComment] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null)
  const [editingApplication, setEditingApplication] = useState<Row | null>(null)
  const [position, setPosition] = useState<string>(initPos)
  const [rows, setRows] = useState<Row[]>([])
  const [loadingTable, setLoadingTable] = useState<boolean>(false)
  const [loadingJobs, setLoadingJobs] = useState<boolean>(false)
  const [errors, setErrors] = useState<AppError[]>([])
  const [success, setSuccess] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState<boolean>(false)
  const [cooldownData, setCooldownData] = useState({
    canApply: true,
    nextAvailableTime: null as Date | null,
    message: '',
    todaysCount: 0
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [applicantFunctions, setApplicantFunctions] = useState<any>(null)
  const [loadingFunctions, setLoadingFunctions] = useState(false)
  
  const [mobileLoading, setMobileLoading] = useState({
    show: false,
    message: '',
    progress: 0
  })
  const [uploadProgress, setUploadProgress] = useState<number>(0)

  const [selectedJobPreview, setSelectedJobPreview] = useState<Job | null>(null)

  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [rowUploadProgress, setRowUploadProgress] = useState<number>(0)
  const [rowSubmitting, setRowSubmitting] = useState<boolean>(false)

  const [isAndroid, setIsAndroid] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAndroid(/Android/i.test(navigator.userAgent))
      setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent))
    }
  }, [])

  const addError = useCallback((error: AppError) => {
    setErrors(prev => {
      const isDuplicate = prev.some(e => 
        e.type === error.type && 
        e.message === error.message &&
        Date.now() - (e.timestamp?.getTime() || 0) < 5000
      )
      return isDuplicate ? prev : [...prev, { ...error, timestamp: new Date() }]
    })
  }, [])

  const removeError = useCallback((index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index))
  }, [])

  const showMobileLoading = useCallback((message: string, progress?: number) => {
    setMobileLoading({
      show: true,
      message,
      progress: progress || 0
    })
  }, [])

  const hideMobileLoading = useCallback(() => {
    setMobileLoading({
      show: false,
      message: '',
      progress: 0
    })
  }, [])

  const checkNetworkSpeed = useCallback(async (): Promise<'fast' | 'slow' | 'unknown'> => {
    if ('connection' in navigator && 'effectiveType' in (navigator as any).connection) {
      const connection = (navigator as any).connection;
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        return 'slow';
      }
      return 'fast';
    }
    return 'unknown';
  }, [])

  const testMobileUpload = async () => {
    if (!applicantFunctions) return;
    
    showMobileLoading('Testing mobile upload...', 10);
    
    try {
      const testResult = await applicantFunctions.testMobileUpload();
      
      if (testResult.success) {
        setSuccess(`✅ ${testResult.message}`);
      } else {
        addError({
          type: 'NETWORK',
          message: `Upload test failed: ${testResult.error || 'Unknown error'}`,
          retryable: true
        });
      }
    } catch (error: any) {
      addError({
        type: 'NETWORK',
        message: 'Mobile test error: ' + (error.message || 'Unknown error'),
        details: error.toString(),
        retryable: true
      });
    } finally {
      hideMobileLoading();
    }
  };

  useEffect(() => {
    const loadFunctions = async () => {
      try {
        setLoadingFunctions(true)
        if (isAndroid || isIOS) showMobileLoading('Loading application portal...')
        
        const functions = await loadApplicantFunctions()
        setApplicantFunctions(functions)
        
      } catch (error: any) {
        addError({
          type: 'LOADING',
          message: 'Failed to load application functions',
          details: error?.message,
          retryable: true
        })
      } finally {
        setLoadingFunctions(false)
        if (isAndroid || isIOS) hideMobileLoading()
      }
    }

    loadFunctions()
  }, [isAndroid, isIOS, addError, showMobileLoading, hideMobileLoading])

  useEffect(() => {
    if (!applicantFunctions || loadingFunctions) return

    const checkAuth = async () => {
      try {
        if (isAndroid || isIOS) showMobileLoading('Checking authentication...')
        
        const user = await applicantFunctions.getCurrentUser()
        if (!user) {
          addError({
            type: 'AUTH',
            message: 'Please sign in to access the application portal',
            retryable: false
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
          retryable: true
        })
      } finally {
        if (isAndroid || isIOS) hideMobileLoading()
      }
    }

    checkAuth()
  }, [applicantFunctions, loadingFunctions, router, isAndroid, isIOS, addError, showMobileLoading, hideMobileLoading])

  useEffect(() => {
    if (!authChecked || !applicantFunctions) return

    let alive = true

    const loadData = async () => {
      try {
        if (isAndroid || isIOS) showMobileLoading('Loading data...', 0)
        
        setLoadingJobs(true)
        setLoadingTable(true)
        
        if (isAndroid || isIOS) showMobileLoading('Loading available jobs...', 30)
        const activeJobs = await applicantFunctions.listActiveJobs()
        
        if (!alive) return
        
        if (isAndroid || isIOS) showMobileLoading('Loading your applications...', 60)
        const myApplications = await applicantFunctions.listMyApplications()
        
        if (!alive) return

        const formattedJobs = (activeJobs || []).map((job: any) => ({
          id: job.id,
          job_title: job.job_title,
          department: job.department,
          location: job.location,
          job_description: job.job_description,
          status: job.status,
          date_posted: job.date_posted
        }))
        
        const formattedApplications = (myApplications || []).map((app: any) => ({
          id: app.id,
          job_id: app.job_id,
          job_title: app.job_title || 'Unknown Position',
          pdf_path: app.pdf_path,
          applicant_comment: app.applicant_comment || '',
          hr_comment: app.hr_comment || '',
          submitted_at: app.submitted_at,
          status: app.status || 'for_review',
          updated_at: app.updated_at,
          hr_comment_at: app.hr_comment_at,
          hr_comment_by: app.hr_comment_by,
          applicant_id: app.applicant_id
        }))
        
        if (!alive) return

        if (isAndroid || isIOS) showMobileLoading('Finalizing...', 90)
        
        setJobs(formattedJobs)
        setRows(formattedApplications)

        if (initPos && initPos !== '—') {
          const match = formattedJobs.find((j: any) => j.job_title === initPos)
          if (match) {
            setJobId(match.id)
            setPosition(match.job_title)
          }
        }

        await checkSpamProtection(formattedApplications)

      } catch (e: any) {
        if (alive) {
          addError({
            type: 'LOADING',
            message: 'Failed to load job data and applications',
            details: e?.message,
            retryable: true
          })
        }
      } finally {
        if (alive) {
          setLoadingJobs(false)
          setLoadingTable(false)
          if (isAndroid || isIOS) {
            setTimeout(() => hideMobileLoading(), 500)
          }
        }
      }
    }

    loadData()

    return () => {
      alive = false
    }
  }, [authChecked, applicantFunctions, initPos, isAndroid, isIOS, addError, showMobileLoading, hideMobileLoading])

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

  const handleJobSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedJobId = e.target.value || null
    setJobId(selectedJobId)
    
    if (selectedJobId) {
      const selected = jobs.find(j => j.id === selectedJobId)
      if (selected) {
        setPosition(selected.job_title)
        setSelectedJobPreview(selected)
      }
    } else {
      setPosition('—')
    }
  }

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) {
      setFile(null)
      return
    }

    const f = files[0]
    
    setErrors([])
    setSuccess(null)
    setUploadProgress(0)
    
    if (isAndroid || isIOS) {
      showMobileLoading('Processing PDF file...', 10)
    }

    try {
      if (applicantFunctions?.validateFile) {
        const validation = applicantFunctions.validateFile(f)
        if (!validation.valid) {
          addError({
            type: 'FILE',
            message: validation.error || 'Invalid file',
            retryable: true
          })
          setFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
          return
        }
      } else {
        if (f.type !== 'application/pdf') {
          addError({
            type: 'FILE',
            message: 'Only PDF files are allowed.',
            retryable: false
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
            message: 'File size must be less than 10MB.',
            retryable: false
          })
          setFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
          return
        }

        if (f.size === 0) {
          addError({
            type: 'FILE',
            message: 'File appears to be empty. Please try selecting a different file.',
            retryable: true
          })
          setFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
          return
        }
      }

      if (isAndroid) {
        setUploadProgress(30)
        showMobileLoading('Checking file...', 30)
        
        await new Promise(resolve => setTimeout(resolve, 200))
        
        try {
          const reader = new FileReader()
          await new Promise((resolve, reject) => {
            reader.onload = resolve
            reader.onerror = reject
            reader.readAsArrayBuffer(f.slice(0, 512))
          })
          
          setUploadProgress(60)
          showMobileLoading('File ready!', 60)
          
        } catch (readError) {
          console.error('File read error:', readError)
          addError({
            type: 'FILE',
            message: 'File may be corrupted. Try selecting it again.',
            retryable: true
          })
          setFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
          return
        }
      }
      
      setFile(f)
      setUploadProgress(100)
      
      if (isAndroid || isIOS) {
        showMobileLoading('✅ Ready to upload!', 100)
        setTimeout(() => hideMobileLoading(), 500)
      }
      
    } catch (error: any) {
      console.error('File pick error:', error)
      addError({
        type: 'FILE',
        message: isAndroid || isIOS
          ? 'File selection issue. Try opening PDF first, then share to this app'
          : 'Failed to process file',
        details: error.message,
        retryable: true
      })
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } finally {
      if ((isAndroid || isIOS) && !file) {
        hideMobileLoading()
      }
      
      setTimeout(() => {
        setUploadProgress(0)
      }, 1000)
    }
  }

  const handleEditClick = (application: Row) => {
    if (application.status !== 'for_review') {
      addError({
        type: 'VALIDATION',
        message: `Cannot edit application with status: ${application.status}`,
        details: 'Only applications "Under Review" can be edited',
        retryable: false
      })
      return
    }
    
    setEditingRowId(application.id)
    setEditingApplicationId(application.id)
    setEditingApplication(application)
  }

  const handleCancelEdit = () => {
    setEditingRowId(null)
    setEditingApplicationId(null)
    setEditingApplication(null)
    setRowUploadProgress(0)
    setRowSubmitting(false)
  }

  const handleRowUpdate = async (file: File | null, comment: string) => {
    if (!applicantFunctions || !editingApplicationId || !editingApplication || !file) {
      return
    }

    try {
      setRowSubmitting(true)
      setRowUploadProgress(10)

      const progressInterval = setInterval(() => {
        setRowUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 20
        })
      }, 300)

      await applicantFunctions.updateApplication(editingApplicationId, { 
        file, 
        applicant_comment: comment 
      })

      clearInterval(progressInterval)
      setRowUploadProgress(100)

      setTimeout(async () => {
        try {
          const myApplications = await applicantFunctions.listMyApplications()
          const formattedApplications = (myApplications || []).map((app: any) => ({
            id: app.id,
            job_id: app.job_id,
            job_title: app.job_title || 'Unknown Position',
            pdf_path: app.pdf_path,
            applicant_comment: app.applicant_comment || '',
            hr_comment: app.hr_comment || '',
            submitted_at: app.submitted_at,
            status: app.status || 'for_review',
            updated_at: app.updated_at,
            hr_comment_at: app.hr_comment_at,
            hr_comment_by: app.hr_comment_by,
            applicant_id: app.applicant_id
          }))
          
          setRows(formattedApplications)
          await checkSpamProtection(formattedApplications)
          
          setSuccess('Application updated successfully!')
        } catch (refreshError) {
          console.error('Failed to refresh data:', refreshError)
        } finally {
          handleCancelEdit()
        }
      }, 1000)

    } catch (e: any) {
      console.error('Update error:', e)
      
      addError({
        type: 'SUBMISSION',
        message: 'Failed to update application',
        details: e.message,
        retryable: true
      })
    } finally {
      setRowSubmitting(false)
    }
  }

  async function onSubmit() {
    if (!applicantFunctions) {
      addError({
        type: 'LOADING',
        message: 'Application functions not loaded',
        retryable: true
      })
      return
    }

    setErrors([])
    setSuccess(null)
    setUploadProgress(0)

    if (!editingApplicationId) {
      if (!jobId) {
        addError({
          type: 'VALIDATION',
          message: 'Please select a job position',
          retryable: false
        })
        return
      }
      
      if (!cooldownData.canApply && cooldownData.message) {
        addError({
          type: 'VALIDATION',
          message: cooldownData.message,
          details: cooldownData.nextAvailableTime ? `Available in ${formatTimeRemaining(cooldownData.nextAvailableTime)}` : undefined,
          retryable: false
        })
        return
      }
      
      if (!file) {
        addError({
          type: 'VALIDATION',
          message: 'Please select a PDF file',
          retryable: false
        })
        return
      }
    }

    try {
      setSubmitting(true)
      
      const networkSpeed = await checkNetworkSpeed()
      if (networkSpeed === 'slow' && (isAndroid || isIOS)) {
        showMobileLoading('Slow network detected. Upload may take longer...', 5)
      } else if (isAndroid || isIOS) {
        showMobileLoading('Preparing upload...', 10)
      }

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval)
            return 85
          }
          const newProgress = Math.min(prev + 15, 85)
          if (isAndroid || isIOS) {
            showMobileLoading('Uploading PDF...', newProgress)
          }
          return newProgress
        })
      }, 300)

      const result = await applicantFunctions.submitApplication({ 
        job_id: jobId!, 
        file: file!, 
        applicant_comment: applicantComment
      })
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      if (isAndroid || isIOS) showMobileLoading('Finalizing...', 100)
      
      setSuccess(`✅ Application submitted! Reference: #${result}`)
      
      setTimeout(() => {
        setFile(null)
        setApplicantComment('')
        setUploadProgress(0)
        setJobId(null)
        setPosition('—')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        if (isAndroid || isIOS) {
          setTimeout(() => hideMobileLoading(), 500)
        }
      }, 1000)
      
      setTimeout(async () => {
        try {
          if (isAndroid || isIOS) showMobileLoading('Refreshing...', 0)
          
          const myApplications = await applicantFunctions.listMyApplications()
          const formattedApplications = (myApplications || []).map((app: any) => ({
            id: app.id,
            job_id: app.job_id,
            job_title: app.job_title || 'Unknown Position',
            pdf_path: app.pdf_path,
            applicant_comment: app.applicant_comment || '',
            hr_comment: app.hr_comment || '',
            submitted_at: app.submitted_at,
            status: app.status || 'for_review',
            updated_at: app.updated_at,
            hr_comment_at: app.hr_comment_at,
            hr_comment_by: app.hr_comment_by,
            applicant_id: app.applicant_id
          }))
          
          setRows(formattedApplications)
          await checkSpamProtection(formattedApplications)
          
        } catch (refreshError) {
          console.error('Failed to refresh data:', refreshError)
        } finally {
          if (isAndroid || isIOS) {
            setTimeout(() => hideMobileLoading(), 500)
          }
        }
      }, 1500)
      
    } catch (e: any) {
      console.error('Submission error:', e)
      setUploadProgress(0)
      if (isAndroid || isIOS) hideMobileLoading()
      
      let errorType: AppError['type'] = 'SUBMISSION'
      let userMessage = e.message || 'An error occurred. Please try again.'
      
      if (isAndroid || isIOS) {
        if (e.message.includes('network') || e.message.includes('fetch')) {
          errorType = 'NETWORK'
          userMessage = '📶 Network issue. Check connection and try again.'
        } else if (e.message.includes('size')) {
          errorType = 'FILE'
          userMessage = '📁 File too large (max 10MB). Try compressing the PDF.'
        } else if (e.message.includes('type') || e.message.includes('pdf')) {
          errorType = 'FILE'
          userMessage = '📄 Only PDF files allowed. Make sure file ends with .pdf'
        } else if (e.message.includes('permission')) {
          errorType = 'AUTH'
          userMessage = '🔑 Permission error. Try logging out and back in.'
        } else if (e.message.includes('storage') || e.message.includes('bucket')) {
          errorType = 'FILE'
          userMessage = '💾 Storage error. Please try again or contact support.'
        }
      } else {
        if (e.message.includes('cooldown') || e.message.includes('limit')) {
          errorType = 'VALIDATION'
          userMessage = e.message
        } else if (e.message.includes('authenticated')) {
          errorType = 'AUTH'
          userMessage = 'Session expired. Please sign in again.'
          setTimeout(() => router.push('/login?next=/applicant/requirements'), 2000)
        }
      }
      
      addError({
        type: errorType,
        message: userMessage,
        details: e.message,
        retryable: true
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
    setUploadProgress(0)
    setJobId(null)
    setPosition('—')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    if (errors.length > 0) {
      const timer = setTimeout(() => {
        setErrors(prev => prev.slice(1))
      }, 8000)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {mobileLoading.show && <MobileLoadingOverlay message={mobileLoading.message} progress={mobileLoading.progress} />}

      {(isAndroid || isIOS) && <MobileErrorToast errors={errors} onDismiss={removeError} />}

      <MobileDebugButton onTest={testMobileUpload} />

      {selectedJobPreview && (
        <JobDetailsPreview 
          job={selectedJobPreview}
          onClose={() => setSelectedJobPreview(null)}
        />
      )}

      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Link href="/applicant" className="p-2 hover:bg-gray-100 rounded-lg">
                <span className="text-gray-600">←</span>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Job Applications</h1>
                <p className="text-sm text-gray-600">Apply for positions and manage your applications</p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (applicantFunctions?.signOut) {
                  await applicantFunctions.signOut();
                  router.push('/login');
                }
              }}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {!(isAndroid || isIOS) && errors.length > 0 && (
          <div className="mb-4 space-y-2">
            {errors.map((error, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
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
                  </div>
                  <button
                    onClick={() => removeError(index)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!editingApplicationId && !cooldownData.canApply && cooldownData.message && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-600">⏰</span>
              <p className="text-sm text-amber-800">{cooldownData.message}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">My Applications</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{rows.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Daily Limit</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {cooldownData.todaysCount}/{MAX_APPLICATIONS_PER_DAY}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">New Application</h2>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Position *
                <span className="text-xs text-gray-500 ml-1">(Click to view details)</span>
              </label>
              <select
                value={jobId || ''}
                onChange={handleJobSelect}
                disabled={loadingJobs}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white disabled:bg-gray-50"
              >
                <option value="">Choose a job position...</option>
                {jobs
                  .filter(job => job.status === 'active')
                  .map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.job_title} - {job.department}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Resume (PDF) *
              </label>
              
              <label
                htmlFor="file-upload"
                className={`
                  block border-2 border-dashed border-gray-300 rounded-xl p-6 
                  hover:border-blue-400 transition-colors bg-white 
                  active:bg-gray-50 cursor-pointer
                  ${submitting ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={onPick}
                  className="hidden"
                  id="file-upload"
                  disabled={submitting}
                />
                
                <div className="flex flex-col items-center justify-center">
                  <span className="text-gray-400 text-2xl mb-3">📄</span>
                  
                  {file ? (
                    <div className="text-center">
                      <p className="text-base font-medium text-gray-900 truncate max-w-full">
                        ✓ {file.name}
                      </p>
                      <p className="text-sm text-green-600 mt-2">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-base text-gray-600 mb-1">
                        {isAndroid || isIOS ? 'Tap to select PDF' : 'Click to select PDF'}
                      </p>
                      <p className="text-sm text-gray-500">Maximum 10MB</p>
                      <p className="text-xs text-gray-400 mt-2">Resume or CV in PDF format</p>
                    </div>
                  )}
                </div>
              </label>
              
              {uploadProgress > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{submitting ? 'Uploading...' : 'Processing...'}</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={applicantComment}
                onChange={(e) => setApplicantComment(e.target.value)}
                placeholder="Add any comments or notes for HR..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base resize-none"
              />
            </div>

            <button
              onClick={onSubmit}
              disabled={submitting || !file || !jobId}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-base transition-colors touch-manipulation"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {uploadProgress > 0 ? `Uploading (${uploadProgress}%)` : 'Processing...'}
                </div>
              ) : 'Submit Application'}
            </button>

            <button
              onClick={clearForm}
              disabled={!file && !applicantComment && !jobId}
              className="w-full border border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-medium py-3 rounded-lg mt-3 text-base touch-manipulation"
            >
              Clear Form
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">My Applications</h2>
            <button
              onClick={async () => {
                setLoadingTable(true)
                if (isAndroid || isIOS) showMobileLoading('Refreshing applications...')
                try {
                  const myApplications = await applicantFunctions.listMyApplications()
                  const formattedApplications = (myApplications || []).map((app: any) => ({
                    id: app.id,
                    job_id: app.job_id,
                    job_title: app.job_title || 'Unknown Position',
                    pdf_path: app.pdf_path,
                    applicant_comment: app.applicant_comment || '',
                    hr_comment: app.hr_comment || '',
                    submitted_at: app.submitted_at,
                    status: app.status || 'for_review',
                    updated_at: app.updated_at,
                    hr_comment_at: app.hr_comment_at,
                    hr_comment_by: app.hr_comment_by,
                    applicant_id: app.applicant_id
                  }))
                  
                  setRows(formattedApplications)
                  await checkSpamProtection(formattedApplications)
                } finally {
                  setLoadingTable(false)
                  if (isAndroid || isIOS) hideMobileLoading()
                }
              }}
              disabled={loadingTable}
              className="text-sm text-blue-600 hover:text-blue-800 active:text-blue-900 flex items-center gap-1 touch-manipulation"
            >
              {loadingTable ? (
                <>
                  <span className="h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                  Refreshing...
                </>
              ) : '↻ Refresh'}
            </button>
          </div>

          {loadingTable ? (
            <div className="text-center py-8">
              <LoadingSpinner />
              <p className="mt-2 text-gray-600">Loading applications...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <span className="text-gray-300 text-4xl mb-3 block">📋</span>
              <p className="text-gray-500">No applications yet</p>
              <p className="text-sm text-gray-400 mt-1">Submit your first application above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((row) => (
                <div key={row.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{row.job_title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-gray-600">
                                {jobs.find(j => j.id === row.job_id)?.department || 'Unknown Department'}
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="text-sm text-gray-600">
                                Applied on {new Date(row.submitted_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <StatusBadge status={row.status} />
                          </div>
                        </div>
                        
                        {row.applicant_comment && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Your notes:</span> {row.applicant_comment}
                          </div>
                        )}
                        
                        {row.hr_comment && (
                          <div className="mt-2 text-sm text-blue-600">
                            <span className="font-medium">HR comment:</span> {row.hr_comment}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-3">
                        {row.status === 'for_review' && editingRowId !== row.id && (
                          <button
                            onClick={() => handleEditClick(row)}
                            className="text-green-600 hover:text-green-800 active:text-green-900 text-sm font-medium px-4 py-2 border border-green-600 rounded-lg hover:bg-green-50"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {editingRowId === row.id && (
                      <EditApplicationForm
                        application={row}
                        onUpdate={handleRowUpdate}
                        onCancel={handleCancelEdit}
                        submitting={rowSubmitting}
                        uploadProgress={rowUploadProgress}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-16 sm:h-0"></div>
      </div>
    </div>
  )
}