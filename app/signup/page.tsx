'use client'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { signUp } from "@/lib/supabaseClient"

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
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      {/* background image */}
      <div className="absolute inset-0 -z-20 bg-[url('/auth-bg.jpg')] bg-cover bg-center" />
      {/* dark navy overlay */}
      <div className="absolute inset-0 -z-10 bg-[#0A1833]/85" />

      {/* Exit button */}
      <Link
        href="/"
        aria-label="Exit to Home"
        className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-white backdrop-blur hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        <span className="text-sm font-semibold">Exit</span>
      </Link>

      <section className="w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Create account */}
          <div className="p-8 md:p-10">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Create Account</h2>
            <p className="mt-2 text-xs text-slate-500">Sign up with your email</p>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <input className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:ring-2 focus:ring-sky-400"
                     type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
              <input className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:ring-2 focus:ring-sky-400"
                     type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
              <input className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:ring-2 focus:ring-sky-400"
                     type="tel" placeholder="Phone (optional)" value={phone} onChange={e=>setPhone(e.target.value)} />
              <button className="w-full h-11 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition disabled:opacity-60"
                      disabled={loading}>
                {loading ? "Creating…" : "SIGN UP"}
              </button>
            </form>
            {msg && <p className="mt-3 text-xs text-rose-600">{msg}</p>}
          </div>

          {/* Right: CTA */}
          <div className="bg-sky-500 text-white text-center p-8 md:p-10 flex flex-col items-center justify-center">
            <h2 className="text-3xl md:text-4xl font-bold">Already a member?</h2>
            <p className="mt-2 text-xs text-white/90">Go to login</p>
            <Link href="/login" className="mt-4 inline-block rounded-full border-2 border-white px-5 py-2 font-semibold hover:bg-white hover:text-sky-600 transition">
              SIGN IN
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
