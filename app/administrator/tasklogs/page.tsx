// 'use client'

// import { useState, useEffect } from 'react'
// import { createClient } from '@supabase/supabase-js'
// import { 
//   Search, 
//   Filter, 
//   Download, 
//   Calendar, 
//   User, 
//   FileText, 
//   Briefcase, 
//   UserPlus,
//   Trash2,
//   Eye,
//   Edit,
//   ChevronLeft,
//   ChevronRight,
//   RefreshCw,
//   Shield,
//   AlertCircle,
//   Loader2,
//   CheckCircle,
//   XCircle,
//   Clock,
//   Database,
//   Activity
// } from 'lucide-react'

// // Initialize Supabase client
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// const supabase = createClient(supabaseUrl, supabaseAnonKey)

// interface TaskLog {
//   id: string
//   user_id: string
//   user_email: string
//   action: string
//   entity_type: string
//   entity_id: string | null
//   entity_name: string | null
//   details: any
//   ip_address: string | null
//   user_agent: string | null
//   created_at: string
// }

// interface Pagination {
//   page: number
//   perPage: number
//   total: number
//   totalPages: number
// }

// export default function TaskLogsPage() {
//   const [logs, setLogs] = useState<TaskLog[]>([])
//   const [loading, setLoading] = useState(true)
//   const [search, setSearch] = useState('')
//   const [actionFilter, setActionFilter] = useState<string>('all')
//   const [entityFilter, setEntityFilter] = useState<string>('all')
//   const [dateRange, setDateRange] = useState<string>('7days')
//   const [pagination, setPagination] = useState<Pagination>({
//     page: 1,
//     perPage: 20,
//     total: 0,
//     totalPages: 0
//   })
//   const [stats, setStats] = useState({
//     total: 0,
//     today: 0,
//     uniqueUsers: 0,
//     topAction: '',
//     topEntity: ''
//   })

//   useEffect(() => {
//     fetchTaskLogs()
//     fetchStats()
//   }, [pagination.page, actionFilter, entityFilter, dateRange])

//   const fetchTaskLogs = async () => {
//     try {
//       setLoading(true)
      
//       // Build query
//       let query = supabase
//         .from('task_logs')
//         .select('*', { count: 'exact' })
//         .order('created_at', { ascending: false })

//       // Apply search
//       if (search) {
//         query = query.or(`user_email.ilike.%${search}%,action.ilike.%${search}%,entity_type.ilike.%${search}%,entity_name.ilike.%${search}%`)
//       }

//       // Apply action filter
//       if (actionFilter !== 'all') {
//         query = query.eq('action', actionFilter)
//       }

//       // Apply entity filter
//       if (entityFilter !== 'all') {
//         query = query.eq('entity_type', entityFilter)
//       }

//       // Apply date range filter
//       const now = new Date()
//       let startDate = new Date()
      
//       switch (dateRange) {
//         case 'today':
//           startDate.setHours(0, 0, 0, 0)
//           query = query.gte('created_at', startDate.toISOString())
//           break
//         case 'yesterday':
//           startDate.setDate(startDate.getDate() - 1)
//           startDate.setHours(0, 0, 0, 0)
//           const endDate = new Date(startDate)
//           endDate.setHours(23, 59, 59, 999)
//           query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString())
//           break
//         case '7days':
//           startDate.setDate(startDate.getDate() - 7)
//           query = query.gte('created_at', startDate.toISOString())
//           break
//         case '30days':
//           startDate.setDate(startDate.getDate() - 30)
//           query = query.gte('created_at', startDate.toISOString())
//           break
//         case '90days':
//           startDate.setDate(startDate.getDate() - 90)
//           query = query.gte('created_at', startDate.toISOString())
//           break
//       }

//       // Apply pagination
//       const from = (pagination.page - 1) * pagination.perPage
//       const to = from + pagination.perPage - 1
//       query = query.range(from, to)

//       const { data, error, count } = await query

