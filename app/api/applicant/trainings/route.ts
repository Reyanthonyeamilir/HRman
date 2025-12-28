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
        .from('trainings')
        .select('*')
        .eq('id', id)
        .eq('profile_id', user.id)
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Training not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(data)
    }

    const { data, error } = await supabase
      .from('trainings')
      .select('*')
      .eq('profile_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch trainings' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])

  } catch (error: any) {
    console.error('Error in trainings GET:', error)
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
    
    if (!body.training_name || !body.institution) {
      return NextResponse.json(
        { error: 'Training name and institution are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('trainings')
      .insert({
        profile_id: user.id,
        training_name: body.training_name,
        institution: body.institution,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        duration_hours: body.duration_hours || null,
        certificate_id: body.certificate_id || null,
        skills_learned: body.skills_learned || null
      })
      .select()
      .single()

    if (error) {
      console.error('Trainings POST error:', error)
      return NextResponse.json(
        { error: 'Failed to create training' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })

  } catch (error: any) {
    console.error('Trainings POST error:', error)
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
        { error: 'Training ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('trainings')
      .update({
        training_name: body.training_name,
        institution: body.institution,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        duration_hours: body.duration_hours || null,
        certificate_id: body.certificate_id || null,
        skills_learned: body.skills_learned || null
      })
      .eq('id', body.id)
      .eq('profile_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Trainings PUT error:', error)
      return NextResponse.json(
        { error: 'Failed to update training' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Trainings PUT error:', error)
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
        { error: 'Training ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('trainings')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id)

    if (error) {
      console.error('Trainings DELETE error:', error)
      return NextResponse.json(
        { error: 'Failed to delete training' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Trainings DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}