// app/dashboard/applicant/page.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, supabase } from '@/lib/supabaseClient'

// StatCard component
function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card className="border-blue-100 hover:border-blue-300 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-slate-900">{value}</div>
        {subtitle && <div className="mt-1 text-xs text-blue-600">{subtitle}</div>}
        <Button variant="link" className="px-0 text-xs text-blue-600 hover:text-blue-800">
          View
        </Button>
      </CardContent>
    </Card>
  )
}

export default function ApplicantDashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    checkUserRole()
  }, [])

  const checkUserRole = async () => {
    try {
      setIsLoading(true)
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // No session, redirect to login
        router.push('/login')
        return
      }

      // Get user profile using your existing function
      const user = await getCurrentUser()
      
      if (!user || !user.profile) {
        console.error('Error fetching profile')
        router.push('/login')
        return
      }

      // Check if user is an applicant
      if (user.profile.role !== 'applicant') {
        // User is NOT an applicant (admin or hr)
        // Redirect to login with error message
        router.push('/login?error=wrong_role')
        return
      }

      // User IS an applicant - allow access
      setProfile(user.profile)
      
    } catch (error) {
      console.error('Authentication error:', error)
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Checking access permissions...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    // This shouldn't show if redirects work properly
    return null
  }

  // Show applicant dashboard
  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Applicant Dashboard</h1>
            <p className="text-slate-600 mt-1">Welcome back, {profile.first_name || 'Applicant'}!</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-700">Applicant Access</span>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-slate-300 hover:bg-slate-50"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Access Notice - Only for applicants */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-blue-800 font-medium">Applicant-Only Dashboard</p>
              <p className="text-sm text-blue-700 mt-1">
                This area is exclusively for job applicants. Admin and HR users cannot access this page.
                Your role is: <span className="font-bold">applicant</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Open Job Posts" value="6" subtitle="Updated today" />
        <StatCard title="Applications" value="1" subtitle="1 in review" />
        <StatCard title="Requirements" value="Draft" subtitle="0 pending" />
        
        <Card className="border-blue-100 xl:col-span-2">
          <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Welcome! Check new postings and complete your requirements.
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  New remote positions now available in Marketing department
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-100">
          <CardHeader><CardTitle>Next Steps</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 mb-4">
              Finish your profile, then submit requirements for your selected position.
            </p>
           
          </CardContent>
        </Card>
      </div>

      {/* Profile Info */}
      <Card className="mt-8 border-blue-100">
        <CardHeader>
          <CardTitle className="text-lg">Your Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-500">Name</p>
              <p className="font-medium">
                {profile.first_name} {profile.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Role</p>
              <p className="font-medium">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {profile.role}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}