'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, LayoutDashboard, Briefcase, ClipboardList, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Dashboard', href: '/applicant', icon: LayoutDashboard },
  { label: 'Job Posting', href: '/applicant/job-postings', icon: Briefcase },
  { label: 'Requirements', href: '/applicant/requirements', icon: ClipboardList },
  { label: 'Track Application', href: '/applicant/track', icon: Compass },
]

function useApplicantName() {
  const [name, setName] = React.useState('Applicant')
  React.useEffect(() => {
    try {
      const n = localStorage.getItem('applicant_name')
      if (n && n.trim()) setName(n.trim())
    } catch {}
  }, [])
  return name
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="p-2">
      <ul className="space-y-1">
        {links.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                  active ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
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

export function ApplicantMobileTopbar() {
  const name = useApplicantName()
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b bg-white/90 px-4 py-3 backdrop-blur md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0" aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          {/* Mobile drawer header with logo + greeting */}
          <div className="border-b bg-white/90 px-4 py-3">
            <div className="flex items-center gap-3">
              <Image
                src="/norsu.png"
                width={36}
                height={36}
                alt="NORSU Logo"
                className="rounded-md border border-blue-100"
                priority
              />
              <div className="leading-tight">
                <div className="text-sm font-semibold text-slate-900">Welcome, {name}!</div>
                <div className="text-xs text-slate-500">NORSU • Applicant</div>
              </div>
            </div>
          </div>
          <NavList
            onNavigate={() =>
              (document.querySelector('[data-state="open"][data-scope="sheet-content"]') as HTMLElement)?.click()
            }
          />
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2">
        <Image src="/norsu.png" width={24} height={24} alt="NORSU Logo" className="rounded-sm border border-blue-100" />
        <h1 className="text-sm font-semibold text-slate-800">Welcome, {name}!</h1>
      </div>
    </div>
  )
}

export default function ApplicantSidebar() {
  const name = useApplicantName()
  return (
    <aside
      className="hidden h-full min-h-screen w-72 border-r bg-white/80 backdrop-blur md:block"
      style={{ ['--bg-url' as any]: 'var(--applicant-bg, none)' }}
    >
      {/* Desktop sidebar header with logo + greeting */}
      <div className="border-b bg-white/80 px-4 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/norsu.png"
            width={40}
            height={40}
            alt="NORSU Logo"
            className="rounded-md border border-blue-100"
            priority
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">Welcome, {name}!</div>
            <div className="text-xs text-slate-500">NORSU • Applicant</div>
          </div>
        </div>
      </div>

      <NavList />
    </aside>
  )
}
