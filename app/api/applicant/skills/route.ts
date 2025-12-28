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
        .from('skills')
        .select('*')
        .eq('id', id)
        .eq('profile_id', user.id)
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Skill not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(data)
    }

    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('profile_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch skills' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])

  } catch (error: any) {
    console.error('Error in skills GET:', error)
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
    
    if (!body.skill_name) {
      return NextResponse.json(
        { error: 'Skill name is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('skills')
      .insert({
        profile_id: user.id,
        skill_name: body.skill_name,
        proficiency: body.proficiency || null,
        years_of_experience: body.years_of_experience || null
      })
      .select()
      .single()

    if (error) {
      console.error('Skills POST error:', error)
      return NextResponse.json(
        { error: 'Failed to create skill' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })

  } catch (error: any) {
    console.error('Skills POST error:', error)
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
        { error: 'Skill ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('skills')
      .update({
        skill_name: body.skill_name,
        proficiency: body.proficiency || null,
        years_of_experience: body.years_of_experience || null
      })
      .eq('id', body.id)
      .eq('profile_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Skills PUT error:', error)
      return NextResponse.json(
        { error: 'Failed to update skill' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Skills PUT error:', error)
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
        { error: 'Skill ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id)

    if (error) {
      console.error('Skills DELETE error:', error)
      return NextResponse.json(
        { error: 'Failed to delete skill' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Skills DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}