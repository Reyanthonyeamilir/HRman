"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"

export default function AboutPage() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  const linkBase =
    "block rounded-full px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:inline-block"
  const isActive = (href: string) =>
    pathname === href ? "bg-slate-100 text-slate-900" : ""

  return (
    <>
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_rgba(2,8,23,0.06)]">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
          <Link className="inline-flex items-center gap-2 font-extrabold" href="/" aria-label="NORSU Home">
            <Image src="/images/norsu.png" alt="NORSU Seal" width={34} height={34} />
            <span>NORSU • HRM</span>
          </Link>

          <button
            className="ml-auto inline-grid place-items-center rounded-[10px] p-1.5 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,103,255,0.25)]"
            aria-label="Toggle navigation"
            aria-controls="siteNav"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <nav
            id="siteNav"
            aria-label="Primary Navigation"
            className={`${open ? "translate-y-0 shadow-[0_10px_20px_rgba(2,8,23,0.08)]" : "-translate-y-[120%]"}
              fixed left-0 right-0 top-[60px] border-t border-slate-200 bg-white transition
              md:static md:translate-y-0 md:border-0 md:shadow-none`}
          >
            <ul className="mx-auto flex w-full max-w-6xl flex-col gap-0 px-4 py-2 md:flex-row md:items-center md:gap-4 md:py-0">
              <li className="w-full md:w-auto">
                <Link href="/" className={`${linkBase} ${isActive("/")}`} onClick={() => setOpen(false)}>Home</Link>
              </li>
              <li className="w-full md:w-auto">
                <Link href="/about" className={`${linkBase} ${isActive("/about")}`} onClick={() => setOpen(false)}>About</Link>
              </li>
              <li className="w-full md:w-auto">
                <Link href="/vacancies" className={`${linkBase} ${isActive("/vacancies")}`} onClick={() => setOpen(false)}>Vacancies</Link>
              </li>
              <li className="ml-auto w-full md:w-auto">
                <Link href="/login" className={`${linkBase} ${isActive("/login")}`} onClick={() => setOpen(false)}>Login</Link>
              </li>
              <li className="w-full md:w-auto">
                <Link
                  href="/signup"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#2f67ff] px-4 font-bold text-white transition hover:-translate-y-[1px] hover:bg-[#2553cc]"
                  onClick={() => setOpen(false)}
                >
                  Signup
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* BACKGROUND IMAGE SECTION - Same as Vacancies page */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#0b1b3b] via-[#1e3a8a] to-[#2563eb]">
        {/* Background Image with Responsive Sizing */}
        <div className="absolute inset-0">
          <Image
            src="/images/norsu-campus.jpg"
            alt="NORSU Campus"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            quality={80}
            style={{
              objectPosition: 'center 30%'
            }}
          />
          {/* Enhanced Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1b3b]/90 via-[#0b1b3b]/70 to-[#0b1b3b]/90 md:from-[#0b1b3b]/80 md:via-[#0b1b3b]/50 md:to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1b3b] via-transparent to-transparent"></div>
          {/* Subtle Pattern Overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%223%22%20cy%3D%223%22%20r%3D%221%22/%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%221%22/%3E%3C/g%3E%3C/svg%3E')]"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 mx-auto max-w-6xl px-4">
          <div className="flex min-h-[50vh] items-center py-16 md:min-h-[60vh] md:py-24">
            <div className="w-full max-w-2xl">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 border border-white/20">
                <div className="h-2 w-2 rounded-full bg-[#2563eb] animate-pulse"></div>
                <span className="text-sm font-semibold uppercase tracking-widest text-white">
                  About HRM
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="mb-4 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                Empowering
                <span className="block bg-gradient-to-r from-white to-[#c7d7ff] bg-clip-text text-transparent">
                  NORSU Excellence
                </span>
              </h1>

              {/* Description */}
              <p className="mb-8 text-lg leading-relaxed text-[#c7d7ff] md:text-xl md:max-w-xl">
                Discover how our Human Resource Management team supports the growth and success of Negros Oriental State University's dedicated faculty and staff.
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white md:text-3xl">500+</div>
                  <div className="text-sm text-[#c7d7ff]">Employees Supported</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white md:text-3xl">15+</div>
                  <div className="text-sm text-[#c7d7ff]">Years of Service</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white md:text-3xl">24/7</div>
                  <div className="text-sm text-[#c7d7ff]">HR Support</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg 
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none" 
            className="w-full h-12 md:h-20 text-white"
          >
            <path 
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
              opacity=".25" 
              fill="currentColor"
            ></path>
            <path 
              d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" 
              opacity=".5" 
              fill="currentColor"
            ></path>
            <path 
              d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" 
              fill="currentColor"
            ></path>
          </svg>
        </div>
      </div>

      {/* ABOUT SECTION */}
      <section className="py-16 md:py-20 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="mb-12 text-center">
            <div className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#2f67ff]">About HRM</div>
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">Who we are and what we do</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Dedicated to supporting the NORSU community with comprehensive human resource services and solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="p-6">
                <div className="mb-4 inline-flex rounded-xl bg-blue-100 p-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Our Mission</h3>
                <p className="mt-3 text-slate-600">
                  To support NORSU employees with fair, transparent, and efficient HR services that foster professional growth and organizational excellence.
                </p>
              </div>
            </div>

            <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="p-6">
                <div className="mb-4 inline-flex rounded-xl bg-green-100 p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Our Services</h3>
                <p className="mt-3 text-slate-600">
                  Comprehensive HR services including recruitment, onboarding, benefits administration, employee relations, professional development, and performance management.
                </p>
              </div>
            </div>

            <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="p-6">
                <div className="mb-4 inline-flex rounded-xl bg-purple-100 p-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Get Help</h3>
                <p className="mt-3 text-slate-600">
                  Reach us via our help desk for any HR-related requests and concerns. We're committed to providing timely and effective support to all NORSU employees.
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Our Commitment</h3>
              <p className="text-slate-600 mb-4">
                At NORSU HRM, we are dedicated to creating a supportive and inclusive work environment where every employee can thrive and contribute to the university's mission of academic excellence.
              </p>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  Employee welfare and development
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  Fair and transparent processes
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  Continuous improvement and innovation
                </li>
              </ul>
            </div>
            <div className="rounded-2xl bg-slate-50 p-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Contact Information</h3>
              <div className="space-y-4 text-slate-600">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>(035) 123-4567</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>hr@norsu.edu.ph</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Capitol Area, Kagawasan Ave, Dumaguete City</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}

function Footer() {
  return (
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
  )
}