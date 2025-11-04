"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  Briefcase, 
  Users, 
  FileText, 
  Home,
  LogOut,
  X,
  Menu
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from "react"
import Image from "next/image"

interface HRSidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function HRSidebar({ mobileOpen, onMobileClose }: HRSidebarProps) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    getCurrentUser()
  }, [])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error getting user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/hr/dashboard', icon: Home },
    { name: 'Job Postings', href: '/hr/jobs', icon: Briefcase },
    { name: 'Applications', href: '/hr/tag', icon: FileText },
    { name: 'Candidates', href: '/hr/candidates', icon: Users },
  ]

  const isActive = (href: string) => {
    if (!mounted) return false
    return pathname === href || pathname?.startsWith(href + '/')
  }

  const SidebarLogo = () => (
    <div className="flex flex-col items-center justify-center border-b border-blue-800 bg-[#11214a] py-5 px-4">
      <Image
        src="/images/norsu.png"
        alt="NORSU HR Logo"
        width={70}
        height={70}
        className="rounded-xl mb-2"
        priority
      />
      <h1 className="text-base font-semibold text-center mb-1 text-white">NORSU HR Portal</h1>
      <p className="text-xs text-gray-300 text-center">
        {loading ? 'Loading...' : `Welcome, ${user?.email?.split('@')[0] || 'Admin'}`}
      </p>
    </div>
  )

  if (!mounted) {
    return (
      <div className="flex h-full flex-col bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 w-80">
        <div className="flex flex-col items-center justify-center border-b border-blue-800 bg-[#11214a] py-5 px-4">
          <div className="w-16 h-16 bg-slate-700 rounded-xl mb-2 animate-pulse"></div>
          <div className="h-4 bg-slate-700 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-3 bg-slate-700 rounded w-24 animate-pulse"></div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3">
              <div className="w-5 h-5 bg-slate-700 rounded animate-pulse"></div>
              <div className="h-4 bg-slate-700 rounded w-24 animate-pulse"></div>
            </div>
          ))}
        </nav>
      </div>
    )
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 w-full">
      {/* Header with Close Button for Mobile */}
      <div className="flex items-center justify-between border-b border-blue-800 bg-[#11214a]">
        <div className="flex-1">
          <SidebarLogo />
        </div>
        {/* Close button for mobile */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-4 text-white hover:bg-blue-900/50 transition-colors flex-shrink-0"
          aria-label="Close menu"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => onMobileClose?.()}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 group ${
                active
                  ? "bg-blue-500/20 text-blue-400 border-r-2 border-blue-400 shadow-lg"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/70 hover:shadow-md"
              }`}
            >
              <Icon className={`h-5 w-5 transition-colors ${
                active ? "text-blue-400" : "text-slate-400 group-hover:text-white"
              }`} />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer/Sign out */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex items-center space-x-3 mb-4 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-2 border-blue-400">
            <span className="text-sm font-bold text-white">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user?.email || 'HR Manager'}
            </p>
            <p className="text-xs text-slate-300">Administrator</p>
          </div>
        </div>
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full border-slate-600 bg-slate-700/50 text-white hover:bg-red-600 hover:text-white hover:border-red-500 transition-colors shadow-md"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay - Higher z-index */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar - Proper z-index ordering */}
      <aside className={`
        fixed 
        top-0 
        left-0 
        h-screen 
        w-80 
        transform 
        transition-transform 
        duration-300 
        ease-in-out 
        z-50
        flex-shrink-0
        lg:z-30
        lg:translate-x-0
        ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      `}>
        {sidebarContent}
      </aside>
    </>
  )
}

// Mobile Topbar Component for HR
export function HRMobileTopbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile Topbar - Lower z-index than sidebar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 border-b border-slate-700 bg-slate-900 px-4 py-3 text-white shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 bg-slate-800 border border-slate-500 hover:bg-slate-700 hover:border-slate-400 transition-colors"
          aria-label="Open menu"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="size-6 text-white" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Image 
            src="/images/norsu.png" 
            width={32} 
            height={32} 
            alt="NORSU Logo" 
            className="rounded-sm border border-blue-500"
            priority
          />
          <div>
            <h1 className="text-sm font-bold text-white">HR Portal</h1>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <HRSidebar 
        mobileOpen={mobileMenuOpen} 
        onMobileClose={() => setMobileMenuOpen(false)} 
      />

      {/* Spacer for mobile topbar */}
      <div className="h-16 lg:h-0" />
    </>
  )
}