//       if (error) throw error

//       setLogs(data || [])
//       setPagination(prev => ({
//         ...prev,
//         total: count || 0,
//         totalPages: Math.ceil((count || 0) / prev.perPage)
//       }))
//     } catch (error) {
//       console.error('Error fetching task logs:', error)
//       alert('Failed to fetch task logs')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const fetchStats = async () => {
//     try {
//       // Get total count
//       const { count: total } = await supabase
//         .from('task_logs')
//         .select('*', { count: 'exact', head: true })

//       // Get today's count
//       const today = new Date()
//       today.setHours(0, 0, 0, 0)
//       const { count: todayCount } = await supabase
//         .from('task_logs')
//         .select('*', { count: 'exact', head: true })
//         .gte('created_at', today.toISOString())

//       // Get unique users
//       const { data: uniqueUsers } = await supabase
//         .from('task_logs')
//         .select('user_email')
//         .limit(1000)

//       const uniqueUserCount = new Set(uniqueUsers?.map(u => u.user_email)).size

//       // Get top action
//       const { data: actions } = await supabase
//         .from('task_logs')
//         .select('action')
//         .limit(1000)

//       const actionCounts = actions?.reduce((acc: any, curr) => {
//         acc[curr.action] = (acc[curr.action] || 0) + 1
//         return acc
//       }, {})

//       const topAction = Object.entries(actionCounts || {}).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A'

//       // Get top entity
//       const { data: entities } = await supabase
//         .from('task_logs')
//         .select('entity_type')
//         .limit(1000)

//       const entityCounts = entities?.reduce((acc: any, curr) => {
//         acc[curr.entity_type] = (acc[curr.entity_type] || 0) + 1
//         return acc
//       }, {})

//       const topEntity = Object.entries(entityCounts || {}).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A'

//       setStats({
//         total: total || 0,
//         today: todayCount || 0,
//         uniqueUsers: uniqueUserCount,
//         topAction,
//         topEntity
//       })
//     } catch (error) {
//       console.error('Error fetching stats:', error)
//     }
//   }

//   const handleExport = async () => {
//     try {
//       const { data, error } = await supabase
//         .from('task_logs')
//         .select('*')
//         .order('created_at', { ascending: false })
//         .limit(5000)

//       if (error) throw error

//       // Convert to CSV
//       const headers = ['Date', 'Time', 'User Email', 'Action', 'Entity Type', 'Entity Name', 'Details', 'IP Address']
//       const csvRows = [
//         headers.join(','),
//         ...data.map(log => {
//           const date = new Date(log.created_at)
//           const formattedDate = date.toISOString().split('T')[0]
//           const formattedTime = date.toTimeString().split(' ')[0]
          
//           // Escape quotes in strings
//           const escapeQuotes = (str: string) => str.replace(/"/g, '""')
          
//           return [
//             formattedDate,
//             formattedTime,
//             `"${escapeQuotes(log.user_email)}"`,
//             `"${escapeQuotes(log.action)}"`,
//             `"${escapeQuotes(log.entity_type)}"`,
//             `"${escapeQuotes(log.entity_name || '')}"`,
//             `"${escapeQuotes(JSON.stringify(log.details))}"`,
//             `"${escapeQuotes(log.ip_address || '')}"`
//           ].join(',')
//         })
//       ]

//       const csvString = csvRows.join('\n')
//       const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
//       const url = window.URL.createObjectURL(blob)
//       const a = document.createElement('a')
//       a.href = url
//       a.download = `task-logs-${new Date().toISOString().split('T')[0]}.csv`
//       document.body.appendChild(a)
//       a.click()
//       document.body.removeChild(a)
//       window.URL.revokeObjectURL(url)

//       alert('Task logs exported successfully!')
//     } catch (error) {
//       console.error('Error exporting task logs:', error)
//       alert('Failed to export task logs')
//     }
//   }

