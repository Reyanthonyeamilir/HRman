// app/administrator/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  Users, 
  FileText, 
  UserCheck, 
  Clock,
  Shield,
  Briefcase,
  Building,
  RefreshCw,
  LogOut,
  AlertCircle,
  CheckCircle,
  TrendingUp
} from 'lucide-react'
import AdminHRSidebar from '@/components/adminhrsidebar'
import { MobileTopbar } from '@/components/adminhrsidebar'

interface UserData {
  id: string
  email: string
  role: 'applicant' | 'hr' | 'super_admin'
  name: string
  first_name?: string | null
  last_name?: string | null
}

export default function AdministratorDashboard() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalApplications: 0,
    totalHRStaff: 0,
    pendingReviews: 0,
    activeJobs: 0,
    hiredCandidates: 0
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
    loadStats()
  }, [])

  const checkUser = async () => {
    try {
      console.log('🔐 Checking user authentication...')
      setError(null)
      setSuccess(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log('⚠️ No session found, redirecting to login')
        router.push('/login')
        return
      }

      console.log('✅ User authenticated:', session.user.email)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        console.error('❌ Profile error:', profileError)
        router.push('/login')
        return
      }

      // ONLY ALLOW HR AND SUPER_ADMIN
      if (profile.role !== 'hr' && profile.role !== 'super_admin') {
        console.log('🚫 User role not authorized:', profile.role)
        setError('You do not have permission to access this dashboard')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
        return
      }

      const userData: UserData = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        name: profile.first_name 
          ? `${profile.first_name} ${profile.last_name || ''}`.trim()
          : profile.email.split('@')[0],
        first_name: profile.first_name,
        last_name: profile.last_name
      }
      
      setUser(userData)
      setSuccess(`Welcome back ${userData.name}! You are logged in as ${userData.role === 'super_admin' ? 'Super Administrator' : 'HR Manager'}`)

    } catch (error: any) {
      console.error('❌ Error in checkUser:', error)
      setError(error.message || 'Failed to authenticate user')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      
      // Get total users (excluding super_admin)
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'super_admin')

      // Get total applications
      const { count: totalApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      // Get HR staff count
      const { count: totalHRStaff } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'hr')

      // Get pending reviews
      const { count: pendingReviews } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'for_review')

      // Get active jobs
      const { count: activeJobs } = await supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Get hired candidates
      const { count: hiredCandidates } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'hired')

      setStats({
        totalUsers: totalUsers || 0,
        totalApplications: totalApplications || 0,
        totalHRStaff: totalHRStaff || 0,
        pendingReviews: pendingReviews || 0,
        activeJobs: activeJobs || 0,
        hiredCandidates: hiredCandidates || 0
      })

    } catch (error) {
      console.error('❌ Error loading stats:', error)
      setError('Failed to load dashboard statistics')
    } finally {
      setStatsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      setError(null)
      await supabase.auth.signOut()
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_role')
        localStorage.removeItem('user_id')
      }
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      setError('Failed to logout')
    }
  }

  const refreshStats = () => {
    loadStats()
    setSuccess('Statistics refreshed successfully!')
    setTimeout(() => setSuccess(null), 3000)
  }

  const getDashboardTitle = () => {
    if (user?.role === 'super_admin') {
      return 'Super Admin Dashboard'
    } else if (user?.role === 'hr') {
      return 'HR Manager Dashboard'
    }
    return 'Dashboard'
  }

  const getRoleBadge = () => {
    if (user?.role === 'super_admin') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
          <Shield className="w-3 h-3 mr-1" />
          Super Administrator
        </span>
      )
    } else if (user?.role === 'hr') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
          <Briefcase className="w-3 h-3 mr-1" />
          HR Manager
        </span>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading Dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">Checking your permissions...</p>
        </div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6 border border-red-200">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Access Denied</h2>
            <p className="text-gray-600 text-center mb-6">{error}</p>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">Redirecting you to login...</p>
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar included directly in page */}
      <AdminHRSidebar 
        mobileOpen={sidebarOpen} 
        onMobileClose={() => setSidebarOpen(false)} 
      />
      
      {/* Mobile Topbar */}
      <MobileTopbar onMenu={() => setSidebarOpen(true)} />
      
      {/* Main Content - COMPACT LAYOUT */}
      <main className="lg:ml-64 h-screen overflow-hidden">
        <div className="h-full p-4 md:p-6 flex flex-col">
          
          {/* COMPACT HEADER */}
          <div className="mb-4 flex-shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">{getDashboardTitle()}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {getRoleBadge()}
                  <p className="text-sm text-gray-600">
                    Welcome, <span className="font-semibold text-gray-800">{user?.name}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshStats}
                  disabled={statsLoading}
                  className="inline-flex items-center px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${statsLoading ? 'animate-spin' : ''}`} />
                  {statsLoading ? 'Refreshing...' : 'Refresh'}
                </button>
                
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* COMPACT MESSAGES */}
          {error && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 flex-shrink-0">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3 flex-shrink-0">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

          {/* COMPACT STATS GRID - 2x3 layout */}
          <div className="mb-4 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Overview</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Total Users */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats.totalUsers}
                  </span>
                </div>
                <h3 className="text-xs font-medium text-gray-600">Total Users</h3>
              </div>

              {/* Applications */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <FileText className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats.totalApplications}
                  </span>
                </div>
                <h3 className="text-xs font-medium text-gray-600">Applications</h3>
              </div>

              {/* HR Staff */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <UserCheck className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats.totalHRStaff}
                  </span>
                </div>
                <h3 className="text-xs font-medium text-gray-600">HR Staff</h3>
              </div>

              {/* Pending Reviews */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats.pendingReviews}
                  </span>
                </div>
                <h3 className="text-xs font-medium text-gray-600">Pending Reviews</h3>
              </div>

              {/* Active Jobs */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Briefcase className="h-4 w-4 text-indigo-600" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats.activeJobs}
                  </span>
                </div>
                <h3 className="text-xs font-medium text-gray-600">Active Jobs</h3>
              </div>

              {/* Hired Candidates */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats.hiredCandidates}
                  </span>
                </div>
                <h3 className="text-xs font-medium text-gray-600">Hired</h3>
              </div>
            </div>
          </div>

          {/* COMPACT WELCOME MESSAGE - Removed Quick Actions and expanded this section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 flex-grow overflow-auto">
            <div className="h-full flex flex-col">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  {user?.role === 'super_admin' ? 'Super Admin Dashboard' : 'HR Manager Dashboard'}
                </h2>
                <p className="text-sm text-gray-700 mb-4">
                  {user?.role === 'super_admin' 
                    ? 'As a Super Administrator, you have full access to manage all aspects of the NORSU HR system. Use the sidebar to navigate between different management sections.'
                    : 'Welcome to the HR Management Dashboard. Use the sidebar navigation to access candidate profiles, job applications, job postings, and other HR management tools.'
                  }
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Building className="w-3 h-3 mr-1" />
                    NORSU HR System
                  </span>
                  {user?.role === 'super_admin' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      <Shield className="w-3 h-3 mr-1" />
                      Full System Access
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {stats.totalApplications} Total Applications
                  </span>
                </div>
              </div>

              {/* Key Features */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {user?.role === 'super_admin' ? 'System Management Areas' : 'Key Features'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user?.role === 'super_admin' ? (
                    <>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center mb-2">
                          <Users className="h-5 w-5 text-blue-600 mr-2" />
                          <h4 className="font-medium text-gray-900">User Management</h4>
                        </div>
                        <p className="text-sm text-gray-600">Add and manage system users, HR staff, and administrators</p>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center mb-2">
                          <FileText className="h-5 w-5 text-green-600 mr-2" />
                          <h4 className="font-medium text-gray-900">Applications</h4>
                        </div>
                        <p className="text-sm text-gray-600">Review and manage all job applications across the system</p>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center mb-2">
                          <Briefcase className="h-5 w-5 text-indigo-600 mr-2" />
                          <h4 className="font-medium text-gray-900">Job Postings</h4>
                        </div>
                        <p className="text-sm text-gray-600">Create, edit, and manage job postings and listings</p>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center mb-2">
                          <Shield className="h-5 w-5 text-purple-600 mr-2" />
                          <h4 className="font-medium text-gray-900">System Settings</h4>
                        </div>
                        <p className="text-sm text-gray-600">Configure system parameters and security settings</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center mb-2">
                          <Users className="h-5 w-5 text-blue-600 mr-2" />
                          <h4 className="font-medium text-gray-900">Candidate Profiles</h4>
                        </div>
                        <p className="text-sm text-gray-600">Browse and review candidate information and profiles</p>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center mb-2">
                          <FileText className="h-5 w-5 text-green-600 mr-2" />
                          <h4 className="font-medium text-gray-900">Application Review</h4>
                        </div>
                        <p className="text-sm text-gray-600">Process and evaluate job applications efficiently</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* User Info - at bottom */}
              <div className="mt-auto pt-4 border-t border-blue-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Logged in as:</span> {user?.email}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Role:</span> {user?.role === 'super_admin' ? 'Super Administrator' : 'HR Manager'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {new Date().toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      NORSU Human Resources Management System
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}