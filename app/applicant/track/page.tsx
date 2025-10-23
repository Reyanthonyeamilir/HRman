import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TrackPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Track Application Status</h1>

      <Card className="border-blue-100">
        <CardHeader>
          <CardTitle className="text-sm">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 border-l-2 border-blue-200 pl-4 text-sm">
            <div>
              <div className="font-semibold">Submitted</div>
              <div className="text-slate-500">Mar 1, 2025</div>
            </div>
            <div>
              <div className="font-semibold">Under Review</div>
              <div className="text-slate-500">Your application is being reviewed</div>
            </div>
            <div>
              <div className="font-semibold">Interview</div>
              <div className="text-slate-500">Pending schedule</div>
            </div>
            <div>
              <div className="font-semibold">Offer</div>
              <div className="text-slate-500">—</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-slate-500">NORSU • Human Resource Management</div>
    </div>
  )
}
