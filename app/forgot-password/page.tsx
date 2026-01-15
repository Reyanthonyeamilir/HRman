'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: ''
  })

  // Check if user has a valid session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // If no session, redirect to forgot password flow
        router.push('/forgot-password')
      }
    }
    checkSession()
  }, [router])

  // Check password strength
  useEffect(() => {
    if (newPassword) {
      const hasMinLength = newPassword.length >= 8
      const hasUpperCase = /[A-Z]/.test(newPassword)
      const hasLowerCase = /[a-z]/.test(newPassword)
      const hasNumbers = /\d/.test(newPassword)
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)

      let score = 0
      let message = ''

      if (hasMinLength) score += 1
      if (hasUpperCase) score += 1
      if (hasLowerCase) score += 1
      if (hasNumbers) score += 1
      if (hasSpecialChar) score += 1

      switch (score) {
        case 5:
          message = 'Strong password'
          break
        case 4:
          message = 'Good password'
          break
        case 3:
          message = 'Fair password'
          break
        default:
          message = 'Weak password'
      }

      setPasswordStrength({ score, message })
    } else {
      setPasswordStrength({ score: 0, message: '' })
    }
  }, [newPassword])

  const validatePasswords = () => {
    if (!currentPassword.trim()) {
      throw new Error('Please enter your current password')
    }
    
    if (!newPassword.trim()) {
      throw new Error('Please enter a new password')
    }
    
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long')
    }
    
    if (newPassword === currentPassword) {
      throw new Error('New password must be different from current password')
    }
    
    if (newPassword !== confirmPassword) {
      throw new Error('New passwords do not match')
    }
    
    if (passwordStrength.score < 3) {
      throw new Error('Please choose a stronger password')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // Validate passwords
      validatePasswords()

      console.log('🔧 Attempting to update password...')

      // First, verify current password by signing in
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user?.email) {
        throw new Error('No user found. Please sign in again.')
      }

      // Sign in with current password to verify
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Current password is incorrect')
        }
        throw new Error('Failed to verify current password')
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        console.error('❌ Password update error:', updateError)
        
        let errorMessage = updateError.message || 'Failed to update password.'
        
        if (errorMessage.includes('rate limit')) {
          errorMessage = 'Too many attempts. Please wait a few minutes before trying again.'
        } else if (errorMessage.includes('password')) {
          errorMessage = 'Password does not meet requirements. Please choose a stronger password.'
        }
        
        throw new Error(errorMessage)
      }

      console.log('✅ Password updated successfully')
      
      // Sign out and redirect to login
      await supabase.auth.signOut()
      
      setMessage({
        type: 'success',
        text: 'Password updated successfully! Redirecting to login...'
      })

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login')
      }, 2000)

    } catch (err: any) {
      console.error('❌ Password update error:', err)
      setMessage({
        type: 'error',
        text: err.message || 'Failed to update password. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const getStrengthColor = (score: number) => {
    if (score >= 4) return 'bg-green-500'
    if (score >= 3) return 'bg-yellow-500'
    if (score >= 2) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getStrengthTextColor = (score: number) => {
    if (score >= 4) return 'text-green-700'
    if (score >= 3) return 'text-yellow-700'
    if (score >= 2) return 'text-orange-700'
    return 'text-red-700'
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
          aria-label="Exit to Home"
          className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-white backdrop-blur-md hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/60 transition-all border border-white/20"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          <span className="text-sm font-semibold">Exit</span>
        </Link>

        {/* Reset Password Form */}
        <div className="relative z-10 flex items-center justify-center px-4 py-8 min-h-screen">
          <div className="w-full max-w-md">
            <section className="rounded-2xl shadow-2xl overflow-hidden bg-white/95 backdrop-blur-sm border border-white/20">
              <div className="p-6 md:p-8">
                {/* Back to Login */}
                <div className="mb-6">
                  <Link 
                    href="/login" 
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Login
                  </Link>
                </div>

                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 mb-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-700 animate-pulse"></div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-blue-800">
                      Update Password
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Reset Your Password</h2>
                  <p className="text-sm text-slate-600">
                    Create a new secure password for your account
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        className="w-full h-11 rounded-lg border border-slate-200 px-4 pr-10 outline-none bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        type={showPassword.current ? "text" : "password"}
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword.current ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        className="w-full h-11 rounded-lg border border-slate-200 px-4 pr-10 outline-none bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        type={showPassword.new ? "text" : "password"}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword.new ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${getStrengthTextColor(passwordStrength.score)}`}>
                            Password strength: {passwordStrength.message}
                          </span>
                          <span className="text-xs text-slate-500">
                            {passwordStrength.score}/5
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getStrengthColor(passwordStrength.score)} transition-all duration-300`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          ></div>
                        </div>
                        <ul className="mt-2 text-xs text-slate-600 space-y-1">
                          <li className="flex items-center gap-1">
                            <svg className={`w-3 h-3 ${newPassword.length >= 8 ? 'text-green-500' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            At least 8 characters
                          </li>
                          <li className="flex items-center gap-1">
                            <svg className={`w-3 h-3 ${/[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Uppercase letter
                          </li>
                          <li className="flex items-center gap-1">
                            <svg className={`w-3 h-3 ${/[a-z]/.test(newPassword) ? 'text-green-500' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Lowercase letter
                          </li>
                          <li className="flex items-center gap-1">
                            <svg className={`w-3 h-3 ${/\d/.test(newPassword) ? 'text-green-500' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Number
                          </li>
                          <li className="flex items-center gap-1">
                            <svg className={`w-3 h-3 ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-500' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Special character
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        className="w-full h-11 rounded-lg border border-slate-200 px-4 pr-10 outline-none bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        type={showPassword.confirm ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword.confirm ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="mt-1 text-xs text-red-600">
                        Passwords do not match
                      </p>
                    )}
                    {confirmPassword && newPassword === confirmPassword && newPassword && (
                      <p className="mt-1 text-xs text-green-600">
                        Passwords match
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
                    className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-700 to-blue-800 font-semibold text-white transition-all hover:from-blue-800 hover:to-blue-900 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg hover:shadow-xl text-sm"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating Password...
                      </span>
                    ) : (
                      'UPDATE PASSWORD'
                    )}
                  </button>
                </form>

                {message && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${
                    message.type === 'error' 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <svg className={`w-4 h-4 ${
                        message.type === 'error' ? 'text-red-600' : 'text-green-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {message.type === 'error' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                      {message.text}
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-slate-200">
                  <p className="text-center text-xs text-slate-600">
                    Need to reset via email?{' '}
                    <Link href="/forgot-password" className="text-blue-700 hover:text-blue-800 font-medium">
                      Forgot password
                    </Link>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}