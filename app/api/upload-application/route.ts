import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface UploadResponse {
  id: string;
  success: boolean;
  path: string;
  message: string;
}

interface ErrorResponse {
  error: string;
}

// Client for auth operations (uses anon key)
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Client for server operations (uses service role key for RLS bypass)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper to get Supabase auth token from cookies
function getSupabaseAuthToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  
  const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie) => {
    const [key, value] = cookie.trim().split('=')
    if (key && value) {
      acc[key.trim()] = decodeURIComponent(value)
    }
    return acc
  }, {})
  
  // Supabase stores auth token in multiple cookies
  for (const [key, value] of Object.entries(cookies)) {
    if ((key.includes('access-token') || key.includes('sb-access-token')) && value) {
      return value
    }
  }
  
  return null
}

async function getCurrentUserFromRequest(request: NextRequest) {
  try {
    // First try Authorization header (Bearer token from XMLHttpRequest)
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      console.log('Token from Authorization header')
      
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
      
      if (!error && user) {
        console.log('User authenticated via header:', user.id)
        return user
      }
    }
    
    // Fallback to cookies if header not found
    const cookieHeader = request.headers.get('cookie')
    const token = getSupabaseAuthToken(cookieHeader)
    
    if (!token) {
      console.log('No auth token found in cookies or headers')
      return null
    }
    
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
    
    if (error || !user) {
      console.error('Auth error:', error)
      return null
    }
    
    console.log('User authenticated via cookies:', user.id)
    return user
    
  } catch (error) {
    console.error('Error getting user from request:', error)
    return null
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse | ErrorResponse>> {
  try {
    console.log('Upload API called')
    
    // Get form data
    const formData = await request.formData()
    
    const job_id = formData.get('job_id') as string
    const applicant_comment = (formData.get('applicant_comment') as string) || ''
    const file = formData.get('file') as File

    console.log('Form data received:', { 
      job_id, 
      applicant_comment: applicant_comment.substring(0, 50),
      fileName: file?.name,
      fileSize: file?.size 
    })

    if (!file) {
      console.error('No file uploaded')
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    
    if (!job_id) {
      console.error('No job ID provided')
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }
    
    // Get user from request
    const user = await getCurrentUserFromRequest(request)
    
    if (!user) {
      console.error('No user authenticated')
      return NextResponse.json({ error: 'Authentication required. Please sign in.' }, { status: 401 })
    }
    
    console.log('User authenticated:', user.id)
    
    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }
    
    // Check if user is an applicant
    if (profile.role !== 'applicant') {
      console.error('User is not applicant:', profile.role)
      return NextResponse.json({ error: 'Only applicants can submit applications' }, { status: 403 })
    }
    
    // Validate file
    const fileName = file.name.toLowerCase()
    if (file.type !== 'application/pdf' && !fileName.endsWith('.pdf')) {
      console.error('Invalid file type:', file.type)
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }
    
    const maxSizeMB = 20
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      console.error('File too large:', file.size)
      return NextResponse.json({ error: `File size exceeds ${maxSizeMB}MB limit` }, { status: 400 })
    }
    
    // Check if job exists and is active
    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('id, job_title, status')
      .eq('id', job_id)
      .single()
    
    if (jobError || !job) {
      console.error('Job not found:', jobError)
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    if (job.status !== 'active') {
      console.error('Job not active:', job.status)
      return NextResponse.json({ error: 'This job is no longer active' }, { status: 400 })
    }
    
    // Check for existing application
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', job_id)
      .eq('applicant_id', user.id)
      .maybeSingle()
    
    if (existingApp) {
      console.error('Already applied:', job_id)
      return NextResponse.json({ error: 'You have already applied for this position' }, { status: 400 })
    }
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Create unique filename
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const filePath = `applications/${user.id}/${timestamp}_${randomString}_${safeFileName}`
    
    console.log('Uploading to storage:', filePath)
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('applications')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'File upload failed: ' + uploadError.message }, { status: 500 })
    }
    
    console.log('Storage upload successful:', uploadData.path)
    
    // Save to database
    const { data: application, error: dbError } = await supabase
      .from('applications')
      .insert({
        job_id,
        applicant_id: user.id,
        pdf_path: uploadData.path,
        applicant_comment,
        status: 'for_review',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (dbError) {
      // Clean up uploaded file if DB insert fails
      await supabase.storage.from('applications').remove([uploadData.path])
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save application: ' + dbError.message }, { status: 500 })
    }
    
    console.log('Application saved:', application.id)
    
    // Create notifications for HR
    try {
      const { data: hrUsers } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('role', 'hr')
        .eq('role', 'super_admin')
      
      if (hrUsers && hrUsers.length > 0) {
        const notifications = hrUsers.map((hrUser: { id: string; email: string }) => ({
          user_id: hrUser.id,
          type: 'new_application',
          title: 'New Application',
          message: `New application submitted for ${job.job_title} by ${profile.email}`,
          related_entity_type: 'application',
          related_entity_id: application.id,
          created_by: user.id,
          created_at: new Date().toISOString()
        }))
        
        await supabase
          .from('notifications')
          .insert(notifications)
          
        console.log('Notifications created for HR users')
      }
    } catch (notifyError) {
      console.error('Notification creation error:', notifyError)
      // Don't fail the upload if notifications fail
    }
    
    // Log the action
    try {
      await supabase
        .from('task_logs')
        .insert({
          user_id: user.id,
          user_email: profile.email || user.email || '',
          action: 'submit_application',
          entity_type: 'application',
          entity_id: application.id,
          entity_name: job.job_title,
          details: { 
            job_id, 
            file_name: file.name, 
            file_size: file.size,
            applicant_id: user.id,
            storage_path: uploadData.path
          },
          created_at: new Date().toISOString()
        })
        
      console.log('Task log created')
    } catch (logError) {
      console.error('Log creation error:', logError)
      // Don't fail the upload if logging fails
    }
    
    return NextResponse.json({ 
      id: application.id, 
      success: true,
      path: uploadData.path,
      message: 'Application submitted successfully'
    })
    
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}

export async function GET(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}