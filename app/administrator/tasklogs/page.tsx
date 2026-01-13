// app/administrator/task-logs/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import AdminHRSidebar from '@/components/adminhrsidebar'
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  User, 
  FileText, 
  Briefcase, 
  UserPlus,
  Trash2,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Shield,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Activity,
  Lock,
  AlertTriangle,
  Key,
  Users,
  GraduationCap,
  Award,
  BookOpen,
  BriefcaseBusiness,
  FileCheck,
  History,
  BarChart3
} from 'lucide-react'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface TaskLog {
  id: string
  user_id: string
  user_email: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  details: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface UserProfile {
  id: string
  role: 'applicant' | 'hr' | 'super_admin'
  email: string
  first_name: string | null
  last_name: string | null
}

interface Pagination {
  page: number
  perPage: number
  total: number
  totalPages: number
}

interface Stats {
  total: number
  today: number
  uniqueUsers: number
  topAction: string
  topEntity: string
  actionsByType: Record<string, number>
  entitiesByType: Record<string, number>
}

export default function TaskLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<TaskLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingUser, setLoadingUser] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('7days')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0
  })
  const [stats, setStats] = useState<Stats>({
    total: 0,
    today: 0,
    uniqueUsers: 0,
    topAction: '',
    topEntity: '',
    actionsByType: {},
    entitiesByType: {}
  })

  useEffect(() => {
    checkUserAndRedirect()
  }, [])

  useEffect(() => {
    if (currentUser && isSuperAdmin()) {
      fetchTaskLogs()
      fetchStats()
    }
  }, [currentUser, pagination.page, actionFilter, entityFilter, dateRange])

  const checkUserAndRedirect = async () => {
    try {
      setLoadingUser(true)
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // No user logged in, redirect to login
        router.push('/auth/login')
        return
      }

      // Get user profile with role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role, email, first_name, last_name')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setCurrentUser(profile)

      // Check if user is super_admin
      if (!isSuperAdmin(profile)) {
        setAccessDenied(true)
        setLoadingUser(false)
        return
      }
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/auth/login')
    } finally {
      setLoadingUser(false)
    }
  }

  const isSuperAdmin = (profile?: UserProfile): boolean => {
    const user = profile || currentUser
    return user?.role === 'super_admin'
  }

  const fetchTaskLogs = async () => {
    if (!currentUser || !isSuperAdmin()) return

    try {
      setLoading(true)
      
      // Build query
      let query = supabase
        .from('task_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply search
      if (search) {
        query = query.or(`user_email.ilike.%${search}%,action.ilike.%${search}%,entity_type.ilike.%${search}%,entity_name.ilike.%${search}%`)
      }

      // Apply action filter
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter)
      }

      // Apply entity filter
      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter)
      }

      // Apply date range filter
      const now = new Date()
      let startDate = new Date()
      
      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          query = query.gte('created_at', startDate.toISOString())
          break
        case 'yesterday':
          startDate.setDate(startDate.getDate() - 1)
          startDate.setHours(0, 0, 0, 0)
          const endDate = new Date(startDate)
          endDate.setHours(23, 59, 59, 999)
          query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString())
          break
        case '7days':
          startDate.setDate(startDate.getDate() - 7)
          query = query.gte('created_at', startDate.toISOString())
          break
        case '30days':
          startDate.setDate(startDate.getDate() - 30)
          query = query.gte('created_at', startDate.toISOString())
          break
        case '90days':
          startDate.setDate(startDate.getDate() - 90)
          query = query.gte('created_at', startDate.toISOString())
          break
      }

      // Apply pagination
      const from = (pagination.page - 1) * pagination.perPage
      const to = from + pagination.perPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      setLogs(data || [])
      setPagination(prev => ({
        ...prev,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / prev.perPage)
      }))
    } catch (error) {
      console.error('Error fetching task logs:', error)
      alert('Failed to fetch task logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!currentUser || !isSuperAdmin()) return

    try {
      // Get total count
      const { count: total } = await supabase
        .from('task_logs')
        .select('*', { count: 'exact', head: true })

      // Get today's count
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count: todayCount } = await supabase
        .from('task_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      // Get unique users
      const { data: uniqueUsers } = await supabase
        .from('task_logs')
        .select('user_email')
        .limit(5000)

      const uniqueUserCount = new Set(uniqueUsers?.map(u => u.user_email)).size

      // Get all actions for stats
      const { data: allLogs } = await supabase
        .from('task_logs')
        .select('action, entity_type')
        .limit(5000)

      // Calculate action counts
      const actionCounts = allLogs?.reduce((acc: Record<string, number>, curr) => {
        acc[curr.action] = (acc[curr.action] || 0) + 1
        return acc
      }, {}) || {}

      // Calculate entity counts
      const entityCounts = allLogs?.reduce((acc: Record<string, number>, curr) => {
        acc[curr.entity_type] = (acc[curr.entity_type] || 0) + 1
        return acc
      }, {}) || {}

      // Get top action and entity
      const topAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      const topEntity = Object.entries(entityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

      setStats({
        total: total || 0,
        today: todayCount || 0,
        uniqueUsers: uniqueUserCount,
        topAction,
        topEntity,
        actionsByType: actionCounts,
        entitiesByType: entityCounts
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleExport = async () => {
    if (!currentUser || !isSuperAdmin()) {
      alert('Access denied. Only super administrators can export task logs.')
      return
    }

    try {
      const { data, error } = await supabase
        .from('task_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000)

      if (error) throw error

      // Convert to CSV
      const headers = ['ID', 'Date', 'Time', 'User ID', 'User Email', 'Action', 'Entity Type', 'Entity ID', 'Entity Name', 'Details', 'IP Address', 'User Agent']
      const csvRows = [
        headers.join(','),
        ...data.map(log => {
          const date = new Date(log.created_at)
          const formattedDate = date.toISOString().split('T')[0]
          const formattedTime = date.toTimeString().split(' ')[0]
          
          // Escape quotes in strings
          const escapeQuotes = (str: string) => str ? str.replace(/"/g, '""') : ''
          
          return [
            `"${escapeQuotes(log.id)}"`,
            `"${escapeQuotes(formattedDate)}"`,
            `"${escapeQuotes(formattedTime)}"`,
            `"${escapeQuotes(log.user_id)}"`,
            `"${escapeQuotes(log.user_email)}"`,
            `"${escapeQuotes(log.action)}"`,
            `"${escapeQuotes(log.entity_type)}"`,
            `"${escapeQuotes(log.entity_id || '')}"`,
            `"${escapeQuotes(log.entity_name || '')}"`,
            `"${escapeQuotes(JSON.stringify(log.details))}"`,
            `"${escapeQuotes(log.ip_address || '')}"`,
            `"${escapeQuotes(log.user_agent || '')}"`
          ].join(',')
        })
      ]

      const csvString = csvRows.join('\n')
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `task-logs-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      // Log the export action
      await supabase
        .from('task_logs')
        .insert({
          user_id: currentUser.id,
          user_email: currentUser.email,
          action: 'export',
          entity_type: 'task_logs',
          entity_name: 'Task Logs Export',
          details: { 
            export_count: data.length,
            export_date: new Date().toISOString(),
            filters: { search, actionFilter, entityFilter, dateRange }
          },
          created_at: new Date().toISOString()
        })

      alert(`Task logs exported successfully! ${data.length} records downloaded.`)
    } catch (error) {
      console.error('Error exporting task logs:', error)
      alert('Failed to export task logs')
    }
  }

  const handleClearLogs = async () => {
    if (!currentUser || !isSuperAdmin()) {
      alert('Access denied. Only super administrators can clear task logs.')
      return
    }

    if (!confirm('⚠️ WARNING: Are you sure you want to clear ALL task logs? This action cannot be undone and will delete all audit history.')) {
      return
    }

    if (!confirm('🔴 FINAL CONFIRMATION: This will permanently delete all task logs. This action is irreversible. Type "DELETE ALL" to confirm.')) {
      return
    }

    const confirmation = prompt('Please type "DELETE ALL" to confirm permanent deletion:')
    if (confirmation !== 'DELETE ALL') {
      alert('Deletion cancelled. Task logs remain intact.')
      return
    }

    try {
      // First, get count of logs to be deleted
      const { count } = await supabase
        .from('task_logs')
        .select('*', { count: 'exact', head: true })

      // Delete all logs
      const { error } = await supabase
        .from('task_logs')
        .delete()
        .gt('created_at', '1970-01-01')

      if (error) throw error

      // Log this action (insert before clearing to preserve it)
      await supabase
        .from('task_logs')
        .insert({
          user_id: currentUser.id,
          user_email: currentUser.email,
          action: 'delete_all',
          entity_type: 'task_logs',
          entity_name: 'All Task Logs',
          details: { 
            cleared_by: currentUser.email,
            cleared_at: new Date().toISOString(),
            records_deleted: count || 0
          },
          created_at: new Date().toISOString()
        })

      alert(`Successfully cleared ${count || 0} task logs!`)
      fetchTaskLogs()
      fetchStats()
    } catch (error) {
      console.error('Error clearing task logs:', error)
      alert('Failed to clear task logs')
    }
  }

  const getActionIcon = (action: string) => {
    const icons: Record<string, any> = {
      create: <CheckCircle className="h-4 w-4 text-green-600" />,
      update: <Edit className="h-4 w-4 text-blue-600" />,
      delete: <Trash2 className="h-4 w-4 text-red-600" />,
      delete_all: <Trash2 className="h-4 w-4 text-red-600" />,
      view: <Eye className="h-4 w-4 text-gray-600" />,
      login: <Key className="h-4 w-4 text-purple-600" />,
      logout: <Key className="h-4 w-4 text-gray-600" />,
      read: <Eye className="h-4 w-4 text-gray-600" />,
      download: <Download className="h-4 w-4 text-indigo-600" />,
      export: <Download className="h-4 w-4 text-indigo-600" />,
      approve: <CheckCircle className="h-4 w-4 text-green-600" />,
      reject: <XCircle className="h-4 w-4 text-red-600" />,
      upload: <FileCheck className="h-4 w-4 text-teal-600" />,
      default: <Activity className="h-4 w-4 text-gray-600" />
    }
    return icons[action] || icons.default
  }

  const getEntityIcon = (entityType: string) => {
    const icons: Record<string, any> = {
      job_posting: <Briefcase className="h-4 w-4 text-blue-500" />,
      job_posting_bulk: <BriefcaseBusiness className="h-4 w-4 text-blue-600" />,
      application: <FileText className="h-4 w-4 text-green-500" />,
      user: <User className="h-4 w-4 text-purple-500" />,
      profile: <Users className="h-4 w-4 text-orange-500" />,
      education: <GraduationCap className="h-4 w-4 text-teal-500" />,
      work_experience: <Briefcase className="h-4 w-4 text-indigo-500" />,
      skill: <Award className="h-4 w-4 text-amber-500" />,
      eligibility: <Shield className="h-4 w-4 text-rose-500" />,
      training: <BookOpen className="h-4 w-4 text-emerald-500" />,
      task_log: <History className="h-4 w-4 text-violet-500" />,
      default: <Database className="h-4 w-4 text-gray-500" />
    }
    return icons[entityType] || icons.default
  }

  const getActionBadge = (action: string) => {
    const variants: Record<string, string> = {
      create: 'bg-green-100 text-green-800 border-green-200',
      update: 'bg-blue-100 text-blue-800 border-blue-200',
      delete: 'bg-red-100 text-red-800 border-red-200',
      delete_all: 'bg-red-100 text-red-800 border-red-200',
      view: 'bg-gray-100 text-gray-800 border-gray-200',
      login: 'bg-purple-100 text-purple-800 border-purple-200',
      logout: 'bg-gray-100 text-gray-800 border-gray-200',
      read: 'bg-gray-100 text-gray-800 border-gray-200',
      download: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      export: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      approve: 'bg-green-100 text-green-800 border-green-200',
      reject: 'bg-red-100 text-red-800 border-red-200',
      upload: 'bg-teal-100 text-teal-800 border-teal-200'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${variants[action] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {action.replace('_', ' ')}
      </span>
    )
  }

  const handleRefresh = () => {
    if (!currentUser || !isSuperAdmin()) return
    fetchTaskLogs()
    fetchStats()
  }

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return {
        date: date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        time: date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        }),
        full: date.toISOString()
      }
    } catch {
      return { date: 'Invalid date', time: '', full: dateString }
    }
  }

  const formatDetails = (details: any) => {
    if (!details || (typeof details === 'object' && Object.keys(details).length === 0)) {
      return 'No details'
    }
    
    try {
      if (typeof details === 'string') {
        return details
      }
      // Try to format as pretty JSON
      return JSON.stringify(details, null, 2)
    } catch {
      // If can't stringify, show raw
      return String(details)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !isSuperAdmin()) return
    setPagination({ ...pagination, page: 1 })
    fetchTaskLogs()
  }

  const handleViewDetails = (log: TaskLog) => {
    const { date, time, full } = formatDateTime(log.created_at)
    const details = formatDetails(log.details)
    
    const modalContent = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div class="border-b border-gray-200 p-6">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-semibold text-gray-900">Log Details</h3>
              <button onclick="document.getElementById('log-modal').remove()" class="text-gray-400 hover:text-gray-600">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div class="space-y-4">
                <div>
                  <label class="text-sm font-medium text-gray-500">Timestamp</label>
                  <div class="mt-1">
                    <div class="font-medium text-gray-900">${date}</div>
                    <div class="text-sm text-gray-600">${time}</div>
                    <div class="text-xs text-gray-500">${full}</div>
                  </div>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-500">User</label>
                  <div class="mt-1 font-medium text-gray-900">${log.user_email}</div>
                  <div class="text-sm text-gray-600">${log.user_id}</div>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-500">Action</label>
                  <div class="mt-1">
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${log.action === 'create' ? 'bg-green-100 text-green-800' : log.action === 'update' ? 'bg-blue-100 text-blue-800' : log.action === 'delete' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">
                      ${log.action.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              <div class="space-y-4">
                <div>
                  <label class="text-sm font-medium text-gray-500">Entity</label>
                  <div class="mt-1">
                    <div class="font-medium text-gray-900 capitalize">${log.entity_type.replace('_', ' ')}</div>
                    ${log.entity_name ? `<div class="text-sm text-gray-600">${log.entity_name}</div>` : ''}
                    ${log.entity_id ? `<div class="text-xs text-gray-500">ID: ${log.entity_id}</div>` : ''}
                  </div>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-500">IP Address</label>
                  <div class="mt-1 font-mono text-sm text-gray-900">${log.ip_address || 'N/A'}</div>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-500">User Agent</label>
                  <div class="mt-1 text-sm text-gray-900 truncate">${log.user_agent || 'N/A'}</div>
                </div>
              </div>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500 mb-2 block">Details</label>
              <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <pre class="whitespace-pre-wrap text-sm font-mono text-gray-800 overflow-x-auto">${details}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
    
    const modalDiv = document.createElement('div')
    modalDiv.id = 'log-modal'
    modalDiv.innerHTML = modalContent
    document.body.appendChild(modalDiv)
  }

  // Action options
  const actionOptions = [
    { value: 'all', label: 'All Actions' },
    { value: 'create', label: 'Create' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'delete_all', label: 'Delete All' },
    { value: 'view', label: 'View' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'read', label: 'Read' },
    { value: 'download', label: 'Download' },
    { value: 'export', label: 'Export' },
    { value: 'approve', label: 'Approve' },
    { value: 'reject', label: 'Reject' },
    { value: 'upload', label: 'Upload' }
  ]

  // Entity options based on your database
  const entityOptions = [
    { value: 'all', label: 'All Entities' },
    { value: 'job_posting', label: 'Job Postings' },
    { value: 'job_posting_bulk', label: 'Job Postings (Bulk)' },
    { value: 'application', label: 'Applications' },
    { value: 'user', label: 'Users' },
    { value: 'profile', label: 'Profiles' },
    { value: 'education', label: 'Educations' },
    { value: 'work_experience', label: 'Work Experiences' },
    { value: 'skill', label: 'Skills' },
    { value: 'eligibility', label: 'Eligibilities' },
    { value: 'training', label: 'Trainings' },
    { value: 'task_log', label: 'Task Logs' }
  ]

  // Date range options
  const dateOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' }
  ]

  // UI Components
  const Button = ({ children, onClick, variant = 'default', disabled = false, className = '' }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm
        ${variant === 'default' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
        ${variant === 'outline' ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : ''}
        ${variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
        ${variant === 'success' ? 'bg-green-600 text-white hover:bg-green-700' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </button>
  )

  const Input = ({ value, onChange, placeholder, className = '' }: any) => (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    />
  )

  const Select = ({ value, onChange, children, placeholder }: any) => (
    <select
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
    >
      {children}
    </select>
  )

  const Card = ({ children, className = '' }: any) => (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  )

  const CardHeader = ({ children, className = '' }: any) => (
    <div className={`border-b border-gray-200 px-6 py-4 ${className}`}>
      {children}
    </div>
  )

  const CardTitle = ({ children, className = '' }: any) => (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h3>
  )

  const CardDescription = ({ children, className = '' }: any) => (
    <p className={`text-sm text-gray-500 ${className}`}>{children}</p>
  )

  const CardContent = ({ children, className = '' }: any) => (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  )

  // Show loading state
  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  // Show access denied
  if (accessDenied || !isSuperAdmin()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              This page is restricted to Super Administrators only.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">
                  You need <span className="font-bold">super_admin</span> privileges to access audit logs
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.back()}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main page with sidebar
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <AdminHRSidebar />
        
        {/* Main Content - Adjusted for w-64 sidebar */}
        <div className="flex-1 md:ml-64">
          {/* Mobile Topbar - You might want to use the MobileTopbar from your sidebar component */}
          <div className="md:hidden">
            {/* Mobile header would go here */}
          </div>
          
          {/* Main Content Area */}
          <div className="p-4 md:p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header with Super Admin Badge */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <History className="h-8 w-8 text-purple-600" />
                    </div>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Audit Logs</h1>
                      <p className="text-gray-600">
                        Complete audit trail of all system activities
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      <Shield className="h-3 w-3" />
                      Super Administrator Access
                    </span>
                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      <BarChart3 className="h-3 w-3" />
                      {stats.total.toLocaleString()} Total Logs
                    </span>
                    {currentUser && (
                      <span className="text-sm text-gray-600">
                        Logged in as: <span className="font-medium text-gray-900">{currentUser.email}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={handleExport} disabled={loading}>
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button variant="destructive" onClick={handleClearLogs} disabled={loading}>
                    <Trash2 className="h-4 w-4" />
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <Card>
                <CardContent>
                  <form onSubmit={handleSearch} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Search</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search by email, action, entity..."
                            value={search}
                            onChange={(e: any) => setSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Action Type</label>
                        <Select 
                          value={actionFilter}
                          onChange={(e: any) => setActionFilter(e.target.value)}
                        >
                          {actionOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Entity Type</label>
                        <Select 
                          value={entityFilter}
                          onChange={(e: any) => setEntityFilter(e.target.value)}
                        >
                          {entityOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Date Range</label>
                        <Select 
                          value={dateRange}
                          onChange={(e: any) => setDateRange(e.target.value)}
                        >
                          {dateOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="submit"
                        className="flex-1"
                        disabled={loading}
                      >
                        <Search className="h-4 w-4" />
                        Apply Filters
                      </Button>
                      <Button 
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setSearch('')
                          setActionFilter('all')
                          setEntityFilter('all')
                          setDateRange('7days')
                          setPagination({ ...pagination, page: 1 })
                        }}
                        disabled={loading}
                      >
                        <Filter className="h-4 w-4" />
                        Reset Filters
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Stats Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Logs</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <History className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      All-time system activities
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Today&apos;s Logs</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
                      </div>
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calendar className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Activities in last 24 hours
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Unique Users</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.uniqueUsers}</p>
                      </div>
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Distinct users with activities
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Top Action</p>
                        <p className="text-2xl font-bold text-gray-900 capitalize">{stats.topAction.replace('_', ' ')}</p>
                      </div>
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Activity className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Most frequent action type
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Top Entity</p>
                        <p className="text-2xl font-bold text-gray-900 capitalize">
                          {stats.topEntity.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Database className="h-6 w-6 text-indigo-600" />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Most modified entity type
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Distribution */}
              {Object.keys(stats.actionsByType).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Action Distribution</CardTitle>
                    <CardDescription>Breakdown of actions by type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {Object.entries(stats.actionsByType)
                        .sort((a, b) => b[1] - a[1])
                        .map(([action, count]) => (
                          <div key={action} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-900 capitalize">{action.replace('_', ' ')}</div>
                                <div className="text-2xl font-bold text-gray-900 mt-1">{count}</div>
                              </div>
                              <div className="p-2 bg-white rounded-lg">
                                {getActionIcon(action)}
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${(count / stats.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Logs Table */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Activity Logs</CardTitle>
                      <CardDescription>
                        Showing {logs.length} of {pagination.total} logs (Page {pagination.page} of {pagination.totalPages})
                      </CardDescription>
                    </div>
                    <div className="text-sm text-gray-600">
                      Last updated: {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                      <p className="text-gray-600">Loading task logs...</p>
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No task logs found</h3>
                      <p className="text-gray-500">
                        {search || actionFilter !== 'all' || entityFilter !== 'all' || dateRange !== 'all' 
                          ? 'Try adjusting your search filters' 
                          : 'No activity has been logged yet.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Timestamp</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Action</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Entity</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Details</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">IP Address</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs.map((log) => {
                              const { date, time } = formatDateTime(log.created_at)
                              return (
                                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="font-medium text-gray-900">{date}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {time}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-medium text-gray-900 truncate max-w-[150px]" title={log.user_email}>
                                      {log.user_email}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate max-w-[150px]" title={log.user_id}>
                                      {log.user_id.substring(0, 8)}...
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      {getActionIcon(log.action)}
                                      {getActionBadge(log.action)}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      {getEntityIcon(log.entity_type)}
                                      <div>
                                        <div className="font-medium text-gray-900 capitalize">
                                          {log.entity_type.replace('_', ' ')}
                                        </div>
                                        {log.entity_name && (
                                          <div className="text-xs text-gray-500 truncate max-w-[120px]" title={log.entity_name}>
                                            {log.entity_name}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 max-w-xs">
                                    <div className="text-xs bg-gray-50 p-2 rounded border border-gray-200 max-h-32 overflow-y-auto">
                                      <pre className="whitespace-pre-wrap text-gray-700 font-mono truncate">
                                        {formatDetails(log.details).substring(0, 100)}
                                        {formatDetails(log.details).length > 100 ? '...' : ''}
                                      </pre>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 truncate max-w-[120px]" title={log.ip_address || 'N/A'}>
                                      {log.ip_address || 'N/A'}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <button
                                      onClick={() => handleViewDetails(log)}
                                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                                    >
                                      <Eye className="h-4 w-4" />
                                      View
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {pagination.totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                          <div className="text-sm text-gray-500">
                            Showing {(pagination.page - 1) * pagination.perPage + 1} to{' '}
                            {Math.min(pagination.page * pagination.perPage, pagination.total)} of{' '}
                            {pagination.total} entries
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                              disabled={pagination.page === 1 || loading}
                              className="px-3 py-1"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                let pageNum
                                if (pagination.totalPages <= 5) {
                                  pageNum = i + 1
                                } else if (pagination.page <= 3) {
                                  pageNum = i + 1
                                } else if (pagination.page >= pagination.totalPages - 2) {
                                  pageNum = pagination.totalPages - 4 + i
                                } else {
                                  pageNum = pagination.page - 2 + i
                                }
                                
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={pagination.page === pageNum ? "default" : "outline"}
                                    onClick={() => setPagination({ ...pagination, page: pageNum })}
                                    className="px-3 py-1 min-w-[40px]"
                                    disabled={loading}
                                  >
                                    {pageNum}
                                  </Button>
                                )
                              })}
                            </div>
                            
                            <Button
                              variant="outline"
                              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                              disabled={pagination.page === pagination.totalPages || loading}
                              className="px-3 py-1"
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Information Panel */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">About Audit Logs</h4>
                        <p className="text-sm text-gray-600">
                          Audit logs track all user activities in the system including create, update, delete, view, and login actions. 
                          This audit trail helps with security monitoring, debugging, and compliance requirements.
                          All actions are automatically logged to provide a complete history of system activities.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Action Types</h5>
                          <div className="flex flex-wrap gap-1">
                            {actionOptions.slice(1).map(action => (
                              <span 
                                key={action.value}
                                className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded capitalize"
                              >
                                {action.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Entity Types</h5>
                          <div className="flex flex-wrap gap-1">
                            {entityOptions.slice(1).map(entity => (
                              <span 
                                key={entity.value}
                                className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded capitalize"
                              >
                                {entity.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      

                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                         
                          
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}