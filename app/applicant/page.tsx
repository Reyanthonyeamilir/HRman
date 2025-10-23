import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card className="border-blue-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-slate-900">{value}</div>
        {subtitle && <div className="mt-1 text-xs text-blue-600">{subtitle}</div>}
        <Button variant="link" className="px-0 text-xs text-blue-600">View</Button>
      </CardContent>
    </Card>
  )
}

export default function Page() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <StatCard title="Open Job Posts" value="6" subtitle="Updated today" />
      <StatCard title="Applications" value="1" subtitle="1 in review" />
      <StatCard title="Requirements" value="Draft" subtitle="0 pending" />
      <Card className="border-blue-100 xl:col-span-2">
        <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
        <CardContent>Welcome! Check new postings and complete your requirements.</CardContent>
      </Card>
      <Card className="border-blue-100">
        <CardHeader><CardTitle>Next Steps</CardTitle></CardHeader>
        <CardContent>Finish your profile, then submit requirements for your selected position.</CardContent>
      </Card>
    </div>
  )
}
