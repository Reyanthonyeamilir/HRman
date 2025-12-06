import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get userId from query params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Security check: users can only view their own profile
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only view your own profile' }, { status: 403 })
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Fetch educations
    const { data: educations, error: eduError } = await supabase
      .from('educations')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })

    if (eduError) {
      console.error('Education error:', eduError)
    }

    // Fetch work experiences
    const { data: work_experiences, error: workError } = await supabase
      .from('work_experiences')
      .select('*')
      .eq('profile_id', userId)
      .order('start_date', { ascending: false })

    if (workError) {
      console.error('Work experience error:', workError)
    }

    return NextResponse.json({
      ...profile,
      educations: educations || [],
      work_experiences: work_experiences || []
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      first_name, 
      middle_name, 
      last_name, 
      phone, 
      date_of_birth, 
      age, 
      address,
      avatar_url 
    } = body

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: first_name || null,
        middle_name: middle_name || null,
        last_name: last_name || null,
        phone: phone || null,
        date_of_birth: date_of_birth || null,
        age: age || null,
        address: address || null,
        avatar_url: avatar_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Profile updated successfully' 
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}