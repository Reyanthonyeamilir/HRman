'use client'

import { Suspense } from 'react'

// Wrapper component with Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0a1630] via-[#0f2a5c] to-[#1a3f8a] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading login page...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

// Your original login component (put everything below this line)
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { signIn, getCurrentUser, supabase } from '@/lib/supabaseClient'
import Image from 'next/image'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [hasRedirected, setHasRedirected] = useState(false)
  const router = useRouter()
  const search = useSearchParams()

  // Check for existing session
  useEffect(() => {
    checkExistingSession()
  }, [])

  const checkExistingSession = async () => {
    if (hasRedirected) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('🔄 Existing session found, checking user...')
        const user = await getCurrentUser()
        if (user) {
          const role = user.profile?.role || 'applicant'
          setHasRedirected(true)
          redirectUser(role)
        }
      }
    } catch (error) {
      console.log('No existing session')
    } finally {
      setIsCheckingSession(false)
    }
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email is invalid'
    
    if (!password.trim()) e.password = 'Password is required'
    else if (password.length < 6) e.password = 'Password must be at least 6 characters'
    
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!validate()) return
    
    setLoading(true)
    setHasRedirected(false)
    
    try {
      console.log('🔐 Attempting login for:', email)
      
      const { user: signedInUser, error } = await signIn({ email, password })
      
      if (error) {
        throw new Error(error)
      }

      if (!signedInUser) {
        throw new Error('Failed to sign in - no user returned')
      }

      console.log('✅ Auth successful, getting user profile...')
      
      // Get user with profile
      const user = await getCurrentUser()
      
      if (!user) {
        throw new Error('Failed to retrieve user information')
      }

      console.log('👤 User retrieved:', user.email)
      console.log('🎭 User profile:', user.profile)
      console.log('🔑 User role:', user.profile?.role)

      // Get the final role
      let finalRole = user.profile?.role || 'applicant'

      // Validate the role matches your SQL schema
      const validRoles = ['applicant', 'hr', 'super_admin']
      if (!validRoles.includes(finalRole)) {
        console.warn('⚠️ Invalid role detected, defaulting to applicant:', finalRole)
        finalRole = 'applicant'
      }

      console.log('🔐 Login successful, final user role:', finalRole)
      
      // STORE USER DATA IN LOCALSTORAGE
      if (typeof window !== 'undefined' && user) {
        try {
          localStorage.setItem('applicant_name', user.email?.split('@')[0] || 'Applicant')
          localStorage.setItem('applicant_email', user.email || '')
          localStorage.setItem('user_role', finalRole)
          localStorage.setItem('user_id', user.id)
          
          console.log('💾 Stored in localStorage:')
          console.log('  - Role:', finalRole)
          console.log('  - User ID:', user.id)
          console.log('  - Email:', user.email)
        } catch (storageError) {
          console.error('❌ LocalStorage error:', storageError)
        }
      }
      
      console.log('📍 Redirecting to appropriate dashboard...')
      
      setHasRedirected(true)
      redirectUser(finalRole)
      
    } catch (err: any) {
      console.error('❌ Login error:', err)
      let errorMessage = err.message || 'Failed to sign in. Please check your credentials.'
      
      setMsg(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  function redirectUser(role: string) {
    const next = search.get('next')
    
    console.log('🎯 Current user role for redirect:', role)
    
    const roleRedirects: { [key: string]: string } = {
      'super_admin': '/administrator/dashboard',
      'hr': '/administrator/dashboard',
      'applicant': '/applicant'
    }

    let redirectPath = roleRedirects[role] || '/applicant'

    console.log('🔄 Redirecting to:', redirectPath, 'for role:', role)
    console.log('📝 Next parameter:', next)
    
    const finalPath = next || redirectPath
    console.log('🚀 Final destination:', finalPath)

    router.replace(finalPath)
  }

  const debugUserRole = async () => {
    try {
      console.log('🔍 === DEBUG USER ROLE ===')
      
      // Check localStorage first
      if (typeof window !== 'undefined') {
        console.log('📦 LocalStorage Data:')
        console.log('   user_role:', localStorage.getItem('user_role'))
        console.log('   user_id:', localStorage.getItem('user_id'))
        console.log('   applicant_email:', localStorage.getItem('applicant_email'))
        console.log('   applicant_name:', localStorage.getItem('applicant_name'))
      }

      // Check session
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔐 Session Info:')
      console.log('   Session exists:', !!session)
      console.log('   User ID:', session?.user?.id)
      console.log('   User Email:', session?.user?.email)
      console.log('   Expires at:', session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A')

      // Get current user from database
      const user = await getCurrentUser()
      console.log('👤 Database User Info:')
      console.log('   User object:', user)
      console.log('   Profile:', user?.profile)
      console.log('   Role from profile:', user?.profile?.role)
      console.log('   Email from profile:', user?.profile?.email)

      // Also check profiles table directly
      if (session?.user?.id) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        console.log('🗄️ Direct Profiles Table Query:')
        console.log('   Profile data:', profileData)
        console.log('   Error:', error)
      }

      console.log('🎯 Available Redirect Paths:')
      console.log('   super_admin → /administrator/dashboard')
      console.log('   hr → /administrator/dashboard')
      console.log('   applicant → /applicant')

      console.log('🔍 === END DEBUG ===')
      
      // Show alert with key info
      const userRole = localStorage.getItem('user_role') || user?.profile?.role || 'unknown'
      alert(`Debug Info:\n\nLocalStorage Role: ${localStorage.getItem('user_role')}\nDatabase Role: ${user?.profile?.role}\nSession: ${session ? 'Active' : 'No session'}\n\nUser ID: ${session?.user?.id}\nFinal Role: ${userRole}`)
      
    } catch (error) {
      console.error('🔍 DEBUG - Error:', error)
      alert(`Debug Error: ${error}`)
    }
  }

  const canSubmit = email.trim() && password.trim() && !loading

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#0a1630] via-[#0f2a5c] to-[#1a3f8a] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Checking authentication...</p>
        </div>
      </main>
    )
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
            style={{
              objectPosition: 'center 30%'
            }}
          />
          {/* Enhanced Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1630]/95 via-[#0a1630]/80 to-[#0a1630]/95 md:from-[#0a1630]/90 md:via-[#0a1630]/60 md:to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1630] via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%223%22%20cy%3D%223%22%20r%3D%221%22/%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%221%22/%3E%3C/g%3E%3C/svg%3E')]"></div>
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

        {/* Login Form */}
        <div className="relative z-10 flex items-center justify-center px-4 py-8">
          <section className="w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden bg-white/95 backdrop-blur-sm border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left: Sign in */}
              <div className="p-6 md:p-8">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 mb-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-700 animate-pulse"></div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-blue-800">
                      Welcome Back
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Sign In</h2>
                  <p className="text-sm text-slate-600">Use your email and password to access your account</p>
                </div>
                
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                    <input
                      className={`w-full h-11 rounded-lg border px-4 outline-none bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                        errors.email ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                      }`}
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (errors.email) setErrors({...errors, email: undefined})
                      }}
                      autoComplete="email"
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-rose-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                    <div className="relative">
                      <input
                        className={`w-full h-11 rounded-lg border px-4 pr-10 outline-none bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                          errors.password ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                        }`}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          if (errors.password) setErrors({...errors, password: undefined})
                        }}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
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
                    {errors.password && (
                      <p className="mt-2 text-sm text-rose-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.password}
                      </p>
                    )}
                    
                    {/* Forgot Password Link - ADDED HERE */}
                    <div className="flex justify-end mt-2">
                      <Link 
                        href="/forgot-password" 
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-700 to-blue-800 font-semibold text-white transition-all hover:from-blue-800 hover:to-blue-900 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg hover:shadow-xl text-sm"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing In...
                      </span>
                    ) : (
                      'SIGN IN'
                    )}
                  </button>
                </form>

                {msg && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${
                    msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("failed") || msg.toLowerCase().includes("error")
                      ? "bg-red-50 text-red-700 border border-red-200" 
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      <svg className={`w-3 h-3 ${
                        msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("failed") || msg.toLowerCase().includes("error")
                          ? "text-red-600" 
                          : "text-green-600"
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("failed") || msg.toLowerCase().includes("error") ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                      {msg}
                    </div>
                  </div>
                )}

        
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <p className="text-center text-xs text-slate-600 mt-2">
                    Don't have an account?{' '}
                    <Link href="/signup" className="text-blue-700 hover:text-blue-800 font-medium">Sign up here</Link>
                  </p>
                </div>
              </div>

              {/* Right: CTA */}
              <div className="bg-gradient-to-br from-blue-800 to-blue-900 text-white p-6 md:p-8 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%223%22%20cy%3D%223%22%20r%3D%221%22/%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%221%22/%3E%3C/g%3E%3C/svg%3E')]"></div>
                
                <div className="relative z-10 text-center">
                  <div className="bg-white/20 p-3 rounded-xl inline-flex mb-4">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mb-3">NORSU HR Portal</h2>
                  <p className="text-sm text-white/90 mb-6 max-w-xs leading-relaxed">
                    Access the Human Resource Management System for job applications, employee services, and administrative functions.
                  </p>
                  
                  <div className="space-y-3 text-left text-sm">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Job Application Tracking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>HR Management Tools</span>
                    </div>
                  </div>
                </div>

                {/* University Info */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center justify-center gap-2 text-white/80">
                    <div className="bg-white/20 p-1.5 rounded-lg">
                      <Image src="/images/norsu.png" alt="NORSU" width={16} height={16} />
                    </div>
                    <span className="text-xs font-semibold">Negros Oriental State University</span>
                  </div>
                  <p className="text-center text-xs text-white/60 mt-1">Human Resource Management</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}