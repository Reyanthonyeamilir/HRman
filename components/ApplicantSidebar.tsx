'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Menu, LayoutDashboard, Briefcase, ClipboardList, 
  Compass, X, Mail, User as UserIcon, LogOut, User,
  FileText, Bell, Home,
  BookOpen,
  FileCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getCurrentUser, signOut, supabase } from '@/lib/supabaseClient'

// Links for sidebar
const links = [
  { label: 'Instructions', href: '/applicant/instructions', icon: BookOpen },
  { label: 'Profile', href: '/applicant/profile', icon: User },
  { label: 'Dashboard', href: '/applicant', icon: LayoutDashboard },
  { label: 'Apply Job', href: '/applicant/job-postings', icon: Briefcase },
  { label: 'Requirements', href: '/applicant/requirements', icon: ClipboardList },
  { label: 'Track Application', href: '/applicant/track', icon: FileCheck },
  { label: 'Notifications', href: '/notifications', icon: Bell },
]

// Mobile links
const mobileLinks = [
  { label: 'Home', href: '/applicant', icon: Home },
  { label: 'Jobs', href: '/applicant/job-postings', icon: Briefcase },
  { label: 'Guide', href: '/applicant/instructions', icon: BookOpen },
  { label: 'Track', href: '/applicant/track', icon: FileCheck },
  { label: 'Profile', href: '/applicant/profile', icon: User },
  { label: 'Notifications', href: '/notifications', icon: Bell },
]

type UserProfile = {
  name: string
  email: string
  avatarUrl: string | null
}

