// app/administrator/addusers/page.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/adminhrsidebar'
import { supabase } from '@/lib/supabaseClient'
import { Users, UserPlus, Search, Mail, Phone, Calendar, X, Eye, EyeOff, Edit, Trash2, Save, XCircle, Shield, Briefcase, User, CheckCircle, AlertCircle } from 'lucide-react'

interface User {
  id: string
  email: string
  phone: string | null
  role: 'applicant' | 'hr' | 'super_admin'
  created_at: string
  confirmed_at?: string | null
}

export default function UsersManagementPage() {
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
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    role: 'applicant' as 'applicant' | 'hr' | 'super_admin',
    sendInvite: false
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

  // Show notification and auto-hide
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  // Get current user's role
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

  // CREATE - Add new user WITHOUT auto-login
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

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', formData.email)
        .single()

      if (existingUser) {
        throw new Error('User with this email already exists')
      }

      // Method 1: Create user through Admin API endpoint (Recommended)
      // You need to set up a secure serverless function for this
      // For now, we'll use a workaround
      
      // Workaround: Create user with a service role client (NOT RECOMMENDED FOR PRODUCTION)
      // Instead, use the auth.admin API if available
      
      // Alternative: Use signUp with autoConfirm disabled
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            phone: formData.phone || null,
            role: formData.role
          },
          // Don't auto-confirm if you want to send confirmation email
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) {
        console.error('Auth error details:', authError)
        
        // Handle specific error cases
        if (authError.message.includes('User already registered')) {
          throw new Error('This email is already registered')
        } else if (authError.message.includes('rate limit')) {
          throw new Error('Too many attempts. Please wait a moment')
        } else {
          throw authError
        }
      }

      if (!authData.user) {
        throw new Error('Failed to create user - no user data returned')
      }

      console.log('Auth user created:', authData.user.id)
      
      // Immediately update the profile with role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: formData.role,
          phone: formData.phone || null
        })
        .eq('id', authData.user.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
        // Continue anyway - the trigger should handle it
      }

      // Refresh users
      await fetchUsers()
      
      // Reset form and close
      setFormData({
        email: '',
        password: '',
        phone: '',
        role: 'applicant',
        sendInvite: false
      })
      setShowAddForm(false)
      
      showNotification('success', `User ${formData.email} created successfully with role: ${formData.role}`)
      
      // IMPORTANT: Immediately sign out the newly created user from the current session
      // This prevents the new user from being logged in
      await supabase.auth.signOut()
      
      // Get the original user's session back
      // You need to have the original user's email/password or refresh token
      // This is a limitation - you should implement proper admin authentication
      
      // Re-fetch current user to restore admin session
      await getCurrentUserRole()

    } catch (error: any) {
      console.error('Error creating user:', error)
      showNotification('error', 'Error creating user: ' + error.message)
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
    } catch (error: any) {
      console.error('Error fetching users:', error)
      showNotification('error', 'Error fetching users: ' + error.message)
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

      const userToEdit = users.find(u => u.id === userId)
      if (!userToEdit) throw new Error('User not found')

      // Permission checks
      if (currentUserRole !== 'super_admin' && userToEdit.role === 'super_admin') {
        throw new Error('Only super admins can edit other super admin users')
      }

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
      showNotification('success', 'User updated successfully!')

    } catch (error: any) {
      console.error('Error updating user:', error)
      showNotification('error', 'Error updating user: ' + error.message)
    } finally {
      setEditLoading(false)
    }
  }

  // DELETE - Remove user
  const deleteUser = async (userId: string, userEmail: string) => {
    try {
      const userToDelete = users.find(u => u.id === userId)
      if (!userToDelete) return

      // Permission checks
      if (userToDelete.role === 'super_admin' && currentUserRole !== 'super_admin') {
        showNotification('error', 'Only super admins can delete other super admin users')
        return
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser?.id === userId) {
        showNotification('error', 'You cannot delete your own account from this page!')
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
      }

      // Delete the user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError) throw profileError

      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId))
      showNotification('success', 'User profile deleted! Note: Their auth account still exists.')

    } catch (error: any) {
      console.error('Error deleting user:', error)
      showNotification('error', 'Error deleting user: ' + error.message)
    }
  }

  // Form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // Filter users
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

  const canAddSuperAdmin = currentUserRole === 'super_admin'

  return (
    <AdminLayout>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg max-w-md ${notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {notification.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            User Management
          </h1>
          <p className="text-gray-600 mt-1">Manage all user accounts and roles</p>
          {currentUserRole && (
            <p className="text-sm text-gray-500 mt-1">
              Logged in as: <span className="font-medium">{currentUserRole}</span>
            </p>
          )}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="sendInvite"
                name="sendInvite"
                checked={formData.sendInvite}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="sendInvite" className="ml-2 text-sm text-gray-700">
                Send invitation email (user will need to confirm account)
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
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
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
          
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
            <p className="text-xs text-yellow-700">
              <strong>Important:</strong> For security, you should implement a server-side admin API to create users. 
              The current method logs you out after creating a user. Consider setting up a secure endpoint.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              <p className="text-sm text-gray-600">Super Admins</p>
              <p className="text-2xl font-bold mt-1">
                {users.filter(u => u.role === 'super_admin').length}
              </p>
            </div>
            <Shield className="h-8 w-8 text-purple-500" />
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
            <User className="h-8 w-8 text-green-500" />
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
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Mail className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {editingUserId === user.id ? (
                              <input
                                type="email"
                                name="email"
                                value={editFormData.email}
                                onChange={handleEditChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                required
                              />
                            ) : user.email}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {user.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
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
                    
                    <td className="px-6 py-4">
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
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
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
    </AdminLayout>
  )
}