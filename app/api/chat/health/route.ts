// app/api/chat/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Check configuration
    const status = {
      gemini: {
        configured: !!apiKey,
        keyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : null,
        validFormat: apiKey ? apiKey.startsWith('AIza') : false
      },
      supabase: {
        urlConfigured: !!supabaseUrl,
        keyConfigured: !!supabaseKey
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }

    // Determine overall status
    const isHealthy = status.gemini.configured && 
                      status.supabase.urlConfigured && 
                      status.supabase.keyConfigured

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      ...status
    }, { status: isHealthy ? 200 : 500 })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}