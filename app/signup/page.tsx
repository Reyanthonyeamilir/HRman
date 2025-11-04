'use client'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { signUp } from "@/lib/supabaseClient"
import Image from "next/image"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [msg, setMsg] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    try {
      const res = await signUp({ email, password, phone: phone || undefined })
      if (res?.requiresEmailConfirmation) {
        setMsg("Account created. Check your email to confirm.")
      } else {
        // STORE USER DATA IN LOCALSTORAGE
        localStorage.setItem('applicant_name', email.split('@')[0])
        localStorage.setItem('applicant_email', email)
        router.push("/") // back to Home
      }
    } catch (err:any) {
      setMsg(err?.message ?? "Failed to sign up")
    } finally { setLoading(false) }
  }

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

        {/* Sign Up Form */}
        <div className="relative z-10 flex items-center justify-center px-4 py-8">
          <section className="w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden bg-white/95 backdrop-blur-sm border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left: Create account */}
              <div className="p-6 md:p-8">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 mb-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-700 animate-pulse"></div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-blue-800">
                      Join NORSU HRM
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Create Account</h2>
                  <p className="text-sm text-slate-600">Sign up with your email to access HR services</p>
                </div>
                
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                    <input 
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      type="email" 
                      placeholder="Enter your email" 
                      value={email} 
                      onChange={e=>setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                    <input 
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      type="password" 
                      placeholder="Create a password" 
                      value={password} 
                      onChange={e=>setPassword(e.target.value)} 
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number <span className="text-slate-400">(optional)</span></label>
                    <input 
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      type="tel" 
                      placeholder="Enter your phone number" 
                      value={phone} 
                      onChange={e=>setPhone(e.target.value)} 
                    />
                  </div>
                  
                  <button 
                    className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-700 to-blue-800 text-white font-semibold hover:from-blue-800 hover:to-blue-900 transition-all disabled:opacity-60 shadow-lg hover:shadow-xl text-sm"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Account...
                      </span>
                    ) : (
                      "CREATE ACCOUNT"
                    )}
                  </button>
                </form>
                
                {msg && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${
                    msg.includes("Failed") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
                  }`}>
                    {msg}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-slate-200">
                  <p className="text-center text-xs text-slate-600">
                    By creating an account, you agree to our{" "}
                    <a href="#" className="text-blue-700 hover:text-blue-800 font-medium">Terms of Service</a>{" "}
                    and{" "}
                    <a href="#" className="text-blue-700 hover:text-blue-800 font-medium">Privacy Policy</a>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mb-3">Welcome Back!</h2>
                  <p className="text-sm text-white/90 mb-6 max-w-xs leading-relaxed">
                    Already have an account? Sign in to access your HR portal and manage your profile.
                  </p>
                  <Link 
                    href="/login" 
                    className="inline-flex items-center justify-center rounded-full border-2 border-white bg-transparent px-6 py-2.5 font-semibold hover:bg-white hover:text-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl text-sm"
                  >
                    SIGN IN NOW
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