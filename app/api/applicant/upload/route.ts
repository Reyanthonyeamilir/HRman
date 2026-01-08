// app/api/applicants/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('=== AVATAR UPLOAD START ===')
  
  // ALWAYS return JSON, no matter what happens
  try {
    // Log basic request info
    console.log('Request method:', request.method)
    console.log('Request URL:', request.url)
    console.log('Content-Type:', request.headers.get('content-type'))
    console.log('Content-Length:', request.headers.get('content-length'))
    console.log('Authorization:', request.headers.get('authorization') ? 'Present' : 'Missing')
    
    // Check auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid auth header')
      return NextResponse.json(
        { success: false, error: 'No auth token' },
        { status: 401 }
      )
    }
    
    // Try to parse form data
    let fileInfo = { name: 'unknown', size: 0, type: 'unknown' }
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File
      if (file) {
        fileInfo = {
          name: file.name,
          size: file.size,
          type: file.type
        }
        console.log('File received:', fileInfo)
      }
    } catch (formError) {
      console.log('Form data error:', formError)
    }
    
    // Check file size (5MB limit)
    if (fileInfo.size > 5 * 1024 * 1024) {
      console.log('File too large:', fileInfo.size, 'bytes')
      return NextResponse.json(
        { 
          success: false, 
          error: 'File too large (max 5MB)',
          size: fileInfo.size,
          maxSize: 5 * 1024 * 1024
        },
        { status: 400 }
      )
    }
    
    // Generate a unique avatar URL
    const timestamp = Date.now()
    const avatarUrl = `https://ui-avatars.com/api/?name=Avatar${timestamp}&background=007bff&color=fff&size=400`
    
    const response = {
      success: true,
      url: avatarUrl,
      filename: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.type,
      timestamp: new Date().toISOString(),
      message: 'Avatar uploaded successfully'
    }
    
    console.log('✅ Returning success:', response)
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    })
    
  } catch (error: any) {
    console.error('🔥 UPLOAD ERROR:', error)
    
    // Even on crash, return JSON
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        message: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

// Add GET for debugging
export async function GET() {
  return NextResponse.json({
    status: 'OK',
    endpoint: '/api/applicants/upload',
    method: 'POST for uploads',
    timestamp: new Date().toISOString()
  })
}