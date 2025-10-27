"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Search, Download, X, Eye, User, Printer, Menu, MoreVertical, Home, Briefcase, Users, Tag, Settings } from "lucide-react"

// Updated HRSidebar component with smaller width
function HRSidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  const pathname = usePathname()
  
  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/hr/dashboard" },
    { icon: Briefcase, label: "Jobs", href: "/hr/jobs" },
    { icon: Users, label: "Applications", href: "/hr/applications" },
    { icon: Tag, label: "Tags", href: "/hr/tags" },
    { icon: Settings, label: "Settings", href: "/hr/settings" },
  ]

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform border-r border-white/10 bg-[#0f1f47] transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:transform-none
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563eb] to-[#1e40af]">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">HR Portal</span>
          </div>
          <Button
            variant="ghost"
            className="lg:hidden text-[#c7d7ff] hover:text-white"
            onClick={onMobileClose}
            size="sm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className={`
                      flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-[#2563eb] text-white shadow-lg shadow-[#2563eb]/20' 
                        : 'text-[#c7d7ff] hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#1e40af] text-xs font-medium text-white">
              HR
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">HR Manager</p>
              <p className="text-xs text-[#c7d7ff] truncate">hr@company.com</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Types based on your database schema
type Application = {
  id: string
  job_id: string
  applicant_id: string
  pdf_path: string
  comment: string | null
  submitted_at: string
  status: "For review" | "Shortlisted" | "Interview" | "Rejected" | "Hired"
  applicant?: {
    id: string
    email: string
    phone: string | null
    role: string
    created_at: string
    user_data?: {
      first_name: string
      last_name: string
    }
  }
  job_posting?: {
    id: string
    job_title: string
    department: string | null
    location: string | null
  }
}

type ApplicationStatus = "For review" | "Shortlisted" | "Interview" | "Rejected" | "Hired"

export default function HRTagPage() {
  const pathname = usePathname()
  const [applications, setApplications] = React.useState<Application[]>([])
  const [jobs, setJobs] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedJob, setSelectedJob] = React.useState("all")
  const [selectedStatus, setSelectedStatus] = React.useState("all")
  const [modalOpen, setModalOpen] = React.useState(false)
  const [pdfModalOpen, setPdfModalOpen] = React.useState(false)
  const [selectedApplication, setSelectedApplication] = React.useState<Application | null>(null)
  const [selectedPdfUrl, setSelectedPdfUrl] = React.useState("")
  const [pdfBlob, setPdfBlob] = React.useState<Blob | null>(null)
  const [pdfLoading, setPdfLoading] = React.useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)

  // Fetch applications from the HR database API
  React.useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/hr/applications')
        const data = await response.json()
        
        if (data.success) {
          setApplications(data.applications)
          // Extract unique job titles
          const jobTitles = [...new Set(data.applications
            .map((app: Application) => app.job_posting?.job_title)
            .filter(Boolean))] as string[]
          setJobs(jobTitles)
        }
      } catch (error) {
        console.error('Error fetching applications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [])

  const filteredApplications = applications.filter(app =>
    (selectedJob === "all" || app.job_posting?.job_title === selectedJob) &&
    (selectedStatus === "all" || app.status === selectedStatus) &&
    (getApplicantName(app).toLowerCase().includes(searchQuery.toLowerCase()) ||
     app.applicant?.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getApplicantName = (app: Application) => {
    if (app.applicant?.user_data) {
      return `${app.applicant.user_data.last_name}, ${app.applicant.user_data.first_name}`
    }
    // Fallback to email if name data isn't available
    return app.applicant?.email.split('@')[0] || 'Unknown Applicant'
  }

  const getApplicantEmail = (app: Application) => {
    return app.applicant?.email || 'No email available'
  }

  const openModal = (app: Application) => {
    setSelectedApplication(app)
    setModalOpen(true)
  }

  const openPdfModal = async (pdfPath: string, app: Application) => {
    setSelectedApplication(app)
    setSelectedPdfUrl(pdfPath)
    setPdfLoading(true)
    setPdfModalOpen(true)

    try {
      // Fetch the PDF blob for printing
      const response = await fetch(`/api/hr/applications/download-pdf?path=${encodeURIComponent(pdfPath)}`)
      if (response.ok) {
        const blob = await response.blob()
        setPdfBlob(blob)
      }
    } catch (error) {
      console.error('Error loading PDF:', error)
    } finally {
      setPdfLoading(false)
    }
  }

  const saveChanges = async (status: ApplicationStatus, comment: string) => {
    if (!selectedApplication) return

    try {
      const response = await fetch('/api/hr/applications/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: selectedApplication.id,
          status,
          comment,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setApplications(prev =>
          prev.map(app =>
            app.id === selectedApplication.id 
              ? { ...app, status, comment } 
              : app
          )
        )
        setModalOpen(false)
        setSelectedApplication(null)
      } else {
        console.error('Failed to update application:', data.error)
      }
    } catch (error) {
      console.error('Error updating application:', error)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      "For review": "bg-blue-500/20 text-blue-300 border-blue-400/50",
      "Shortlisted": "bg-green-500/20 text-green-300 border-green-400/50",
      "Interview": "bg-purple-500/20 text-purple-300 border-purple-400/50",
      "Rejected": "bg-red-500/20 text-red-300 border-red-400/50",
      "Hired": "bg-emerald-500/20 text-emerald-300 border-emerald-400/50"
    }
    return colors[status as keyof typeof colors] || "bg-gray-500/20 text-gray-300 border-gray-400/50"
  }

  const downloadPdf = async (pdfPath: string, applicantName: string) => {
    try {
      const response = await fetch(`/api/hr/applications/download-pdf?path=${encodeURIComponent(pdfPath)}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `${applicantName.replace(/[^a-z0-9]/gi, '_')}_application.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  const printPdf = () => {
    if (!pdfBlob) return

    const pdfUrl = URL.createObjectURL(pdfBlob)
    const printWindow = window.open(pdfUrl, '_blank')
    
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    } else {
      // Fallback: open in new tab and show print dialog
      const link = document.createElement('a')
      link.href = pdfUrl
      link.target = '_blank'
      link.click()
      
      // Note: For the fallback, user will need to manually print from the browser
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 1000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1b3b] flex items-center justify-center">
        <div className="text-white text-lg">Loading applications...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b1b3b]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0b1b3b]">
        <div className="px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden rounded-lg p-2 hover:bg-white/10 transition-colors duration-200 mr-3"
              >
                <Menu className="h-5 w-5 text-white" />
              </button>
              <div className="flex-shrink-0">
                <h1 className="text-lg font-semibold text-white">Application Status</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2 text-sm text-[#c7d7ff]">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#2563eb] to-[#1e40af] flex items-center justify-center text-xs font-medium text-white">
                  HR
                </div>
                <span>HR Manager</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex">
        {/* Sidebar - Now smaller (w-64) */}
        <HRSidebar 
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content - Adjusted to account for smaller sidebar */}
        <main className="flex-1 lg:ml-0 p-6">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Application Status</h1>
                <p className="mt-1 text-[#c7d7ff]">Manage and update applicant statuses</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 rounded-lg bg-[#11214a] border border-white/10 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-[#c7d7ff]" />
                  <input
                    type="text"
                    placeholder="Search applicants..."
                    className="w-full rounded-lg border border-white/20 bg-white/5 pl-10 pr-4 py-2 text-white placeholder-[#c7d7ff] transition-all focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <select
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white transition-all focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                >
                  <option value="all">All Jobs</option>
                  {jobs.map((job) => (
                    <option key={job} value={job}>{job}</option>
                  ))}
                </select>
                
                <select
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white transition-all focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  {["For review", "Shortlisted", "Interview", "Rejected", "Hired"].map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Applications Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredApplications.map((app) => {
              const applicantName = getApplicantName(app)
              const initials = applicantName.match(/\b\w/g) || []
              const userInitials = initials.slice(0, 2).join("").toUpperCase()
              
              return (
                <div
                  key={app.id}
                  className="group rounded-lg border border-white/10 bg-[#11214a] p-4 transition-all hover:border-white/20 hover:bg-[#1a2d5a]"
                >
                  {/* Applicant Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563eb] to-[#1e40af] font-semibold text-white text-sm">
                        {userInitials}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{applicantName}</h3>
                        <p className="text-sm text-[#c7d7ff]">{app.job_posting?.job_title || 'Unknown Job'}</p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-xs font-medium ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </div>

                  {/* Applicant Details */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-[#c7d7ff]">
                      <User className="h-3 w-3" />
                      <span className="truncate">{getApplicantEmail(app)}</span>
                    </div>
                    <div className="text-sm text-[#c7d7ff]">
                      Applied: {new Date(app.submitted_at).toLocaleDateString()}
                    </div>
                  </div>

                  {app.comment && (
                    <div className="mt-2 rounded-md bg-white/5 p-2 border border-white/10">
                      <p className="text-xs text-[#c7d7ff] line-clamp-2">{app.comment}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => openPdfModal(app.pdf_path, app)}
                      className="flex-1 gap-2 rounded-lg border border-white/20 bg-white/5 text-[#c7d7ff] transition-all hover:bg-white/10 hover:text-white text-sm"
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-3 w-3" />
                      View PDF
                    </Button>
                    <Button
                      onClick={() => openModal(app)}
                      className="flex-1 gap-2 rounded-lg bg-[#2563eb] text-white transition-all hover:bg-[#1d4ed8] text-sm"
                      size="sm"
                    >
                      Update Status
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredApplications.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-[#c7d7ff] text-lg">No applications found</div>
              <p className="text-[#94a3b8] mt-2">Try adjusting your search filters</p>
            </div>
          )}
        </main>
      </div>

      {/* Status Update Modal */}
      {modalOpen && selectedApplication && (
        <StatusModal
          application={selectedApplication}
          onClose={() => {
            setModalOpen(false)
            setSelectedApplication(null)
          }}
          onSave={saveChanges}
        />
      )}

      {/* PDF Viewer Modal */}
      {pdfModalOpen && (
        <PdfModal
          pdfUrl={selectedPdfUrl}
          pdfBlob={pdfBlob}
          pdfLoading={pdfLoading}
          applicantName={selectedApplication ? getApplicantName(selectedApplication) : 'Applicant'}
          onClose={() => {
            setPdfModalOpen(false)
            setPdfBlob(null)
            setSelectedApplication(null)
          }}
          onDownload={() => selectedApplication && downloadPdf(selectedPdfUrl, getApplicantName(selectedApplication))}
          onPrint={printPdf}
        />
      )}
    </div>
  )
}

// StatusModal with your color theme
function StatusModal({
  application,
  onClose,
  onSave,
}: {
  application: Application
  onClose: () => void
  onSave: (status: ApplicationStatus, note: string) => void
}) {
  const [status, setStatus] = React.useState<ApplicationStatus>(application.status)
  const [note, setNote] = React.useState(application.comment || "")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#11214a] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Update Status</h2>
          <Button
            variant="ghost"
            className="text-[#c7d7ff] hover:text-white"
            onClick={onClose}
            size="sm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-white">{application.applicant?.email}</h3>
            <p className="text-sm text-[#c7d7ff]">{application.job_posting?.job_title || 'Unknown Job'}</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#c7d7ff]">Status</label>
            <select
              className="w-full rounded-lg border border-white/20 bg-white/5 p-2 text-white transition-all focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
            >
              {["For review", "Shortlisted", "Interview", "Rejected", "Hired"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#c7d7ff]">Notes</label>
            <textarea
              className="w-full rounded-lg border border-white/20 bg-white/5 p-2 text-white transition-all focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any notes about this application..."
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 rounded-lg border border-white/20 bg-white/5 text-[#c7d7ff] transition-all hover:bg-white/10 hover:text-white"
              onClick={onClose}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-lg bg-[#2563eb] text-white transition-all hover:bg-[#1d4ed8]"
              onClick={() => onSave(status, note)}
              size="sm"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// PdfModal with your color theme
function PdfModal({ 
  pdfUrl, 
  pdfBlob,
  pdfLoading,
  applicantName, 
  onClose, 
  onDownload,
  onPrint
}: { 
  pdfUrl: string
  pdfBlob: Blob | null
  pdfLoading: boolean
  applicantName: string
  onClose: () => void
  onDownload: () => void
  onPrint: () => void
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col rounded-xl bg-[#11214a] border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Application PDF - {applicantName}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 rounded-lg border-white/20 bg-white/5 text-[#c7d7ff] hover:bg-white/10 hover:text-white"
              onClick={onDownload}
              disabled={pdfLoading}
              size="sm"
            >
              <Download className="h-3 w-3" />
              Download
            </Button>
            <Button
              variant="outline"
              className="gap-2 rounded-lg border-white/20 bg-white/5 text-[#c7d7ff] hover:bg-white/10 hover:text-white"
              onClick={onPrint}
              disabled={!pdfBlob || pdfLoading}
              size="sm"
            >
              <Printer className="h-3 w-3" />
              Print
            </Button>
            <Button
              variant="ghost"
              className="text-[#c7d7ff] hover:text-white"
              onClick={onClose}
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="h-full w-full rounded-lg bg-white/5 border border-white/10">
            {pdfLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                    <Eye className="h-6 w-6 text-[#c7d7ff] animate-pulse" />
                  </div>
                  <h4 className="mb-2 text-base font-medium text-white">Loading PDF...</h4>
                  <p className="text-[#c7d7ff]">Please wait while we load the document</p>
                </div>
              </div>
            ) : pdfBlob ? (
              <iframe
                ref={iframeRef}
                src={URL.createObjectURL(pdfBlob)}
                className="h-full w-full rounded-lg"
                title={`Application PDF - ${applicantName}`}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                    <Eye className="h-6 w-6 text-[#c7d7ff]" />
                  </div>
                  <h4 className="mb-2 text-base font-medium text-white">PDF Viewer</h4>
                  <p className="text-[#c7d7ff]">Application document: {pdfUrl}</p>
                  <p className="mt-2 text-sm text-[#94a3b8]">
                    This would display the actual PDF file from: {pdfUrl}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}