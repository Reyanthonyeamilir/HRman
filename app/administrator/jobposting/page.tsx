// app/administrator/jobposting/page.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import AdminHRSidebar, { MobileTopbar } from '@/components/adminhrsidebar'
import { supabase } from '@/lib/supabaseClient'
import { 
  Plus, Search, Edit, Trash2, Eye, MoreVertical, Briefcase, 
  MapPin, Calendar, Users, X, Building, Image as ImageIcon, 
  XCircle, Lock, UserCheck 
} from 'lucide-react'

// Utility function for class names
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

// Types based on your schema
type JobStatus = 'active' | 'closed'
type UserRole = 'applicant' | 'hr' | 'super_admin'

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
  applications_count?: number
  can_edit?: boolean
  creator_email?: string
}

interface UserProfile {
  id: string
  role: UserRole
  email: string
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
  const [isClient, setIsClient] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
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
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchJobs()
    }
  }, [currentUser])

  const fetchCurrentUser = async () => {
    try {
      setLoadingUser(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('No user logged in')
        setLoadingUser(false)
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role, email')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setCurrentUser(profile)
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoadingUser(false)
    }
  }

  const fetchJobs = async () => {
    if (!currentUser) return

    try {
      setLoading(true)
      
      // First fetch all jobs with creator info
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_postings')
        .select(`
          *,
          profiles!job_postings_created_by_fkey (
            email
          )
        `)
        .order('date_posted', { ascending: false })

      if (jobsError) throw jobsError

      // Then fetch applications count separately
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select('job_id')

      if (appsError) throw appsError

      // Count applications per job
      const applicationCounts: Record<string, number> = {}
      applicationsData?.forEach(app => {
        applicationCounts[app.job_id] = (applicationCounts[app.job_id] || 0) + 1
      })

      // Process jobs with permissions and counts
      const processedJobs = jobsData?.map(job => {
        const isCreator = job.created_by === currentUser.id
        const canEdit = currentUser.role === 'super_admin' || 
                       (currentUser.role === 'hr' && isCreator)

        return {
          ...job,
          applications_count: applicationCounts[job.id] || 0,
          can_edit: canEdit,
          creator_email: job.profiles?.email || 'Unknown'
        }
      }) || []

      setJobs(processedJobs)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      alert('Error fetching job postings')
    } finally {
      setLoading(false)
    }
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      if (!formData.job_title.trim()) {
        throw new Error('Job title is required')
      }
      if (!formData.job_description.trim()) {
        throw new Error('Job description is required')
      }

      if (!currentUser) throw new Error('You must be logged in to create job postings')

      let imagePath = null

      if (formData.image_file) {
        imagePath = await uploadImage(formData.image_file)
      }

      const { data, error } = await supabase
        .from('job_postings')
        .insert({
          job_title: formData.job_title,
          department: formData.department || null,
          location: formData.location || null,
          job_description: formData.job_description,
          image_path: imagePath,
          status: formData.status,
          created_by: currentUser.id
        })
        .select()

      if (error) throw error

      await fetchJobs()
      
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

  const toggleJobStatus = async (jobId: string, currentStatus: JobStatus, jobTitle: string) => {
    try {
      const newStatus: JobStatus = currentStatus === 'active' ? 'closed' : 'active'
      
      const { error } = await supabase
        .from('job_postings')
        .update({ status: newStatus })
        .eq('id', jobId)

      if (error) throw error

      setJobs(jobs.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      ))
      
      alert(`Job "${jobTitle}" ${newStatus === 'active' ? 'reopened' : 'closed'} successfully!`)
    } catch (error) {
      console.error('Error updating job status:', error)
      alert('Error updating job status')
    }
  }

  const deleteJob = async (jobId: string, jobTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`)) return
    
    try {
      const job = jobs.find(j => j.id === jobId)
      
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', jobId)

      if (appsError) throw appsError

      if (applications && applications.length > 0) {
        if (!confirm(`This job has ${applications.length} application(s). Deleting will remove all associated applications. Continue?`)) {
          return
        }

        const { error: deleteAppsError } = await supabase
          .from('applications')
          .delete()
          .eq('job_id', jobId)

        if (deleteAppsError) throw deleteAppsError
      }

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

      const { error } = await supabase
        .from('job_postings')
        .delete()
        .eq('id', jobId)

      if (error) throw error

      setJobs(jobs.filter(job => job.id !== jobId))
      alert('Job posting deleted successfully!')
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Error deleting job posting')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

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
                         job.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.creator_email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    const matchesDepartment = departmentFilter === 'all' || job.department === departmentFilter
    
    return matchesSearch && matchesStatus && matchesDepartment
  })

  const departments = Array.from(new Set(jobs.map(job => job.department).filter(Boolean))) as string[]

  // Show loading state
  if (!isClient || loading || loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHRSidebar 
          mobileOpen={sidebarOpen} 
          onMobileClose={() => setSidebarOpen(false)} 
        />
        <div className="lg:pl-64">
          <MobileTopbar onMenu={() => setSidebarOpen(true)} />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading job postings...</div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Check if user can create jobs
  const canCreateJobs = currentUser?.role === 'super_admin' || currentUser?.role === 'hr'

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHRSidebar 
        mobileOpen={sidebarOpen} 
        onMobileClose={() => setSidebarOpen(false)} 
      />
      
      <div className="lg:pl-64">
        <MobileTopbar onMenu={() => setSidebarOpen(true)} />
        
        <main className="p-4 md:p-6">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="h-8 w-8 text-blue-600" />
                Job Postings
              </h1>
              <p className="text-gray-600 mt-1">
                {currentUser?.role === 'super_admin' 
                  ? 'You have full administrative access to all job postings'
                  : currentUser?.role === 'hr'
                  ? 'You can manage jobs you created'
                  : 'View only access'}
              </p>
            </div>
            
            {canCreateJobs && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Job Posting
              </button>
            )}
          </div>

          {/* User Role Badge */}
          <div className="mb-6">
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
              currentUser?.role === 'super_admin' 
                ? "bg-purple-100 text-purple-800"
                : currentUser?.role === 'hr'
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-800"
            )}>
              <UserCheck className="h-3 w-3" />
              {currentUser?.role === 'super_admin' 
                ? 'Super Administrator' 
                : currentUser?.role === 'hr'
                ? 'HR Manager'
                : 'Viewer'}
              {currentUser?.role === 'hr' && ' (Can only edit your own jobs)'}
            </div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                  placeholder="Search jobs, departments, locations, or creators..."
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
                ) : canCreateJobs && (
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
                  currentUser={currentUser}
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

// JobCard component with permission-based UI
function JobCard({ 
  job, 
  currentUser,
  onToggleStatus, 
  onDelete 
}: { 
  job: JobPosting
  currentUser: UserProfile | null
  onToggleStatus: (jobId: string, currentStatus: JobStatus, jobTitle: string) => void
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

  const truncateDescription = (text: string | null, maxLength: number = 120) => {
    if (!text) return 'No description provided'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const isCreator = currentUser?.id === job.created_by
  const canEdit = job.can_edit || currentUser?.role === 'super_admin'
  const isHRUser = currentUser?.role === 'hr'
  const isSuperAdmin = currentUser?.role === 'super_admin'

  const handleEditClick = (e: React.MouseEvent) => {
    if (!canEdit && isHRUser) {
      e.preventDefault()
      alert(`You can only edit job postings you created.\n\nThis job was created by: ${job.creator_email}`)
      return false
    }
    return true
  }

  const handleDeleteClick = () => {
    if (!canEdit && isHRUser) {
      alert(`You can only delete job postings you created.\n\nThis job was created by: ${job.creator_email}`)
      return
    }
    onDelete(job.id, job.job_title)
  }

  const handleToggleStatus = () => {
    if (!canEdit && isHRUser) {
      alert(`You can only update job postings you created.\n\nThis job was created by: ${job.creator_email}`)
      return
    }
    onToggleStatus(job.id, job.status, job.job_title)
  }

  return (
    <div className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow relative">
      {/* Creator Indicator */}
      {isHRUser && !isCreator && (
        <div className="absolute top-4 right-4 flex items-center gap-1 text-gray-400 text-xs">
          <Lock className="h-3 w-3" />
          <span>Created by: {job.creator_email}</span>
        </div>
      )}

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
                  <div className="flex items-start gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{job.job_title}</h3>
                    {isHRUser && !isCreator && (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded">
                        <Lock className="h-3 w-3" />
                        Read-only
                      </span>
                    )}
                  </div>
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
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  canEdit ? "hover:bg-gray-100" : "text-gray-400 cursor-default"
                )}
                disabled={!canEdit}
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showMenu && canEdit && (
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
                    onClick={(e) => handleEditClick(e) && setShowMenu(false)}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                  <button
                    onClick={() => {
                      handleToggleStatus()
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
                      handleDeleteClick()
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
            {isHRUser && (
              <span className="flex items-center gap-1 text-gray-400">
                Created by: {job.creator_email}
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
            onClick={handleEditClick}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
              canEdit
                ? "text-blue-700 hover:bg-blue-50"
                : "text-gray-400 cursor-not-allowed bg-gray-100"
            )}
            title={!canEdit && isHRUser ? `Created by: ${job.creator_email}` : ""}
          >
            <Edit className="h-4 w-4" />
            Edit
            {!canEdit && isHRUser && " (Not Yours)"}
          </Link>

          <button
            onClick={handleToggleStatus}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
              canEdit 
                ? job.status === 'active'
                  ? 'text-orange-700 hover:bg-orange-50'
                  : 'text-green-700 hover:bg-green-50'
                : 'text-gray-400 cursor-not-allowed bg-gray-100'
            )}
            disabled={!canEdit}
            title={!canEdit && isHRUser ? `Created by: ${job.creator_email}` : ""}
          >
            {job.status === 'active' ? 'Close Job' : 'Reopen Job'}
            {!canEdit && isHRUser && " (Not Yours)"}
          </button>

          <button
            onClick={handleDeleteClick}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
              canEdit
                ? "text-red-700 hover:bg-red-50"
                : "text-gray-400 cursor-not-allowed bg-gray-100"
            )}
            disabled={!canEdit}
            title={!canEdit && isHRUser ? `Created by: ${job.creator_email}` : ""}
          >
            <Trash2 className="h-4 w-4" />
            Delete
            {!canEdit && isHRUser && " (Not Yours)"}
          </button>
        </div>
      </div>
    </div>
  )
}