import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserWithRole } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

// GET - List all users OR get dashboard stats (only for super admin)
export async function GET(request: NextRequest) {
  try {
    console.log('🎯 GET /api/admin - ENTERING FUNCTION')
    console.log('🔐 Request URL:', request.url)
    
    // Check if user is authenticated and is super admin
    console.log('🔐 Calling getAuthenticatedUserWithRole...')
    const userWithRole = await getAuthenticatedUserWithRole()
    console.log('🔐 getAuthenticatedUserWithRole result:', userWithRole)
    
    if (!userWithRole) {
      console.log('❌ No authenticated user - returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔐 User role from API:', userWithRole.role)
    
    if (userWithRole.role !== 'super_admin') {
      console.log('❌ User is not super_admin - returning 403')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('✅ User is super_admin, proceeding...')
    
    // Check if this is a stats request
    const url = new URL(request.url)
    const statsParam = url.searchParams.get('stats')
    
    if (statsParam === 'true') {
      console.log('📊 Fetching dashboard statistics...')
      
      // Fetch dashboard statistics
      const [usersResult, applicationsResult, hrStaffResult, pendingResult] = await Promise.all([
        supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('applications').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'hr'),
        supabaseAdmin.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ])

      console.log('📊 Stats fetched successfully:', {
        totalUsers: usersResult.count,
        totalApplications: applicationsResult.count,
        totalHRStaff: hrStaffResult.count,
        pendingReviews: pendingResult.count
      })

      return NextResponse.json({
        totalUsers: usersResult.count || 0,
        totalApplications: applicationsResult.count || 0,
        totalHRStaff: hrStaffResult.count || 0,
        pendingReviews: pendingResult.count || 0
      })
    } else {
      // Original functionality - fetch all users
      console.log('🔐 Fetching users from database...')
      const { data: users, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('🔐 Profiles fetch result:', { data: users?.length, error })

      if (error) {
        console.error('❌ Database error:', error)
        throw error
      }

      console.log('✅ Successfully returning users')
      return NextResponse.json({ users })
    }

  } catch (error: any) {
    console.error('❌ Get users/stats error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 POST /api/admin - ENTERING FUNCTION')
    console.log('🔐 Request URL:', request.url)
    
    // Check if user is authenticated and is super admin
    console.log('🔐 Calling getAuthenticatedUserWithRole...')
    const userWithRole = await getAuthenticatedUserWithRole()
    console.log('🔐 User with role:', userWithRole?.role)
    
    if (!userWithRole) {
      console.log('❌ No authenticated user - returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (userWithRole.role !== 'super_admin') {
      console.log('❌ User is not super_admin:', userWithRole.role)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    console.log('🔐 Request body:', body)
    const { email, password, phone, role } = body

    // Validate input
    if (!email || !password || !role) {
      console.log('❌ Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 6) {
      console.log('❌ Password too short')
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Validate role
    const validRoles = ['super_admin', 'hr', 'applicant']
    if (!validRoles.includes(role)) {
      console.log('❌ Invalid role:', role)
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    console.log('🔄 Creating auth user...')
    
    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { phone: phone || null }
    })

    console.log('🔐 Auth user creation result:', { authData, authError })

    if (authError) {
      console.error('❌ Auth creation error:', authError)
      throw authError
    }
    
    if (!authData.user) {
      throw new Error('Failed to create user')
    }

    console.log('🔄 Creating profile...')
    
    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        phone: phone || null,
        role
      })

    console.log('🔐 Profile creation result:', { profileError })

    if (profileError) {
      console.log('🔄 Rolling back - deleting auth user...')
      // Rollback: delete the auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        console.log('✅ Auth user rollback successful')
      } catch (deleteError) {
        console.error('❌ Failed to rollback auth user:', deleteError)
      }
      throw profileError
    }

    console.log('✅ User created successfully')
    return NextResponse.json({ 
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role,
        phone: phone || null
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('❌ Create user error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}