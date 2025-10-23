"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  Briefcase, 
  ClipboardList, 
  Users, 
  FileText, 
  UserCheck,
  Download,
  Menu
} from "lucide-react"
import { supabase } from '@/lib/supabaseClient'
import HRSidebar from '@/components/HRSidebar'

// Types based on your actual schema
interface DashboardStats {
  totalApplicants: number
  totalUsers: number
  totalJobs: number
  pendingReviews: number
}

interface RecentApplication {
  id: string
  applicant_name: string
  job_title: string
  submitted_at: string
  status: string
  department: string
}

interface JobStatus {
  active: number
  closed: number
}

interface MonthlyData {
  month: string
  applicants: number
  users: number
}

// Types for Supabase responses
interface ApplicationWithRelations {
  id: string
  submitted_at: string
  profiles: { email: string }[] | null
  job_postings: { job_title: string; department: string }[] | null
}

interface UserProfile {
  id: string
  email: string
  role: string
  created_at: string
}

interface JobPosting {
  id: string
  status: string
}

export default function HRDashboardPage() {
  const pathname = usePathname()
  const [stats, setStats] = React.useState<DashboardStats>({
    totalApplicants: 0,
    totalUsers: 0,
    totalJobs: 0,
    pendingReviews: 0
  })
  const [recentApplications, setRecentApplications] = React.useState<RecentApplication[]>([])
  const [jobStatus, setJobStatus] = React.useState<JobStatus>({ active: 0, closed: 0 })
  const [monthlyData, setMonthlyData] = React.useState<MonthlyData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)

  // Fetch dashboard data from your actual database schema
  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch total applications with applicant names
      const { data: applications, error: applicationsError } = await supabase
        .from('applications')
        .select(`
          id,
          submitted_at,
          profiles (
            email
          ),
          job_postings (
            job_title,
            department
          )
        `)
        .order('submitted_at', { ascending: false })

      if (applicationsError) throw applicationsError

      // Fetch total users (profiles table)
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, role, created_at')

      if (usersError) throw usersError

      // Fetch total jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('job_postings')
        .select('id, status')

      if (jobsError) throw jobsError

      // Calculate job status counts
      const activeJobs = jobs?.filter(job => job.status === 'active').length || 0
      const closedJobs = jobs?.filter(job => job.status === 'closed').length || 0

      // Transform recent applications data for display with proper null checking
      const transformedApplications: RecentApplication[] = applications?.slice(0, 5).map(app => {
        // Safely access nested properties with fallbacks
        const applicantEmail = app.profiles?.[0]?.email || 'Unknown'
        const jobTitle = app.job_postings?.[0]?.job_title || 'N/A'
        const department = app.job_postings?.[0]?.department || 'N/A'
        
        return {
          id: app.id,
          applicant_name: applicantEmail.split('@')[0],
          job_title: jobTitle,
          submitted_at: app.submitted_at,
          status: 'pending',
          department: department
        }
      }) || []

      // Generate monthly data for chart from actual data
      const monthlyStats = generateMonthlyData(applications || [], users || [])

      setStats({
        totalApplicants: applications?.length || 0,
        totalUsers: users?.length || 0,
        totalJobs: jobs?.length || 0,
        pendingReviews: applications?.length || 0
      })

      setJobStatus({
        active: activeJobs,
        closed: closedJobs
      })

      setRecentApplications(transformedApplications)
      setMonthlyData(monthlyStats)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setMockData()
    } finally {
      setLoading(false)
    }
  }

  // Generate monthly data for the chart from actual database data
  const generateMonthlyData = (applications: ApplicationWithRelations[], users: UserProfile[]): MonthlyData[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    
    const monthlyStats = months.map(month => ({
      month,
      applicants: 0,
      users: 0
    }))

    // Count applications by month
    applications.forEach(app => {
      const appDate = new Date(app.submitted_at)
      const appMonth = appDate.getMonth()
      const appYear = appDate.getFullYear()
      
      if (appYear === currentYear) {
        monthlyStats[appMonth].applicants++
      }
    })

    // Count users by month
    users.forEach(user => {
      const userDate = new Date(user.created_at)
      const userMonth = userDate.getMonth()
      const userYear = userDate.getFullYear()
      
      if (userYear === currentYear) {
        monthlyStats[userMonth].users++
      }
    })

    const currentMonth = currentDate.getMonth()
    const lastSixMonths = monthlyStats
      .slice(currentMonth - 5, currentMonth + 1)
      .map((stat, index) => ({
        ...stat,
        month: months[(currentMonth - 5 + index + 12) % 12]
      }))

    return lastSixMonths
  }

  // Mock data for demonstration
  const setMockData = () => {
    const mockApplications: RecentApplication[] = [
      {
        id: '1',
        applicant_name: 'john.doe',
        job_title: 'Software Engineer',
        submitted_at: '2024-01-15T10:30:00Z',
        status: 'pending',
        department: 'IT'
      },
      {
        id: '2',
        applicant_name: 'maria.santos',
        job_title: 'Marketing Specialist',
        submitted_at: '2024-01-14T14:20:00Z',
        status: 'reviewed',
        department: 'Marketing'
      },
      {
        id: '3',
        applicant_name: 'carlos.lim',
        job_title: 'Data Analyst',
        submitted_at: '2024-01-13T09:15:00Z',
        status: 'pending',
        department: 'IT'
      },
      {
        id: '4',
        applicant_name: 'sarah.chen',
        job_title: 'Graphic Designer',
        submitted_at: '2024-01-12T16:45:00Z',
        status: 'accepted',
        department: 'Creative'
      },
      {
        id: '5',
        applicant_name: 'anna.reyes',
        job_title: 'HR Manager',
        submitted_at: '2024-01-11T11:20:00Z',
        status: 'rejected',
        department: 'Human Resources'
      }
    ]

    setStats({
      totalApplicants: mockApplications.length,
      totalUsers: 89,
      totalJobs: 12,
      pendingReviews: 23
    })

    setJobStatus({
      active: 8,
      closed: 4
    })

    setRecentApplications(mockApplications)

    setMonthlyData([
      { month: 'Jul', applicants: 45, users: 28 },
      { month: 'Aug', applicants: 52, users: 32 },
      { month: 'Sep', applicants: 38, users: 25 },
      { month: 'Oct', applicants: 67, users: 41 },
      { month: 'Nov', applicants: 58, users: 36 },
      { month: 'Dec', applicants: 72, users: 45 }
    ])
  }

  React.useEffect(() => {
    fetchDashboardData()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-amber-500/20 text-amber-300'
      case 'reviewed':
        return 'bg-blue-500/20 text-blue-300'
      case 'accepted':
        return 'bg-green-500/20 text-green-300'
      case 'rejected':
        return 'bg-red-500/20 text-red-300'
      default:
        return 'bg-white/10 text-[#c7d7ff]'
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending Review'
      case 'reviewed':
        return 'Under Review'
      case 'accepted':
        return 'Accepted'
      case 'rejected':
        return 'Not Selected'
      default:
        return status
    }
  }

  // Find max value for chart scaling
  const maxValue = Math.max(...monthlyData.map(d => Math.max(d.applicants, d.users)), 10)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0078D4] via-[#1e3a8a] to-[#0b1b3a]">
      <div className="min-h-screen bg-gradient-to-br from-[#0078D4]/20 via-[#1e3a8a]/40 to-[#0b1b3a]/80 py-4 text-white">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            
            {/* HRSidebar Component */}
            <HRSidebar 
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />

            {/* Main Content */}
            <section className="min-h-screen">
              {/* Mobile Header */}
              <div className="flex items-center gap-4 mb-6 lg:hidden">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="border-white/30 text-[#eaf2ff] hover:bg-white/10"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-white">HR Dashboard</h1>
                  <p className="text-[#c7d7ff] text-sm">Manage recruitment metrics</p>
                </div>
              </div>

              {/* Desktop Welcome Section */}
              <div className="hidden lg:block mb-8">
                <h1 className="text-2xl font-bold text-white">Welcome to Norsu HR Dashboard</h1>
                <p className="text-[#c7d7ff] mt-2">Manage job postings, review applications, and track recruitment metrics</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Total Applicants"
                  value={stats.totalApplicants}
                  icon={<Users className="h-6 w-6" />}
                  description="All-time applications"
                  trend="Real-time data"
                  trendColor="text-green-400"
                  loading={loading}
                />
                <StatCard
                  title="Total Users"
                  value={stats.totalUsers}
                  icon={<UserCheck className="h-6 w-6" />}
                  description="Registered candidates"
                  trend="From profiles table"
                  trendColor="text-[#93c5fd]"
                  loading={loading}
                />
                <StatCard
                  title="Active Jobs"
                  value={stats.totalJobs}
                  icon={<Briefcase className="h-6 w-6" />}
                  description="Job postings"
                  trend={`${jobStatus.active} active, ${jobStatus.closed} closed`}
                  trendColor="text-[#93c5fd]"
                  loading={loading}
                />
                <StatCard
                  title="Applications"
                  value={stats.pendingReviews}
                  icon={<FileText className="h-6 w-6" />}
                  description="Total submissions"
                  trend="From applications table"
                  trendColor="text-amber-300"
                  loading={loading}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Application Trends Chart */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Application Trends</h2>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" className="border-white/30 text-[#eaf2ff] hover:bg-white/10">
                        Last 6 months
                      </Button>
                    </div>
                  </div>
                  
                  <div className="h-64">
                    {loading ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078D4]"></div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col">
                        {/* Chart Bars */}
                        <div className="flex-1 flex items-end justify-between space-x-2 pb-8">
                          {monthlyData.map((data, index) => (
                            <div key={data.month} className="flex-1 flex flex-col items-center space-y-2">
                              {/* Applicants Bar */}
                              <div className="flex flex-col items-center space-y-1">
                                <div 
                                  className="w-6 bg-gradient-to-t from-[#0078D4] to-[#50E6FF] rounded-t transition-all duration-500 hover:opacity-80"
                                  style={{ height: `${(data.applicants / maxValue) * 80}%` }}
                                ></div>
                                <div 
                                  className="w-6 bg-gradient-to-t from-[#9333ea] to-[#c084fc] rounded-t transition-all duration-500 hover:opacity-80"
                                  style={{ height: `${(data.users / maxValue) * 80}%` }}
                                ></div>
                              </div>
                              
                              {/* Month Label */}
                              <span className="text-xs text-[#c7d7ff]">{data.month}</span>
                              
                              {/* Values */}
                              <div className="text-center">
                                <div className="text-xs text-white font-semibold">{data.applicants}</div>
                                <div className="text-xs text-[#c7d7ff]">{data.users}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Legend */}
                        <div className="flex justify-center space-x-6 pt-4 border-t border-white/10">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-gradient-to-r from-[#0078D4] to-[#50E6FF] rounded"></div>
                            <span className="text-xs text-[#c7d7ff]">Applicants</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-gradient-to-r from-[#9333ea] to-[#c084fc] rounded"></div>
                            <span className="text-xs text-[#c7d7ff]">Users</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Applications */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Recent Applications</h2>
                    <Link href="/hr/review">
                      <Button variant="outline" size="sm" className="border-white/30 text-[#eaf2ff] hover:bg-white/10">
                        View All
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="space-y-4">
                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="animate-pulse flex items-center space-x-4">
                            <div className="rounded-full bg-white/10 h-10 w-10"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-white/10 rounded w-3/4"></div>
                              <div className="h-3 bg-white/10 rounded w-1/2"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : recentApplications.length === 0 ? (
                      <div className="text-center py-8 text-white/80">
                        <FileText className="h-12 w-12 mx-auto text-white/30 mb-3" />
                        <p>No applications yet</p>
                        <p className="text-sm text-white/60 mt-1">Applications will appear here when candidates apply</p>
                      </div>
                    ) : (
                      recentApplications.map((application) => (
                        <div key={application.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors duration-150">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0078D4] to-[#1C89D1] flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {application.applicant_name.split('.').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-white capitalize">{application.applicant_name.replace('.', ' ')}</h3>
                              <p className="text-xs text-[#c7d7ff]">{application.job_title} • {application.department}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                              {getStatusText(application.status)}
                            </span>
                            <p className="text-xs text-[#c7d7ff] mt-1">{formatDate(application.submitted_at)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions & Job Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Quick Actions */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/hr/jobs">
                      <Button className="w-full h-16 flex flex-col items-center justify-center bg-[#0078D4] hover:bg-[#106EBE] text-white">
                        <Briefcase className="h-5 w-5 mb-1" />
                        <span className="text-xs">Manage Jobs</span>
                      </Button>
                    </Link>
                    <Link href="/hr/review">
                      <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center border-white/30 text-[#eaf2ff] hover:bg-white/10">
                        <ClipboardList className="h-5 w-5 mb-1" />
                        <span className="text-xs">Review Apps</span>
                      </Button>
                    </Link>
                    <Link href="/hr/jobs?create=new">
                      <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center border-white/30 text-[#eaf2ff] hover:bg-white/10">
                        <FileText className="h-5 w-5 mb-1" />
                        <span className="text-xs">Post Job</span>
                      </Button>
                    </Link>
                    <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center border-white/30 text-[#eaf2ff] hover:bg-white/10">
                      <Download className="h-5 w-5 mb-1" />
                      <span className="text-xs">Export Data</span>
                    </Button>
                  </div>
                </div>

                {/* Job Status */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Job Postings Status</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-3 w-3 rounded-full bg-green-400"></div>
                        <span className="text-sm text-[#c7d7ff]">Active Jobs</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{jobStatus.active}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-green-400 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${(jobStatus.active / (jobStatus.active + jobStatus.closed || 1)) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-2">
                        <div className="h-3 w-3 rounded-full bg-white/30"></div>
                        <span className="text-sm text-[#c7d7ff]">Closed Jobs</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{jobStatus.closed}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-white/30 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${(jobStatus.closed / (jobStatus.active + jobStatus.closed || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Stat Card Component */
function StatCard({ 
  title, 
  value, 
  icon, 
  description, 
  trend, 
  trendColor, 
  loading 
}: { 
  title: string
  value: number
  icon: React.ReactNode
  description: string
  trend: string
  trendColor: string
  loading: boolean
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#c7d7ff]">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-white/10 rounded animate-pulse mt-2"></div>
          ) : (
            <p className="text-2xl font-bold text-white mt-2">{value.toLocaleString()}</p>
          )}
          <p className="text-xs text-[#c7d7ff] mt-1">{description}</p>
        </div>
        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#0078D4] to-[#1C89D1] flex items-center justify-center text-white">
          {icon}
        </div>
      </div>
      {!loading && (
        <div className={`text-xs ${trendColor} mt-3 font-medium`}>
          {trend}
        </div>
      )}
    </div>
  )
}