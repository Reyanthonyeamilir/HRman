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
        .from('eligibilities')
        .select('*')
        .eq('id', id)
        .eq('profile_id', user.id)
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Eligibility not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(data)
    }

    const { data, error } = await supabase
      .from('eligibilities')
      .select('*')
      .eq('profile_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch eligibilities' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])

  } catch (error: any) {
    console.error('Error in eligibilities GET:', error)
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
    
    if (!body.eligibility_name) {
      return NextResponse.json(
        { error: 'Eligibility name is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('eligibilities')
      .insert({
        profile_id: user.id,
        eligibility_name: body.eligibility_name,
        license_number: body.license_number || null,
        rating: body.rating || null,
        date_issued: body.date_issued || null,
        expiry_date: body.expiry_date || null,
        issuing_authority: body.issuing_authority || null
      })
      .select()
      .single()

    if (error) {
      console.error('Eligibilities POST error:', error)
      return NextResponse.json(
        { error: 'Failed to create eligibility' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })

  } catch (error: any) {
    console.error('Eligibilities POST error:', error)
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
        { error: 'Eligibility ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('eligibilities')
      .update({
        eligibility_name: body.eligibility_name,
        license_number: body.license_number || null,
        rating: body.rating || null,
        date_issued: body.date_issued || null,
        expiry_date: body.expiry_date || null,
        issuing_authority: body.issuing_authority || null
      })
      .eq('id', body.id)
      .eq('profile_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Eligibilities PUT error:', error)
      return NextResponse.json(
        { error: 'Failed to update eligibility' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Eligibilities PUT error:', error)
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
        { error: 'Eligibility ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('eligibilities')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id)

    if (error) {
      console.error('Eligibilities DELETE error:', error)
      return NextResponse.json(
        { error: 'Failed to delete eligibility' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Eligibilities DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}