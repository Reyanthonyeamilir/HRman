"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
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
  const [jobs, setJobs] = React.useState<JobPosting[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

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

  return (
    <>
      {/* ENHANCED BACKGROUND IMAGE SECTION */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#0b1b3b] via-[#1e3a8a] to-[#2563eb]">
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
        
        {/* Content */}
        <div className="relative z-10 mx-auto max-w-6xl px-4">
          <div className="flex min-h-[50vh] items-center py-16 md:min-h-[60vh] md:py-24">
            <div className="w-full max-w-2xl">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 border border-white/20">
                <div className="h-2 w-2 rounded-full bg-[#2563eb] animate-pulse"></div>
                <span className="text-sm font-semibold uppercase tracking-widest text-white">
                  Career Opportunities
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="mb-4 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                Join The
                <span className="block bg-gradient-to-r from-white to-[#c7d7ff] bg-clip-text text-transparent">
                  NORSU Family
                </span>
              </h1>

              {/* Description */}
              <p className="mb-8 text-lg leading-relaxed text-[#c7d7ff] md:text-xl md:max-w-xl">
                Build your career with Negros Oriental State University. Discover rewarding opportunities that shape futures and transform communities through education and innovation.
              </p>

            </div>
          </div>
        </div>

        {/* Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg 
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none" 
            className="w-full h-12 md:h-20 text-[#0b1b3b]"
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

      {/* MAIN CONTENT */}
      <section className="relative bg-[#0b1b3b] py-16 md:py-20">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb] to-[#1e3a8a]"></div>
        </div>
        
        <div className="relative z-10">
          <div className="mx-auto w-full max-w-6xl px-4">
            {/* Section Header */}
            <div className="mb-12 text-center md:mb-16">
              <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
                Current Open Positions
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-[#c7d7ff]">
                Explore our latest career opportunities and find the perfect role to match your skills and aspirations.
              </p>
            </div>

            {/* Content Section */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-[#2563eb]/30 border-t-[#2563eb]"></div>
                  <p className="font-medium text-[#c7d7ff]">Loading opportunities...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="mx-auto max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-8 backdrop-blur-md">
                  <p className="mb-4 text-red-200">{error}</p>
                  <Button 
                    onClick={fetchJobs} 
                    className="rounded-full bg-[#2563eb] px-6 text-white shadow-lg transition-all duration-200 hover:bg-[#1d4ed8]"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-12 shadow-2xl backdrop-blur-md">
                  <div className="mb-4 inline-flex rounded-2xl bg-white/10 p-4">
                    <Building2 className="h-12 w-12 text-[#c7d7ff]" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-white">No Current Vacancies</h3>
                  <p className="mb-6 text-[#c7d7ff]">We're always looking for talented individuals. Please check back later for new opportunities.</p>
                  <Button 
                    onClick={fetchJobs}
                    className="rounded-full border border-white/20 bg-white/10 px-6 text-white transition-all duration-200 hover:bg-white/20"
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => (
                  <article
                    key={job.id}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
                  >
                    {/* Image Section */}
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#0b1b3b] via-[#1e3a8a] to-[#2563eb]">
                      {job.image_path ? (
                        <div className="relative h-full w-full">
                          <Image
                            src={job.image_path}
                            alt={job.job_title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
                            className="image-fallback hidden absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0b1b3b] to-[#1e3a8a]"
                            style={{ display: 'none' }}
                          >
                            <div className="text-center">
                              <Building2 className="mx-auto mb-3 h-12 w-12 text-[#2563eb]" />
                              <p className="text-lg font-bold text-[#2563eb]">NORSU HRM</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <div className="text-center">
                            <Building2 className="mx-auto mb-3 h-12 w-12 text-[#2563eb]" />
                            <p className="text-lg font-bold text-[#2563eb]">NORSU HRM</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute left-4 top-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${getJobTypeColor(getJobType(job.department))}`}>
                          {getJobType(job.department)}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1b3b]/80 via-transparent to-transparent"></div>
                    </div>

                    {/* Details Section */}
                    <div className="p-6">
                      <h3 className="mb-4 line-clamp-2 text-xl font-bold text-white transition-colors duration-300 group-hover:text-[#c7d7ff]">
                        {job.job_title}
                      </h3>
                      
                      {/* Job Meta Information */}
                      <div className="mb-5 space-y-3">
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
                        <div className="flex items-center gap-3 font-semibold text-[#2563eb]">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm">Apply by: {getDeadlineDate(job.date_posted)}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-[#c7d7ff]">
                        {job.job_description || "Join our team and contribute to the academic excellence of NORSU. We're looking for passionate individuals ready to make a difference."}
                      </p>

                      {/* Action Button */}
                      <Button
                        asChild
                        className="w-full rounded-xl border-0 bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:from-[#1d4ed8] hover:to-[#2563eb]"
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
    </>
  )
}