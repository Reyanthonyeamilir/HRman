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
  const [error, setError] = React.useState<string | null>(null)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [formLoading, setFormLoading] = React.useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [mobileActionMenu, setMobileActionMenu] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<{message: string, type: 'success' | 'error'} | null>(null)
  const [deleteConfirm, setDeleteConfirm] = React.useState<{open: boolean, job: JobPosting | null}>({open: false, job: null})

  const [formData, setFormData] = React.useState({
    job_title: '',
    department: '',
    location: '',
    job_description: '',
    status: 'active' as JobStatus
  })

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Validate form data
  const validateForm = (): string | null => {
    if (!formData.job_title.trim()) {
      return 'Job title is required'
    }
    if (formData.job_title.length > 100) {
      return 'Job title must be less than 100 characters'
    }
    if (formData.department && formData.department.length > 50) {
      return 'Department must be less than 50 characters'
    }
    if (formData.location && formData.location.length > 50) {
      return 'Location must be less than 50 characters'
    }
    return null
  }

  // Fetch jobs from Supabase
  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .order('date_posted', { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (error: any) {
      console.error('Error fetching jobs:', error)
      setError('Failed to load job postings')
      showToast('Error loading job postings', 'error')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { 
    fetchJobs() 
  }, [])

  // Real-time subscription to job postings
  React.useEffect(() => {
    const subscription = supabase
      .channel('job_postings_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'job_postings' }, 
        () => {
          fetchJobs()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
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
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('job-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      throw new Error('Failed to upload image. Please try again.')
    }
  }

  // Handle action completion
  const handleActionComplete = async () => {
    await fetchJobs()
    setModalOpen(false)
    setFile(null)
    setPreviewUrl(null)
    setFormData({
      job_title: '',
      department: '',
      location: '',
      job_description: '',
      status: 'active'
    })
  }

  // CREATE - Add new job posting
  const handleCreate = async () => {
    const validationError = validateForm()
    if (validationError) {
      showToast(validationError, 'error')
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

      await handleActionComplete()
      showToast('Job posting created successfully!', 'success')
    } catch (error: any) {
      console.error('Error creating job:', error)
      showToast('Error creating job: ' + error.message, 'error')
    } finally {
      setFormLoading(false)
    }
  }

  // UPDATE - Edit job posting
  const handleUpdate = async () => {
    const validationError = validateForm()
    if (validationError) {
      showToast(validationError, 'error')
      return
    }

    if (!editId) {
      showToast('No job selected for editing', 'error')
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
      const updateData: any = {
        job_title: formData.job_title,
        department: formData.department || null,
        location: formData.location || null,
        job_description: formData.job_description || null,
        status: formData.status
      }

      // Only update image_path if a new image was uploaded
      if (imagePath) {
        updateData.image_path = imagePath
      }

      const { error } = await supabase
        .from('job_postings')
        .update(updateData)
        .eq('id', editId)

      if (error) throw error

      await handleActionComplete()
      showToast('Job posting updated successfully!', 'success')
    } catch (error: any) {
      console.error('Error updating job:', error)
      showToast('Error updating job: ' + error.message, 'error')
    } finally {
      setFormLoading(false)
    }
  }

  // DELETE - Remove job posting from database
  const handleDelete = async (jobId: string) => {
    try {
      console.log('Starting delete process for job:', jobId);
      
      // First, check if there are any applications for this job
      const { data: applications, error: appsError, count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId);

      if (appsError) {
        console.error('Error fetching applications:', appsError);
        throw appsError;
      }

      const appCount = count || 0;
      console.log(`Found ${appCount} applications for job ${jobId}`);

      // If there are applications, delete them first due to foreign key constraint
      if (appCount > 0) {
        console.log('Deleting applications...');
        const { error: deleteAppsError } = await supabase
          .from('applications')
          .delete()
          .eq('job_id', jobId);

        if (deleteAppsError) {
          console.error('Error deleting applications:', deleteAppsError);
          throw deleteAppsError;
        }
        console.log(`Successfully deleted ${appCount} applications`);
      }

      // Get job to check for image
      const job = jobs.find(j => j.id === jobId);
      
      // Delete image from storage if exists
      if (job?.image_path) {
        try {
          console.log('Deleting image from storage...');
          // Extract the file path from the URL
          const urlParts = job.image_path.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const filePath = `job-postings/${fileName}`;
          
          console.log('Attempting to delete file:', filePath);
          const { error: storageError } = await supabase.storage
            .from('job-images')
            .remove([filePath]);

          if (storageError) {
            console.warn('Could not delete image from storage:', storageError);
            // Continue with job deletion even if image deletion fails
          } else {
            console.log('Image deleted successfully from storage');
          }
        } catch (error) {
          console.error('Error deleting image:', error);
          // Continue with job deletion even if image deletion fails
        }
      }

      // Delete the job posting from database
      console.log('Deleting job posting from database...');
      const { error } = await supabase
        .from('job_postings')
        .delete()
        .eq('id', jobId);

      if (error) {
        console.error('Error deleting job posting:', error);
        throw error;
      }

      console.log('Job posting deleted successfully from database');
      
      // Refresh the jobs list
      await fetchJobs();
      setDeleteConfirm({open: false, job: null});
      showToast('Job posting deleted successfully!', 'success');
    } catch (error: any) {
      console.error('Error in delete process:', error);
      
      // More specific error messages
      if (error.code === '23503') {
        showToast('Cannot delete job: There are still related records. Please try again.', 'error');
      } else if (error.code === '42501') {
        showToast('Permission denied: You do not have rights to delete job postings.', 'error');
      } else {
        showToast('Error deleting job: ' + error.message, 'error');
      }
    }
  }

  // Open delete confirmation
  const openDeleteConfirm = (job: JobPosting) => {
    setDeleteConfirm({open: true, job});
    setMobileActionMenu(null);
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
      showToast(`Job ${newStatus === 'active' ? 'activated' : 'closed'} successfully!`, 'success')
    } catch (error: any) {
      console.error('Error updating job status:', error)
      showToast('Error updating job status: ' + error.message, 'error')
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
    if (!job) {
      showToast('Job not found', 'error')
      return
    }

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
        showToast('Please select an image file', 'error')
        return
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        showToast('Image size should be less than 5MB', 'error')
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

  const handleSave = () => {
    if (editId) {
      handleUpdate()
    } else {
      handleCreate()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0078D4] via-[#1e3a8a] to-[#0b1b3a]">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && deleteConfirm.job && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-gradient-to-b from-[#0f2a6a] to-[#0b1b3a] border border-red-500/50 shadow-xl">
            <header className="flex items-center justify-between border-b border-white/20 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
              <button 
                onClick={() => setDeleteConfirm({open: false, job: null})}
                className="rounded p-2 hover:bg-white/10 transition-colors duration-200"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </header>

            <div className="px-6 py-4">
              <p className="text-white mb-4">
                Are you sure you want to delete the job posting <strong>"{deleteConfirm.job.job_title}"</strong>? 
                This action cannot be undone and will also delete all associated applications.
              </p>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-white/20">
              <button
                onClick={() => setDeleteConfirm({open: false, job: null})}
                className="flex-1 rounded-lg border border-white/30 bg-transparent px-4 py-2.5 text-white hover:bg-white/10 transition-colors duration-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.job!.id)}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 font-medium text-white hover:bg-red-600 transition-colors duration-200 text-sm shadow-lg"
              >
                Delete Job
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
          <HRSidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="p-4 lg:p-6">
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

            {/* Mobile Sidebar Overlay */}
            {mobileSidebarOpen && (
              <div className="fixed inset-0 z-40 lg:hidden">
                <HRSidebar 
                  mobileOpen={mobileSidebarOpen}
                  onMobileClose={() => setMobileSidebarOpen(false)}
                />
              </div>
            )}

            {/* Desktop Welcome Section */}
            <div className="hidden lg:block mb-8">
              <h1 className="text-2xl font-bold text-white">Job Postings</h1>
              <p className="text-[#c7d7ff] mt-2">Manage and create job opportunities</p>
            </div>

            {/* Header Section */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                  <h1 className="text-xl font-bold text-white sm:text-2xl">Job Postings</h1>
                  <p className="text-[#c7d7ff] mt-1 text-sm">Manage and create job opportunities</p>
                </div>
                <Button 
                  onClick={openNew} 
                  className="bg-[#0078D4] hover:bg-[#106EBE] text-white px-4 py-2 sm:px-6 sm:py-2 rounded-lg font-medium transition-colors duration-200 shadow-lg w-full sm:w-auto text-sm"
                >
                  ＋ Create Job
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#c7d7ff] h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#93c5fd] bg-white/10 text-white placeholder-[#c7d7ff] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Jobs Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/10 border-b border-white/10">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#bfdbfe]">Job Details</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#bfdbfe]">Department</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#bfdbfe]">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#bfdbfe]">Date Posted</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#bfdbfe]">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#bfdbfe]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-white/80">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078D4]"></div>
                          </div>
                          <p className="mt-2 text-sm">Loading job postings...</p>
                        </td>
                      </tr>
                    ) : filteredJobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-white/80 text-sm">
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
                          onDelete={openDeleteConfirm}
                          formatDate={formatDate}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 p-4">
                {loading ? (
                  <div className="text-center py-8 text-white/80">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0078D4]"></div>
                    </div>
                    <p className="mt-2 text-sm">Loading job postings...</p>
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="text-center py-8 text-white/80 text-sm">
                    {searchTerm ? 'No jobs found matching your search.' : 'No job postings yet.'}
                  </div>
                ) : (
                  filteredJobs.map((job) => (
                    <MobileJobCard
                      key={job.id}
                      job={job}
                      onEdit={openEdit}
                      onToggleStatus={handleToggleStatus}
                      onDelete={openDeleteConfirm}
                      formatDate={formatDate}
                      isMenuOpen={mobileActionMenu === job.id}
                      onMenuToggle={() => setMobileActionMenu(mobileActionMenu === job.id ? null : job.id)}
                    />
                  ))
                )}
              </div>
            </div>
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
          onSave={handleSave}
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
  onDelete: (job: JobPosting) => void
  formatDate: (date: string) => string
}) {
  return (
    <tr className="border-b border-white/10 hover:bg-white/5 transition-colors duration-150">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          {job.image_path ? (
            <img 
              src={job.image_path} 
              alt="" 
              className="h-10 w-10 rounded object-cover ring-1 ring-white/20" 
            />
          ) : (
            <div className="h-10 w-10 rounded bg-gradient-to-br from-[#0078D4] to-[#1C89D1] flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <div className="font-medium text-white text-sm">{job.job_title}</div>
            {job.job_description && (
              <div className="text-[#c7d7ff] text-xs mt-1 line-clamp-1">
                {job.job_description}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-white text-sm">
        {job.department || '—'}
      </td>
      <td className="px-4 py-4 text-white text-sm">
        {job.location || '—'}
      </td>
      <td className="px-4 py-4 text-[#c7d7ff] text-sm">
        {formatDate(job.date_posted)}
      </td>
      <td className="px-4 py-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          job.status === 'active' 
            ? 'bg-green-500/20 text-green-300' 
            : 'bg-red-500/20 text-red-300'
        }`}>
          {job.status === 'active' ? 'Active' : 'Closed'}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(job.id)}
            className="inline-flex items-center gap-1 rounded bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors duration-200"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
          <button
            onClick={() => onToggleStatus(job)}
            className={`rounded px-3 py-1.5 text-xs text-white transition-colors duration-200 ${
              job.status === 'active' 
                ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300' 
                : 'bg-green-500/20 hover:bg-green-500/30 text-green-300'
            }`}
          >
            {job.status === 'active' ? 'Close' : 'Activate'}
          </button>
          <button
            onClick={() => onDelete(job)}
            className="inline-flex items-center gap-1 rounded bg-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/30 transition-colors duration-200"
          >
            <Trash2 className="h-3 w-3" />
            Delete
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
  onDelete: (job: JobPosting) => void
  formatDate: (date: string) => string
  isMenuOpen: boolean
  onMenuToggle: () => void
}) {
  return (
    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          {job.image_path ? (
            <img 
              src={job.image_path} 
              alt="" 
              className="h-12 w-12 rounded object-cover ring-1 ring-white/20" 
            />
          ) : (
            <div className="h-12 w-12 rounded bg-gradient-to-br from-[#0078D4] to-[#1C89D1] flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white text-sm truncate">{job.job_title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {job.department && (
                <span className="text-xs text-[#c7d7ff] bg-white/10 px-2 py-1 rounded">
                  {job.department}
                </span>
              )}
              {job.location && (
                <span className="text-xs text-[#c7d7ff] bg-white/10 px-2 py-1 rounded">
                  {job.location}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-[#c7d7ff]">
              <span>{formatDate(job.date_posted)}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${
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
            className="p-2 rounded hover:bg-white/10 transition-colors duration-200"
          >
            <MoreVertical className="h-4 w-4 text-[#c7d7ff]" />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 top-10 z-10 w-32 bg-[#0f2a6a] border border-white/20 rounded-lg shadow-lg py-1">
              <button
                onClick={() => onEdit(job.id)}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-2"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
              <button
                onClick={() => onToggleStatus(job)}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10"
              >
                {job.status === 'active' ? 'Close' : 'Activate'}
              </button>
              <button
                onClick={() => onDelete(job)}
                className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 flex items-center gap-2"
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

/* Modal Component */
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-gradient-to-b from-[#0f2a6a] to-[#0b1b3a] border border-[#93c5fd] shadow-xl max-h-[90vh] overflow-hidden">
        <header className="flex items-center justify-between border-b border-white/20 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">
            {editId == null ? "Create Job" : "Edit Job"}
          </h3>
          <button 
            onClick={onClose}
            className="rounded p-2 hover:bg-white/10 transition-colors duration-200"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <div className="grid gap-4">
            <Field label="Title *">
              <input
                className="w-full rounded-lg border border-[#93c5fd] bg-white/10 px-3 py-2 text-white placeholder-[#c7d7ff] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-sm"
                value={formData.job_title}
                onChange={e => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="Enter job title"
              />
            </Field>

            <Field label="Department">
              <input
                className="w-full rounded-lg border border-[#93c5fd] bg-white/10 px-3 py-2 text-white placeholder-[#c7d7ff] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-sm"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                placeholder="Enter department"
              />
            </Field>

            <Field label="Location">
              <input
                className="w-full rounded-lg border border-[#93c5fd] bg-white/10 px-3 py-2 text-white placeholder-[#c7d7ff] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-sm"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter location"
              />
            </Field>

            <Field label="Status">
              <select
                className="w-full rounded-lg border border-[#93c5fd] bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-sm"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as JobStatus })}
              >
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </Field>

            <Field label="Image">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#93c5fd] bg-white/10 px-3 py-2 hover:bg-white/15 transition-colors duration-200 text-sm">
                <ImageIcon className="h-4 w-4 text-[#c7d7ff]" />
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
                <div className="relative mt-3 inline-block">
                  <img 
                    src={previewUrl} 
                    alt="preview" 
                    className="h-20 w-20 rounded-lg object-cover ring-1 ring-white/20" 
                  />
                  <button
                    type="button"
                    onClick={onRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors duration-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </Field>

            <Field label="Description">
              <textarea
                className="w-full rounded-lg border border-[#93c5fd] bg-white/10 px-3 py-2 text-white placeholder-[#c7d7ff] focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-sm"
                rows={4}
                value={formData.job_description}
                onChange={e => setFormData({ ...formData, job_description: e.target.value })}
                placeholder="Enter job description"
              />
            </Field>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/20">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/30 bg-transparent px-4 py-2.5 text-white hover:bg-white/10 transition-colors duration-200 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={formLoading || !formData.job_title.trim()}
            className="flex-1 rounded-lg bg-[#0078D4] px-4 py-2.5 font-medium text-white hover:bg-[#106EBE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm shadow-lg"
          >
            {formLoading ? 'Saving...' : 'Save Job'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[#c7d7ff]">{label}</span>
      {children}
    </label>
  )
}