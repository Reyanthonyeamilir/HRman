// app/api/chat/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  console.log('=== Chat API called ===')
  
  try {
    // Check if API key exists
    const apiKey = process.env.GEMINI_API_KEY
    console.log('API Key exists:', !!apiKey)
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables')
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please check your .env.local file.' },
        { status: 500 }
      )
    }

    // Parse request body
    const body = await req.json()
    console.log('Request body received')

    const { messages, context } = body
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      )
    }

    // Initialize Supabase client with proper cookie handling
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Handle cookie setting error
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Handle cookie removal error
            }
          },
        },
      }
    )

    // Try to get user from Supabase
    let userProfile = null
    let applicationData = null
    let jobData = null
    let user = null
    
    try {
      // Get the current user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      user = authUser
      
      if (user) {
        console.log('User found:', user.email)
        
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        userProfile = profile
        console.log('User profile:', profile?.role)

        // If user is an applicant, get their applications
        if (profile?.role === 'applicant') {
          const { data: applications } = await supabase
            .from('applications')
            .select(`
              *,
              job_postings (
                job_title,
                department,
                status
              )
            `)
            .eq('applicant_id', user.id)
            .order('submitted_at', { ascending: false })
            .limit(5)
          
          applicationData = applications
          console.log('Found applications:', applications?.length)
        }

        // If user is HR, get recent job postings
        if (profile?.role === 'hr' || profile?.role === 'super_admin') {
          const { data: jobs } = await supabase
            .from('job_postings')
            .select('*')
            .order('date_posted', { ascending: false })
            .limit(5)
          
          jobData = jobs
          console.log('Found job postings:', jobs?.length)
        }
      } else {
        console.log('No user found')
      }
    } catch (dbError) {
      console.log('Database connection error (non-critical):', dbError)
      // Continue without database context if there's an error
    }

    // Initialize Gemini
    console.log('Initializing Gemini...')
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    // Get the last user message
    const lastMessage = messages[messages.length - 1]
    
    // Build a rich context with database information if available
    let databaseContext = ''
    
    if (userProfile) {
      databaseContext += `
Current User Information:
- Name: ${userProfile.first_name || 'Not provided'} ${userProfile.last_name || ''}
- Role: ${userProfile.role}
- Email: ${userProfile.email}
`
    }

    if (applicationData && applicationData.length > 0) {
      databaseContext += `\nRecent Applications:
${applicationData.map((app: any) => 
  `- ${app.job_postings?.job_title || 'Unknown Job'}: Status - ${app.status} (Submitted: ${new Date(app.submitted_at).toLocaleDateString()})`
).join('\n')}
`
    }

    if (jobData && jobData.length > 0) {
      databaseContext += `\nRecent Job Postings:
${jobData.map((job: any) => 
  `- ${job.job_title} (${job.department || 'No department'}): ${job.status}`
).join('\n')}
`
    }

    // Create a comprehensive prompt
    const prompt = `
You are a helpful HR assistant for Negros Oriental State University (NORSU). Your name is "NORSU HR Assistant".

SYSTEM INFORMATION:
- Current Date: ${new Date().toLocaleDateString()}
- Current Time: ${new Date().toLocaleTimeString()}

${databaseContext ? `USER DATABASE CONTEXT:\n${databaseContext}` : 'User is not logged in or has no relevant data.'}

${context || ''}

CONVERSATION HISTORY:
${messages.slice(0, -1).map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}

User's current question: ${lastMessage.content}

IMPORTANT GUIDELINES:
1. Be professional, friendly, and helpful
2. If asked about specific application status, reference the user's applications from the database context
3. For HR users, provide relevant job posting information when asked
4. If you don't know something, suggest contacting HR at hr@norsu.edu.ph
5. Keep responses concise but informative
6. Use the database context to personalize responses when possible
7. If the user is not logged in, provide general information and encourage them to log in for personalized help

Please provide a helpful response:`

    console.log('Sending prompt to Gemini...')

    // Generate response with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      console.log('Successfully got response from Gemini')

      // Log the interaction if user is logged in
      if (userProfile) {
        try {
          await supabase
            .from('task_logs')
            .insert({
              user_id: userProfile.id,
              user_email: userProfile.email,
              action: 'chat_interaction',
              entity_type: 'chat',
              details: {
                question: lastMessage.content,
                response_length: text.length,
                timestamp: new Date().toISOString()
              }
            })
        } catch (logError) {
          console.log('Error logging chat:', logError)
        }
      }

      return NextResponse.json({ 
        message: text,
        timestamp: new Date().toISOString()
      })

    } catch (geminiError) {
      console.error('Gemini generation error:', geminiError)
      
      // Fallback response if Gemini fails
      const fallbackResponse = `I apologize, but I'm having trouble connecting to my AI service right now. 

However, I can still help you with general information about NORSU HR. 

You can:
1. Check your dashboard for application status
2. Browse current vacancies
3. Contact HR directly at hr@norsu.edu.ph
4. Try again in a few minutes

How else can I assist you?`
      
      return NextResponse.json({ 
        message: fallbackResponse,
        timestamp: new Date().toISOString(),
        fallback: true
      })
    } finally {
      clearTimeout(timeoutId)
    }

  } catch (error) {
    console.error('=== Chat API Error ===')
    console.error('Error details:', error)
    
    let errorMessage = 'Failed to generate response'
    let statusCode = 500
    
    if (error instanceof Error) {
      errorMessage = error.message
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      // Check for specific error types
      if (error.message.includes('API key')) {
        errorMessage = 'Invalid Gemini API key. Please check your configuration.'
        statusCode = 401
      } else if (error.message.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later.'
        statusCode = 429
      } else if (error.message.includes('timeout') || error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.'
        statusCode = 504
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}