'use client'

import React, { useState, useEffect } from 'react'
import { 
  User, Mail, Phone, Calendar, MapPin, Briefcase, 
  GraduationCap, Edit, Save, X, Plus, Trash2, Upload, Bug,
  Award, BookOpen, Target
} from 'lucide-react'
import Image from 'next/image'
import { supabase, getCurrentUser } from '@/lib/supabaseClient'

// Interfaces
interface Education {
  id: string;
  profile_id: string;
  course_qualification: string;
  institution: string;
  expected_finish?: string;
  course_highlights?: string;
  created_at: string;
  degree_level?: string;
  year_graduated?: number;
  degree_name?: string;
  gpa?: number;
  honors_awards?: string;
}

interface WorkExperience {
  id: string;
  profile_id: string;
  job_title: string;
  company: string;
  start_date: string;
  end_date?: string;
  currently_working: boolean;
  description?: string;
  created_at: string;
}

interface Skill {
  id: string;
  profile_id: string;
  skill_name: string;
  proficiency?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  years_of_experience?: number;
  verified: boolean;
  created_at: string;
}

interface Eligibility {
  id: string;
  profile_id: string;
  eligibility_name: string;
  license_number?: string;
  rating?: string;
  date_issued?: string;
  expiry_date?: string;
  issuing_authority?: string;
  document_path?: string;
  created_at: string;
}

interface Training {
  id: string;
  profile_id: string;
  training_name: string;
  institution: string;
  start_date?: string;
  end_date?: string;
  duration_hours?: number;
  certificate_id?: string;
  certificate_path?: string;
  skills_learned?: string;
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
  phone?: string;
  role: 'applicant' | 'hr' | 'super_admin';
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  avatar_url?: string;
  date_of_birth?: string;
  age?: number;
  address?: string;
  created_at: string;
  updated_at?: string;
}

interface ProfileWithDetails extends Profile {
  educations: Education[];
  work_experiences: WorkExperience[];
  skills: Skill[];
  eligibilities: Eligibility[];
  trainings: Training[];
}

