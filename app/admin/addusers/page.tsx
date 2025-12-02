'use client'
import React, { useState, useEffect } from 'react'
import AdminSidebar, { MobileTopbar } from '@/components/AdminSidebar'
import { supabase } from '@/lib/supabaseClient'
import { Users, UserPlus, Search, Mail, Phone, Calendar, X, Eye, EyeOff, Edit, Trash2, Save, XCircle, Shield, Briefcase, User } from 'lucide-react'

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
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    role: 'applicant' as 'applicant' | 'hr' | 'super_admin'
  })

  const [editFormData, setEditFormData] = useState({
    email: '',
    phone: '',
    role: 'applicant' as 'applicant' | 'hr' | 'super_admin'
  })

  useEffect(() => {
    fetchUsers()
    getCurrentUserRole()
  }, [])

  // Get current user's role to determine permissions
  const getCurrentUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setCurrentUserRole(profile.role)
        }
      }
    } catch (error) {
      console.error('Error fetching current user role:', error)
    }
  }

  // CREATE - Add new user (Simplified - only creates auth user)
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

      // Check if current user can create super_admin
      if (formData.role === 'super_admin' && currentUserRole !== 'super_admin') {
        throw new Error('Only super admins can create other super admins')
      }

      // Only create auth user - the trigger will automatically create the profile
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

      if (authError) {
        console.error('Auth error details:', authError)
        throw authError
      }

      if (!authData.user) {
        throw new Error('Failed to create user - no user data returned')
      }

      console.log('Auth user created:', authData.user.id)
      
      // Wait for trigger to create profile, then refresh users
      setTimeout(async () => {
        await fetchUsers()
      }, 1500)
      
      // Reset form and close
      setFormData({
        email: '',
        password: '',
        phone: '',
        role: 'applicant'
      })
      setShowAddForm(false)
      
      alert(`User ${formData.email} created successfully with role: ${formData.role}`)

    } catch (error: any) {
      console.error('Error creating user:', error)
      
      // Better error messages
      if (error.message.includes('User already registered')) {
        alert('Error: This email is already registered')
      } else if (error.message.includes('password')) {
        alert('Error: ' + error.message)
      } else if (error.message.includes('rate limit')) {
        alert('Error: Too many attempts. Please wait a moment')
      } else {
        alert('Error creating user: ' + error.message)
      }
    } finally {
      setFormLoading(false)
    }
  }

  // READ - Fetch all users with better error handling
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log('Fetched users:', data?.length)
      setUsers(data || [])
    } catch (error: any) {
      console.error('Error fetching users:', error)
      alert('Error fetching users: ' + error.message)
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

      // Check if current user can change roles
      const userToEdit = users.find(u => u.id === userId)
      if (!userToEdit) throw new Error('User not found')

      // Prevent non-super_admins from editing super_admin users
      if (currentUserRole !== 'super_admin' && userToEdit.role === 'super_admin') {
        throw new Error('Only super admins can edit other super admin users')
      }

      // Prevent changing a user to super_admin if current user is not super_admin
      if (editFormData.role === 'super_admin' && currentUserRole !== 'super_admin') {
        throw new Error('Only super admins can assign super_admin role')
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

  // DELETE - Remove user with improved logic
  const deleteUser = async (userId: string, userEmail: string) => {
    try {
      // Get the user being deleted
      const userToDelete = users.find(u => u.id === userId)
      if (!userToDelete) return

      // Prevent deleting super_admin users if current user is not super_admin
      if (userToDelete.role === 'super_admin' && currentUserRole !== 'super_admin') {
        alert('Error: Only super admins can delete other super admin users')
        return
      }

      // Prevent deleting your own account
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser?.id === userId) {
        alert('You cannot delete your own account from this page!')
        return
      }

      if (!confirm(`Are you sure you want to delete user ${userEmail} (${userToDelete.role})?`)) {
        return
      }

      // Check for related data
      const { data: applications } = await supabase
        .from('applications')
        .select('id')
        .eq('applicant_id', userId)

      const { data: jobPostings } = await supabase
        .from('job_postings')
        .select('id')
        .eq('created_by', userId)

      if ((applications && applications.length > 0) || (jobPostings && jobPostings.length > 0)) {
        if (!confirm(`This user has related data. Deleting will remove ${applications?.length || 0} applications and orphan ${jobPostings?.length || 0} job postings. Continue?`)) {
          return
        }
        
        // Delete applications first
        if (applications && applications.length > 0) {
          const { error: deleteAppsError } = await supabase
            .from('applications')
            .delete()
            .eq('applicant_id', userId)
          
          if (deleteAppsError) throw deleteAppsError
        }
      }

      // Delete the user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError) throw profileError

      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId))
      alert('User profile deleted! Note: Their auth account still exists and they can login. To fully delete, use Supabase Admin API.')

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
                         (user.phone && user.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Helper functions
  const getRoleBadge = (role: string) => {
    const styles = {
      super_admin: 'bg-purple-100 text-purple-800 border-purple-300',
      hr: 'bg-blue-100 text-blue-800 border-blue-300',
      applicant: 'bg-green-100 text-green-800 border-green-300'
    }

    const roleText = {
      super_admin: 'Super Admin',
      hr: 'HR Manager',
      applicant: 'Applicant'
    }

    const roleIcon = {
      super_admin: <Shield className="h-3 w-3" />,
      hr: <Briefcase className="h-3 w-3" />,
      applicant: <User className="h-3 w-3" />
    }

    return (
      <div className={`px-3 py-1.5 text-xs font-medium rounded-full border inline-flex items-center gap-1.5 ${styles[role as keyof typeof styles]}`}>
        {roleIcon[role as keyof typeof roleIcon]}
        {roleText[role as keyof typeof roleText]}
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Check if current user can add super_admin
  const canAddSuperAdmin = currentUserRole === 'super_admin'

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
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="absolute right-3 top-9 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    disabled={!canAddSuperAdmin}
                  >
                    <option value="applicant">Applicant</option>
                    <option value="hr">HR Manager</option>
                    {canAddSuperAdmin && (
                      <option value="super_admin">Super Admin</option>
                    )}
                  </select>
                  {!canAddSuperAdmin && (
                    <p className="text-xs text-gray-500 mt-1">
                      Only super admins can create super admin users
                    </p>
                  )}
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Create User
                      </>
                    )}
                  </button>
                </div>
              </form>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Note:</strong> User will be created in the authentication system. 
                  Their profile will appear automatically in the list below.
                  {!canAddSuperAdmin && ' Only super admins can create other super admin users.'}
                </p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold mt-1">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">HR Managers</p>
                  <p className="text-2xl font-bold mt-1">
                    {users.filter(u => u.role === 'hr').length}
                  </p>
                </div>
                <Briefcase className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Applicants</p>
                  <p className="text-2xl font-bold mt-1">
                    {users.filter(u => u.role === 'applicant').length}
                  </p>
                </div>
                <User className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
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
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No users found</p>
                <p className="text-gray-500 text-sm mb-4">
                  {searchTerm || roleFilter !== 'all' ? 'Try changing your filters' : 'Add your first user'}
                </p>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Add New User
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User Details
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
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
                              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Mail className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="ml-4">
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
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUserId === user.id ? (
                            <select
                              name="role"
                              value={editFormData.role}
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              disabled={user.role === 'super_admin' && currentUserRole !== 'super_admin'}
                            >
                              <option value="applicant">Applicant</option>
                              <option value="hr">HR Manager</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          ) : (
                            getRoleBadge(user.role)
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
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
                              <Phone className="h-4 w-4 mr-2" />
                              {user.phone || 'Not provided'}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-2" />
                            {formatDate(user.created_at)}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-3">
                            {editingUserId === user.id ? (
                              <>
                                <button
                                  onClick={() => handleEditSubmit(user.id)}
                                  disabled={editLoading}
                                  className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                                  title="Save Changes"
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="inline-flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                                  title="Cancel"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(user)}
                                  disabled={user.role === 'super_admin' && currentUserRole !== 'super_admin'}
                                  className={`inline-flex items-center px-3 py-1.5 rounded-md transition-colors ${
                                    user.role === 'super_admin' && currentUserRole !== 'super_admin'
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  }`}
                                  title={user.role === 'super_admin' && currentUserRole !== 'super_admin' ? 'Only super admins can edit super admin users' : 'Edit User'}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteUser(user.id, user.email)}
                                  disabled={user.role === 'super_admin' && currentUserRole !== 'super_admin'}
                                  className={`inline-flex items-center px-3 py-1.5 rounded-md transition-colors ${
                                    user.role === 'super_admin' && currentUserRole !== 'super_admin'
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                                  }`}
                                  title={user.role === 'super_admin' && currentUserRole !== 'super_admin' ? 'Only super admins can delete super admin users' : 'Delete User'}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
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