import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || user.id
    const includeAll = searchParams.get('includeAll') === 'true'

    // Security check
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only view your own profile' },
        { status: 403 }
      )
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json(
        { error: 'Profile not found' },
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
      supabase.from('educations').select('*').eq('profile_id', userId),
      supabase.from('work_experiences').select('*').eq('profile_id', userId),
      supabase.from('skills').select('*').eq('profile_id', userId),
      supabase.from('eligibilities').select('*').eq('profile_id', userId),
      supabase.from('trainings').select('*').eq('profile_id', userId)
    ])

    return NextResponse.json({
      ...profile,
      educations: educations || [],
      work_experiences: work_experiences || [],
      skills: skills || [],
      eligibilities: eligibilities || [],
      trainings: trainings || []
    })

  } catch (error: any) {
    console.error('Error in profile GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Calculate age if date_of_birth is provided
    let age = body.age
    if (body.date_of_birth && !body.age) {
      const birthDate = new Date(body.date_of_birth)
      const today = new Date()
      let calculatedAge = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--
      }
      age = calculatedAge
    }

    const updateData = {
      first_name: body.first_name,
      middle_name: body.middle_name || null,
      last_name: body.last_name,
      phone: body.phone || null,
      date_of_birth: body.date_of_birth || null,
      age: age || null,
      address: body.address || null,
      avatar_url: body.avatar_url || null,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}