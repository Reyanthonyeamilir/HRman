'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Briefcase, ClipboardList, UserPlus, Menu, X } from 'lucide-react'

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(' ')
}

const NAV = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Job Posting', href: '/admin/jobposting', icon: Briefcase },
  { label: 'Applicant Requirements', href: '/admin/requirements', icon: ClipboardList },
  { label: 'Add Users', href: '/admin/addusers', icon: UserPlus },
]

export default function AdminSidebar({
  open,
  setOpen,
}: { open: boolean; setOpen: (v: boolean) => void }) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 w-72 transform border-r bg-white/90 text-slate-900 backdrop-blur transition-transform md:static md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
      style={{
        backgroundImage: 'var(--bg-url, none)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 border-b bg-white/70 px-4 py-3 backdrop-blur">
        <div className="grid size-8 place-items-center rounded-xl bg-blue-600 text-white">A</div>
        <div className="text-base font-semibold">Admin Console</div>
        <button className="ml-auto md:hidden" onClick={() => setOpen(false)}>
          <X className="size-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="p-2">
        <ul className="space-y-1">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm',
                    'hover:bg-blue-50 hover:text-blue-700',
                    active && 'bg-blue-600 text-white hover:bg-blue-600 hover:text-white'
                  )}
                  onClick={() => setOpen(false)}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

export function MobileTopbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname()
  const title =
    NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))?.label ||
    'Dashboard'

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b bg-white/80 px-4 py-3 backdrop-blur md:hidden">
      <button onClick={onMenu} className="grid size-9 place-items-center rounded-lg border bg-white">
        <Menu className="size-5" />
      </button>
      <h1 className="text-sm font-semibold text-slate-800">{title}</h1>
    </div>
  )
}
