// app/dashboard/applicant/page.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, supabase } from '@/lib/supabaseClient'
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

// ==================== Development Helper ====================
const isDevelopment = process.env.NODE_ENV === 'development'

// ==================== Enhanced getCurrentUser with abort support ====================
const getCurrentUserWithAbort = async (signal?: AbortSignal) => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // Check if request was aborted
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    
    if (sessionError || !session) return null
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      
    // Check again after async operation
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    
    if (error) {
      // User exists but no profile - return basic user info
      return {
        profile: {
          id: session.user.id,
          email: session.user.email,
          first_name: 'User',
          last_name: '',
          role: 'applicant'
        },
        session
      }
    }
      
    return { profile, session }
  } catch (error: any) {
    // Only ignore abort errors in development
    if (isDevelopment && error.name === 'AbortError') {
      console.log('Development abort (expected in Strict Mode)')
      return null
    }
    
    // Re-throw real errors
    if (error.name !== 'AbortError') {
      throw error
    }
    
    return null
  }
}

// ==================== Authentication Hook ====================
const useAuth = () => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const checkAuth = useCallback(async () => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('New request started')
    }
    
    // Create new abort controller
    const controller = new AbortController()
    abortControllerRef.current = controller
    const signal = controller.signal

    try {
      if (!mountedRef.current) return null
      setLoading(true)
      setError(null)

      // Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (signal.aborted) {
        if (isDevelopment) console.log('Auth check aborted after session fetch')
        return null
      }
      
      if (sessionError) {
        throw new Error('Unable to verify your session')
      }
      
      if (!session) {
        if (!signal.aborted && mountedRef.current) {
          router.replace('/login')
        }
        return null
      }

      // Get user profile with abort support
      const userData = await getCurrentUserWithAbort(signal)
      
      if (signal.aborted) {
        if (isDevelopment) console.log('Auth check aborted during user fetch')
        return null
      }
      
      if (!userData) {
        throw new Error('Failed to load your profile')
      }

      // Check if profile exists
      const profile = userData.profile
      
      // Check role
      if (profile.role !== 'applicant') {
        if (!signal.aborted && mountedRef.current) {
          router.replace('/login?error=unauthorized')
        }
        return null
      }

      if (!signal.aborted && mountedRef.current) {
        setUser(profile)
      }
      return userData
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError' || signal.aborted) {
        return null
      }
      
      console.error('Auth error:', err)
      
      if (mountedRef.current) {
        setError(err.message || 'Authentication failed. Please try again.')
      }
      
      // Only redirect on auth-related errors
      if (!signal.aborted && mountedRef.current && 
          (err.message?.includes('session') || err.message?.includes('auth') || err.message?.includes('Unable'))) {
        setTimeout(() => {
          if (mountedRef.current) {
            router.replace('/login')
          }
        }, 3000)
      }
      return null
    } finally {
      if (!signal.aborted && mountedRef.current) {
        setTimeout(() => {
          if (mountedRef.current) {
            setLoading(false)
          }
        }, 100)
      }
    }
  }, [router])

  useEffect(() => {
    mountedRef.current = true
    
    let timeoutId: NodeJS.Timeout
    let authSubscription: any

    const initAuth = async () => {
      await checkAuth()
      
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mountedRef.current) return
          
          clearTimeout(timeoutId)
          
          timeoutId = setTimeout(async () => {
            if (event === 'SIGNED_OUT' && mountedRef.current) {
              router.replace('/login')
            } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && mountedRef.current) {
              await checkAuth()
            }
          }, 200) // Debounce to prevent rapid re-runs
        }
      )

      authSubscription = subscription
    }

    initAuth()

    return () => {
      mountedRef.current = false
      clearTimeout(timeoutId)
      
      // Clean up abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('Component unmounted')
      }
      
      // Clean up auth subscription
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [checkAuth, router])

  return { user, loading, error, refreshAuth: checkAuth }
}

