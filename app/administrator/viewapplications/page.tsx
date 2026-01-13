// app/administrator/view-applications/page.tsx
'use client'

import type { ReactNode } from 'react'    
import { useState, useEffect, useRef } from 'react'
import AdminHRSidebar, { MobileTopbar } from '@/components/adminhrsidebar'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Shield, AlertCircle, Lock, Mail, FileText, Eye, GripVertical, Check, Star, Calendar, Briefcase, GraduationCap, MapPin, Phone, MoreVertical } from 'lucide-react'

// Define proper types for the Button component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  disabled?: boolean
  title?: string
}

// Create a local Button component with proper TypeScript typing
const Button = ({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'default',
  className = '',
  disabled = false,
  title = '',
  ...props
}: ButtonProps) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap'
  
  const variantStyles = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-100 text-gray-900',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    ghost: 'hover:bg-gray-100 text-gray-900'
  } as const
  
  const sizeStyles = {
    default: 'h-10 px-4 py-2 text-sm sm:text-base',
    sm: 'h-9 px-3 text-xs sm:text-sm',
    lg: 'h-12 px-6 py-3 text-base sm:text-lg',
    icon: 'h-10 w-10 p-0'
  } as const

  const variantClass = variantStyles[variant || 'default']
  const sizeClass = sizeStyles[size || 'default']

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        ${baseStyles}
        ${variantClass}
        ${sizeClass}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}

interface UserProfile {
  id: string
  role: 'applicant' | 'hr' | 'super_admin'
  email: string
  first_name: string | null
  last_name: string | null
}

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
  avatar_url?: string
  experience_details?: string[]
  application_id?: string
  job_location?: string
}

// Draggable Card Component
interface DraggableCardProps {
  record: ApplicantRecord
  index: number
  isDragging: boolean
  isSelected: boolean
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
  onSelect: (id: string) => void
  onViewResume: (url: string) => void
  onStatusChange: (id: string, status: string) => void
}

const DraggableCard = ({
  record,
  index,
  isDragging,
  isSelected,
  onDragStart,
  onDragOver,
  onDragEnd,
  onSelect,
  onViewResume,
  onStatusChange
}: DraggableCardProps) => {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'for_review': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'shortlisted': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'hired': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch (e) {
      return dateString
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={`
        relative group bg-white rounded-xl border-2 transition-all duration-200
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300'}
        ${isDragging ? 'opacity-50 scale-95' : 'hover:shadow-lg'}
        hover:shadow-gray-200 cursor-move
      `}
      style={{ touchAction: 'none' }}
    >
      {/* Drag Handle */}
      <div 
        className="absolute -left-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="bg-white border border-gray-300 rounded-lg p-1 shadow-sm cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Selection Checkbox */}
      <div className="absolute top-3 right-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(record.id)}
          className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
      </div>

      {/* Card Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {/* Avatar */}
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-semibold text-lg">
                  {record.name.charAt(0).toUpperCase()}
                </div>
                {record.status === 'shortlisted' && (
                  <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1">
                    <Star className="h-3 w-3" />
                  </div>
                )}
              </div>

              {/* Name and Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {record.name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{record.email}</span>
                </div>
                {record.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Phone className="h-3 w-3" />
                    <span>{record.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Job Title */}
            <div className="mb-3">
              <div className="flex items-center gap-2 text-gray-900">
                <Briefcase className="h-4 w-4 text-blue-600" />
                <span className="font-medium truncate">{record.job_applied}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1 ml-6">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{record.department} • {record.job_location || 'Remote'}</span>
              </div>
            </div>
          </div>

          {/* Status Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMenu(!showMenu)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Change Status
                  </div>
                  {['for_review', 'shortlisted', 'hired', 'rejected'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        onStatusChange(record.id, status)
                        setShowMenu(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50 flex items-center justify-between ${
                        record.status === status ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <span>{status.replace('_', ' ')}</span>
                      {record.status === status && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
            {record.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Applied:</span>
            <span className="font-medium">{formatDate(record.date_applied)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Experience:</span>
            <span className="font-medium">{record.total_experience} yrs</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <GraduationCap className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Education:</span>
            <span className="font-medium truncate">{record.highest_education.split(' in ')[0]}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Age:</span>
            <span className="font-medium">{record.age || 'N/A'}</span>
          </div>
        </div>

        {/* Skills */}
        {record.skills.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-500 mb-2">SKILLS</div>
            <div className="flex flex-wrap gap-2">
              {record.skills.slice(0, 4).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
                >
                  {skill}
                </span>
              ))}
              {record.skills.length > 4 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                  +{record.skills.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewResume(record.resume_url || '')}
            disabled={!record.resume_url}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            Resume
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => record.application_id && window.open(`/administrator/applications/${record.application_id}`, '_blank')}
            title="View Details"
            disabled={!record.application_id}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Drag Indicator */}
      <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded-xl opacity-0 group-hover:opacity-20 pointer-events-none transition-opacity" />
    </div>
  )
}

