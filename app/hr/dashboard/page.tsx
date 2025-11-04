"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  Briefcase, 
  ClipboardList, 
  Users, 
  FileText, 
  UserCheck,
  Download,
  Menu,
  AlertCircle,
  Plus,
  TrendingUp,
  Eye
} from "lucide-react"
import { supabase } from '@/lib/supabaseClient'
import HRSidebar from '@/components/HRSidebar'

// Types
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

export default function HRDashboardPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [stats, setStats] = React.useState<DashboardStats>({
    totalApplicants: 0,
    totalUsers: 0,
    totalJobs: 0,
    pendingReviews: 0
  })
  const [recentApplications, setRecentApplications] = React.useState<RecentApplication[]>([])
  const [jobStatus, setJobStatus] = React.useState({ active: 0, closed: 0 })
  const [monthlyData, setMonthlyData] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Check authentication on component mount
  React.useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        router.push('/login')
        return
      }
      fetchDashboardData()
    } catch (error) {
      console.error('Auth check error:', error)
      setError('Authentication failed')
      setLoading(false)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Set mock data for professional demo
      setMockData()

    } catch (error: any) {
      console.error('Error in fetchDashboardData:', error)
      setError(error.message || 'Failed to load dashboard data')
      setMockData() // Fallback to mock data
    } finally {
      setLoading(false)
    }
  }

  const setMockData = () => {
    const mockApplications: RecentApplication[] = [
      {
        id: '1',
        applicant_name: 'john.doe',
        job_title: 'Senior Software Engineer',
        submitted_at: '2024-01-15T10:30:00Z',
        status: 'pending',
        department: 'Engineering'
      },
      {
        id: '2',
        applicant_name: 'maria.santos',
        job_title: 'Product Manager',
        submitted_at: '2024-01-14T14:20:00Z',
        status: 'reviewed',
        department: 'Product'
      },
      {
        id: '3',
        applicant_name: 'carlos.lim',
        job_title: 'Data Scientist',
        submitted_at: '2024-01-13T09:15:00Z',
        status: 'pending',
        department: 'Data Science'
      },
      {
        id: '4',
        applicant_name: 'sarah.chen',
        job_title: 'UX Designer',
        submitted_at: '2024-01-12T16:45:00Z',
        status: 'accepted',
        department: 'Design'
      },
      {
        id: '5',
        applicant_name: 'anna.reyes',
        job_title: 'HR Business Partner',
        submitted_at: '2024-01-11T11:20:00Z',
        status: 'rejected',
        department: 'Human Resources'
      }
    ]

    setStats({
      totalApplicants: 247,
      totalUsers: 156,
      totalJobs: 18,
      pendingReviews: 23
    })

    setJobStatus({
      active: 12,
      closed: 6
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return "bg-amber-100 text-amber-800 border-amber-200"
      case 'reviewed':
        return "bg-blue-100 text-blue-800 border-blue-200"
      case 'accepted':
        return "bg-green-100 text-green-800 border-green-200"
      case 'rejected':
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return "Pending Review"
      case 'reviewed':
        return "Under Review"
      case 'accepted':
        return "Accepted"
      case 'rejected':
        return "Not Selected"
      default:
        return status
    }
  }

  // Error state display
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={fetchDashboardData}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Try Again
            </Button>
            <Button 
              onClick={setMockData}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Use Demo Data
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex">
        {/* Sidebar */}
        <HRSidebar 
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 lg:ml-0 min-h-screen">
          {/* Top Navigation Bar */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="flex items-center justify-between p-4 lg:px-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="lg:hidden border-slate-300 text-slate-600 hover:bg-slate-50 h-10 w-10"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">HR Dashboard</h1>
                  <p className="text-slate-600 text-sm">Welcome back, here's your recruitment overview</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Job
                </Button>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="p-4 lg:p-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Applicants"
                value={stats.totalApplicants}
                icon={<Users className="h-5 w-5" />}
                description="All-time applications"
                trend="+12% from last month"
                trendColor="text-green-600"
                loading={loading}
              />
              <StatCard
                title="Active Candidates"
                value={stats.totalUsers}
                icon={<UserCheck className="h-5 w-5" />}
                description="Registered in system"
                trend="+8% from last month"
                trendColor="text-green-600"
                loading={loading}
              />
              <StatCard
                title="Open Positions"
                value={stats.totalJobs}
                icon={<Briefcase className="h-5 w-5" />}
                description="Active job postings"
                trend={`${jobStatus.active} active, ${jobStatus.closed} closed`}
                trendColor="text-blue-600"
                loading={loading}
              />
              <StatCard
                title="Pending Reviews"
                value={stats.pendingReviews}
                icon={<FileText className="h-5 w-5" />}
                description="Need your attention"
                trend="Urgent"
                trendColor="text-amber-600"
                loading={loading}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              {/* Application Trends Chart */}
              <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Application Trends</h2>
                    <p className="text-slate-600 text-sm">Last 6 months performance</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                      Last 6 months
                    </Button>
                    <Button variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
                
                <div className="h-64">
                  {loading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                      {/* Chart Bars */}
                      <div className="flex-1 flex items-end justify-between space-x-4 pb-8">
                        {monthlyData.map((data, index) => (
                          <div key={data.month} className="flex-1 flex flex-col items-center space-y-2">
                            <div className="flex items-end space-x-1 w-full justify-center">
                              <div 
                                className="w-4 bg-gradient-to-t from-blue-500 to-blue-600 rounded-t transition-all duration-500 hover:opacity-80 relative group"
                                style={{ height: `${(data.applicants / 80) * 100}%` }}
                              >
                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  {data.applicants} applicants
                                </div>
                              </div>
                              <div 
                                className="w-4 bg-gradient-to-t from-emerald-500 to-emerald-600 rounded-t transition-all duration-500 hover:opacity-80 relative group"
                                style={{ height: `${(data.users / 50) * 100}%` }}
                              >
                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  {data.users} users
                                </div>
                              </div>
                            </div>
                            
                            {/* Month Label */}
                            <span className="text-sm font-medium text-slate-700">{data.month}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Legend */}
                      <div className="flex justify-center space-x-6 pt-4 border-t border-slate-200">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
                          <span className="text-sm text-slate-700">Applicants</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded"></div>
                          <span className="text-sm text-slate-700">New Users</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 gap-3">
                  <Link href="/hr/jobs">
                    <Button className="w-full h-14 flex items-center justify-start bg-blue-600 hover:bg-blue-700 text-white px-4">
                      <Briefcase className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Manage Jobs</div>
                        <div className="text-blue-100 text-xs">View and edit job postings</div>
                      </div>
                    </Button>
                  </Link>
                  <Link href="/hr/review">
                    <Button variant="outline" className="w-full h-14 flex items-center justify-start border-slate-300 text-slate-700 hover:bg-slate-50 px-4">
                      <ClipboardList className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Review Applications</div>
                        <div className="text-slate-500 text-xs">{stats.pendingReviews} pending reviews</div>
                      </div>
                    </Button>
                  </Link>
                  <Link href="/hr/jobs?create=new">
                    <Button variant="outline" className="w-full h-14 flex items-center justify-start border-slate-300 text-slate-700 hover:bg-slate-50 px-4">
                      <Plus className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Post New Job</div>
                        <div className="text-slate-500 text-xs">Create new job posting</div>
                      </div>
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full h-14 flex items-center justify-start border-slate-300 text-slate-700 hover:bg-slate-50 px-4">
                    <Download className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Export Reports</div>
                      <div className="text-slate-500 text-xs">Download analytics data</div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Applications */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Recent Applications</h2>
                    <p className="text-slate-600 text-sm">Latest candidate submissions</p>
                  </div>
                  <Link href="/hr/review">
                    <Button variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                  </Link>
                </div>
                
                <div className="space-y-3">
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center space-x-4 p-3">
                          <div className="rounded-full bg-slate-200 h-10 w-10"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentApplications.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                      <p>No applications yet</p>
                      <p className="text-sm text-slate-400 mt-1">Applications will appear here when candidates apply</p>
                    </div>
                  ) : (
                    recentApplications.map((application) => (
                      <div key={application.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors duration-150 border border-slate-100">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {application.applicant_name.split('.').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900 capitalize">
                              {application.applicant_name.replace('.', ' ')}
                            </h3>
                            <p className="text-xs text-slate-600">{application.job_title} • {application.department}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(application.status)}`}>
                            {getStatusText(application.status)}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">{formatDate(application.submitted_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Job Status & Performance */}
              <div className="space-y-6">
                {/* Job Status */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Job Postings Status</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-slate-700">Active Jobs</span>
                      </div>
                      <span className="text-lg font-bold text-slate-900">{jobStatus.active}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${(jobStatus.active / (jobStatus.active + jobStatus.closed || 1)) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-2">
                        <div className="h-3 w-3 rounded-full bg-slate-400"></div>
                        <span className="text-sm font-medium text-slate-700">Closed Jobs</span>
                      </div>
                      <span className="text-lg font-bold text-slate-900">{jobStatus.closed}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-slate-400 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${(jobStatus.closed / (jobStatus.active + jobStatus.closed || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-sm border border-blue-500 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Performance</h2>
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-100">Avg. Response Time</span>
                      <span className="font-semibold">2.3 days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-100">Interview Rate</span>
                      <span className="font-semibold">24%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-100">Hire Rate</span>
                      <span className="font-semibold">8%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

/* Professional Stat Card Component */
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-slate-200 rounded animate-pulse mb-2"></div>
          ) : (
            <p className="text-3xl font-bold text-slate-900 mb-2">{value.toLocaleString()}</p>
          )}
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-200">
          {icon}
        </div>
      </div>
      {!loading && (
        <div className={`text-xs font-medium mt-3 flex items-center ${trendColor}`}>
          <TrendingUp className="h-3 w-3 mr-1" />
          {trend}
        </div>
      )}
    </div>
  )
}