'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listActiveJobs, submitApplication, listMyApplications, updateApplication, getSignedUrl } from '@/lib/applicant'

type Job = { id: string; job_title: string }

type Application = {
  id: string
  job_id: string
  job_title: string
  pdf_path: string
  google_drive_link: string | null
  applicant_comment: string
  hr_comment: string
  submitted_at: string
  status: 'for_review' | 'shortlisted' | 'for_interview' | 'hired' | 'rejected'
}

const StatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { bg: string; text: string }> = {
    'for_review': { bg: 'bg-yellow-100', text: 'Under Review' },
    'shortlisted': { bg: 'bg-green-100', text: 'Shortlisted' },
    'for_interview': { bg: 'bg-blue-100', text: 'Interview' },
    'hired': { bg: 'bg-emerald-100', text: 'Hired' },
    'rejected': { bg: 'bg-red-100', text: 'Rejected' }
  }
  const config = configs[status] || { bg: 'bg-gray-100', text: status }
  return <Badge className={config.bg}>{config.text}</Badge>
}

function RequirementsContent() {
  const router = useRouter()
  const params = useSearchParams()
  const initPos = params.get('position') || '—'

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [jobs, setJobs] = React.useState<Job[]>([])
  const [jobId, setJobId] = React.useState<string | null>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [comment, setComment] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [applications, setApplications] = React.useState<Application[]>([])
  const [position, setPosition] = React.useState(initPos)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editFile, setEditFile] = React.useState<File | null>(null)
  const [editComment, setEditComment] = React.useState('')
  const [editProgress, setEditProgress] = React.useState(0)
  const editFileInputRef = React.useRef<HTMLInputElement>(null)
  const [pdfUrls, setPdfUrls] = React.useState<Record<string, string>>({})
  const [isMobile, setIsMobile] = React.useState(false)
  const [useGoogleDrive, setUseGoogleDrive] = React.useState(false)
  const [googleDriveLink, setGoogleDriveLink] = React.useState('')

  // Load jobs and applications on mount
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        
        // Detect mobile
        const userAgent = navigator.userAgent
        const mobile = /Android|iPhone|iPad|iPod|webOS/i.test(userAgent)
        setIsMobile(mobile)
        
        const [jobsList, appList] = await Promise.all([
          listActiveJobs(),
          listMyApplications()
        ])
        setJobs(jobsList || [])
        setApplications(appList || [])
        
        // Pre-fetch signed URLs for all PDFs
        if (appList && appList.length > 0) {
          const urls: Record<string, string> = {}
          for (const app of appList) {
            try {
              const url = await getSignedUrl(app.pdf_path)
              urls[app.id] = url
            } catch (err) {
              console.warn('Failed to get signed URL for', app.pdf_path)
            }
          }
          setPdfUrls(urls)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleJobSelect = (jobId: string) => {
    setJobId(jobId)
    const selected = jobs.find(j => j.id === jobId)
    if (selected) setPosition(selected.job_title)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return

    if (f.type !== 'application/pdf') {
      setError('Only PDF files are allowed')
      return
    }
    if (f.size === 0) {
      setError('File is empty')
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('File too large (max 50MB)')
      return
    }

    setError(null)
    setFile(f)
  }

  const handleSubmit = async () => {
    if (!jobId) {
      setError('Please select a job position')
      return
    }

    if (useGoogleDrive) {
      if (!googleDriveLink.trim()) {
        setError('Please enter a Google Drive link')
        return
      }
      if (!googleDriveLink.includes('drive.google.com') && !googleDriveLink.includes('docs.google.com')) {
        setError('Invalid Google Drive link')
        return
      }
    } else {
      if (!file) {
        setError('Please select a PDF file')
        return
      }
    }

    try {
      setSubmitting(true)
      setUploading(true)
      setError(null)
      setUploadProgress(0)

      // For PDF file upload
      if (!useGoogleDrive && file) {
        await submitApplication({
          job_id: jobId,
          file,
          applicant_comment: comment,
          google_drive_link: null,
          onProgress: (prog: number) => setUploadProgress(prog)
        })
      } else {
        // For Google Drive link submission
        await submitApplication({
          job_id: jobId,
          file: null,
          applicant_comment: comment,
          google_drive_link: googleDriveLink.trim(),
          onProgress: (prog: number) => setUploadProgress(prog)
        })
      }

      setSuccess('✅ Application submitted successfully!')
      setFile(null)
      setGoogleDriveLink('')
      setComment('')
      setJobId(null)
      setPosition('—')
      setUseGoogleDrive(false)
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Refresh list
      const updated = await listMyApplications()
      setApplications(updated || [])
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setSubmitting(false)
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return

    if (f.type !== 'application/pdf') {
      setError('Only PDF files are allowed')
      return
    }
    if (f.size === 0) {
      setError('File is empty')
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('File too large (max 50MB)')
      return
    }

    setError(null)
    setEditFile(f)
  }

  const handleEditSubmit = async (appId: string) => {
    if (!editFile) {
      setError('Please select a file to update')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setEditProgress(0)

      await updateApplication(appId, {
        file: editFile,
        applicant_comment: editComment
      })

      setSuccess('✅ Application updated successfully!')
      setEditingId(null)
      setEditFile(null)
      setEditComment('')
      if (editFileInputRef.current) editFileInputRef.current.value = ''

      // Refresh list
      const updated = await listMyApplications()
      setApplications(updated || [])
    } catch (err: any) {
      setError(err.message || 'Update failed')
    } finally {
      setSubmitting(false)
      setEditProgress(0)
    }
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditFile(null)
    setEditComment('')
    setEditProgress(0)
    if (editFileInputRef.current) editFileInputRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 text-sm"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600 mt-2">Submit your resume for open positions</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
            {success}
          </div>
        )}

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>New Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Job Select */}
            <div>
              <label className="block text-sm font-medium mb-2">Select Position *</label>
              <select
                value={jobId || ''}
                onChange={(e) => handleJobSelect(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Choose a job...</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.job_title}
                  </option>
                ))}
              </select>
            </div>

            {/* Upload Method Toggle */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Choose Your Submission Method *</p>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!useGoogleDrive}
                    onChange={() => setUseGoogleDrive(false)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">📄 PDF File</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={useGoogleDrive}
                    onChange={() => setUseGoogleDrive(true)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">🔗 Google Drive Link</span>
                </label>
              </div>
              <p className="text-xs text-gray-600">💡 Choose either option - both are equally accepted. PDF uploads instantly, Google Drive links require no file transfer.</p>
            </div>

            {/* PDF File Upload */}
            {!useGoogleDrive && (
              <div>
                <label className="block text-sm font-medium mb-2">Upload Resume (PDF) *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <div className="text-gray-400 text-3xl mb-2">📄</div>
                    {file ? (
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-green-600">✓ Ready to upload</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-700 font-medium">Click or drag & drop your PDF</p>
                        <p className="text-sm text-gray-500 mt-1">Max 50MB • Recommended: under 20MB</p>
                      </div>
                    )}
                  </label>
                </div>
                <p className="text-xs text-gray-600 mt-2">📌 Upload is instant and secure. HR will receive your file immediately.</p>
              </div>
            )}

            {/* Google Drive Link Input */}
            {useGoogleDrive && (
              <div>
                <label className="block text-sm font-medium mb-2">Google Drive Link *</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={googleDriveLink}
                    onChange={(e) => setGoogleDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... or https://docs.google.com/..."
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="text-blue-900 font-medium mb-2">📌 How to share your Google Drive link:</p>
                  <ol className="text-blue-800 text-xs space-y-1 ml-4">
                    <li>1. Right-click your file/folder in Google Drive</li>
                    <li>2. Click "Share" and set to "Viewer" access</li>
                    <li>3. Change from "Restricted" to "Anyone with the link can view"</li>
                    <li>4. Copy the link and paste it above</li>
                  </ol>
                  <p className="text-blue-700 text-xs mt-2">✓ Works with: Files, Folders, Docs, Sheets, Slides</p>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {uploadProgress > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add any notes for HR..."
                rows={3}
                className="w-full border rounded-lg px-3 py-2 resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!jobId || !file || submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              {submitting ? 'Uploading...' : 'Submit Application'}
            </Button>
          </CardContent>
        </Card>

        {/* Applications List */}
        <div>
          <h2 className="text-xl font-bold mb-4">My Applications ({applications.length})</h2>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No applications yet
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map(app => (
                <Card key={app.id}>
                  <CardContent className="pt-6">
                    {editingId === app.id ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-gray-900">Edit Application</h3>
                          <button
                            onClick={handleEditCancel}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Update Resume (PDF)</label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <input
                              ref={editFileInputRef}
                              type="file"
                              accept="application/pdf"
                              onChange={handleEditFileChange}
                              className="hidden"
                              id={`edit-file-${app.id}`}
                            />
                            <label htmlFor={`edit-file-${app.id}`} className="cursor-pointer">
                              <div className="text-gray-400 text-2xl mb-2">📄</div>
                              {editFile ? (
                                <div>
                                  <p className="font-medium text-gray-900">{editFile.name}</p>
                                  <p className="text-sm text-green-600">Ready to update</p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-gray-700 text-sm">Click to select new PDF</p>
                                </div>
                              )}
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Update Notes</label>
                          <textarea
                            value={editComment}
                            onChange={(e) => setEditComment(e.target.value)}
                            placeholder="Update your notes for HR..."
                            rows={2}
                            className="w-full border rounded-lg px-3 py-2 resize-none"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEditSubmit(app.id)}
                            disabled={!editFile || submitting}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2"
                          >
                            {submitting ? 'Updating...' : 'Update'}
                          </Button>
                          <Button
                            onClick={handleEditCancel}
                            disabled={submitting}
                            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 py-2"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{app.job_title}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Applied: {new Date(app.submitted_at).toLocaleDateString()}
                            </p>
                            {app.applicant_comment && (
                              <p className="text-sm text-gray-700 mt-2">
                                <span className="font-medium">Notes:</span> {app.applicant_comment}
                              </p>
                            )}
                            {app.hr_comment && (
                              <p className="text-sm text-blue-700 mt-2">
                                <span className="font-medium">HR:</span> {app.hr_comment}
                              </p>
                            )}
                          </div>
                          <StatusBadge status={app.status} />
                        </div>

                        {/* PDF or Google Drive Viewer - Mobile Safe */}
                        {pdfUrls[app.id] && (
                          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">📄 Your PDF</label>
                              <a
                                href={pdfUrls[app.id]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                {isMobile ? 'Open PDF' : 'View'}
                              </a>
                            </div>
                            {!isMobile && (
                              <iframe
                                src={pdfUrls[app.id]}
                                width="100%"
                                height="300"
                                className="rounded border border-gray-300"
                              />
                            )}
                            {isMobile && (
                              <p className="text-sm text-gray-600">
                                Tap "Open PDF" above to view your submitted resume in the PDF viewer
                              </p>
                            )}
                          </div>
                        )}

                        {/* Google Drive Link */}
                        {app.google_drive_link && (
                          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-gray-700">🔗 Google Drive Link</label>
                              <a
                                href={app.google_drive_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Open in Google Drive
                              </a>
                            </div>
                          </div>
                        )}

                        {app.status === 'for_review' && (
                          <Button
                            onClick={() => {
                              setEditingId(app.id)
                              setEditComment(app.applicant_comment || '')
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2"
                          >
                            ✏️ Edit PDF
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RequirementsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <RequirementsContent />
    </Suspense>
  )
}
