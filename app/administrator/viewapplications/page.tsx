// app/administrator/view-applications/page.tsx
'use client'

import { useState, useEffect } from 'react'
import AdminHRSidebar, { MobileTopbar } from '@/components/adminhrsidebar'
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface Applicant {
  id: string
  email: string
  phone?: string
  role: string
  created_at: string
  first_name?: string
  middle_name?: string
  last_name?: string
  avatar_url?: string
  date_of_birth?: string
  age?: number
  address?: string
}

interface JobPosting {
  id: string
  job_title: string
  department: string
  location: string
  status: string
  date_posted: string
  created_by: string
  job_description?: string
  image_path?: string
}

interface Education {
  id: string
  profile_id: string
  course_qualification: string
  institution: string
  expected_finish?: string
  course_highlights?: string
  created_at?: string
  degree_level?: 'Elementary' | 'High School' | 'Vocational' | 'Associate' | 'Bachelors' | 'Masters' | 'Doctorate' | 'Post-Doctorate'
  year_graduated?: number
  degree_name?: string
  gpa?: number
  honors_awards?: string
}

interface WorkExperience {
  id: string
  profile_id: string
  job_title: string
  company: string
  start_date: string
  end_date?: string
  currently_working: boolean
  description?: string
  created_at?: string
}

interface Skill {
  id: string
  profile_id: string
  skill_name: string
  proficiency?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  years_of_experience?: number
  verified?: boolean
  created_at?: string
}

interface Application {
  id: string
  job_id: string
  applicant_id: string
  pdf_path: string
  comment?: string
  status: 'for_review' | 'shortlisted' | 'hired' | 'rejected'
  submitted_at: string
  updated_at?: string
  applicant: Applicant
  job_posting: JobPosting
}

interface ApplicantRecord {
  id: string
  name: string
  email: string
  phone?: string
  job_applied: string
  department: string
  status: string
  date_applied: string
  resume_url?: string
  age?: number
  address?: string
  qualifications: string[]
  skills: string[]
  total_experience: number
  highest_education: string
}