//   const getActionIcon = (action: string) => {
//     const icons: Record<string, any> = {
//       create: <CheckCircle className="h-4 w-4 text-green-600" />,
//       update: <Edit className="h-4 w-4 text-blue-600" />,
//       delete: <Trash2 className="h-4 w-4 text-red-600" />,
//       view: <Eye className="h-4 w-4 text-gray-600" />,
//       login: <Shield className="h-4 w-4 text-purple-600" />,
//       read: <Eye className="h-4 w-4 text-gray-600" />,
//       download: <Download className="h-4 w-4 text-indigo-600" />,
//       approve: <CheckCircle className="h-4 w-4 text-green-600" />,
//       reject: <XCircle className="h-4 w-4 text-red-600" />,
//       default: <Activity className="h-4 w-4 text-gray-600" />
//     }
//     return icons[action] || icons.default
//   }

//   const getEntityIcon = (entityType: string) => {
//     const icons: Record<string, any> = {
//       job_posting: <Briefcase className="h-4 w-4 text-blue-500" />,
//       application: <FileText className="h-4 w-4 text-green-500" />,
//       user: <User className="h-4 w-4 text-purple-500" />,
//       profile: <User className="h-4 w-4 text-orange-500" />,
//       education: <FileText className="h-4 w-4 text-teal-500" />,
//       work_experience: <Briefcase className="h-4 w-4 text-indigo-500" />,
//       default: <Database className="h-4 w-4 text-gray-500" />
//     }
//     return icons[entityType] || icons.default
//   }

//   const getActionBadge = (action: string) => {
//     const variants: Record<string, string> = {
//       create: 'bg-green-100 text-green-800 border-green-200',
//       update: 'bg-blue-100 text-blue-800 border-blue-200',
//       delete: 'bg-red-100 text-red-800 border-red-200',
//       view: 'bg-gray-100 text-gray-800 border-gray-200',
//       login: 'bg-purple-100 text-purple-800 border-purple-200',
//       read: 'bg-gray-100 text-gray-800 border-gray-200',
//       download: 'bg-indigo-100 text-indigo-800 border-indigo-200',
//       approve: 'bg-green-100 text-green-800 border-green-200',
//       reject: 'bg-red-100 text-red-800 border-red-200'
//     }

//     return (
//       <span className={`px-2 py-1 rounded-full text-xs font-medium border ${variants[action] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
//         {action}
//       </span>
//     )
//   }

//   const handleRefresh = () => {
//     fetchTaskLogs()
//     fetchStats()
//   }

//   const handleClearLogs = async () => {
//     if (!confirm('Are you sure you want to clear all task logs? This action cannot be undone.')) {
//       return
//     }

//     try {
//       const { error } = await supabase
//         .from('task_logs')
//         .delete()
//         .gt('created_at', '1970-01-01')

//       if (error) throw error

//       alert('All task logs have been cleared successfully!')
//       handleRefresh()
//     } catch (error) {
//       console.error('Error clearing task logs:', error)
//       alert('Failed to clear task logs')
//     }
//   }

//   const formatDateTime = (dateString: string) => {
//     try {
//       const date = new Date(dateString)
//       return {
//         date: date.toLocaleDateString('en-US', { 
//           year: 'numeric', 
//           month: 'short', 
//           day: 'numeric' 
//         }),
//         time: date.toLocaleTimeString('en-US', { 
//           hour: '2-digit', 
//           minute: '2-digit'
//         })
//       }
//     } catch {
//       return { date: 'Invalid date', time: '' }
//     }
//   }

//   const formatDetails = (details: any) => {
//     if (!details || Object.keys(details).length === 0) {
//       return 'No details'
//     }
    
//     try {
//       // Try to format as pretty JSON
//       return JSON.stringify(details, null, 2)
//     } catch {
//       // If can't stringify, show raw
//       return String(details)
//     }
//   }

