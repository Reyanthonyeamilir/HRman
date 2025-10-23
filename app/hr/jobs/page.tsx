"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Briefcase, ClipboardList, Image as ImageIcon, X, Pencil, Trash2, Menu, Search, MoreVertical } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'
import HRSidebar from '@/components/HRSidebar'

// Types based on your schema
type JobStatus = 'active' | 'closed'

interface JobPosting {
  id: string
  job_title: string
  department: string | null
  location: string | null
  job_description: string | null
  image_path: string | null
  date_posted: string
  status: JobStatus
  created_by: string
}

export default function HRJobsPage() {
  const pathname = usePathname()
  const [jobs, setJobs] = React.useState<JobPosting[]>([])
  const [loading, setLoading] = React.useState(true)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [formLoading, setFormLoading] = React.useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [mobileActionMenu, setMobileActionMenu] = React.useState<string | null>(null)

  const [formData, setFormData] = React.useState({
    job_title: '',
    department: '',
    location: '',
    job_description: '',
    status: 'active' as JobStatus
  })

  // Fetch jobs from Supabase
  const fetchJobs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .order('date_posted', { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
      alert('Error fetching job postings')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { 
    fetchJobs() 
  }, [])

  // Filter jobs based on search term
  const filteredJobs = jobs.filter(job =>
    job.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Upload image to Supabase Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `job-postings/${fileName}`

      const { data, error } = await supabase.storage
        .from('job-images')
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('job-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    }
  }

  // CREATE - Add new job posting
  const handleCreate = async () => {
    if (!formData.job_title.trim()) {
      alert('Job title is required')
      return
    }

    setFormLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in to create job postings')

      let imagePath = null

      // Upload image if selected
      if (file) {
        imagePath = await uploadImage(file)
      }

      // Insert new job posting
      const { data, error } = await supabase
        .from('job_postings')
        .insert({
          job_title: formData.job_title,
          department: formData.department || null,
          location: formData.location || null,
          job_description: formData.job_description || null,
          image_path: imagePath,
          status: formData.status,
          created_by: user.id
        })
        .select()

      if (error) throw error

      setModalOpen(false)
      setFile(null)
      await fetchJobs()
      alert('Job posting created successfully!')
    } catch (error: any) {
      console.error('Error creating job:', error)
      alert('Error creating job: ' + error.message)
    } finally {
      setFormLoading(false)
    }
  }

  // UPDATE - Edit job posting
  const handleUpdate = async () => {
    if (!editId || !formData.job_title.trim()) {
      alert('Job title is required')
      return
    }

    setFormLoading(true)
    try {
      let imagePath = null

      // Upload new image if selected
      if (file) {
        imagePath = await uploadImage(file)
      }

      // Update job posting
      const { error } = await supabase
        .from('job_postings')
        .update({
          job_title: formData.job_title,
          department: formData.department || null,
          location: formData.location || null,
          job_description: formData.job_description || null,
          ...(imagePath && { image_path: imagePath }),
          status: formData.status
        })
        .eq('id', editId)

      if (error) throw error

      setModalOpen(false)
      setFile(null)
      await fetchJobs()
      alert('Job posting updated successfully!')
    } catch (error: any) {
      console.error('Error updating job:', error)
      alert('Error updating job: ' + error.message)
    } finally {
      setFormLoading(false)
    }
  }

  // DELETE - Remove job posting
  const handleDelete = async (jobId: string, jobTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`)) return
    
    try {
      // Get job to check for image
      const job = jobs.find(j => j.id === jobId)
      
      // Check if there are applications for this job
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', jobId)

      if (appsError) throw appsError

      if (applications && applications.length > 0) {
        if (!confirm(`This job has ${applications.length} application(s). Deleting will remove all associated applications. Continue?`)) {
          return
        }

        // Delete applications first
        const { error: deleteAppsError } = await supabase
          .from('applications')
          .delete()
          .eq('job_id', jobId)

        if (deleteAppsError) throw deleteAppsError
      }

      // Delete image from storage if exists
      if (job?.image_path) {
        try {
          const imagePath = job.image_path.split('/').pop()
          if (imagePath) {
            await supabase.storage
              .from('job-images')
              .remove([`job-postings/${imagePath}`])
          }
        } catch (error) {
          console.error('Error deleting image:', error)
        }
      }

      // Delete the job posting
      const { error } = await supabase
        .from('job_postings')
        .delete()
        .eq('id', jobId)

      if (error) throw error

      await fetchJobs()
      alert('Job posting deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting job:', error)
      alert('Error deleting job: ' + error.message)
    }
  }

  // TOGGLE STATUS - Activate/Close job
  const handleToggleStatus = async (job: JobPosting) => {
    try {
      const newStatus: JobStatus = job.status === 'active' ? 'closed' : 'active'
      
      const { error } = await supabase
        .from('job_postings')
        .update({ status: newStatus })
        .eq('id', job.id)

      if (error) throw error

      await fetchJobs()
      alert(`Job ${newStatus === 'active' ? 'activated' : 'closed'} successfully!`)
    } catch (error: any) {
      console.error('Error updating job status:', error)
      alert('Error updating job status: ' + error.message)
    }
  }

  const openNew = () => {
    setEditId(null)
    setFormData({
      job_title: '',
      department: '',
      location: '',
      job_description: '',
      status: 'active'
    })
    setFile(null)
    setPreviewUrl(null)
    setModalOpen(true)
  }

  const openEdit = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId)
    if (!job) return

    setEditId(jobId)
    setFormData({
      job_title: job.job_title || '',
      department: job.department || '',
      location: job.location || '',
      job_description: job.job_description || '',
      status: job.status
    })
    setFile(null)
    setPreviewUrl(job.image_path)
    setModalOpen(true)
    setMobileActionMenu(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }

      setFile(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
    }
  }

  const removeImage = () => {
    setFile(null)
    setPreviewUrl(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0078D4] via-[#1e3a8a] to-[#0b1b3a]">
      <div className="min-h-screen bg-gradient-to-br from-[#0078D4]/20 via-[#1e3a8a]/40 to-[#0b1b3a]/80 py-4 text-white">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            
            {/* HRSidebar Component */}
            <HRSidebar 
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />

            {/* Main Content */}
            <section className="min-h-screen">
              {/* Mobile Header */}
              <div className="flex items-center gap-4 mb-6 lg:hidden">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="border-white/30 text-[#eaf2ff] hover:bg-white/10"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-white">Job Postings</h1>
                  <p className="text-[#c7d7ff] text-sm">Manage and create job opportunities</p>
                </div>
              </div>

              {/* Desktop Welcome Section */}
              <div className="hidden lg:block mb-8">
                <h1 className="text-2xl font-bold text-white">Job Postings</h1>
                <p className="text-[#c7d7ff] mt-2">Manage and create job opportunities</p>
              </div>

              {/* Header Section - Mobile Optimized */}
              <div className="mb-4 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-center sm:text-left">
                    <h1 className="text-lg font-bold text-white sm:text-xl">Job Postings</h1>
                    <p className="text-[#c7d7ff] mt-1 text-xs sm:text-sm">Manage and create job opportunities</p>
                  </div>
                  <Button 
                    onClick={openNew} 
                    className="bg-[#0078D4] hover:bg-[#106EBE] text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-medium transition-colors duration-200 shadow-lg w-full sm:w-auto text-xs sm:text-sm"
                  >
                    ＋ Create Job
                  </Button>
                </div>

                {/* Search Bar - Mobile Optimized */}
                <div className="relative w-full max-w-md mx-auto sm:mx-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#c7d7ff] h-3 w-3 sm:h-4 sm:w-4" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 sm:py-2 rounded-lg border border-[#93c5fd] bg-white/10 text-white placeholder-[#c7d7ff] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Jobs Section - Mobile First */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-white/10 border-b border-white/10">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-[#bfdbfe]">Job Details</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-[#bfdbfe]">Department</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-[#bfdbfe]">Location</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-[#bfdbfe]">Date Posted</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-[#bfdbfe]">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-[#bfdbfe]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-white/80">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0078D4]"></div>
                            </div>
                            <p className="mt-2 text-xs">Loading job postings...</p>
                          </td>
                        </tr>
                      ) : filteredJobs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-white/80 text-xs">
                            {searchTerm ? 'No jobs found matching your search.' : 'No job postings yet.'}
                          </td>
                        </tr>
                      ) : (
                        filteredJobs.map((job) => (
                          <DesktopJobRow 
                            key={job.id} 
                            job={job} 
                            onEdit={openEdit}
                            onToggleStatus={handleToggleStatus}
                            onDelete={handleDelete}
                            formatDate={formatDate}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2 p-3">
                  {loading ? (
                    <div className="text-center py-6 text-white/80">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0078D4]"></div>
                      </div>
                      <p className="mt-2 text-xs">Loading job postings...</p>
                    </div>
                  ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-6 text-white/80 text-xs">
                      {searchTerm ? 'No jobs found matching your search.' : 'No job postings yet.'}
                    </div>
                  ) : (
                    filteredJobs.map((job) => (
                      <MobileJobCard
                        key={job.id}
                        job={job}
                        onEdit={openEdit}
                        onToggleStatus={handleToggleStatus}
                        onDelete={handleDelete}
                        formatDate={formatDate}
                        isMenuOpen={mobileActionMenu === job.id}
                        onMenuToggle={() => setMobileActionMenu(mobileActionMenu === job.id ? null : job.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <JobModal
          editId={editId}
          formData={formData}
          setFormData={setFormData}
          formLoading={formLoading}
          previewUrl={previewUrl}
          file={file}
          onFileChange={handleFileChange}
          onRemoveImage={removeImage}
          onSave={editId ? handleUpdate : handleCreate}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

/* Desktop Job Row Component */
function DesktopJobRow({ 
  job, 
  onEdit, 
  onToggleStatus, 
  onDelete, 
  formatDate 
}: { 
  job: JobPosting
  onEdit: (id: string) => void
  onToggleStatus: (job: JobPosting) => void
  onDelete: (id: string, title: string) => void
  formatDate: (date: string) => string
}) {
  return (
    <tr className="border-b border-white/10 hover:bg-white/5 transition-colors duration-150">
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          {job.image_path ? (
            <img 
              src={job.image_path} 
              alt="" 
              className="h-8 w-8 rounded object-cover ring-1 ring-white/20" 
            />
          ) : (
            <div className="h-8 w-8 rounded bg-gradient-to-br from-[#0078D4] to-[#1C89D1] flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
          )}
          <div>
            <div className="font-medium text-white text-xs sm:text-sm">{job.job_title}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-white text-xs">
        {job.department || '—'}
      </td>
      <td className="px-3 py-3 text-white text-xs">
        {job.location || '—'}
      </td>
      <td className="px-3 py-3 text-[#c7d7ff] text-xs">
        {formatDate(job.date_posted)}
      </td>
      <td className="px-3 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          job.status === 'active' 
            ? 'bg-green-500/20 text-green-300' 
            : 'bg-red-500/20 text-red-300'
        }`}>
          {job.status === 'active' ? 'Active' : 'Closed'}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(job.id)}
            className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 transition-colors duration-200"
          >
            <Pencil className="h-3 w-3" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={() => onToggleStatus(job)}
            className={`rounded px-2 py-1 text-xs text-white transition-colors duration-200 ${
              job.status === 'active' 
                ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300' 
                : 'bg-green-500/20 hover:bg-green-500/30 text-green-300'
            }`}
          >
            <span className="hidden sm:inline">
              {job.status === 'active' ? 'Close' : 'Activate'}
            </span>
            <span className="sm:hidden">
              {job.status === 'active' ? 'Close' : 'Open'}
            </span>
          </button>
          <button
            onClick={() => onDelete(job.id, job.job_title)}
            className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30 transition-colors duration-200"
          >
            <Trash2 className="h-3 w-3" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </td>
    </tr>
  )
}

