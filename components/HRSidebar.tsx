'use client'

import { useState, useEffect } from 'react'
import HRSidebar from '../components/HRSidebar'

interface Applicant {
  id: string
  email: string
  phone?: string
  role: string
  created_at: string
  user_data: any
}

interface JobPosting {
  id: string
  job_title: string
  department: string
  location: string
  status: string
}

interface Application {
  id: string
  job_id: string
  applicant_id: string
  pdf_path: string
  comment?: string
  submitted_at: string
  status: string
  applicant: Applicant
  job_posting: JobPosting | null
}

export default function HRTagPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/hr/applications')
      
      if (!response.ok) {
        throw new Error('Failed to fetch applications')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setApplications(data.applications)
      } else {
        throw new Error(data.error || 'Failed to fetch applications')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      setUpdating(applicationId)
      
      const response = await fetch('/api/hr/applications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          status: newStatus,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to update status')
      }

      // Update local state
      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <HRSidebar />
          <div className="flex-1 container mx-auto py-6">
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <p className="text-lg">Loading applications...</p>
                <p className="text-sm text-muted-foreground mt-2">Please wait while we fetch the data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <HRSidebar />
          <div className="flex-1 container mx-auto py-6">
            <div className="flex justify-center items-center h-64">
              <div className="text-center text-destructive">
                <p className="font-semibold">Error Loading Applications</p>
                <p className="mt-2 text-sm">{error}</p>
                <button 
                  onClick={fetchApplications} 
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <HRSidebar 
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        
        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          {/* Mobile Header */}
          <div className="lg:hidden bg-white border-b p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 hover:bg-gray-100 transition-colors duration-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="text-lg font-bold text-gray-900">Application Management</div>
              <div className="w-10"></div> {/* Spacer for balance */}
            </div>
          </div>

          {/* Content */}
          <div className="container mx-auto py-6 space-y-6 px-4 lg:px-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Application Management</h1>
                <p className="text-muted-foreground">
                  Manage and review job applications
                </p>
              </div>
              <button 
                onClick={fetchApplications} 
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="p-6">
                <h2 className="text-2xl font-semibold">Applications</h2>
                <p className="text-gray-600">
                  Review and update application statuses. Total: {applications.length} applications
                </p>
              </div>
              <div className="p-6">
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No applications found.</p>
                    <button 
                      onClick={fetchApplications} 
                      className="mt-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Refresh
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Position</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Update Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {applications.map((application) => (
                          <tr key={application.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <p className="font-medium">
                                  {application.applicant.user_data?.name || application.applicant.email}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {application.applicant.email}
                                </p>
                                {application.applicant.phone && (
                                  <p className="text-sm text-gray-500">
                                    {application.applicant.phone}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {application.job_posting?.job_title || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {application.job_posting?.department || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {formatDate(application.submitted_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                application.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                                application.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={application.status}
                                onChange={(e) => updateApplicationStatus(application.id, e.target.value)}
                                disabled={updating === application.id}
                                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="pending">Pending</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                              </select>
                              {updating === application.id && (
                                <p className="text-xs text-gray-500 mt-1">Updating...</p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}