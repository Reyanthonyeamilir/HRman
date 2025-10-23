"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutGrid, Briefcase, ClipboardList, Tag as TagIcon } from "lucide-react"

type CardType = { name: string; job: string; status: string; note?: string }

const NAV_ITEMS = [
  { href: "/hr/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/hr/jobs", label: "Job Posting", icon: Briefcase },
  { href: "/hr/review", label: "Review Application", icon: ClipboardList },
  { href: "/hr/tag", label: "Tag Application Status", icon: TagIcon },
]

export default function HRTagPage() {
  const pathname = usePathname()
  const jobs = ["Faculty", "Librarian", "Administrative Aide", "Lecturer", "MIS Specialist"]
  const [apps, setApps] = React.useState<CardType[]>([
    { name: "Deguzman, David R.", job: "Faculty", status: "For review" },
    { name: "Iva Hemingway", job: "Librarian", status: "Interview" },
    { name: "Lea Santos", job: "Administrative Aide", status: "Shortlisted" },
    { name: "Kim Perez", job: "Lecturer", status: "For review" },
    { name: "Milo Ortega", job: "MIS Specialist", status: "Rejected" },
    { name: "Dana Cruz", job: "MIS Specialist", status: "Hired" },
  ])

  const [q, setQ] = React.useState("")
  const [job, setJob] = React.useState("all")
  const [st, setSt] = React.useState("all")

  const [modalOpen, setModalOpen] = React.useState(false)
  const [idx, setIdx] = React.useState<number | null>(null)

  const filtered = apps.filter(
    a =>
      (job === "all" || a.job === job) &&
      (st === "all" || a.status === st) &&
      (a.name + a.job).toLowerCase().includes(q.toLowerCase())
  )

  const open = (i: number) => {
    setIdx(i)
    setModalOpen(true)
  }
  const save = (status: string, note: string) => {
    if (idx == null) return
    setApps(prev => prev.map((a, i) => (i === idx ? { ...a, status, note } : a)))
    setModalOpen(false)
  }

  return (
    <Shell pathname={pathname} title="Tag Application Status">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search applicant"
          className="min-w-[220px] flex-1 rounded-lg border border-[#0b1b3a] bg-white/90 p-2 text-black"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <select
          className="rounded-lg border border-[#0b1b3a] bg-[#0b1b3a] p-2 text-[#eaf2ff]"
          value={job}
          onChange={e => setJob(e.target.value)}
        >
          <option value="all">Job</option>
          {jobs.map(j => (
            <option key={j}>{j}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-[#0b1b3a] bg-[#0b1b3a] p-2 text-[#eaf2ff]"
          value={st}
          onChange={e => setSt(e.target.value)}
        >
          <option value="all">Status</option>
          {["For review", "Shortlisted", "Interview", "Rejected", "Hired"].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {filtered.map((a, i) => {
          const initials = (a.name.match(/\b\w/g) || []).slice(0, 2).join("").toUpperCase()
          return (
            <div key={i} className="rounded-lg border border-white/20 bg-[#0b1b3a] p-3">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-[#1e3a8a] font-extrabold">
                  {initials}
                </div>
                <div>
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-sm text-[#c7d7ff]">{a.job}</div>
                </div>
                <span className="ml-auto inline-block rounded-full border border-[#93c5fd] px-2 py-0.5 text-xs text-[#eaf2ff]">
                  {a.status}
                </span>
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  variant="secondary"
                  className="border border-white/30 bg-[#0b1b3a] text-[#eaf2ff] hover:bg-[#1e2d5a]"
                  onClick={() => open(i)}
                >
                  Response
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {modalOpen && idx != null && (
        <TagModal
          name={`${apps[idx].name} — ${apps[idx].job}`}
          status={apps[idx].status}
          note={apps[idx].note || ""}
          onClose={() => setModalOpen(false)}
          onSave={save}
        />
      )}
    </Shell>
  )
}

function Shell({ children, pathname, title }: { children: React.ReactNode; pathname: string; title: string }) {
  return (
    <main className="min-h-screen bg-[url('/school.jpg')] bg-cover bg-center">
      <div className="min-h-screen bg-[rgba(11,27,58,0.8)] py-4 text-[#eaf2ff]">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-4 md:grid-cols-[260px_1fr]">
          <aside className="hidden h-fit rounded-[14px] border border-white/25 bg-white/10 p-2 md:block">
            <div className="px-2 pb-2 pt-1 text-sm font-semibold opacity-90">HR Dashboard</div>
            <nav className="grid gap-2">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <SideLink key={href} href={href} pathname={pathname} icon={<Icon className="h-4 w-4" />}>
                  {label}
                </SideLink>
              ))}
            </nav>
          </aside>

          <section className="rounded-[14px] border border-white/25 bg-[#1e3a8a] p-4">
            <h2 className="mb-4 text-xl font-semibold">{title}</h2>
            {children}
          </section>
        </div>
      </div>
    </main>
  )
}

function SideLink({
  href,
  pathname,
  children,
  icon,
}: {
  href: string
  pathname: string
  children: React.ReactNode
  icon: React.ReactNode
}) {
  const active = pathname === href
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 ${
        active
          ? "border-[#a7c3ff] bg-[#1f3a99] text-white"
          : "border-white/25 bg-[#0b1b3a] text-[#e5edff] hover:bg-[#1e3a8a] hover:border-[#93c5fd]"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  )
}

function TagModal({
  name,
  status,
  note,
  onClose,
  onSave,
}: {
  name: string
  status: string
  note: string
  onClose: () => void
  onSave: (s: string, n: string) => void
}) {
  const [st, setSt] = React.useState(status)
  const [msg, setMsg] = React.useState(note)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-[#93c5fd] bg-[#0b1b3a] text-[#eaf2ff]">
        <header className="flex items-center justify-between border-b border-white/20 px-4 py-3">
          <strong>{name}</strong>
          <Button variant="ghost" className="text-[#eaf2ff]" onClick={onClose}>
            ✕
          </Button>
        </header>
        <div className="space-y-3 px-4 py-4">
          <label className="grid gap-1">
            <span className="text-sm text-[#c7d7ff]">Current Status</span>
            <select
              className="w-full rounded-lg border border-[#102a54] bg-[#0f2a6a] p-2"
              value={st}
              onChange={e => setSt(e.target.value)}
            >
              {["For review", "Shortlisted", "Interview", "Rejected", "Hired"].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[#c7d7ff]">Message</span>
            <textarea
              className="w-full rounded-lg border border-[#102a54] bg-[#0f2a6a] p-2"
              value={msg}
              onChange={e => setMsg(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              className="border border-white/30 bg-[#0b1b3a] text-[#eaf2ff] hover:bg-[#1e2d5a]"
              onClick={onClose}
            >
              Close
            </Button>
            <Button className="bg-[#2f67ff] hover:bg-[#2553cc]" onClick={() => onSave(st, msg)}>
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
