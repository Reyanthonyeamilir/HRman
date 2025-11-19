"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabaseClient'
import { Building2, MapPin, Calendar, Clock, ArrowLeft, FileText } from "lucide-react"

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

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [job, setJob] = React.useState<JobPosting | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchJob = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("job_postings")
        .select(`
          id, job_title, department, location, job_description, image_path, date_posted, status, profiles(email)
        `)
        .eq("id", params.id)
        .single()
      
      if (error) throw error
      
      if (data) {
        const transformedData = {
          ...data,
          profiles: data.profiles?.[0] ? [data.profiles[0]] : null
        }
        setJob(transformedData)
      } else {
        setError("Job not found")
      }
    } catch (err) {
      console.error(err)
      setError("Failed to load job details. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (params.id) {
      fetchJob()
    }
  }, [params.id])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1b3b] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#2563eb]/30 border-t-[#2563eb]"></div>
          <p className="text-sm text-[#c7d7ff]">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-[#0b1b3b] flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="mx-auto mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-6 backdrop-blur-md">
            <p className="mb-4 text-sm text-red-200">{error || "Job not found"}</p>
            <div className="flex gap-3 justify-center flex-col sm:flex-row">
              <Button 
                onClick={fetchJob} 
                className="rounded-full bg-[#2563eb] px-4 py-2 text-sm text-white hover:bg-[#1d4ed8]"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => router.push('/vacancies')}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
              >
                Back to Vacancies
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b1b3b] py-4">
      {/* Minimal Header */}
      <div className="mx-auto max-w-md px-4 mb-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/vacancies')}
          className="flex items-center gap-1 text-xs text-[#c7d7ff] hover:text-white hover:bg-white/10 px-2 py-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Vacancies
        </Button>
      </div>

      {/* Compact Main Content */}
      <div className="flex justify-center">
        <div className="w-full max-w-md mx-auto px-4">
          
          {/* Ultra Compact Job Card */}
          <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
            
            {/* Small Job Image */}
            <div className="relative h-32 w-full bg-gradient-to-br from-[#0b1b3b] via-[#1e3a8a] to-[#2563eb]">
              {job.image_path ? (
                <>
                  <Image
                    src={job.image_path}
                    alt={job.job_title}
                    fill
                    className="object-cover"
                    priority
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const fallback = document.getElementById('image-fallback')
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                  <div 
                    id="image-fallback"
                    className="hidden absolute inset-0 flex items-center justify-center"
                    style={{ display: 'none' }}
                  >
                    <div className="text-center">
                      <Building2 className="mx-auto mb-1 h-6 w-6 text-[#2563eb]" />
                      <p className="text-xs font-bold text-[#2563eb]">NORSU HRM</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="text-center">
                    <Building2 className="mx-auto mb-1 h-6 w-6 text-[#2563eb]" />
                    <p className="text-xs font-bold text-[#2563eb]">NORSU HRM</p>
                  </div>
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1b3b]/90 via-transparent to-transparent"></div>
              
              <div className="absolute top-2 left-2">
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium backdrop-blur-sm ${getJobTypeColor(getJobType(job.department))}`}>
                  {getJobType(job.department)}
                </span>
              </div>
            </div>

            {/* Ultra Compact Job Content */}
            <div className="p-4">
              
              {/* Job Title */}
              <h1 className="mb-3 text-lg font-bold text-white text-center leading-tight">
                {job.job_title}
              </h1>

              {/* Minimal Job Meta */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                {job.department && (
                  <div className="flex items-center gap-1.5 text-[#c7d7ff]">
                    <Building2 className="h-3 w-3 flex-shrink-0 text-[#2563eb]" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-[#94a3b8]">Department</p>
                      <p className="font-medium truncate">{job.department}</p>
                    </div>
                  </div>
                )}
                {job.location && (
                  <div className="flex items-center gap-1.5 text-[#c7d7ff]">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-[#2563eb]" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-[#94a3b8]">Location</p>
                      <p className="font-medium truncate">{job.location}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[#c7d7ff]">
                  <Calendar className="h-3 w-3 flex-shrink-0 text-[#2563eb]" />
                  <div>
                    <p className="text-[10px] text-[#94a3b8]">Posted</p>
                    <p className="font-medium">{formatDate(job.date_posted)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[#2563eb] font-semibold">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-[#94a3b8]">Apply Before</p>
                    <p className="font-medium">{getDeadlineDate(job.date_posted)}</p>
                  </div>
                </div>
              </div>

              {/* Apply Button */}
              <div className="text-center mb-4">
                <Button
                  asChild
                  className="rounded-lg bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 w-full"
                >
                  <Link href="/login">
                    Apply Now
                  </Link>
                </Button>
                <p className="mt-1 text-[10px] text-[#94a3b8]">
                  Login required to apply
                </p>
              </div>

              {/* Compact Job Description */}
              <div className="mb-4">
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white">
                  <FileText className="h-3.5 w-3.5 text-[#2563eb]" />
                  Description
                </h2>
                <p className="text-xs leading-relaxed text-[#c7d7ff] line-clamp-4">
                  {job.job_description || "No detailed description provided. Contact HR for more information."}
                </p>
              </div>

              {/* Minimal Job Summary */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-3">
                <h3 className="mb-2 text-sm font-semibold text-white">Job Summary</h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#94a3b8]">Position:</span>
                    <span className="text-[#c7d7ff] font-medium truncate ml-2 max-w-[120px]">{job.job_title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94a3b8]">Type:</span>
                    <span className="text-[#c7d7ff] font-medium">{getJobType(job.department)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94a3b8]">Status:</span>
                    <span className="text-green-400 font-medium">Active</span>
                  </div>
                </div>
              </div>

              {/* Minimal Contact Info */}
              <div className="text-center">
                <h3 className="mb-1 text-sm font-semibold text-white">Need Help?</h3>
                <div className="space-y-0.5 text-xs text-[#c7d7ff]">
                  <p>Contact HR:</p>
                  <p className="text-[#2563eb] font-medium">hr@norsu.edu.ph</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}