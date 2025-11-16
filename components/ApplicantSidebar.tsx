'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, LayoutDashboard, Briefcase, ClipboardList, Compass, X, Mail, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getCurrentUser, signOut } from '@/lib/supabaseClient'

const links = [
  { label: 'Dashboard', href: '/applicant', icon: LayoutDashboard },
  { label: 'Job Posting', href: '/applicant/job-postings', icon: Briefcase },
  { label: 'Requirements', href: '/applicant/requirements', icon: ClipboardList },
  { label: 'Track Application', href: '/applicant/track', icon: Compass },
]

function useApplicantProfile() {
  const [profile, setProfile] = React.useState({ 
    name: 'Applicant', 
    email: 'Loading...' 
  })
  
  React.useEffect(() => {
    const loadUserProfile = async () => {
      try {
        // Try to get from localStorage first (for quick display)
        const storedName = localStorage.getItem('applicant_name')
        const storedEmail = localStorage.getItem('applicant_email')
        
        if (storedName && storedEmail) {
          setProfile({
            name: storedName,
            email: storedEmail
          })
        }

        // Then try to get fresh data from Supabase
        const user = await getCurrentUser()
        if (user?.email) {
          const userName = user.email.split('@')[0] || 'Applicant'
          const userEmail = user.email
          
          setProfile({
            name: userName,
            email: userEmail
          })
          
          // Update localStorage with fresh data
          localStorage.setItem('applicant_name', userName)
          localStorage.setItem('applicant_email', userEmail)
        }
      } catch (error) {
        console.error('Error loading applicant profile:', error)
        // Fallback to localStorage if Supabase fails
        const storedName = localStorage.getItem('applicant_name')
        const storedEmail = localStorage.getItem('applicant_email')
        
        if (storedName || storedEmail) {
          setProfile({
            name: storedName || 'Applicant',
            email: storedEmail || 'user@norsu.edu.ph'
          })
        }
      }
    }

    loadUserProfile()
  }, [])
  
  return profile
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="p-3">
      <ul className="space-y-1">
        {links.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200',
                  'hover:bg-blue-700 hover:text-white',
                  active ? 'bg-blue-600 text-white' : 'text-gray-200'
                )}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
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
      
      // Clear localStorage
      localStorage.removeItem('applicant_name')
      localStorage.removeItem('applicant_email')
      
      // Close mobile menu if open
      if (onNavigate) {
        onNavigate()
      }
      
      // Redirect to login page
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

function ProfileSection({ name, email }: { name: string; email: string }) {
  return (
    <div className="border-t border-blue-800 pt-4 mt-4">
      <div className="px-4 space-y-3">
        <div className="flex items-center gap-3 p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-2 border-blue-400">
              <User className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{name}</p>
            <div className="flex items-center gap-1 mt-1">
              <Mail className="h-3 w-3 text-blue-300" />
              <p className="text-xs text-blue-200 truncate" title={email}>{email}</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-900/20 rounded-lg p-2 border border-blue-700/30">
          <p className="text-xs text-blue-200 text-center">
            Signed in as Applicant
          </p>
        </div>
      </div>
    </div>
  )
}

export function ApplicantMobileTopbar() {
  const { name, email } = useApplicantProfile()
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
            <h1 className="text-sm font-semibold text-white">Welcome, {name}!</h1>
            <p className="text-xs text-blue-200 truncate max-w-[150px]" title={email}>{email}</p>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={cn(
        'fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden',
        mobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}>
        <div className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 transform bg-[#0b1b3b] border-r border-blue-800 transition-transform',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {/* Mobile header */}
          <div className="flex flex-col items-center justify-center border-b border-blue-800 bg-[#11214a] py-5 px-4">
            <Image
              src="/images/norsu.png"
              alt="NORSU HR Logo"
              width={70}
              height={70}
              className="rounded-xl mb-2"
            />
            <h1 className="text-base font-semibold text-center mb-1">NORSU HR Applicant</h1>
            <p className="text-xs text-gray-300 text-center">Welcome, {name}!</p>
          </div>

          {/* Navigation */}
          <NavList onNavigate={() => setMobileMenuOpen(false)} />

          {/* Profile Section */}
          <ProfileSection name={name} email={email} />

          {/* Logout Button */}
          <LogoutButton onNavigate={() => setMobileMenuOpen(false)} />

          {/* Close button */}
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

export default function ApplicantSidebar() {
  const { name, email } = useApplicantProfile()

  return (
    <aside className="hidden h-full min-h-screen w-72 border-r border-blue-800 bg-[#0b1b3b] text-white md:block">
      {/* Desktop sidebar header with logo + greeting */}
      <div className="flex flex-col items-center justify-center border-b border-blue-800 bg-[#11214a] py-5 px-4">
        <Image
          src="/images/norsu.png"
          alt="NORSU HR Logo"
          width={70}
          height={70}
          className="rounded-xl mb-2"
        />
        <h1 className="text-base font-semibold text-center mb-1">NORSU HR Applicant</h1>
        <p className="text-xs text-gray-300 text-center">Welcome, {name}!</p>
      </div>

      <NavList />

      {/* Profile Section */}
      <ProfileSection name={name} email={email} />

      {/* Logout Button */}
      <LogoutButton />
    </aside>
  )
}