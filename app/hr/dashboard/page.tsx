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
  LogOut,
  Menu,
  X
} from "lucide-react"
import { getCurrentUser, User } from '@/lib/applicant' // Make sure User is imported
import HRSidebar from '@/components/HRSidebar'

export default function HRDashboardPage() {
  const router = useRouter()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null) // Fix: Add User type here
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser()
      setCurrentUser(user) // This should work now
      
      if (!user || !['hr', 'admin', 'super_admin'].includes(user.role)) {
        router.push('/unauthorized')
        return
      }
      
      setTimeout(() => setLoading(false), 500)
    } catch (error) {
      setLoading(false)
    }
  }

  const stats = [
    { title: "Total Applicants", value: 247, icon: Users, trend: "+12%" },
    { title: "Active Candidates", value: 156, icon: UserCheck, trend: "+8%" },
    { title: "Open Positions", value: 18, icon: Briefcase, trend: "12 active" },
    { title: "Pending Reviews", value: 23, icon: FileText, trend: "Urgent" },
  ]

  const quickActions = [
    { href: "/hr/jobs", icon: Briefcase, title: "Manage Jobs", desc: "View job postings" },
    { href: "/hr/tag", icon: FileText, title: "Review Apps", desc: "23 pending reviews" },
    { href: "/hr/candidates", icon: Users, title: "Candidates", desc: "Candidate database" },
    { href: "/hr/jobs?create=new", icon: Plus, title: "New Job", desc: "Create job posting" },
  ]

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
              {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <div key={index} className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
                        {loading ? (
                          <div className="h-8 w-20 bg-slate-200 rounded animate-pulse"></div>
                        ) : (
                          <p className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</p>
                        )}
                      </div>
                      <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    {!loading && (
                      <div className="text-xs font-medium mt-3 text-green-600">
                        {stat.trend}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <Link key={index} href={action.href}>
                      <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white">
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

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center space-x-4 p-3">
                        <div className="rounded-full bg-slate-200 h-10 w-10"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}