'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { AdminLayout } from '@/components/adminhrsidebar'
import { 
  User, 
  Lock, 
  Save, 
  Upload, 
  Calendar, 
  Phone, 
  MapPin, 
  Mail,
  Shield,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  AlertTriangle
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

// Main Profile Page Component with Layout
export default function ProfilePage() {
  return (
    <AdminLayout>
      <ProfileContent />
    </AdminLayout>
  )
}

// Create the main profile content component
function ProfileContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [copiedId, setCopiedId] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  
  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  // Updated to include 'info' type
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  
  // Profile form state
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    address: ''
  })

  useEffect(() => {
    fetchUserProfile()
    testStorageConnection()
  }, [])

  const testStorageConnection = async () => {
    try {
      console.log('🔍 Testing storage connection...')
      
      // List all buckets to see what's available
      const { data: buckets, error } = await supabase.storage.listBuckets()
      
      if (error) {
        console.error('❌ Error listing buckets:', error)
        setStorageError(`Storage error: ${error.message}`)
        return
      }
      
      console.log('📦 Available buckets:', buckets?.map(b => b.name))
      
      // Check if 'profile' bucket exists
      const profileBucket = buckets?.find(b => b.name === 'profile')
      
      if (!profileBucket) {
        console.error('❌ "profile" bucket not found!')
        setStorageError('"profile" storage bucket not found. Please create it in Supabase Storage first.')
      } else {
        console.log('✅ "profile" bucket found:', profileBucket)
        setStorageError(null)
      }
      
    } catch (error: any) {
      console.error('💥 Error testing storage:', error)
      setStorageError(`Storage connection failed: ${error.message}`)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        router.push('/login')
        return
      }

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
        setUserProfile(profile)
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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
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

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${userProfile.id}-${Date.now()}.${fileExt}`
      
      console.log('📤 Uploading file to "profile" bucket:', fileName)

      // Try direct upload first
      let uploadError = null
      let uploadData = null
      
      try {
        const { data, error } = await supabase.storage
          .from('profile')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: true,
            cacheControl: '3600'
          })
        
        uploadError = error
        uploadData = data
      } catch (uploadException: any) {
        console.error('Direct upload exception:', uploadException)
        uploadError = uploadException
      }

      if (uploadError) {
        console.error('❌ Upload error details:', uploadError)
        
        // Try alternative approach if direct upload fails
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('does not exist')) {
          throw new Error('Storage bucket "profile" not found. Please create it in Supabase Storage.')
        }
        throw uploadError
      }

      console.log('✅ Upload successful:', uploadData)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile')
        .getPublicUrl(fileName)

      console.log('🔗 Generated URL:', publicUrl)

      // Update profile with new avatar URL
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
      console.error('❌ Avatar upload error:', error)
      
      let errorMessage = 'Failed to upload profile picture. '
      
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        errorMessage += 'Storage bucket "profile" not found. Please create it in Supabase Storage.'
      } else if (error.message?.includes('permission')) {
        errorMessage += 'Permission denied. Make sure the bucket is public.'
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

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
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

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      // First, verify current password by signing in
      const email = userProfile?.email
      if (!email) {
        setMessage({ type: 'error', text: 'Email not found' })
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: passwordData.currentPassword
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setMessage({ type: 'error', text: 'Current password is incorrect' })
        } else {
          setMessage({ type: 'error', text: 'Authentication failed. Please try again.' })
        }
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (updateError) {
        if (updateError.message.includes('password should be different')) {
          setMessage({ type: 'error', text: 'New password must be different from current password' })
        } else {
          setMessage({ type: 'error', text: 'Failed to update password. Please try again.' })
        }
        throw updateError
      }

      setMessage({ type: 'success', text: 'Password updated successfully!' })
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      
      setTimeout(() => {
        setMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Error updating password:', error)
      if (!message) {
        setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' })
      }
    } finally {
      setSaving(false)
    }
  }

  const getDisplayName = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`
    }
    return userProfile?.email?.split('@')[0] || 'User'
  }

  const getRoleDisplay = () => {
    if (userProfile?.role === 'super_admin') {
      return 'Super Administrator'
    } else if (userProfile?.role === 'hr') {
      return 'HR Manager'
    }
    return 'User'
  }

  // Date formatting functions
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

  const formatShortDate = (dateString: string) => {
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

  const formatMonthDay = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const getInitials = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name.charAt(0)}${userProfile.last_name.charAt(0)}`.toUpperCase()
    }
    return userProfile?.email?.charAt(0).toUpperCase() || 'U'
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

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, color: 'bg-gray-200', text: 'Empty' }
    
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600']
    const texts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    
    const safeScore = Math.min(Math.max(score, 0), 4)
    
    return {
      score: safeScore,
      color: colors[safeScore],
      text: texts[safeScore]
    }
  }

  // Quick storage test function
  const testStorageManually = async () => {
    try {
      setMessage({ type: 'info', text: 'Testing storage connection...' })
      
      // List buckets
      const { data: buckets, error } = await supabase.storage.listBuckets()
      
      if (error) {
        console.error('Bucket list error:', error)
        setMessage({ type: 'error', text: `Storage error: ${error.message}` })
        return
      }
      
      console.log('Available buckets:', buckets)
      
      if (!buckets?.find(b => b.name === 'profile')) {
        setMessage({ type: 'error', text: '❌ "profile" bucket not found. Please create it in Supabase Storage.' })
      } else {
        setMessage({ type: 'success', text: '✅ "profile" bucket found! Storage is working.' })
      }
      
    } catch (error: any) {
      console.error('Storage test error:', error)
      setMessage({ type: 'error', text: `Test failed: ${error.message}` })
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
          <p className="text-gray-600 mt-1">Manage your account information and security settings</p>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-lg border border-blue-100">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">{getRoleDisplay()}</span>
        </div>
      </div>

      {/* Storage Warning */}
      {storageError && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Storage Configuration Required</p>
              <p className="text-sm text-yellow-700 mt-1">{storageError}</p>
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium">To fix this:</p>
                <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                  <li>Go to your Supabase Dashboard</li>
                  <li>Click on "Storage" in the left sidebar</li>
                  <li>Click "Create a new bucket"</li>
                  <li>Name it exactly: <code className="bg-yellow-100 px-2 py-1 rounded">profile</code></li>
                  <li>Make sure "Public" is selected</li>
                  <li>Click "Create bucket"</li>
                </ol>
                <button
                  onClick={testStorageManually}
                  className="mt-2 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                >
                  Test Storage Connection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Alert */}
      {message && (
        <div className={cn(
          "rounded-lg border p-4 flex items-start gap-3 animate-in fade-in duration-300",
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : message.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-blue-50 border-blue-200 text-blue-800' // For 'info' type
        )}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : message.type === 'error' ? (
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
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

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            "flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors relative",
            activeTab === 'profile'
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <User className="h-4 w-4" />
          Personal Information
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={cn(
            "flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors relative",
            activeTab === 'password'
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Lock className="h-4 w-4" />
          Change Password
        </button>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Card (Always Visible) */}
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
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">{getInitials()}</span>
                      </div>
                    )}
                  </div>
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
                      disabled={uploadingAvatar || !!storageError}
                      title={storageError ? "Storage not configured" : "Change profile picture"}
                    />
                  </label>
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
                    {formatShortDate(userProfile.created_at)}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">Last Updated</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {userProfile.updated_at ? formatMonthDay(userProfile.updated_at) : 'Never'}
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
        </div>

        {/* Right Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Form */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
                <p className="text-sm text-gray-600 mt-1">Update your personal information</p>
              </div>
              
              <form onSubmit={handleProfileUpdate} className="p-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="first_name" className="text-sm font-medium text-gray-700">
                      First Name *
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleProfileChange}
                      placeholder="Enter first name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="middle_name" className="text-sm font-medium text-gray-700">
                      Middle Name
                    </label>
                    <input
                      id="middle_name"
                      name="middle_name"
                      value={formData.middle_name}
                      onChange={handleProfileChange}
                      placeholder="Enter middle name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="last_name" className="text-sm font-medium text-gray-700">
                      Last Name *
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleProfileChange}
                      placeholder="Enter last name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleProfileChange}
                      placeholder="+1 (555) 123-4567"
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="date_of_birth" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date of Birth
                    </label>
                    <input
                      id="date_of_birth"
                      name="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                    {formData.date_of_birth && (
                      <p className="text-xs text-gray-500">
                        Age: {(() => {
                          const birthDate = new Date(formData.date_of_birth)
                          const today = new Date()
                          let age = today.getFullYear() - birthDate.getFullYear()
                          const monthDiff = today.getMonth() - birthDate.getMonth()
                          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                            age--
                          }
                          return age
                        })()} years
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      id="email"
                      value={userProfile.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleProfileChange}
                    placeholder="Enter your complete address"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    type="submit"
                    disabled={saving || uploadingAvatar}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium transition-colors",
                      saving || uploadingAvatar
                        ? "opacity-70 cursor-not-allowed"
                        : "hover:bg-blue-700"
                    )}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Change Password Form */}
          {activeTab === 'password' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                <p className="text-sm text-gray-600 mt-1">Update your password to keep your account secure</p>
              </div>
              
              <form onSubmit={handlePasswordUpdate} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                      Current Password *
                    </label>
                    <div className="relative">
                      <input
                        id="currentPassword"
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter current password"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter new password (min. 8 characters)"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {passwordData.newPassword && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">Password strength:</span>
                          <span className={cn(
                            "font-medium",
                            getPasswordStrength(passwordData.newPassword).score >= 4 ? "text-green-600" :
                            getPasswordStrength(passwordData.newPassword).score >= 3 ? "text-yellow-600" :
                            "text-red-600"
                          )}>
                            {getPasswordStrength(passwordData.newPassword).text}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-300",
                              getPasswordStrength(passwordData.newPassword).color
                            )}
                            style={{ width: `${(getPasswordStrength(passwordData.newPassword).score / 4) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirm new password"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    {/* Password Match Indicator */}
                    {passwordData.confirmPassword && (
                      <div className="flex items-center gap-2 text-sm mt-1">
                        {passwordData.newPassword === passwordData.confirmPassword ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-600">Passwords match</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-red-600">Passwords do not match</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Password Requirements
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li className="flex items-center gap-2">
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        passwordData.newPassword.length >= 8 ? "bg-green-500" : "bg-blue-300"
                      )} />
                      At least 8 characters long
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        /[A-Z]/.test(passwordData.newPassword) ? "bg-green-500" : "bg-blue-300"
                      )} />
                      One uppercase letter
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        /[0-9]/.test(passwordData.newPassword) ? "bg-green-500" : "bg-blue-300"
                      )} />
                      One number
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        /[^A-Za-z0-9]/.test(passwordData.newPassword) ? "bg-green-500" : "bg-blue-300"
                      )} />
                      One special character
                    </li>
                  </ul>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    type="submit"
                    disabled={saving}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium transition-colors",
                      saving
                        ? "opacity-70 cursor-not-allowed"
                        : "hover:bg-blue-700"
                    )}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Account Information Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
            </div>
            <div className="p-6">
              <div className="grid gap-4 md:grid-cols-2">
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
                    <span className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium",
                      userProfile.role === 'super_admin' ? "bg-purple-100 text-purple-800" :
                      userProfile.role === 'hr' ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    )}>
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
              
              {/* Additional Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Note:</span> Some account details like email and user role 
                  require administrator approval to change. Contact your system administrator for assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}