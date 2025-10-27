import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { applicationId, status, comment } = await request.json()
    
    // Validate status
    const validStatuses = ['For review', 'Shortlisted', 'Interview', 'Rejected', 'Hired']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid status' 
      }, { status: 400 })
    }
    
    // Update application status and comment
    const success = await updateApplicationStatus(applicationId, status, comment)
    
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update application status' 
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update application status' 
    }, { status: 500 })
  }
}

async function updateApplicationStatus(applicationId: string, status: string, comment: string) {
  // Your existing implementation for updating application status
  /*
  const { error } = await supabase
    .from('applications')
    .update({ 
      status, 
      comment,
      updated_at: new Date().toISOString()
    })
    .eq('id', applicationId)
  */
  
  return true // Return actual success status
}