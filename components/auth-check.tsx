'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/applicant'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface User {
  id: string
  email: string
  role: 'applicant' | 'hr' | 'admin' | 'super_admin'
  name?: string
}

interface AuthCheckProps {
  children: React.ReactNode
  requiredRole?: 'applicant' | 'hr' | 'admin' | 'super_admin' | 'any'
}

export function AuthCheck({ children, requiredRole = 'any' }: AuthCheckProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser()
      setUser(user)
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasRequiredRole = (user: User | null): boolean => {
    if (requiredRole === 'any') return !!user
    if (!user) return false
    
    // Role hierarchy
    const roleHierarchy = {
      'applicant': 1,
      'hr': 2,
      'admin': 3,
      'super_admin': 4
    }
    
    const userRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0
    
    return userRoleLevel >= requiredRoleLevel
  }

  const getRoleSpecificMessage = () => {
    switch (requiredRole) {
      case 'admin':
      case 'super_admin':
        return 'Administrator Access Required'
      case 'hr':
        return 'HR Access Required'
      case 'applicant':
        return 'Applicant Account Required'
      default:
        return 'Authentication Required'
    }
  }

  const getRoleSpecificDescription = () => {
    switch (requiredRole) {
      case 'admin':
      case 'super_admin':
        return 'Please sign in with an administrator account to access this page.'
      case 'hr':
        return 'Please sign in with an HR account to access this page.'
      case 'applicant':
        return 'Please sign in with an applicant account to access this page.'
      default:
        return 'Please sign in to access this page.'
    }
  }

  const handleSignOut = async () => {
    const { supabase } = await import('@/lib/supabaseClient')
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!user || !hasRequiredRole(user)) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{getRoleSpecificMessage()}</CardTitle>
            <CardDescription>
              {getRoleSpecificDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user && !hasRequiredRole(user) ? (
              <>
                <p className="text-sm text-gray-600">
                  Your account role (<span className="font-medium capitalize">{user.role.replace('_', ' ')}</span>) does not have access to this page.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => router.push('/applicant')}>
                    Go to Applicant Dashboard
                  </Button>
                  {(user.role === 'hr' || user.role === 'admin' || user.role === 'super_admin') && (
                    <Button variant="outline" onClick={() => router.push('/hr')}>
                      Go to HR Dashboard
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  You need to be logged in to access this page.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => router.push('/auth/signin')}>
                    Sign In
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/auth/signup')}>
                    Sign Up
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}