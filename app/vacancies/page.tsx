"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from '@/lib/supabaseClient'
import { Building2, MapPin, Calendar, Clock, Search } from "lucide-react"

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
  const [searchTerm, setSearchTerm] = React.useState("")

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

  // Filter jobs based on search term
  const filteredJobs = jobs.filter(job =>
    job.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.job_description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      <section className="relative bg-[#0b1b3b] py-12 md:py-16">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb] to-[#1e3a8a]"></div>
        </div>
        
        <div className="relative z-10">
          <div className="mx-auto w-full max-w-6xl px-4">
            {/* Section Header */}
            <div className="mb-8 text-center">
              <h2 className="mb-3 text-2xl font-bold text-white md:text-3xl">
                Current Open Positions
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-[#c7d7ff]">
                Explore our latest career opportunities and find the perfect role to match your skills and aspirations.
              </p>
            </div>

            {/* Search Bar */}
            <div className="mx-auto mb-8 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <Input
                  type="text"
                  placeholder="Search jobs by title, department, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border-white/20 bg-white/5 pl-10 pr-4 text-white placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-[#2563eb]"
                />
              </div>
            </div>

            {/* Results Count */}
            {!loading && !error && (
              <div className="mb-6 text-center">
                <p className="text-sm text-[#94a3b8]">
                  Showing {filteredJobs.length} of {jobs.length} positions
                  {searchTerm && ` for "${searchTerm}"`}
                </p>
              </div>
            )}

            {/* Content Section */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#2563eb]/30 border-t-[#2563eb]"></div>
                  <p className="text-sm text-[#c7d7ff]">Loading opportunities...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="mx-auto max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-6 backdrop-blur-md">
                  <p className="mb-3 text-sm text-red-200">{error}</p>
                  <Button 
                    onClick={fetchJobs} 
                    className="rounded-full bg-[#2563eb] px-4 py-2 text-sm text-white hover:bg-[#1d4ed8]"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
                  <div className="mb-3 inline-flex rounded-xl bg-white/10 p-3">
                    <Building2 className="h-8 w-8 text-[#c7d7ff]" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    {searchTerm ? "No matching positions found" : "No Current Vacancies"}
                  </h3>
                  <p className="mb-4 text-sm text-[#c7d7ff]">
                    {searchTerm 
                      ? "Try adjusting your search terms or browse all available positions."
                      : "We're always looking for talented individuals. Please check back later for new opportunities."
                    }
                  </p>
                  {searchTerm && (
                    <Button 
                      onClick={() => setSearchTerm("")}
                      className="mr-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                    >
                      Clear Search
                    </Button>
                  )}
                  <Button 
                    onClick={fetchJobs}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredJobs.map((job) => (
                  <article
                    key={job.id}
                    className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:shadow-xl"
                  >
                    {/* Image Section */}
                    <div className="relative h-32 overflow-hidden bg-gradient-to-br from-[#0b1b3b] via-[#1e3a8a] to-[#2563eb]">
                      {job.image_path ? (
                        <div className="relative h-full w-full">
                          <Image
                            src={job.image_path}
                            alt={job.job_title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
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
                              <Building2 className="mx-auto mb-1 h-6 w-6 text-[#2563eb]" />
                              <p className="text-xs font-bold text-[#2563eb]">NORSU HRM</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <div className="text-center">
                            <Building2 className="mx-auto mb-1 h-6 w-6 text-[#2563eb]" />
                            <p className="text-xs font-bold text-[#2563eb]">NORSU HRM</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute left-2 top-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-sm ${getJobTypeColor(getJobType(job.department))}`}>
                          {getJobType(job.department)}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1b3b]/80 via-transparent to-transparent"></div>
                    </div>

                    {/* Details Section */}
                    <div className="p-4">
                      <h3 className="mb-2 line-clamp-2 text-base font-bold text-white group-hover:text-[#c7d7ff]">
                        {job.job_title}
                      </h3>
                      
                      {/* Job Meta Information */}
                      <div className="mb-3 space-y-1.5">
                        {job.department && (
                          <div className="flex items-center gap-2 text-[#c7d7ff]">
                            <Building2 className="h-3 w-3 flex-shrink-0 text-[#2563eb]" />
                            <span className="text-xs truncate">{job.department}</span>
                          </div>
                        )}
                        {job.location && (
                          <div className="flex items-center gap-2 text-[#c7d7ff]">
                            <MapPin className="h-3 w-3 flex-shrink-0 text-[#2563eb]" />
                            <span className="text-xs truncate">{job.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[#94a3b8]">
                          <Calendar className="h-3 w-3 flex-shrink-0 text-[#2563eb]" />
                          <span className="text-xs">Posted: {formatDate(job.date_posted)}</span>
                        </div>
                        <div className="flex items-center gap-2 font-semibold text-[#2563eb]">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="text-xs">Apply by: {getDeadlineDate(job.date_posted)}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[#c7d7ff]">
                        {job.job_description || "Join our team and contribute to the academic excellence of NORSU."}
                      </p>

                      {/* Action Button */}
                      <Button
                        asChild
                        className="w-full rounded-lg border-0 bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:scale-105 hover:from-[#1d4ed8] hover:to-[#2563eb]"
                      >
                        <Link href={`/vacancies/${job.id}`}>
                          View Details
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