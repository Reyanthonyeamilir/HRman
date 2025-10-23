'use client'
import React, { useState, useEffect } from 'react'
import AdminSidebar, { MobileTopbar } from '@/components/AdminSidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Users, Briefcase, FileText, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

// Mock data for charts
const applicationData = [
  { month: 'Jan', applications: 45 },
  { month: 'Feb', applications: 52 },
  { month: 'Mar', applications: 48 },
  { month: 'Apr', applications: 67 },
  { month: 'May', applications: 72 },
  { month: 'Jun', applications: 65 },
]

const jobStatusData = [
  { name: 'Active', value: 12 },
  { name: 'Closed', value: 8 },
  { name: 'Draft', value: 3 },
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28']

const recentActivities = [
  { id: 1, action: 'New job posted', target: 'Senior Developer', time: '2 hours ago', type: 'success' },
  { id: 2, action: 'Application received', target: 'Frontend Position', time: '4 hours ago', type: 'info' },
  { id: 3, action: 'User registered', target: 'john@example.com', time: '6 hours ago', type: 'info' },
  { id: 4, action: 'Job closed', target: 'Intern Position', time: '1 day ago', type: 'warning' },
]

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeJobs: 0,
    totalApplications: 0,
    pendingReviews: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch dashboard stats
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // In a real app, you would fetch this from your API
      setStats({
        totalUsers: 156,
        activeJobs: 12,
        totalApplications: 289,
        pendingReviews: 23
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600 mt-2">Welcome back! Here's what's happening today.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
              trend="+12% from last month"
              description="All registered users"
            />
            <StatCard
              title="Active Jobs"
              value={stats.activeJobs}
              icon={Briefcase}
              trend="3 new this week"
              description="Currently open positions"
            />
            <StatCard
              title="Total Applications"
              value={stats.totalApplications}
              icon={FileText}
              trend="+8% from last month"
              description="All-time applications"
            />
            <StatCard
              title="Pending Reviews"
              value={stats.pendingReviews}
              icon={TrendingUp}
              trend="5 urgent"
              description="Require immediate attention"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Applications Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Applications Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={applicationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="applications" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Job Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Job Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={jobStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}