export default function ViewApplicationsPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [applicantRecords, setApplicantRecords] = useState<ApplicantRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingUser, setLoadingUser] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const itemsPerPage = 12

  useEffect(() => {
    checkUserAndRedirect()
  }, [])

  useEffect(() => {
    if (currentUser && hasAccess()) {
      fetchApplications()
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

  const fetchApplications = async () => {
    if (!currentUser || !hasAccess()) return

    try {
      setLoading(true)
      setError(null)

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

      if (appsError) throw appsError

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

      setApplications(apps)
      
      const records = await Promise.all(apps.map(async (app) => {
        try {
          const [educationsResult, workExperiencesResult, skillsResult] = await Promise.all([
            supabase.from('educations').select('*').eq('profile_id', app.applicant_id).order('year_graduated', { ascending: false }),
            supabase.from('work_experiences').select('*').eq('profile_id', app.applicant_id),
            supabase.from('skills').select('*').eq('profile_id', app.applicant_id)
          ])

          const educations: Education[] = educationsResult.data || []
          const workExperiences: WorkExperience[] = workExperiencesResult.data || []
          const skills: Skill[] = skillsResult.data || []

          let totalExperience = 0
          workExperiences.forEach(work => {
            try {
              const startDate = new Date(work.start_date)
              const endDate = work.currently_working ? new Date() : (work.end_date ? new Date(work.end_date) : new Date())
              const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
              totalExperience += years
            } catch (e) {}
          })

          let highestEducation = 'No education provided'
          if (educations.length > 0) {
            const edu = educations[0]
            const degreeLevel = edu.degree_level ? `${edu.degree_level} in ` : ''
            highestEducation = `${degreeLevel}${edu.course_qualification}`
          }

          let resumeUrl = ''
          if (app.pdf_path) {
            try {
              const { data } = await supabase.storage
                .from('applications')
                .createSignedUrl(app.pdf_path, 3600)
              resumeUrl = data?.signedUrl || ''
            } catch (err) {}
          }

          const record: ApplicantRecord = {
            id: app.applicant_id,
            name: `${app.applicant.first_name || ''} ${app.applicant.middle_name || ''} ${app.applicant.last_name || ''}`.trim() || 'No Name',
            email: app.applicant.email || 'No Email',
            phone: app.applicant.phone || 'N/A',
            job_applied: app.job_posting.job_title,
            department: app.job_posting.department || 'N/A',
            status: app.status,
            date_applied: app.submitted_at,
            resume_url: resumeUrl,
            age: app.applicant.age,
            address: app.applicant.address || 'N/A',
            avatar_url: app.applicant.avatar_url,
            qualifications: educations.map(edu => edu.course_qualification),
            skills: skills.map(skill => skill.skill_name),
            total_experience: Math.round(totalExperience * 10) / 10,
            highest_education: highestEducation,
            application_id: app.id,
            job_location: app.job_posting.location
          }

          return record
        } catch (err) {
          console.error('Error processing applicant:', app.applicant_id, err)
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
            avatar_url: app.applicant.avatar_url,
            qualifications: [],
            skills: [],
            total_experience: 0,
            highest_education: 'No education provided',
            application_id: app.id,
            job_location: app.job_posting.location
          }
        }
      }))

      setApplicantRecords(records)
    } catch (err) {
      console.error('Error fetching applications:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while fetching applications')
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString())
    setDraggingIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
  }

  const handleDragEnd = () => {
    setDraggingIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'))
    
    if (dragIndex === dropIndex) return
    
    const updatedRecords = [...applicantRecords]
    const [draggedItem] = updatedRecords.splice(dragIndex, 1)
    updatedRecords.splice(dropIndex, 0, draggedItem)
    
    setApplicantRecords(updatedRecords)
    setDraggingIndex(null)
  }

  const exportToCSV = () => {
    if (!currentUser || !hasAccess()) {
      alert('Access denied. Only HR and Super Admins can export applicant data.')
      return
    }

    try {
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
          new Date(record.date_applied).toLocaleDateString('en-US'),
          record.age?.toString() || 'N/A',
          record.address || 'N/A',
          record.highest_education,
          record.total_experience.toString(),
          record.skills.join('; '),
          record.qualifications.join('; ')
        ]
        csvData.push(row)
      })
      
      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `applicant_records_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting to CSV:', err)
      alert('Failed to export CSV file')
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
    if (selectedApplicants.length === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedApplicants([])
    } else {
      setSelectedApplicants(filteredRecords.map(record => record.id))
    }
  }

  const handleStatusChange = async (applicantId: string, newStatus: string) => {
    try {
      // Find the application for this applicant
      const application = applications.find(app => app.applicant_id === applicantId)
      if (!application) {
        console.error('Application not found for applicant:', applicantId)
        return
      }

      // Update in database
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString() 
        })
        .eq('id', application.id)

      if (error) {
        console.error('Supabase update error:', error)
        throw error
      }

      // Update local state - applications array
      setApplications(prev => 
        prev.map(app => 
          app.id === application.id 
            ? { ...app, status: newStatus as 'for_review' | 'shortlisted' | 'hired' | 'rejected' }
            : app
        )
      )

      // Update local state - applicantRecords array
      setApplicantRecords(prev =>
        prev.map(record =>
          record.id === applicantId ? { ...record, status: newStatus } : record
        )
      )
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Failed to update status')
    }
  }

  const handleViewResume = (url: string) => {
    if (url) {
      window.open(url, '_blank')
    } else {
      alert('No resume available for this applicant')
    }
  }

  // Filter records
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

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage)

  // Get unique departments for filter
  const uniqueDepartments = [...new Set(applicantRecords.map(record => record.department).filter(Boolean))]

  // Get status counts
  const statusCounts = {
    total: applicantRecords.length,
    hired: applicantRecords.filter(r => r.status === 'hired').length,
    shortlisted: applicantRecords.filter(r => r.status === 'shortlisted').length,
    for_review: applicantRecords.filter(r => r.status === 'for_review').length,
    rejected: applicantRecords.filter(r => r.status === 'rejected').length
  }

  // Show loading state
  if (loadingUser) {
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
                <p className="text-lg mt-4 text-gray-600">Checking permissions...</p>
              </div>
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
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <Lock className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600 mb-4">
                  This page is restricted to HR Managers and Super Administrators only.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700">
                      Applicants cannot access this page. Only HR and Super Admin roles are allowed.
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => router.push('/dashboard')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
                  >
                    Go to Dashboard
                  </Button>
                  <Button 
                    onClick={() => router.back()}
                    variant="outline"
                    className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto"
                  >
                    Go Back
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Applicant Dashboard
                </h1>
                <p className="text-gray-600 mt-2">
                  Drag and drop cards to organize applicants visually
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => router.push('/administrator/applications')}
                  variant="outline"
                  className="w-full sm:w-auto justify-center"
                >
                  ← Back to Applications
                </Button>
                <Button 
                  onClick={exportToCSV}
                  className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto justify-center"
                >
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                currentUser?.role === 'super_admin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                <Shield className="h-3 w-3" />
                {currentUser?.role === 'super_admin' ? 'Super Administrator' : 'HR Manager'}
              </span>
              <span className="text-sm text-gray-500">
                {selectedApplicants.length > 0 && `${selectedApplicants.length} selected`}
              </span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
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

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">{statusCounts.total}</div>
              <div className="text-sm text-gray-600">Total Applicants</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-blue-600">{statusCounts.for_review}</div>
              <div className="text-sm text-gray-600">For Review</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-amber-600">{statusCounts.shortlisted}</div>
              <div className="text-sm text-gray-600">Shortlisted</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-emerald-600">{statusCounts.hired}</div>
              <div className="text-sm text-gray-600">Hired</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-red-600">{statusCounts.rejected}</div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search applicants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
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

              {/* Department Filter */}
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

              {/* Actions */}
              <div className="flex flex-col justify-end gap-2">
                <div className="flex gap-2">
                  <Button
                    onClick={selectAllApplicants}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    {selectedApplicants.length === filteredRecords.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    onClick={fetchApplications}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Refresh
                  </Button>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {filteredRecords.length} applicants found
                </div>
              </div>
            </div>
          </div>

          {/* Draggable Cards Grid */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, paginatedRecords.length)}
            className="mb-6"
          >
            {paginatedRecords.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No applicants found</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {searchQuery || selectedStatus !== 'all' || selectedDepartment !== 'all' 
                    ? 'Try adjusting your filters to see more results.'
                    : 'No applications have been submitted yet.'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {paginatedRecords.map((record, index) => (
                    <DraggableCard
                      key={record.id}
                      record={record}
                      index={startIndex + index}
                      isDragging={draggingIndex === startIndex + index}
                      isSelected={selectedApplicants.includes(record.id)}
                      onDragStart={handleDragStart}
                      onDragOver={(e) => handleDragOver(e, startIndex + index)}
                      onDragEnd={handleDragEnd}
                      onSelect={toggleSelectApplicant}
                      onViewResume={handleViewResume}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredRecords.length)}</span> of{' '}
                      <span className="font-medium">{filteredRecords.length}</span> applicants
                    </div>
                    <div className="flex items-center gap-2">
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
                              className={`w-10 h-10 rounded-lg text-sm ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
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
                )}
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <GripVertical className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">How to use this dashboard</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Drag and drop cards to organize applicants visually</li>
                  <li>• Click and drag the handle on the left side of any card</li>
                  <li>• Select multiple applicants using checkboxes for bulk actions</li>
                  <li>• Click the menu icon on any card to change status</li>
                  <li>• Hover over cards to see drag indicators</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}