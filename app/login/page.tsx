'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { signIn, getCurrentUser, supabase } from '@/lib/supabaseClient'

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
      // 1. Sign in - returns { user, error } NOT { data, error }
      const { user: signedInUser, error } = await signIn({ email, password })
      
      if (error) {
        throw new Error(error.message)
      }

      if (!signedInUser) {
        throw new Error('Failed to sign in')
      }

      // 2. Wait for session to be established
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 3. Get user with profile
      const user = await getCurrentUser()
      
      if (!user) {
        throw new Error('Failed to retrieve user information')
      }

      // 4. Ensure profile exists (fallback - should not happen if signup worked)
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

      // 5. Get the final user data after ensuring profile exists
      const finalUser = await getCurrentUser()
      const role = finalUser?.profile?.role || 'applicant'
      
      console.log('🔐 Login successful, user role:', role)
      
      // 6. Redirect based on role
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
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      <div className="absolute inset-0 -z-20 bg-[url('/auth-bg.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 -z-10 bg-[#0A1833]/85" />

      <Link
        href="/"
        aria-label="Exit to Home"
        className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-white backdrop-blur hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          className="opacity-90"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        <span className="text-sm font-semibold">Exit</span>
      </Link>

      <section className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-8 md:p-10">
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
              Sign in
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Use your email & password
            </p>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <input
                  className={`w-full h-11 rounded-xl border px-3 outline-none bg-slate-50 focus:ring-2 focus:ring-sky-400 ${
                    errors.email ? 'border-rose-400' : 'border-slate-200'
                  }`}
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-600">{errors.email}</p>
                )}
              </div>

              <div>
                <input
                  className={`w-full h-11 rounded-xl border px-3 outline-none bg-slate-50 focus:ring-2 focus:ring-sky-400 ${
                    errors.password ? 'border-rose-400' : 'border-slate-200'
                  }`}
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full h-11 rounded-full bg-sky-500 font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'SIGN IN'}
              </button>
            </form>

            {msg && (
              <p className="mt-3 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">
                {msg}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center justify-center bg-sky-500 p-8 text-center text-white md:p-10">
            <h2 className="text-3xl font-bold md:text-4xl">New here?</h2>
            <p className="mt-2 text-xs text-white/90">
              Create an account first
            </p>
            <Link
              href="/signup"
              className="mt-4 inline-block rounded-full border-2 border-white px-5 py-2 font-semibold transition hover:bg-white hover:text-sky-600"
            >
              SIGN UP
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}