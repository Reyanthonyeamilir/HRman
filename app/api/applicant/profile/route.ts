import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const createServerSupabase = () => {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    console.log('📋 === Profile GET API Called ===')
    
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const supabase = createServerSupabase()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    const userId = user.id
    const searchParams = request.nextUrl.searchParams
    const includeAll = searchParams.get('includeAll') === 'true'
    
    // Fetch main profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: `Profile not found: ${profileError.message}` },
        { status: 404 }
      )
    }

    if (!includeAll) {
      return NextResponse.json(profile)
    }

    // Fetch all related data
    const [
      { data: educations },
      { data: work_experiences },
      { data: skills },
      { data: eligibilities },
      { data: trainings }
    ] = await Promise.all([
      supabase
        .from('educations')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('work_experiences')
        .select('*')
        .eq('profile_id', userId)
        .order('start_date', { ascending: false }),
      
      supabase
        .from('skills')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('eligibilities')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('trainings')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })
    ])

    const response = {
      ...profile,
      educations: educations || [],
      work_experiences: work_experiences || [],
      skills: skills || [],
      eligibilities: eligibilities || [],
      trainings: trainings || []
    }

    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('Error in profile GET API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('✏️ === Profile PUT API Called ===')
    
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const supabase = createServerSupabase()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    const userId = user.id
    const body = await request.json()
    
    console.log('Updating profile for user:', userId)
    console.log('Update data:', body)
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    const allowedFields = [
      'first_name', 'middle_name', 'last_name',
      'phone', 'date_of_birth', 'age', 'address', 'avatar_url'
    ]
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null
      }
    })

    // Validate age if provided
    if (updateData.age !== undefined && updateData.age !== null) {
      const age = parseInt(updateData.age)
      if (isNaN(age) || age < 18 || age > 100) {
        return NextResponse.json(
          { error: 'Age must be between 18 and 100' },
          { status: 400 }
        )
      }
      updateData.age = age
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json(
        { error: `Update failed: ${error.message}` },
        { status: 400 }
      )
    }

    console.log('✅ Profile updated successfully:', data)
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}