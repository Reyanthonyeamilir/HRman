'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Save, 
  Upload,
  GraduationCap,
  Briefcase,
  Target,
  Award,
  BookOpen,
  Edit,
  X,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Shield,
  Eye,
  EyeOff,
  Key,
  Lock,
  HelpCircle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserProfile {
  id: string
  email: string
  role: 'applicant' | 'hr' | 'super_admin'
  first_name: string | null
  middle_name: string | null
  last_name: string | null
  avatar_url: string | null
  phone: string | null
  date_of_birth: string | null
  age: number | null
  address: string | null
  created_at: string
  updated_at: string | null
}

interface Education {
  id: string
  profile_id: string
  course_qualification: string
  institution: string
  expected_finish: string | null
  course_highlights: string | null
  degree_level: string | null
  year_graduated: number | null
  degree_name: string | null
  gpa: number | null
  honors_awards: string | null
  created_at: string
}

interface WorkExperience {
  id: string
  profile_id: string
  job_title: string
  company: string
  start_date: string
  end_date: string | null
  currently_working: boolean
  description: string | null
  created_at: string
}

interface Skill {
  id: string
  profile_id: string
  skill_name: string
  proficiency?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  years_of_experience: number | null
  verified: boolean
  created_at: string
}

interface Eligibility {
  id: string
  profile_id: string
  eligibility_name: string
  license_number: string | null
  rating: string | null
  date_issued: string | null
  expiry_date: string | null
  issuing_authority: string | null
  document_path: string | null
  created_at: string
}

interface Training {
  id: string
  profile_id: string
  training_name: string
  institution: string
  start_date: string | null
  end_date: string | null
  duration_hours: number | null
  certificate_id: string | null
  certificate_path: string | null
  skills_learned: string | null
  created_at: string
}

interface ProfileWithDetails extends UserProfile {
  educations: Education[]
  work_experiences: WorkExperience[]
  skills: Skill[]
  eligibilities: Eligibility[]
  trainings: Training[]
}

export default function ApplicantProfilePage() {
  return <ProfileContent />
}

function ProfileContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [userProfile, setUserProfile] = useState<ProfileWithDetails | null>(null)
  const [copiedId, setCopiedId] = useState(false)
  
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    address: ''
  })

  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  // Section visibility states
  const [showAddEducation, setShowAddEducation] = useState(false)
  const [showAddExperience, setShowAddExperience] = useState(false)
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [showAddEligibility, setShowAddEligibility] = useState(false)
  const [showAddTraining, setShowAddTraining] = useState(false)

  // Sample data for beginners
  const sampleData = {
    education: {
      course_qualification: 'Bachelor of Science in Computer Science',
      institution: 'University of Technology',
      degree_level: 'Bachelors',
      degree_name: 'BS Computer Science',
      year_graduated: '2023',
      gpa: '3.8',
      course_highlights: 'Specialized in web development and database management',
      honors_awards: 'Dean\'s List, Magna Cum Laude'
    },
    workExperience: {
      job_title: 'Software Developer',
      company: 'Tech Solutions Inc.',
      start_date: '2023-06-01',
      currently_working: true,
      description: 'Developed web applications using React and Node.js'
    },
    skill: {
      skill_name: 'JavaScript',
      proficiency: 'Advanced',
      years_of_experience: '3'
    },
    eligibility: {
      eligibility_name: 'Civil Service Professional',
      license_number: 'CS123456',
      rating: '90.5',
      issuing_authority: 'Civil Service Commission',
      date_issued: '2023-01-15'
    },
    training: {
      training_name: 'Advanced React Development',
      institution: 'Tech Training Academy',
      duration_hours: '40',
      skills_learned: 'React Hooks, Context API, Performance Optimization'
    }
  }

  // Form states for each section
  const [newEducation, setNewEducation] = useState({
    course_qualification: '',
    institution: '',
    expected_finish: '',
    course_highlights: '',
    degree_level: '',
    year_graduated: '',
    degree_name: '',
    gpa: '',
    honors_awards: ''
  })

  const [newWorkExperience, setNewWorkExperience] = useState({
    job_title: '',
    company: '',
    start_date: '',
    end_date: '',
    currently_working: false,
    description: ''
  })

  const [newSkill, setNewSkill] = useState({
    skill_name: '',
    proficiency: '',
    years_of_experience: '',
  })

  const [newEligibility, setNewEligibility] = useState({
    eligibility_name: '',
    license_number: '',
    rating: '',
    date_issued: '',
    expiry_date: '',
    issuing_authority: '',
  })

  const [newTraining, setNewTraining] = useState({
    training_name: '',
    institution: '',
    start_date: '',
    end_date: '',
    duration_hours: '',
    certificate_id: '',
    skills_learned: '',
  })

  // Edit states
  const [editingEducation, setEditingEducation] = useState<string | null>(null)
  const [editEducationData, setEditEducationData] = useState(newEducation)

  const [editingExperience, setEditingExperience] = useState<string | null>(null)
  const [editExperienceData, setEditExperienceData] = useState(newWorkExperience)

  const [editingSkill, setEditingSkill] = useState<string | null>(null)
  const [editSkillData, setEditSkillData] = useState(newSkill)

  const [editingEligibility, setEditingEligibility] = useState<string | null>(null)
  const [editEligibilityData, setEditEligibilityData] = useState(newEligibility)

  const [editingTraining, setEditingTraining] = useState<string | null>(null)
  const [editTrainingData, setEditTrainingData] = useState(newTraining)

  // Helper functions
  const getDisplayName = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`
    }
    return userProfile?.email?.split('@')[0] || 'Applicant'
  }

  const getRoleDisplay = () => {
    if (userProfile?.role === 'super_admin') {
      return 'Super Administrator'
    } else if (userProfile?.role === 'hr') {
      return 'HR Manager'
    }
    return 'Applicant'
  }

  const getInitials = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name.charAt(0)}${userProfile.last_name.charAt(0)}`.toUpperCase()
    }
    return userProfile?.email?.charAt(0).toUpperCase() || 'A'
  }

  const formatFullDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const formatMonthYear = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  // Sample input helpers
  const getSampleInput = (section: string, field: string) => {
    const samples: Record<string, Record<string, string>> = {
      education: {
        course_qualification: 'e.g., Bachelor of Science in Computer Science',
        institution: 'e.g., University of Technology',
        degree_level: 'Select your highest degree level',
        degree_name: 'e.g., BS Computer Science',
        year_graduated: 'e.g., 2023',
        gpa: 'e.g., 3.8 (on a 4.0 scale)',
        course_highlights: 'e.g., Specialized in web development, machine learning',
        honors_awards: 'e.g., Dean\'s List, Magna Cum Laude, Scholarship recipient'
      },
      workExperience: {
        job_title: 'e.g., Software Developer, Marketing Manager',
        company: 'e.g., Tech Solutions Inc., ABC Corporation',
        description: 'Describe your responsibilities and achievements',
      },
      skill: {
        skill_name: 'e.g., JavaScript, Project Management, Communication',
        proficiency: 'Select your proficiency level',
        years_of_experience: 'e.g., 3 (years)'
      },
      eligibility: {
        eligibility_name: 'e.g., Civil Service Professional, Licensed Engineer',
        license_number: 'e.g., CS123456, PRC-12345',
        rating: 'e.g., 90.5 (if applicable)',
        issuing_authority: 'e.g., Civil Service Commission, PRC'
      },
      training: {
        training_name: 'e.g., Leadership Training, Technical Workshop',
        institution: 'e.g., Training Academy, Professional Organization',
        skills_learned: 'List key skills or topics covered'
      }
    }
    return samples[section]?.[field] || ''
  }

  const fillSampleData = (section: string) => {
    switch(section) {
      case 'education':
        setNewEducation({
          course_qualification: sampleData.education.course_qualification,
          institution: sampleData.education.institution,
          expected_finish: '',
          course_highlights: sampleData.education.course_highlights,
          degree_level: sampleData.education.degree_level,
          year_graduated: sampleData.education.year_graduated,
          degree_name: sampleData.education.degree_name,
          gpa: sampleData.education.gpa,
          honors_awards: sampleData.education.honors_awards
        })
        break
      case 'workExperience':
        setNewWorkExperience({
          job_title: sampleData.workExperience.job_title,
          company: sampleData.workExperience.company,
          start_date: sampleData.workExperience.start_date,
          end_date: '',
          currently_working: sampleData.workExperience.currently_working,
          description: sampleData.workExperience.description
        })
        break
      case 'skill':
        setNewSkill({
          skill_name: sampleData.skill.skill_name,
          proficiency: sampleData.skill.proficiency,
          years_of_experience: sampleData.skill.years_of_experience,
        })
        break
      case 'eligibility':
        setNewEligibility({
          eligibility_name: sampleData.eligibility.eligibility_name,
          license_number: sampleData.eligibility.license_number,
          rating: sampleData.eligibility.rating,
          date_issued: sampleData.eligibility.date_issued,
          expiry_date: '',
          issuing_authority: sampleData.eligibility.issuing_authority,
        })
        break
      case 'training':
        setNewTraining({
          training_name: sampleData.training.training_name,
          institution: sampleData.training.institution,
          start_date: '',
          end_date: '',
          duration_hours: sampleData.training.duration_hours,
          certificate_id: '',
          skills_learned: sampleData.training.skills_learned,
        })
        break
    }
  }

  // Helper components
  const HelpTooltip = ({ content }: { content: string }) => (
    <div className="group relative inline-flex items-center">
      <HelpCircle className="h-4 w-4 text-gray-400 ml-1 cursor-help" />
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {content}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  )

  const SampleDataButton = ({ section }: { section: string }) => (
    <button
      type="button"
      onClick={() => fillSampleData(section)}
      className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
    >
      <Info className="h-3 w-3" />
      Try Sample Data
    </button>
  )

  const BeginnerGuide = () => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="bg-blue-100 p-3 rounded-full">
          <Info className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">New Applicant Guide</h3>
          <p className="text-gray-700 mb-3">
            Welcome! To create a strong profile, follow these steps:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">1</div>
                <span className="font-medium">Complete Basic Info</span>
              </div>
              <p className="text-sm text-gray-600 ml-8">Start with your personal details and contact information.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">2</div>
                <span className="font-medium">Add Education</span>
              </div>
              <p className="text-sm text-gray-600 ml-8">Include your academic background and degrees.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm">3</div>
                <span className="font-medium">List Work Experience</span>
              </div>
              <p className="text-sm text-gray-600 ml-8">Add your professional history, even internships.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm">4</div>
                <span className="font-medium">Highlight Skills</span>
              </div>
              <p className="text-sm text-gray-600 ml-8">Showcase your technical and soft skills.</p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-white border border-blue-100 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Tip:</span> Use the "Try Sample Data" buttons in each section to see examples of how to fill out the forms.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  // Check storage setup
  const checkStorageSetup = async () => {
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      
      if (bucketsError) {
        console.error('Cannot access storage:', bucketsError)
        return { success: false, message: 'Cannot access storage API' }
      }
      
      const profileBucket = buckets.find(b => b.name === 'profile')
      if (!profileBucket) {
        console.warn('Profile bucket not found.')
        return { 
          success: false, 
          message: 'Profile bucket not found.' 
        }
      }
      
      return { 
        success: true, 
        message: 'Storage is properly configured.' 
      }
    } catch (error: any) {
      console.error('Storage check error:', error)
      return { success: false, message: error.message }
    }
  }

  // Password validation function
  const validatePassword = (password: string) => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('At least 8 characters')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('At least one uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('At least one lowercase letter')
    }
    if (!/\d/.test(password)) {
      errors.push('At least one number')
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('At least one special character')
    }
    
    return errors
  }

  // Password change handler
  const handlePasswordChange = async () => {
    // Reset errors
    setPasswordErrors({})
    
    // Validation
    const errors: Record<string, string> = {}
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required'
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required'
    } else {
      const passwordErrors = validatePassword(passwordData.newPassword)
      if (passwordErrors.length > 0) {
        errors.newPassword = `Password must contain: ${passwordErrors.join(', ')}`
      }
    }
    
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password'
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }
    
    setSaving(true)
    setMessage(null)
    
    try {
      // First, verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile!.email,
        password: passwordData.currentPassword
      })
      
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setPasswordErrors({ currentPassword: 'Current password is incorrect' })
          setMessage({ type: 'error', text: 'Current password is incorrect' })
        } else {
          throw signInError
        }
        return
      }
      
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })
      
      if (updateError) throw updateError
      
      // Log the password change in task_logs
      await supabase.from('task_logs').insert({
        user_id: userProfile!.id,
        user_email: userProfile!.email,
        action: 'update',
        entity_type: 'security',
        entity_name: 'password',
        details: {
          type: 'password_change',
          timestamp: new Date().toISOString()
        },
        ip_address: '', // You can add IP tracking here
        user_agent: navigator.userAgent
      })
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setShowPasswordChange(false)
      setShowPasswords({
        current: false,
        new: false,
        confirm: false
      })
      
      setMessage({ type: 'success', text: 'Password changed successfully!' })
      
      setTimeout(() => {
        setMessage(null)
      }, 5000)
    } catch (error: any) {
      console.error('Error changing password:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to change password. Please try again.' 
      })
    } finally {
      setSaving(false)
    }
  }

  // Toggle password visibility
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: 'Empty', color: 'bg-gray-200' }
    
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
    
    const indicators = [
      { label: 'Very Weak', color: 'bg-red-500' },
      { label: 'Weak', color: 'bg-red-400' },
      { label: 'Fair', color: 'bg-yellow-500' },
      { label: 'Good', color: 'bg-green-400' },
      { label: 'Strong', color: 'bg-green-600' }
    ]
    
    return indicators[score - 1] || { label: 'Very Weak', color: 'bg-red-500' }
  }

  useEffect(() => {
    fetchUserProfile()
    checkStorageSetup()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        router.push('/login')
        return
      }

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        setMessage({ type: 'error', text: 'Failed to load profile' })
        return
      }

      if (profile) {
        // Fetch all related data
        const [
          { data: educations },
          { data: work_experiences },
          { data: skills },
          { data: eligibilities },
          { data: trainings }
        ] = await Promise.all([
          supabase.from('educations').select('*').eq('profile_id', user.id),
          supabase.from('work_experiences').select('*').eq('profile_id', user.id),
          supabase.from('skills').select('*').eq('profile_id', user.id),
          supabase.from('eligibilities').select('*').eq('profile_id', user.id),
          supabase.from('trainings').select('*').eq('profile_id', user.id)
        ])

        const profileWithDetails: ProfileWithDetails = {
          ...profile,
          educations: educations || [],
          work_experiences: work_experiences || [],
          skills: skills || [],
          eligibilities: eligibilities || [],
          trainings: trainings || []
        }

        setUserProfile(profileWithDetails)
        setFormData({
          first_name: profile.first_name || '',
          middle_name: profile.middle_name || '',
          last_name: profile.last_name || '',
          phone: profile.phone || '',
          date_of_birth: profile.date_of_birth || '',
          address: profile.address || ''
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file || !userProfile) return

      setUploadingAvatar(true)
      setMessage(null)

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'Please upload a JPG, PNG, GIF, or WebP image' })
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size must be less than 5MB' })
        return
      }

      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage({ type: 'error', text: 'You must be logged in to upload images' })
        return
      }

      // Generate unique filename with user folder
      const fileExt = file.name.split('.').pop()
      const fileName = `${userProfile.id}/${Date.now()}.${fileExt}`

      // Try direct upload with fetch if Supabase client fails
      const uploadUsingFetch = async () => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/profile/${fileName}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: formData
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Upload failed: ${response.status} ${errorText}`)
        }

        return await response.json()
      }

      // Try Supabase client first, fallback to fetch
      let uploadData
      try {
        const { data, error } = await supabase.storage
          .from('profile')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: true,
            cacheControl: '3600'
          })

        if (error) {
          uploadData = await uploadUsingFetch()
        } else {
          uploadData = data
        }
      } catch (supabaseError) {
        uploadData = await uploadUsingFetch()
      }

      // Get public URL
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile/${fileName}`

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.id)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setUserProfile(prev => prev ? { 
        ...prev, 
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      } : null)

      setMessage({ type: 'success', text: 'Profile picture updated successfully!' })
      
      setTimeout(() => {
        setMessage(null)
      }, 3000)
    } catch (error: any) {
      console.error('Avatar upload error:', error)
      
      let errorMessage = 'Failed to upload profile picture. '
      
      if (error.message?.includes('bucket') || error.message?.includes('not found')) {
        errorMessage += 'Storage bucket "profile" not found. Please contact administrator.'
      } else if (error.message?.includes('permission') || error.message?.includes('403')) {
        errorMessage += 'Permission denied. Please check storage bucket policies.'
      } else if (error.message?.includes('Unexpected token')) {
        errorMessage += 'Server returned invalid response. Please check storage configuration.'
      } else if (error.message?.includes('Payload too large')) {
        errorMessage += 'File is too large. Maximum size is 5MB.'
      } else if (error.message?.includes('Invalid file type')) {
        errorMessage += 'Invalid file type. Please upload an image.'
      } else {
        errorMessage += error.message || 'Unknown error occurred.'
      }
      
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleProfileUpdate = async () => {
    if (!userProfile) return

    setSaving(true)
    setMessage(null)

    try {
      // Calculate age if date_of_birth is provided
      let age = null
      if (formData.date_of_birth) {
        const birthDate = new Date(formData.date_of_birth)
        const today = new Date()
        age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name.trim() || null,
          middle_name: formData.middle_name.trim() || null,
          last_name: formData.last_name.trim() || null,
          phone: formData.phone.trim() || null,
          date_of_birth: formData.date_of_birth || null,
          age: age,
          address: formData.address.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.id)

      if (error) throw error

      // Update local state
      setUserProfile(prev => prev ? {
        ...prev,
        first_name: formData.first_name.trim() || null,
        middle_name: formData.middle_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        phone: formData.phone.trim() || null,
        date_of_birth: formData.date_of_birth || null,
        age: age,
        address: formData.address.trim() || null,
        updated_at: new Date().toISOString()
      } : null)

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setIsEditing(false)
      
      setTimeout(() => {
        setMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  // Education CRUD operations
  const handleAddEducation = async () => {
    if (!newEducation.course_qualification || !newEducation.institution) {
      setMessage({ type: 'error', text: 'Course qualification and institution are required' })
      return
    }

    try {
      const { error } = await supabase
        .from('educations')
        .insert({
          profile_id: userProfile!.id,
          course_qualification: newEducation.course_qualification.trim(),
          institution: newEducation.institution.trim(),
          expected_finish: newEducation.expected_finish || null,
          course_highlights: newEducation.course_highlights.trim() || null,
          degree_level: newEducation.degree_level || null,
          year_graduated: newEducation.year_graduated ? parseInt(newEducation.year_graduated) : null,
          degree_name: newEducation.degree_name.trim() || null,
          gpa: newEducation.gpa ? parseFloat(newEducation.gpa) : null,
          honors_awards: newEducation.honors_awards.trim() || null
        })

      if (error) throw error

      setNewEducation({
        course_qualification: '',
        institution: '',
        expected_finish: '',
        course_highlights: '',
        degree_level: '',
        year_graduated: '',
        degree_name: '',
        gpa: '',
        honors_awards: ''
      })
      setShowAddEducation(false)
      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Education added successfully!' })
    } catch (error) {
      console.error('Error adding education:', error)
      setMessage({ type: 'error', text: 'Failed to add education. Please try again.' })
    }
  }

  const handleEditEducation = async (id: string) => {
    if (!editEducationData.course_qualification || !editEducationData.institution) {
      setMessage({ type: 'error', text: 'Course qualification and institution are required' })
      return
    }

    try {
      const { error } = await supabase
        .from('educations')
        .update({
          course_qualification: editEducationData.course_qualification.trim(),
          institution: editEducationData.institution.trim(),
          expected_finish: editEducationData.expected_finish || null,
          course_highlights: editEducationData.course_highlights.trim() || null,
          degree_level: editEducationData.degree_level || null,
          year_graduated: editEducationData.year_graduated ? parseInt(editEducationData.year_graduated) : null,
          degree_name: editEducationData.degree_name.trim() || null,
          gpa: editEducationData.gpa ? parseFloat(editEducationData.gpa) : null,
          honors_awards: editEducationData.honors_awards.trim() || null
        })
        .eq('id', id)

      if (error) throw error

      setEditingEducation(null)
      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Education updated successfully!' })
    } catch (error) {
      console.error('Error updating education:', error)
      setMessage({ type: 'error', text: 'Failed to update education. Please try again.' })
    }
  }

  const handleDeleteEducation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this education?')) return
    
    try {
      const { error } = await supabase
        .from('educations')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Education deleted successfully!' })
    } catch (error) {
      console.error('Error deleting education:', error)
      setMessage({ type: 'error', text: 'Failed to delete education. Please try again.' })
    }
  }

  // Work Experience CRUD operations
  const handleAddWorkExperience = async () => {
    if (!newWorkExperience.job_title || !newWorkExperience.company || !newWorkExperience.start_date) {
      setMessage({ type: 'error', text: 'Job title, company, and start date are required' })
      return
    }

    try {
      const { error } = await supabase
        .from('work_experiences')
        .insert({
          profile_id: userProfile!.id,
          job_title: newWorkExperience.job_title.trim(),
          company: newWorkExperience.company.trim(),
          start_date: newWorkExperience.start_date,
          end_date: newWorkExperience.end_date || null,
          currently_working: newWorkExperience.currently_working,
          description: newWorkExperience.description.trim() || null
        })

      if (error) throw error

      setNewWorkExperience({
        job_title: '',
        company: '',
        start_date: '',
        end_date: '',
        currently_working: false,
        description: ''
      })
      setShowAddExperience(false)
      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Work experience added successfully!' })
    } catch (error) {
      console.error('Error adding work experience:', error)
      setMessage({ type: 'error', text: 'Failed to add work experience. Please try again.' })
    }
  }

  const handleEditWorkExperience = async (id: string) => {
    if (!editExperienceData.job_title || !editExperienceData.company || !editExperienceData.start_date) {
      setMessage({ type: 'error', text: 'Job title, company, and start date are required' })
      return
    }

    try {
      const { error } = await supabase
        .from('work_experiences')
        .update({
          job_title: editExperienceData.job_title.trim(),
          company: editExperienceData.company.trim(),
          start_date: editExperienceData.start_date,
          end_date: editExperienceData.end_date || null,
          currently_working: editExperienceData.currently_working,
          description: editExperienceData.description.trim() || null
        })
        .eq('id', id)

      if (error) throw error

      setEditingExperience(null)
      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Work experience updated successfully!' })
    } catch (error) {
      console.error('Error updating work experience:', error)
      setMessage({ type: 'error', text: 'Failed to update work experience. Please try again.' })
    }
  }

  const handleDeleteExperience = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work experience?')) return
    
    try {
      const { error } = await supabase
        .from('work_experiences')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Work experience deleted successfully!' })
    } catch (error) {
      console.error('Error deleting work experience:', error)
      setMessage({ type: 'error', text: 'Failed to delete work experience. Please try again.' })
    }
  }

  // Skills CRUD operations
  const handleAddSkill = async () => {
    if (!newSkill.skill_name) {
      setMessage({ type: 'error', text: 'Skill name is required' })
      return
    }

    try {
      const { error } = await supabase
        .from('skills')
        .insert({
          profile_id: userProfile!.id,
          skill_name: newSkill.skill_name.trim(),
          proficiency: newSkill.proficiency || null,
          years_of_experience: newSkill.years_of_experience ? parseInt(newSkill.years_of_experience) : null
        })

      if (error) throw error

      setNewSkill({
        skill_name: '',
        proficiency: '',
        years_of_experience: '',
      })
      setShowAddSkill(false)
      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Skill added successfully!' })
    } catch (error) {
      console.error('Error adding skill:', error)
      setMessage({ type: 'error', text: 'Failed to add skill. Please try again.' })
    }
  }

  const handleEditSkill = async (id: string) => {
    if (!editSkillData.skill_name) {
      setMessage({ type: 'error', text: 'Skill name is required' })
      return
    }

    try {
      const { error } = await supabase
        .from('skills')
        .update({
          skill_name: editSkillData.skill_name.trim(),
          proficiency: editSkillData.proficiency || null,
          years_of_experience: editSkillData.years_of_experience ? parseInt(editSkillData.years_of_experience) : null
        })
        .eq('id', id)

      if (error) throw error

      setEditingSkill(null)
      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Skill updated successfully!' })
    } catch (error) {
      console.error('Error updating skill:', error)
      setMessage({ type: 'error', text: 'Failed to update skill. Please try again.' })
    }
  }

  const handleDeleteSkill = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return
    
    try {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Skill deleted successfully!' })
    } catch (error) {
      console.error('Error deleting skill:', error)
      setMessage({ type: 'error', text: 'Failed to delete skill. Please try again.' })
    }
  }

  // Eligibilities CRUD operations
  const handleAddEligibility = async () => {
    if (!newEligibility.eligibility_name) {
      setMessage({ type: 'error', text: 'Eligibility name is required' })
      return
    }

    try {
      const { error } = await supabase
        .from('eligibilities')
        .insert({
          profile_id: userProfile!.id,
          eligibility_name: newEligibility.eligibility_name.trim(),
          license_number: newEligibility.license_number.trim() || null,
          rating: newEligibility.rating.trim() || null,
          date_issued: newEligibility.date_issued || null,
          expiry_date: newEligibility.expiry_date || null,
          issuing_authority: newEligibility.issuing_authority.trim() || null
        })

      if (error) throw error

      setNewEligibility({
        eligibility_name: '',
        license_number: '',
        rating: '',
        date_issued: '',
        expiry_date: '',
        issuing_authority: '',
      })
      setShowAddEligibility(false)
      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Eligibility added successfully!' })
    } catch (error) {
      console.error('Error adding eligibility:', error)
      setMessage({ type: 'error', text: 'Failed to add eligibility. Please try again.' })
    }
  }

  const handleEditEligibility = async (id: string) => {
    if (!editEligibilityData.eligibility_name) {
      setMessage({ type: 'error', text: 'Eligibility name is required' })
      return
    }

    try {
      const { error } = await supabase
        .from('eligibilities')
        .update({
          eligibility_name: editEligibilityData.eligibility_name.trim(),
          license_number: editEligibilityData.license_number.trim() || null,
          rating: editEligibilityData.rating.trim() || null,
          date_issued: editEligibilityData.date_issued || null,
          expiry_date: editEligibilityData.expiry_date || null,
          issuing_authority: editEligibilityData.issuing_authority.trim() || null
        })
        .eq('id', id)

      if (error) throw error

      setEditingEligibility(null)
      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Eligibility updated successfully!' })
    } catch (error) {
      console.error('Error updating eligibility:', error)
      setMessage({ type: 'error', text: 'Failed to update eligibility. Please try again.' })
    }
  }

  const handleDeleteEligibility = async (id: string) => {
    if (!confirm('Are you sure you want to delete this eligibility?')) return
    
    try {
      const { error } = await supabase
        .from('eligibilities')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Eligibility deleted successfully!' })
    } catch (error) {
      console.error('Error deleting eligibility:', error)
      setMessage({ type: 'error', text: 'Failed to delete eligibility. Please try again.' })
    }
  }

  // Trainings CRUD operations
  const handleAddTraining = async () => {
    if (!newTraining.training_name || !newTraining.institution) {
      setMessage({ type: 'error', text: 'Training name and institution are required' })
      return
    }

    try {
      const { error } = await supabase
        .from('trainings')
        .insert({
          profile_id: userProfile!.id,
          training_name: newTraining.training_name.trim(),
          institution: newTraining.institution.trim(),
          start_date: newTraining.start_date || null,
          end_date: newTraining.end_date || null,
          duration_hours: newTraining.duration_hours ? parseInt(newTraining.duration_hours) : null,
          certificate_id: newTraining.certificate_id.trim() || null,
          skills_learned: newTraining.skills_learned.trim() || null
        })

      if (error) throw error

      setNewTraining({
        training_name: '',
        institution: '',
        start_date: '',
        end_date: '',
        duration_hours: '',
        certificate_id: '',
        skills_learned: '',
      })
      setShowAddTraining(false)
      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Training added successfully!' })
    } catch (error) {
      console.error('Error adding training:', error)
      setMessage({ type: 'error', text: 'Failed to add training. Please try again.' })
    }
  }

  const handleEditTraining = async (id: string) => {
    if (!editTrainingData.training_name || !editTrainingData.institution) {
      setMessage({ type: 'error', text: 'Training name and institution are required' })
      return
    }

    try {
      const { error } = await supabase
        .from('trainings')
        .update({
          training_name: editTrainingData.training_name.trim(),
          institution: editTrainingData.institution.trim(),
          start_date: editTrainingData.start_date || null,
          end_date: editTrainingData.end_date || null,
          duration_hours: editTrainingData.duration_hours ? parseInt(editTrainingData.duration_hours) : null,
          certificate_id: editTrainingData.certificate_id.trim() || null,
          skills_learned: editTrainingData.skills_learned.trim() || null
        })
        .eq('id', id)

      if (error) throw error

      setEditingTraining(null)
      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Training updated successfully!' })
    } catch (error) {
      console.error('Error updating training:', error)
      setMessage({ type: 'error', text: 'Failed to update training. Please try again.' })
    }
  }

  const handleDeleteTraining = async (id: string) => {
    if (!confirm('Are you sure you want to delete this training?')) return
    
    try {
      const { error } = await supabase
        .from('trainings')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchUserProfile()
      setMessage({ type: 'success', text: 'Training deleted successfully!' })
    } catch (error) {
      console.error('Error deleting training:', error)
      setMessage({ type: 'error', text: 'Failed to delete training. Please try again.' })
    }
  }

  // Helper functions for editing
  const startEditingEducation = (edu: Education) => {
    setEditingEducation(edu.id)
    setEditEducationData({
      course_qualification: edu.course_qualification || '',
      institution: edu.institution || '',
      expected_finish: edu.expected_finish || '',
      course_highlights: edu.course_highlights || '',
      degree_level: edu.degree_level || '',
      year_graduated: edu.year_graduated?.toString() || '',
      degree_name: edu.degree_name || '',
      gpa: edu.gpa?.toString() || '',
      honors_awards: edu.honors_awards || ''
    })
  }

  const startEditingExperience = (exp: WorkExperience) => {
    setEditingExperience(exp.id)
    setEditExperienceData({
      job_title: exp.job_title,
      company: exp.company,
      start_date: exp.start_date,
      end_date: exp.end_date || '',
      currently_working: exp.currently_working,
      description: exp.description || ''
    })
  }

  const startEditingSkill = (skill: Skill) => {
    setEditingSkill(skill.id)
    setEditSkillData({
      skill_name: skill.skill_name,
      proficiency: skill.proficiency || '',
      years_of_experience: skill.years_of_experience?.toString() || '',
    })
  }

  const startEditingEligibility = (eligibility: Eligibility) => {
    setEditingEligibility(eligibility.id)
    setEditEligibilityData({
      eligibility_name: eligibility.eligibility_name,
      license_number: eligibility.license_number || '',
      rating: eligibility.rating || '',
      date_issued: eligibility.date_issued || '',
      expiry_date: eligibility.expiry_date || '',
      issuing_authority: eligibility.issuing_authority || '',
    })
  }

  const startEditingTraining = (training: Training) => {
    setEditingTraining(training.id)
    setEditTrainingData({
      training_name: training.training_name,
      institution: training.institution,
      start_date: training.start_date || '',
      end_date: training.end_date || '',
      duration_hours: training.duration_hours?.toString() || '',
      certificate_id: training.certificate_id || '',
      skills_learned: training.skills_learned || '',
    })
  }

  const copyUserId = async () => {
    if (userProfile?.id) {
      try {
        await navigator.clipboard.writeText(userProfile.id)
        setCopiedId(true)
        setTimeout(() => setCopiedId(false), 2000)
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Not Found</h3>
          <p className="text-gray-600 mb-4">Unable to load your profile information.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your personal information and credentials</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Edit size={18} />
              Edit Profile
            </button>
          ) : (
            <div className="flex flex-col md:flex-row gap-2">
              <button
                onClick={handleProfileUpdate}
                disabled={saving || uploadingAvatar}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed font-medium",
                  saving || uploadingAvatar ? "opacity-70 cursor-not-allowed" : "hover:bg-green-700"
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  fetchUserProfile()
                }}
                disabled={saving || uploadingAvatar}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex-1 disabled:opacity-50 font-medium"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add the Beginner Guide for new applicants */}
      {userProfile?.educations.length === 0 && 
       userProfile?.work_experiences.length === 0 && 
       userProfile?.skills.length === 0 && (
        <BeginnerGuide />
      )}

      {/* Message Alert */}
      {message && (
        <div className={cn(
          "rounded-lg border p-4 flex items-start gap-3 animate-in fade-in duration-300",
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        )}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="flex-1">{message.text}</p>
          <button
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                    {userProfile?.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                              <span class="text-3xl font-bold text-white">${getInitials()}</span>
                            </div>`
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">{getInitials()}</span>
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <label htmlFor="avatar-upload" className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      {uploadingAvatar ? (
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 text-blue-600" />
                      )}
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                    </label>
                  )}
                </div>
                
                <h2 className="text-xl font-bold text-white">{getDisplayName()}</h2>
                <p className="text-blue-100 mt-1">{userProfile.email}</p>
                <div className="mt-3 bg-blue-500/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-sm font-medium text-white">{getRoleDisplay()}</span>
                </div>
              </div>
            </div>

            {/* Profile Stats */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">Member Since</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {formatMonthYear(userProfile.created_at)}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">Last Updated</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {userProfile.updated_at ? formatMonthYear(userProfile.updated_at) : 'Never'}
                  </p>
                </div>
              </div>

              {/* Quick Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 truncate">{userProfile.email}</span>
                </div>
                {userProfile.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{userProfile.phone}</span>
                  </div>
                )}
                {userProfile.date_of_birth && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Born {formatFullDate(userProfile.date_of_birth)}</span>
                    {userProfile.age && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {userProfile.age} years
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
              <p className="text-sm text-gray-600 mt-1">Your contact information</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">First Name</label>
                {isEditing ? (
                  <input
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleProfileChange}
                    placeholder="Enter first name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                ) : (
                  <p className="text-gray-900">{userProfile.first_name || 'Not provided'}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Middle Name</label>
                {isEditing ? (
                  <input
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleProfileChange}
                    placeholder="Enter middle name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                ) : (
                  <p className="text-gray-900">{userProfile.middle_name || 'Not provided'}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Last Name</label>
                {isEditing ? (
                  <input
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleProfileChange}
                    placeholder="Enter last name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                ) : (
                  <p className="text-gray-900">{userProfile.last_name || 'Not provided'}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleProfileChange}
                    placeholder="+1 (555) 123-4567"
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                ) : (
                  <p className="text-gray-900">{userProfile.phone || 'Not provided'}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date of Birth
                </label>
                {isEditing ? (
                  <input
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                ) : (
                  <p className="text-gray-900">
                    {userProfile.date_of_birth ? formatFullDate(userProfile.date_of_birth) : 'Not provided'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </label>
                {isEditing ? (
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleProfileChange}
                    placeholder="Enter your complete address"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                  />
                ) : (
                  <p className="text-gray-900 whitespace-pre-line">{userProfile.address || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Account Information Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">User ID</p>
                <div className="flex items-center gap-2">
                  <input
                    value={userProfile.id}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono text-gray-600 truncate"
                  />
                  <button
                    onClick={copyUserId}
                    className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {copiedId ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Account Role</p>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {getRoleDisplay()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Account Created</p>
                <p className="text-sm text-gray-900">{formatFullDate(userProfile.created_at)}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Last Profile Update</p>
                <p className="text-sm text-gray-900">
                  {userProfile.updated_at ? formatFullDate(userProfile.updated_at) : 'Never updated'}
                </p>
              </div>
            </div>
          </div>

          {/* Security Settings Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-red-600 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">Manage your password and account security</p>
            </div>
            
            <div className="p-6 space-y-4">
              {!showPasswordChange ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Password</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">••••••••••</span>
                      </div>
                      <button
                        onClick={() => setShowPasswordChange(true)}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        Change Password
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <Lock className="h-4 w-4 inline mr-1" />
                      Last password change: {userProfile.updated_at ? formatMonthYear(userProfile.updated_at) : 'Never'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        className={cn(
                          "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10",
                          passwordErrors.currentPassword ? "border-red-300" : "border-gray-300"
                        )}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="text-sm text-red-600 mt-1">{passwordErrors.currentPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">New Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        className={cn(
                          "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10",
                          passwordErrors.newPassword ? "border-red-300" : "border-gray-300"
                        )}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    
                    {/* Password strength indicator */}
                    {passwordData.newPassword && (
                      <div className="mt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-700">
                            Password strength: 
                            <span className={cn(
                              "ml-1",
                              getPasswordStrength(passwordData.newPassword).color === 'bg-red-500' ? "text-red-600" :
                              getPasswordStrength(passwordData.newPassword).color === 'bg-red-400' ? "text-red-500" :
                              getPasswordStrength(passwordData.newPassword).color === 'bg-yellow-500' ? "text-yellow-600" :
                              "text-green-600"
                            )}>
                              {getPasswordStrength(passwordData.newPassword).label}
                            </span>
                          </span>
                        </div>
                        <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-300",
                              getPasswordStrength(passwordData.newPassword).color
                            )}
                            style={{ 
                              width: `${(validatePassword(passwordData.newPassword).length / 5) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {passwordErrors.newPassword && (
                      <p className="text-sm text-red-600 mt-1">{passwordErrors.newPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        className={cn(
                          "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10",
                          passwordErrors.confirmPassword ? "border-red-300" : "border-gray-300"
                        )}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="text-sm text-red-600 mt-1">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Password requirements */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</h4>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                        At least 8 characters long
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                        At least one uppercase letter (A-Z)
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                        At least one lowercase letter (a-z)
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                        At least one number (0-9)
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                        At least one special character (!@#$%^&* etc.)
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={handlePasswordChange}
                      disabled={saving}
                      className={cn(
                        "flex items-center justify-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex-1 font-medium transition-colors",
                        saving ? "opacity-70 cursor-not-allowed" : ""
                      )}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Changing Password...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Change Password
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordChange(false)
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        })
                        setPasswordErrors({})
                      }}
                      disabled={saving}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - All Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Education Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-gray-900">Education</h3>
                </div>
                <button 
                  onClick={() => setShowAddEducation(true)}
                  disabled={isEditing}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full md:w-auto disabled:opacity-50 font-medium"
                >
                  <Plus size={16} />
                  Add Education
                </button>
              </div>
              <p className="text-sm text-gray-600">Your educational background and qualifications</p>
            </div>

            {/* Add Education Form */}
            {showAddEducation && (
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Add Education</h4>
                    <p className="text-sm text-gray-600 mt-1">Fill in your educational background. * indicates required fields</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <SampleDataButton section="education" />
                    <button 
                      onClick={() => setShowAddEducation(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
                
                {/* Tips section */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Tips for beginners:</p>
                      <ul className="text-xs text-blue-800 mt-1 space-y-1">
                        <li>• Include all degrees from high school onward</li>
                        <li>• Use the "Try Sample Data" button to see examples</li>
                        <li>• GPA is not required but helpful for academic achievements</li>
                        <li>• Course highlights can include relevant courses or projects</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Course Qualification *
                      <HelpTooltip content="The title of your course or program of study" />
                    </label>
                    <input
                      type="text"
                      value={newEducation.course_qualification}
                      onChange={(e) => setNewEducation({...newEducation, course_qualification: e.target.value})}
                      placeholder={getSampleInput('education', 'course_qualification')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Institution *
                      <HelpTooltip content="The school, college, or university you attended" />
                    </label>
                    <input
                      type="text"
                      value={newEducation.institution}
                      onChange={(e) => setNewEducation({...newEducation, institution: e.target.value})}
                      placeholder={getSampleInput('education', 'institution')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Degree Level</label>
                    <select
                      value={newEducation.degree_level}
                      onChange={(e) => setNewEducation({...newEducation, degree_level: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">Select Level</option>
                      <option value="Elementary">Elementary</option>
                      <option value="High School">High School</option>
                      <option value="Vocational">Vocational</option>
                      <option value="Associate">Associate</option>
                      <option value="Bachelors">Bachelors</option>
                      <option value="Masters">Masters</option>
                      <option value="Doctorate">Doctorate</option>
                      <option value="Post-Doctorate">Post-Doctorate</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Expected Finish</label>
                    <input
                      type="date"
                      value={newEducation.expected_finish}
                      onChange={(e) => setNewEducation({...newEducation, expected_finish: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Year Graduated</label>
                    <input
                      type="number"
                      value={newEducation.year_graduated}
                      onChange={(e) => setNewEducation({...newEducation, year_graduated: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">GPA</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newEducation.gpa}
                      onChange={(e) => setNewEducation({...newEducation, gpa: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700">Degree Name</label>
                    <input
                      type="text"
                      value={newEducation.degree_name}
                      onChange={(e) => setNewEducation({...newEducation, degree_name: e.target.value})}
                      placeholder={getSampleInput('education', 'degree_name')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700">Course Highlights</label>
                    <textarea
                      value={newEducation.course_highlights}
                      onChange={(e) => setNewEducation({...newEducation, course_highlights: e.target.value})}
                      placeholder={getSampleInput('education', 'course_highlights')}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700">Honors & Awards</label>
                    <textarea
                      value={newEducation.honors_awards}
                      onChange={(e) => setNewEducation({...newEducation, honors_awards: e.target.value})}
                      placeholder={getSampleInput('education', 'honors_awards')}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button 
                    onClick={handleAddEducation}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-1 font-medium transition-colors"
                  >
                    Save Education
                  </button>
                  <button 
                    onClick={() => setShowAddEducation(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Education List */}
            <div className="p-6">
              {userProfile.educations.length > 0 ? (
                <div className="space-y-6">
                  {userProfile.educations.map((edu) => (
                    <div key={edu.id} className="border-l-4 border-blue-500 pl-4 py-3 relative bg-blue-50 rounded-r-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          {editingEducation === edu.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Course Qualification *</label>
                                  <input
                                    type="text"
                                    value={editEducationData.course_qualification}
                                    onChange={(e) => setEditEducationData({...editEducationData, course_qualification: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Institution *</label>
                                  <input
                                    type="text"
                                    value={editEducationData.institution}
                                    onChange={(e) => setEditEducationData({...editEducationData, institution: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Degree Level</label>
                                  <select
                                    value={editEducationData.degree_level}
                                    onChange={(e) => setEditEducationData({...editEducationData, degree_level: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                  >
                                    <option value="">Select Level</option>
                                    <option value="Elementary">Elementary</option>
                                    <option value="High School">High School</option>
                                    <option value="Vocational">Vocational</option>
                                    <option value="Associate">Associate</option>
                                    <option value="Bachelors">Bachelors</option>
                                    <option value="Masters">Masters</option>
                                    <option value="Doctorate">Doctorate</option>
                                    <option value="Post-Doctorate">Post-Doctorate</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Expected Finish</label>
                                  <input
                                    type="date"
                                    value={editEducationData.expected_finish}
                                    onChange={(e) => setEditEducationData({...editEducationData, expected_finish: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Year Graduated</label>
                                  <input
                                    type="number"
                                    value={editEducationData.year_graduated}
                                    onChange={(e) => setEditEducationData({...editEducationData, year_graduated: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">GPA</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editEducationData.gpa}
                                    onChange={(e) => setEditEducationData({...editEducationData, gpa: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Degree Name</label>
                                  <input
                                    type="text"
                                    value={editEducationData.degree_name}
                                    onChange={(e) => setEditEducationData({...editEducationData, degree_name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Course Highlights</label>
                                  <textarea
                                    value={editEducationData.course_highlights}
                                    onChange={(e) => setEditEducationData({...editEducationData, course_highlights: e.target.value})}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Honors & Awards</label>
                                  <textarea
                                    value={editEducationData.honors_awards}
                                    onChange={(e) => setEditEducationData({...editEducationData, honors_awards: e.target.value})}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-3 pt-2">
                                <button 
                                  onClick={() => handleEditEducation(edu.id)}
                                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-1 font-medium transition-colors"
                                >
                                  Save Changes
                                </button>
                                <button 
                                  onClick={() => setEditingEducation(null)}
                                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-gray-900 text-lg">{edu.course_qualification}</h4>
                              <p className="text-gray-700 font-medium">{edu.institution}</p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {edu.degree_level && (
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                                    {edu.degree_level}
                                  </span>
                                )}
                                {edu.year_graduated && (
                                  <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full font-medium">
                                    Graduated: {edu.year_graduated}
                                  </span>
                                )}
                                {edu.gpa && (
                                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                                    GPA: {edu.gpa}
                                  </span>
                                )}
                              </div>
                              {edu.expected_finish && (
                                <p className="text-sm text-gray-600 mt-2">
                                  <span className="font-medium">Expected Finish:</span> {formatFullDate(edu.expected_finish)}
                                </p>
                              )}
                              {edu.degree_name && (
                                <p className="text-sm text-gray-600 mt-1">
                                  <span className="font-medium">Degree:</span> {edu.degree_name}
                                </p>
                              )}
                              {edu.course_highlights && (
                                <div className="mt-3">
                                  <p className="text-sm font-medium text-gray-700 mb-1">Highlights:</p>
                                  <p className="text-gray-600 text-sm bg-white p-3 rounded border">{edu.course_highlights}</p>
                                </div>
                              )}
                              {edu.honors_awards && (
                                <div className="mt-3">
                                  <p className="text-sm font-medium text-gray-700 mb-1">Awards:</p>
                                  <p className="text-gray-600 text-sm bg-yellow-50 p-3 rounded border border-yellow-100">{edu.honors_awards}</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {editingEducation !== edu.id && (
                          <div className="flex gap-2 ml-2">
                            <button 
                              onClick={() => startEditingEducation(edu)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit education"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteEducation(edu.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete education"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No education information added yet.</p>
                  <button 
                    onClick={() => setShowAddEducation(true)}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-medium text-lg"
                  >
                    Add your first education
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Work Experience Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-gray-900">Work Experience</h3>
                </div>
                <button 
                  onClick={() => setShowAddExperience(true)}
                  disabled={isEditing}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 w-full md:w-auto disabled:opacity-50 font-medium"
                >
                  <Plus size={16} />
                  Add Experience
                </button>
              </div>
              <p className="text-sm text-gray-600">Your professional work history</p>
            </div>

            {/* Add Work Experience Form */}
            {showAddExperience && (
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Add Work Experience</h4>
                    <p className="text-sm text-gray-600 mt-1">Add your professional work history</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <SampleDataButton section="workExperience" />
                    <button 
                      onClick={() => setShowAddExperience(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
                
                {/* Tips section */}
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Tips for beginners:</p>
                      <ul className="text-xs text-green-800 mt-1 space-y-1">
                        <li>• Include internships, part-time jobs, and volunteer work</li>
                        <li>• Use action verbs like "Managed", "Developed", "Created"</li>
                        <li>• Quantify achievements when possible (e.g., "Increased sales by 20%")</li>
                        <li>• Check "I currently work here" if this is your current job</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Job Title *
                      <HelpTooltip content="Your official position title at the company" />
                    </label>
                    <input
                      type="text"
                      value={newWorkExperience.job_title}
                      onChange={(e) => setNewWorkExperience({...newWorkExperience, job_title: e.target.value})}
                      placeholder={getSampleInput('workExperience', 'job_title')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Company *
                      <HelpTooltip content="The name of the organization you worked for" />
                    </label>
                    <input
                      type="text"
                      value={newWorkExperience.company}
                      onChange={(e) => setNewWorkExperience({...newWorkExperience, company: e.target.value})}
                      placeholder={getSampleInput('workExperience', 'company')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Start Date *</label>
                    <input
                      type="date"
                      value={newWorkExperience.start_date}
                      onChange={(e) => setNewWorkExperience({...newWorkExperience, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">End Date (Optional)</label>
                    <input
                      type="date"
                      value={newWorkExperience.end_date}
                      onChange={(e) => setNewWorkExperience({...newWorkExperience, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={newWorkExperience.currently_working}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700">Description (Optional)</label>
                    <textarea
                      value={newWorkExperience.description}
                      onChange={(e) => setNewWorkExperience({...newWorkExperience, description: e.target.value})}
                      placeholder={getSampleInput('workExperience', 'description')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={newWorkExperience.currently_working}
                      onChange={(e) => setNewWorkExperience({
                        ...newWorkExperience, 
                        currently_working: e.target.checked,
                        end_date: e.target.checked ? '' : newWorkExperience.end_date
                      })}
                      className="rounded h-5 w-5 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">I currently work here</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto">
                    <button 
                      onClick={handleAddWorkExperience}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex-1 font-medium transition-colors"
                    >
                      Save Experience
                    </button>
                    <button 
                      onClick={() => setShowAddExperience(false)}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Work Experience List */}
            <div className="p-6">
              {userProfile.work_experiences.length > 0 ? (
                <div className="space-y-6">
                  {userProfile.work_experiences.map((exp) => (
                    <div key={exp.id} className="border-l-4 border-green-500 pl-4 py-3 relative bg-green-50 rounded-r-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          {editingExperience === exp.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Job Title *</label>
                                  <input
                                    type="text"
                                    value={editExperienceData.job_title}
                                    onChange={(e) => setEditExperienceData({...editExperienceData, job_title: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Company *</label>
                                  <input
                                    type="text"
                                    value={editExperienceData.company}
                                    onChange={(e) => setEditExperienceData({...editExperienceData, company: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Start Date *</label>
                                  <input
                                    type="date"
                                    value={editExperienceData.start_date}
                                    onChange={(e) => setEditExperienceData({...editExperienceData, start_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">End Date (Optional)</label>
                                  <input
                                    type="date"
                                    value={editExperienceData.end_date}
                                    onChange={(e) => setEditExperienceData({...editExperienceData, end_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={editExperienceData.currently_working}
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Description (Optional)</label>
                                  <textarea
                                    value={editExperienceData.description}
                                    onChange={(e) => setEditExperienceData({...editExperienceData, description: e.target.value})}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={editExperienceData.currently_working}
                                    onChange={(e) => setEditExperienceData({
                                      ...editExperienceData, 
                                      currently_working: e.target.checked,
                                      end_date: e.target.checked ? '' : editExperienceData.end_date
                                    })}
                                    className="rounded h-5 w-5 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium">I currently work here</span>
                                </label>
                                <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto">
                                  <button 
                                    onClick={() => handleEditWorkExperience(exp.id)}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex-1 font-medium transition-colors"
                                  >
                                    Save Changes
                                  </button>
                                  <button 
                                    onClick={() => setEditingExperience(null)}
                                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 font-medium transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-gray-900 text-lg">{exp.job_title}</h4>
                              <p className="text-gray-700 font-medium">{exp.company}</p>
                              <p className="text-sm text-gray-600 mt-2">
                                {formatFullDate(exp.start_date)} – 
                                {exp.currently_working 
                                  ? ' Present' 
                                  : exp.end_date 
                                    ? ` ${formatFullDate(exp.end_date)}`
                                    : ' N/A'
                                }
                                {exp.currently_working && (
                                  <span className="ml-2 px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                    Current
                                  </span>
                                )}
                              </p>
                              {exp.description && (
                                <div className="mt-3">
                                  <p className="text-sm font-medium text-gray-700 mb-1">Description:</p>
                                  <p className="text-gray-600 text-sm bg-white p-3 rounded border whitespace-pre-line">{exp.description}</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {editingExperience !== exp.id && (
                          <div className="flex gap-2 ml-2">
                            <button 
                              onClick={() => startEditingExperience(exp)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit experience"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteExperience(exp.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete experience"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No work experience added yet.</p>
                  <button 
                    onClick={() => setShowAddExperience(true)}
                    className="mt-4 text-green-600 hover:text-green-800 font-medium text-lg"
                  >
                    Add your first work experience
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Skills Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-purple-600 flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-gray-900">Skills</h3>
                </div>
                <button 
                  onClick={() => setShowAddSkill(true)}
                  disabled={isEditing}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 w-full md:w-auto disabled:opacity-50 font-medium"
                >
                  <Plus size={16} />
                  Add Skill
                </button>
              </div>
              <p className="text-sm text-gray-600">Your professional skills and proficiencies</p>
            </div>

            {/* Add Skill Form */}
            {showAddSkill && (
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Add Skill</h4>
                    <p className="text-sm text-gray-600 mt-1">Add your professional skills and proficiencies</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <SampleDataButton section="skill" />
                    <button 
                      onClick={() => setShowAddSkill(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Skill Name *
                      <HelpTooltip content="Technical, soft, or specialized skills relevant to your field" />
                    </label>
                    <input
                      type="text"
                      value={newSkill.skill_name}
                      onChange={(e) => setNewSkill({...newSkill, skill_name: e.target.value})}
                      placeholder={getSampleInput('skill', 'skill_name')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Proficiency Level</label>
                    <select
                      value={newSkill.proficiency}
                      onChange={(e) => setNewSkill({...newSkill, proficiency: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">Select Proficiency</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Years of Experience (Optional)</label>
                    <input
                      type="number"
                      value={newSkill.years_of_experience}
                      onChange={(e) => setNewSkill({...newSkill, years_of_experience: e.target.value})}
                      placeholder={getSampleInput('skill', 'years_of_experience')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button 
                    onClick={handleAddSkill}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex-1 font-medium transition-colors"
                  >
                    Save Skill
                  </button>
                  <button 
                    onClick={() => setShowAddSkill(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Skills List */}
            <div className="p-6">
              {userProfile.skills.length > 0 ? (
                <div className="space-y-4">
                  {userProfile.skills.map((skill) => (
                    <div key={skill.id} className="border-l-4 border-purple-500 pl-4 py-3 relative bg-purple-50 rounded-r-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          {editingSkill === skill.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Skill Name *</label>
                                  <input
                                    type="text"
                                    value={editSkillData.skill_name}
                                    onChange={(e) => setEditSkillData({...editSkillData, skill_name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Proficiency Level</label>
                                  <select
                                    value={editSkillData.proficiency}
                                    onChange={(e) => setEditSkillData({...editSkillData, proficiency: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                  >
                                    <option value="">Select Proficiency</option>
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                    <option value="Expert">Expert</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Years of Experience (Optional)</label>
                                  <input
                                    type="number"
                                    value={editSkillData.years_of_experience}
                                    onChange={(e) => setEditSkillData({...editSkillData, years_of_experience: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-3 pt-2">
                                <button 
                                  onClick={() => handleEditSkill(skill.id)}
                                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex-1 font-medium transition-colors"
                                >
                                  Save Changes
                                </button>
                                <button 
                                  onClick={() => setEditingSkill(null)}
                                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col md:flex-row md:items-center gap-2">
                                <h4 className="font-bold text-gray-900 text-lg">{skill.skill_name}</h4>
                                {skill.proficiency && (
                                  <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                                    skill.proficiency === 'Beginner' ? 'bg-blue-100 text-blue-800' :
                                    skill.proficiency === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                    skill.proficiency === 'Advanced' ? 'bg-orange-100 text-orange-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {skill.proficiency}
                                  </span>
                                )}
                                {skill.verified && (
                                  <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full font-medium">
                                    ✓ Verified
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-4 mt-2">
                                {skill.years_of_experience && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Experience:</span> {skill.years_of_experience} year(s)
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        {editingSkill !== skill.id && (
                          <div className="flex gap-2 ml-2">
                            <button 
                              onClick={() => startEditingSkill(skill)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit skill"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteSkill(skill.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete skill"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No skills added yet.</p>
                  <button 
                    onClick={() => setShowAddSkill(true)}
                    className="mt-4 text-purple-600 hover:text-purple-800 font-medium text-lg"
                  >
                    Add your first skill
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Eligibilities Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-gray-900">Eligibilities</h3>
                </div>
                <button 
                  onClick={() => setShowAddEligibility(true)}
                  disabled={isEditing}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 w-full md:w-auto disabled:opacity-50 font-medium"
                >
                  <Plus size={16} />
                  Add Eligibility
                </button>
              </div>
              <p className="text-sm text-gray-600">Your professional certifications and licenses</p>
            </div>

            {/* Add Eligibility Form */}
            {showAddEligibility && (
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Add Eligibility</h4>
                    <p className="text-sm text-gray-600 mt-1">Add your professional certifications and licenses</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <SampleDataButton section="eligibility" />
                    <button 
                      onClick={() => setShowAddEligibility(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Eligibility Name *
                      <HelpTooltip content="Name of the certification, license, or eligibility exam" />
                    </label>
                    <input
                      type="text"
                      value={newEligibility.eligibility_name}
                      onChange={(e) => setNewEligibility({...newEligibility, eligibility_name: e.target.value})}
                      placeholder={getSampleInput('eligibility', 'eligibility_name')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">License Number (Optional)</label>
                    <input
                      type="text"
                      value={newEligibility.license_number}
                      onChange={(e) => setNewEligibility({...newEligibility, license_number: e.target.value})}
                      placeholder={getSampleInput('eligibility', 'license_number')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Rating (Optional)</label>
                    <input
                      type="text"
                      value={newEligibility.rating}
                      onChange={(e) => setNewEligibility({...newEligibility, rating: e.target.value})}
                      placeholder={getSampleInput('eligibility', 'rating')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Issuing Authority (Optional)</label>
                    <input
                      type="text"
                      value={newEligibility.issuing_authority}
                      onChange={(e) => setNewEligibility({...newEligibility, issuing_authority: e.target.value})}
                      placeholder={getSampleInput('eligibility', 'issuing_authority')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Date Issued (Optional)</label>
                    <input
                      type="date"
                      value={newEligibility.date_issued}
                      onChange={(e) => setNewEligibility({...newEligibility, date_issued: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Expiry Date (Optional)</label>
                    <input
                      type="date"
                      value={newEligibility.expiry_date}
                      onChange={(e) => setNewEligibility({...newEligibility, expiry_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button 
                    onClick={handleAddEligibility}
                    className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex-1 font-medium transition-colors"
                  >
                    Save Eligibility
                  </button>
                  <button 
                    onClick={() => setShowAddEligibility(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Eligibilities List */}
            <div className="p-6">
              {userProfile.eligibilities.length > 0 ? (
                <div className="space-y-6">
                  {userProfile.eligibilities.map((eligibility) => (
                    <div key={eligibility.id} className="border-l-4 border-amber-500 pl-4 py-3 relative bg-amber-50 rounded-r-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          {editingEligibility === eligibility.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Eligibility Name *</label>
                                  <input
                                    type="text"
                                    value={editEligibilityData.eligibility_name}
                                    onChange={(e) => setEditEligibilityData({...editEligibilityData, eligibility_name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">License Number (Optional)</label>
                                  <input
                                    type="text"
                                    value={editEligibilityData.license_number}
                                    onChange={(e) => setEditEligibilityData({...editEligibilityData, license_number: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Rating (Optional)</label>
                                  <input
                                    type="text"
                                    value={editEligibilityData.rating}
                                    onChange={(e) => setEditEligibilityData({...editEligibilityData, rating: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Issuing Authority (Optional)</label>
                                  <input
                                    type="text"
                                    value={editEligibilityData.issuing_authority}
                                    onChange={(e) => setEditEligibilityData({...editEligibilityData, issuing_authority: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Date Issued (Optional)</label>
                                  <input
                                    type="date"
                                    value={editEligibilityData.date_issued}
                                    onChange={(e) => setEditEligibilityData({...editEligibilityData, date_issued: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Expiry Date (Optional)</label>
                                  <input
                                    type="date"
                                    value={editEligibilityData.expiry_date}
                                    onChange={(e) => setEditEligibilityData({...editEligibilityData, expiry_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-3 pt-2">
                                <button 
                                  onClick={() => handleEditEligibility(eligibility.id)}
                                  className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex-1 font-medium transition-colors"
                                >
                                  Save Changes
                                </button>
                                <button 
                                  onClick={() => setEditingEligibility(null)}
                                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-gray-900 text-lg">{eligibility.eligibility_name}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                                {eligibility.license_number && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">License #:</span> {eligibility.license_number}
                                  </p>
                                )}
                                {eligibility.rating && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Rating:</span> {eligibility.rating}
                                  </p>
                                )}
                                {eligibility.date_issued && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Issued:</span> {formatFullDate(eligibility.date_issued)}
                                  </p>
                                )}
                                {eligibility.expiry_date && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Expires:</span> {formatFullDate(eligibility.expiry_date)}
                                  </p>
                                )}
                                {eligibility.issuing_authority && (
                                  <p className="text-sm text-gray-600 md:col-span-2">
                                    <span className="font-medium">Authority:</span> {eligibility.issuing_authority}
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        {editingEligibility !== eligibility.id && (
                          <div className="flex gap-2 ml-2">
                            <button 
                              onClick={() => startEditingEligibility(eligibility)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit eligibility"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteEligibility(eligibility.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete eligibility"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No eligibilities added yet.</p>
                  <button 
                    onClick={() => setShowAddEligibility(true)}
                    className="mt-4 text-amber-600 hover:text-amber-800 font-medium text-lg"
                  >
                    Add your first eligibility
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Trainings Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-gray-900">Trainings</h3>
                </div>
                <button 
                  onClick={() => setShowAddTraining(true)}
                  disabled={isEditing}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 w-full md:w-auto disabled:opacity-50 font-medium"
                >
                  <Plus size={16} />
                  Add Training
                </button>
              </div>
              <p className="text-sm text-gray-600">Your professional development and certifications</p>
            </div>

            {/* Add Training Form */}
            {showAddTraining && (
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Add Training</h4>
                    <p className="text-sm text-gray-600 mt-1">Add your professional development and certifications</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <SampleDataButton section="training" />
                    <button 
                      onClick={() => setShowAddTraining(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Training Name *
                      <HelpTooltip content="Name of the training program, workshop, or seminar" />
                    </label>
                    <input
                      type="text"
                      value={newTraining.training_name}
                      onChange={(e) => setNewTraining({...newTraining, training_name: e.target.value})}
                      placeholder={getSampleInput('training', 'training_name')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Institution *
                      <HelpTooltip content="Organization that conducted the training" />
                    </label>
                    <input
                      type="text"
                      value={newTraining.institution}
                      onChange={(e) => setNewTraining({...newTraining, institution: e.target.value})}
                      placeholder={getSampleInput('training', 'institution')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Start Date (Optional)</label>
                    <input
                      type="date"
                      value={newTraining.start_date}
                      onChange={(e) => setNewTraining({...newTraining, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">End Date (Optional)</label>
                    <input
                      type="date"
                      value={newTraining.end_date}
                      onChange={(e) => setNewTraining({...newTraining, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Duration Hours (Optional)</label>
                    <input
                      type="number"
                      value={newTraining.duration_hours}
                      onChange={(e) => setNewTraining({...newTraining, duration_hours: e.target.value})}
                      placeholder="e.g., 40 (hours)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Certificate ID (Optional)</label>
                    <input
                      type="text"
                      value={newTraining.certificate_id}
                      onChange={(e) => setNewTraining({...newTraining, certificate_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700">Skills Learned (Optional)</label>
                    <textarea
                      value={newTraining.skills_learned}
                      onChange={(e) => setNewTraining({...newTraining, skills_learned: e.target.value})}
                      placeholder={getSampleInput('training', 'skills_learned')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button 
                    onClick={handleAddTraining}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex-1 font-medium transition-colors"
                  >
                    Save Training
                  </button>
                  <button 
                    onClick={() => setShowAddTraining(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Trainings List */}
            <div className="p-6">
              {userProfile.trainings.length > 0 ? (
                <div className="space-y-6">
                  {userProfile.trainings.map((training) => (
                    <div key={training.id} className="border-l-4 border-indigo-500 pl-4 py-3 relative bg-indigo-50 rounded-r-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          {editingTraining === training.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Training Name *</label>
                                  <input
                                    type="text"
                                    value={editTrainingData.training_name}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, training_name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Institution *</label>
                                  <input
                                    type="text"
                                    value={editTrainingData.institution}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, institution: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Start Date (Optional)</label>
                                  <input
                                    type="date"
                                    value={editTrainingData.start_date}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, start_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">End Date (Optional)</label>
                                  <input
                                    type="date"
                                    value={editTrainingData.end_date}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, end_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Duration Hours (Optional)</label>
                                  <input
                                    type="number"
                                    value={editTrainingData.duration_hours}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, duration_hours: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Certificate ID (Optional)</label>
                                  <input
                                    type="text"
                                    value={editTrainingData.certificate_id}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, certificate_id: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Skills Learned (Optional)</label>
                                  <textarea
                                    value={editTrainingData.skills_learned}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, skills_learned: e.target.value})}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-3 pt-2">
                                <button 
                                  onClick={() => handleEditTraining(training.id)}
                                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex-1 font-medium transition-colors"
                                >
                                  Save Changes
                                </button>
                                <button 
                                  onClick={() => setEditingTraining(null)}
                                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-gray-900 text-lg">{training.training_name}</h4>
                              <p className="text-gray-700 font-medium">{training.institution}</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                                {training.start_date && training.end_date && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Duration:</span> {formatFullDate(training.start_date)} – {formatFullDate(training.end_date)}
                                  </p>
                                )}
                                {training.duration_hours && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Hours:</span> {training.duration_hours}
                                  </p>
                                )}
                                {training.certificate_id && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Certificate ID:</span> {training.certificate_id}
                                  </p>
                                )}
                                {training.skills_learned && (
                                  <p className="text-sm text-gray-600 md:col-span-2">
                                    <span className="font-medium">Skills:</span> {training.skills_learned}
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        {editingTraining !== training.id && (
                          <div className="flex gap-2 ml-2">
                            <button 
                              onClick={() => startEditingTraining(training)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit training"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTraining(training.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete training"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No trainings added yet.</p>
                  <button 
                    onClick={() => setShowAddTraining(true)}
                    className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium text-lg"
                  >
                    Add your first training
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}