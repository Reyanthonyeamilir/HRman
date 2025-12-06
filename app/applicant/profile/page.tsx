'use client'

import React, { useState, useEffect } from 'react'
import { 
  User, Mail, Phone, Calendar, MapPin, Briefcase, 
  GraduationCap, Edit, Save, X, Plus, Trash2, Upload, Bug 
} from 'lucide-react'
import Image from 'next/image'
import { supabase, getCurrentUser } from '@/lib/supabaseClient'

// Keep interfaces
interface Education {
  id: string;
  profile_id: string;
  course_qualification: string;
  institution: string;
  expected_finish?: string;
  course_highlights?: string;
  created_at: string;
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
}

export default function ApplicantProfileContent() {
  const [profile, setProfile] = useState<ProfileWithDetails | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddEducation, setShowAddEducation] = useState(false)
  const [showAddExperience, setShowAddExperience] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  // For adding new education
  const [newEducation, setNewEducation] = useState({
    course_qualification: '',
    institution: '',
    expected_finish: '',
    course_highlights: ''
  })
  
  // For editing existing education
  const [editingEducation, setEditingEducation] = useState<string | null>(null)
  const [editEducationData, setEditEducationData] = useState({
    course_qualification: '',
    institution: '',
    expected_finish: '',
    course_highlights: ''
  })
  
  // For editing existing work experience
  const [editingExperience, setEditingExperience] = useState<string | null>(null)
  const [editExperienceData, setEditExperienceData] = useState({
    job_title: '',
    company: '',
    start_date: '',
    end_date: '',
    currently_working: false,
    description: ''
  })
  
  const [newWorkExperience, setNewWorkExperience] = useState({
    job_title: '',
    company: '',
    start_date: '',
    end_date: '',
    currently_working: false,
    description: ''
  })

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

  useEffect(() => {
    fetchProfile()
  }, [])

  const getSessionToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

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

      const response = await fetch(`/api/applicant/profile?userId=${user.id}`, {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file
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

  // ==================== UPLOAD FUNCTION (FIXED) ====================
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null

    try {
      setIsUploading(true)
      console.log('🚀 Starting avatar upload...')
      
      const token = await getSessionToken()
      if (!token) {
        console.error('❌ No session token')
        alert('Session expired, please login again')
        return null
      }

      console.log('📋 File details:', {
        name: avatarFile.name,
        type: avatarFile.type,
        size: avatarFile.size,
        lastModified: avatarFile.lastModified
      })

      const formData = new FormData()
      formData.append('file', avatarFile)
      
      console.log('📤 Sending to /api/upload...')
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      })
      
      console.log('📥 Response status:', response.status, response.statusText)
      
      const result = await response.json()
      console.log('📄 Response data:', result)
      
      if (!response.ok) {
        console.error('❌ API error:', result.error)
        throw new Error(result.error || `Upload failed: ${response.status}`)
      }
      
      if (!result.url) {
        throw new Error('No URL returned from server')
      }
      
      console.log('✅ Upload successful! URL:', result.url)
      return result.url
      
    } catch (error: any) {
      console.error('💥 Upload error:', error)
      alert(`Upload failed: ${error.message}`)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  // ==================== ALTERNATIVE DIRECT UPLOAD ====================
  const uploadAvatarDirect = async (): Promise<string | null> => {
    if (!avatarFile) return null

    try {
      setIsUploading(true)
      console.log('🚀 Direct upload to Supabase...')
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        alert('Session expired, please login again')
        return null
      }

      // Generate simple filename
      const fileExt = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `avatar-${session.user.id}-${Date.now()}.${fileExt}`
      
      console.log('📁 Uploading:', fileName)

      // Upload directly
      const { data, error } = await supabase.storage
        .from('profile')
        .upload(fileName, avatarFile, {
          contentType: avatarFile.type,
          upsert: true,
          cacheControl: '3600'
        })

      if (error) {
        console.error('❌ Supabase upload error:', error)
        throw new Error(`Supabase error: ${error.message}`)
      }

      console.log('✅ Upload data:', data)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile')
        .getPublicUrl(data.path)

      console.log('🔗 Public URL:', publicUrl)
      return publicUrl

    } catch (error: any) {
      console.error('💥 Direct upload error:', error)
      alert(`Upload failed: ${error.message}`)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  // ==================== DEBUG FUNCTION ====================
  const debugStorage = async () => {
    try {
      console.log('🔍 Starting storage debug...')
      
      const { data: { session } } = await supabase.auth.getSession()
      console.log('👤 User session:', session?.user?.id)
      
      // Check buckets
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
      console.log('📦 All buckets:', buckets)
      
      if (bucketError) {
        console.error('❌ Bucket error:', bucketError)
        alert(`Bucket error: ${bucketError.message}`)
        return
      }
      
      const profileBucket = buckets?.find(b => b.id === 'profile')
      console.log('🎯 Profile bucket:', profileBucket)
      
      if (!profileBucket) {
        alert('❌ "profile" bucket not found! Create it in Supabase Storage.')
        return
      }
      
      // Test upload with tiny file
      const testBlob = new Blob(['test'], { type: 'image/jpeg' })
      const testFile = new File([testBlob], 'debug-test.jpg', { type: 'image/jpeg' })
      
      console.log('🧪 Testing direct upload...')
      const { data, error } = await supabase.storage
        .from('profile')
        .upload(`debug-${Date.now()}.jpg`, testFile, {
          contentType: 'image/jpeg'
        })
      
      if (error) {
        console.error('❌ Direct upload failed:', error.message)
        alert(`Direct upload failed: ${error.message}`)
      } else {
        console.log('✅ Direct upload worked!', data)
        
        // Get URL
        const { data: { publicUrl } } = supabase.storage
          .from('profile')
          .getPublicUrl(data.path)
        
        console.log('🔗 Public URL:', publicUrl)
        
        // Clean up
        await supabase.storage
          .from('profile')
          .remove([data.path])
        
        alert(`✅ Storage is working!\n\nBucket: ${profileBucket?.id}\nPublic: ${profileBucket?.public}\n\nTest file uploaded and deleted successfully.`)
      }
      
    } catch (error: any) {
      console.error('💥 Debug error:', error)
      alert('Debug failed: ' + error.message)
    }
  }

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

      // Upload avatar first if changed
      let avatarUrl = formData.avatar_url
      if (avatarFile) {
        console.log('🔄 Uploading avatar...')
        
        // Try API method first
        let uploadedUrl = await uploadAvatar()
        
        // If API fails, try direct method
        if (!uploadedUrl) {
          console.log('🔄 API failed, trying direct upload...')
          uploadedUrl = await uploadAvatarDirect()
        }
        
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
          console.log('✅ New avatar URL:', avatarUrl)
        } else {
          alert('Avatar upload failed. Profile saved without new avatar.')
        }
      }

      console.log('Updating profile with data:', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        avatar_url: avatarUrl
      })

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
      console.log('Update response:', responseData)

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
    } finally {
      setIsUploading(false)
    }
  }

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

      // FIXED: Updated API path to match your route
      const response = await fetch('/api/applicant/education', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEducation)
      })

      const responseData = await response.json()
      
      if (response.ok) {
        setNewEducation({
          course_qualification: '',
          institution: '',
          expected_finish: '',
          course_highlights: ''
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

      // FIXED: Updated API path to match your route
      const response = await fetch('/api/applicant/education', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id,
          ...editEducationData
        })
      })

      const responseData = await response.json()
      
      if (response.ok) {
        setEditingEducation(null)
        setEditEducationData({
          course_qualification: '',
          institution: '',
          expected_finish: '',
          course_highlights: ''
        })
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

      // FIXED: Updated API path to match your route
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

      // FIXED: Changed from /api/applicant/profile/experience to /api/applicant/experience
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

      // FIXED: Changed from /api/applicant/profile/experience to /api/applicant/experience
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
        setEditExperienceData({
          job_title: '',
          company: '',
          start_date: '',
          end_date: '',
          currently_working: false,
          description: ''
        })
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

      // FIXED: Changed from /api/applicant/profile/experience to /api/applicant/experience
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

  const startEditingEducation = (edu: Education) => {
    setEditingEducation(edu.id)
    setEditEducationData({
      course_qualification: edu.course_qualification,
      institution: edu.institution,
      expected_finish: edu.expected_finish || '',
      course_highlights: edu.course_highlights || ''
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

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
                  APPLICANT
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

          {/* Right Column - Education & Experience */}
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
                      <label className="block text-sm font-medium mb-1">Expected Finish (Optional)</label>
                      <input
                        type="date"
                        value={newEducation.expected_finish}
                        onChange={(e) => setNewEducation({...newEducation, expected_finish: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Course Highlights (Optional)</label>
                      <input
                        type="text"
                        value={newEducation.course_highlights}
                        onChange={(e) => setNewEducation({...newEducation, course_highlights: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Dean's Lister, Magna Cum Laude"
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
                                  <label className="block text-sm font-medium mb-1">Expected Finish (Optional)</label>
                                  <input
                                    type="date"
                                    value={editEducationData.expected_finish}
                                    onChange={(e) => setEditEducationData({...editEducationData, expected_finish: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Course Highlights (Optional)</label>
                                  <input
                                    type="text"
                                    value={editEducationData.course_highlights}
                                    onChange={(e) => setEditEducationData({...editEducationData, course_highlights: e.target.value})}
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
                                      course_highlights: ''
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
                              <p className="text-sm text-gray-600 mt-1">
                                {edu.expected_finish 
                                  ? `Expected Finish: ${new Date(edu.expected_finish).toLocaleDateString()}`
                                  : 'No expected finish date'
                                }
                              </p>
                              {edu.course_highlights && (
                                <p className="text-gray-600 mt-2 text-sm bg-gray-50 p-2 rounded">
                                  <span className="font-medium">Highlights:</span> {edu.course_highlights}
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
          </div>
        </div>
      </div>
    </main>
  )
}