// ==================== Loading Skeleton ====================
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
              <div className="h-3 w-24 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="h-9 w-20 bg-slate-200 rounded animate-pulse"></div>
        </div>
      </div>
      
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Welcome Banner Skeleton */}
        <div className="mb-8">
          <div className="h-32 bg-slate-200 rounded-2xl animate-pulse"></div>
        </div>
        
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
        
        {/* Content Skeleton */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-slate-200 rounded-lg animate-pulse"></div>
            <div className="h-96 bg-slate-200 rounded-lg animate-pulse"></div>
          </div>
          <div className="space-y-6">
            <div className="h-80 bg-slate-200 rounded-lg animate-pulse"></div>
            <div className="h-80 bg-slate-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ==================== StatCard Component ====================
interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ElementType;
  color?: 'blue' | 'green' | 'amber' | 'slate';
  href?: string;
  loading?: boolean;
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  color = 'blue',
  href,
  loading = false
}: StatCardProps) {
  const colorClasses = {
    blue: 'border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200',
    green: 'border-green-100 bg-green-50/50 hover:bg-green-50 hover:border-green-200',
    amber: 'border-amber-100 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-200',
    slate: 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200'
  }

  const iconColors = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    amber: 'text-amber-600 bg-amber-100',
    slate: 'text-slate-600 bg-slate-100'
  }

  const textColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    slate: 'text-slate-600'
  }

  const content = (
    <Card className={`border transition-all duration-200 ${colorClasses[color]} hover:shadow-sm group ${href ? 'cursor-pointer' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className={`p-2 rounded-lg ${iconColors[color]}`}>
                  <Icon className="w-4 h-4" />
                </div>
              )}
              <span className={`text-sm font-medium ${textColors[color]}`}>{title}</span>
            </div>
            <div className="space-y-1">
              {loading ? (
                <div className="h-8 w-20 bg-slate-200 rounded animate-pulse"></div>
              ) : (
                <div className="text-2xl font-bold text-slate-900">{value}</div>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500">{subtitle}</p>
              )}
            </div>
          </div>
          {href && (
            <div className="p-1 rounded-md bg-white group-hover:bg-slate-50 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block hover:no-underline">
        {content}
      </Link>
    )
  }

  return content
}

// ==================== Announcement Component ====================
interface AnnouncementProps {
  message: string;
  type?: 'info' | 'success' | 'warning';
  date?: string;
}

function Announcement({ 
  message, 
  type = 'info',
  date
}: AnnouncementProps) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800'
  }

  const icons = {
    info: Bell,
    success: CheckCircle,
    warning: AlertCircle
  }

  const Icon = icons[type]

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${styles[type]} transition-all hover:scale-[1.01]`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm leading-relaxed">{message}</p>
        {date && (
          <p className="text-xs opacity-75 mt-1">{date}</p>
        )}
      </div>
    </div>
  )
}

// ==================== NextStep Component ====================
interface NextStepProps {
  step: number;
  title: string;
  description: string;
  href: string;
  completed?: boolean;
}

function NextStep({ 
  step, 
  title, 
  description, 
  href,
  completed = false
}: NextStepProps) {
  return (
    <Link href={href} className="block hover:no-underline">
      <div className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-all group">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${completed ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'} flex items-center justify-center`}>
          {completed ? (
            <CheckCircle className="w-5 h-5 text-white" />
          ) : (
            <span className="text-white font-semibold text-sm">{step}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0 transition-colors" />
      </div>
    </Link>
  )
}

// ==================== ProfileInfo Component ====================
interface ProfileInfoProps {
  label: string;
  value: string;
  icon: React.ElementType;
  editable?: boolean;
  editHref?: string;
}

function ProfileInfo({ label, value, icon: Icon, editable = false, editHref }: ProfileInfoProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
      <Icon className="w-5 h-5 text-slate-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-medium text-slate-900 truncate">{value}</p>
      </div>
      {editable && editHref && (
        <Link 
          href={editHref}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap px-2 py-1 rounded hover:bg-blue-50 transition-colors"
        >
          Edit
        </Link>
      )}
    </div>
  )
}

// ==================== QuickActionButton Component ====================
interface QuickActionButtonProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  href: string;
}

