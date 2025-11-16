'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Building2, Users, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/applicant'

type Job = {
  id: string
  job_title: string
  department: string
  location: string
  job_description: string
  date_posted: string
  status: 'active' | 'closed'
  image_path: string | null
}

type JobType = 'Faculty' | 'Staff' | 'Professional'

export default function JobPostingsPage() {
  const [q, setQ] = React.useState('')
  const [selectedJob, setSelectedJob] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState<string>('recent')
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Function to get the correct image URL
  const getImageUrl = (imagePath: string | null): string | null => {
    if (!imagePath) return null

    // If it's already a full URL, use it directly
    if (imagePath.startsWith('http')) {
      return imagePath
    }
    
    // If it's just a file path, generate the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('job-images')
      .getPublicUrl(imagePath)
    
    return publicUrl
  }

  // Fetch jobs from database
  React.useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const { data, error } = await supabase
          .from('job_postings')
          .select('id, job_title, department, location, job_description, date_posted, status, image_path')
          .eq('status', 'active')
          .order('date_posted', { ascending: false })

        if (error) throw error

        console.log('Fetched jobs with image paths:', data?.map(job => ({
          id: job.id,
          title: job.job_title,
          image_path: job.image_path
        })))

        setJobs(data || [])
      } catch (err: any) {
        console.error('Error fetching jobs:', err)
        setError(err.message || 'Failed to load job postings')
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [])

  // Get unique job titles for the select dropdown
  const jobTitles = React.useMemo(() => {
    const titles = jobs.map(job => job.job_title)
    // Remove duplicates and sort alphabetically
    return ['all', ...Array.from(new Set(titles)).sort()]
  }, [jobs])

  // Helper function to determine job type from department
  const getJobType = (department: string): JobType => {
    const dept = department?.toLowerCase() || ''
    if (dept.includes('college') || dept.includes('faculty') || dept.includes('professor') || dept.includes('instructor')) {
      return 'Faculty'
    } else if (dept.includes('it') || dept.includes('technical') || dept.includes('support')) {
      return 'Staff'
    } else {
      return 'Professional'
    }
  }

  // Get icon based on job type
  const getJobIcon = (jobType: JobType) => {
    const icons: Record<JobType, React.ComponentType<any>> = {
      Faculty: BookOpen,
      Staff: Users,
      Professional: Building2
    }
    return icons[jobType] || Building2
  }

  // Get color classes based on job type
  const getJobTypeColors = (jobType: JobType): string => {
    const typeColors: Record<JobType, string> = {
      Faculty: 'bg-purple-100 text-purple-800 border-purple-300/50',
      Staff: 'bg-blue-100 text-blue-800 border-blue-300/50',
      Professional: 'bg-green-100 text-green-800 border-green-300/50'
    }
    return typeColors[jobType] || 'bg-gray-100 text-gray-800 border-gray-300/50'
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Filter jobs based on search and filters
  const filtered = jobs.filter(job => {
    const matchesSearch = 
      job.job_title.toLowerCase().includes(q.toLowerCase()) ||
      job.department?.toLowerCase().includes(q.toLowerCase()) ||
      job.job_description?.toLowerCase().includes(q.toLowerCase()) ||
      job.location?.toLowerCase().includes(q.toLowerCase())

    const matchesJobTitle = selectedJob === 'all' || job.job_title === selectedJob

    return matchesSearch && matchesJobTitle
  })

  function onApply(title: string) {
    window.location.href = `/applicant/requirements?position=${encodeURIComponent(title)}`
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Postings — NORSU</h1>
            <p className="text-sm text-gray-600 mt-1">Browse available positions and apply for your dream job</p>
          </div>
          <Badge variant="outline" className="text-sm">Loading...</Badge>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading job postings...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Postings — NORSU</h1>
            <p className="text-sm text-gray-600 mt-1">Browse available positions and apply for your dream job</p>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="text-red-800 text-center">
              <p className="font-medium">Error loading job postings</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Postings — Negros Oriental State University</h1>
          <p className="text-sm text-gray-600 mt-1">Browse available positions and apply for your dream job</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {filtered.length} {filtered.length === 1 ? 'job' : 'jobs'} available
        </Badge>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Search Jobs</label>
              <Input 
                placeholder="Search by title, department, or description..." 
                value={q} 
                onChange={(e) => setQ(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Filter by Job Title</label>
              <select 
                value={selectedJob} 
                onChange={(e) => setSelectedJob(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All Job Titles</option>
                {jobTitles.filter(title => title !== 'all').map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Sort By</label>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="recent">Most Recent</option>
                <option value="older">Older First</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Listings */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-gray-200">
              <CardContent className="py-8 text-center">
                <div className="text-gray-500">
                  <p className="font-medium">No jobs found</p>
                  <p className="text-sm mt-1">Try adjusting your search criteria</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          filtered.map((job) => {
            const jobType = getJobType(job.department || '')
            const JobIcon = getJobIcon(jobType)
            const typeColorClasses = getJobTypeColors(jobType)

            const imageUrl = getImageUrl(job.image_path)

            return (
              <Card key={job.id} className="border-blue-200 bg-gradient-to-b from-blue-900 to-blue-950 text-blue-50 shadow-lg hover:shadow-xl transition-shadow overflow-hidden group">
                {/* Image Section */}
                <div className="relative h-48 bg-blue-800 overflow-hidden">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={job.job_title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        console.error('Image failed to load. URL:', imageUrl)
                        console.error('Database image_path:', job.image_path)
                        e.currentTarget.style.display = 'none'
                      }}
                      onLoad={() => console.log('Image loaded successfully:', imageUrl)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900">
                      <div className="text-center text-blue-200">
                        <JobIcon className="h-16 w-16 mx-auto mb-3 opacity-60" />
                        <p className="text-sm font-medium">{jobType}</p>
                        {job.image_path && (
                          <p className="text-xs text-blue-300 mt-1">
                            Image path: {job.image_path}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/20 to-transparent"></div>
                  
                  {/* Badge positioned over image */}
                  <div className="absolute top-3 left-3">
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${typeColorClasses} backdrop-blur-sm`}>
                      {jobType}
                    </span>
                  </div>
                </div>

                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white leading-tight mt-2 line-clamp-2">
                    {job.job_title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-3 pb-4">
                  {job.department && (
                    <div className="text-sm">
                      <span className="font-medium text-blue-200">Department:</span>{' '}
                      <span className="text-blue-100">{job.department}</span>
                    </div>
                  )}
                  {job.location && (
                    <div className="text-sm">
                      <span className="font-medium text-blue-200">Location:</span>{' '}
                      <span className="text-blue-100">{job.location}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="font-medium text-blue-200">Posted:</span>{' '}
                    <span className="text-blue-100">{formatDate(job.date_posted)}</span>
                  </div>
                  {job.job_description && (
                    <p className="mt-2 text-sm text-blue-100/90 leading-relaxed line-clamp-3">
                      {job.job_description}
                    </p>
                  )}
                  <div className="mt-4 pt-3 border-t border-blue-700/50">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                      onClick={() => onApply(job.job_title)}
                    >
                      Apply / Submit Requirements
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {filtered.length > 0 && (
        <Card className="border-blue-100 bg-white/80">
          <CardContent className="py-4 text-center text-slate-500">
            <p>End of listings • {filtered.length} {filtered.length === 1 ? 'job' : 'jobs'} shown</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}