import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserWithRole } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdminClient'

interface RouteParams {
  params: {
    id: string
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    console.log('🎯 PUT /api/admin/[id] - ENTERING FUNCTION')
    console.log('🔐 User ID:', params.id)
    
    // Check if user is authenticated and is super admin
    const userWithRole = await getAuthenticatedUserWithRole()
    
    if (!userWithRole) {
      console.log('❌ No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (userWithRole.role !== 'super_admin') {
      console.log('❌ User is not super_admin:', userWithRole.role)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates = await request.json()
    const userId = params.id

    console.log('🔐 Updating user:', userId, 'with:', updates)

    // Prevent modifying super_admin users
    const { data: targetUser } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (targetUser?.role === 'super_admin') {
      console.log('❌ Attempted to modify super_admin user')
      return NextResponse.json({ error: 'Cannot modify super admin users' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (error) {
      console.error('❌ Profile update error:', error)
      throw error
    }

    console.log('✅ User updated successfully')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Update user error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    console.log('🔐 DELETE called for user:', params.id)
    
    // Check if user is authenticated and is super admin
    const userWithRole = await getAuthenticatedUserWithRole()
    console.log('🔐 Current user role:', userWithRole?.role)
    
    if (!userWithRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (userWithRole.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = params.id
    console.log('🔐 Attempting to delete user:', userId)

    // Prevent deleting super_admin users
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', userId)
      .single()

    console.log('🔐 Target user fetch:', { targetUser, fetchError })

    if (fetchError) {
      throw new Error(`Failed to fetch user: ${fetchError.message}`)
    }

    if (targetUser?.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot delete super admin users' }, { status: 403 })
    }

    console.log('🔐 Proceeding with delete...')
    
    // Delete auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    console.log('🔐 Delete result:', { error })

    if (error) throw error

    console.log('🔐 Delete successful')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Delete user error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}