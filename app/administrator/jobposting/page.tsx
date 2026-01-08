// app/administrator/jobposting/page.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import AdminHRSidebar, { MobileTopbar } from '@/components/adminhrsidebar'
import { supabase } from '@/lib/supabaseClient'
import { 
  Plus, Search, Edit, Trash2, Eye, MoreVertical, Briefcase, 
  MapPin, Calendar, Users, X, Building, Image as ImageIcon, 
  XCircle, Lock, UserCheck, Filter, Download, ChevronDown,
  AlertCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'

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
  creator_name?: string
}

interface UserProfile {
  id: string
  role: UserRole
  email: string
  first_name: string | null
  last_name: string | null
}

interface AddFormData {
  job_title: string
  department: string
  location: string
  job_description: string
  status: JobStatus
  image_file: File | null
  image_preview: string | null
}

interface EditFormData {
  id: string | null
  job_title: string
  department: string
  location: string
  job_description: string
  status: JobStatus
  image_file: File | null
  image_preview: string | null
}

export default function JobPostingsPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<string>('')
  const [accessDenied, setAccessDenied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [addFormData, setAddFormData] = useState<AddFormData>({
    job_title: '',
    department: '',
    location: '',
    job_description: '',
    status: 'active',
    image_file: null,
    image_preview: null
  })

  const [editFormData, setEditFormData] = useState<EditFormData>({
    id: null,
    job_title: '',
    department: '',
    location: '',
    job_description: '',
    status: 'active',
    image_file: null,
    image_preview: null
  })

  useEffect(() => {
    setIsClient(true)
    checkUserAndRedirect()
  }, [])

  useEffect(() => {
    if (currentUser && hasAccess()) {
      fetchJobs()
    }
  }, [currentUser])

  const checkUserAndRedirect = async () => {
    try {
      setLoadingUser(true)
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // No user logged in, redirect to login
        router.push('/auth/login')
        return
      }

      // Get user profile with role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role, email, first_name, last_name')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setCurrentUser(profile)

      // Check if user has access (HR or Super Admin)
      if (!hasAccess(profile)) {
        setAccessDenied(true)
        setLoadingUser(false)
        return
      }
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/auth/login')
    } finally {
      setLoadingUser(false)
    }
  }

  const hasAccess = (profile?: UserProfile): boolean => {
    const user = profile || currentUser
    return user?.role === 'hr' || user?.role === 'super_admin'
  }

  const fetchJobs = async () => {
    if (!currentUser || !hasAccess()) return

    try {
      setLoading(true)
      
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_postings')
        .select(`
          *,
          profiles!job_postings_created_by_fkey (
            email,
            first_name,
            last_name
          ),
          applications (
            id
          )
        `)
        .order('date_posted', { ascending: false })

      if (jobsError) throw jobsError

      const processedJobs = jobsData?.map(job => {
        const isCreator = job.created_by === currentUser.id
        const canEdit = currentUser.role === 'super_admin' || 
                       (currentUser.role === 'hr' && isCreator)

        const creatorName = job.profiles 
          ? `${job.profiles.first_name || ''} ${job.profiles.last_name || ''}`.trim() || job.profiles.email
          : 'Unknown'

        return {
          ...job,
          applications_count: job.applications?.length || 0,
          can_edit: canEdit,
          creator_email: job.profiles?.email || 'Unknown',
          creator_name: creatorName
        }
      }) || []

      setJobs(processedJobs)
      setSelectedJobs([])
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

  const deleteImage = async (imagePath: string | null) => {
    if (!imagePath) return
    
    try {
      const imageName = imagePath.split('/').pop()
      if (imageName) {
        await supabase.storage
          .from('job-images')
          .remove([`job-postings/${imageName}`])
      }
    } catch (error) {
      console.error('Error deleting old image:', error)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      if (!hasAccess()) {
        throw new Error('Access denied. You do not have permission to create job postings.')
      }

      if (!addFormData.job_title.trim()) {
        throw new Error('Job title is required')
      }
      if (!addFormData.job_description.trim()) {
        throw new Error('Job description is required')
      }

      if (!currentUser) throw new Error('You must be logged in to create job postings')

      let imagePath = null

      if (addFormData.image_file) {
        imagePath = await uploadImage(addFormData.image_file)
      }

      const { error } = await supabase
        .from('job_postings')
        .insert({
          job_title: addFormData.job_title,
          department: addFormData.department || null,
          location: addFormData.location || null,
          job_description: addFormData.job_description,
          image_path: imagePath,
          status: addFormData.status,
          created_by: currentUser.id
        })

      if (error) throw error

      await logAction('create', 'job_posting', null, addFormData.job_title, {
        department: addFormData.department,
        location: addFormData.location,
        status: addFormData.status
      })

      await fetchJobs()
      
      setAddFormData({
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      if (!hasAccess()) {
        throw new Error('Access denied. You do not have permission to edit job postings.')
      }

      if (!editFormData.id) throw new Error('No job selected for editing')
      if (!editFormData.job_title.trim()) {
        throw new Error('Job title is required')
      }
      if (!editFormData.job_description.trim()) {
        throw new Error('Job description is required')
      }

      let imagePath = editFormData.image_preview?.startsWith('blob:') ? null : editFormData.image_preview

      if (editFormData.image_file) {
        const job = jobs.find(j => j.id === editFormData.id)
        if (job?.image_path) {
          await deleteImage(job.image_path)
        }
        
        imagePath = await uploadImage(editFormData.image_file)
      }

      const { error } = await supabase
        .from('job_postings')
        .update({
          job_title: editFormData.job_title,
          department: editFormData.department || null,
          location: editFormData.location || null,
          job_description: editFormData.job_description,
          image_path: imagePath,
          status: editFormData.status
        })
        .eq('id', editFormData.id)

      if (error) throw error

      await logAction('update', 'job_posting', editFormData.id, editFormData.job_title, {
        department: editFormData.department,
        location: editFormData.location,
        status: editFormData.status
      })

      await fetchJobs()
      
      setEditFormData({
        id: null,
        job_title: '',
        department: '',
        location: '',
        job_description: '',
        status: 'active',
        image_file: null,
        image_preview: null
      })
      setShowEditForm(false)
      
      alert('Job posting updated successfully!')

    } catch (error: any) {
      console.error('Error updating job posting:', error)
      alert('Error updating job posting: ' + error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (job: JobPosting) => {
    if (!hasAccess()) {
      alert('Access denied. You do not have permission to edit job postings.')
      return
    }

    if (!job.can_edit && currentUser?.role === 'hr') {
      alert(`You can only edit job postings you created.\n\nThis job was created by: ${job.creator_name}`)
      return
    }

    setEditFormData({
      id: job.id,
      job_title: job.job_title,
      department: job.department || '',
      location: job.location || '',
      job_description: job.job_description || '',
      status: job.status,
      image_file: null,
      image_preview: job.image_path
    })
    setShowEditForm(true)
  }

  const toggleJobStatus = async (jobId: string, currentStatus: JobStatus, jobTitle: string) => {
    if (!hasAccess()) {
      alert('Access denied. You do not have permission to update job status.')
      return
    }

    const job = jobs.find(j => j.id === jobId)
    if (job && !job.can_edit && currentUser?.role === 'hr') {
      alert(`You can only update job postings you created.\n\nThis job was created by: ${job.creator_name}`)
      return
    }

    try {
      const newStatus: JobStatus = currentStatus === 'active' ? 'closed' : 'active'
      
      const { error } = await supabase
        .from('job_postings')
        .update({ status: newStatus })
        .eq('id', jobId)

      if (error) throw error

      await logAction('update', 'job_posting', jobId, jobTitle, {
        status: newStatus
      })

      setJobs((prev: JobPosting[]) => prev.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      ))
      
      alert(`Job "${jobTitle}" ${newStatus === 'active' ? 'reopened' : 'closed'} successfully!`)
    } catch (error) {
      console.error('Error updating job status:', error)
      alert('Error updating job status')
    }
  }

  const deleteJob = async (jobId: string, jobTitle: string) => {
    if (!hasAccess()) {
      alert('Access denied. You do not have permission to delete job postings.')
      return
    }

    const job = jobs.find(j => j.id === jobId)
    if (job && !job.can_edit && currentUser?.role === 'hr') {
      alert(`You can only delete job postings you created.\n\nThis job was created by: ${job.creator_name}`)
      return
    }

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
        await deleteImage(job.image_path)
      }

      const { error } = await supabase
        .from('job_postings')
        .delete()
        .eq('id', jobId)

      if (error) throw error

      await logAction('delete', 'job_posting', jobId, jobTitle)

      setJobs((prev: JobPosting[]) => prev.filter(job => job.id !== jobId))
      alert('Job posting deleted successfully!')
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Error deleting job posting')
    }
  }

  const logAction = async (
    action: string,
    entity_type: string,
    entity_id: string | null,
    entity_name: string,
    details?: any
  ) => {
    if (!currentUser) return

    try {
      await supabase
        .from('task_logs')
        .insert({
          user_id: currentUser.id,
          user_email: currentUser.email,
          action,
          entity_type,
          entity_id,
          entity_name,
          details,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error logging action:', error)
    }
  }

  const handleJobSelection = (jobId: string) => {
    if (!hasAccess()) {
      alert('Access denied. You do not have permission to select jobs.')
      return
    }
    setSelectedJobs((prev: string[]) => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    )
  }

  const handleBulkAction = async () => {
    if (!hasAccess()) {
      alert('Access denied. You do not have permission to perform bulk actions.')
      return
    }

    if (!bulkAction || selectedJobs.length === 0) return

    try {
      switch (bulkAction) {
        case 'activate':
          await supabase
            .from('job_postings')
            .update({ status: 'active' })
            .in('id', selectedJobs)
          break

        case 'close':
          await supabase
            .from('job_postings')
            .update({ status: 'closed' })
            .in('id', selectedJobs)
          break

        case 'delete':
          if (!confirm(`Are you sure you want to delete ${selectedJobs.length} job(s)?`)) return
          
          for (const jobId of selectedJobs) {
            const job = jobs.find(j => j.id === jobId)
            if (job?.image_path) {
              await deleteImage(job.image_path)
            }
          }

          await supabase
            .from('job_postings')
            .delete()
            .in('id', selectedJobs)
          break
      }

      await logAction(bulkAction, 'job_posting_bulk', null, `${selectedJobs.length} jobs`, {
        job_ids: selectedJobs,
        action: bulkAction
      })

      await fetchJobs()
      setBulkAction('')
      alert(`Bulk action completed successfully!`)
    } catch (error) {
      console.error('Error performing bulk action:', error)
      alert('Error performing bulk action')
    }
  }

  const exportToCSV = () => {
    if (!hasAccess()) {
      alert('Access denied. You do not have permission to export data.')
      return
    }

    const headers = ['ID', 'Job Title', 'Department', 'Location', 'Status', 'Date Posted', 'Applications', 'Created By']
    const csvData = jobs.map(job => [
      job.id,
      job.job_title,
      job.department || '',
      job.location || '',
      job.status,
      new Date(job.date_posted).toLocaleDateString(),
      job.applications_count || 0,
      job.creator_name || job.creator_email
    ])
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `job-postings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleAddFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setAddFormData((prev: AddFormData) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditFormData((prev: EditFormData) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setAddFormData((prev: AddFormData) => ({
        ...prev,
        image_file: file,
        image_preview: URL.createObjectURL(file)
      }))
    }
  }

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setEditFormData((prev: EditFormData) => ({
        ...prev,
        image_file: file,
        image_preview: URL.createObjectURL(file)
      }))
    }
  }

  const removeAddImage = () => {
    setAddFormData((prev: AddFormData) => ({
      ...prev,
      image_file: null,
      image_preview: null
    }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeEditImage = () => {
    setEditFormData((prev: EditFormData) => ({
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
                         job.creator_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.creator_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    const matchesDepartment = departmentFilter === 'all' || job.department === departmentFilter
    
    return matchesSearch && matchesStatus && matchesDepartment
  })

  const departments = Array.from(new Set(jobs.map(job => job.department).filter(Boolean))) as string[]

  // Show loading state
  if (!isClient || loadingUser) {
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
              <div className="text-gray-500">Loading...</div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Show access denied
  if (accessDenied || !hasAccess()) {
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
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600 mb-4">
                  You do not have permission to access this page.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  This page is only accessible to HR managers and administrators.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const canCreateJobs = currentUser?.role === 'super_admin' || currentUser?.role === 'hr'

  const renderForm = (formType: 'add' | 'edit') => {
    const isEdit = formType === 'edit'
    const formData = isEdit ? editFormData : addFormData
    const setShowForm = isEdit ? setShowEditForm : setShowAddForm
    const handleSubmit = isEdit ? handleEditSubmit : handleCreateSubmit
    const handleChange = isEdit ? handleEditFormChange : handleAddFormChange
    const handleFileChange = isEdit ? handleEditFileChange : handleAddFileChange
    const removeImage = isEdit ? removeEditImage : removeAddImage

    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Job Posting' : 'Create New Job Posting'}
          </h3>
          <button
            onClick={() => setShowForm(false)}
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
                name="image_file"
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
                  {isEdit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {isEdit ? 'Update Job Posting' : 'Create Job Posting'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

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
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
                </span>
              </h1>
              <p className="text-gray-600 mt-1">
                {currentUser?.role === 'super_admin' 
                  ? 'You have full administrative access to all job postings'
                  : currentUser?.role === 'hr'
                  ? 'You can manage jobs you created'
                  : 'View only access'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              
              {canCreateJobs && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  New Job Posting
                </button>
              )}
            </div>
          </div>

          {/* User Role Badge */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
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

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
              <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Add Job Posting Form */}
          {showAddForm && renderForm('add')}

          {/* Edit Job Posting Form */}
          {showEditForm && renderForm('edit')}

          {/* Bulk Actions */}
          {selectedJobs.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-yellow-800 font-medium">
                    {selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''} selected
                  </span>
                  <select
                    value={bulkAction}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBulkAction(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select bulk action</option>
                    <option value="activate">Activate</option>
                    <option value="close">Close</option>
                    <option value="delete">Delete</option>
                  </select>
                  <button
                    onClick={handleBulkAction}
                    disabled={!bulkAction}
                    className="bg-blue-600 text-white px-4 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Apply
                  </button>
                </div>
                <button
                  onClick={() => setSelectedJobs([])}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Clear selection
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search jobs, departments, locations, or creators..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as JobStatus | 'all')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>

                {/* Department Filter */}
                <select
                  value={departmentFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDepartmentFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' ? (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Showing {filteredJobs.length} of {jobs.length} jobs
                  </span>
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setStatusFilter('all')
                      setDepartmentFilter('all')
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : null}
            </div>
          )}

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
                  onEdit={handleEdit}
                  onToggleStatus={toggleJobStatus}
                  onDelete={deleteJob}
                  selected={selectedJobs.includes(job.id)}
                  onSelect={handleJobSelection}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// JobCard component
function JobCard({ 
  job, 
  currentUser,
  onEdit,
  onToggleStatus, 
  onDelete,
  selected,
  onSelect
}: { 
  job: JobPosting
  currentUser: UserProfile | null
  onEdit: (job: JobPosting) => void
  onToggleStatus: (jobId: string, currentStatus: JobStatus, jobTitle: string) => void
  onDelete: (jobId: string, jobTitle: string) => void
  selected: boolean
  onSelect: (jobId: string) => void
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

  return (
    <div className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow relative ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Selection Checkbox */}
      <div className="absolute top-4 left-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(job.id)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>

      {/* Creator Indicator */}
      {isHRUser && !isCreator && (
        <div className="absolute top-4 right-4 flex items-center gap-1 text-gray-400 text-xs">
          <Lock className="h-3 w-3" />
          <span>Created by: {job.creator_name}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 space-y-3 ml-6">
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
                  <button
                    onClick={() => {
                      onEdit(job)
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors text-left"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onToggleStatus(job.id, job.status, job.job_title)
                      setShowMenu(false)
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors text-left',
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
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors text-left"
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
              <Link
                href={`/admin/job-postings/${job.id}/applications`}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
              >
                <Users className="h-3 w-3" />
                {job.applications_count} application{job.applications_count !== 1 ? 's' : ''}
              </Link>
            )}
            {isHRUser && (
              <span className="flex items-center gap-1 text-gray-400">
                Created by: {job.creator_name}
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
          
          <button
            onClick={() => onEdit(job)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
              canEdit
                ? "text-blue-700 hover:bg-blue-50"
                : "text-gray-400 cursor-not-allowed bg-gray-100"
            )}
            disabled={!canEdit}
            title={!canEdit && isHRUser ? `Created by: ${job.creator_name}` : ""}
          >
            <Edit className="h-4 w-4" />
            Edit
            {!canEdit && isHRUser && " (Not Yours)"}
          </button>

          <button
            onClick={() => onToggleStatus(job.id, job.status, job.job_title)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
              canEdit 
                ? job.status === 'active'
                  ? 'text-orange-700 hover:bg-orange-50'
                  : 'text-green-700 hover:bg-green-50'
                : 'text-gray-400 cursor-not-allowed bg-gray-100'
            )}
            disabled={!canEdit}
            title={!canEdit && isHRUser ? `Created by: ${job.creator_name}` : ""}
          >
            {job.status === 'active' ? 'Close Job' : 'Reopen Job'}
            {!canEdit && isHRUser && " (Not Yours)"}
          </button>

          <button
            onClick={() => onDelete(job.id, job.job_title)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
              canEdit
                ? "text-red-700 hover:bg-red-50"
                : "text-gray-400 cursor-not-allowed bg-gray-100"
            )}
            disabled={!canEdit}
            title={!canEdit && isHRUser ? `Created by: ${job.creator_name}` : ""}
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