function useApplicantProfile() {
  const [profile, setProfile] = React.useState<UserProfile>({ 
    name: 'Applicant', 
    email: 'Loading...',
    avatarUrl: null
  })
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  
  React.useEffect(() => {
    let mounted = true
    let channel: any = null

    const loadUserProfile = async () => {
      try {
        setLoading(true)
        
        const storedName = localStorage.getItem('applicant_name')
        const storedEmail = localStorage.getItem('applicant_email')
        const storedAvatar = localStorage.getItem('applicant_avatar')
        
        if (storedName && storedEmail && mounted) {
          setProfile({
            name: storedName,
            email: storedEmail,
            avatarUrl: storedAvatar
          })
        }

        const user = await getCurrentUser()
        if (!mounted) return
        
        if (user?.email) {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url, email')
            .eq('id', user.id)
            .single()

          if (error && mounted) {
            console.error('Error fetching profile:', error)
            const userName = user.email.split('@')[0] || 'Applicant'
            setProfile({
              name: userName,
              email: user.email,
              avatarUrl: null
            })
            localStorage.setItem('applicant_name', userName)
            localStorage.setItem('applicant_email', user.email)
            localStorage.removeItem('applicant_avatar')
          } else if (profileData && mounted) {
            const displayName = profileData.first_name && profileData.last_name 
              ? `${profileData.first_name} ${profileData.last_name}`
              : profileData.first_name || profileData.last_name || user.email.split('@')[0] || 'Applicant'
            
            let avatarUrl = null
            if (profileData.avatar_url) {
              if (profileData.avatar_url.startsWith('http')) {
                avatarUrl = profileData.avatar_url
              } else {
                const filePath = profileData.avatar_url.startsWith('/') 
                  ? profileData.avatar_url.slice(1) 
                  : profileData.avatar_url
                
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
                
                if (supabaseUrl) {
                  if (filePath.includes('storage/v1/object/public/')) {
                    avatarUrl = filePath
                  } else {
                    if (filePath.includes('/')) {
                      avatarUrl = `${supabaseUrl}/storage/v1/object/public/profile/${filePath}`
                    } else {
                      avatarUrl = `${supabaseUrl}/storage/v1/object/public/profile/${filePath}`
                    }
                  }
                }
              }
            }
            
            if (mounted) {
              setProfile({
                name: displayName,
                email: profileData.email || user.email || 'user@norsu.edu.ph',
                avatarUrl: avatarUrl
              })
              
              localStorage.setItem('applicant_name', displayName)
              localStorage.setItem('applicant_email', profileData.email || user.email || '')
              if (avatarUrl) {
                localStorage.setItem('applicant_avatar', avatarUrl)
              } else {
                localStorage.removeItem('applicant_avatar')
              }
            }

            // Fetch unread notifications count
            if (mounted) {
              const { count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false)

              setUnreadCount(count || 0)

              // Set up real-time subscription for notifications
              channel = supabase
                .channel(`notifications-sidebar-${user.id}`)
                .on(
                  'postgres_changes',
                  {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                  },
                  () => {
                    if (mounted) {
                      setUnreadCount(prev => prev + 1)
                    }
                  }
                )
                .on(
                  'postgres_changes',
                  {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                  },
                  (payload) => {
                    if (mounted && payload.new.is_read === true && payload.old.is_read === false) {
                      setUnreadCount(prev => Math.max(0, prev - 1))
                    }
                  }
                )
                .subscribe()
            }
          }
        }
      } catch (error) {
        console.error('Error in loadUserProfile:', error)
        if (mounted) {
          const storedName = localStorage.getItem('applicant_name')
          const storedEmail = localStorage.getItem('applicant_email')
          const storedAvatar = localStorage.getItem('applicant_avatar')
          
          setProfile({
            name: storedName || 'Applicant',
            email: storedEmail || 'user@norsu.edu.ph',
            avatarUrl: storedAvatar
          })
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadUserProfile()

    return () => {
      mounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])
  
  return { profile, loading, unreadCount }
}

// FIXED: Proper active link detection
function isActiveLink(pathname: string, href: string) {
  // Special case for dashboard
  if (href === '/applicant') {
    return pathname === '/applicant' || pathname === '/applicant/dashboard'
  }
  
  // For other links, check exact match or subpaths
  if (href === '/notifications') {
    return pathname === href
  }
  
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { unreadCount } = useApplicantProfile()
  
  return (
    <nav className="p-3">
      <ul className="space-y-1">
        {links.map(({ label, href, icon: Icon }) => {
          const active = isActiveLink(pathname, href)
          const isNotifications = href === '/notifications'
          
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all duration-200',
                  'hover:bg-blue-700 hover:text-white group',
                  active ? 'bg-blue-600 text-white' : 'text-gray-200'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-4" />
                  <span>{label}</span>
                </div>
                {isNotifications && unreadCount > 0 && (
                  <span className={cn(
                    "flex items-center justify-center h-5 min-w-5 px-1 text-xs font-semibold rounded-full",
                    active ? "bg-white text-blue-600" : "bg-red-500 text-white"
                  )}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function MobileNavBar() {
  const pathname = usePathname()
  const { unreadCount } = useApplicantProfile()
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-blue-800 bg-[#0b1b3b] md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileLinks.map(({ label, href, icon: Icon }) => {
          const active = isActiveLink(pathname, href)
          
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center justify-center w-16 py-2 transition-all duration-200 rounded-lg',
                'hover:bg-blue-700/30',
                active ? 'text-blue-400' : 'text-gray-400'
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  "size-5 transition-all duration-200",
                  active && "scale-110"
                )} />
              </div>
              
              {/* Active indicator */}
              {active && (
                <div className="absolute top-0 w-10 h-0.5 bg-blue-400 rounded-full" />
              )}
              
              <span className={cn(
                "text-xs mt-1 font-medium transition-all duration-200",
                active ? "text-blue-400" : "text-gray-500"
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
      
      {/* Safe area for iPhone notch */}
      <div className="h-safe-bottom bg-[#0b1b3b]" />
    </nav>
  )
}

function LogoutButton({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      await signOut()
      
      localStorage.removeItem('applicant_name')
      localStorage.removeItem('applicant_email')
      localStorage.removeItem('applicant_avatar')
      
      if (onNavigate) onNavigate()
      
      router.push('/login')
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="px-3 mt-4">
      <Button
        variant="outline"
        onClick={handleLogout}
        disabled={isLoading}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200',
          'border-red-600 text-red-400 hover:bg-red-600 hover:text-white',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <LogOut className="size-4" />
        <span>{isLoading ? 'Logging out...' : 'Logout'}</span>
      </Button>
    </div>
  )
}

function ProfileSection({ profile, loading }: { profile: UserProfile; loading: boolean }) {
  const [imageError, setImageError] = React.useState(false)
  
  React.useEffect(() => {
    setImageError(false)
  }, [profile.avatarUrl])
  
  if (loading) {
    return (
      <div className="px-4 py-3 bg-blue-900/20 border-b border-blue-800">
        <div className="flex items-center gap-3 p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-2 border-blue-400 animate-pulse">
              <UserIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-blue-700/50 rounded animate-pulse w-3/4"></div>
            <div className="h-3 bg-blue-600/50 rounded animate-pulse w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 bg-blue-900/20 border-b border-blue-800">
      <div className="flex items-center gap-3 p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
        <div className="flex-shrink-0">
          {profile.avatarUrl && !imageError ? (
            <div className="w-10 h-10 rounded-full border-2 border-blue-400 overflow-hidden">
              <Image
                src={profile.avatarUrl}
                alt={profile.name}
                width={40}
                height={40}
                className="object-cover w-full h-full"
                onError={() => setImageError(true)}
                priority={false}
                unoptimized={true}
              />
            </div>
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-2 border-blue-400">
              <UserIcon className="h-5 w-5 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate" title={profile.name}>
            {profile.name}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Mail className="h-3 w-3 text-blue-300" />
            <p className="text-xs text-blue-200 truncate" title={profile.email}>
              {profile.email}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-2 bg-blue-900/20 rounded-lg p-2 border border-blue-700/30">
        <p className="text-xs text-blue-200 text-center">
          Signed in as Applicant
        </p>
      </div>
    </div>
  )
}

export function ApplicantMobileTopbar() {
  const { profile, unreadCount } = useApplicantProfile()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-blue-800 bg-[#0b1b3b] px-4 py-3 text-white md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 bg-[#11214a] border border-blue-700 hover:bg-blue-700"
          aria-label="Open menu"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="size-5 text-white" />
        </Button>
        <div className="flex items-center gap-2">
          <Image 
            src="/images/norsu.png" 
            width={24} 
            height={24} 
            alt="NORSU Logo" 
            className="rounded-sm border border-blue-600" 
          />
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold text-white">Welcome, {profile.name}!</h1>
            <p className="text-xs text-blue-200 truncate max-w-[150px]" title={profile.email}>
              {profile.email}
            </p>
          </div>
        </div>
        
        {/* Notifications in topbar */}
        <div className="ml-auto">
          <Link href="/notifications" className="relative">
            <Bell className="size-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-4 px-1 text-xs font-semibold bg-red-500 text-white rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className={cn(
        'fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden',
        mobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}>
        <div className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 transform bg-[#0b1b3b] border-r border-blue-800 transition-transform',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <div className="flex flex-col items-center justify-center border-b border-blue-800 bg-[#11214a] py-5 px-4">
            <Image
              src="/images/norsu.png"
              alt="NORSU HR Logo"
              width={70}
              height={70}
              className="rounded-xl mb-2"
            />
            <h1 className="text-base font-semibold text-center mb-1">NORSU HR Applicant</h1>
            <p className="text-xs text-gray-300 text-center">Welcome, {profile.name}!</p>
          </div>

          <ProfileSection profile={profile} loading={false} />

          <NavList onNavigate={() => setMobileMenuOpen(false)} />

          <LogoutButton onNavigate={() => setMobileMenuOpen(false)} />

          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="icon"
              className="bg-[#11214a] border border-blue-700 hover:bg-blue-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="size-4 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export function ApplicantSidebar() {
  const { profile, loading } = useApplicantProfile()

  return (
    <>
      <aside className="hidden h-full min-h-screen w-72 border-r border-blue-800 bg-[#0b1b3b] text-white md:block">
        <div className="flex flex-col items-center justify-center border-b border-blue-800 bg-[#11214a] py-5 px-4">
          <Image
            src="/images/norsu.png"
            alt="NORSU HR Logo"
            width={70}
            height={70}
            className="rounded-xl mb-2"
          />
          <h1 className="text-base font-semibold text-center mb-1">NORSU HR Applicant</h1>
          <p className="text-xs text-gray-300 text-center">Welcome, {profile.name}!</p>
        </div>

        <ProfileSection profile={profile} loading={loading} />

        <NavList />

        <LogoutButton />
      </aside>
      
      {/* Mobile Navigation Footer */}
      <MobileNavBar />
    </>
  )
}