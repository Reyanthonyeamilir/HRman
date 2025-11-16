// app/admin/dashboard/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, supabase } from '@/lib/supabaseClient'
import AdminSidebar from '@/components/AdminSidebar'

interface UserData {
  id: string
  email?: string
  role?: string
  name: string
}

export default function AdminDashboard() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalApplications: 0,
    totalHRStaff: 0,
    pendingReviews: 0
  })
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
    loadStats()
  }, [])

  const checkUser = async () => {
    try {
      console.log('🔍 Checking user authentication for ADMIN dashboard...')
      setError(null)
      
      // First check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        throw new Error('Authentication failed')
      }

      if (!session) {
        console.log('❌ No session found, redirecting to login')
        router.push('/login')
        return
      }

      console.log('✅ Session found:', session.user.id)

      // Get current user with profile
      const currentUser = await getCurrentUser()
      
      console.log('👤 Current user:', currentUser)
      
      if (!currentUser) {
        console.log('❌ No user found, redirecting to login')
        router.push('/login')
        return
      }

      let userRole = currentUser.profile?.role
      let userEmail = currentUser.email
      let userName = currentUser.profile?.full_name || userEmail?.split('@')[0] || 'Super Admin'

      // If no profile exists, create one with super_admin role
      if (!currentUser.profile) {
        console.log('🆕 No profile found, creating profile...')
        
        // Determine role based on email
        if (userEmail?.includes('admin') || userEmail?.includes('super')) {
          userRole = 'super_admin'
        } else {
          userRole = 'applicant'
        }

        // Create profile
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: currentUser.id,
            email: userEmail,
            role: userRole,
            full_name: userName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          console.error('❌ Profile creation error:', createError)
          throw new Error('Failed to create user profile')
        }

        console.log('✅ Profile created:', newProfile)
        userRole = newProfile?.role
      }

      console.log('🎭 Final user role:', userRole)

      // ONLY allow super_admin to access admin dashboard
      if (userRole !== 'super_admin') {
        console.log('🚫 User role not super_admin:', userRole)
        // Redirect to appropriate dashboard based on role
        if (userRole === 'hr') {
          router.push('/hr/dashboard')
        } else {
          router.push('/applicant/dashboard')
        }
        return
      }

      console.log('✅ User is super_admin, setting user data')
      setUser({
        id: currentUser.id,
        email: userEmail,
        role: userRole,
        name: userName
      })

      // Update localStorage with correct role
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_role', 'super_admin')
        localStorage.setItem('user_id', currentUser.id)
        localStorage.setItem('applicant_email', userEmail || '')
        localStorage.setItem('applicant_name', userName)
      }

    } catch (error: any) {
      console.error('❌ Error in checkUser:', error)
      setError(error.message || 'Failed to authenticate user')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      setError(null)
      console.log('📊 Loading dashboard statistics...')

      // Get total users (excluding super_admin)
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'super_admin')

      if (usersError) {
        console.error('Users count error:', usersError)
      }

      // Get total applications
      const { count: totalApplications, error: appsError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      if (appsError) {
        console.error('Applications count error:', appsError)
      }

      // Get HR staff count
      const { count: totalHRStaff, error: hrError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'hr')

      if (hrError) {
        console.error('HR staff count error:', hrError)
      }

      // Get pending reviews
      const { count: pendingReviews, error: pendingError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      if (pendingError) {
        console.error('Pending reviews count error:', pendingError)
      }

      setStats({
        totalUsers: totalUsers || 0,
        totalApplications: totalApplications || 0,
        totalHRStaff: totalHRStaff || 0,
        pendingReviews: pendingReviews || 0
      })

      console.log('✅ Stats loaded successfully')

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
        localStorage.removeItem('applicant_name')
        localStorage.removeItem('applicant_email')
        localStorage.removeItem('user_role')
        localStorage.removeItem('user_id')
      }
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      setError('Failed to logout')
    }
  }

  const handleManageUsers = () => {
    router.push('/admin/users')
  }

  const handleViewApplications = () => {
    router.push('/admin/applications')
  }

  const handleSystemSettings = () => {
    router.push('/admin/settings')
  }

  const handleReports = () => {
    router.push('/admin/reports')
  }

  const refreshStats = () => {
    loadStats()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Super Admin Dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">Checking super admin permissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-lg border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex items-center space-x-4">
                <div className="bg-blue-600 p-2 rounded-lg hidden sm:block">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
                  <p className="text-gray-600 text-sm">Welcome back, {user?.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-gray-600">Logged in as</p>
                  <p className="font-semibold text-gray-900">{user?.email}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-300 hidden sm:inline-block">
                  SUPER ADMIN
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 shadow-md text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Stats Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Overview</h2>
            <button
              onClick={refreshStats}
              disabled={statsLoading}
              className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <svg 
                className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Total Users Card */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700">Total Users</h3>
                  {statsLoading ? (
                    <div className="animate-pulse bg-gray-200 h-6 sm:h-8 w-12 sm:w-16 rounded mt-2"></div>
                  ) : (
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-2">{stats.totalUsers}</p>
                  )}
                </div>
                <div className="bg-blue-100 p-2 sm:p-3 rounded-full">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">Registered users in system</p>
            </div>
            
            {/* Applications Card */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700">Applications</h3>
                  {statsLoading ? (
                    <div className="animate-pulse bg-gray-200 h-6 sm:h-8 w-12 sm:w-16 rounded mt-2"></div>
                  ) : (
                    <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-2">{stats.totalApplications}</p>
                  )}
                </div>
                <div className="bg-green-100 p-2 sm:p-3 rounded-full">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">Total job applications</p>
            </div>
            
            {/* HR Staff Card */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700">HR Staff</h3>
                  {statsLoading ? (
                    <div className="animate-pulse bg-gray-200 h-6 sm:h-8 w-12 sm:w-16 rounded mt-2"></div>
                  ) : (
                    <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-2">{stats.totalHRStaff}</p>
                  )}
                </div>
                <div className="bg-purple-100 p-2 sm:p-3 rounded-full">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">HR team members</p>
            </div>

            {/* Pending Reviews Card */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-orange-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700">Pending Reviews</h3>
                  {statsLoading ? (
                    <div className="animate-pulse bg-gray-200 h-6 sm:h-8 w-12 sm:w-16 rounded mt-2"></div>
                  ) : (
                    <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-2">{stats.pendingReviews}</p>
                  )}
                </div>
                <div className="bg-orange-100 p-2 sm:p-3 rounded-full">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">Applications awaiting review</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <button
                onClick={handleManageUsers}
                className="bg-blue-600 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span className="font-semibold">Manage Users</span>
              </button>
              
              <button
                onClick={handleViewApplications}
                className="bg-green-600 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-semibold">View Applications</span>
              </button>
              
              <button
                onClick={handleSystemSettings}
                className="bg-purple-600 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2 shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-semibold">System Settings</span>
              </button>
              
              <button
                onClick={handleReports}
                className="bg-orange-600 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2 shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-semibold">Reports</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Activity</h3>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All Activity
              </button>
            </div>
            <div className="text-center py-6 sm:py-8">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-sm sm:text-base">No recent activity to display</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-2">Activity will appear here as users interact with the system</p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
              <p className="text-gray-500 text-sm">
                NORSU HRM System • Super Admin Dashboard
              </p>
              <p className="text-gray-500 text-sm">
                {new Date().getFullYear()} • All rights reserved
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}