//   // UI Components
//   const Button = ({ children, onClick, variant = 'default', disabled = false, className = '' }: any) => (
//     <button
//       onClick={onClick}
//       disabled={disabled}
//       className={`
//         px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
//         ${variant === 'default' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
//         ${variant === 'outline' ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : ''}
//         ${variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
//         ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
//         ${className}
//       `}
//     >
//       {children}
//     </button>
//   )

//   const Input = ({ value, onChange, placeholder, className = '' }: any) => (
//     <input
//       type="text"
//       value={value}
//       onChange={onChange}
//       placeholder={placeholder}
//       className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
//     />
//   )

//   const Select = ({ value, onValueChange, children, placeholder }: any) => {
//     const [open, setOpen] = useState(false)
//     const [selectedLabel, setSelectedLabel] = useState('')

//     useEffect(() => {
//       // Find the selected label from children
//       const findLabel = (child: any) => {
//         if (child.props && child.props.value === value) {
//           return child.props.children
//         }
//         if (child.props && child.props.children) {
//           return findLabel(child.props.children)
//         }
//         return placeholder
//       }
      
//       if (children) {
//         const label = findLabel(children)
//         setSelectedLabel(label || placeholder)
//       }
//     }, [value, children, placeholder])

//     return (
//       <div className="relative">
//         <button
//           type="button"
//           onClick={() => setOpen(!open)}
//           className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex justify-between items-center hover:bg-gray-50 bg-white"
//         >
//           <span className="truncate">{selectedLabel}</span>
//           <ChevronRight className={`h-4 w-4 transform transition-transform ${open ? 'rotate-90' : ''}`} />
//         </button>
//         {open && (
//           <>
//             <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
//             <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
//               <div className="py-1">
//                 {children}
//               </div>
//             </div>
//           </>
//         )}
//       </div>
//     )
//   }

//   const SelectItem = ({ value, children, onClick }: any) => (
//     <div
//       className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
//       onClick={() => {
//         if (onClick) onClick(value)
//       }}
//     >
//       {children}
//     </div>
//   )

//   const SelectTrigger = ({ children }: any) => <>{children}</>
//   const SelectValue = ({ placeholder }: any) => <span>{placeholder}</span>
//   const SelectContent = ({ children }: any) => <div>{children}</div>

//   const Card = ({ children, className = '' }: any) => (
//     <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
//       {children}
//     </div>
//   )

//   const CardHeader = ({ children, className = '' }: any) => (
//     <div className={`border-b border-gray-200 px-6 py-4 ${className}`}>
//       {children}
//     </div>
//   )

//   const CardTitle = ({ children, className = '' }: any) => (
//     <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h3>
//   )

//   const CardDescription = ({ children, className = '' }: any) => (
//     <p className={`text-sm text-gray-500 ${className}`}>{children}</p>
//   )

//   const CardContent = ({ children, className = '' }: any) => (
//     <div className={`p-6 ${className}`}>
//       {children}
//     </div>
//   )

//   const handleSearch = (e: React.FormEvent) => {
//     e.preventDefault()
//     setPagination({ ...pagination, page: 1 })
//     fetchTaskLogs()
//   }

//   // Action options
//   const actionOptions = [
//     { value: 'all', label: 'All Actions' },
//     { value: 'create', label: 'Create' },
//     { value: 'update', label: 'Update' },
//     { value: 'delete', label: 'Delete' },
//     { value: 'view', label: 'View' },
//     { value: 'login', label: 'Login' },
//     { value: 'read', label: 'Read' },
//     { value: 'download', label: 'Download' },
//     { value: 'approve', label: 'Approve' },
//     { value: 'reject', label: 'Reject' }
//   ]

//   // Entity options based on your database
//   const entityOptions = [
//     { value: 'all', label: 'All Entities' },
//     { value: 'job_posting', label: 'Job Postings' },
//     { value: 'application', label: 'Applications' },
//     { value: 'user', label: 'Users' },
//     { value: 'profile', label: 'Profiles' },
//     { value: 'education', label: 'Educations' },
//     { value: 'work_experience', label: 'Work Experiences' }
//   ]

