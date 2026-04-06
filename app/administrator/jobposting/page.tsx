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
  AlertCircle, FileText, Check, ExternalLink,
  TrendingUp, Clock, CheckCircle, ChevronLeft,
  Save, Upload
} from 'lucide-react'
import { useRouter } from 'next/navigation'

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

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
  can_delete?: boolean
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
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<string>('')
  const [accessDenied, setAccessDenied] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [addFormData, setAddFormData] = useState({
    job_title: '',
    department: '',
    location: '',
    job_description: '',
    status: 'active' as JobStatus,
    image_file: null as File | null,
    image_preview: null as string | null
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

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

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
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role, email, first_name, last_name')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setCurrentUser(profile)

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
        const canEdit = currentUser.role === 'super_admin' || currentUser.role === 'hr'
        const hasApplications = (job.applications?.length || 0) > 0
        const canDelete = currentUser.role === 'super_admin' || 
                         (currentUser.role === 'hr' && isCreator && !hasApplications)

        const creatorName = job.profiles 
          ? `${job.profiles.first_name || ''} ${job.profiles.last_name || ''}`.trim() || job.profiles.email
          : 'Unknown'

        return {
          ...job,
          applications_count: job.applications?.length || 0,
          can_edit: canEdit,
          can_delete: canDelete,
          creator_email: job.profiles?.email || 'Unknown',
          creator_name: creatorName
        }
      }) || []

      setJobs(processedJobs)
      setSelectedJobs([])
    } catch (error) {
      console.error('Error fetching jobs:', error)
      showToast('Error fetching job postings', 'error')
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
      
      showToast(`Job posting "${addFormData.job_title}" created successfully!`, 'success')

    } catch (error: any) {
      console.error('Error creating job posting:', error)
      showToast('Error creating job posting: ' + error.message, 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent, jobId: string) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      if (!hasAccess()) {
        throw new Error('Access denied. You do not have permission to edit job postings.')
      }

      if (!editFormData.job_title.trim()) {
        throw new Error('Job title is required')
      }
      if (!editFormData.job_description.trim()) {
        throw new Error('Job description is required')
      }

      const job = jobs.find(j => j.id === jobId)
      let imagePath = editFormData.image_preview?.startsWith('blob:') ? null : editFormData.image_preview

      if (editFormData.image_file) {
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
        .eq('id', jobId)

      if (error) throw error

      await logAction('update', 'job_posting', jobId, editFormData.job_title, {
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
      setEditingJobId(null)
      
      showToast(`Job posting "${editFormData.job_title}" updated successfully!`, 'success')

    } catch (error: any) {
      console.error('Error updating job posting:', error)
      showToast('Error updating job posting: ' + error.message, 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const startEditJob = (job: JobPosting) => {
    if (!hasAccess()) {
      showToast('Access denied. You do not have permission to edit job postings.', 'error')
      return
    }

    setEditingJobId(job.id)
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
  }

  const cancelEdit = () => {
    setEditingJobId(null)
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
  }

  const toggleJobStatus = async (jobId: string, currentStatus: JobStatus, jobTitle: string) => {
    if (!hasAccess()) {
      showToast('Access denied. You do not have permission to update job status.', 'error')
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
      
      showToast(`Job "${jobTitle}" ${newStatus === 'active' ? 'reopened' : 'closed'} successfully!`, 'success')
    } catch (error) {
      console.error('Error updating job status:', error)
      showToast('Error updating job status', 'error')
    }
  }

  const deleteJob = async (jobId: string, jobTitle: string) => {
    if (!hasAccess()) {
      showToast('Access denied. You do not have permission to delete job postings.', 'error')
      return
    }

    const job = jobs.find(j => j.id === jobId)
    
    if (!job?.can_delete) {
      if (currentUser?.role === 'hr' && job) {
        if (job.applications_count && job.applications_count > 0) {
          showToast(`Cannot delete "${jobTitle}" because it has ${job.applications_count} application(s). Only Super Admin can delete jobs with applications.`, 'warning')
        } else if (job.created_by !== currentUser.id) {
          showToast(`You can only delete job postings you created. This job was created by: ${job.creator_name}`, 'warning')
        }
      }
      return
    }

    if (!confirm(`Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`)) return
    
    try {
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
      setEditingJobId(null)
      showToast(`Job posting "${jobTitle}" deleted successfully!`, 'success')
    } catch (error) {
      console.error('Error deleting job:', error)
      showToast('Error deleting job posting', 'error')
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
      showToast('Access denied. You do not have permission to select jobs.', 'error')
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
      showToast('Access denied. You do not have permission to perform bulk actions.', 'error')
      return
    }

    if (!bulkAction || selectedJobs.length === 0) return

    try {
      const selectedJobObjects = jobs.filter(job => selectedJobs.includes(job.id))
      
      if (bulkAction === 'delete') {
        if (currentUser?.role === 'hr') {
          const cannotDeleteJobs = selectedJobObjects.filter(job => !job.can_delete)
          if (cannotDeleteJobs.length > 0) {
            const jobList = cannotDeleteJobs.map(job => 
              `• "${job.job_title}" (${job.applications_count || 0} applications)`
            ).join('\n')
            
            showToast(`Cannot delete the following jobs:\n${jobList}\n\nOnly Super Admin can delete jobs with applications.`, 'warning')
            return
          }
        }
        
        if (!confirm(`Are you sure you want to delete ${selectedJobs.length} job(s)? This action cannot be undone.`)) return
      }

      switch (bulkAction) {
        case 'activate':
          await supabase
            .from('job_postings')
            .update({ status: 'active' })
            .in('id', selectedJobs)
          showToast(`${selectedJobs.length} job(s) activated successfully!`, 'success')
          break

        case 'close':
          await supabase
            .from('job_postings')
            .update({ status: 'closed' })
            .in('id', selectedJobs)
          showToast(`${selectedJobs.length} job(s) closed successfully!`, 'success')
          break

        case 'delete':
          for (const job of selectedJobObjects) {
            if (job?.image_path) {
              await deleteImage(job.image_path)
            }
          }

          await supabase
            .from('job_postings')
            .delete()
            .in('id', selectedJobs)
          showToast(`${selectedJobs.length} job(s) deleted successfully!`, 'success')
          break
      }

      await logAction(bulkAction, 'job_posting_bulk', null, `${selectedJobs.length} jobs`, {
        job_ids: selectedJobs,
        action: bulkAction
      })

      await fetchJobs()
      setBulkAction('')
    } catch (error) {
      console.error('Error performing bulk action:', error)
      showToast('Error performing bulk action', 'error')
    }
  }

  const exportToCSV = () => {
    if (!hasAccess()) {
      showToast('Access denied. You do not have permission to export data.', 'error')
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
    
    showToast('Job postings exported successfully!', 'success')
  }

  const handleAddFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setAddFormData((prev) => ({
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
        showToast('Please select an image file', 'warning')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size should be less than 5MB', 'warning')
        return
      }

      setAddFormData((prev) => ({
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
        showToast('Please select an image file', 'warning')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size should be less than 5MB', 'warning')
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
    setAddFormData((prev) => ({
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg",
            toast.type === 'success' && "bg-green-50 border border-green-200 text-green-800",
            toast.type === 'error' && "bg-red-50 border border-red-200 text-red-800",
            toast.type === 'warning' && "bg-yellow-50 border border-yellow-200 text-yellow-800"
          )}>
            {toast.type === 'success' && <Check className="h-5 w-5" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5" />}
            {toast.type === 'warning' && <AlertCircle className="h-5 w-5" />}
            <p className="text-sm">{toast.message}</p>
          </div>
        </div>
      )}

      <AdminHRSidebar 
        mobileOpen={sidebarOpen} 
        onMobileClose={() => setSidebarOpen(false)} 
      />
      
      <div className="lg:pl-64">
        <MobileTopbar onMenu={() => setSidebarOpen(true)} />
        
        <main className="p-4 md:p-6">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
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
                  ? 'You can edit all jobs, but can only delete your own jobs without applications'
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
              
              {canCreateJobs && !showAddForm && (
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
          {showAddForm && (
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Create New Job Posting
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      name="job_title"
                      required
                      value={addFormData.job_title}
                      onChange={handleAddFormChange}
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
                      value={addFormData.department}
                      onChange={handleAddFormChange}
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
                      value={addFormData.location}
                      onChange={handleAddFormChange}
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
                      value={addFormData.status}
                      onChange={handleAddFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="closed">Closed</option>
                    </select>
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
                    value={addFormData.job_description}
                    onChange={handleAddFormChange}
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
                    onChange={(e) => setBulkAction(e.target.value)}
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

          {/* Jobs List */}
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
                ) : canCreateJobs && !showAddForm && (
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
                  isEditing={editingJobId === job.id}
                  editFormData={editingJobId === job.id ? editFormData : null}
                  onEditFormChange={handleEditFormChange}
                  onEditFileChange={handleEditFileChange}
                  onRemoveEditImage={removeEditImage}
                  onStartEdit={() => startEditJob(job)}
                  onCancelEdit={cancelEdit}
                  onSubmitEdit={(e) => handleEditSubmit(e, job.id)}
                  onToggleStatus={() => toggleJobStatus(job.id, job.status, job.job_title)}
                  onDelete={() => deleteJob(job.id, job.job_title)}
                  selected={selectedJobs.includes(job.id)}
                  onSelect={() => handleJobSelection(job.id)}
                  formLoading={formLoading && editingJobId === job.id}
                  fileInputRef={fileInputRef}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// JobCard component with integrated edit form
function JobCard({
  job,
  currentUser,
  isEditing,
  editFormData,
  onEditFormChange,
  onEditFileChange,
  onRemoveEditImage,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onToggleStatus,
  onDelete,
  selected,
  onSelect,
  formLoading,
  fileInputRef
}: {
  job: JobPosting
  currentUser: UserProfile | null
  isEditing: boolean
  editFormData: EditFormData | null
  onEditFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  onEditFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveEditImage: () => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSubmitEdit: (e: React.FormEvent) => void
  onToggleStatus: () => void
  onDelete: () => void
  selected: boolean
  onSelect: () => void
  formLoading: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
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
  const canEdit = job.can_edit
  const canDelete = job.can_delete
  const isHRUser = currentUser?.role === 'hr'
  const isSuperAdmin = currentUser?.role === 'super_admin'

  return (
    <div className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow relative ${selected ? 'ring-2 ring-blue-500' : ''} ${isEditing ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
      {/* Selection Checkbox */}
      <div className="absolute top-4 left-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>

      {!isEditing ? (
        /* View Mode */
        <>
          {/* Applications Warning */}
          {job.applications_count && job.applications_count > 0 && isHRUser && !isCreator && (
            <div className="absolute top-4 right-4 flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs">
              <FileText className="h-3 w-3" />
              <span>{job.applications_count} application(s)</span>
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
                        {job.applications_count !== undefined && (
                          <Link
                            href={`/administrator/jobposting/${job.id}`}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          >
                            <Users className="h-3 w-3" />
                            {job.applications_count} application{job.applications_count !== 1 ? 's' : ''}
                          </Link>
                        )}
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
                        href={`/administrator/jobposting/${job.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setShowMenu(false)}
                      >
                        <Eye className="h-4 w-4" />
                        View Applications
                      </Link>
                      <button
                        onClick={() => {
                          onStartEdit()
                          setShowMenu(false)
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors text-left"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          onToggleStatus()
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
                          if (canDelete) {
                            onDelete()
                            setShowMenu(false)
                          }
                        }}
                        className={cn(
                          'flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors text-left',
                          canDelete
                            ? 'text-red-700 hover:bg-red-50'
                            : 'text-gray-400 cursor-not-allowed'
                        )}
                        disabled={!canDelete}
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
                    href={`/administrator/jobposting/${job.id}`}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <Eye className="h-3 w-3" />
                    View Applications
                  </Link>
                )}
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
              <Link
                href={`/administrator/jobposting/${job.id}`}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Eye className="h-4 w-4" />
                View Apps
              </Link>
              
              <button
                onClick={onStartEdit}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                  canEdit
                    ? "text-blue-700 hover:bg-blue-50"
                    : "text-gray-400 cursor-not-allowed bg-gray-100"
                )}
                disabled={!canEdit}
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>

              <button
                onClick={onToggleStatus}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
                  canEdit 
                    ? job.status === 'active'
                      ? 'text-orange-700 hover:bg-orange-50'
                      : 'text-green-700 hover:bg-green-50'
                    : 'text-gray-400 cursor-not-allowed bg-gray-100'
                )}
                disabled={!canEdit}
              >
                {job.status === 'active' ? 'Close Job' : 'Reopen Job'}
              </button>

              <button
                onClick={onDelete}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                  canDelete
                    ? "text-red-700 hover:bg-red-50"
                    : "text-gray-400 cursor-not-allowed bg-gray-100"
                )}
                disabled={!canDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Edit Mode - Form inside the same card */
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Editing: {job.job_title}
            </h3>
            <button
              onClick={onCancelEdit}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={onSubmitEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="job_title"
                  required
                  value={editFormData?.job_title || ''}
                  onChange={onEditFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={editFormData?.department || ''}
                  onChange={onEditFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={editFormData?.location || ''}
                  onChange={onEditFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  name="status"
                  required
                  value={editFormData?.status || 'active'}
                  onChange={onEditFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Image Upload in Edit Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Image
              </label>
              <div className="space-y-2">
                {editFormData?.image_preview ? (
                  <div className="relative inline-block">
                    <img
                      src={editFormData.image_preview}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={onRemoveEditImage}
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
                  onChange={onEditFileChange}
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
                value={editFormData?.job_description || ''}
                onChange={onEditFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Job
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}