export default function ViewApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [applicantRecords, setApplicantRecords] = useState<ApplicantRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [sortField, setSortField] = useState<keyof ApplicantRecord>('date_applied')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const router = useRouter()

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Fetching applications for table view...')

      // Fetch all applications with both applicant and job posting details
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          applicant:profiles!applications_applicant_id_fkey(
            id,
            email,
            phone,
            role,
            created_at,
            first_name,
            middle_name,
            last_name,
            avatar_url,
            date_of_birth,
            age,
            address
          ),
          job_posting:job_postings!applications_job_id_fkey(
            id,
            job_title,
            department,
            location,
            status,
            date_posted,
            created_by,
            job_description,
            image_path
          )
        `)
        .order('submitted_at', { ascending: false })

      if (appsError) {
        console.error('Error fetching applications:', appsError)
        throw appsError
      }

      const apps: Application[] = (applicationsData || []).map(app => ({
        id: app.id,
        job_id: app.job_id,
        applicant_id: app.applicant_id,
        pdf_path: app.pdf_path,
        comment: app.comment || undefined,
        status: app.status || 'for_review',
        submitted_at: app.submitted_at,
        updated_at: app.updated_at,
        applicant: app.applicant ? {
          id: app.applicant.id || app.applicant_id,
          email: app.applicant.email || 'Unknown Email',
          phone: app.applicant.phone || '',
          role: app.applicant.role || 'applicant',
          created_at: app.applicant.created_at || new Date().toISOString(),
          first_name: app.applicant.first_name,
          middle_name: app.applicant.middle_name,
          last_name: app.applicant.last_name,
          avatar_url: app.applicant.avatar_url,
          date_of_birth: app.applicant.date_of_birth,
          age: app.applicant.age,
          address: app.applicant.address
        } : {
          id: app.applicant_id,
          email: 'Unknown Email',
          phone: '',
          role: 'applicant',
          created_at: new Date().toISOString(),
          first_name: undefined,
          middle_name: undefined,
          last_name: undefined,
          avatar_url: undefined,
          date_of_birth: undefined,
          age: undefined,
          address: undefined
        },
        job_posting: app.job_posting || {
          id: app.job_id,
          job_title: 'Unknown Position',
          department: 'N/A',
          location: 'N/A',
          status: 'unknown',
          date_posted: new Date().toISOString(),
          created_by: ''
        }
      }))

      console.log(`✅ Found ${apps.length} applications`)
      setApplications(apps)
      
      // Fetch additional details for each applicant
      const records = await Promise.all(apps.map(async (app) => {
        try {
          // Fetch qualifications and experience in parallel
          const [educationsResult, workExperiencesResult, skillsResult] = await Promise.all([
            supabase
              .from('educations')
              .select('*')
              .eq('profile_id', app.applicant_id)
              .order('year_graduated', { ascending: false }),
            supabase
              .from('work_experiences')
              .select('*')
              .eq('profile_id', app.applicant_id),
            supabase
              .from('skills')
              .select('*')
              .eq('profile_id', app.applicant_id)
          ])

          const educations: Education[] = educationsResult.data || []
          const workExperiences: WorkExperience[] = workExperiencesResult.data || []
          const skills: Skill[] = skillsResult.data || []

          // Calculate total experience
          let totalExperience = 0
          workExperiences.forEach(work => {
            try {
              const startDate = new Date(work.start_date)
              const endDate = work.currently_working ? new Date() : (work.end_date ? new Date(work.end_date) : new Date())
              const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
              totalExperience += years
            } catch (e) {
              console.warn('Error calculating experience for work:', work.id, e)
            }
          })

          // Get highest education
          let highestEducation = 'No education provided'
          if (educations.length > 0) {
            const edu = educations[0]
            const degreeLevel = edu.degree_level ? `${edu.degree_level} in ` : ''
            highestEducation = `${degreeLevel}${edu.course_qualification}`
          }

          // Get resume URL
          let resumeUrl = ''
          if (app.pdf_path) {
            try {
              const { data } = await supabase.storage
                .from('applications')
                .createSignedUrl(app.pdf_path, 3600)
              resumeUrl = data?.signedUrl || ''
            } catch (err) {
              console.error('Error fetching resume URL:', err)
            }
          }

          // Get applicant full name
          const getApplicantFullName = (applicant: Applicant): string => {
            const parts = [
              applicant.first_name,
              applicant.middle_name,
              applicant.last_name
            ].filter(Boolean)
            return parts.length > 0 ? parts.join(' ') : 'No Name Provided'
          }

          const record: ApplicantRecord = {
            id: app.applicant_id,
            name: getApplicantFullName(app.applicant),
            email: app.applicant.email || 'No Email',
            phone: app.applicant.phone || 'N/A',
            job_applied: app.job_posting.job_title,
            department: app.job_posting.department || 'N/A',
            status: app.status,
            date_applied: app.submitted_at,
            resume_url: resumeUrl,
            age: app.applicant.age,
            address: app.applicant.address || 'N/A',
            qualifications: educations.map(edu => edu.course_qualification),
            skills: skills.map(skill => skill.skill_name),
            total_experience: Math.round(totalExperience * 10) / 10,
            highest_education: highestEducation
          }

          return record
        } catch (err) {
          console.error('Error processing applicant:', app.applicant_id, err)
          // Return a basic record even if there's an error
          return {
            id: app.applicant_id,
            name: `${app.applicant.first_name || ''} ${app.applicant.middle_name || ''} ${app.applicant.last_name || ''}`.trim() || 'No Name',
            email: app.applicant.email || 'No Email',
            phone: app.applicant.phone || 'N/A',
            job_applied: app.job_posting.job_title,
            department: app.job_posting.department || 'N/A',
            status: app.status,
            date_applied: app.submitted_at,
            resume_url: '',
            age: app.applicant.age,
            address: app.applicant.address || 'N/A',
            qualifications: [],
            skills: [],
            total_experience: 0,
            highest_education: 'No education provided'
          }
        }
      }))

      setApplicantRecords(records)
      console.log(`✅ Processed ${records.length} applicant records`)
    } catch (err) {
      console.error('❌ Error fetching applications:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while fetching applications')
    } finally {
      setLoading(false)
    }
  }

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'for_review': return 'bg-blue-100 text-blue-800'
      case 'shortlisted': return 'bg-amber-100 text-amber-800'
      case 'hired': return 'bg-emerald-100 text-emerald-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (e) {
      return dateString
    }
  }

  const exportToCSV = () => {
    try {
      // Prepare data for CSV
      const csvData = [['ID', 'Name', 'Email', 'Phone', 'Job Applied', 'Department', 'Status', 'Date Applied', 'Age', 'Address', 'Highest Education', 'Total Experience (Years)', 'Skills', 'Qualifications']]
      
      filteredRecords.forEach(record => {
        const row = [
          record.id.substring(0, 8),
          record.name,
          record.email,
          record.phone || 'N/A',
          record.job_applied,
          record.department,
          record.status,
          formatDate(record.date_applied),
          record.age?.toString() || 'N/A',
          record.address || 'N/A',
          record.highest_education,
          record.total_experience.toString(),
          record.skills.join('; '),
          record.qualifications.join('; ')
        ]
        csvData.push(row)
      })
      
      // Convert to CSV string
      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n')
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `applicant_records_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      console.log(`✅ Exported ${filteredRecords.length} records to CSV`)
    } catch (err) {
      console.error('Error exporting to CSV:', err)
      alert('Failed to export CSV file')
    }
  }

  const handleSort = (field: keyof ApplicantRecord) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleSelectApplicant = (id: string) => {
    setSelectedApplicants(prev =>
      prev.includes(id)
        ? prev.filter(applicantId => applicantId !== id)
        : [...prev, id]
    )
  }

  const selectAllApplicants = () => {
    if (selectedApplicants.length === paginatedRecords.length && paginatedRecords.length > 0) {
      setSelectedApplicants([])
    } else {
      setSelectedApplicants(paginatedRecords.map(record => record.id))
    }
  }

  // Filter and sort records
  const filteredRecords = applicantRecords
    .filter(record => {
      const matchesSearch = searchQuery === '' || 
        record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.job_applied.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.department.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus
      const matchesDepartment = selectedDepartment === 'all' || record.department === selectedDepartment
      
      return matchesSearch && matchesStatus && matchesDepartment
    })
    .sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1
      
      if (sortField === 'date_applied') {
        return multiplier * (new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime())
      }
      
      if (sortField === 'total_experience') {
        return multiplier * (a[sortField] - b[sortField])
      }
      
      if (typeof a[sortField] === 'string' && typeof b[sortField] === 'string') {
        return multiplier * a[sortField].localeCompare(b[sortField])
      }
      
      return 0
    })

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage)

  // Get unique departments for filter
  const uniqueDepartments = [...new Set(applicantRecords.map(record => record.department).filter(Boolean))]

  if (loading) {
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-lg mt-4 text-gray-600">Loading applicant records...</p>
              </div>
            </div>
          </main>
        </div>
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
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  Applicant Records
                </h1>
                <p className="text-gray-600 mt-2">
                  View and manage all applicant information in tabular format
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => router.push('/administrator/applications')}
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  ← Back to Applications
                </Button>
                <Button 
                  onClick={exportToCSV}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export to CSV
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800">{error}</p>
              </div>
              <Button 
                onClick={fetchApplications}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, email, job, or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="for_review">For Review</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Departments</option>
                  {uniqueDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {filteredRecords.length} of {applicantRecords.length} records
                {selectedApplicants.length > 0 && (
                  <span className="ml-2 text-blue-600">
                    • {selectedApplicants.length} selected
                  </span>
                )}
              </div>
              <Button 
                onClick={fetchApplications}
                variant="outline"
                size="sm"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectedApplicants.length === paginatedRecords.length && paginatedRecords.length > 0}
                        onChange={selectAllApplicants}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Applicant
                        {sortField === 'name' && (
                          <svg className={`h-4 w-4 ml-1 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('job_applied')}
                    >
                      <div className="flex items-center">
                        Job Applied
                        {sortField === 'job_applied' && (
                          <svg className={`h-4 w-4 ml-1 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('department')}
                    >
                      <div className="flex items-center">
                        Department
                        {sortField === 'department' && (
                          <svg className={`h-4 w-4 ml-1 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {sortField === 'status' && (
                          <svg className={`h-4 w-4 ml-1 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('date_applied')}
                    >
                      <div className="flex items-center">
                        Date Applied
                        {sortField === 'date_applied' && (
                          <svg className={`h-4 w-4 ml-1 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('total_experience')}
                    >
                      <div className="flex items-center">
                        Experience
                        {sortField === 'total_experience' && (
                          <svg className={`h-4 w-4 ml-1 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-gray-500 text-lg">No applicant records found</p>
                        <p className="text-gray-400 text-sm mt-1">
                          {searchQuery || selectedStatus !== 'all' || selectedDepartment !== 'all' 
                            ? 'Try adjusting your filters' 
                            : 'No applications have been submitted yet'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedApplicants.includes(record.id)}
                            onChange={() => toggleSelectApplicant(record.id)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{record.name}</div>
                              <div className="text-sm text-gray-500">{record.email}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                {record.phone} • Age: {record.age || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{record.job_applied}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Education: {record.highest_education}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{record.department}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getApplicationStatusColor(record.status)}`}>
                            {record.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(record.date_applied)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{record.total_experience} years</div>
                          <div className="text-xs text-gray-500">
                            {record.skills.slice(0, 3).join(', ')}
                            {record.skills.length > 3 && '...'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            {record.resume_url && (
                              <Button
                                onClick={() => window.open(record.resume_url, '_blank')}
                                variant="outline"
                                size="sm"
                                title="View Resume"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </Button>
                            )}
                            <Button
                              onClick={() => {
                                const emailSubject = `Regarding your application for ${record.job_applied}`
                                const emailBody = `Dear ${record.name},\n\n`
                                window.location.href = `mailto:${record.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
                              }}
                              variant="outline"
                              size="sm"
                              title="Contact Applicant"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredRecords.length)}</span> of{' '}
                    <span className="font-medium">{filteredRecords.length}</span> results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 rounded-md text-sm ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      {totalPages > 5 && <span className="text-gray-500">...</span>}
                    </div>
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-blue-600">{applicantRecords.length}</div>
              <div className="text-sm text-gray-600">Total Applicants</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-emerald-600">
                {applicantRecords.filter(r => r.status === 'hired').length}
              </div>
              <div className="text-sm text-gray-600">Hired</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-amber-600">
                {applicantRecords.filter(r => r.status === 'shortlisted').length}
              </div>
              <div className="text-sm text-gray-600">Shortlisted</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-blue-600">
                {applicantRecords.filter(r => r.status === 'for_review').length}
              </div>
              <div className="text-sm text-gray-600">For Review</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}