function QuickActionButton({ icon: Icon, title, subtitle, href }: QuickActionButtonProps) {
  return (
    <Link href={href} className="block hover:no-underline">
      <Button 
        variant="outline" 
        className="w-full justify-start gap-3 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 h-12 transition-all group"
      >
        <Icon className="w-4 h-4" />
        <div className="text-left flex-1">
          <div className="font-medium">{title}</div>
          <div className="text-xs text-slate-500">{subtitle}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
      </Button>
    </Link>
  )
}

// ==================== MobileNavItem Component ====================
interface MobileNavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  isActive?: boolean;
}

function MobileNavItem({ icon: Icon, label, href, isActive = false }: MobileNavItemProps) {
  return (
    <Link 
      href={href} 
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
        isActive 
          ? 'bg-blue-50 text-blue-600' 
          : 'hover:bg-slate-50 text-slate-600'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs">{label}</span>
    </Link>
  )
}

// ==================== Error Display Component ====================
function AuthErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-slate-900">Authentication Required</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              {error || 'You need to be logged in to access this page.'}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            onClick={onRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm font-medium transition-all hover:shadow-md"
          >
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Retry Authentication
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/login')}
            className="border-slate-300 hover:bg-slate-50 py-3 text-sm font-medium"
          >
            Go to Login
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="text-slate-600 hover:text-slate-900 py-3 text-sm"
          >
            <Home className="w-4 h-4 mr-2" />
            Return to Homepage
          </Button>
        </div>
      </div>
    </div>
  )
}

