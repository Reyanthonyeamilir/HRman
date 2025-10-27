import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pdfPath = searchParams.get('path')
    const applicationId = searchParams.get('applicationId')
    
    if (!pdfPath && !applicationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'PDF path or application ID required' 
      }, { status: 400 })
    }
    
    let finalPdfPath = pdfPath
    let applicationDetails = null
    
    // Get PDF path and application details from database
    if (applicationId && !pdfPath) {
      const { data: application, error } = await supabase
        .from('applications')
        .select(`
          pdf_path,
          applicant:profiles(
            email,
            user_data
          ),
          job_posting:job_postings(
            job_title
          )
        `)
        .eq('id', applicationId)
        .single()

      if (error || !application) {
        console.error('Error fetching application:', error)
        return NextResponse.json({ 
          success: false, 
          error: 'Application not found' 
        }, { status: 404 })
      }
      
      finalPdfPath = application.pdf_path
      
      // Get details for file naming - with safe type checking
      const applicant = Array.isArray(application.applicant) 
        ? application.applicant[0] 
        : application.applicant
        
      const jobPosting = Array.isArray(application.job_posting)
        ? application.job_posting[0]
        : application.job_posting
      
      if (applicant && typeof applicant.user_data === 'object' && applicant.user_data !== null) {
        const userData = applicant.user_data as any
        const firstName = userData.first_name || ''
        const lastName = userData.last_name || ''
        const jobTitle = jobPosting?.job_title || 'application'
        
        if (firstName && lastName) {
          applicationDetails = {
            applicantName: `${lastName}, ${firstName}`.replace(/[^a-z0-9]/gi, '_'),
            jobTitle: jobTitle.replace(/[^a-z0-9]/gi, '_')
          }
        }
      }
    }
    
    if (!finalPdfPath) {
      return NextResponse.json({ 
        success: false, 
        error: 'PDF path not found for this application' 
      }, { status: 404 })
    }
    
    // Try to download from storage - handle different path formats
    let fileData: Blob | null = null
    let downloadError: any = null
    
    // Try direct path first (assuming full path includes bucket)
    const { data: directData, error: directError } = await supabase.storage
      .from('applications') // default bucket
      .download(finalPdfPath)
    
    if (!directError && directData) {
      fileData = directData
    } else {
      downloadError = directError
      
      // If direct path fails, try parsing bucket from path
      const pathParts = finalPdfPath.split('/')
      if (pathParts.length >= 2) {
        const bucketName = pathParts[0]
        const filePath = pathParts.slice(1).join('/')
        
        const { data: parsedData, error: parsedError } = await supabase.storage
          .from(bucketName)
          .download(filePath)
          
        if (!parsedError && parsedData) {
          fileData = parsedData
        } else {
          downloadError = parsedError
        }
      }
    }
    
    if (!fileData) {
      console.error('All download attempts failed:', downloadError)
      return NextResponse.json({ 
        success: false, 
        error: 'PDF file not found in storage' 
      }, { status: 404 })
    }

    // Generate filename
    let filename = `application_${applicationId || 'document'}.pdf`
    if (applicationDetails) {
      filename = `${applicationDetails.applicantName}_${applicationDetails.jobTitle}_application.pdf`
    }
    
    return new Response(fileData, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileData.size.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
    
  } catch (error) {
    console.error('Error in PDF download:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}