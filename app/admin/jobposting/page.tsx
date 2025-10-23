'use client'
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import AdminSidebar, { MobileTopbar } from '@/components/AdminSidebar'
import { supabase } from '@/lib/supabaseClient'
import { Plus, Search, Edit, Trash2, Eye, MoreVertical, Briefcase, MapPin, Calendar, Users, X, Building, Image as ImageIcon, XCircle } from 'lucide-react'

// Types based on your schema
type JobStatus = 'active' | 'closed'

interface JobPosting {
  id: string
  job_title: string
  department: string | null
  location: string | null
  job_description: string | null // FIX: Make this nullable
  image_path: string | null
  date_posted: string
  status: JobStatus
  created_by: string
  applications_count?: number
}

export default function JobPostingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [isClient, setIsClient] = useState(false) // ADD: Client state for hydration
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    job_title: '',
    department: '',
    location: '',
    job_description: '',
    status: 'active' as JobStatus,
    image_file: null as File | null,
    image_preview: '' as string | null
  })

  useEffect(() => {
    setIsClient(true)
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      
      // Fetch job postings with applications count
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_postings')
        .select(`
          *,
          applications (
            id
          )
        `)
        .order('date_posted', { ascending: false })

      if (jobsError) throw jobsError

      // Transform the data to include applications count
      const jobsWithCounts = jobsData?.map(job => ({
        ...job,
        applications_count: job.applications?.length || 0
      })) || []

      setJobs(jobsWithCounts)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      alert('Error fetching job postings')
    } finally {
      setLoading(false)
    }
  }

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

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('job-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    }
  }

  // CREATE - Add new job posting with image upload
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      // Validate form data
      if (!formData.job_title.trim()) {
        throw new Error('Job title is required')
      }
      if (!formData.job_description.trim()) {
        throw new Error('Job description is required')
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in to create job postings')

      let imagePath = null

      // Upload image if selected
      if (formData.image_file) {
        imagePath = await uploadImage(formData.image_file)
      }

      // Insert new job posting
      const { data, error } = await supabase
        .from('job_postings')
        .insert({
          job_title: formData.job_title,
          department: formData.department || null,
          location: formData.location || null,
          job_description: formData.job_description,
          image_path: imagePath,
          status: formData.status,
          created_by: user.id
        })
        .select()

      if (error) throw error

      // Refresh jobs list
      await fetchJobs()
      
      // Reset form and close
      setFormData({
        job_title: '',
        department: '',
        location: '',
        job_description: '',
        status: 'active',
        image_file: null,
        image_preview: null
      })
      setShowAddForm(false)
      
      alert('Job posting created successfully!')

    } catch (error: any) {
      console.error('Error creating job posting:', error)
      alert('Error creating job posting: ' + error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const toggleJobStatus = async (jobId: string, currentStatus: JobStatus) => {
    try {
      const newStatus: JobStatus = currentStatus === 'active' ? 'closed' : 'active'
      
      const { error } = await supabase
        .from('job_postings')
        .update({ status: newStatus })
        .eq('id', jobId)

      if (error) throw error

      // Update local state
      setJobs(jobs.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      ))
      
      alert(`Job ${newStatus === 'active' ? 'reopened' : 'closed'} successfully!`)
    } catch (error) {
      console.error('Error updating job status:', error)
      alert('Error updating job status')
    }
  }

  const deleteJob = async (jobId: string, jobTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`)) return
    
    try {
      // Get job to check for image
      const job = jobs.find(j => j.id === jobId)
      
      // First check if there are applications for this job
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', jobId)

      if (appsError) throw appsError

      if (applications && applications.length > 0) {
        if (!confirm(`This job has ${applications.length} application(s). Deleting will remove all associated applications. Continue?`)) {
          return
        }

        // Delete applications first (due to foreign key constraint)
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
          // Continue with job deletion even if image deletion fails
        }
      }

      // Delete the job posting
      const { error } = await supabase
        .from('job_postings')
        .delete()
        .eq('id', jobId)

      if (error) throw error

      // Update local state
      setJobs(jobs.filter(job => job.id !== jobId))
      alert('Job posting deleted successfully!')
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Error deleting job posting')
    }
  }

  // Form handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // File handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }

      setFormData(prev => ({
        ...prev,
        image_file: file,
        image_preview: URL.createObjectURL(file)
      }))
    }
  }

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image_file: null,
      image_preview: null
    }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.location?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    const matchesDepartment = departmentFilter === 'all' || job.department === departmentFilter
    
    return matchesSearch && matchesStatus && matchesDepartment
  })

  const departments = Array.from(new Set(jobs.map(job => job.department).filter(Boolean))) as string[]

  // FIX: Check both client readiness and loading state
  if (!isClient || loading) {
    return (
      <div className="flex h-screen bg-gray-50/30">
        <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <MobileTopbar onMenu={() => setSidebarOpen(true)} />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg">Loading job postings...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50/30">
      <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileTopbar onMenu={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="h-8 w-8 text-blue-600" />
                Job Postings
              </h1>
              <p className="text-gray-600 mt-1">Manage and track all job positions</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Job Posting
            </button>
          </div>

          {/* Add Job Posting Form */}
          {showAddForm && (
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create New Job Posting</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      name="job_title"
                      required
                      value={formData.job_title}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="e.g., Senior Frontend Developer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="e.g., Engineering, Marketing"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="e.g., New York, Remote"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      name="status"
                      required
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Image
                  </label>
                  <div className="space-y-2">
                    {formData.image_preview ? (
                      <div className="relative inline-block">
                        <img
                          src={formData.image_preview}
                          alt="Preview"
                          className="h-32 w-32 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload job image</p>
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG up to 5MB</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Description *
                  </label>
                  <textarea
                    name="job_description"
                    required
                    rows={6}
                    value={formData.job_description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-vertical"
                    placeholder="Describe the job responsibilities, requirements, and benefits..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Job Posting
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs, departments, or locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as JobStatus | 'all')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>

              {/* Department Filter */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Jobs Grid */}
          <div className="space-y-4">
            {filteredJobs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-500">No job postings found</div>
                {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' ? (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setStatusFilter('all')
                      setDepartmentFilter('all')
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Clear filters
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Create Your First Job Posting
                  </button>
                )}
              </div>
            ) : (
              filteredJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  onToggleStatus={toggleJobStatus}
                  onDelete={deleteJob}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function JobCard({ 
  job, 
  onToggleStatus, 
  onDelete 
}: { 
  job: JobPosting
  onToggleStatus: (jobId: string, currentStatus: JobStatus) => void
  onDelete: (jobId: string, jobTitle: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const formatDate = (dateString: string) => {
    if (!isClient) return dateString.slice(0, 10)
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // FIX: Handle null description
  const truncateDescription = (text: string | null, maxLength: number = 120) => {
    if (!text) return 'No description provided'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-start gap-4">
                {job.image_path && (
                  <img
                    src={job.image_path}
                    alt={job.job_title}
                    className="h-16 w-16 object-cover rounded-lg border flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{job.job_title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600">
                    {job.department && (
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                        <Building className="h-3 w-3" />
                        {job.department}
                      </span>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                    )}
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      job.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    )}>
                      {job.status === 'active' ? 'Active' : 'Closed'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {/* Mobile Menu Dropdown */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-2 z-10 min-w-[160px]">
                  <Link
                    href={`/admin/job-postings/${job.id}/applications`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Eye className="h-4 w-4" />
                    View Applications
                  </Link>
                  <Link
                    href={`/admin/job-postings/${job.id}/edit`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                  <button
                    onClick={() => {
                      onToggleStatus(job.id, job.status)
                      setShowMenu(false)
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors',
                      job.status === 'active'
                        ? 'text-orange-700 hover:bg-orange-50'
                        : 'text-green-700 hover:bg-green-50'
                    )}
                  >
                    {job.status === 'active' ? 'Close Job' : 'Reopen Job'}
                  </button>
                  <button
                    onClick={() => {
                      onDelete(job.id, job.job_title)
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* FIX: Pass the nullable description */}
          <p className="text-gray-600 text-sm leading-relaxed">
            {truncateDescription(job.job_description)}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Posted: {formatDate(job.date_posted)}
            </span>
            {job.applications_count !== undefined && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {job.applications_count} application{job.applications_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/admin/job-postings/${job.id}/applications`}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Eye className="h-4 w-4" />
            View Applications
          </Link>
          
          <Link
            href={`/admin/job-postings/${job.id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>

          <button
            onClick={() => onToggleStatus(job.id, job.status)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
              job.status === 'active'
                ? 'text-orange-700 hover:bg-orange-50'
                : 'text-green-700 hover:bg-green-50'
            )}
          >
            {job.status === 'active' ? 'Close Job' : 'Reopen Job'}
          </button>

          <button
            onClick={() => onDelete(job.id, job.job_title)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// Utility function (same as in your sidebar)
function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(' ')
}