//   // Date range options
//   const dateOptions = [
//     { value: 'today', label: 'Today' },
//     { value: 'yesterday', label: 'Yesterday' },
//     { value: '7days', label: 'Last 7 Days' },
//     { value: '30days', label: 'Last 30 Days' },
//     { value: '90days', label: 'Last 90 Days' },
//     { value: 'all', label: 'All Time' }
//   ]

//   return (
//     <div className="min-h-screen bg-gray-50 p-4 md:p-6">
//       <div className="max-w-7xl mx-auto space-y-6">
//         {/* Header */}
//         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
//           <div>
//             <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Task Logs</h1>
//             <p className="text-gray-600 mt-1">
//               Audit trail of all system activities and user actions
//             </p>
//           </div>
//           <div className="flex flex-wrap items-center gap-2">
//             <Button variant="outline" onClick={handleRefresh} disabled={loading}>
//               <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
//               Refresh
//             </Button>
//             <Button variant="outline" onClick={handleExport} disabled={loading}>
//               <Download className="h-4 w-4" />
//               Export CSV
//             </Button>
//             <Button variant="destructive" onClick={handleClearLogs} disabled={loading}>
//               <Trash2 className="h-4 w-4" />
//               Clear All
//             </Button>
//           </div>
//         </div>

//         {/* Filters */}
//         <Card>
//           <CardContent>
//             <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
//               <div className="space-y-2">
//                 <label className="text-sm font-medium text-gray-700">Search</label>
//                 <div className="relative">
//                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
//                   <Input
//                     placeholder="Search by email, action, entity..."
//                     value={search}
//                     onChange={(e: any) => setSearch(e.target.value)}
//                     className="pl-9"
//                   />
//                 </div>
//               </div>
              
