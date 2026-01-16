'use client'

import { Suspense } from 'react'

export default function RequirementsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-gray-50 to-white">
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

import * as React from 'react'
import Link from 'next/link'
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
  Loader2, FileText, AlertCircle, CheckCircle2, 
  Clock, Edit, X, MessageSquare, Calendar,
  Building, MapPin, Eye, RefreshCw, Upload,
  AlertTriangle, Info, ChevronLeft, FileUp, Briefcase,
  ArrowLeft, ChevronDown, Users, Search, Filter
} from 'lucide-react'

type AppError = {
  type: 'AUTH' | 'NETWORK' | 'VALIDATION' | 'SUBMISSION' | 'LOADING' | 'FILE';
  message: string;
  details?: string;
  retryable?: boolean;
  timestamp?: Date;
}

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

const ErrorDisplay = ({ 
  error, 
  onRetry, 
  onDismiss 
}: { 
  error: AppError; 
  onRetry?: () => void; 
  onDismiss?: () => void;
}) => {
  const getErrorConfig = (type: AppError['type']) => {
    const configs = {
      AUTH: {
        icon: AlertCircle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        title: 'Authentication Error'
      },
      NETWORK: {
        icon: AlertCircle,
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800',
        title: 'Connection Error'
      },
      VALIDATION: {
        icon: AlertTriangle,
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800',
        title: 'Validation Error'
      },
      SUBMISSION: {
        icon: X,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        title: 'Submission Failed'
      },
      LOADING: {
        icon: RefreshCw,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        title: 'Loading Error'
      },
      FILE: {
        icon: FileText,
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800',
        title: 'File Error'
      }
    }
    return configs[type] || configs.NETWORK
  }

  const config = getErrorConfig(error.type)
  const Icon = config.icon

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 mb-4 animate-in fade-in duration-300`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 ${config.textColor}`} />
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{config.title}</h4>
          <p className={`text-sm ${config.textColor}`}>{error.message}</p>
          {error.details && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Technical details
              </summary>
              <code className="text-xs text-gray-600 mt-1 block bg-white/50 p-2 rounded">
                {error.details}
              </code>
            </details>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {error.retryable && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-xs"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SubmissionRow({ 
  row, 
  onEdit,
  isEditing,
  applicantFunctions
}: { 
  row: Row
  onEdit: () => void
  isEditing: boolean
  applicantFunctions: any
}) {
  const [url, setUrl] = React.useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = React.useState<boolean>(false)

  React.useEffect(() => {
    let alive = true
    setLoadingUrl(true)
    
    ;(async () => {
      if (!row.pdf_path || !applicantFunctions) {
        setLoadingUrl(false)
        return
      }
      try {
        const u = await applicantFunctions.getSignedUrl(row.pdf_path)
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
  }, [row.pdf_path, applicantFunctions])

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
      <Badge variant="outline" className={`${config.color} font-medium px-2 py-1 text-xs`}>
        <span className="mr-1">{config.icon}</span>
        {displayStatus}
      </Badge>
    )
  }

  const canEdit = row.status === 'for_review'

  return (
    <TableRow className={`${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'} transition-colors`}>
      <TableCell className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isEditing ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Briefcase className={`h-4 w-4 ${isEditing ? 'text-blue-600' : 'text-gray-500'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate text-sm">{row.job_title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{row.job_status}</div>
            {isEditing && (
              <Badge className="mt-1 bg-blue-100 text-blue-700 border-blue-300 text-xs">
                Currently Editing
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-3 px-4">
        {getStatusBadge(row.status || row.job_status)}
      </TableCell>
      <TableCell className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="text-sm text-gray-600">
            {new Date(row.submitted_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {loadingUrl ? (
            <div className="h-7 w-7 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin"></div>
          ) : url ? (
            <Button 
              variant="outline" 
              size="sm"
              asChild
              className="border-gray-300 hover:bg-gray-50 h-7 px-2"
            >
              <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">View</span>
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
              className={`h-7 px-2 ${
                isEditing 
                  ? 'bg-blue-100 text-blue-700 border-blue-300' 
                  : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Edit className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs ml-1">Edit</span>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

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
  const [errors, setErrors] = React.useState<AppError[]>([])
  const [success, setSuccess] = React.useState<string | null>(null)

  // auth state
  const [authChecked, setAuthChecked] = React.useState<boolean>(false)

  // Spam protection state
  const [cooldownData, setCooldownData] = React.useState<{
    canApply: boolean;
    nextAvailableTime: Date | null;
    message: string;
    todaysCount: number;
  }>({ 
    canApply: true, 
    nextAvailableTime: null, 
    message: '',
    todaysCount: 0
  })

  // File input reference
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Load applicant functions only on client side
  const [applicantFunctions, setApplicantFunctions] = React.useState<any>(null)
  const [loadingFunctions, setLoadingFunctions] = React.useState(true)

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

  const removeError = React.useCallback((index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index))
  }, [])

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
        
        await checkSpamProtection(myApplications as Row[])

      } catch (e: any) {
        console.error('Failed to load data:', e)
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
  }, [initPos, authChecked, applicantFunctions, addError])

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
    setSubmittedFlag(false)
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

    if (file) {
      if (file.type !== 'application/pdf') {
        addError({
          type: 'FILE',
          message: 'Only PDF files are allowed',
          retryable: false,
          timestamp: new Date()
        })
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        addError({
          type: 'FILE',
          message: 'File size must be less than 10MB',
          retryable: false,
          timestamp: new Date()
        })
        return
      }
    } else if (!editingApplicationId) {
      addError({
        type: 'VALIDATION',
        message: 'Please attach a PDF file',
        retryable: false,
        timestamp: new Date()
      })
      return
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
      
      setSubmittedFlag(true)
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
    setSubmittedFlag(false)
    setErrors([])
    setSuccess(null)
    setEditingApplicationId(null)
    setEditingApplication(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleEditApplication = async (application: Row) => {
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
    if (jobId && !editingApplicationId && applicantFunctions) {
      checkSpamProtection(rows)
    }
  }, [jobId, editingApplicationId, applicantFunctions, rows])

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
      <div className="flex justify-center items-center min-h-[60vh] bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="h-16 w-16 rounded-full border-4 border-blue-100"></div>
            <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading Application Portal...</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">Please wait while we prepare your dashboard</p>
        </div>
      </div>
    )
  }

  // Get selected job details for better display
  const selectedJob = jobs.find(j => j.id === jobId)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header with Back Button */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <Link href="/applicant">
                <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
                <Button variant="ghost" size="icon" className="sm:hidden">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Requirements & Applications</h1>
                <p className="text-sm text-gray-600 mt-1">Submit and manage your job applications</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/applicant/job-postings">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">View Jobs</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Error Display Area */}
        {errors.length > 0 && (
          <div className="mb-6 space-y-3">
            {errors.map((error, index) => (
              <ErrorDisplay
                key={`${error.type}-${error.timestamp?.getTime()}-${index}`}
                error={error}
                onRetry={() => {
                  removeError(index)
                  if (error.type === 'NETWORK' || error.type === 'LOADING') {
                    window.location.reload()
                  }
                }}
                onDismiss={() => removeError(index)}
              />
            ))}
          </div>
        )}

        {/* Cooldown Warning */}
        {!editingApplicationId && !cooldownData.canApply && cooldownData.message && (
          <Alert className="mb-6 bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
            <Clock className="h-5 w-5 text-amber-600" />
            <AlertDescription className="ml-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="font-medium text-amber-900">{cooldownData.message}</span>
                  {cooldownData.todaysCount > 0 && (
                    <p className="text-sm text-amber-700 mt-1">
                      Today's applications: {cooldownData.todaysCount}/{MAX_APPLICATIONS_PER_DAY}
                    </p>
                  )}
                </div>
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

        {/* Success Alert */}
        {success && (
          <Alert className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="ml-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="font-medium text-green-800">{success}</span>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  {editingApplicationId ? 'File Updated' : 'Application Submitted'}
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="border-blue-100 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Applications</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{rows.length}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-100 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Available Positions</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{jobs.length}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-100 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Daily Limit</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                    {cooldownData.todaysCount}/{MAX_APPLICATIONS_PER_DAY}
                  </p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Form Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {editingApplicationId ? 'Update Application' : 'Submit New Application'}
              </h2>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                {editingApplicationId ? 'Replace your application file' : 'Apply for available positions'}
              </p>
            </div>
            {editingApplicationId && (
              <Button
                variant="outline"
                onClick={clearForm}
                className="w-full sm:w-auto"
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Edit
              </Button>
            )}
          </div>

          {/* Status Card */}
          <Card className="mb-6 border-blue-100 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
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
                    <p className="text-base sm:text-lg font-semibold text-gray-900">
                      {selectedJob?.job_title || position}
                    </p>
                    {selectedJob && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedJob.department && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            <Building className="h-3 w-3 mr-1" />
                            {selectedJob.department}
                          </Badge>
                        )}
                        {selectedJob.location && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            {selectedJob.location}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
              
              {editingApplication && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Edit className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">
                        Editing: <span className="font-bold">{editingApplication.job_title}</span>
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Submitted on {new Date(editingApplication.submitted_at).toLocaleDateString()}
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

          {/* Form Card */}
          <Card id="application-form" className="border-gray-200 shadow-sm">
            <CardHeader className="bg-white border-b p-4 sm:p-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileUp className="h-5 w-5 text-blue-600" />
                {editingApplicationId ? 'Replace Application File' : 'Application Form'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              {/* Form Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Job Select - Professional Design */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    Select Position <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Select
                      value={jobId || ''}
                      onValueChange={(v: string) => {
                        setJobId(v || null)
                        const selectedJob = jobs.find(j => j.id === v)
                        setPosition(selectedJob?.job_title ?? '—')
                        setErrors(prev => prev.filter(e => e.type !== 'VALIDATION'))
                      }}
                      disabled={loadingJobs || editingApplicationId !== null}
                    >
                      <SelectTrigger className="w-full h-12 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between w-full">
                          {loadingJobs ? (
                            <div className="flex items-center gap-3">
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              <span className="text-gray-500">Loading positions...</span>
                            </div>
                          ) : editingApplicationId ? (
                            <div className="flex items-center gap-3">
                              <Building className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-gray-700">{position}</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <Briefcase className="h-4 w-4 text-gray-400" />
                                <SelectValue 
                                  placeholder="Choose a job position..." 
                                  className="placeholder:text-gray-400"
                                />
                              </div>
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            </>
                          )}
                        </div>
                      </SelectTrigger>
                      <SelectContent 
                        className="bg-white border border-gray-200 shadow-lg rounded-lg mt-1 p-0 max-h-[350px] overflow-y-auto"
                        position="popper"
                        sideOffset={5}
                      >
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-3 py-2">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Search className="h-4 w-4" />
                            <span>{jobs.length} positions available</span>
                          </div>
                        </div>
                        
                        {jobs.length === 0 ? (
                          <div className="py-8 text-center">
                            <Briefcase className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No positions available</p>
                          </div>
                        ) : (
                          jobs.map(j => (
                            <SelectItem 
                              key={j.id} 
                              value={j.id} 
                              className="py-3 px-4 hover:bg-blue-50 focus:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-b-0 transition-colors"
                            >
                              <div className="flex flex-col">
                                <div className="flex items-start justify-between">
                                  <span className="font-medium text-gray-900">{j.job_title}</span>
                                  {jobId === j.id && (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-2 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex flex-col gap-1 mt-2">
                                  {j.department && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <Building className="h-3 w-3" />
                                      <span>{j.department}</span>
                                    </div>
                                  )}
                                  {j.location && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <MapPin className="h-3 w-3" />
                                      <span>{j.location}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    
                    {!loadingJobs && jobs.length > 0 && !editingApplicationId && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Select a position from {jobs.length} available jobs
                      </p>
                    )}
                  </div>
                </div>

                {/* File Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    PDF Requirements <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <Input 
                      ref={fileInputRef}
                      type="file" 
                      accept="application/pdf" 
                      onChange={onPick}
                      className="h-12 cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 bg-white"
                      required
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Upload className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <AlertCircle className="h-3 w-3" />
                    <span>Maximum file size: 10MB • PDF format only</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3 md:col-span-2">
                  <Button
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all"
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
                      'Replace File & Update Application'
                    ) : (
                      'Submit Application'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearForm}
                    disabled={submitting || (!file && !applicantComment && !editingApplicationId)}
                    className="w-full h-12 border-gray-300 hover:bg-gray-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {editingApplicationId ? 'Cancel Edit' : 'Clear Form'}
                  </Button>
                </div>
              </div>

              {/* Comment Section */}
              {!editingApplicationId && (
                <div className="space-y-3 pt-6 border-t border-gray-200">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    Additional Comments (Optional)
                  </label>
                  <Textarea
                    value={applicantComment}
                    onChange={(e) => setApplicantComment(e.target.value)}
                    placeholder="Add any additional notes or comments for the HR team..."
                    rows={3}
                    className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    Comments are only for new applications and cannot be edited later
                  </p>
                </div>
              )}

              {/* File Preview */}
              {file && (
                <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{file.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600">
                            Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                          <span className="text-sm text-blue-600 font-medium">PDF Document</span>
                        </div>
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
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 font-medium">
                        ⚠️ This will replace your current uploaded file
                      </p>
                    </div>
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
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Application History</h2>
              <p className="text-gray-600 mt-1">Track and manage all your submitted applications</p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                setLoadingTable(true)
                try {
                  const data = await applicantFunctions.listMyApplications()
                  setRows(data as Row[])
                  await checkSpamProtection(data as Row[])
                } catch (error: any) {
                  addError({
                    type: 'LOADING',
                    message: 'Failed to refresh applications',
                    details: error.message,
                    retryable: true,
                    timestamp: new Date()
                  })
                } finally {
                  setLoadingTable(false)
                }
              }}
              disabled={loadingTable}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingTable ? 'animate-spin' : ''}`} />
              Refresh List
            </Button>
          </div>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-0">
              {loadingTable ? (
                <div className="p-8 text-center">
                  <div className="h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin mx-auto"></div>
                  <p className="text-gray-600 font-medium mt-4">Loading applications...</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg font-medium mt-4">No applications yet</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Submit your first application using the form above
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700 py-4">Job Title</TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4">Submitted</TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <SubmissionRow 
                          key={r.id} 
                          row={r} 
                          onEdit={() => handleEditApplication(r)}
                          isEditing={editingApplicationId === r.id}
                          applicantFunctions={applicantFunctions}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}