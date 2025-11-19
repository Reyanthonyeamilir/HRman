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
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-screen w-80 transform transition-transform duration-300 z-50
        lg:z-30 lg:translate-x-0 lg:static lg:fixed
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex h-full flex-col bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 overflow-y-auto">
          {/* Header Section */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between border-b border-blue-800 bg-[#11214a]">
              <div className="flex flex-col items-center justify-center py-5 px-4 flex-1">
                <Image
                  src="/images/norsu.png"
                  alt="NORSU HR Logo"
                  width={70}
                  height={70}
                  className="rounded-xl mb-2"
                />
                <h1 className="text-base font-semibold text-center mb-1 text-white">NORSU HR Portal</h1>
                <p className="text-xs text-gray-300 text-center">
                  Welcome, {user?.email?.split('@')[0] || 'Admin'}
                </p>
              </div>
              <button
                onClick={onMobileClose}
                className="lg:hidden p-4 text-white hover:bg-blue-900/50"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onMobileClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                    active
                      ? "bg-blue-500/20 text-blue-400 border-r-2 border-blue-400"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/70"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer Section */}
          <div className="flex-shrink-0 p-4 border-t border-slate-700 bg-slate-800/50">
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
              className="w-full border-slate-600 bg-slate-700/50 text-white hover:bg-red-600 hover:text-white"
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