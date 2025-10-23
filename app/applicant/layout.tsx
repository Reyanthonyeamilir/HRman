import * as React from 'react'
import ApplicantSidebar, { ApplicantMobileTopbar } from '@/components/ApplicantSidebar'

export default function ApplicantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 text-slate-900"
      style={{ ['--bg-url' as any]: 'var(--applicant-bg, none)' }}
    >
      <div className="md:grid md:min-h-screen md:grid-cols-[18rem_1fr]">
        <ApplicantSidebar />
        <main className="relative">
          <ApplicantMobileTopbar />
          <div className="mx-auto max-w-7xl p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
