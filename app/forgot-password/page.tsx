'use client'
import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // Validate email
      if (!email.trim()) {
        throw new Error('Please enter your email address')
      }
      
      if (!/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Please enter a valid email address')
      }

      console.log('🔧 Attempting to send reset email to:', email)
      
      // Get the current origin
      const origin = window.location.origin
      console.log('📍 Origin:', origin)
      console.log('🔗 Redirect URL:', `${origin}/reset-password`)
      
      // Use Supabase's resetPasswordForEmail function
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      })

      if (error) {
        console.error('❌ Password reset error:', error)
        
        // User-friendly error messages
        let errorMessage = error.message || 'Failed to send reset email.'
        
        if (errorMessage.includes('rate limit')) {
          errorMessage = 'Too many attempts. Please wait a few minutes before trying again.'
        } else if (errorMessage.includes('user not found')) {
          errorMessage = 'No account found with this email address.'
        } else if (errorMessage.includes('email')) {
          errorMessage = 'Please enter a valid email address.'
        }
        
        throw new Error(errorMessage)
      }

      console.log('✅ Password reset email sent successfully')
      setEmailSent(true)
      setMessage({
        type: 'success',
        text: `Password reset email sent to ${email}! Check your inbox (and spam folder) for further instructions.`
      })

    } catch (err: any) {
      console.error('❌ Password reset error:', err)
      setMessage({
        type: 'error',
        text: err.message || 'Failed to send reset email. Please try again.'
      })
    } finally {
      setLoading(false)
    }
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

        {/* Forgot Password Form */}
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
                      Reset Password
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Forgot Password?</h2>
                  <p className="text-sm text-slate-600">
                    {emailSent 
                      ? "Check your email for reset instructions"
                      : "Enter your email address and we'll send you a link to reset your password."
                    }
                  </p>
                </div>

                {!emailSent ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                      </label>
                      <input
                        className="w-full h-11 rounded-lg border border-slate-200 px-4 outline-none bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-700 to-blue-800 font-semibold text-white transition-all hover:from-blue-800 hover:to-blue-900 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg hover:shadow-xl text-sm"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        'SEND RESET LINK'
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-green-800">Email Sent Successfully!</h3>
                          <p className="text-sm text-green-700 mt-1">
                            We've sent password reset instructions to <strong>{email}</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">What to do next:</h4>
                      <ol className="text-sm text-blue-700 space-y-2 ml-4 list-decimal">
                        <li>Check your email inbox (and spam folder)</li>
                        <li>Click the reset password link in the email</li>
                        <li>Follow the instructions to create a new password</li>
                        <li>Return to login page to sign in with your new password</li>
                      </ol>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Link
                        href="/login"
                        className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-700 to-blue-800 font-semibold text-white transition-all hover:from-blue-800 hover:to-blue-900 shadow-lg hover:shadow-xl text-sm flex items-center justify-center"
                      >
                        RETURN TO LOGIN
                      </Link>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setEmailSent(false)
                          setEmail('')
                          setMessage(null)
                        }}
                        className="w-full h-11 rounded-lg border border-slate-300 font-semibold text-slate-700 transition-all hover:bg-slate-50 text-sm"
                      >
                        RESET ANOTHER EMAIL
                      </button>
                    </div>
                  </div>
                )}

                {message && !emailSent && (
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
                    Remember your password?{' '}
                    <Link href="/login" className="text-blue-700 hover:text-blue-800 font-medium">
                      Sign in here
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