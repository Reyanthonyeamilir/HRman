'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  Briefcase, 
  Users, 
  FileText, 
  UserCheck,
  Plus,
  Menu,
  X
} from "lucide-react"
import { getCurrentUser, User } from '@/lib/applicant'
import { supabaseHR } from '@/lib/SupabaseHR'
import HRSidebar from '@/components/HRSidebar'

interface DashboardStats {
  totalApplicants: number
  activeCandidates: number
  openPositions: number
  pendingReviews: number
}

interface RecentActivity {
  id: string
  applicant_name: string
  job_title: string
  action: string
  timestamp: string
  status: string
}

export default function HRDashboardPage() {
  const router = useRouter()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalApplicants: 0,
    activeCandidates: 0,
    openPositions: 0,
    pendingReviews: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser()
      setCurrentUser(user)
      
      if (!user || !['hr', 'admin', 'super_admin'].includes(user.role)) {
        router.push('/unauthorized')
        return
      }
      
      await loadDashboardData()
    } catch (error) {
      console.error('Auth error:', error)
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsData, activityData] = await Promise.all([
        supabaseHR.getDashboardStats(),
        supabaseHR.getRecentActivity()
      ])
      
      setStats(statsData)
      setRecentActivity(activityData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Set safe fallback values
      setStats({
        totalApplicants: 0,
        activeCandidates: 0,
        openPositions: 0,
        pendingReviews: 0
      })
      setRecentActivity([])
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    { 
      title: "Total Applicants", 
      value: stats.totalApplicants, 
      icon: Users, 
      trend: "+12%",
      description: "All time applications"
    },
    { 
      title: "Active Candidates", 
      value: stats.activeCandidates, 
      icon: UserCheck, 
      trend: "+8%",
      description: "Last 30 days"
    },
    { 
      title: "Open Positions", 
      value: stats.openPositions, 
      icon: Briefcase, 
      trend: `${stats.openPositions} active`,
      description: "Currently hiring"
    },
    { 
      title: "Pending Reviews", 
      value: stats.pendingReviews, 
      icon: FileText, 
      trend: stats.pendingReviews > 0 ? "Urgent" : "Up to date",
      description: "Needs attention"
    },
  ]

  const quickActions = [
    { 
      href: "/hr/jobs", 
      icon: Briefcase, 
      title: "Manage Jobs", 
      desc: `${stats.openPositions} open positions` 
    },
    { 
      href: "/hr/tag", 
      icon: FileText, 
      title: "Review Apps", 
      desc: `${stats.pendingReviews} pending reviews` 
    },
    { 
      href: "/hr/candidates", 
      icon: Users, 
      title: "Candidates", 
      desc: `${stats.totalApplicants} total candidates` 
    },
    { 
      href: "/hr/jobs?create=new", 
      icon: Plus, 
      title: "New Job", 
      desc: "Create job posting" 
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'for_review':
        return 'bg-yellow-100 text-yellow-800'
      case 'shortlisted':
        return 'bg-blue-100 text-blue-800'
      case 'hired':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'for_review':
        return 'For Review'
      case 'shortlisted':
        return 'Shortlisted'
      case 'hired':
        return 'Hired'
      case 'rejected':
        return 'Rejected'
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <HRSidebar 
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 lg:ml-0 min-h-screen">
          <header className="sticky top-0 bg-white border-b border-slate-200 z-20">
            <div className="flex items-center justify-between p-4 lg:px-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                  className="lg:hidden"
                >
                  {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
                
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">HR Dashboard</h1>
                  <p className="text-slate-600 text-sm">
                    Welcome back{currentUser?.name ? `, ${currentUser.name}` : ''}!
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Link href="/hr/jobs?create=new">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    New Job
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          <div className="p-4 lg:p-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statsCards.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <div key={index} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
                        {loading ? (
                          <div className="h-8 w-20 bg-slate-200 rounded animate-pulse"></div>
                        ) : (
                          <p className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</p>
                        )}
                        <p className="text-xs text-slate-500">{stat.description}</p>
                      </div>
                      <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    {!loading && (
                      <div className={`text-xs font-medium mt-3 ${
                        stat.trend.includes('Urgent') && stat.value > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {stat.trend}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <Link key={index} href={action.href}>
                      <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                        <Icon className="h-5 w-5 mr-2" />
                        <div className="text-left">
                          <div className="font-medium">{action.title}</div>
                          <div className="text-blue-100 text-xs">{action.desc}</div>
                        </div>
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}