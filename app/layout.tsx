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

              {/* Desktop Navigation - Beside logo */}
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

            {/* Right side - Desktop Auth Links */}
            <div className="hidden md:flex md:items-center md:gap-4">
              <Link href="/login" className={`${linkBase} ${isActive("/login")}`}>Login</Link>
              <Link
                href="/signup"
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#2f67ff] px-4 font-bold text-white transition hover:-translate-y-[1px] hover:bg-[#2553cc]"
              >
                Signup
              </Link>
            </div>

            {/* Mobile Menu Button - Only visible on mobile */}
            <button
              className="inline-grid place-items-center rounded-[10px] p-1.5 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,103,255,0.25)]"
              aria-label="Toggle navigation"
              aria-controls="siteNav"
              aria-expanded={open}
              onClick={() => setOpen(v => !v)}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav
            id="siteNav"
            aria-label="Primary Navigation"
            className={`${open ? "translate-y-0 shadow-[0_10px_20px_rgba(2,8,23,0.08)]" : "-translate-y-[120%]"}
              fixed left-0 right-0 top-[60px] border-t border-slate-200 bg-white transition
              md:hidden`}
          >
            <ul className="mx-auto flex w-full max-w-6xl flex-col gap-0 px-4 py-2">
              <li className="w-full">
                <Link href="/" className={`${linkBase} ${isActive("/")}`} onClick={() => setOpen(false)}>Home</Link>
              </li>
              <li className="w-full">
                <Link href="/about" className={`${linkBase} ${isActive("/about")}`} onClick={() => setOpen(false)}>About</Link>
              </li>
              <li className="w-full">
                <Link href="/vacancies" className={`${linkBase} ${isActive("/vacancies")}`} onClick={() => setOpen(false)}>Vacancies</Link>
              </li>
              <li className="w-full">
                <Link href="/login" className={`${linkBase} ${isActive("/login")}`} onClick={() => setOpen(false)}>Login</Link>
              </li>
              <li className="w-full">
                <Link
                  href="/signup"
                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 font-bold transition hover:-translate-y-[1px] w-full max-w-[120px] mx-auto ${
                    open 
                      ? "bg-[#2f67ff] text-white hover:bg-[#2553cc]" 
                      : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  Signup
                </Link>
              </li>
            </ul>
          </nav>
        </header>

        {/* HOME PAGE CONTENT */}
        {children}

        {/* FOOTER */}
        <footer className="bg-slate-900 text-slate-300">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="inline-flex items-center gap-2 font-extrabold text-white">
                <Image src="/images/norsu.png" alt="NORSU Seal" width={34} height={34} />
                <span>NORSU • HRM</span>
              </div>
              <p className="mt-2 text-sm text-slate-200">
                Capitol Area, Kagawasan Ave, Dumaguete City, Negros Oriental, Philippines
              </p>
              <p className="mt-1 text-sm text-slate-400">Mon–Fri, 8:00 AM – 5:00 PM</p>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-white">Quick Links</h4>
              <ul className="grid gap-2">
                <li><Link href="/vacancies" className="text-slate-200 hover:underline">Vacancies</Link></li>
                <li><Link href="/about" className="text-slate-200 hover:underline">About HR</Link></li>
                <li><Link href="/login" className="text-slate-200 hover:underline">Login</Link></li>
                <li><Link href="/signup" className="text-slate-200 hover:underline">Signup</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-white">Contact</h4>
              <ul className="grid gap-2 text-slate-200">
                <li>Email: <a href="mailto:hr@norsu.edu.ph" className="hover:underline">hr@norsu.edu.ph</a></li>
                <li>Phone: (035) 123-4567</li>
                <li>Help Desk: <a href="#" className="hover:underline">Submit a ticket</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-white">Follow</h4>
              <p className="text-sm text-slate-400">Stay connected with university updates.</p>
              <div className="mt-2 flex gap-2">
                <a href="#" aria-label="Facebook" title="Facebook" className="text-slate-200 hover:underline">Facebook</a>
                <a href="#" aria-label="Twitter" title="Twitter" className="text-slate-200 hover:underline">Twitter/X</a>
              </div>
            </div>
          </div>
          <div className="mx-auto w-full max-w-6xl border-t border-white/10 px-4 py-4 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Negros Oriental State University • Human Resource Management.
          </div>
        </footer>
      </body>
    </html>
  )
}