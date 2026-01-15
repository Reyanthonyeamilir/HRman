'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { supabase, getCurrentUser } from '@/lib/applicant'
import Link from 'next/link'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Get current user first
    const getUser = async () => {
      try {
        const user = await getCurrentUser()
        if (user?.id) {
          setUserId(user.id)
          loadUnreadCount(user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Error getting user:', error)
        setLoading(false)
      }
    }

    getUser()

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user?.id) {
          const user = await getCurrentUser()
          if (user?.id) {
            setUserId(user.id)
            loadUnreadCount(user.id)
          }
        } else {
          setUserId(null)
          setUnreadCount(0)
          setLoading(false)
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const loadUnreadCount = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_read', false)
      
      if (!error && data !== null) {
        setUnreadCount(data.length || 0)
      }
    } catch (error) {
      console.error('Error loading unread count:', error)
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to real-time notifications when user is logged in
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notification-bell-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Refresh count when notifications change
          loadUnreadCount(userId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Don't show anything if loading or no user
  if (loading) {
    return (
      <div className="p-2">
        <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <Link 
      href="/notifications" 
      className="relative p-2 hover:bg-slate-100 rounded-full transition-colors group"
      aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      title="View notifications"
    >
      <Bell className="h-5 w-5 text-slate-600 group-hover:text-slate-900" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs border-2 border-white shadow-sm">
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Link>
  )
}