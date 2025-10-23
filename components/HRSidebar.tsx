"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutGrid, 
  Briefcase, 
  ClipboardList, 
  Tag as TagIcon,
  Menu,
  X
} from "lucide-react"
import Image from "next/image"

const NAV_ITEMS = [
  { href: "/hr/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/hr/jobs", label: "Job Posting", icon: Briefcase },
  { href: "/hr/review", label: "Review Application", icon: ClipboardList },
  { href: "/hr/tag", label: "Tag Application Status", icon: TagIcon },
]

interface HRSidebarProps {
  className?: string
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function HRSidebar({ 
  className = "", 
  mobileOpen = false, 
  onMobileClose 
}: HRSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 lg:w-full
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${className}
      `}>
        <div className="h-full bg-gradient-to-b from-[#0f2a6a] to-[#0b1b3a] border-r border-white/25 lg:rounded-2xl lg:border lg:bg-white/10 lg:backdrop-blur-sm p-4 lg:from-transparent lg:to-transparent">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#0078D4] to-[#1C89D1] flex items-center justify-center">
                <span className="text-white font-bold text-sm">NR</span>
              </div>
              <div>
                <div className="text-lg font-bold text-white">Norsu HR</div>
                <div className="text-xs text-[#c7d7ff]">Recruitment Portal</div>
              </div>
            </div>
            <button 
              onClick={onMobileClose}
              className="rounded-lg p-2 hover:bg-white/10 transition-colors duration-200"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Desktop Logo */}
          <div className="hidden lg:flex items-center gap-3 px-2 pb-4 pt-1 mb-2 border-b border-white/20">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#0078D4] to-[#1C89D1] flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">NR</span>
              {/* Replace with your logo: */}
              {/* <Image 
                src="/norsu-logo.png" 
                alt="Norsu Logo" 
                width={48} 
                height={48} 
                className="rounded-xl"
              /> */}
            </div>
            <div>
              <div className="text-xl font-bold text-white">Norsu HR</div>
              <div className="text-sm text-[#c7d7ff]">Recruitment Portal</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <SideLink 
                key={href} 
                href={href} 
                pathname={pathname} 
                icon={<Icon className="h-5 w-5" />}
                onClick={onMobileClose}
              >
                {label}
              </SideLink>
            ))}
          </nav>

          {/* User Info (Optional) */}
          <div className="absolute bottom-4 left-4 right-4 hidden lg:block">
            <div className="border-t border-white/20 pt-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0078D4] to-[#1C89D1] flex items-center justify-center">
                  <span className="text-white text-xs font-medium">HR</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">HR Manager</p>
                  <p className="text-xs text-[#c7d7ff] truncate">admin@norsu.edu.ph</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function SideLink({
  href,
  pathname,
  children,
  icon,
  onClick
}: {
  href: string
  pathname: string
  children: React.ReactNode
  icon: React.ReactNode
  onClick?: () => void
}) {
  const active = pathname === href
  
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 text-sm group ${
        active
          ? "border-[#93c5fd] bg-gradient-to-r from-[#0078D4] to-[#1C89D1] text-white shadow-lg"
          : "border-white/25 bg-white/5 text-[#e5edff] hover:bg-white/10 hover:border-[#93c5fd] hover:shadow-md"
      }`}
    >
      <span className={`shrink-0 transition-transform duration-200 ${
        active ? "scale-110" : "group-hover:scale-110"
      }`}>
        {icon}
      </span>
      <span className="font-medium">{children}</span>
      
      {/* Active indicator */}
      {active && (
        <div className="ml-auto h-2 w-2 rounded-full bg-white/80 animate-pulse"></div>
      )}
    </Link>
  )
}