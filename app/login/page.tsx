'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { signIn, getCurrentUser, supabase } from '@/lib/supabaseClient'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const router = useRouter()
  const search = useSearchParams()

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
    
    try {
      const { user: signedInUser, error } = await signIn({ email, password })
      
      if (error) {
        throw new Error(error.message)
      }

      if (!signedInUser) {
        throw new Error('Failed to sign in')
      }

      await new Promise(resolve => setTimeout(resolve, 1000))

      const user = await getCurrentUser()
      
      if (!user) {
        throw new Error('Failed to retrieve user information')
      }

      // STORE USER DATA IN LOCALSTORAGE
      localStorage.setItem('applicant_name', user.email?.split('@')[0] || 'Applicant')
      localStorage.setItem('applicant_email', user.email || '')
      
      if (!user.profile) {
        console.log('🆕 Creating profile for existing user...')
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            { 
              id: user.id, 
              email: user.email!,
              role: 'applicant'
            },
            { onConflict: 'id' }
          )
        
        if (profileError) {
          console.error('Profile upsert error:', profileError)
        }
      }

      const finalUser = await getCurrentUser()
      const role = finalUser?.profile?.role || 'applicant'
      
      console.log('🔐 Login successful, user role:', role)
      
      redirectUser(role)
      
    } catch (err: any) {
      console.error('Login error:', err)
      setMsg(err?.message ?? 'Failed to sign in. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  function redirectUser(role: string) {
    const next = search.get('next')
    const byRole =
      role === 'super_admin'
        ? '/admin'
        : role === 'hr'
        ? '/hr/dashboard'
        : '/applicant'

    console.log('🔐 Redirecting to:', next || byRole)
    router.push(next || byRole)
  }

  const canSubmit = email.trim() && password.trim() && !loading

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a1630] via-[#0f2a5c] to-[#1a3f8a]">
      {/* Background Image Section */}
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
          {/* Subtle Pattern Overlay */}
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
                      onChange={(e) => setEmail(e.target.value)}
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
                    <input
                      className={`w-full h-11 rounded-lg border px-4 outline-none bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all ${
                        errors.password ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
                      }`}
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    {errors.password && (
                      <p className="mt-2 text-sm text-rose-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.password}
                      </p>
                    )}
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
                    msg.includes("Failed") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      <svg className={`w-3 h-3 ${msg.includes("Failed") ? "text-red-600" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {msg.includes("Failed") ? (
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
                  <p className="text-center text-xs text-slate-600">
                    Forgot your password?{' '}
                    <a href="#" className="text-blue-700 hover:text-blue-800 font-medium">Reset it here</a>
                  </p>
                </div>
              </div>

              {/* Right: CTA */}
              <div className="bg-gradient-to-br from-blue-800 to-blue-900 text-white p-6 md:p-8 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%223%22%20cy%3D%223%22%20r%3D%221%22/%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%221%22/%3E%3C/g%3E%3C/svg%3E')]"></div>
                
                <div className="relative z-10 text-center">
                  <div className="bg-white/20 p-3 rounded-xl inline-flex mb-4">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mb-3">New Here?</h2>
                  <p className="text-sm text-white/90 mb-6 max-w-xs leading-relaxed">
                    Don't have an account yet? Create one to access all HR services and job opportunities.
                  </p>
                  <Link 
                    href="/signup" 
                    className="inline-flex items-center justify-center rounded-full border-2 border-white bg-transparent px-6 py-2.5 font-semibold hover:bg-white hover:text-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl text-sm"
                  >
                    CREATE ACCOUNT
                  </Link>
                </div>

                {/* University Info */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center justify-center gap-2 text-white/80">
                    <div className="bg-white/20 p-1.5 rounded-lg">
                      <Image src="/images/norsu.png" alt="NORSU" width={16} height={16} />
                    </div>
                    <span className="text-xs font-semibold">NORSU • HRM</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}