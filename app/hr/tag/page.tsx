'use client'

import { useState, useEffect } from 'react'
import HRSidebar from '@/components/HRSidebar'

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

  // If you're still getting errors, try this simplified version first:
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <HRSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg">Loading applications...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Application Management</h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6">
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold">Application Management</h1>
            <p className="text-gray-600 mt-2">
              Manage and review job applications
            </p>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 lg:p-6 border-b">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Applications</h2>
                  <p className="text-gray-600">
                    Total: {applications.length} applications
                  </p>
                </div>
                <button 
                  onClick={fetchApplications}
                  className="mt-2 lg:mt-0 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="p-4 lg:p-6">
              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No applications found.</p>
                  <button 
                    onClick={fetchApplications}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Position</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Update Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {applications.map((application) => (
                        <tr key={application.id}>
                          <td className="px-4 py-4">
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
                          <td className="px-4 py-4">
                            {application.job_posting?.job_title || 'N/A'}
                          </td>
                          <td className="px-4 py-4">
                            {application.job_posting?.department || 'N/A'}
                          </td>
                          <td className="px-4 py-4">
                            {formatDate(application.submitted_at)}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              application.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                              application.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <select
                              value={application.status}
                              onChange={(e) => updateApplicationStatus(application.id, e.target.value)}
                              disabled={updating === application.id}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  )
}