'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Briefcase, UserPlus, Menu, X } from 'lucide-react'

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(' ')
}

const NAV = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Job Posting', href: '/admin/jobposting', icon: Briefcase },
  { label: 'Add Users', href: '/admin/addusers', icon: UserPlus },
]

export default function AdminSidebar({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (v: boolean) => void
}) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 w-72 transform border-r border-blue-800 bg-[#0b1b3b] text-white transition-transform md:static md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      {/* --- Logo Section --- */}
      <div className="flex flex-col items-center justify-center border-b border-blue-800 bg-[#11214a] py-5 px-4">
        <Image
          src="/images/norsu.png"
          alt="NORSU HR Logo"
          width={70}
          height={70}
          className="rounded-xl mb-2"
        />
        <h1 className="text-base font-semibold text-center">NORSU HR Admin</h1>
      </div>

      {/* --- Navigation --- */}
      <nav className="p-3">
        <ul className="space-y-1">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200',
                    'hover:bg-blue-700 hover:text-white',
                    active ? 'bg-blue-600 text-white' : 'text-gray-200'
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
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-blue-800 bg-[#0b1b3b] px-4 py-3 text-white md:hidden">
      <button
        onClick={onMenu}
        className="grid size-9 place-items-center rounded-lg border border-blue-700 bg-[#11214a]"
      >
        <Menu className="size-5 text-white" />
      </button>
      <h1 className="text-sm font-semibold text-white">{title}</h1>
    </div>
  )
}