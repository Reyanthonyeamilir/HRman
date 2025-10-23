'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const JOBS = [
  { title: 'Assistant Professor — Computer Science', dept: 'College of Computer Studies', campus: 'Dumaguete City', posted: 'Sep 20, 2025', status: 'Open', type: 'Faculty', desc: 'Teach undergraduate computer science courses, supervise research projects, and contribute to curriculum development.' },
  { title: 'IT Support Specialist', dept: 'University IT', campus: 'All Campuses', posted: 'Nov 10, 2025', status: 'Open', type: 'Staff', desc: 'Provide technical support to faculty and staff, manage tickets, and maintain labs and networks.' },
  { title: 'HR Assistant — Records', dept: 'HRM Office', campus: 'Main Campus', posted: 'Oct 30, 2025', status: 'Open', type: 'Admin', desc: 'Assist with HR records, document control, and onboarding coordination.' },
]
type Job = typeof JOBS[number]

export default function JobPostingsPage() {
  const [q, setQ] = React.useState('')
  const [type, setType] = React.useState<'all' | Job['type']>('all')
  const [status, setStatus] = React.useState<'all' | Job['status']>('all')

  const filtered = JOBS.filter(j =>
    (type === 'all' || j.type === type) &&
    (status === 'all' || j.status === status) &&
    (j.title.toLowerCase().includes(q.toLowerCase()) ||
     j.dept.toLowerCase().includes(q.toLowerCase()) ||
     j.desc.toLowerCase().includes(q.toLowerCase()))
  )

  function onApply(title: string) {
    // Navigate to Requirements with ?position
    window.location.href = `/applicant/requirements?position=${encodeURIComponent(title)}`
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Job Postings — Negros Oriental State University</h1>

      <div className="grid gap-2 md:grid-cols-4">
        <Input placeholder="Search jobs" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={type} onValueChange={(v) => setType(v as any)}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Job</SelectItem>
            <SelectItem value="Faculty">Faculty</SelectItem>
            <SelectItem value="Staff">Staff</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger><SelectValue placeholder="Date" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recent</SelectItem>
            <SelectItem value="older">Older</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((j) => (
          <Card key={j.title} className="border-blue-200 bg-gradient-to-b from-blue-900 to-blue-950 text-blue-50">
            <CardHeader>
              <div className="inline-flex items-center gap-2 text-xs">
                <span className="rounded-full border border-blue-300/50 bg-blue-600/20 px-2 py-0.5">{j.type}</span>
                <span className="text-blue-200">{j.status}</span>
              </div>
              <CardTitle className="mt-1 text-base text-blue-50">{j.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-100">
              <div className="text-sm">Department: {j.dept}</div>
              <div className="text-sm">Location: {j.campus}</div>
              <div className="text-sm">Posted: {j.posted}</div>
              <p className="mt-2 text-sm text-blue-100/90">{j.desc}</p>
              <div className="mt-3">
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => onApply(j.title)}>
                  Apply / Submit Requirements
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-blue-100 bg-white/80">
        <CardContent className="py-3 text-sm text-slate-500">End of listings</CardContent>
      </Card>
    </div>
  )
}
