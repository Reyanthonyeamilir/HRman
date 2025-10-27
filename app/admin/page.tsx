'use client'
import React, { useState, useEffect } from 'react'
import AdminSidebar, { MobileTopbar } from '@/components/AdminSidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Users, Briefcase, FileText, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

// Types based on your actual schema
interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  pdf_path: string;
  comment?: string;
  submitted_at: string;
}

interface JobPosting {
  id: string;
  created_by: string;
  job_title: string;
  department?: string;
  location?: string;
  job_description?: string;
  image_path?: string;
  date_posted: string;
  status: 'active' | 'closed';
}

interface Profile {
  id: string;
  email: string;
  phone?: string;
  role: 'applicant' | 'hr' | 'super_admin';
  created_at: string;
}

interface DashboardStats {
  totalUsers: number;
  activeJobs: number;
  totalApplications: number;
  pendingReviews: number;
}

interface ApplicationTrend {
  month: string;
  applications: number;
}

interface JobStatusData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface RecentActivity {
  id: number;
  action: string;
  target: string;
  time: string;
  type: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

// Mock data based on your schema
const mockProfiles: Profile[] = [
  { id: '1', email: 'john@example.com', role: 'applicant', created_at: '2024-01-15T10:00:00Z' },
  { id: '2', email: 'jane@example.com', role: 'applicant', created_at: '2024-01-20T11:00:00Z' },
  { id: '3', email: 'bob@example.com', role: 'applicant', created_at: '2024-02-01T09:00:00Z' },
  { id: '4', email: 'alice@example.com', role: 'hr', created_at: '2024-01-10T08:00:00Z' },
  { id: '5', email: 'admin@company.com', role: 'super_admin', created_at: '2024-01-01T12:00:00Z' },
  { id: '6', email: 'mike@example.com', role: 'applicant', created_at: '2024-02-15T14:00:00Z' },
  { id: '7', email: 'sara@example.com', role: 'applicant', created_at: '2024-03-01T16:00:00Z' },
];

const mockJobs: JobPosting[] = [
  { 
    id: 'job1', 
    created_by: '4', 
    job_title: 'Frontend Developer', 
    department: 'Engineering', 
    location: 'Remote', 
    date_posted: '2024-01-15T09:00:00Z', 
    status: 'active' 
  },
  { 
    id: 'job2', 
    created_by: '4', 
    job_title: 'Backend Engineer', 
    department: 'Engineering', 
    location: 'New York', 
    date_posted: '2024-02-01T10:00:00Z', 
    status: 'active' 
  },
  { 
    id: 'job3', 
    created_by: '5', 
    job_title: 'Product Manager', 
    department: 'Product', 
    location: 'San Francisco', 
    date_posted: '2024-01-20T11:00:00Z', 
    status: 'closed' 
  },
  { 
    id: 'job4', 
    created_by: '4', 
    job_title: 'UX Designer', 
    department: 'Design', 
    location: 'Remote', 
    date_posted: '2024-03-01T08:00:00Z', 
    status: 'active' 
  },
];

const mockApplications: Application[] = [
  { id: 'app1', job_id: 'job1', applicant_id: '1', pdf_path: '/resumes/john.pdf', submitted_at: '2024-01-20T14:00:00Z' },
  { id: 'app2', job_id: 'job1', applicant_id: '2', pdf_path: '/resumes/jane.pdf', submitted_at: '2024-01-25T16:00:00Z' },
  { id: 'app3', job_id: 'job2', applicant_id: '3', pdf_path: '/resumes/bob.pdf', submitted_at: '2024-02-05T10:00:00Z' },
  { id: 'app4', job_id: 'job2', applicant_id: '6', pdf_path: '/resumes/mike.pdf', submitted_at: '2024-02-10T11:00:00Z' },
  { id: 'app5', job_id: 'job3', applicant_id: '7', pdf_path: '/resumes/sara.pdf', submitted_at: '2024-02-15T09:00:00Z' },
  { id: 'app6', job_id: 'job1', applicant_id: '6', pdf_path: '/resumes/mike2.pdf', submitted_at: '2024-03-05T13:00:00Z' },
  { id: 'app7', job_id: 'job4', applicant_id: '2', pdf_path: '/resumes/jane2.pdf', submitted_at: '2024-03-10T15:00:00Z' },
];

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeJobs: 0,
    totalApplications: 0,
    pendingReviews: 0
  })
  const [applicationData, setApplicationData] = useState<ApplicationTrend[]>([])
  const [jobStatusData, setJobStatusData] = useState<JobStatusData[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [usingMockData, setUsingMockData] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      let applications: Application[] = []
      let jobs: JobPosting[] = []
      let profiles: Profile[] = []

      // Try to fetch from API first, fall back to mock data if it fails
      try {
        const [applicationsRes, jobsRes, profilesRes] = await Promise.all([
          fetch('/api/applications'),
          fetch('/api/jobs'),
          fetch('/api/profiles')
        ])

        if (applicationsRes.ok && jobsRes.ok && profilesRes.ok) {
          applications = await applicationsRes.json()
          jobs = await jobsRes.json()
          profiles = await profilesRes.json()
          setUsingMockData(false)
        } else {
          throw new Error('API not available')
        }
      } catch (error) {
        // Use mock data if API is not available
        applications = mockApplications
        jobs = mockJobs
        profiles = mockProfiles
        setUsingMockData(true)
        console.log('Using mock data for demonstration')
      }

      // Calculate stats based on actual database fields
      const totalUsers = profiles.length
      const activeJobs = jobs.filter(job => job.status === 'active').length
      const totalApplications = applications.length
      
      // For pending reviews - since we don't have application status in schema,
      // we'll assume all applications need review initially
      const pendingReviews = applications.length

      setStats({
        totalUsers,
        activeJobs,
        totalApplications,
        pendingReviews
      })

      // Prepare application trend data (last 6 months)
      const applicationTrend = prepareApplicationTrendData(applications)
      setApplicationData(applicationTrend)

      // Prepare job status data - only using statuses that exist in your schema
      const activeJobCount = jobs.filter(job => job.status === 'active').length
      const closedJobCount = jobs.filter(job => job.status === 'closed').length

      setJobStatusData([
        { name: 'Active', value: activeJobCount },
        { name: 'Closed', value: closedJobCount },
      ])

      // Prepare recent activities using actual data
      const activities = prepareRecentActivities(applications, jobs, profiles)
      setRecentActivities(activities)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const prepareApplicationTrendData = (applications: Application[]): ApplicationTrend[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const last6Months: ApplicationTrend[] = []
    
    const currentDate = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      last6Months.push({
        month: months[date.getMonth()],
        applications: 0
      })
    }

    // Count applications per month using submitted_at from your schema
    applications.forEach(application => {
      const appDate = new Date(application.submitted_at)
      const monthIndex = appDate.getMonth()
      const monthName = months[monthIndex]
      
      const trendItem = last6Months.find(item => item.month === monthName)
      if (trendItem) {
        trendItem.applications++
      }
    })

    return last6Months
  }

  const prepareRecentActivities = (
    applications: Application[], 
    jobs: JobPosting[], 
    profiles: Profile[]
  ): RecentActivity[] => {
    const activities: RecentActivity[] = []
    const now = new Date()

    // Recent job postings (using date_posted from your schema)
    const recentJobs = jobs
      .sort((a, b) => new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime())
      .slice(0, 3)

    recentJobs.forEach(job => {
      const postDate = new Date(job.date_posted)
      const timeDiff = now.getTime() - postDate.getTime()
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60))
      
      activities.push({
        id: activities.length + 1,
        action: 'New job posted',
        target: job.job_title,
        time: hoursAgo < 24 ? `${hoursAgo} hours ago` : `${Math.floor(hoursAgo / 24)} days ago`,
        type: 'success'
      })
    })

    // Recent applications (using submitted_at from your schema)
    const recentApplications = applications
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
      .slice(0, 2)

    recentApplications.forEach(app => {
      const appDate = new Date(app.submitted_at)
      const timeDiff = now.getTime() - appDate.getTime()
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60))
      const job = jobs.find(j => j.id === app.job_id)
      
      activities.push({
        id: activities.length + 1,
        action: 'Application received',
        target: job?.job_title || 'Unknown Position',
        time: hoursAgo < 24 ? `${hoursAgo} hours ago` : `${Math.floor(hoursAgo / 24)} days ago`,
        type: 'info'
      })
    })

    return activities.sort((a, b) => {
      // Sort by most recent first (simplified)
      return b.id - a.id
    }).slice(0, 4)
  }

  const StatCard = ({ title, value, icon: Icon, trend, description }: any) => (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{loading ? '...' : value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground">
            {trend}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )

  const ActivityIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <FileText className="h-4 w-4 text-blue-500" />
    }
  }

  // Simple Pie chart without complex labels to avoid TypeScript issues
  const renderPieChart = () => {
    if (jobStatusData.length === 0 || jobStatusData.every(item => item.value === 0)) {
      return <div className="flex items-center justify-center h-80 text-muted-foreground">No job data available</div>;
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={jobStatusData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {jobStatusData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50/30">
      {/* Sidebar */}
      <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileTopbar onMenu={() => setSidebarOpen(true)} />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-gray-600 mt-2">Welcome back! Here's what's happening today.</p>
              </div>
              {usingMockData && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded-md text-sm">
                  Using demo data
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
              trend="All registered users"
              description="Includes applicants, HR, and admins"
            />
            <StatCard
              title="Active Jobs"
              value={stats.activeJobs}
              icon={Briefcase}
              trend="Currently open positions"
              description="Jobs accepting applications"
            />
            <StatCard
              title="Total Applications"
              value={stats.totalApplications}
              icon={FileText}
              trend="All-time applications"
              description="Across all job postings"
            />
            <StatCard
              title="Pending Reviews"
              value={stats.pendingReviews}
              icon={TrendingUp}
              trend="Applications to review"
              description="Require attention"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Applications Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Applications Trend (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                {applicationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={applicationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="applications" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-80 text-muted-foreground">No application data available</div>
                )}
              </CardContent>
            </Card>

            {/* Job Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Job Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {renderPieChart()}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    <ActivityIcon type={activity.type} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {activity.action} - {activity.target}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
                {recentActivities.length === 0 && !loading && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent activity
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}