// ==================== Main Dashboard Component ====================
export default function ApplicantDashboardPage() {
  const router = useRouter()
  const { user, loading, error, refreshAuth } = useAuth()
  const [stats, setStats] = useState({
    openJobs: 6,
    applications: 1,
    requirements: 'Draft'
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const mountedRef = useRef(true)

  // Fetch dashboard stats
  useEffect(() => {
    if (!user || error || !mountedRef.current) return

    const fetchStats = async () => {
      try {
        setStatsLoading(true)
        
        // Simulate API call - replace with actual fetch
        await new Promise(resolve => setTimeout(resolve, 300))
        
        if (!mountedRef.current) return
        
        // Here you would fetch actual stats from your API
        // For now, using mock data
        setStats({
          openJobs: 6,
          applications: 1,
          requirements: 'Draft'
        })
      } catch (err) {
        console.error('Error fetching stats:', err)
      } finally {
        if (mountedRef.current) {
          setStatsLoading(false)
        }
      }
    }

    fetchStats()

    return () => {
      mountedRef.current = false
    }
  }, [user, error])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
    }
  }

  // Show loading skeleton
  if (loading) {
    return <LoadingSkeleton />
  }

  // Show auth error
  if (error && !user) {
    return <AuthErrorDisplay error={error} onRetry={refreshAuth} />
  }

  // If no user (should redirect in useAuth hook)
  if (!user) {
    return null
  }

  // Main dashboard content
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
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
          <StatCard 
            title="Open Job Posts" 
            value={stats.openJobs.toString()} 
            subtitle="Updated today"
            icon={Briefcase}
            color="blue"
            href="/applicant/jobposting"
            loading={statsLoading}
          />
          <StatCard 
            title="Applications" 
            value={stats.applications.toString()} 
            subtitle="1 in review"
            icon={FileText}
            color="green"
            href="/applicant/track"
            loading={statsLoading}
          />
          <StatCard 
            title="Requirements" 
            value={stats.requirements} 
            subtitle="0 pending"
            icon={FileCheck}
            color="amber"
            href="/applicant/requirements"
            loading={statsLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
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
                <Announcement 
                  type="success"
                  message="New remote positions now available in Marketing department with flexible working hours"
                  date="2 hours ago"
                />
                <Announcement 
                  type="info"
                  message="Welcome to our new applicant portal! Complete your profile to get personalized job recommendations."
                  date="Yesterday"
                />
                <Announcement 
                  type="warning"
                  message="Application deadline for Technical Writer position is approaching. Submit your requirements by Friday."
                  date="3 days ago"
                />
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
                  <NextStep 
                    step={1}
                    title="View Instructions"
                    description="Learn about the application process and requirements"
                    href="/applicant/instructions"
                    completed={true}
                  />
                  
                  <NextStep 
                    step={2}
                    title="Browse Job Postings"
                    description="Find and apply for open positions"
                    href="/applicant/jobposting"
                    completed={true}
                  />
                  
                  <NextStep 
                    step={3}
                    title="Complete Profile"
                    description="Update your personal and professional information"
                    href="/applicant/profile"
                    completed={false}
                  />
                  
                  <NextStep 
                    step={4}
                    title="Submit Requirements"
                    description="Upload required documents for your applications"
                    href="/applicant/requirements"
                    completed={false}
                  />
                  
                  <NextStep 
                    step={5}
                    title="Track Applications"
                    description="Monitor the status of your submissions"
                    href="/applicant/track"
                    completed={false}
                  />
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Progress</p>
                      <p className="text-xs text-slate-500">2 of 5 steps completed</p>
                    </div>
                    <div className="text-sm font-semibold text-blue-600">40%</div>
                  </div>
                  <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full w-2/5"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 1/3 width */}
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
                <ProfileInfo 
                  label="Full Name"
                  value={`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Not set'}
                  icon={User}
                  editable={true}
                  editHref="/applicant/profile"
                />
                
                <ProfileInfo 
                  label="Email Address"
                  value={user?.email || 'Not set'}
                  icon={Mail}
                  editable={false}
                />
                
                <ProfileInfo 
                  label="Account Role"
                  value="Applicant"
                  icon={Shield}
                  editable={false}
                />
                
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
                <QuickActionButton 
                  icon={ClipboardList}
                  title="Application Instructions"
                  subtitle="Step-by-step guide"
                  href="/applicant/instructions"
                />
                
                <QuickActionButton 
                  icon={Briefcase}
                  title="Browse Jobs"
                  subtitle="Find open positions"
                  href="/applicant/jobposting"
                />
                
                <QuickActionButton 
                  icon={FileText}
                  title="My Applications"
                  subtitle="Track your submissions"
                  href="/applicant/track"
                />
                
                <QuickActionButton 
                  icon={FileCheck}
                  title="Requirements"
                  subtitle="Submit documents"
                  href="/applicant/requirements"
                />
                
                <QuickActionButton 
                  icon={BarChart}
                  title="Progress Dashboard"
                  subtitle="View statistics"
                  href="/applicant/track"
                />
              </CardContent>
            </Card>

            {/* Support Card */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                    <Bell className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-900">Need Help?</h4>
                    <p className="text-sm text-slate-600">
                      Our support team is here to assist you with any questions about the application process.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  >
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-2 md:hidden z-30 shadow-lg">
        <div className="flex justify-around">
          <MobileNavItem 
            icon={Home}
            label="Home"
            href="/"
            isActive={false}
          />
          <MobileNavItem 
            icon={Briefcase}
            label="Jobs"
            href="/applicant/jobposting"
            isActive={false}
          />
          <MobileNavItem 
            icon={FileText}
            label="Track"
            href="/applicant/track"
            isActive={false}
          />
          <MobileNavItem 
            icon={FileCheck}
            label="Docs"
            href="/applicant/requirements"
            isActive={false}
          />
          <MobileNavItem 
            icon={User}
            label="Profile"
            href="/applicant/profile"
            isActive={true}
          />
        </div>
      </div>
    </div>
  )
}