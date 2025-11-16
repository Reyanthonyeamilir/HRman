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
import { Loader2, FileText, AlertCircle, CheckCircle2, Download, LogOut } from 'lucide-react'
import { listActiveJobs, submitApplication, listMyApplications, getSignedUrl, getCurrentUser } from '@/lib/applicant'

type Job = { id: string; job_title: string }
type Row = {
  id: string
  job_id: string
  job_title: string
  job_status: string
  pdf_path: string
  comment: string
  submitted_at: string
}

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
      } catch (e: any) {
        console.error('Failed to load data:', e)
        if (alive) {
          setError(e?.message || 'Failed to load data')
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

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setSubmittedFlag(false)
    setError(null)
  }

  async function onSubmit() {
    if (!jobId) {
      setError('Please choose a job first.')
      return
    }
    if (!file) {
      setError('Please attach a PDF of your requirements.')
      return
    }
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      const id = await submitApplication({ job_id: jobId, file, comment })
      
      setSubmittedFlag(true)
      setFile(null)
      setComment('')
      setSuccess(`Application submitted successfully! Reference #${id}`)

      // Refresh the applications list
      const data = await listMyApplications()
      setRows(data as Row[])
      
    } catch (e: any) {
      console.error('[submitApplication] failed:', e)
      setError(e?.message ?? 'Submission failed. Please try again.')
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
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Submit Requirements</h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload your application materials for job positions
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
                submittedFlag ? 'text-green-600' : 'text-blue-600'
              }`}>
                {submittedFlag ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {submittedFlag ? 'Submitted' : 'Draft'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mx-auto max-w-4xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 mx-auto max-w-4xl">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Form Card */}
      <Card className="border-blue-100 shadow-sm mx-auto max-w-4xl">
        <CardHeader className="bg-blue-50 border-b border-blue-100">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Application Materials
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-4">
          {/* Form Grid - Responsive */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            {/* Job Select */}
            <div className="grid gap-2 md:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium text-gray-700">Select Job Position</label>
              <Select
                value={jobId || ''}
                onValueChange={(v: string) => {
                  setJobId(v || null)
                  const title = jobs.find(j => j.id === v)?.job_title ?? '—'
                  setPosition(title)
                  setError(null)
                }}
                disabled={loadingJobs}
              >
                <SelectTrigger className="w-full">
                  {loadingJobs ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading jobs...
                    </div>
                  ) : (
                    <SelectValue placeholder="Choose a job position…" />
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
            </div>

            {/* File Input */}
            <div className="grid gap-2 md:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium text-gray-700">
                Attachment (PDF)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Input 
                type="file" 
                accept="application/pdf" 
                onChange={onPick}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500">
                Maximum file size: 10MB. Only PDF files accepted.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 md:col-span-2 lg:col-span-1 lg:flex-col lg:items-end lg:justify-end">
              <Button
                className="bg-blue-600 hover:bg-blue-700 min-w-[140px]"
                onClick={onSubmit}
                disabled={submitting || !file || jobId === null || loadingJobs}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={clearForm}
                disabled={submitting || (!file && !comment)}
                className="min-w-[140px]"
              >
                Clear Form
              </Button>
            </div>
          </div>

          {/* Comment Section */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">
              Additional Comments (Optional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add any additional notes or comments for the HR team…"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Selected File Preview */}
          {file && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-blue-900 truncate">{file.name}</p>
                  <p className="text-sm text-blue-700">
                    Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applications History */}
      <div className="space-y-4 mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Your Application History</h2>
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
                    <TableHead className="font-semibold hidden sm:table-cell">Job Status</TableHead>
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
                            <p className="text-sm">Your submitted applications will appear here.</p>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => <SubmissionRow key={r.id} row={r} />)
                  )}
                </TableBody>
              </Table>
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

function SubmissionRow({ row }: { row: Row }) {
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
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      unknown: 'bg-yellow-100 text-yellow-800'
    }
    
    return (
      <Badge variant="secondary" className={statusColors[status as keyof typeof statusColors] || statusColors.unknown}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="max-w-[150px] sm:max-w-[200px] truncate" title={row.job_title}>
          {row.job_title}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {getStatusBadge(row.job_status)}
      </TableCell>
      <TableCell className="hidden lg:table-cell max-w-[200px]">
        <div className="truncate text-sm text-gray-600" title={row.pdf_path}>
          {row.pdf_path.split('/').pop() || '—'}
        </div>
      </TableCell>
      <TableCell className="hidden xl:table-cell max-w-[250px]">
        <div className="truncate text-sm" title={row.comment}>
          {row.comment || '—'}
        </div>
      </TableCell>
      <TableCell className="text-sm text-gray-600">
        <div className="max-w-[120px] truncate" title={formatDate(row.submitted_at)}>
          {formatDate(row.submitted_at)}
        </div>
      </TableCell>
      <TableCell className="text-right">
        {loadingUrl ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400 mx-auto" />
        ) : url ? (
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1">
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">View</span>
            </a>
          </Button>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}

// Export the main component
export default function RequirementsPage() {
  return <RequirementsContent />
}