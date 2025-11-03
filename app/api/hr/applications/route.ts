import { NextRequest, NextResponse } from 'next/server'
import { SupabaseHR } from '../../../../lib/SupabaseHR'

const supabaseHR = new SupabaseHR()

export async function GET(request: NextRequest) {
  console.log('GET /api/hr/applications called')
  
  try {
    const applications = await getHRApplications()
    
    console.log(`Successfully fetched ${applications.length} applications`)
    
    return NextResponse.json({ 
      success: true, 
      applications 
    })
  } catch (error: any) {
    console.error('Error in applications API:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch applications' 
    }, { status: 500 })
  }
}

async function getHRApplications() {
  console.log('getHRApplications called')
  
  try {
    // Check if user is authenticated and has HR role
    console.log('Checking user authentication...')
    const { user, error: authError } = await supabaseHR.getCurrentUser()
    
    console.log('User auth result:', { user: user?.id, authError: authError?.message })
    
    if (authError || !user) {
      throw new Error('Unauthorized: ' + (authError?.message || 'No user found'))
    }

    // Verify user has HR role
    console.log('Fetching user profile...')
    const { profile, error: profileError } = await supabaseHR.getUserProfile(user.id)
    
    console.log('User profile result:', { 
      profile: profile?.id, 
      role: profile?.role,
      profileError: profileError?.message 
    })
    
    if (profileError) {
      throw new Error('Profile error: ' + profileError.message)
    }
    
    if (!profile || (profile.role !== 'hr' && profile.role !== 'super_admin')) {
      throw new Error(`Access denied. HR role required. Current role: ${profile?.role || 'none'}`)
    }

    // Fetch applications with related data using your SupabaseHR utility
    console.log('Fetching applications with details...')
    const { data: applications, error } = await supabaseHR.getApplicationsWithDetails()

    console.log('Applications fetch result:', { 
      count: applications?.length, 
      error: error?.message 
    })

    if (error) {
      throw error
    }

    // Transform the data to match your frontend structure
    const transformedApplications = (applications || []).map((app: any) => ({
      id: app.id,
      job_id: app.job_id,
      applicant_id: app.applicant_id,
      pdf_path: app.pdf_path,
      comment: app.comment,
      submitted_at: app.submitted_at,
      status: app.status,
      applicant: app.applicant ? {
        id: app.applicant.id,
        email: app.applicant.email,
        phone: app.applicant.phone,
        role: app.applicant.role,
        created_at: app.applicant.created_at,
        user_data: app.applicant.user_data || null
      } : null,
      job_posting: app.job_posting ? {
        id: app.job_posting.id,
        job_title: app.job_posting.job_title,
        department: app.job_posting.department,
        location: app.job_posting.location,
        status: app.job_posting.status
      } : null
    }))

    console.log('Transformed applications:', transformedApplications.length)
    return transformedApplications

  } catch (error: any) {
    console.error('Error in getHRApplications:', error)
    throw new Error(error.message || 'Failed to get HR applications')
  }
}

// PUT method for updating application status
export async function PUT(request: NextRequest) {
  console.log('PUT /api/hr/applications called')
  
  try {
    const body = await request.json()
    console.log('Request body:', body)
    
    const { applicationId, status } = body

    if (!applicationId || !status) {
      return NextResponse.json({ 
        success: false, 
        error: 'applicationId and status are required' 
      }, { status: 400 })
    }

    // Check if user is authenticated and has HR role
    console.log('Checking user authentication for PUT...')
    const { user, error: authError } = await supabaseHR.getCurrentUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: ' + (authError?.message || 'No user found')
      }, { status: 401 })
    }

    const { profile, error: profileError } = await supabaseHR.getUserProfile(user.id)
    
    if (profileError || !profile || (profile.role !== 'hr' && profile.role !== 'super_admin')) {
      return NextResponse.json({ 
        success: false, 
        error: `Access denied. HR role required. Current role: ${profile?.role || 'none'}` 
      }, { status: 403 })
    }

    // Update application status using your SupabaseHR utility
    console.log(`Updating application ${applicationId} to status: ${status}`)
    const { error } = await supabaseHR.updateApplicationStatus(applicationId, status)

    if (error) {
      console.error('Error updating application status:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    console.log('Application status updated successfully')
    return NextResponse.json({
      success: true,
      message: 'Application status updated successfully'
    })

  } catch (error: any) {
    console.error('Unexpected error updating application:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}