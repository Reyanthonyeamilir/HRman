'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  Briefcase, 
  Users, 
  FileText, 
  Home,
  LogOut,
  X,
  LayoutDashboard,
  UserPlus,
  Settings,
  User,
  ListTodo,
  FileCheck,
  Menu,
  Mail,
  ClipboardList,
  Compass,
  Bell,
  BarChart3, // For dashboard
  UserCog // For users management
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabaseClient'
import { useState, useEffect } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface UserProfile {
  id: string
  email: string
  role: 'applicant' | 'hr' | 'super_admin'
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

interface HRSidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

// Mobile links - optimized for bottom navigation
const mobileLinks = [
  { label: 'Home', href: '/administrator/dashboard', icon: BarChart3 },
  { label: 'Jobs', href: '/administrator/jobposting', icon: Briefcase },
  { label: 'Apps', href: '/administrator/applications', icon: FileText },
  { label: 'Users', href: '/administrator/addusers', icon: UserCog },
  { label: 'Profile', href: '/administrator/profile', icon: User },
]

export default function AdminHRSidebar({ mobileOpen, onMobileClose }: HRSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [avatarFullUrl, setAvatarFullUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      setImageError(false)
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Auth error:', userError)
        router.push('/login')
        return
      }
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        if (profileError.code === 'PGRST116') {
          router.push('/login')
          return
        }
      }

      if (profile) {
        setUserProfile(profile)
        
        // Construct full avatar URL if it exists
        let avatarUrl = null
        if (profile.avatar_url) {
          if (profile.avatar_url.startsWith('http')) {
            avatarUrl = profile.avatar_url
          } else {
            const filePath = profile.avatar_url.startsWith('/') 
              ? profile.avatar_url.slice(1) 
              : profile.avatar_url
            
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
        
        setAvatarFullUrl(avatarUrl)
        
        // Fetch unread notifications count
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
        
        setUnreadCount(count || 0)
        
        // Set up real-time subscription for notifications
        const channel = supabase
          .channel(`notifications-admin-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            () => {
              setUnreadCount(prev => prev + 1)
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
              if (payload.new.is_read === true && payload.old.is_read === false) {
                setUnreadCount(prev => Math.max(0, prev - 1))
              }
            }
          )
          .subscribe()
        
        // Cleanup function for the effect
        return () => {
          supabase.removeChannel(channel)
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/administrator/dashboard', icon: LayoutDashboard },
    { name: 'Job Postings', href: '/administrator/jobposting', icon: Briefcase },
    { name: 'Applications', href: '/administrator/applications', icon: FileText },
    { name: 'Profile', href: '/administrator/profile', icon: User },
    { name: 'Notifications', href: '/notifications', icon: Bell },
  ]

  const adminOnlyNavigation = [
    { name: 'Add Users', href: '/administrator/addusers', icon: UserPlus },
    { name: 'Task Logs', href: '/administrator/tasklogs', icon: ListTodo },
  ]

  const getFullNavigation = () => {
    if (userProfile?.role === 'super_admin') {
      return [...navigation, ...adminOnlyNavigation]
    }
    return navigation
  }

  const isActive = (href: string) => {
    if (href === '/administrator/dashboard') {
      return pathname === '/administrator/dashboard' || pathname === '/administrator'
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const getDisplayName = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`
    }
    return userProfile?.email?.split('@')[0] || 'HR Manager'
  }

  const getRoleDisplay = () => {
    if (userProfile?.role === 'super_admin') {
      return 'Super Administrator'
    } else if (userProfile?.role === 'hr') {
      return 'HR Manager'
    }
    return 'User'
  }

  const getInitials = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name.charAt(0)}${userProfile.last_name.charAt(0)}`.toUpperCase()
    }
    return userProfile?.email?.charAt(0).toUpperCase() || 'H'
  }

  // Avatar Component for consistent sizing
  const AvatarDisplay = ({ 
    size = "md" 
  }: { 
    size?: "sm" | "md" 
  }) => {
    const sizeClasses = {
      sm: "w-9 h-9",
      md: "w-10 h-10"
    }
    
    const textSizeClasses = {
      sm: "text-xs",
      md: "text-sm"
    }

    return (
      <div className={`relative ${sizeClasses[size]} bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center border-2 border-blue-400 overflow-hidden`}>
        {avatarFullUrl && !imageError ? (
          <Image
            src={avatarFullUrl}
            alt="Profile"
            fill
            className="object-cover w-full h-full"
            sizes="(max-width: 768px) 36px, 40px"
            onError={() => {
              console.error('Image failed to load:', avatarFullUrl)
              setImageError(true)
            }}
            unoptimized={true}
          />
        ) : (
          <span className={`${textSizeClasses[size]} font-bold text-white`}>
            {getInitials()}
          </span>
        )}
      </div>
    )
  }

  // Mobile Navigation Footer Component
  const MobileNavBar = () => {
    const pathname = usePathname()
    
    // Filter links based on user role
    const getMobileLinks = () => {
      const baseLinks = mobileLinks.filter(link => {
        if (link.href === '/administrator/addusers') {
          return userProfile?.role === 'super_admin'
        }
        return true
      })
      
      // Add notifications if it doesn't already exist
      if (!baseLinks.some(link => link.href === '/notifications')) {
        baseLinks.push({ label: 'Notify', href: '/notifications', icon: Bell })
      }
      
      return baseLinks
    }
    
    const userMobileLinks = getMobileLinks()
    
    return (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-blue-800 bg-[#0b1b3b]">
        <div className="flex items-center justify-around h-16 px-2">
          {userMobileLinks.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            const isNotifications = href === '/notifications'
            
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
                  
                  {/* Notification badge */}
                  {isNotifications && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-4 px-1 text-xs font-semibold bg-red-500 text-white rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
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

  // Show loading state
  if (loading) {
    return (
      <aside className="hidden fixed left-0 top-0 h-screen w-64 border-r border-blue-800 bg-[#0b1b3b] md:block">
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
        </div>
      </aside>
    )
  }

  // Don't render sidebar for non-HR/Admin users
  if (!userProfile || (userProfile.role !== 'hr' && userProfile.role !== 'super_admin')) {
    return null
  }

  const fullNavigation = getFullNavigation()

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden fixed left-0 top-0 h-screen w-64 border-r border-blue-800 bg-[#0b1b3b] text-white md:flex md:flex-col">
        {/* Logo Section */}
        <div className="flex-shrink-0 border-b border-blue-800 bg-[#11214a] py-5 px-4">
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-12 h-12 rounded-xl mb-2 overflow-hidden">
              <Image
                src="/images/norsu.png"
                alt="NORSU HR Logo"
                fill
                className="object-cover"
                sizes="48px"
                priority
              />
            </div>
            <h1 className="text-base font-semibold text-center mb-1">
              {userProfile.role === 'super_admin' ? 'NORSU HR Admin' : 'NORSU HR Manager'}
            </h1>
            <p className="text-xs text-gray-300 text-center">Welcome, {getDisplayName()}!</p>
          </div>
        </div>

        {/* Profile Section */}
        <div className="flex-shrink-0 px-4 py-4 bg-blue-900/20 border-b border-blue-800">
          <Link 
            href="/administrator/profile"
            className="flex items-center gap-3 p-3 bg-blue-900/30 rounded-lg border border-blue-700/50 hover:bg-blue-800/50 transition-colors"
          >
            <div className="flex-shrink-0">
              <AvatarDisplay size="md" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{getDisplayName()}</p>
              <div className="flex items-center gap-1 mt-1">
                <Mail className="h-3 w-3 text-blue-300" />
                <p className="text-xs text-blue-200 truncate" title={userProfile.email || ''}>
                  {userProfile.email}
                </p>
              </div>
            </div>
          </Link>
          <div className="mt-2 bg-blue-900/20 rounded-lg p-2 border border-blue-700/30">
            <p className="text-xs text-blue-200 text-center">
              Signed in as {getRoleDisplay()}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3">
            <ul className="space-y-1.5">
              {fullNavigation.map(({ name, href, icon: Icon }) => {
                const active = isActive(href)
                const isNotifications = href === '/notifications'
                
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                        'hover:bg-blue-700 hover:text-white',
                        active 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'text-gray-200 hover:shadow-sm'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="size-4 flex-shrink-0" />
                        <span className="truncate">{name}</span>
                      </div>
                      {/* Show badge for notifications if there are unread */}
                      {isNotifications && unreadCount > 0 && (
                        <span className={cn(
                          "flex items-center justify-center h-5 min-w-5 px-1 text-xs font-semibold rounded-full",
                          active ? "bg-white text-blue-600" : "bg-red-500 text-white"
                        )}>
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>

        {/* Logout Button */}
        <div className="flex-shrink-0 px-3 py-4 border-t border-blue-800/50">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className={cn(
              'w-full flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
              'border-red-600 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600'
            )}
          >
            <LogOut className="size-4 flex-shrink-0" />
            <span>Logout</span>
          </Button>
          <p className="text-xs text-blue-300 text-center mt-2">
            NORSU HR Portal v1.0
          </p>
        </div>
      </aside>

      {/* Mobile Navigation Footer */}
      <MobileNavBar />

      {/* Mobile Sidebar Overlay */}
      <div className={cn(
        'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
        mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}>
        <div className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-[#0b1b3b] border-r border-blue-800 transition-transform duration-300 ease-in-out flex flex-col',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {/* Mobile header */}
          <div className="flex-shrink-0 border-b border-blue-800 bg-[#11214a] py-5 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden">
                  <Image
                    src="/images/norsu.png"
                    alt="NORSU HR Logo"
                    fill
                    className="object-cover"
                    sizes="40px"
                    priority
                  />
                </div>
                <div className="text-left">
                  <h1 className="text-sm font-semibold">NORSU HR</h1>
                  <p className="text-xs text-blue-300">Mobile Menu</p>
                </div>
              </div>
              <button
                onClick={onMobileClose}
                className="p-2 hover:bg-blue-800/50 rounded"
              >
                <X className="size-4 text-white" />
              </button>
            </div>
          </div>

          {/* Profile Section */}
          <div className="flex-shrink-0 px-4 py-4 bg-blue-900/20 border-b border-blue-800">
            <Link 
              href="/administrator/profile"
              onClick={onMobileClose}
              className="flex items-center gap-3 p-3 bg-blue-900/30 rounded-lg border border-blue-700/50 hover:bg-blue-800/50 transition-colors"
            >
              <div className="flex-shrink-0">
                <AvatarDisplay size="md" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{getDisplayName()}</p>
                <p className="text-xs text-blue-200 truncate">{userProfile.email}</p>
              </div>
            </Link>
            <div className="mt-2 bg-blue-900/20 rounded-lg p-2 border border-blue-700/30">
              <p className="text-xs text-blue-200 text-center">
                Signed in as {getRoleDisplay()}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-3">
              <ul className="space-y-1.5">
                {fullNavigation.map(({ name, href, icon: Icon }) => {
                  const active = isActive(href)
                  const isNotifications = href === '/notifications'
                  
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onMobileClose}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                          'hover:bg-blue-700 hover:text-white',
                          active 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-gray-200 hover:shadow-sm'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="size-4 flex-shrink-0" />
                          <span className="truncate">{name}</span>
                        </div>
                        {/* Show badge for notifications if there are unread */}
                        {isNotifications && unreadCount > 0 && (
                          <span className={cn(
                            "flex items-center justify-center h-5 min-w-5 px-1 text-xs font-semibold rounded-full",
                            active ? "bg-white text-blue-600" : "bg-red-500 text-white"
                          )}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>

          {/* Logout Button */}
          <div className="flex-shrink-0 px-3 py-4 border-t border-blue-800/50">
            <Button
              variant="outline"
              onClick={() => {
                handleSignOut()
                onMobileClose?.()
              }}
              className={cn(
                'w-full flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                'border-red-600 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600'
              )}
            >
              <LogOut className="size-4 flex-shrink-0" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// Mobile Topbar Component
export function MobileTopbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [avatarFullUrl, setAvatarFullUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        setImageError(false)
        
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          setUserProfile(profile)
          
          // Construct full avatar URL if it exists
          if (profile?.avatar_url) {
            let avatarUrl = null
            if (profile.avatar_url.startsWith('http')) {
              avatarUrl = profile.avatar_url
            } else {
              const filePath = profile.avatar_url.startsWith('/') 
                ? profile.avatar_url.slice(1) 
                : profile.avatar_url
              
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
            
            setAvatarFullUrl(avatarUrl)
          }
          
          // Fetch unread notifications count
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
          
          setUnreadCount(count || 0)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const getTitle = () => {
    if (pathname.includes('/administrator/dashboard')) return 'Dashboard'
    if (pathname.includes('/administrator/jobposting')) return 'Job Postings'
    if (pathname.includes('/administrator/applications')) return 'Applications'
    if (pathname.includes('/administrator/profile')) return 'Profile'
    if (pathname.includes('/administrator/addusers')) return 'Add Users'
    if (pathname.includes('/administrator/tasklogs')) return 'Task Logs'
    
    return 'Administrator'
  }

  const getDisplayName = () => {
    if (!userProfile) return 'HR Manager'
    if (userProfile.first_name && userProfile.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`
    }
    return userProfile.email?.split('@')[0] || 'HR Manager'
  }

  const getInitials = () => {
    if (!userProfile) return 'H'
    const firstName = userProfile.first_name || ''
    const lastName = userProfile.last_name || ''
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }
    return userProfile.email?.charAt(0).toUpperCase() || 'H'
  }

  // Avatar Component for mobile
  const MobileAvatar = () => {
    if (!userProfile) return null
    
    return (
      <div className="flex items-center gap-2">
        {/* Notifications Bell */}
        <Link href="/notifications" className="relative">
          <Bell className="h-5 w-5 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-4 px-1 text-xs font-semibold bg-red-500 text-white rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
        
        {/* Profile Avatar */}
        <Link href="/administrator/profile" className="flex items-center">
          <div className="relative w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center border-2 border-blue-400 overflow-hidden">
            {avatarFullUrl && !imageError ? (
              <Image
                src={avatarFullUrl}
                alt="Profile"
                fill
                className="object-cover w-full h-full"
                sizes="36px"
                onError={() => setImageError(true)}
                unoptimized={true}
              />
            ) : (
              <span className="text-xs font-bold text-white">
                {getInitials()}
              </span>
            )}
          </div>
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-blue-800 bg-[#0b1b3b] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenu}
            className="p-2 hover:bg-blue-800/50 rounded"
            aria-label="Open menu"
          >
            <Menu className="size-5 text-white" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7 rounded-sm border border-blue-600 overflow-hidden">
              <Image 
                src="/images/norsu.png" 
                alt="NORSU Logo" 
                fill
                className="object-cover"
                sizes="28px"
                priority
              />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Loading...</h1>
              <p className="text-xs text-blue-200">Please wait</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-blue-800 bg-[#0b1b3b] px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="p-2 hover:bg-blue-800/50 rounded"
          aria-label="Open menu"
        >
          <Menu className="size-5 text-white" />
        </button>
        
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7 rounded-sm border border-blue-600 overflow-hidden">
            <Image 
              src="/images/norsu.png" 
              alt="NORSU Logo" 
              fill
              className="object-cover"
              sizes="28px"
              priority
            />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">{getTitle()}</h1>
            <p className="text-xs text-blue-200">
              Welcome, {getDisplayName()}!
            </p>
          </div>
        </div>
      </div>
      
      <MobileAvatar />
    </div>
  )
}

// Layout Wrapper Component
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHRSidebar 
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      
      {/* Main content area */}
      <div className="lg:pl-64">
        <MobileTopbar onMenu={() => setSidebarOpen(true)} />
        
        {/* Main content wrapper - Add padding bottom for mobile nav */}
        <div className="min-h-screen pb-16 lg:pb-0">
          {/* Content area */}
          <main className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
          
          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 px-4 md:px-6 py-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-center md:text-left">
                  <p className="text-sm text-gray-600">
                    NORSU Human Resources Management System
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-sm text-gray-500">
                    © {new Date().getFullYear()} NORSU. All rights reserved.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    For support: hr@norsu.edu.ph
                  </p>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}