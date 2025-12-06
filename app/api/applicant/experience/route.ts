// app/api/applicant/experience/route.ts - COMPLETE VERSION
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

    // Fetch work experiences for this user
    const { data, error } = await supabase
      .from('work_experiences')
      .select('*')
      .eq('profile_id', user.id)
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Get work experiences error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error fetching work experiences:', error)
    return NextResponse.json({ error: 'Failed to fetch work experiences' }, { status: 500 })
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
    const { job_title, company, start_date, end_date, currently_working, description } = body

    // Validate required fields
    if (!job_title || !company || !start_date) {
      return NextResponse.json({ error: 'Job title, company, and start date are required' }, { status: 400 })
    }

    // Validate dates
    const startDate = new Date(start_date)
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })
    }

    if (end_date && !currently_working) {
      const endDate = new Date(end_date)
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid end date' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('work_experiences')
      .insert({
        profile_id: user.id,
        job_title,
        company,
        start_date,
        end_date: currently_working ? null : (end_date || null),
        currently_working: currently_working || false,
        description: description || null
      })
      .select()
      .single()

    if (error) {
      console.error('Insert work experience error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Work experience added successfully',
      data
    }, { status: 200 })
  } catch (error) {
    console.error('Error adding work experience:', error)
    return NextResponse.json({ error: 'Failed to add work experience' }, { status: 500 })
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
    const { id, job_title, company, start_date, end_date, currently_working, description } = body

    if (!id) {
      return NextResponse.json({ error: 'Work experience ID is required' }, { status: 400 })
    }

    // Validate required fields
    if (!job_title || !company || !start_date) {
      return NextResponse.json({ error: 'Job title, company, and start date are required' }, { status: 400 })
    }

    // Validate dates
    const startDate = new Date(start_date)
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })
    }

    if (end_date && !currently_working) {
      const endDate = new Date(end_date)
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid end date' }, { status: 400 })
      }
    }

    // Update work experience
    const { data, error } = await supabase
      .from('work_experiences')
      .update({
        job_title,
        company,
        start_date,
        end_date: currently_working ? null : (end_date || null),
        currently_working: currently_working || false,
        description: description || null
      })
      .eq('id', id)
      .eq('profile_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Update work experience error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Work experience updated successfully',
      data
    }, { status: 200 })
  } catch (error) {
    console.error('Error updating work experience:', error)
    return NextResponse.json({ error: 'Failed to update work experience' }, { status: 500 })
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
      return NextResponse.json({ error: 'Work experience ID required' }, { status: 400 })
    }

    // Delete work experience (only if it belongs to the user)
    const { error } = await supabase
      .from('work_experiences')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id)

    if (error) {
      console.error('Delete work experience error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Work experience deleted successfully' 
    }, { status: 200 })
  } catch (error) {
    console.error('Error deleting work experience:', error)
    return NextResponse.json({ error: 'Failed to delete work experience' }, { status: 500 })
  }
}