// app/notifications/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCheck, Briefcase, MessageSquare, AlertCircle, Calendar, FileText, RefreshCw, X, ChevronRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ApplicantMobileTopbar } from '@/components/ApplicantSidebar'
import { MobileTopbar } from '@/components/adminhrsidebar'

// Simple type definitions
type Notification = {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  related_entity_id?: string
  related_entity_type?: string
  user_id: string
}

type UserRole = 'applicant' | 'hr' | 'super_admin'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userId, setUserId] = useState<string>('')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    loadUserAndNotifications()
    
    // Set up real-time subscription for new notifications
    const setupRealtime = async () => {
      const user = await getCurrentUser()
      if (user?.id) {
        const channel = supabase
          .channel(`notifications-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            () => {
              loadNotifications(user.id)
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            () => {
              loadNotifications(user.id)
            }
          )
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      }
    }

    setupRealtime()
  }, [])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  const loadUserAndNotifications = async () => {
    try {
      setLoading(true)
      const user = await getCurrentUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      // Get user profile to determine role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        return
      }

      const role = profile?.role as UserRole || 'applicant'
      setUserRole(role)

      // Load notifications
      await loadNotifications(user.id)
    } catch (error) {
      console.error('Error loading user and notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadNotifications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading notifications:', error)
        throw error
      }

      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    await markAsRead(notification.id)
    
    // Navigate if there's a link
    const link = getNotificationLink(notification, userRole)
    if (link) {
      router.push(link)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true)
      
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    } finally {
      setMarkingAll(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter(n => !n.is_read)
      case 'applications':
        return notifications.filter(n => 
          n.type === 'application_update' || 
          n.type === 'status_change' ||
          n.type === 'hr_comment' ||
          n.type === 'new_application'
        )
      default:
        return notifications
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const filteredNotifications = getFilteredNotifications()

  const handleBack = () => {
    // Navigate back based on user role
    if (userRole === 'applicant') {
      router.push('/applicant')
    } else if (userRole === 'hr' || userRole === 'super_admin') {
      router.push('/administrator/dashboard')
    } else {
      router.push('/')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    )
  }

  // For mobile, show a full page with mobile header
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-600">
                {unreadCount > 0 
                  ? `${unreadCount} unread` 
                  : 'All caught up'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={markingAll}
              className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              {markingAll ? 'Marking...' : 'Mark all'}
            </Button>
          )}
        </div>
      </div>

      {/* Desktop Header (hidden on mobile) */}
      <div className="hidden lg:block border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-600">
                {unreadCount > 0 
                  ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                  : 'All caught up! No unread notifications.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => loadNotifications(userId)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="default"
                onClick={markAllAsRead}
                disabled={markingAll}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                {markingAll ? 'Marking...' : 'Mark all as read'}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleBack}
              className="hidden lg:flex gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="mb-6">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="all" className="text-sm">
                  All
                  {notifications.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 min-w-5">
                      {notifications.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-sm">
                  Unread
                  {unreadCount > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 bg-blue-500">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="applications" className="text-sm">
                  Applications
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 mx-auto">
                  <Bell className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                <p className="text-gray-600 max-w-sm mx-auto">
                  {activeTab === 'unread' 
                    ? "You're all caught up! No unread notifications."
                    : "When you receive updates, they will appear here."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const timeAgo = formatTimeAgo(notification.created_at)
                const icon = getNotificationIcon(notification.type)
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer",
                      !notification.is_read && "border-l-4 border-l-blue-500"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">New</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notification.id)
                            }}
                            title="Mark as read"
                          >
                            <CheckCheck className={cn(
                              "h-3 w-3",
                              notification.is_read ? "text-gray-400" : "text-blue-500"
                            )} />
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {notification.message}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {timeAgo}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs",
                              notification.type === 'application_update' ? "bg-blue-100 text-blue-700" :
                              notification.type === 'hr_comment' ? "bg-green-100 text-green-700" :
                              notification.type === 'status_change' ? "bg-amber-100 text-amber-700" :
                              notification.type === 'new_application' ? "bg-purple-100 text-purple-700" :
                              "bg-gray-100 text-gray-700"
                            )}>
                              {notification.type.replace('_', ' ')}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNotificationClick(notification)
                            }}
                          >
                            View
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Stats Footer */}
          {notifications.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  Showing {filteredNotifications.length} of {notifications.length} notifications
                  {unreadCount > 0 && ` • ${unreadCount} unread`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadNotifications(userId)}
                    className="gap-2"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh
                  </Button>
                  {unreadCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markAllAsRead}
                      disabled={markingAll}
                      className="gap-2"
                    >
                      <CheckCheck className="h-3 w-3" />
                      {markingAll ? 'Marking...' : 'Mark all read'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getNotificationIcon(type: string) {
  switch (type) {
    case 'application_update':
      return <Briefcase className="h-5 w-5 text-blue-500" />
    case 'hr_comment':
      return <MessageSquare className="h-5 w-5 text-green-500" />
    case 'status_change':
      return <AlertCircle className="h-5 w-5 text-amber-500" />
    case 'new_application':
      return <FileText className="h-5 w-5 text-purple-500" />
    default:
      return <Bell className="h-5 w-5 text-gray-500" />
  }
}

function getNotificationLink(notification: Notification, userRole: UserRole | null) {
  const { type, related_entity_id } = notification
  if (!related_entity_id) return null
  
  const role = userRole || 'applicant'
  
  if (role === 'applicant') {
    if (type === 'application_update' || type === 'status_change' || type === 'hr_comment') {
      return `/applicant/track`
    }
  } else if (role === 'hr' || role === 'super_admin') {
    if (type === 'new_application' || type === 'application_update' || type === 'status_change' || type === 'hr_comment') {
      return `/administrator/applications/${related_entity_id}`
    }
  }
  
  return null
}