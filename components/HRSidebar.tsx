'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  Briefcase, 
  Users, 
  FileText, 
  Home,
  LogOut,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabaseClient'
import { useState, useEffect } from "react"
import Image from "next/image"

interface HRSidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function HRSidebar({ mobileOpen, onMobileClose }: HRSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const navigation = [
    { name: 'Dashboard', href: '/hr/dashboard', icon: Home },
    { name: 'Job Postings', href: '/hr/jobs', icon: Briefcase },
    { name: 'Applications', href: '/hr/tag', icon: FileText },
  ]

  const isActive = (href: string) => pathname === href

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <aside className={`
        fixed top-0 left-0 h-screen w-64 md:w-72 transform transition-transform duration-300 ease-in-out z-40
        lg:z-30 lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="flex h-full flex-col bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 overflow-y-auto">
          {/* Header Section */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between border-b border-blue-700 bg-gradient-to-r from-blue-800 to-blue-900 p-4">
              <div className="flex flex-col items-center justify-center py-2 flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Image
                    src="/images/norsu.png"
                    alt="NORSU HR Logo"
                    width={50}
                    height={50}
                    className="rounded-xl"
                  />
                  <div>
                    <h1 className="text-sm font-semibold text-white">NORSU HR Portal</h1>
                    <p className="text-xs text-blue-200">HR Management System</p>
                  </div>
                </div>
                
                {/* Profile Section */}
                <div className="flex items-center space-x-3 mt-2 px-3 py-2 bg-blue-900/30 rounded-lg w-full max-w-[220px] border border-blue-700">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center border-2 border-blue-400 flex-shrink-0">
                    <span className="text-xs font-bold text-white">
                      {user?.email?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {user?.email?.split('@')[0] || 'HR Manager'}
                    </p>
                    <p className="text-xs text-blue-200 truncate">
                      {user?.email || 'admin@norsu.edu.ph'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={onMobileClose}
                className="lg:hidden p-2 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 px-2 md:px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = pathname.startsWith(item.href) || isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onMobileClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg border-r-4 border-blue-400"
                      : "text-blue-100 hover:text-white hover:bg-blue-800/50 border-r-4 border-transparent"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer Section */}
          <div className="flex-shrink-0 p-3 md:p-4 border-t border-blue-700 bg-blue-900/20">
            <Button
              onClick={handleSignOut}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 border-0 shadow-lg transition-all duration-200 py-2.5 text-sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}