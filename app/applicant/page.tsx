// app/dashboard/applicant/page.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  Loader2, 
  LogOut, 
  User, 
  Mail, 
  Shield,
  Briefcase,
  FileText,
  Bell,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  ClipboardList,
  MapPin,
  BarChart,
  Home,
  FileCheck,
  Lock
} from 'lucide-react'
import Link from 'next/link'

export default function ApplicantDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    openJobs: 6,
    applications: 1,
    requirements: 'Draft'
  })
  const [statsLoading, setStatsLoading] = useState(true)

  // Simple auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!profile) {
          router.push('/login')
          return
        }

        if (profile.role !== 'applicant') {
          router.push('/login')
          return
        }

        setUser(profile)
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Fetch dashboard stats
  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      try {
        setStatsLoading(true)
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Mock data - replace with actual API calls
        setStats({
          openJobs: 6,
          applications: 1,
          requirements: 'Draft'
        })
      } catch (err) {
        console.error('Error fetching stats:', err)
      } finally {
        setStatsLoading(false)
      }
    }

    fetchStats()
  }, [user])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
    }
  }

  // Show loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // If no user
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header - Simplified */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3 md:px-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              {user?.first_name?.[0] && user?.last_name?.[0] ? (
                <span className="text-white font-semibold text-sm">
                  {user.first_name[0]}{user.last_name[0]}
                </span>
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 leading-tight">
                Welcome back, {user?.first_name || 'Applicant'}
              </h1>
              <p className="text-xs text-slate-500">Ready to continue your journey</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-blue-700">Applicant</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Welcome Banner */}
        <div className="mb-6 md:mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100/30 border border-blue-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/80 rounded-full border border-blue-200">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Secure Applicant Portal</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                  Applicant Dashboard
                </h1>
                <p className="text-slate-600 text-sm md:text-base max-w-2xl">
                  Track your applications, submit requirements, and manage your job search journey all in one place.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="border border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200 rounded-xl p-5 transition-all duration-200 hover:shadow-sm group cursor-pointer">
            <Link href="/applicant/job-postings" className="block hover:no-underline">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-blue-600">Open Job Posts</span>
                  </div>
                  <div className="space-y-1">
                    {statsLoading ? (
                      <div className="h-8 w-20 bg-slate-200 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-2xl font-bold text-slate-900">{stats.openJobs}</div>
                    )}
                    <p className="text-xs text-slate-500">Updated today</p>
                  </div>
                </div>
                <div className="p-1 rounded-md bg-white group-hover:bg-slate-50 transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                </div>
              </div>
            </Link>
          </div>

          <div className="border border-green-100 bg-green-50/50 hover:bg-green-50 hover:border-green-200 rounded-xl p-5 transition-all duration-200 hover:shadow-sm group cursor-pointer">
            <Link href="/applicant/track" className="block hover:no-underline">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 text-green-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-green-600">Applications</span>
                  </div>
                  <div className="space-y-1">
                    {statsLoading ? (
                      <div className="h-8 w-20 bg-slate-200 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-2xl font-bold text-slate-900">{stats.applications}</div>
                    )}
                    <p className="text-xs text-slate-500">1 in review</p>
                  </div>
                </div>
                <div className="p-1 rounded-md bg-white group-hover:bg-slate-50 transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                </div>
              </div>
            </Link>
          </div>

          <div className="border border-amber-100 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-200 rounded-xl p-5 transition-all duration-200 hover:shadow-sm group cursor-pointer">
            <Link href="/applicant/requirements" className="block hover:no-underline">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-amber-600">Requirements</span>
                  </div>
                  <div className="space-y-1">
                    {statsLoading ? (
                      <div className="h-8 w-20 bg-slate-200 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-2xl font-bold text-slate-900">{stats.requirements}</div>
                    )}
                    <p className="text-xs text-slate-500">0 pending</p>
                  </div>
                </div>
                <div className="p-1 rounded-md bg-white group-hover:bg-slate-50 transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Announcements */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <span>Latest Announcements</span>
                  </CardTitle>
                  <Link 
                    href="/applicant/instructions" 
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    View all
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-green-50 border-green-200 text-green-800">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">New remote positions now available in Marketing department with flexible working hours</p>
                    <p className="text-xs opacity-75 mt-1">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-blue-50 border-blue-200 text-blue-800">
                  <Bell className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">Welcome to our new applicant portal! Complete your profile to get personalized job recommendations.</p>
                    <p className="text-xs opacity-75 mt-1">Yesterday</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-amber-50 border-amber-200 text-amber-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">Application deadline for Technical Writer position is approaching. Submit your requirements by Friday.</p>
                    <p className="text-xs opacity-75 mt-1">3 days ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Application Journey */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                  </div>
                  <span>Your Application Journey</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Link href="/applicant/instructions" className="block hover:no-underline">
                    <div className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-all group">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">View Instructions</p>
                        <p className="text-xs text-slate-500 mt-0.5">Learn about the application process and requirements</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0 transition-colors" />
                    </div>
                  </Link>
                  
                  <Link href="/applicant/job-postings" className="block hover:no-underline">
                    <div className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-all group">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">Browse Job Postings</p>
                        <p className="text-xs text-slate-500 mt-0.5">Find and apply for open positions</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0 transition-colors" />
                    </div>
                  </Link>
                  
                  <Link href="/applicant/profile" className="block hover:no-underline">
                    <div className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-all group">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">3</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">Complete Profile</p>
                        <p className="text-xs text-slate-500 mt-0.5">Update your personal and professional information</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0 transition-colors" />
                    </div>
                  </Link>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Progress</p>
                      <p className="text-xs text-slate-500">2 of 3 steps completed</p>
                    </div>
                    <div className="text-sm font-semibold text-blue-600">67%</div>
                  </div>
                  <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full w-2/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <span>Profile Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <User className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Full Name</p>
                    <p className="font-medium text-slate-900 truncate">
                      {`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Not set'}
                    </p>
                  </div>
                  <Link 
                    href="/applicant/profile"
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  >
                    Edit
                  </Link>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <Mail className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Email Address</p>
                    <p className="font-medium text-slate-900 truncate">{user?.email || 'Not set'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <Shield className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Account Role</p>
                    <p className="font-medium text-slate-900 truncate">Applicant</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <Link 
                    href="/applicant/profile" 
                    className="w-full flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 py-2 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Complete Your Profile
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <Link href="/applicant/instructions" className="block hover:no-underline">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 h-12 transition-all group"
                  >
                    <ClipboardList className="w-4 h-4" />
                    <div className="text-left flex-1">
                      <div className="font-medium">Application Instructions</div>
                      <div className="text-xs text-slate-500">Step-by-step guide</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </Button>
                </Link>
                
                <Link href="/applicant/job-postings" className="block hover:no-underline">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 h-12 transition-all group"
                  >
                    <Briefcase className="w-4 h-4" />
                    <div className="text-left flex-1">
                      <div className="font-medium">Browse Jobs</div>
                      <div className="text-xs text-slate-500">Find open positions</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </Button>
                </Link>
                
                <Link href="/applicant/track" className="block hover:no-underline">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 h-12 transition-all group"
                  >
                    <FileText className="w-4 h-4" />
                    <div className="text-left flex-1">
                      <div className="font-medium">My Applications</div>
                      <div className="text-xs text-slate-500">Track your submissions</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </Button>
                </Link>
                
                <Link href="/applicant/requirements" className="block hover:no-underline">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 h-12 transition-all group"
                  >
                    <FileCheck className="w-4 h-4" />
                    <div className="text-left flex-1">
                      <div className="font-medium">Requirements</div>
                      <div className="text-xs text-slate-500">Submit documents</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}