/* Mobile Job Card Component */
function MobileJobCard({ 
  job, 
  onEdit, 
  onToggleStatus, 
  onDelete, 
  formatDate,
  isMenuOpen,
  onMenuToggle
}: { 
  job: JobPosting
  onEdit: (id: string) => void
  onToggleStatus: (job: JobPosting) => void
  onDelete: (id: string, title: string) => void
  formatDate: (date: string) => string
  isMenuOpen: boolean
  onMenuToggle: () => void
}) {
  return (
    <div className="bg-white/5 rounded border border-white/10 p-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-1">
          {job.image_path ? (
            <img 
              src={job.image_path} 
              alt="" 
              className="h-8 w-8 rounded object-cover ring-1 ring-white/20" 
            />
          ) : (
            <div className="h-8 w-8 rounded bg-gradient-to-br from-[#0078D4] to-[#1C89D1] flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white text-xs truncate">{job.job_title}</h3>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {job.department && (
                <span className="text-[10px] text-[#c7d7ff] bg-white/10 px-1.5 py-0.5 rounded">
                  {job.department}
                </span>
              )}
              {job.location && (
                <span className="text-[10px] text-[#c7d7ff] bg-white/10 px-1.5 py-0.5 rounded">
                  {job.location}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-[#c7d7ff]">
              <span>{formatDate(job.date_posted)}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full ${
                job.status === 'active' 
                  ? 'bg-green-500/20 text-green-300' 
                  : 'bg-red-500/20 text-red-300'
              }`}>
                {job.status === 'active' ? 'Active' : 'Closed'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Mobile Actions Menu */}
        <div className="relative">
          <button
            onClick={onMenuToggle}
            className="p-1 rounded hover:bg-white/10 transition-colors duration-200"
          >
            <MoreVertical className="h-3 w-3 text-[#c7d7ff]" />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 top-6 z-10 w-28 bg-[#0f2a6a] border border-white/20 rounded shadow-lg py-1">
              <button
                onClick={() => onEdit(job.id)}
                className="w-full text-left px-2 py-1.5 text-xs text-white hover:bg-white/10 flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
              <button
                onClick={() => onToggleStatus(job)}
                className="w-full text-left px-2 py-1.5 text-xs text-white hover:bg-white/10"
              >
                {job.status === 'active' ? 'Close' : 'Activate'}
              </button>
              <button
                onClick={() => onDelete(job.id, job.job_title)}
                className="w-full text-left px-2 py-1.5 text-xs text-red-300 hover:bg-red-500/20 flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Modal Component - Mobile Optimized */
function JobModal({
  editId,
  formData,
  setFormData,
  formLoading,
  previewUrl,
  file,
  onFileChange,
  onRemoveImage,
  onSave,
  onClose
}: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-gradient-to-b from-[#0f2a6a] to-[#0b1b3a] border border-[#93c5fd] shadow-xl max-h-[90vh] overflow-hidden">
        <header className="flex items-center justify-between border-b border-white/20 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">
            {editId == null ? "Create Job" : "Edit Job"}
          </h3>
          <button 
            onClick={onClose}
            className="rounded p-1 hover:bg-white/10 transition-colors duration-200"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          <div className="grid gap-3">
            <Field label="Title *">
              <input
                className="w-full rounded border border-[#93c5fd] bg-white/10 p-2 text-white placeholder-[#c7d7ff] focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:border-transparent text-xs"
                value={formData.job_title}
                onChange={e => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="Enter job title"
              />
            </Field>

            <Field label="Department">
              <input
                className="w-full rounded border border-[#93c5fd] bg-white/10 p-2 text-white placeholder-[#c7d7ff] focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:border-transparent text-xs"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                placeholder="Enter department"
              />
            </Field>

            <Field label="Location">
              <input
                className="w-full rounded border border-[#93c5fd] bg-white/10 p-2 text-white placeholder-[#c7d7ff] focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:border-transparent text-xs"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter location"
              />
            </Field>

            <Field label="Status">
              <select
                className="w-full rounded border border-[#93c5fd] bg-white/10 p-2 text-white focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:border-transparent text-xs"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as JobStatus })}
              >
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </Field>

            <Field label="Image">
              <label className="flex cursor-pointer items-center gap-2 rounded border border-[#93c5fd] bg-white/10 p-2 hover:bg-white/15 transition-colors duration-200 text-xs">
                <ImageIcon className="h-3 w-3 text-[#c7d7ff]" />
                <span className="text-white truncate flex-1">
                  {file?.name ?? 'Choose image...'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />
              </label>
              {previewUrl && (
                <div className="relative mt-2 inline-block">
                  <img 
                    src={previewUrl} 
                    alt="preview" 
                    className="h-16 w-16 rounded object-cover ring-1 ring-white/20" 
                  />
                  <button
                    type="button"
                    onClick={onRemoveImage}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors duration-200"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </div>
              )}
            </Field>

            <Field label="Description">
              <textarea
                className="w-full rounded border border-[#93c5fd] bg-white/10 p-2 text-white placeholder-[#c7d7ff] focus:outline-none focus:ring-1 focus:ring-[#0078D4] focus:border-transparent text-xs"
                rows={3}
                value={formData.job_description}
                onChange={e => setFormData({ ...formData, job_description: e.target.value })}
                placeholder="Enter job description"
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-4 py-3 border-t border-white/20">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded border border-white/30 bg-transparent px-3 py-2 text-white hover:bg-white/10 transition-colors duration-200 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={formLoading || !formData.job_title.trim()}
              className="flex-1 rounded bg-[#0078D4] px-3 py-2 font-medium text-white hover:bg-[#106EBE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-xs shadow-lg"
            >
              {formLoading ? 'Saving...' : 'Save Job'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-[#c7d7ff]">{label}</span>
      {children}
    </label>
  )
}