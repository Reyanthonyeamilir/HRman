// app/api/applicant/education/route.ts - UPDATED VERSION
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

    // Fetch educations for this user
    const { data, error } = await supabase
      .from('educations')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get educations error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error fetching educations:', error)
    return NextResponse.json({ error: 'Failed to fetch educations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const { course_qualification, institution, expected_finish, course_highlights } = body

    // Validate required fields
    if (!course_qualification || !institution) {
      return NextResponse.json({ error: 'Course qualification and institution are required' }, { status: 400 })
    }

    // Validate expected_finish date format if provided
    if (expected_finish) {
      const finishDate = new Date(expected_finish)
      if (isNaN(finishDate.getTime())) {
        return NextResponse.json({ error: 'Invalid expected finish date' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('educations')
      .insert({
        profile_id: user.id,
        course_qualification,
        institution,
        expected_finish: expected_finish || null,
        course_highlights: course_highlights || null
      })
      .select()
      .single()

    if (error) {
      console.error('Insert education error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Education added successfully',
      data 
    }, { status: 200 })
  } catch (error) {
    console.error('Error adding education:', error)
    return NextResponse.json({ error: 'Failed to add education' }, { status: 500 })
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
    const { id, course_qualification, institution, expected_finish, course_highlights } = body

    if (!id) {
      return NextResponse.json({ error: 'Education ID is required' }, { status: 400 })
    }

    // Validate required fields
    if (!course_qualification || !institution) {
      return NextResponse.json({ error: 'Course qualification and institution are required' }, { status: 400 })
    }

    // Validate expected_finish date format if provided
    if (expected_finish) {
      const finishDate = new Date(expected_finish)
      if (isNaN(finishDate.getTime())) {
        return NextResponse.json({ error: 'Invalid expected finish date' }, { status: 400 })
      }
    }

    // Check if education belongs to user and update
    const { data, error } = await supabase
      .from('educations')
      .update({
        course_qualification,
        institution,
        expected_finish: expected_finish || null,
        course_highlights: course_highlights || null
      })
      .eq('id', id)
      .eq('profile_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Update education error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Education updated successfully',
      data 
    }, { status: 200 })
  } catch (error) {
    console.error('Error updating education:', error)
    return NextResponse.json({ error: 'Failed to update education' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Education ID required' }, { status: 400 })
    }

    // Delete education (only if it belongs to the user)
    const { error } = await supabase
      .from('educations')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id)

    if (error) {
      console.error('Delete education error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Education deleted successfully' 
    }, { status: 200 })
  } catch (error) {
    console.error('Error deleting education:', error)
    return NextResponse.json({ error: 'Failed to delete education' }, { status: 500 })
  }
}