export default function ApplicantProfileContent() {
  const [profile, setProfile] = useState<ProfileWithDetails | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Section visibility states
  const [showAddEducation, setShowAddEducation] = useState(false)
  const [showAddExperience, setShowAddExperience] = useState(false)
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [showAddEligibility, setShowAddEligibility] = useState(false)
  const [showAddTraining, setShowAddTraining] = useState(false)
  
  // Avatar states
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  // Form data for profile
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    age: '',
    address: '',
    avatar_url: ''
  })

  // New education form
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

  // Edit education states
  const [editingEducation, setEditingEducation] = useState<string | null>(null)
  const [editEducationData, setEditEducationData] = useState({
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

  // New work experience form
  const [newWorkExperience, setNewWorkExperience] = useState({
    job_title: '',
    company: '',
    start_date: '',
    end_date: '',
    currently_working: false,
    description: ''
  })

  // Edit work experience states
  const [editingExperience, setEditingExperience] = useState<string | null>(null)
  const [editExperienceData, setEditExperienceData] = useState({
    job_title: '',
    company: '',
    start_date: '',
    end_date: '',
    currently_working: false,
    description: ''
  })

  // New skill form
  const [newSkill, setNewSkill] = useState({
    skill_name: '',
    proficiency: 'Beginner' as Skill['proficiency'],
    years_of_experience: '',
  })

  // Edit skill states
  const [editingSkill, setEditingSkill] = useState<string | null>(null)
  const [editSkillData, setEditSkillData] = useState({
    skill_name: '',
    proficiency: 'Beginner' as Skill['proficiency'],
    years_of_experience: '',
  })

  // New eligibility form
  const [newEligibility, setNewEligibility] = useState({
    eligibility_name: '',
    license_number: '',
    rating: '',
    date_issued: '',
    expiry_date: '',
    issuing_authority: '',
  })

  // Edit eligibility states
  const [editingEligibility, setEditingEligibility] = useState<string | null>(null)
  const [editEligibilityData, setEditEligibilityData] = useState({
    eligibility_name: '',
    license_number: '',
    rating: '',
    date_issued: '',
    expiry_date: '',
    issuing_authority: '',
  })

  // New training form
  const [newTraining, setNewTraining] = useState({
    training_name: '',
    institution: '',
    start_date: '',
    end_date: '',
    duration_hours: '',
    certificate_id: '',
    skills_learned: '',
  })

  // Edit training states
  const [editingTraining, setEditingTraining] = useState<string | null>(null)
  const [editTrainingData, setEditTrainingData] = useState({
    training_name: '',
    institution: '',
    start_date: '',
    end_date: '',
    duration_hours: '',
    certificate_id: '',
    skills_learned: '',
  })

  // ==================== API FUNCTIONS ====================

  const getSessionToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  // Fetch profile with all data
  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const user = await getCurrentUser()
      if (!user) {
        console.log('No user found')
        return
      }

      const token = await getSessionToken()
      if (!token) {
        console.log('No session token')
        return
      }

      // Fetch profile with all related data
      const response = await fetch(`/api/applicant/profile?userId=${user.id}&includeAll=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setFormData({
          first_name: data.first_name || '',
          middle_name: data.middle_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          age: data.age?.toString() || '',
          address: data.address || '',
          avatar_url: data.avatar_url || ''
        })
        setAvatarPreview(data.avatar_url || null)
      } else {
        const errorText = await response.text()
        console.error('Failed to fetch profile:', response.status, errorText)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Update profile
  const handleSaveProfile = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        alert('Please login first')
        return
      }

      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      // Upload avatar if changed
      let avatarUrl = formData.avatar_url
      if (avatarFile) {
        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', avatarFile)
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        })

        if (uploadResponse.ok) {
          const result = await uploadResponse.json()
          avatarUrl = result.url
        } else {
          alert('Avatar upload failed. Profile saved without new avatar.')
        }
        setIsUploading(false)
      }

      const response = await fetch('/api/applicant/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          middle_name: formData.middle_name || null,
          last_name: formData.last_name,
          phone: formData.phone || null,
          date_of_birth: formData.date_of_birth || null,
          age: formData.age ? parseInt(formData.age) : null,
          address: formData.address || null,
          avatar_url: avatarUrl || null
        })
      })

      const responseData = await response.json()

      if (response.ok) {
        await fetchProfile()
        setIsEditing(false)
        setAvatarFile(null)
        alert('Profile updated successfully!')
      } else {
        alert(`Failed to update profile: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error updating profile:', error)
      alert(`Failed to update profile: ${error.message || 'Unknown error'}`)
    }
  }

  // ==================== EDUCATION API HANDLERS ====================

  const handleAddEducation = async () => {
    if (!newEducation.course_qualification || !newEducation.institution) {
      alert('Course qualification and institution are required')
      return
    }

    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch('/api/applicant/education', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          course_qualification: newEducation.course_qualification,
          institution: newEducation.institution,
          expected_finish: newEducation.expected_finish || null,
          course_highlights: newEducation.course_highlights || null,
          degree_level: newEducation.degree_level || null,
          year_graduated: newEducation.year_graduated || null,
          degree_name: newEducation.degree_name || null,
          gpa: newEducation.gpa || null,
          honors_awards: newEducation.honors_awards || null
        })
      })

      const responseData = await response.json()
      
      if (response.ok) {
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
        await fetchProfile()
        alert('Education added successfully!')
      } else {
        alert(`Failed to add education: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error adding education:', error)
      alert(`Failed to add education: ${error.message || 'Unknown error'}`)
    }
  }

  const handleEditEducation = async (id: string) => {
    if (!editEducationData.course_qualification || !editEducationData.institution) {
      alert('Course qualification and institution are required')
      return
    }

    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch('/api/applicant/education', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id,
          course_qualification: editEducationData.course_qualification,
          institution: editEducationData.institution,
          expected_finish: editEducationData.expected_finish || null,
          course_highlights: editEducationData.course_highlights || null,
          degree_level: editEducationData.degree_level || null,
          year_graduated: editEducationData.year_graduated || null,
          degree_name: editEducationData.degree_name || null,
          gpa: editEducationData.gpa || null,
          honors_awards: editEducationData.honors_awards || null
        })
      })

      const responseData = await response.json()
      
      if (response.ok) {
        setEditingEducation(null)
        await fetchProfile()
        alert('Education updated successfully!')
      } else {
        alert(`Failed to update education: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error updating education:', error)
      alert(`Failed to update education: ${error.message || 'Unknown error'}`)
    }
  }

  const handleDeleteEducation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this education?')) return
    
    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch(`/api/applicant/education?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const responseData = await response.json()
      
      if (response.ok) {
        await fetchProfile()
        alert('Education deleted successfully!')
      } else {
        alert(`Failed to delete education: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error deleting education:', error)
      alert(`Failed to delete education: ${error.message || 'Unknown error'}`)
    }
  }

  // ==================== WORK EXPERIENCE API HANDLERS ====================

  const handleAddWorkExperience = async () => {
    if (!newWorkExperience.job_title || !newWorkExperience.company || !newWorkExperience.start_date) {
      alert('Job title, company, and start date are required')
      return
    }

    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch('/api/applicant/experience', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newWorkExperience)
      })

      const responseData = await response.json()
      
      if (response.ok) {
        setNewWorkExperience({
          job_title: '',
          company: '',
          start_date: '',
          end_date: '',
          currently_working: false,
          description: ''
        })
        setShowAddExperience(false)
        await fetchProfile()
        alert('Work experience added successfully!')
      } else {
        alert(`Failed to add work experience: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error adding work experience:', error)
      alert(`Failed to add work experience: ${error.message || 'Unknown error'}`)
    }
  }

  const handleEditWorkExperience = async (id: string) => {
    if (!editExperienceData.job_title || !editExperienceData.company || !editExperienceData.start_date) {
      alert('Job title, company, and start date are required')
      return
    }

    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch('/api/applicant/experience', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id,
          ...editExperienceData
        })
      })

      const responseData = await response.json()
      
      if (response.ok) {
        setEditingExperience(null)
        await fetchProfile()
        alert('Work experience updated successfully!')
      } else {
        alert(`Failed to update work experience: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error updating work experience:', error)
      alert(`Failed to update work experience: ${error.message || 'Unknown error'}`)
    }
  }

  const handleDeleteExperience = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work experience?')) return
    
    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch(`/api/applicant/experience?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const responseData = await response.json()
      
      if (response.ok) {
        await fetchProfile()
        alert('Work experience deleted successfully!')
      } else {
        alert(`Failed to delete work experience: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error deleting work experience:', error)
      alert(`Failed to delete work experience: ${error.message || 'Unknown error'}`)
    }
  }

  // ==================== SKILLS API HANDLERS ====================

  const handleAddSkill = async () => {
    if (!newSkill.skill_name) {
      alert('Skill name is required')
      return
    }

    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch('/api/applicant/skills', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          skill_name: newSkill.skill_name,
          proficiency: newSkill.proficiency || null,
          years_of_experience: newSkill.years_of_experience || null
        })
      })

      const responseData = await response.json()
      
      if (response.ok) {
        setNewSkill({
          skill_name: '',
          proficiency: 'Beginner',
          years_of_experience: '',
        })
        setShowAddSkill(false)
        await fetchProfile()
        alert('Skill added successfully!')
      } else {
        alert(`Failed to add skill: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error adding skill:', error)
      alert(`Failed to add skill: ${error.message || 'Unknown error'}`)
    }
  }

  const handleEditSkill = async (id: string) => {
    if (!editSkillData.skill_name) {
      alert('Skill name is required')
      return
    }

    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch('/api/applicant/skills', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id,
          skill_name: editSkillData.skill_name,
          proficiency: editSkillData.proficiency || null,
          years_of_experience: editSkillData.years_of_experience || null
        })
      })

      const responseData = await response.json()
      
      if (response.ok) {
        setEditingSkill(null)
        await fetchProfile()
        alert('Skill updated successfully!')
      } else {
        alert(`Failed to update skill: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error updating skill:', error)
      alert(`Failed to update skill: ${error.message || 'Unknown error'}`)
    }
  }

  const handleDeleteSkill = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return
    
    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch(`/api/applicant/skills?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const responseData = await response.json()
      
      if (response.ok) {
        await fetchProfile()
        alert('Skill deleted successfully!')
      } else {
        alert(`Failed to delete skill: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error deleting skill:', error)
      alert(`Failed to delete skill: ${error.message || 'Unknown error'}`)
    }
  }

  // ==================== ELIGIBILITIES API HANDLERS ====================

  const handleAddEligibility = async () => {
    if (!newEligibility.eligibility_name) {
      alert('Eligibility name is required')
      return
    }

    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch('/api/applicant/eligibilities', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eligibility_name: newEligibility.eligibility_name,
          license_number: newEligibility.license_number || null,
          rating: newEligibility.rating || null,
          date_issued: newEligibility.date_issued || null,
          expiry_date: newEligibility.expiry_date || null,
          issuing_authority: newEligibility.issuing_authority || null
        })
      })

      const responseData = await response.json()
      
      if (response.ok) {
        setNewEligibility({
          eligibility_name: '',
          license_number: '',
          rating: '',
          date_issued: '',
          expiry_date: '',
          issuing_authority: '',
        })
        setShowAddEligibility(false)
        await fetchProfile()
        alert('Eligibility added successfully!')
      } else {
        alert(`Failed to add eligibility: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error adding eligibility:', error)
      alert(`Failed to add eligibility: ${error.message || 'Unknown error'}`)
    }
  }

  const handleEditEligibility = async (id: string) => {
    if (!editEligibilityData.eligibility_name) {
      alert('Eligibility name is required')
      return
    }

    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch('/api/applicant/eligibilities', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id,
          eligibility_name: editEligibilityData.eligibility_name,
          license_number: editEligibilityData.license_number || null,
          rating: editEligibilityData.rating || null,
          date_issued: editEligibilityData.date_issued || null,
          expiry_date: editEligibilityData.expiry_date || null,
          issuing_authority: editEligibilityData.issuing_authority || null
        })
      })

      const responseData = await response.json()
      
      if (response.ok) {
        setEditingEligibility(null)
        await fetchProfile()
        alert('Eligibility updated successfully!')
      } else {
        alert(`Failed to update eligibility: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error updating eligibility:', error)
      alert(`Failed to update eligibility: ${error.message || 'Unknown error'}`)
    }
  }

  const handleDeleteEligibility = async (id: string) => {
    if (!confirm('Are you sure you want to delete this eligibility?')) return
    
    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch(`/api/applicant/eligibilities?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const responseData = await response.json()
      
      if (response.ok) {
        await fetchProfile()
        alert('Eligibility deleted successfully!')
      } else {
        alert(`Failed to delete eligibility: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error deleting eligibility:', error)
      alert(`Failed to delete eligibility: ${error.message || 'Unknown error'}`)
    }
  }

  // ==================== TRAININGS API HANDLERS ====================

  const handleAddTraining = async () => {
    if (!newTraining.training_name || !newTraining.institution) {
      alert('Training name and institution are required')
      return
    }

    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch('/api/applicant/trainings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          training_name: newTraining.training_name,
          institution: newTraining.institution,
          start_date: newTraining.start_date || null,
          end_date: newTraining.end_date || null,
          duration_hours: newTraining.duration_hours || null,
          certificate_id: newTraining.certificate_id || null,
          skills_learned: newTraining.skills_learned || null
        })
      })

      const responseData = await response.json()
      
      if (response.ok) {
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
        await fetchProfile()
        alert('Training added successfully!')
      } else {
        alert(`Failed to add training: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error adding training:', error)
      alert(`Failed to add training: ${error.message || 'Unknown error'}`)
    }
  }

  const handleEditTraining = async (id: string) => {
    if (!editTrainingData.training_name || !editTrainingData.institution) {
      alert('Training name and institution are required')
      return
    }

    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch('/api/applicant/trainings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id,
          training_name: editTrainingData.training_name,
          institution: editTrainingData.institution,
          start_date: editTrainingData.start_date || null,
          end_date: editTrainingData.end_date || null,
          duration_hours: editTrainingData.duration_hours || null,
          certificate_id: editTrainingData.certificate_id || null,
          skills_learned: editTrainingData.skills_learned || null
        })
      })

      const responseData = await response.json()
      
      if (response.ok) {
        setEditingTraining(null)
        await fetchProfile()
        alert('Training updated successfully!')
      } else {
        alert(`Failed to update training: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error updating training:', error)
      alert(`Failed to update training: ${error.message || 'Unknown error'}`)
    }
  }

  const handleDeleteTraining = async (id: string) => {
    if (!confirm('Are you sure you want to delete this training?')) return
    
    try {
      const token = await getSessionToken()
      if (!token) {
        alert('Session expired, please login again')
        return
      }

      const response = await fetch(`/api/applicant/trainings?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const responseData = await response.json()
      
      if (response.ok) {
        await fetchProfile()
        alert('Training deleted successfully!')
      } else {
        alert(`Failed to delete training: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error deleting training:', error)
      alert(`Failed to delete training: ${error.message || 'Unknown error'}`)
    }
  }

  // ==================== HELPER FUNCTIONS ====================

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        alert('Please select a valid image file (JPG, PNG, GIF, or WebP)')
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

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
      proficiency: skill.proficiency || 'Beginner',
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

  const debugStorage = async () => {
    try {
      console.log('Debug storage...')
      // Your debug logic here
    } catch (error: any) {
      console.error('Debug error:', error)
      alert('Debug failed: ' + error.message)
    }
  }

  // ==================== USE EFFECT ====================

  useEffect(() => {
    fetchProfile()
  }, [])

  // ==================== RENDER LOADING ====================

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // ==================== MAIN RENDER ====================

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-1">Manage your personal information</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <button
              onClick={debugStorage}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Bug size={18} />
              Debug Upload
            </button>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit size={18} />
                Edit Profile
              </button>
            ) : (
              <div className="flex flex-col md:flex-row gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={isUploading}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
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
                    fetchProfile()
                    setAvatarFile(null)
                    setAvatarPreview(profile?.avatar_url || null)
                  }}
                  disabled={isUploading}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex-1 disabled:opacity-50"
                >
                  <X size={18} />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Profile Image */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-blue-100 mb-4">
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt={`${formData.first_name} ${formData.last_name}`}
                      fill
                      className="object-cover"
                      unoptimized={avatarPreview.startsWith('blob:')}
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                      <User className="w-20 h-20 text-blue-600" />
                    </div>
                  )}
                </div>
                
                {isEditing && (
                  <div className="text-center">
                    <label className="cursor-pointer">
                      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <Upload size={16} />
                        Change Photo
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isUploading}
                      />
                    </label>
                    {avatarFile && (
                      <p className="text-sm text-gray-600 mt-2">
                        Selected: {avatarFile.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF (Max 5MB)</p>
                  </div>
                )}
                
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mt-4">
                  {isEditing ? (
                    <div className="text-center">
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                        className="text-center px-2 py-1 border rounded w-full max-w-[200px] mb-1"
                        placeholder="First Name"
                        disabled={isUploading}
                      />
                      <input
                        type="text"
                        value={formData.middle_name}
                        onChange={(e) => setFormData({...formData, middle_name: e.target.value})}
                        className="text-center px-2 py-1 border rounded w-full max-w-[200px] mb-1"
                        placeholder="Middle Name (Optional)"
                        disabled={isUploading}
                      />
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                        className="text-center px-2 py-1 border rounded w-full max-w-[200px]"
                        placeholder="Last Name"
                        disabled={isUploading}
                      />
                    </div>
                  ) : (
                    <>
                      {profile?.first_name || 'Your'} {profile?.middle_name && `${profile.middle_name} `}{profile?.last_name || 'Name'}
                    </>
                  )}
                </h2>
                
                <div className="inline-block px-3 py-1 mt-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {profile?.role?.toUpperCase() || 'APPLICANT'}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium truncate">{profile?.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">Phone</p>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-2 py-1 border rounded"
                        placeholder="Enter phone number"
                        disabled={isUploading}
                      />
                    ) : (
                      <p className="font-medium truncate">{profile?.phone || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">Date of Birth</p>
                    {isEditing ? (
                      <input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                        className="w-full px-2 py-1 border rounded"
                        disabled={isUploading}
                      />
                    ) : (
                      <p className="font-medium truncate">
                        {profile?.date_of_birth 
                          ? new Date(profile.date_of_birth).toLocaleDateString()
                          : 'Not provided'
                        }
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">Age</p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({...formData, age: e.target.value})}
                        className="w-full px-2 py-1 border rounded"
                        min="18"
                        max="100"
                        placeholder="Enter age"
                        disabled={isUploading}
                      />
                    ) : (
                      <p className="font-medium truncate">{profile?.age || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">Address</p>
                    {isEditing ? (
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="w-full px-2 py-1 border rounded"
                        rows={3}
                        placeholder="Enter your full address"
                        disabled={isUploading}
                      />
                    ) : (
                      <p className="font-medium whitespace-pre-line">{profile?.address || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - All Sections */}
          <div className="lg:col-span-2 space-y-8">
            {/* Education Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <h3 className="text-xl font-bold text-gray-900">Education</h3>
                </div>
                <button 
                  onClick={() => setShowAddEducation(true)}
                  disabled={isUploading}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full md:w-auto disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add Education
                </button>
              </div>

              {/* Add Education Form */}
              {showAddEducation && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-bold mb-4">Add Education</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Course Qualification *</label>
                      <input
                        type="text"
                        value={newEducation.course_qualification}
                        onChange={(e) => setNewEducation({...newEducation, course_qualification: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                        placeholder="e.g., Bachelor of Science in Computer Science"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Institution *</label>
                      <input
                        type="text"
                        value={newEducation.institution}
                        onChange={(e) => setNewEducation({...newEducation, institution: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                        placeholder="e.g., Negros Oriental State University"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Degree Level</label>
                      <select
                        value={newEducation.degree_level}
                        onChange={(e) => setNewEducation({...newEducation, degree_level: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
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
                    <div>
                      <label className="block text-sm font-medium mb-1">Expected Finish</label>
                      <input
                        type="date"
                        value={newEducation.expected_finish}
                        onChange={(e) => setNewEducation({...newEducation, expected_finish: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Year Graduated</label>
                      <input
                        type="number"
                        value={newEducation.year_graduated}
                        onChange={(e) => setNewEducation({...newEducation, year_graduated: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="1900"
                        max={new Date().getFullYear()}
                        placeholder="e.g., 2023"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">GPA</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newEducation.gpa}
                        onChange={(e) => setNewEducation({...newEducation, gpa: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="0"
                        max="4.0"
                        placeholder="e.g., 3.5"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Degree Name</label>
                      <input
                        type="text"
                        value={newEducation.degree_name}
                        onChange={(e) => setNewEducation({...newEducation, degree_name: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Bachelor of Science"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Course Highlights</label>
                      <textarea
                        value={newEducation.course_highlights}
                        onChange={(e) => setNewEducation({...newEducation, course_highlights: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Dean's Lister, Magna Cum Laude, Special Awards"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Honors & Awards</label>
                      <textarea
                        value={newEducation.honors_awards}
                        onChange={(e) => setNewEducation({...newEducation, honors_awards: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Summa Cum Laude, President's Lister"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <button 
                      onClick={handleAddEducation}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex-1"
                    >
                      Save Education
                    </button>
                    <button 
                      onClick={() => setShowAddEducation(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Education List */}
              {profile?.educations && profile.educations.length > 0 ? (
                <div className="space-y-6">
                  {profile.educations.map((edu) => (
                    <div key={edu.id} className="border-l-4 border-blue-500 pl-4 py-3 relative group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          {editingEducation === edu.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Course Qualification *</label>
                                  <input
                                    type="text"
                                    value={editEducationData.course_qualification}
                                    onChange={(e) => setEditEducationData({...editEducationData, course_qualification: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Institution *</label>
                                  <input
                                    type="text"
                                    value={editEducationData.institution}
                                    onChange={(e) => setEditEducationData({...editEducationData, institution: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Degree Level</label>
                                  <select
                                    value={editEducationData.degree_level}
                                    onChange={(e) => setEditEducationData({...editEducationData, degree_level: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
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
                                <div>
                                  <label className="block text-sm font-medium mb-1">Expected Finish</label>
                                  <input
                                    type="date"
                                    value={editEducationData.expected_finish}
                                    onChange={(e) => setEditEducationData({...editEducationData, expected_finish: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Year Graduated</label>
                                  <input
                                    type="number"
                                    value={editEducationData.year_graduated}
                                    onChange={(e) => setEditEducationData({...editEducationData, year_graduated: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">GPA</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editEducationData.gpa}
                                    onChange={(e) => setEditEducationData({...editEducationData, gpa: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium mb-1">Degree Name</label>
                                  <input
                                    type="text"
                                    value={editEducationData.degree_name}
                                    onChange={(e) => setEditEducationData({...editEducationData, degree_name: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium mb-1">Course Highlights</label>
                                  <textarea
                                    value={editEducationData.course_highlights}
                                    onChange={(e) => setEditEducationData({...editEducationData, course_highlights: e.target.value})}
                                    rows={2}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium mb-1">Honors & Awards</label>
                                  <textarea
                                    value={editEducationData.honors_awards}
                                    onChange={(e) => setEditEducationData({...editEducationData, honors_awards: e.target.value})}
                                    rows={2}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleEditEducation(edu.id)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex-1"
                                >
                                  Save Changes
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingEducation(null)
                                    setEditEducationData({
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
                                  }}
                                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-gray-900">{edu.course_qualification}</h4>
                              <p className="text-gray-700">{edu.institution}</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {edu.degree_level && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {edu.degree_level}
                                  </span>
                                )}
                                {edu.year_graduated && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                    Graduated: {edu.year_graduated}
                                  </span>
                                )}
                                {edu.gpa && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    GPA: {edu.gpa}
                                  </span>
                                )}
                              </div>
                              {edu.expected_finish && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Expected Finish: {new Date(edu.expected_finish).toLocaleDateString()}
                                </p>
                              )}
                              {edu.course_highlights && (
                                <p className="text-gray-600 mt-2 text-sm bg-gray-50 p-2 rounded">
                                  <span className="font-medium">Highlights:</span> {edu.course_highlights}
                                </p>
                              )}
                              {edu.honors_awards && (
                                <p className="text-gray-600 mt-2 text-sm bg-yellow-50 p-2 rounded">
                                  <span className="font-medium">Awards:</span> {edu.honors_awards}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        {editingEducation !== edu.id && (
                          <div className="flex flex-col md:flex-row gap-2 ml-2">
                            <button 
                              onClick={() => startEditingEducation(edu)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit education"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteEducation(edu.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No education information added yet.</p>
                  <button 
                    onClick={() => setShowAddEducation(true)}
                    className="mt-3 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Add your first education
                  </button>
                </div>
              )}
            </div>

            {/* Work Experience Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <h3 className="text-xl font-bold text-gray-900">Work Experience</h3>
                </div>
                <button 
                  onClick={() => setShowAddExperience(true)}
                  disabled={isUploading}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 w-full md:w-auto disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add Experience
                </button>
              </div>

              {/* Add Work Experience Form */}
              {showAddExperience && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-bold mb-4">Add Work Experience</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Job Title *</label>
                      <input
                        type="text"
                        value={newWorkExperience.job_title}
                        onChange={(e) => setNewWorkExperience({...newWorkExperience, job_title: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                        placeholder="e.g., Software Developer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Company *</label>
                      <input
                        type="text"
                        value={newWorkExperience.company}
                        onChange={(e) => setNewWorkExperience({...newWorkExperience, company: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                        placeholder="e.g., Tech Company Inc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Start Date *</label>
                      <input
                        type="date"
                        value={newWorkExperience.start_date}
                        onChange={(e) => setNewWorkExperience({...newWorkExperience, start_date: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
                      <input
                        type="date"
                        value={newWorkExperience.end_date}
                        onChange={(e) => setNewWorkExperience({...newWorkExperience, end_date: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        disabled={newWorkExperience.currently_working}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                      <textarea
                        value={newWorkExperience.description}
                        onChange={(e) => setNewWorkExperience({...newWorkExperience, description: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Describe your responsibilities, achievements, and skills used..."
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4">
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={newWorkExperience.currently_working}
                        onChange={(e) => setNewWorkExperience({
                          ...newWorkExperience, 
                          currently_working: e.target.checked,
                          end_date: e.target.checked ? '' : newWorkExperience.end_date
                        })}
                        className="rounded"
                      />
                      <span className="text-sm">I currently work here</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
                      <button 
                        onClick={handleAddWorkExperience}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex-1"
                      >
                        Save Experience
                      </button>
                      <button 
                        onClick={() => setShowAddExperience(false)}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Work Experience List */}
              {profile?.work_experiences && profile.work_experiences.length > 0 ? (
                <div className="space-y-6">
                  {profile.work_experiences.map((exp) => (
                    <div key={exp.id} className="border-l-4 border-green-500 pl-4 py-3 relative group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          {editingExperience === exp.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Job Title *</label>
                                  <input
                                    type="text"
                                    value={editExperienceData.job_title}
                                    onChange={(e) => setEditExperienceData({...editExperienceData, job_title: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Company *</label>
                                  <input
                                    type="text"
                                    value={editExperienceData.company}
                                    onChange={(e) => setEditExperienceData({...editExperienceData, company: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                                  <input
                                    type="date"
                                    value={editExperienceData.start_date}
                                    onChange={(e) => setEditExperienceData({...editExperienceData, start_date: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
                                  <input
                                    type="date"
                                    value={editExperienceData.end_date}
                                    onChange={(e) => setEditExperienceData({...editExperienceData, end_date: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    disabled={editExperienceData.currently_working}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                                  <textarea
                                    value={editExperienceData.description}
                                    onChange={(e) => setEditExperienceData({...editExperienceData, description: e.target.value})}
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <label className="flex items-center gap-2">
                                  <input 
                                    type="checkbox"
                                    checked={editExperienceData.currently_working}
                                    onChange={(e) => setEditExperienceData({
                                      ...editExperienceData, 
                                      currently_working: e.target.checked,
                                      end_date: e.target.checked ? '' : editExperienceData.end_date
                                    })}
                                    className="rounded"
                                  />
                                  <span className="text-sm">I currently work here</span>
                                </label>
                                <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
                                  <button 
                                    onClick={() => handleEditWorkExperience(exp.id)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex-1"
                                  >
                                    Save Changes
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setEditingExperience(null)
                                      setEditExperienceData({
                                        job_title: '',
                                        company: '',
                                        start_date: '',
                                        end_date: '',
                                        currently_working: false,
                                        description: ''
                                      })
                                    }}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex-1"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-gray-900">{exp.job_title}</h4>
                              <p className="text-gray-700">{exp.company}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {new Date(exp.start_date).toLocaleDateString()} – 
                                {exp.currently_working 
                                  ? ' Present' 
                                  : exp.end_date 
                                    ? ` ${new Date(exp.end_date).toLocaleDateString()}`
                                    : ' N/A'
                                }
                                {exp.currently_working && (
                                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                    Current
                                  </span>
                                )}
                              </p>
                              {exp.description && (
                                <p className="text-gray-600 mt-2 text-sm bg-gray-50 p-2 rounded whitespace-pre-line">
                                  {exp.description}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        {editingExperience !== exp.id && (
                          <div className="flex flex-col md:flex-row gap-2 ml-2">
                            <button 
                              onClick={() => startEditingExperience(exp)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit experience"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteExperience(exp.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No work experience added yet.</p>
                  <button 
                    onClick={() => setShowAddExperience(true)}
                    className="mt-3 text-green-600 hover:text-green-800 font-medium"
                  >
                    Add your first work experience
                  </button>
                </div>
              )}
            </div>

            {/* Skills Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-purple-600 flex-shrink-0" />
                  <h3 className="text-xl font-bold text-gray-900">Skills</h3>
                </div>
                <button 
                  onClick={() => setShowAddSkill(true)}
                  disabled={isUploading}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 w-full md:w-auto disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add Skill
                </button>
              </div>

              {/* Add Skill Form */}
              {showAddSkill && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-bold mb-4">Add Skill</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Skill Name *</label>
                      <input
                        type="text"
                        value={newSkill.skill_name}
                        onChange={(e) => setNewSkill({...newSkill, skill_name: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                        placeholder="e.g., JavaScript, Project Management"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Proficiency Level</label>
                      <select
                        value={newSkill.proficiency}
                        onChange={(e) => setNewSkill({...newSkill, proficiency: e.target.value as Skill['proficiency']})}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Years of Experience (Optional)</label>
                      <input
                        type="number"
                        value={newSkill.years_of_experience}
                        onChange={(e) => setNewSkill({...newSkill, years_of_experience: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="0"
                        max="50"
                        placeholder="e.g., 3"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <button 
                      onClick={handleAddSkill}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex-1"
                    >
                      Save Skill
                    </button>
                    <button 
                      onClick={() => setShowAddSkill(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Skills List */}
              {profile?.skills && profile.skills.length > 0 ? (
                <div className="space-y-4">
                  {profile.skills.map((skill) => (
                    <div key={skill.id} className="border-l-4 border-purple-500 pl-4 py-3 relative group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          {editingSkill === skill.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Skill Name *</label>
                                  <input
                                    type="text"
                                    value={editSkillData.skill_name}
                                    onChange={(e) => setEditSkillData({...editSkillData, skill_name: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Proficiency Level</label>
                                  <select
                                    value={editSkillData.proficiency}
                                    onChange={(e) => setEditSkillData({...editSkillData, proficiency: e.target.value as Skill['proficiency']})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  >
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                    <option value="Expert">Expert</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Years of Experience (Optional)</label>
                                  <input
                                    type="number"
                                    value={editSkillData.years_of_experience}
                                    onChange={(e) => setEditSkillData({...editSkillData, years_of_experience: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    min="0"
                                    max="50"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleEditSkill(skill.id)}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex-1"
                                >
                                  Save Changes
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingSkill(null)
                                    setEditSkillData({
                                      skill_name: '',
                                      proficiency: 'Beginner',
                                      years_of_experience: '',
                                    })
                                  }}
                                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col md:flex-row md:items-center gap-2">
                                <h4 className="font-bold text-gray-900">{skill.skill_name}</h4>
                                {skill.proficiency && (
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    skill.proficiency === 'Beginner' ? 'bg-blue-100 text-blue-800' :
                                    skill.proficiency === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                    skill.proficiency === 'Advanced' ? 'bg-orange-100 text-orange-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {skill.proficiency}
                                  </span>
                                )}
                                {skill.verified && (
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                    Verified
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
                          <div className="flex flex-col md:flex-row gap-2 ml-2">
                            <button 
                              onClick={() => startEditingSkill(skill)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit skill"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteSkill(skill.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No skills added yet.</p>
                  <button 
                    onClick={() => setShowAddSkill(true)}
                    className="mt-3 text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Add your first skill
                  </button>
                </div>
              )}
            </div>

            {/* Eligibilities Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  <h3 className="text-xl font-bold text-gray-900">Eligibilities</h3>
                </div>
                <button 
                  onClick={() => setShowAddEligibility(true)}
                  disabled={isUploading}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 w-full md:w-auto disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add Eligibility
                </button>
              </div>

              {/* Add Eligibility Form */}
              {showAddEligibility && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-bold mb-4">Add Eligibility</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Eligibility Name *</label>
                      <input
                        type="text"
                        value={newEligibility.eligibility_name}
                        onChange={(e) => setNewEligibility({...newEligibility, eligibility_name: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                        placeholder="e.g., Civil Service Professional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">License Number (Optional)</label>
                      <input
                        type="text"
                        value={newEligibility.license_number}
                        onChange={(e) => setNewEligibility({...newEligibility, license_number: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., 123456789"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Rating (Optional)</label>
                      <input
                        type="text"
                        value={newEligibility.rating}
                        onChange={(e) => setNewEligibility({...newEligibility, rating: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., 85.50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Issuing Authority (Optional)</label>
                      <input
                        type="text"
                        value={newEligibility.issuing_authority}
                        onChange={(e) => setNewEligibility({...newEligibility, issuing_authority: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Civil Service Commission"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date Issued (Optional)</label>
                      <input
                        type="date"
                        value={newEligibility.date_issued}
                        onChange={(e) => setNewEligibility({...newEligibility, date_issued: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        value={newEligibility.expiry_date}
                        onChange={(e) => setNewEligibility({...newEligibility, expiry_date: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <button 
                      onClick={handleAddEligibility}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex-1"
                    >
                      Save Eligibility
                    </button>
                    <button 
                      onClick={() => setShowAddEligibility(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Eligibilities List */}
              {profile?.eligibilities && profile.eligibilities.length > 0 ? (
                <div className="space-y-6">
                  {profile.eligibilities.map((eligibility) => (
                    <div key={eligibility.id} className="border-l-4 border-amber-500 pl-4 py-3 relative group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          {editingEligibility === eligibility.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Eligibility Name *</label>
                                  <input
                                    type="text"
                                    value={editEligibilityData.eligibility_name}
                                    onChange={(e) => setEditEligibilityData({...editEligibilityData, eligibility_name: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">License Number (Optional)</label>
                                  <input
                                    type="text"
                                    value={editEligibilityData.license_number}
                                    onChange={(e) => setEditEligibilityData({...editEligibilityData, license_number: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Rating (Optional)</label>
                                  <input
                                    type="text"
                                    value={editEligibilityData.rating}
                                    onChange={(e) => setEditEligibilityData({...editEligibilityData, rating: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Issuing Authority (Optional)</label>
                                  <input
                                    type="text"
                                    value={editEligibilityData.issuing_authority}
                                    onChange={(e) => setEditEligibilityData({...editEligibilityData, issuing_authority: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Date Issued (Optional)</label>
                                  <input
                                    type="date"
                                    value={editEligibilityData.date_issued}
                                    onChange={(e) => setEditEligibilityData({...editEligibilityData, date_issued: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Expiry Date (Optional)</label>
                                  <input
                                    type="date"
                                    value={editEligibilityData.expiry_date}
                                    onChange={(e) => setEditEligibilityData({...editEligibilityData, expiry_date: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleEditEligibility(eligibility.id)}
                                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex-1"
                                >
                                  Save Changes
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingEligibility(null)
                                    setEditEligibilityData({
                                      eligibility_name: '',
                                      license_number: '',
                                      rating: '',
                                      date_issued: '',
                                      expiry_date: '',
                                      issuing_authority: '',
                                    })
                                  }}
                                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-gray-900">{eligibility.eligibility_name}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
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
                                    <span className="font-medium">Issued:</span> {new Date(eligibility.date_issued).toLocaleDateString()}
                                  </p>
                                )}
                                {eligibility.expiry_date && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Expires:</span> {new Date(eligibility.expiry_date).toLocaleDateString()}
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
                          <div className="flex flex-col md:flex-row gap-2 ml-2">
                            <button 
                              onClick={() => startEditingEligibility(eligibility)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit eligibility"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteEligibility(eligibility.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No eligibilities added yet.</p>
                  <button 
                    onClick={() => setShowAddEligibility(true)}
                    className="mt-3 text-amber-600 hover:text-amber-800 font-medium"
                  >
                    Add your first eligibility
                  </button>
                </div>
              )}
            </div>

            {/* Trainings Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                  <h3 className="text-xl font-bold text-gray-900">Trainings</h3>
                </div>
                <button 
                  onClick={() => setShowAddTraining(true)}
                  disabled={isUploading}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 w-full md:w-auto disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add Training
                </button>
              </div>

              {/* Add Training Form */}
              {showAddTraining && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-bold mb-4">Add Training</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Training Name *</label>
                      <input
                        type="text"
                        value={newTraining.training_name}
                        onChange={(e) => setNewTraining({...newTraining, training_name: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                        placeholder="e.g., Project Management Professional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Institution *</label>
                      <input
                        type="text"
                        value={newTraining.institution}
                        onChange={(e) => setNewTraining({...newTraining, institution: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                        placeholder="e.g., Philippine Management Association"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Start Date (Optional)</label>
                      <input
                        type="date"
                        value={newTraining.start_date}
                        onChange={(e) => setNewTraining({...newTraining, start_date: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
                      <input
                        type="date"
                        value={newTraining.end_date}
                        onChange={(e) => setNewTraining({...newTraining, end_date: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Duration Hours (Optional)</label>
                      <input
                        type="number"
                        value={newTraining.duration_hours}
                        onChange={(e) => setNewTraining({...newTraining, duration_hours: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="1"
                        placeholder="e.g., 40"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Certificate ID (Optional)</label>
                      <input
                        type="text"
                        value={newTraining.certificate_id}
                        onChange={(e) => setNewTraining({...newTraining, certificate_id: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., PMP-2023-001"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Skills Learned (Optional)</label>
                      <textarea
                        value={newTraining.skills_learned}
                        onChange={(e) => setNewTraining({...newTraining, skills_learned: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="List skills or competencies gained from this training..."
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <button 
                      onClick={handleAddTraining}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex-1"
                    >
                      Save Training
                    </button>
                    <button 
                      onClick={() => setShowAddTraining(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Trainings List */}
              {profile?.trainings && profile.trainings.length > 0 ? (
                <div className="space-y-6">
                  {profile.trainings.map((training) => (
                    <div key={training.id} className="border-l-4 border-indigo-500 pl-4 py-3 relative group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          {editingTraining === training.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Training Name *</label>
                                  <input
                                    type="text"
                                    value={editTrainingData.training_name}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, training_name: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Institution *</label>
                                  <input
                                    type="text"
                                    value={editTrainingData.institution}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, institution: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Start Date (Optional)</label>
                                  <input
                                    type="date"
                                    value={editTrainingData.start_date}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, start_date: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
                                  <input
                                    type="date"
                                    value={editTrainingData.end_date}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, end_date: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Duration Hours (Optional)</label>
                                  <input
                                    type="number"
                                    value={editTrainingData.duration_hours}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, duration_hours: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    min="1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Certificate ID (Optional)</label>
                                  <input
                                    type="text"
                                    value={editTrainingData.certificate_id}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, certificate_id: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium mb-1">Skills Learned (Optional)</label>
                                  <textarea
                                    value={editTrainingData.skills_learned}
                                    onChange={(e) => setEditTrainingData({...editTrainingData, skills_learned: e.target.value})}
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleEditTraining(training.id)}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex-1"
                                >
                                  Save Changes
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingTraining(null)
                                    setEditTrainingData({
                                      training_name: '',
                                      institution: '',
                                      start_date: '',
                                      end_date: '',
                                      duration_hours: '',
                                      certificate_id: '',
                                      skills_learned: '',
                                    })
                                  }}
                                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-gray-900">{training.training_name}</h4>
                              <p className="text-gray-700">{training.institution}</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                {training.start_date && training.end_date && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Duration:</span> {new Date(training.start_date).toLocaleDateString()} – {new Date(training.end_date).toLocaleDateString()}
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
                          <div className="flex flex-col md:flex-row gap-2 ml-2">
                            <button 
                              onClick={() => startEditingTraining(training)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit training"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTraining(training.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No trainings added yet.</p>
                  <button 
                    onClick={() => setShowAddTraining(true)}
                    className="mt-3 text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Add your first training
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}