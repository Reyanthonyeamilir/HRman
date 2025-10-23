// app/vacancies/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function VacanciesPage() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  const linkBase =
    "block rounded-full px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:inline-block"
  const isActive = (href: string) => (pathname === href ? "bg-slate-100 text-slate-900" : "")

  return (
    <>
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_rgba(2,8,23,0.06)]">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
          <Link className="inline-flex items-center gap-2 font-extrabold" href="/" aria-label="NORSU Home">
            <Image src="/norsu.png" alt="NORSU Seal" width={34} height={34} />
            <span>NORSU • HRM</span>
          </Link>

          <button
            className="ml-auto inline-grid place-items-center rounded-[10px] p-1.5 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,103,255,0.25)]"
            aria-label="Toggle navigation"
            aria-controls="siteNav"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <nav
            id="siteNav"
            aria-label="Primary Navigation"
            className={`${
              open ? "translate-y-0 shadow-[0_10px_20px_rgba(2,8,23,0.08)]" : "-translate-y-[120%]"
            } fixed left-0 right-0 top-[60px] border-t border-slate-200 bg-white transition md:static md:translate-y-0 md:border-0 md:shadow-none`}
          >
            <ul className="mx-auto flex w-full max-w-6xl flex-col gap-0 px-4 py-2 md:flex-row md:items-center md:gap-4 md:py-0">
              <li className="w-full md:w-auto">
                <Link href="/" className={`${linkBase}`}>Home</Link>
              </li>
              <li className="w-full md:w-auto">
                <Link href="/about" className={`${linkBase}`}>About</Link>
              </li>
              <li className="w-full md:w-auto">
                <Link
                  href="/vacancies"
                  aria-current="page"
                  className={`${linkBase} ${isActive("/vacancies")}`}
                >
                  Vacancies
                </Link>
              </li>
              <li className="ml-auto w-full md:w-auto">
                <Link href="/login" className={`${linkBase}`}>Login</Link>
              </li>
              <li className="w-full md:w-auto">
                <Link
                  href="/signup"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#2f67ff] px-4 font-bold text-white transition hover:-translate-y-[1px] hover:bg-[#2553cc]"
                >
                  Signup
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* CONTENT */}
      <section className="py-12 md:py-16">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="mb-4 text-center">
            <div className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#2f67ff]">Open Positions</div>
            <h2 className="text-2xl font-semibold md:text-3xl">Current Vacancies</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Card 1 */}
            <article className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-[2px] hover:shadow-[0_16px_40px_rgba(2,8,23,0.12)]">
              <div className="p-4">
                <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold tracking-wide text-slate-800">
                  Faculty
                </span>
                <h3 className="mt-2 text-lg font-semibold">Instructor I – Computer Science</h3>
                <p className="mt-1 text-sm text-slate-600">Deadline: Nov 15, 2025 · Dumaguete Campus</p>
                <div className="mt-3">
                  <Button asChild className="rounded-full bg-[#2f67ff] hover:bg-[#2553cc]">
                    <Link href="#">View Details</Link>
                  </Button>
                </div>
              </div>
            </article>

            {/* Card 2 */}
            <article className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-[2px] hover:shadow-[0_16px_40px_rgba(2,8,23,0.12)]">
              <div className="p-4">
                <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold tracking-wide text-slate-800">
                  Admin
                </span>
                <h3 className="mt-2 text-lg font-semibold">HR Assistant – Records</h3>
                <p className="mt-1 text-sm text-slate-600">Deadline: Oct 30, 2025 · HRM Office</p>
                <div className="mt-3">
                  <Button asChild className="rounded-full bg-[#2f67ff] hover:bg-[#2553cc]">
                    <Link href="#">View Details</Link>
                  </Button>
                </div>
              </div>
            </article>

            {/* Card 3 */}
            <article className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-[2px] hover:shadow-[0_16px_40px_rgba(2,8,23,0.12)]">
              <div className="p-4">
                <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold tracking-wide text-slate-800">
                  Staff
                </span>
                <h3 className="mt-2 text-lg font-semibold">IT Support Specialist</h3>
                <p className="mt-1 text-sm text-slate-600">Deadline: Nov 10, 2025 · University-wide</p>
                <div className="mt-3">
                  <Button asChild className="rounded-full bg-[#2f67ff] hover:bg-[#2553cc]">
                    <Link href="#">View Details</Link>
                  </Button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-300">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="inline-flex items-center gap-2 font-extrabold text-white">
              <Image src="/norsu.png" alt="NORSU Seal" width={34} height={34} />
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
              <li>
                <a href="/vacancies" className="text-slate-200 hover:underline">
                  Vacancies
                </a>
              </li>
              <li>
                <a href="/about" className="text-slate-200 hover:underline">
                  About HR
                </a>
              </li>
              <li>
                <a href="/login" className="text-slate-200 hover:underline">
                  Login
                </a>
              </li>
              <li>
                <a href="/signup" className="text-slate-200 hover:underline">
                  Signup
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-semibold text-white">Contact</h4>
            <ul className="grid gap-2 text-slate-200">
              <li>
                Email:{" "}
                <a href="mailto:hr@norsu.edu.ph" className="hover:underline">
                  hr@norsu.edu.ph
                </a>
              </li>
              <li>Phone: (035) 123-4567</li>
              <li>
                Help Desk:{" "}
                <a href="#" className="hover:underline">
                  Submit a ticket
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-semibold text-white">Follow</h4>
            <p className="text-sm text-slate-400">Stay connected with university updates.</p>
            <div className="mt-2 flex gap-2">
              <a href="#" aria-label="Facebook" title="Facebook" className="text-slate-200 hover:underline">
                Facebook
              </a>
              <a href="#" aria-label="Twitter" title="Twitter" className="text-slate-200 hover:underline">
                Twitter/X
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl border-t border-white/10 px-4 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Negros Oriental State University • Human Resource Management.
        </div>
      </footer>
    </>
  )
}
