"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    setMounted(true)
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    // Set initial scroll state
    handleScroll()
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const linkBase =
    "block rounded-full px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:inline-block"
  const isActive = (href: string) =>
    pathname === href ? "bg-slate-100 text-slate-900" : ""

  // Icon components for mobile navigation
  const HomeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )

  const AboutIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )

  const VacanciesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )

  const LoginIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  )

  const SignupIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )

  return (
    <html lang="en">
      <body>
        {/* NAVBAR */}
        <header className={`sticky top-0 z-50 bg-white transition-all duration-300 ${
          mounted && isScrolled ? 'shadow-lg' : 'shadow-[0_1px_0_rgba(2,8,23,0.06)]'
        }`}>
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
            {/* Left side - Logo + Navigation */}
            <div className="flex items-center gap-6">
              <Link className="inline-flex items-center gap-2 font-extrabold" href="/" aria-label="NORSU Home">
                <Image src="/images/norsu.png" alt="NORSU Seal" width={34} height={34} />
                <span>NORSU • HRM</span>
              </Link>

              {/* DESKTOP NAVIGATION - Hidden on mobile */}
              <nav className="hidden md:flex md:items-center">
                <ul className="flex items-center gap-2">
                  <li>
                    <Link href="/" className={`${linkBase} ${isActive("/")}`}>Home</Link>
                  </li>
                  <li>
                    <Link href="/about" className={`${linkBase} ${isActive("/about")}`}>About</Link>
                  </li>
                  <li>
                    <Link href="/vacancies" className={`${linkBase} ${isActive("/vacancies")}`}>Vacancies</Link>
                  </li>
                </ul>
              </nav>
            </div>

            {/* DESKTOP AUTH LINKS - Hidden on mobile */}
            <div className="hidden md:flex md:items-center md:gap-4">
              <Link href="/login" className={`${linkBase} ${isActive("/login")}`}>Login</Link>
              <Link
                href="/signup"
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#2f67ff] px-4 font-bold text-white transition hover:-translate-y-[1px] hover:bg-[#2553cc]"
              >
                Signup
              </Link>
            </div>

            {/* MOBILE MENU BUTTON - Only visible on mobile */}
            <button
              className="inline-grid place-items-center rounded-[10px] p-1.5 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,103,255,0.25)]"
              aria-label="Toggle navigation"
              aria-controls="siteNav"
              aria-expanded={open}
              onClick={() => setOpen(v => !v)}
            >
              {open ? (
                // Close icon (X) when menu is open - MOBILE
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                // Hamburger icon when menu is closed - MOBILE
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>

          {/* MOBILE NAVIGATION - Only visible on mobile */}
          <nav
            id="siteNav"
            aria-label="Primary Navigation"
            className={`${open ? "translate-y-0 shadow-[0_10px_20px_rgba(2,8,23,0.08)]" : "-translate-y-[120%]"}
              fixed left-0 right-0 top-[60px] border-t border-slate-200 bg-white transition
              md:hidden`}
          >
            <ul className="mx-auto flex w-full max-w-6xl flex-col gap-0 px-4 py-2">
              <li className="w-full">
                <Link href="/" className={`${linkBase} flex items-center gap-3 ${isActive("/")}`} onClick={() => setOpen(false)}>
                  <HomeIcon />
                  <span>Home</span>
                </Link>
              </li>
              <li className="w-full">
                <Link href="/about" className={`${linkBase} flex items-center gap-3 ${isActive("/about")}`} onClick={() => setOpen(false)}>
                  <AboutIcon />
                  <span>About</span>
                </Link>
              </li>
              <li className="w-full">
                <Link href="/vacancies" className={`${linkBase} flex items-center gap-3 ${isActive("/vacancies")}`} onClick={() => setOpen(false)}>
                  <VacanciesIcon />
                  <span>Vacancies</span>
                </Link>
              </li>
              <li className="w-full">
                <Link href="/login" className={`${linkBase} flex items-center gap-3 ${isActive("/login")}`} onClick={() => setOpen(false)}>
                  <LoginIcon />
                  <span>Login</span>
                </Link>
              </li>
              <li className="w-full">
                <Link
                  href="/signup"
                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 font-bold transition hover:-translate-y-[1px] w-full max-w-[120px] mx-auto ${
                    open 
                      ? "bg-[#2f67ff] text-white hover:bg-[#2553cc]" 
                      : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                  } flex items-center justify-center gap-2`}
                  onClick={() => setOpen(false)}
                >
                  <SignupIcon />
                  <span>Signup</span>
                </Link>
              </li>
            </ul>
          </nav>
        </header>

        {/* HOME PAGE CONTENT */}
        {children}

        {/* FOOTER - Visible on both desktop and mobile */}
        <footer className="bg-slate-900 text-slate-400">
          <div className="mx-auto w-full max-w-6xl px-4 py-6">
            <div className="grid grid-cols-1 gap-6 text-xs md:grid-cols-4">
              {/* Brand Section */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 font-bold text-white">
                  <Image src="/images/norsu.png" alt="NORSU Seal" width={20} height={20} />
                  <span className="text-xs">NORSU • HRM</span>
                </div>
                <p className="leading-tight text-slate-500">
                  Capitol Area, Kagawasan Ave, Dumaguete City, Negros Oriental
                </p>
                <p className="text-slate-600">Mon–Fri, 8:00 AM – 5:00 PM</p>
              </div>

              {/* Quick Links */}
              <div className="space-y-1.5">
                <h4 className="font-semibold uppercase tracking-wider text-white text-[11px]">Quick Links</h4>
                <ul className="space-y-1">
                  <li><Link href="/vacancies" className="text-slate-500 hover:text-white transition-colors">Vacancies</Link></li>
                  <li><Link href="/about" className="text-slate-500 hover:text-white transition-colors">About HR</Link></li>
                  <li><Link href="/login" className="text-slate-500 hover:text-white transition-colors">Login</Link></li>
                  <li><Link href="/signup" className="text-slate-500 hover:text-white transition-colors">Signup</Link></li>
                </ul>
              </div>

              {/* Contact */}
              <div className="space-y-1.5">
                <h4 className="font-semibold uppercase tracking-wider text-white text-[11px]">Contact</h4>
                <ul className="space-y-1">
                  <li>
                    <a href="mailto:hr@norsu.edu.ph" className="text-slate-500 hover:text-white transition-colors">hr@norsu.edu.ph</a>
                  </li>
                  <li className="text-slate-500">(035) 123-4567</li>
                  <li>
                    <a href="#" className="text-slate-500 hover:text-white transition-colors">Help Desk</a>
                  </li>
                </ul>
              </div>

              {/* Social */}
              <div className="space-y-1.5">
                <h4 className="font-semibold uppercase tracking-wider text-white text-[11px]">Follow</h4>
                <p className="leading-tight text-slate-500">
                  University updates and announcements.
                </p>
                <div className="flex gap-3 pt-0.5">
                  <a href="#" className="text-slate-500 hover:text-white transition-colors" aria-label="Facebook">
                    FB
                  </a>
                  <a href="#" className="text-slate-500 hover:text-white transition-colors" aria-label="Twitter">
                    X
                  </a>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div className="mt-4 border-t border-slate-800 pt-3 text-center">
              <p className="text-[11px] text-slate-600">
                © {new Date().getFullYear()} Negros Oriental State University • Human Resource Management.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}