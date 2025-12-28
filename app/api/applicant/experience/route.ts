import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const { data, error } = await supabase
        .from('work_experiences')
        .select('*')
        .eq('id', id)
        .eq('profile_id', user.id)
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Work experience not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(data)
    }

    const { data, error } = await supabase
      .from('work_experiences')
      .select('*')
      .eq('profile_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch work experiences' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])

  } catch (error: any) {
    console.error('Error in experience GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    if (!body.job_title || !body.company || !body.start_date) {
      return NextResponse.json(
        { error: 'Job title, company, and start date are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('work_experiences')
      .insert({
        profile_id: user.id,
        job_title: body.job_title,
        company: body.company,
        start_date: body.start_date,
        end_date: body.end_date || null,
        currently_working: body.currently_working || false,
        description: body.description || null
      })
      .select()
      .single()

    if (error) {
      console.error('Experience POST error:', error)
      return NextResponse.json(
        { error: 'Failed to create work experience' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })

  } catch (error: any) {
    console.error('Experience POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Experience ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('work_experiences')
      .update({
        job_title: body.job_title,
        company: body.company,
        start_date: body.start_date,
        end_date: body.end_date || null,
        currently_working: body.currently_working || false,
        description: body.description || null
      })
      .eq('id', body.id)
      .eq('profile_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Experience PUT error:', error)
      return NextResponse.json(
        { error: 'Failed to update work experience' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Experience PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Experience ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('work_experiences')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id)

    if (error) {
      console.error('Experience DELETE error:', error)
      return NextResponse.json(
        { error: 'Failed to delete work experience' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Experience DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}