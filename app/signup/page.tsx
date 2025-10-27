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
        router.push("/") // back to Home
      }
    } catch (err:any) {
      setMsg(err?.message ?? "Failed to sign up")
    } finally { setLoading(false) }
  }

  return (
    <main className="relative min-h-dvh">
      {/* Background Image Section - Same as other pages */}
      <div className="relative w-full h-dvh overflow-hidden bg-gradient-to-br from-[#0b1b3b] via-[#1e3a8a] to-[#2563eb]">
        {/* Background Image with Responsive Sizing */}
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
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1b3b]/90 via-[#0b1b3b]/70 to-[#0b1b3b]/90 md:from-[#0b1b3b]/80 md:via-[#0b1b3b]/50 md:to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1b3b] via-transparent to-transparent"></div>
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
        <div className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10">
          <section className="w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden bg-white/95 backdrop-blur-sm border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left: Create account */}
              <div className="p-8 md:p-10">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 mb-4">
                    <div className="h-2 w-2 rounded-full bg-sky-600 animate-pulse"></div>
                    <span className="text-sm font-semibold uppercase tracking-widest text-sky-700">
                      Join NORSU HRM
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Create Account</h2>
                  <p className="mt-2 text-sm text-slate-600">Sign up with your email to access HR services</p>
                </div>
                
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                    <input 
                      className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
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
                      className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
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
                      className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                      type="tel" 
                      placeholder="Enter your phone number" 
                      value={phone} 
                      onChange={e=>setPhone(e.target.value)} 
                    />
                  </div>
                  
                  <button 
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold hover:from-sky-600 hover:to-sky-700 transition-all disabled:opacity-60 shadow-lg hover:shadow-xl"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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
                  <div className={`mt-4 p-3 rounded-lg text-sm ${
                    msg.includes("Failed") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
                  }`}>
                    {msg}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <p className="text-center text-sm text-slate-600">
                    By creating an account, you agree to our{" "}
                    <a href="#" className="text-sky-600 hover:text-sky-700 font-medium">Terms of Service</a>{" "}
                    and{" "}
                    <a href="#" className="text-sky-600 hover:text-sky-700 font-medium">Privacy Policy</a>
                  </p>
                </div>
              </div>

              {/* Right: CTA */}
              <div className="bg-gradient-to-br from-sky-600 to-sky-700 text-white p-8 md:p-10 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%223%22%20cy%3D%223%22%20r%3D%221%22/%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%221%22/%3E%3C/g%3E%3C/svg%3E')]"></div>
                
                <div className="relative z-10 text-center">
                  <div className="bg-white/20 p-3 rounded-2xl inline-flex mb-6">
                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">Welcome Back!</h2>
                  <p className="text-lg text-white/90 mb-8 max-w-xs">
                    Already have an account? Sign in to access your HR portal and manage your profile.
                  </p>
                  <Link 
                    href="/login" 
                    className="inline-flex items-center justify-center rounded-full border-2 border-white bg-transparent px-8 py-3 font-semibold hover:bg-white hover:text-sky-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    SIGN IN NOW
                  </Link>
                </div>

                {/* University Info */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center justify-center gap-2 text-white/80">
                    <div className="bg-white/20 p-1 rounded-lg">
                      <Image src="/images/norsu.png" alt="NORSU" width={20} height={20} />
                    </div>
                    <span className="text-sm font-semibold">NORSU • HRM</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Wave Separator at Bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg 
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none" 
            className="w-full h-12 md:h-16 text-white"
          >
            <path 
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
              opacity=".25" 
              fill="currentColor"
            ></path>
            <path 
              d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" 
              opacity=".5" 
              fill="currentColor"
            ></path>
            <path 
              d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" 
              fill="currentColor"
            ></path>
          </svg>
        </div>
      </div>
    </main>
  )
}