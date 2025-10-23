'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listActiveJobs, submitApplication, listMyApplications, getSignedUrl } from '@/lib/applicant'

type Job = { id: number; job_title: string }
type Row = {
  id: number
  job_id: number
  job_title: string
  job_status: string
  pdf_path: string
  comment: string
  submitted_at: string
}

export default function RequirementsPage() {
  const params = useSearchParams()
  const initPos = params.get('position') || '—'

  // form state
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [jobId, setJobId] = React.useState<number | null>(null)
  const [comment, setComment] = React.useState<string>('')
  const [file, setFile] = React.useState<File | null>(null)
  const [submitting, setSubmitting] = React.useState<boolean>(false)

  // visual mirrors
  const [position, setPosition] = React.useState<string>(initPos)
  const [submittedFlag, setSubmittedFlag] = React.useState<boolean>(false)

  // table state
  const [rows, setRows] = React.useState<Row[]>([])
  const [loadingTable, setLoadingTable] = React.useState<boolean>(true)

  // load jobs + my applications
  React.useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const active = await listActiveJobs()
        if (!alive) return
        const minimal: Job[] = (active ?? []).map((j: any) => ({ id: j.id as number, job_title: String(j.job_title) }))
        setJobs(minimal)

        if (initPos && initPos !== '—') {
          const match = minimal.find(j => j.job_title === initPos)
          if (match) {
            setJobId(match.id)
            setPosition(match.job_title)
          }
        }
      } catch (e) {
        console.error('[listActiveJobs] failed:', e)
      }
    })()

    ;(async () => {
      try {
        setLoadingTable(true)
        const data = await listMyApplications()
        if (!alive) return
        setRows(data as Row[])
      } catch (e) {
        console.error('[listMyApplications] failed:', e)
      } finally {
        setLoadingTable(false)
      }
    })()

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initPos]) // re-run if ?position= changes

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setSubmittedFlag(false)
  }

  async function onSubmit() {
    if (!jobId) {
      alert('Please choose a job first.')
      return
    }
    if (!file) {
      alert('Please attach a PDF of your requirements.')
      return
    }
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.')
      return
    }

    try {
      setSubmitting(true)
      const id = await submitApplication({ job_id: jobId, file, comment })
      setSubmittedFlag(true)
      setFile(null)
      setComment('')

      const data = await listMyApplications()
      setRows(data as Row[])

      alert(`Submitted! Application #${id}`)
    } catch (e: any) {
      console.error('[submitApplication] failed:', e)
      alert(e?.message ?? 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Submit Requirements</h1>

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge>Position</Badge>
        <span className="font-semibold">{position}</span>
        <span className="ml-auto text-blue-700">{submittedFlag ? 'Submitted' : 'Draft'}</span>
      </div>

      {/* Form card */}
      <Card className="border-blue-100">
        <CardHeader>
          <CardTitle className="text-sm">Upload your PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            {/* Job select */}
            <div className="grid gap-1">
              <label className="text-xs font-medium text-slate-600">Select Job</label>
              <Select
                value={jobId !== null ? String(jobId) : ''}
                onValueChange={(v: string) => {
                  const id = Number(v)
                  setJobId(Number.isFinite(id) ? id : null)
                  const title = jobs.find(j => j.id === id)?.job_title ?? '—'
                  setPosition(title)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a job…" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={String(j.id)}>
                      {j.job_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File */}
            <div className="grid gap-1">
              <label className="text-xs font-medium text-slate-600">Attachment (PDF)</label>
              <Input type="file" accept="application/pdf" onChange={onPick} />
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={onSubmit}
                disabled={submitting || !file || jobId === null}
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null)
                  setComment('')
                  setSubmittedFlag(false)
                }}
                disabled={submitting && !file}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Comment */}
          <div className="grid gap-1">
            <label className="text-xs font-medium text-slate-600">Comment</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a note for HR…"
            />
          </div>

          {/* Selected file preview (name only) */}
          {file && (
            <div className="rounded-xl border bg-blue-50 p-3 text-sm text-slate-700">
              Selected file: <span className="font-medium">{file.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submissions table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Your Submissions</h2>
          {loadingTable && <span className="text-xs text-slate-500">Loading…</span>}
        </div>

        <Card className="border-blue-100">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[90px]">Job ID</TableHead>
                  <TableHead className="min-w-[220px]">Job Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-[220px]">PDF Path</TableHead>
                  <TableHead className="min-w-[220px]">Comment</TableHead>
                  <TableHead className="min-w-[160px]">Submitted At</TableHead>
                  <TableHead className="min-w-[90px]">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-slate-500">
                      No submissions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => <SubmissionRow key={r.id} row={r} />)
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function formatDate(s: string) {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString()
}

function SubmissionRow({ row }: { row: Row }) {
  const [url, setUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      if (!row.pdf_path) return
      try {
        const u = await getSignedUrl(row.pdf_path)
        if (alive) setUrl(u)
      } catch (e) {
        console.error('[getSignedUrl] failed:', e)
      }
    })()
    return () => {
      alive = false
    }
  }, [row.pdf_path])

  return (
    <TableRow>
      <TableCell>{row.job_id}</TableCell>
      <TableCell className="font-medium">{row.job_title}</TableCell>
      <TableCell>{row.job_status}</TableCell>
      <TableCell className="truncate">{row.pdf_path || '—'}</TableCell>
      <TableCell className="max-w-[280px] truncate" title={row.comment}>
        {row.comment || '—'}
      </TableCell>
      <TableCell>{formatDate(row.submitted_at)}</TableCell>
      <TableCell>
        {url ? (
          <a className="text-blue-600 hover:underline" href={url} target="_blank" rel="noreferrer">
            Open
          </a>
        ) : (
          '—'
        )}
      </TableCell>
    </TableRow>
  )
}
