'use client'
import React, { useState, useEffect } from 'react'
import AdminSidebar, { MobileTopbar } from '@/components/AdminSidebar'
import { supabase } from '@/lib/supabaseClient'
import { Users, UserPlus, Search, Mail, Phone, Calendar, X, Eye, EyeOff, Edit, Trash2, Save, XCircle } from 'lucide-react'

interface User {
  id: string
  email: string
  phone: string | null
  role: 'applicant' | 'hr' | 'super_admin'
  created_at: string
}

export default function UsersManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'applicant' | 'hr' | 'super_admin'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    role: 'applicant' as 'applicant' | 'hr'
  })

  const [editFormData, setEditFormData] = useState({
    email: '',
    phone: '',
    role: 'applicant' as 'applicant' | 'hr' | 'super_admin'
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  // CREATE - Add new user using auth.signUp
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      // Validate form data
      if (!formData.email || !formData.password) {
        throw new Error('Email and password are required')
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long')
      }

      // 1. Create auth user using regular signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            phone: formData.phone || null,
            role: formData.role
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      // 2. Create profile with role
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          phone: formData.phone || null,
          role: formData.role
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Note: We can't delete the auth user without admin API, but the profile is the main data we care about
        throw profileError
      }

      // Refresh users list
      await fetchUsers()
      
      // Reset form and close
      setFormData({
        email: '',
        password: '',
        phone: '',
        role: 'applicant'
      })
      setShowAddForm(false)
      
      alert('User created successfully! They will need to confirm their email before logging in.')

    } catch (error: any) {
      console.error('Error creating user:', error)
      alert('Error creating user: ' + error.message)
    } finally {
      setFormLoading(false)
    }
  }

  // READ - Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      alert('Error fetching users')
    } finally {
      setLoading(false)
    }
  }

  // UPDATE - Edit user
  const startEdit = (user: User) => {
    setEditingUserId(user.id)
    setEditFormData({
      email: user.email,
      phone: user.phone || '',
      role: user.role
    })
  }

  const cancelEdit = () => {
    setEditingUserId(null)
    setEditFormData({
      email: '',
      phone: '',
      role: 'applicant'
    })
  }

  const handleEditSubmit = async (userId: string) => {
    setEditLoading(true)

    try {
      // Validate edit form data
      if (!editFormData.email) {
        throw new Error('Email is required')
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          email: editFormData.email,
          phone: editFormData.phone || null,
          role: editFormData.role
        })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, ...editFormData }
          : user
      ))

      setEditingUserId(null)
      alert('User updated successfully!')

    } catch (error: any) {
      console.error('Error updating user:', error)
      alert('Error updating user: ' + error.message)
    } finally {
      setEditLoading(false)
    }
  }

  // DELETE - Remove user
  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This will remove their profile but they may still be able to login until their auth account expires.`)) {
      return
    }

    try {
      // First check if user has any applications
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('id')
        .eq('applicant_id', userId)

      if (appsError) throw appsError

      if (applications && applications.length > 0) {
        if (!confirm(`This user has ${applications.length} application(s). Deleting will remove all their applications. Continue?`)) {
          return
        }

        // Delete user's applications first
        const { error: deleteAppsError } = await supabase
          .from('applications')
          .delete()
          .eq('applicant_id', userId)

        if (deleteAppsError) throw deleteAppsError
      }

      // Check if user has any job postings
      const { data: jobPostings, error: jobsError } = await supabase
        .from('job_postings')
        .select('id')
        .eq('created_by', userId)

      if (jobsError) throw jobsError

      if (jobPostings && jobPostings.length > 0) {
        if (!confirm(`This user has created ${jobPostings.length} job posting(s). These will be orphaned. Continue?`)) {
          return
        }
      }

      // Delete the user profile (we can't delete auth user without admin API)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError) throw profileError

      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId))
      alert('User profile deleted successfully! Note: Their auth account may still exist.')

    } catch (error: any) {
      console.error('Error deleting user:', error)
      alert('Error deleting user: ' + error.message)
    }
  }

  // Form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Helper functions
  const getRoleBadge = (role: string) => {
    const styles = {
      super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
      hr: 'bg-blue-100 text-blue-800 border-blue-200',
      applicant: 'bg-green-100 text-green-800 border-green-200'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[role as keyof typeof styles]}`}>
        {role.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="flex h-screen bg-gray-50/30">
      <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileTopbar onMenu={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-8 w-8 text-blue-600" />
                User Management
              </h1>
              <p className="text-gray-600 mt-1">Manage all user accounts and roles</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </button>
          </div>

          {/* Add User Form */}
          {showAddForm && (
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="user@example.com"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Min 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="applicant">Applicant</option>
                    <option value="hr">HR Manager</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3 w-3" />
                        Create User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="hr">HR Manager</option>
                <option value="applicant">Applicant</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No users found</p>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Add Your First User
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {editingUserId === user.id ? (
                            <input
                              type="email"
                              name="email"
                              value={editFormData.email}
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              required
                            />
                          ) : (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Mail className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.email}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {user.id.substring(0, 8)}...
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                        
                        <td className="px-4 py-3">
                          {editingUserId === user.id ? (
                            <select
                              name="role"
                              value={editFormData.role}
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              disabled={user.role === 'super_admin'}
                            >
                              <option value="applicant">Applicant</option>
                              <option value="hr">HR Manager</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          ) : (
                            getRoleBadge(user.role)
                          )}
                        </td>
                        
                        <td className="px-4 py-3">
                          {editingUserId === user.id ? (
                            <input
                              type="tel"
                              name="phone"
                              value={editFormData.phone}
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Phone number"
                            />
                          ) : (
                            <div className="flex items-center text-sm text-gray-500">
                              <Phone className="h-3 w-3 mr-1" />
                              {user.phone || 'Not provided'}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-4 py-3">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(user.created_at)}
                          </div>
                        </td>
                        
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {editingUserId === user.id ? (
                              <>
                                <button
                                  onClick={() => handleEditSubmit(user.id)}
                                  disabled={editLoading}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 transition-colors"
                                  title="Save Changes"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-gray-600 hover:text-gray-900 transition-colors"
                                  title="Cancel"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(user)}
                                  className="text-blue-600 hover:text-blue-900 transition-colors"
                                  title="Edit User"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteUser(user.id, user.email)}
                                  disabled={user.role === 'super_admin'}
                                  className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                                  title={user.role === 'super_admin' ? 'Cannot delete super admin' : 'Delete User'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}