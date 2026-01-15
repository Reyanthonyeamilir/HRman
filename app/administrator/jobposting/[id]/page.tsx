// app/administrator/jobposting/[id]/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import AdminHRSidebar, { MobileTopbar } from '@/components/adminhrsidebar'
import { supabase } from '@/lib/supabaseClient'
import {
  ArrowLeft, Building, MapPin, Calendar, Users,
  Briefcase, BookOpen, CheckSquare, Edit,
  CheckCircle, XCircle, Globe, Award, Zap,
  ChevronRight, AlertCircle, FileText, UserCheck,
  FileCheck, Eye, ExternalLink
} from 'lucide-react'

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

interface JobPosting {
  id: string
  job_title: string
  department: string | null
  location: string | null
  job_description: string | null
  image_path: string | null
  date_posted: string
  status: 'active' | 'closed'
  created_by: string
  requirements?: string | null
  salary_range?: string | null
  employment_type?: string | null
  experience_level?: string | null
  benefits?: string | null
}

interface UserProfile {
  id: string
  role: string
  email: string
  first_name: string | null
  last_name: string | null
}

export default function JobDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [job, setJob] = useState<JobPosting | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [applicationCount, setApplicationCount] = useState(0)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser && jobId) {
      fetchJobDetails()
      fetchApplicationCount()
    }
  }, [currentUser, jobId])

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, email, first_name, last_name')
        .eq('id', user.id)
        .single()

      setCurrentUser(profile)
    } catch (error) {
      console.error('Error fetching user:', error)
      router.push('/auth/login')
    }
  }

  const fetchJobDetails = async () => {
    try {
      setLoading(true)
      
      const { data: jobData, error: jobError } = await supabase
        .from('job_postings')
        .select('*')
        .eq('id', jobId)
        .single()

      if (jobError) throw jobError
      setJob(jobData)
    } catch (error) {
      console.error('Error fetching job details:', error)
      alert('Error loading job details')
    } finally {
      setLoading(false)
    }
  }

  const fetchApplicationCount = async () => {
    try {
      const { count, error } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId)

      if (error) throw error
      setApplicationCount(count || 0)
    } catch (error) {
      console.error('Error fetching application count:', error)
    }
  }

  const toggleJobStatus = async () => {
    if (!job) return
    
    try {
      const newStatus = job.status === 'active' ? 'closed' : 'active'
      
      const { error } = await supabase
        .from('job_postings')
        .update({ status: newStatus })
        .eq('id', jobId)

      if (error) throw error

      setJob({ ...job, status: newStatus })
      alert(`Job ${newStatus === 'active' ? 'reopened' : 'closed'} successfully!`)
    } catch (error) {
      console.error('Error updating job status:', error)
      alert('Error updating job status')
    }
  }

  const handleViewApplications = () => {
    router.push(`/administrator/applications?job=${jobId}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const shareJobLink = () => {
    const jobUrl = `${window.location.origin}/jobs/${jobId}`
    if (navigator.share) {
      navigator.share({
        title: job?.job_title || 'Job Posting',
        text: `Check out this job opportunity: ${job?.job_title}`,
        url: jobUrl,
      })
    } else {
      navigator.clipboard.writeText(jobUrl)
      alert('Job link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <AdminHRSidebar 
          mobileOpen={sidebarOpen} 
          onMobileClose={() => setSidebarOpen(false)} 
        />
        <div className="lg:pl-64">
          <MobileTopbar onMenu={() => setSidebarOpen(true)} />
          <main className="p-4 md:p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-500">Loading job details...</div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <AdminHRSidebar 
          mobileOpen={sidebarOpen} 
          onMobileClose={() => setSidebarOpen(false)} 
        />
        <div className="lg:pl-64">
          <MobileTopbar onMenu={() => setSidebarOpen(true)} />
          <main className="p-4 md:p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center p-6 bg-white rounded-2xl border border-slate-200 max-w-md mx-4 shadow-sm">
                <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Job Not Found</h2>
                <p className="text-slate-600 mb-4">
                  The job you're looking for doesn't exist or has been removed.
                </p>
                <Link
                  href="/administrator/jobposting"
                  className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors w-full sm:w-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Job Postings
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AdminHRSidebar 
        mobileOpen={sidebarOpen} 
        onMobileClose={() => setSidebarOpen(false)} 
      />
      
      <div className="lg:pl-64">
        <MobileTopbar onMenu={() => setSidebarOpen(true)} />
        
        <main className="pb-20 lg:pb-6">
          {/* Hero Section with Full Image */}
          <div className="relative">
            {/* Full-width Hero Image */}
            <div className="relative h-64 sm:h-72 md:h-80 lg:h-96 overflow-hidden">
              {job.image_path ? (
                <img
                  src={job.image_path}
                  alt={job.job_title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                  <Briefcase className="h-20 w-20 text-white/90" />
                </div>
              )}
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
              
              {/* Content Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
                <div className="max-w-7xl mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                          'px-3 py-1 rounded-full text-sm font-semibold border flex items-center gap-2',
                          job.status === 'active' 
                            ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30 backdrop-blur-sm' 
                            : 'bg-rose-500/20 text-rose-100 border-rose-400/30 backdrop-blur-sm'
                        )}>
                          {job.status === 'active' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          {job.status === 'active' ? 'Active' : 'Closed'}
                        </span>
                        <span className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white/90 rounded-lg text-sm flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {applicationCount} applications
                        </span>
                      </div>
                      
                      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
                        {job.job_title}
                      </h1>
                      
                      <div className="flex flex-wrap items-center gap-3 text-white/90">
                        <span className="flex items-center gap-1.5">
                          <Building className="h-4 w-4" />
                          {job.department || 'Department'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {job.location || 'Remote'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {formatDate(job.date_posted)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={handleViewApplications}
                        className="p-2.5 bg-blue-500/20 backdrop-blur-sm hover:bg-blue-500/30 text-white rounded-xl border border-blue-400/30 transition-all flex items-center gap-2 group"
                        title="View Applications"
                      >
                        <UserCheck className="h-5 w-5" />
                        <span className="hidden sm:inline">Applications</span>
                        <ChevronRight className="h-4 w-4 hidden sm:group-hover:block group-hover:translate-x-1 transition-transform" />
                      </button>
                      <Link
                        href={`/administrator/jobposting/${job.id}/edit`}
                        className="p-2.5 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl border border-white/30 transition-all"
                        title="Edit Job"
                      >
                        <Edit className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={toggleJobStatus}
                        className={cn(
                          "p-2.5 backdrop-blur-sm rounded-xl border transition-all",
                          job.status === 'active'
                            ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-100 border-orange-400/30'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border-emerald-400/30'
                        )}
                        title={job.status === 'active' ? 'Close Job' : 'Reopen Job'}
                      >
                        {job.status === 'active' ? (
                          <XCircle className="h-5 w-5" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <Link
              href="/administrator/jobposting"
              className="absolute top-4 left-4 p-2 bg-black/30 backdrop-blur-sm hover:bg-black/40 text-white rounded-xl border border-white/20 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            {/* Share Button */}
            <button
              onClick={shareJobLink}
              className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-sm hover:bg-black/40 text-white rounded-xl border border-white/20 transition-all"
              title="Share Job"
            >
              <ExternalLink className="h-5 w-5" />
            </button>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 -mt-8 relative z-10">
            {/* Job Stats Cards - Only Applications Card */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow lg:col-span-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Total Applications Received</p>
                      <p className="text-2xl font-bold text-slate-900">{applicationCount}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleViewApplications}
                    className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <UserCheck className="h-4 w-4" />
                    View All Applications
                  </button>
                </div>
              </div>
            </div>

            {/* Job Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Job Description */}
              <div className="lg:col-span-2 space-y-8">
                {/* Job Description Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Job Description</h2>
                        <p className="text-sm text-slate-600">Detailed overview of responsibilities</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {job.job_description ? (
                      <div className="prose prose-slate max-w-none">
                        <div className="text-slate-700 space-y-4">
                          {job.job_description.split('\n\n').map((paragraph, index) => (
                            <p key={index} className="leading-relaxed">{paragraph}</p>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No description available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Requirements Card */}
                {job.requirements && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <CheckSquare className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-slate-900">Requirements</h2>
                          <p className="text-sm text-slate-600">Qualifications and skills needed</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <ul className="space-y-3">
                        {job.requirements.split('\n').map((requirement, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckSquare className="h-3 w-3 text-emerald-600" />
                              </div>
                            </div>
                            <span className="text-slate-700">{requirement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Job Information */}
              <div className="space-y-8">
                {/* Job Details Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <Briefcase className="h-5 w-5 text-slate-600" />
                      </div>
                      <h2 className="text-xl font-semibold text-slate-900">Job Details</h2>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-6">
                      {/* Position Details */}
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Position Information
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-sm text-slate-600">Job Title</span>
                            <span className="text-sm font-medium text-slate-900">{job.job_title}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-sm text-slate-600">Department</span>
                            <span className="text-sm font-medium text-slate-900">{job.department || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Location & Work Setup */}
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Location & Setup
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-sm text-slate-600">Work Location</span>
                            <span className="text-sm font-medium text-slate-900">{job.location || 'Remote'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Applications */}
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Applications
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-sm text-slate-600">Total Applications</span>
                            <span className="text-sm font-medium text-slate-900">{applicationCount}</span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-slate-600">Job Status</span>
                            <span className={cn(
                              'px-2 py-1 rounded-full text-xs font-semibold',
                              job.status === 'active' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-rose-100 text-rose-700'
                            )}>
                              {job.status === 'active' ? 'Active' : 'Closed'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Applications Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-white rounded-xl shadow-sm">
                        <UserCheck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Applications</h3>
                        <p className="text-sm text-slate-600">View and manage applications</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Total Applications</p>
                            <p className="text-2xl font-bold text-slate-900">{applicationCount}</p>
                          </div>
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <FileCheck className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        
                        <button
                          onClick={handleViewApplications}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium group"
                        >
                          <Eye className="h-4 w-4" />
                          View All Applications
                          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                      
                      <div className="text-xs text-slate-500 text-center pt-2">
                        You'll be redirected to the applications page filtered for this job
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Card */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-white rounded-xl shadow-sm">
                        <Zap className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
                        <p className="text-sm text-slate-600">Manage this job posting</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                     
                      <button
                        onClick={toggleJobStatus}
                        className="w-full flex items-center justify-between p-3 bg-white hover:bg-orange-50 rounded-xl border border-orange-200 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            {job.status === 'active' ? (
                              <XCircle className="h-4 w-4 text-orange-600" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {job.status === 'active' ? 'Close Job Posting' : 'Reopen Job Posting'}
                            </p>
                            <p className="text-sm text-slate-600">
                              {job.status === 'active' ? 'Stop accepting applications' : 'Start accepting applications'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-orange-600 transition-colors" />
                      </button>
                      
                      <Link
                        href="/administrator/jobposting"
                        className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            <ArrowLeft className="h-4 w-4 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">Back to Jobs</p>
                            <p className="text-sm text-slate-600">View all job postings</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-2xl lg:hidden z-50">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-4">
                  <p className="text-sm font-semibold text-slate-900 truncate">{job.job_title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      job.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-rose-100 text-rose-700'
                    )}>
                      {job.status === 'active' ? 'Active' : 'Closed'}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-500">{applicationCount} apps</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleViewApplications}
                    className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors relative"
                    title="View Applications"
                  >
                    <UserCheck className="h-5 w-5" />
                    {applicationCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {applicationCount}
                      </span>
                    )}
                  </button>
                  <Link
                    href={`/administrator/jobposting/${job.id}/edit`}
                    className="p-3 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Edit Job"
                  >
                    <Edit className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={toggleJobStatus}
                    className={cn(
                      "p-3 rounded-xl transition-colors",
                      job.status === 'active'
                        ? 'text-orange-600 hover:bg-orange-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    )}
                    title={job.status === 'active' ? 'Close Job' : 'Reopen Job'}
                  >
                    {job.status === 'active' ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      <CheckCircle className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom padding for mobile */}
          <div className="h-20 lg:h-0" />
        </main>
      </div>
    </div>
  )
}