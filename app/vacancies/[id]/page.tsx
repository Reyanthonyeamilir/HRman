"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabaseClient'
import { Building2, MapPin, Calendar, Clock, ArrowLeft, User, FileText } from "lucide-react"

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
      month: "long",
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
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-[#2563eb]/30 border-t-[#2563eb]"></div>
          <p className="font-medium text-[#c7d7ff]">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-[#0b1b3b] flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="mx-auto mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-8 backdrop-blur-md">
            <p className="mb-4 text-red-200">{error || "Job not found"}</p>
            <div className="flex gap-4 justify-center flex-col sm:flex-row">
              <Button 
                onClick={fetchJob} 
                className="rounded-full bg-[#2563eb] px-6 text-white shadow-lg transition-all duration-200 hover:bg-[#1d4ed8]"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => router.push('/vacancies')}
                className="rounded-full border border-white/20 bg-white/10 px-6 text-white transition-all duration-200 hover:bg-white/20"
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
    <div className="min-h-screen bg-[#0b1b3b]">
      {/* Simple Header with Back Button */}
      <div className="border-b border-white/10 bg-[#0b1b3b]/95 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/vacancies')}
            className="flex items-center gap-2 text-[#c7d7ff] hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vacancies
          </Button>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] py-8">
        <div className="w-full max-w-4xl mx-auto px-4">
          
          {/* Main Job Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
            
            {/* Job Image with Fallback */}
            <div className="relative h-64 md:h-80 w-full bg-gradient-to-br from-[#0b1b3b] via-[#1e3a8a] to-[#2563eb]">
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
                  {/* Fallback that shows if image fails to load */}
                  <div 
                    id="image-fallback"
                    className="hidden absolute inset-0 flex items-center justify-center"
                    style={{ display: 'none' }}
                  >
                    <div className="text-center">
                      <Building2 className="mx-auto mb-4 h-16 w-16 text-[#2563eb]" />
                      <p className="text-xl font-bold text-[#2563eb]">NORSU HRM</p>
                      <p className="text-sm text-[#c7d7ff] mt-2">{job.job_title}</p>
                    </div>
                  </div>
                </>
              ) : (
                /* Default fallback when no image is provided */
                <div className="flex h-full w-full items-center justify-center">
                  <div className="text-center">
                    <Building2 className="mx-auto mb-4 h-16 w-16 text-[#2563eb]" />
                    <p className="text-xl font-bold text-[#2563eb]">NORSU HRM</p>
                    <p className="text-sm text-[#c7d7ff] mt-2">{job.job_title}</p>
                  </div>
                </div>
              )}
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1b3b]/90 via-transparent to-transparent"></div>
              
              {/* Job Type Badge on Image */}
              <div className="absolute top-4 left-4">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold backdrop-blur-sm ${getJobTypeColor(getJobType(job.department))}`}>
                  {getJobType(job.department)}
                </span>
              </div>
            </div>

            {/* Job Content */}
            <div className="p-6 md:p-8">
              
              {/* Job Title */}
              <h1 className="mb-6 text-2xl md:text-3xl font-bold text-white text-center">
                {job.job_title}
              </h1>

              {/* Job Meta Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {job.department && (
                  <div className="flex items-center gap-3 text-[#c7d7ff] justify-center sm:justify-start">
                    <Building2 className="h-5 w-5 flex-shrink-0 text-[#2563eb]" />
                    <div className="text-center sm:text-left">
                      <p className="text-sm text-[#94a3b8]">Department</p>
                      <p className="font-medium">{job.department}</p>
                    </div>
                  </div>
                )}
                {job.location && (
                  <div className="flex items-center gap-3 text-[#c7d7ff] justify-center sm:justify-start">
                    <MapPin className="h-5 w-5 flex-shrink-0 text-[#2563eb]" />
                    <div className="text-center sm:text-left">
                      <p className="text-sm text-[#94a3b8]">Location</p>
                      <p className="font-medium">{job.location}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 text-[#c7d7ff] justify-center sm:justify-start">
                  <Calendar className="h-5 w-5 flex-shrink-0 text-[#2563eb]" />
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-[#94a3b8]">Posted</p>
                    <p className="font-medium">{formatDate(job.date_posted)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[#2563eb] font-semibold justify-center sm:justify-start">
                  <Clock className="h-5 w-5 flex-shrink-0" />
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-[#94a3b8]">Apply Before</p>
                    <p className="font-medium">{getDeadlineDate(job.date_posted)}</p>
                  </div>
                </div>
              </div>

              {/* Apply Now Button - Centered */}
              <div className="text-center mb-8">
                <Button
                  asChild
                  className="rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-8 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:from-[#1d4ed8] hover:to-[#2563eb] text-lg w-full sm:w-auto"
                  size="lg"
                >
                  <Link href="/login">
                    Apply Now
                  </Link>
                </Button>
                <p className="mt-3 text-sm text-[#94a3b8]">
                  You need to login to apply for this position
                </p>
              </div>

              {/* Job Description */}
              <div className="mb-8">
                <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-white justify-center sm:justify-start">
                  <FileText className="h-5 w-5 text-[#2563eb]" />
                  Job Description
                </h2>
                <div className="text-center sm:text-left">
                  <p className="text-lg leading-relaxed text-[#c7d7ff] whitespace-pre-line">
                    {job.job_description || "No detailed description provided for this position. Please contact the HR department for more information."}
                  </p>
                </div>
              </div>

              {/* Requirements & Qualifications */}
              <div className="mb-8">
                <h2 className="mb-4 text-xl font-bold text-white text-center sm:text-left">Requirements & Qualifications</h2>
                <div className="space-y-4 text-[#c7d7ff] text-center sm:text-left">
                  <p>Detailed requirements and qualifications will be provided during the application process.</p>
                  <p>Please ensure you meet the basic qualifications for the position before applying.</p>
                </div>
              </div>

              {/* Job Summary */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
                <h3 className="mb-4 text-lg font-semibold text-white text-center sm:text-left">Job Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <span className="text-[#94a3b8] text-center sm:text-left">Position:</span>
                    <span className="text-[#c7d7ff] font-medium text-center sm:text-right">{job.job_title}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <span className="text-[#94a3b8] text-center sm:text-left">Department:</span>
                    <span className="text-[#c7d7ff] font-medium text-center sm:text-right">{job.department || "Not specified"}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <span className="text-[#94a3b8] text-center sm:text-left">Location:</span>
                    <span className="text-[#c7d7ff] font-medium text-center sm:text-right">{job.location || "Not specified"}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <span className="text-[#94a3b8] text-center sm:text-left">Type:</span>
                    <span className="text-[#c7d7ff] font-medium text-center sm:text-right">{getJobType(job.department)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <span className="text-[#94a3b8] text-center sm:text-left">Status:</span>
                    <span className="text-green-400 font-medium text-center sm:text-right">Active</span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="text-center">
                <h3 className="mb-3 text-lg font-semibold text-white">Need Help?</h3>
                <div className="space-y-2 text-sm text-[#c7d7ff]">
                  <p>Contact our HR Department:</p>
                  <p className="text-[#2563eb] font-medium">hr@norsu.edu.ph</p>
                  <p className="text-[#2563eb] font-medium">(035) 123-4567</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}