"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabaseClient'
import { Building2, MapPin, Calendar, Clock } from "lucide-react"

interface JobPosting {
  id: string
  job_title: string
  department: string | null
  location: string | null
  job_description: string | null
  image_path: string | null
  date_posted: string
  status: 'active' | 'closed'
  profiles: { email: string }[] | null
}

export default function VacanciesPage() {
  const [open, setOpen] = React.useState(false)
  const [jobs, setJobs] = React.useState<JobPosting[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const pathname = usePathname()

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("job_postings")
        .select(`
          id, job_title, department, location, job_description, image_path, date_posted, status, profiles(email)
        `)
        .eq("status", "active")
        .order("date_posted", { ascending: false })
      
      if (error) throw error
      
      const transformedData = data?.map(job => ({
        ...job,
        profiles: job.profiles?.[0] ? [job.profiles[0]] : null
      })) || []
      
      setJobs(transformedData)
    } catch (err) {
      console.error(err)
      setError("Failed to load job vacancies. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchJobs()
  }, [])

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

  const getDeadlineDate = (datePosted: string) => {
    const posted = new Date(datePosted)
    const deadline = new Date(posted.setDate(posted.getDate() + 30))
    return formatDate(deadline.toISOString())
  }

  const getJobType = (dept: string | null) => {
    if (!dept) return "General"
    const d = dept.toLowerCase()
    if (d.includes("college") || d.includes("professor")) return "Faculty"
    if (d.includes("hr") || d.includes("admin")) return "Admin"
    if (d.includes("it") || d.includes("support")) return "Staff"
    return "General"
  }

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case "Faculty": return "bg-purple-500/20 text-purple-200 border border-purple-500/30"
      case "Admin": return "bg-blue-500/20 text-blue-200 border border-blue-500/30"
      case "Staff": return "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
      default: return "bg-gray-500/20 text-gray-200 border border-gray-500/30"
    }
  }

  const linkBase = "block rounded-full px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:inline-block"
  const isActive = (href: string) => pathname === href ? "bg-slate-100 text-slate-900" : ""

  return (
    <>
      {/* HEADER - Using the same navigation as About page */}
      <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_rgba(2,8,23,0.06)]">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
          <Link className="inline-flex items-center gap-2 font-extrabold" href="/" aria-label="NORSU Home">
            <Image src="/images/norsu.png" alt="NORSU Seal" width={34} height={34} />
            <span>NORSU • HRM</span>
          </Link>

          <button
            className="ml-auto inline-grid place-items-center rounded-[10px] p-1.5 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,103,255,0.25)]"
            aria-label="Toggle navigation"
            aria-controls="siteNav"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <nav
            id="siteNav"
            aria-label="Primary Navigation"
            className={`${open ? "translate-y-0 shadow-[0_10px_20px_rgba(2,8,23,0.08)]" : "-translate-y-[120%]"}
              fixed left-0 right-0 top-[60px] border-t border-slate-200 bg-white transition
              md:static md:translate-y-0 md:border-0 md:shadow-none`}
          >
            <ul className="mx-auto flex w-full max-w-6xl flex-col gap-0 px-4 py-2 md:flex-row md:items-center md:gap-4 md:py-0">
              <li className="w-full md:w-auto">
                <Link href="/" className={`${linkBase} ${isActive("/")}`}>Home</Link>
              </li>
              <li className="w-full md:w-auto">
                <Link href="/about" className={`${linkBase} ${isActive("/about")}`}>About</Link>
              </li>
              <li className="w-full md:w-auto">
                <Link href="/vacancies" className={`${linkBase} ${isActive("/vacancies")}`}>Vacancies</Link>
              </li>
              <li className="ml-auto w-full md:w-auto">
                <Link href="/login" className={`${linkBase} ${isActive("/login")}`}>Login</Link>
              </li>
              <li className="w-full md:w-auto">
                <Link
                  href="/signup"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#2f67ff] px-4 font-bold text-white transition hover:-translate-y-[1px] hover:bg-[#2553cc]"
                >
                  Signup
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* BACKGROUND IMAGE SECTION - Between header and main content */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/norsu-campus.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1b3b]/80 via-[#0b1b3b]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1b3b] via-transparent to-transparent"></div>
        
        {/* Overlay Content */}
        <div className="relative z-10 h-full flex items-center justify-start">
          <div className="max-w-6xl mx-auto px-4 w-full">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-6 py-2 border border-white/20 mb-4">
                <div className="w-2 h-2 bg-[#2563eb] rounded-full animate-pulse"></div>
                <p className="text-sm font-semibold uppercase tracking-widest text-[#c7d7ff]">Career Opportunities</p>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-white to-[#c7d7ff] bg-clip-text text-transparent">
                Join NORSU Family
              </h1>
              <p className="text-lg text-[#c7d7ff] max-w-xl leading-relaxed">
                Build your career with Negros Oriental State University. Discover opportunities that shape futures and transform communities.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <section className="relative bg-[#0b1b3b] py-16">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb] to-[#1e3a8a]"></div>
        </div>
        
        <div className="relative z-10">
          <div className="mx-auto w-full max-w-6xl px-4">
            {/* Content Section */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="text-center">
                  <div className="h-16 w-16 border-4 border-[#2563eb]/30 border-t-[#2563eb] rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[#c7d7ff] font-medium">Loading opportunities...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="bg-red-500/10 backdrop-blur-md rounded-2xl border border-red-500/20 p-8 max-w-md mx-auto">
                  <p className="text-red-200 mb-4">{error}</p>
                  <Button 
                    onClick={fetchJobs} 
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] rounded-full text-white px-6 shadow-lg transition-all duration-200"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-12 max-w-md mx-auto shadow-2xl">
                  <div className="bg-white/10 p-4 rounded-2xl inline-flex mb-4">
                    <Building2 className="h-12 w-12 text-[#c7d7ff]" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">No Current Vacancies</h3>
                  <p className="text-[#c7d7ff] mb-6">We're always looking for talented individuals. Please check back later for new opportunities.</p>
                  <Button 
                    onClick={fetchJobs}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full px-6 transition-all duration-200"
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job) => (
                  <article
                    key={job.id}
                    className="group bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:-translate-y-2"
                  >
                    {/* Image Section */}
                    <div className="relative w-full h-48 bg-gradient-to-br from-[#0b1b3b] via-[#1e3a8a] to-[#2563eb] overflow-hidden">
                      {job.image_path ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={job.image_path}
                            alt={job.job_title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const container = e.currentTarget.parentElement
                              if (container) {
                                const fallback = container.querySelector('.image-fallback') as HTMLElement
                                if (fallback) {
                                  fallback.style.display = 'flex'
                                }
                              }
                            }}
                          />
                          <div 
                            className="image-fallback hidden absolute inset-0 w-full h-full items-center justify-center bg-gradient-to-br from-[#0b1b3b] to-[#1e3a8a]"
                            style={{ display: 'none' }}
                          >
                            <div className="text-center">
                              <Building2 className="h-12 w-12 text-[#2563eb] mx-auto mb-3" />
                              <p className="text-[#2563eb] font-bold text-lg">NORSU HRM</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <div className="text-center">
                            <Building2 className="h-12 w-12 text-[#2563eb] mx-auto mb-3" />
                            <p className="text-[#2563eb] font-bold text-lg">NORSU HRM</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${getJobTypeColor(getJobType(job.department))}`}>
                          {getJobType(job.department)}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1b3b]/80 via-transparent to-transparent"></div>
                    </div>

                    {/* Details Section */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white line-clamp-2 mb-4 group-hover:text-[#c7d7ff] transition-colors duration-300">
                        {job.job_title}
                      </h3>
                      
                      {/* Job Meta Information */}
                      <div className="space-y-3 mb-5">
                        {job.department && (
                          <div className="flex items-center gap-3 text-[#c7d7ff]">
                            <Building2 className="h-4 w-4 flex-shrink-0 text-[#2563eb]" />
                            <span className="text-sm">{job.department}</span>
                          </div>
                        )}
                        {job.location && (
                          <div className="flex items-center gap-3 text-[#c7d7ff]">
                            <MapPin className="h-4 w-4 flex-shrink-0 text-[#2563eb]" />
                            <span className="text-sm">{job.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-[#94a3b8]">
                          <Calendar className="h-4 w-4 flex-shrink-0 text-[#2563eb]" />
                          <span className="text-sm">Posted: {formatDate(job.date_posted)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[#2563eb] font-semibold">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm">Apply by: {getDeadlineDate(job.date_posted)}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[#c7d7ff] text-sm leading-relaxed line-clamp-3 mb-6">
                        {job.job_description || "Join our team and contribute to the academic excellence of NORSU. We're looking for passionate individuals ready to make a difference."}
                      </p>

                      {/* Action Button */}
                      <Button
                        asChild
                        className="w-full bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#2563eb] rounded-xl py-3 font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 text-white border-0"
                      >
                        <Link href={`/vacancies/${job.id}`}>
                          View Details & Apply
                        </Link>
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative bg-[#0b1b3b] border-t border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0b1b3b]/80"></div>
        <div className="relative z-10 mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-4 py-12">
          <div>
            <div className="flex items-center gap-3 font-extrabold text-white mb-4">
              <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                <Image src="/images/norsu.png" alt="NORSU" width={32} height={32} />
              </div>
              NORSU • HRM
            </div>
            <p className="text-sm text-[#c7d7ff] leading-relaxed">
              Capitol Area, Kagawasan Ave, Dumaguete City, Negros Oriental, Philippines
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 text-lg">Quick Links</h4>
            <ul className="space-y-3 text-[#c7d7ff]">
              <li><Link href="/vacancies" className="hover:text-white transition-colors duration-200 flex items-center gap-2"><div className="w-1 h-1 bg-[#2563eb] rounded-full"></div>Vacancies</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors duration-200 flex items-center gap-2"><div className="w-1 h-1 bg-[#2563eb] rounded-full"></div>About HR</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors duration-200 flex items-center gap-2"><div className="w-1 h-1 bg-[#2563eb] rounded-full"></div>Login</Link></li>
              <li><Link href="/signup" className="hover:text-white transition-colors duration-200 flex items-center gap-2"><div className="w-1 h-1 bg-[#2563eb] rounded-full"></div>Signup</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 text-lg">Contact</h4>
            <div className="space-y-3 text-[#c7d7ff]">
              <p className="text-sm">Email: hr@norsu.edu.ph</p>
              <p className="text-sm">Phone: (035) 123-4567</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 text-lg">Follow Us</h4>
            <div className="flex gap-4 text-[#c7d7ff]">
              <a href="#" className="hover:text-white transition-colors duration-200 bg-white/10 p-2 rounded-lg backdrop-blur-sm">Facebook</a>
              <a href="#" className="hover:text-white transition-colors duration-200 bg-white/10 p-2 rounded-lg backdrop-blur-sm">Twitter/X</a>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-center border-t border-white/10 py-6 text-sm text-[#94a3b8]">
          © {new Date().getFullYear()} NORSU • Human Resource Management. All rights reserved.
        </div>
      </footer>
    </>
  )
}