//               <div className="space-y-2">
//                 <label className="text-sm font-medium text-gray-700">Action Type</label>
//                 <Select 
//                   value={actionFilter} 
//                   onValueChange={(value: string) => setActionFilter(value)}
//                   placeholder="All actions"
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="All actions" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {actionOptions.map(option => (
//                       <SelectItem 
//                         key={option.value} 
//                         value={option.value}
//                         onClick={(value: string) => setActionFilter(value)}
//                       >
//                         {option.label}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="space-y-2">
//                 <label className="text-sm font-medium text-gray-700">Entity Type</label>
//                 <Select 
//                   value={entityFilter} 
//                   onValueChange={(value: string) => setEntityFilter(value)}
//                   placeholder="All entities"
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="All entities" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {entityOptions.map(option => (
//                       <SelectItem 
//                         key={option.value} 
//                         value={option.value}
//                         onClick={(value: string) => setEntityFilter(value)}
//                       >
//                         {option.label}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="space-y-2">
//                 <label className="text-sm font-medium text-gray-700">Date Range</label>
//                 <Select 
//                   value={dateRange} 
//                   onValueChange={(value: string) => setDateRange(value)}
//                   placeholder="Select range"
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="Select range" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {dateOptions.map(option => (
//                       <SelectItem 
//                         key={option.value} 
//                         value={option.value}
//                         onClick={(value: string) => setDateRange(value)}
//                       >
//                         {option.label}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="md:col-span-4 flex gap-2">
//                 <Button 
//                   type="submit"
//                   className="flex-1"
//                   disabled={loading}
//                 >
//                   <Search className="h-4 w-4" />
//                   Search
//                 </Button>
//                 <Button 
//                   type="button"
//                   variant="outline"
//                   className="flex-1"
//                   onClick={() => {
//                     setSearch('')
//                     setActionFilter('all')
//                     setEntityFilter('all')
//                     setDateRange('7days')
//                     setPagination({ ...pagination, page: 1 })
//                   }}
//                   disabled={loading}
//                 >
//                   <Filter className="h-4 w-4" />
//                   Reset Filters
//                 </Button>
//               </div>
//             </form>
//           </CardContent>
//         </Card>

//         {/* Stats */}
//         <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-gray-500">Total Logs</p>
//                   <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
//                 </div>
//                 <div className="p-2 bg-blue-100 rounded-lg">
//                   <Database className="h-6 w-6 text-blue-600" />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-gray-500">Today&apos;s Logs</p>
//                   <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
//                 </div>
//                 <div className="p-2 bg-green-100 rounded-lg">
//                   <Calendar className="h-6 w-6 text-green-600" />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-gray-500">Unique Users</p>
//                   <p className="text-2xl font-bold text-gray-900">{stats.uniqueUsers}</p>
//                 </div>
//                 <div className="p-2 bg-purple-100 rounded-lg">
//                   <User className="h-6 w-6 text-purple-600" />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-gray-500">Top Action</p>
//                   <p className="text-2xl font-bold text-gray-900 capitalize">{stats.topAction}</p>
//                 </div>
//                 <div className="p-2 bg-orange-100 rounded-lg">
//                   <Activity className="h-6 w-6 text-orange-600" />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-gray-500">Top Entity</p>
//                   <p className="text-2xl font-bold text-gray-900 capitalize">
//                     {stats.topEntity.replace('_', ' ')}
//                   </p>
//                 </div>
//                 <div className="p-2 bg-indigo-100 rounded-lg">
//                   <Briefcase className="h-6 w-6 text-indigo-600" />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Logs Table */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Activity Logs</CardTitle>
//             <CardDescription>
//               Showing {logs.length} of {pagination.total} logs (Page {pagination.page} of {pagination.totalPages})
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             {loading ? (
//               <div className="flex flex-col items-center justify-center py-12">
//                 <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
//                 <p className="text-gray-600">Loading task logs...</p>
//               </div>
//             ) : logs.length === 0 ? (
//               <div className="text-center py-12">
//                 <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
//                 <h3 className="text-lg font-semibold text-gray-900 mb-2">No task logs found</h3>
//                 <p className="text-gray-500">
//                   {search || actionFilter !== 'all' || entityFilter !== 'all' || dateRange !== 'all' 
//                     ? 'Try adjusting your search filters' 
//                     : 'No activity has been logged yet.'}
//                 </p>
//               </div>
//             ) : (
//               <>
//                 <div className="overflow-x-auto border border-gray-200 rounded-lg">
//                   <table className="w-full">
//                     <thead>
//                       <tr className="bg-gray-50 border-b border-gray-200">
//                         <th className="text-left py-3 px-4 font-medium text-gray-700">Timestamp</th>
//                         <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
//                         <th className="text-left py-3 px-4 font-medium text-gray-700">Action</th>
//                         <th className="text-left py-3 px-4 font-medium text-gray-700">Entity</th>
//                         <th className="text-left py-3 px-4 font-medium text-gray-700">Details</th>
//                         <th className="text-left py-3 px-4 font-medium text-gray-700">IP Address</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {logs.map((log) => {
//                         const { date, time } = formatDateTime(log.created_at)
//                         return (
//                           <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
//                             <td className="py-3 px-4">
//                               <div className="font-medium text-gray-900">{date}</div>
//                               <div className="text-xs text-gray-500 flex items-center gap-1">
//                                 <Clock className="h-3 w-3" />
//                                 {time}
//                               </div>
//                             </td>
//                             <td className="py-3 px-4">
//                               <div className="font-medium text-gray-900 truncate max-w-[150px]">
//                                 {log.user_email}
//                               </div>
//                             </td>
//                             <td className="py-3 px-4">
//                               <div className="flex items-center gap-2">
//                                 {getActionIcon(log.action)}
//                                 {getActionBadge(log.action)}
//                               </div>
//                             </td>
//                             <td className="py-3 px-4">
//                               <div className="flex items-center gap-2">
//                                 {getEntityIcon(log.entity_type)}
//                                 <div>
//                                   <div className="font-medium text-gray-900 capitalize">
//                                     {log.entity_type.replace('_', ' ')}
//                                   </div>
//                                   {log.entity_name && (
//                                     <div className="text-xs text-gray-500 truncate max-w-[120px]">
//                                       {log.entity_name}
//                                     </div>
//                                   )}
//                                 </div>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4 max-w-xs">
//                               <div className="text-xs bg-gray-50 p-2 rounded border border-gray-200 max-h-32 overflow-y-auto">
//                                 <pre className="whitespace-pre-wrap text-gray-700 font-mono">
//                                   {formatDetails(log.details)}
//                                 </pre>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4">
//                               <div className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200">
//                                 {log.ip_address || 'N/A'}
//                               </div>
//                             </td>
//                           </tr>
//                         )
//                       })}
//                     </tbody>
//                   </table>
//                 </div>

//                 {/* Pagination */}
//                 {pagination.totalPages > 1 && (
//                   <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
//                     <div className="text-sm text-gray-500">
//                       Showing {(pagination.page - 1) * pagination.perPage + 1} to{' '}
//                       {Math.min(pagination.page * pagination.perPage, pagination.total)} of{' '}
//                       {pagination.total} entries
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <Button
//                         variant="outline"
//                         onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
//                         disabled={pagination.page === 1 || loading}
//                         className="px-3 py-1"
//                       >
//                         <ChevronLeft className="h-4 w-4" />
//                         Previous
//                       </Button>
                      
//                       <div className="flex items-center gap-1">
//                         {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
//                           let pageNum
//                           if (pagination.totalPages <= 5) {
//                             pageNum = i + 1
//                           } else if (pagination.page <= 3) {
//                             pageNum = i + 1
//                           } else if (pagination.page >= pagination.totalPages - 2) {
//                             pageNum = pagination.totalPages - 4 + i
//                           } else {
//                             pageNum = pagination.page - 2 + i
//                           }
                          
//                           return (
//                             <Button
//                               key={pageNum}
//                               variant={pagination.page === pageNum ? "default" : "outline"}
//                               onClick={() => setPagination({ ...pagination, page: pageNum })}
//                               className="px-3 py-1 min-w-[40px]"
//                               disabled={loading}
//                             >
//                               {pageNum}
//                             </Button>
//                           )
//                         })}
//                       </div>
                      
//                       <Button
//                         variant="outline"
//                         onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
//                         disabled={pagination.page === pagination.totalPages || loading}
//                         className="px-3 py-1"
//                       >
//                         Next
//                         <ChevronRight className="h-4 w-4" />
//                       </Button>
//                     </div>
//                   </div>
//                 )}
//               </>
//             )}
//           </CardContent>
//         </Card>

//         {/* Information Panel */}
//         <Card>
//           <CardContent className="pt-6">
//             <div className="flex items-start gap-3">
//               <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
//               <div>
//                 <h4 className="font-medium text-gray-900 mb-1">About Task Logs</h4>
//                 <p className="text-sm text-gray-600">
//                   Task logs track all user activities in the system including create, update, delete, view, and login actions. 
//                   This audit trail helps with security monitoring, debugging, and compliance requirements.
//                 </p>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
//                   <div className="text-sm">
//                     <span className="font-medium text-gray-700">Action Types:</span>
//                     <div className="flex flex-wrap gap-1 mt-1">
//                       <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">create</span>
//                       <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">update</span>
//                       <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">delete</span>
//                       <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">view</span>
//                       <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">login</span>
//                     </div>
//                   </div>
//                   <div className="text-sm">
//                     <span className="font-medium text-gray-700">Entity Types:</span>
//                     <div className="flex flex-wrap gap-1 mt-1">
//                       <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">job_postings</span>
//                       <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">applications</span>
//                       <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">profiles</span>
//                       <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">educations</span>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   )
// }