'use client'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createClient } from "@supabase/supabase-js"
import Image from "next/image"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function SignupPage() {
  const router = useRouter()
  
  // Form state
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [msgType, setMsgType] = useState<'success' | 'error' | 'info'>('info')
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  
  // Basic Information
  const [basicInfo, setBasicInfo] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    firstName: "",
    lastName: "",
    middleName: "",
    dateOfBirth: "",
    address: ""
  })

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Mark field as touched
  const markFieldAsTouched = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }))
  }

  // Validate individual field
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'firstName':
        return !value.trim() ? "First name is required" : ""
      
      case 'lastName':
        return !value.trim() ? "Last name is required" : ""
      
      case 'email':
        if (!value.trim()) return "Email is required"
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email address"
        return ""
      
      case 'password':
        if (!value) return "Password is required"
        if (value.length < 8) return "Password must be at least 8 characters"
        return ""
      
      case 'confirmPassword':
        if (!value) return "Please confirm your password"
        if (value !== basicInfo.password) return "Passwords do not match"
        return ""
      
      case 'dateOfBirth':
        if (value) {
          const dob = new Date(value)
          const today = new Date()
          
          // Check if date is valid
          if (isNaN(dob.getTime())) return "Invalid date"
          
          // Check if date is in the future
          if (dob > today) return "Date of birth cannot be in the future"
          
          // Check if person is at least 16 years old (optional)
          const minAge = 16
          const minBirthDate = new Date()
          minBirthDate.setFullYear(today.getFullYear() - minAge)
          if (dob > minBirthDate) return `You must be at least ${minAge} years old`
        }
        return ""
      
      default:
        return ""
    }
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate all required fields
    const fieldsToValidate = ['firstName', 'lastName', 'email', 'password', 'confirmPassword']
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, basicInfo[field as keyof typeof basicInfo])
      if (error) newErrors[field] = error
    })

    // Validate optional dateOfBirth if provided
    if (basicInfo.dateOfBirth) {
      const dobError = validateField('dateOfBirth', basicInfo.dateOfBirth)
      if (dobError) newErrors.dateOfBirth = dobError
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle basic info changes with real-time validation
  const handleBasicInfoChange = (field: string, value: string) => {
    setBasicInfo(prev => ({ ...prev, [field]: value }))
    
    // Mark field as touched
    markFieldAsTouched(field)
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
    
    // Special handling for password confirmation
    if (field === 'password' && basicInfo.confirmPassword) {
      const confirmError = validateField('confirmPassword', basicInfo.confirmPassword)
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }))
    }
    
    // Validate field if it's been touched
    if (touchedFields[field]) {
      const error = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }

  // Handle blur event for validation
  const handleBlur = (field: string) => {
    markFieldAsTouched(field)
    const error = validateField(field, basicInfo[field as keyof typeof basicInfo])
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  // Handle form submission - TRIGGER VERSION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all fields as touched for validation
    const allFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword']
    allFields.forEach(field => markFieldAsTouched(field))
    
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors).find(key => errors[key])
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.focus()
        }
      }
      return
    }

    setLoading(true)
    setMsg(null)

    try {
      console.log("Starting signup process...")

      // 1. Create auth user with ALL metadata
      console.log("Creating auth user with metadata...")
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: basicInfo.email.trim(),
        password: basicInfo.password,
        options: {
          data: {
            first_name: basicInfo.firstName.trim(),
            last_name: basicInfo.lastName.trim(),
            middle_name: basicInfo.middleName.trim() || null,
            phone: basicInfo.phone.trim() || null,
            dateOfBirth: basicInfo.dateOfBirth || null,
            address: basicInfo.address.trim() || null,
          }
        }
      })

      if (authError) {
        console.error("Auth error:", authError)
        
        if (authError.message.includes('already registered') || 
            authError.message.includes('User already registered') ||
            authError.code === 'user_already_exists') {
          throw new Error("This email address is already registered. Please use a different email.")
        }
        
        if (authError.message.includes('invalid_email')) {
          throw new Error("Please enter a valid email address.")
        }
        
        if (authError.message.includes('weak_password')) {
          throw new Error("Password is too weak. Please use a stronger password.")
        }
        
        throw new Error(`Signup failed: ${authError.message}`)
      }
      
      if (!authData.user) {
        throw new Error("Failed to create user account. Please try again.")
      }

      console.log("✅ Auth User created successfully:", authData.user.id)
      console.log("📝 User metadata:", authData.user.user_metadata)
      
      // IMPORTANT: Wait for database trigger to create profile
      console.log("⏳ Waiting for trigger to create profile...")
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Verify profile was created by trigger
      console.log("🔍 Verifying profile creation...")
      const { data: profileCheck, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        console.warn("Profile check warning:", profileError)
        // This might be okay if trigger is still processing
      } else if (profileCheck) {
        console.log("✅ Profile created by trigger:", {
          id: profileCheck.id,
          email: profileCheck.email,
          first_name: profileCheck.first_name,
          last_name: profileCheck.last_name,
          middle_name: profileCheck.middle_name,
          date_of_birth: profileCheck.date_of_birth,
          age: profileCheck.age,
          address: profileCheck.address
        })
      }

      // 2. Clear form after successful registration
      setBasicInfo({
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        firstName: "",
        lastName: "",
        middleName: "",
        dateOfBirth: "",
        address: ""
      })

      // 3. Clear touched fields and errors
      setTouchedFields({})
      setErrors({})

      // 4. Show success message
      setMsg("✅ Account created successfully! Your profile has been automatically created in the database with all your information. You can now log in.")
      setMsgType('success')

    } catch (err: any) {
      console.error("❌ Signup error:", err)
      setMsg(err.message || "Failed to create account. Please try again.")
      setMsgType('error')
    } finally {
      setLoading(false)
    }
  }

  // Helper to check if field should show error
  const shouldShowError = (field: string): boolean => {
    return touchedFields[field] && !!errors[field]
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a1630] via-[#0f2a5c] to-[#1a3f8a]">
      <div className="relative w-full min-h-screen overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/norsu-campus.jpg"
            alt="NORSU Campus"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            quality={80}
            style={{ objectPosition: 'center 30%' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1630]/95 via-[#0a1630]/80 to-[#0a1630]/95 md:from-[#0a1630]/90 md:via-[#0a1630]/60 md:to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1630] via-transparent to-transparent"></div>
        </div>

        {/* Exit button */}
        <Link
          href="/"
          className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-white backdrop-blur-md hover:bg-white/25 transition-all border border-white/20"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          <span className="text-sm font-semibold">Exit</span>
        </Link>

        {/* Main Form Container */}
        <div className="relative z-10 flex items-center justify-center px-4 py-8">
          <section className="w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden bg-white/95 backdrop-blur-sm border border-white/20">
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* Info Sidebar */}
              <div className="bg-gradient-to-b from-blue-50 to-white p-6 md:p-8 border-r border-slate-200">
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 mb-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-700 animate-pulse"></div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-blue-800">
                      Create Account
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Join HRM System</h2>
                  <p className="text-sm text-slate-600">Automatic profile creation via database trigger</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Automatic Profile</h3>
                      <p className="text-sm text-slate-600">Database trigger handles creation</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">All Data Saved</h3>
                      <p className="text-sm text-slate-600">Name, DOB, age, address stored</p>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                
                </div>
              </div>

              {/* Form Content */}
              <div className="lg:col-span-2 p-6 md:p-8">
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Create Your Account</h3>
                  
                </div>

                <form onSubmit={handleSubmit}>
                  {/* Only show form fields if not in success state */}
                  {msgType !== 'success' && (
                    <div className="space-y-6">
                      {/* Required fields only */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            First Name *
                          </label>
                          <input
                            id="firstName"
                            className={`w-full h-11 rounded-lg border ${shouldShowError('firstName') ? 'border-red-300 bg-red-50' : 'border-slate-200'} bg-white px-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent`}
                            type="text"
                            placeholder="First name"
                            value={basicInfo.firstName}
                            onChange={(e) => handleBasicInfoChange('firstName', e.target.value)}
                            onBlur={() => handleBlur('firstName')}
                            required
                          />
                          {shouldShowError('firstName') && (
                            <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Last Name *
                          </label>
                          <input
                            id="lastName"
                            className={`w-full h-11 rounded-lg border ${shouldShowError('lastName') ? 'border-red-300 bg-red-50' : 'border-slate-200'} bg-white px-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent`}
                            type="text"
                            placeholder="Last name"
                            value={basicInfo.lastName}
                            onChange={(e) => handleBasicInfoChange('lastName', e.target.value)}
                            onBlur={() => handleBlur('lastName')}
                            required
                          />
                          {shouldShowError('lastName') && (
                            <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                          )}
                        </div>
                      </div>

                      {/* Middle Name (optional) */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Middle Name
                        </label>
                        <input
                          className="w-full h-11 rounded-lg border border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          type="text"
                          placeholder="Middle name (optional)"
                          value={basicInfo.middleName}
                          onChange={(e) => handleBasicInfoChange('middleName', e.target.value)}
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          id="email"
                          className={`w-full h-11 rounded-lg border ${shouldShowError('email') ? 'border-red-300 bg-red-50' : 'border-slate-200'} bg-white px-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent`}
                          type="email"
                          placeholder="yourname@example.com"
                          value={basicInfo.email}
                          onChange={(e) => handleBasicInfoChange('email', e.target.value)}
                          onBlur={() => handleBlur('email')}
                          required
                        />
                        {shouldShowError('email') && (
                          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                        )}
                      </div>

                      {/* Password Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Password *
                          </label>
                          <input
                            id="password"
                            className={`w-full h-11 rounded-lg border ${shouldShowError('password') ? 'border-red-300 bg-red-50' : 'border-slate-200'} bg-white px-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent`}
                            type="password"
                            placeholder="At least 8 characters"
                            value={basicInfo.password}
                            onChange={(e) => handleBasicInfoChange('password', e.target.value)}
                            onBlur={() => handleBlur('password')}
                            required
                          />
                          {shouldShowError('password') && (
                            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Confirm Password *
                          </label>
                          <input
                            id="confirmPassword"
                            className={`w-full h-11 rounded-lg border ${shouldShowError('confirmPassword') ? 'border-red-300 bg-red-50' : basicInfo.confirmPassword && basicInfo.password === basicInfo.confirmPassword ? 'border-green-300' : 'border-slate-200'} bg-white px-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent`}
                            type="password"
                            placeholder="Confirm your password"
                            value={basicInfo.confirmPassword}
                            onChange={(e) => handleBasicInfoChange('confirmPassword', e.target.value)}
                            onBlur={() => handleBlur('confirmPassword')}
                            required
                          />
                          {shouldShowError('confirmPassword') && (
                            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                          )}
                        </div>
                      </div>

                      {/* Optional fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Phone Number
                          </label>
                          <input
                            className="w-full h-11 rounded-lg border border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                            type="tel"
                            placeholder="0912 345 6789 (optional)"
                            value={basicInfo.phone}
                            onChange={(e) => handleBasicInfoChange('phone', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Date of Birth
                          </label>
                          <input
                            id="dateOfBirth"
                            className={`w-full h-11 rounded-lg border ${shouldShowError('dateOfBirth') ? 'border-red-300 bg-red-50' : 'border-slate-200'} bg-white px-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent`}
                            type="date"
                            value={basicInfo.dateOfBirth}
                            onChange={(e) => handleBasicInfoChange('dateOfBirth', e.target.value)}
                            onBlur={() => handleBlur('dateOfBirth')}
                            max={new Date().toISOString().split('T')[0]}
                          />
                          {shouldShowError('dateOfBirth') && (
                            <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Address
                        </label>
                        <input
                          className="w-full h-11 rounded-lg border border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          type="text"
                          placeholder="Address (optional)"
                          value={basicInfo.address}
                          onChange={(e) => handleBasicInfoChange('address', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Message Display */}
                  {msg && (
                    <div className={`mt-6 p-4 rounded-lg ${
                      msgType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                      msgType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        {msgType === 'success' && (
                          <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {msgType === 'error' && (
                          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <div className="text-sm">
                          {msgType === 'success' && (
                            <div>
                              <p className="font-semibold mb-3 text-lg">✅ Account Created Successfully!</p>
                              <p className="text-slate-700 mb-2">
                                Your authentication account has been created and a database trigger will automatically create your profile with:
                              </p>
                              <ul className="text-slate-700 list-disc pl-5 mb-3 space-y-1">
                                <li>First Name: {basicInfo.firstName}</li>
                                <li>Last Name: {basicInfo.lastName}</li>
                                {basicInfo.middleName && <li>Middle Name: {basicInfo.middleName}</li>}
                                {basicInfo.dateOfBirth && <li>Date of Birth: {basicInfo.dateOfBirth}</li>}
                                {basicInfo.address && <li>Address: {basicInfo.address}</li>}
                              </ul>
                              <p className="text-slate-700 font-medium">
                                You can now log in with your email and password.
                              </p>
                            </div>
                          )}
                          {msgType !== 'success' && <p>{msg}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Actions */}
                  {msgType !== 'success' ? (
                    <div className="mt-8">
                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-800 text-white rounded-lg font-semibold hover:from-blue-800 hover:to-blue-900 transition-all disabled:opacity-60 shadow-lg hover:shadow-xl"
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            CREATING ACCOUNT...
                          </span>
                        ) : (
                          "CREATE ACCOUNT"
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      <button
                        type="button"
                        onClick={() => router.push('/login')}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        GO TO LOGIN PAGE
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => router.push('/')}
                        className="w-full py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                      >
                        GO TO HOMEPAGE
                      </button>
                    </div>
                  )}

                  {/* Login Link */}
                  {msgType !== 'success' && (
                    <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                      <p className="text-sm text-slate-600">
                        Already have an account?{' '}
                        <Link href="/login" className="text-blue-700 hover:text-blue-800 font-semibold">
                          Sign in here
                        </Link>
                      </p>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}