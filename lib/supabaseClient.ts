// lib/supabaseClient.ts
'use client'

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Enhanced Supabase client configuration
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: process.env.NODE_ENV === 'development'
  },
  global: {
    headers: {
      'X-Client-Info': 'nextjs-auth'
    }
  }
})

/* ---------------- Auth ---------------- */
export async function signUp({ email, password, phone }: {
  email: string; password: string; phone?: string
}) {
  try {
    console.log('🔄 Starting sign up process for:', email)
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(), 
      password, 
      options: { 
        data: phone ? { phone } : {},
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`
      }
    })
    
    if (authError) {
      console.error('❌ Auth error during sign up:', authError)
      throw new Error(authError.message)
    }

    // If email confirmation is required, return early
    if (authData.user?.identities?.length === 0) {
      console.log('📧 Email confirmation required')
      return { requiresEmailConfirmation: true as const }
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned')
    }

    console.log('✅ Auth user created:', authData.user.id)

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id, 
        email: email.toLowerCase().trim(), 
        phone, 
        role: 'applicant'
      })
      .select()
      .single()

    if (profileError) {
      console.error('❌ Profile creation error:', profileError)
      // Don't throw here - user account was created successfully
      // We'll handle profile creation on first login
    } else {
      console.log('✅ Profile created successfully')
    }

    return { ok: true as const, user: authData.user }
  } catch (error) {
    console.error('❌ Sign up error:', error)
    throw error
  }
}

export async function signIn({ email, password }: { email: string; password: string }) {
  try {
    console.log('🔄 Attempting sign in for:', email)
    
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: email.toLowerCase().trim(), 
      password 
    })
    
    if (error) {
      console.error('❌ Auth sign in error:', error)
      throw new Error(getAuthErrorMessage(error))
    }
    
    if (!data.user) {
      throw new Error('No user data returned')
    }
    
    console.log('✅ Sign in successful, user:', data.user.email)
    
    // Check and create profile if needed
    await ensureUserProfile(data.user)
    
    return { user: data.user, error: null }
  } catch (error: any) {
    console.error('❌ Sign in error:', error)
    return { user: null, error: error.message || 'Sign in failed' }
  }
}

// Helper function to ensure user has a profile
async function ensureUserProfile(user: any) {
  try {
    console.log('🔍 Checking profile for user:', user.id)
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // Profile doesn't exist - create one
        console.log('📝 Creating new profile for user...')
        
        // Auto-assign role based on email
        let role = 'applicant'
        const userEmail = user.email?.toLowerCase() || ''
        
        if (userEmail.includes('admin') || userEmail.includes('super')) {
          role = 'super_admin'
        } else if (userEmail.includes('hr')) {
          role = 'hr'
        }
        
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: role,
            created_at: new Date().toISOString()
          })

        if (createError) {
          console.error('❌ Failed to create profile:', createError)
        } else {
          console.log('✅ Profile created with role:', role)
        }
      } else {
        console.error('❌ Profile fetch error:', profileError)
      }
    } else {
      console.log('✅ Profile exists:', profile.role)
    }
  } catch (error) {
    console.error('❌ Error ensuring user profile:', error)
  }
}

// Helper function to get user-friendly auth error messages
function getAuthErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred'
  
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password. Please check your credentials and try again.'
    case 'Email not confirmed':
      return 'Please confirm your email address before signing in.'
    case 'User already registered':
      return 'An account with this email already exists.'
    case 'Too many requests':
      return 'Too many login attempts. Please try again later.'
    default:
      return error.message || 'Authentication failed. Please try again.'
  }
}

// Helper function to get current session
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('❌ Get session error:', error)
      throw error
    }
    return session
  } catch (error) {
    console.error('❌ Error getting session:', error)
    return null
  }
}

// Helper function to get current user with profile
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('❌ Auth getUser error:', error)
      return null
    }
    
    if (!user) {
      console.log('🔐 No authenticated user')
      return null
    }

    console.log('🔍 Fetching profile for user:', user.id)

    // Get user profile with better error handling
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Handle case where profile doesn't exist
    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // No profile found - create one
        console.log('📝 No profile found for user, creating one...')
        await ensureUserProfile(user)
        
        // Try to fetch profile again
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          
        return { ...user, profile: newProfile }
      } else {
        console.error('❌ Profile fetch error:', profileError)
        return { ...user, profile: null }
      }
    }

    console.log('✅ Profile found:', profile?.role)
    return { ...user, profile }
  } catch (error) {
    console.error('❌ Error in getCurrentUser:', error)
    return null
  }
}

// Helper function to create or update user profile
export async function createOrUpdateProfile(userId: string, email: string, role: string = 'applicant') {
  try {
    console.log('🆕 Creating/updating profile for:', email, 'with role:', role)
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email.toLowerCase().trim(),
        role: role,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Profile upsert error:', error)
      throw error
    }

    console.log('✅ Profile created/updated:', profile)
    return profile
  } catch (error) {
    console.error('❌ Error in createOrUpdateProfile:', error)
    throw error
  }
}

// Sign out function
export async function signOut() {
  try {
    console.log('🚪 Signing out...')
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('❌ Sign out error:', error)
      throw error
    }
    console.log('✅ Signed out successfully')
  } catch (error) {
    console.error('❌ Error during sign out:', error)
    throw error
  }
}

// Reset password function
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
      }
    )
    
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('❌ Reset password error:', error)
    throw error
  }
}

// Update password function
export async function updatePassword(newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('❌ Update password error:', error)
    throw error
  }
}

/* ---------------- Applicant APIs ---------------- */
export async function listActiveJobs() {
  try {
    console.log('📋 Fetching active jobs...')
    
    const { data, error } = await supabase
      .from('job_postings')
      .select('id, job_title, department, location, job_description, date_posted, status, image_path')
      .eq('status', 'active')
      .order('date_posted', { ascending: false })
    
    if (error) {
      console.error('❌ List active jobs error:', error)
      throw error
    }
    
    console.log(`✅ Found ${data?.length || 0} active jobs`)
    return data || []
  } catch (error) {
    console.error('❌ List active jobs error:', error)
    throw error
  }
}

export async function submitApplication({
  job_id,
  file,
  comment
}: {
  job_id: number
  file: File
  comment: string
}) {
  try {
    console.log('📤 Submitting application for job:', job_id)
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('Not authenticated')

    // Validate file type and size
    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are allowed')
    }
    
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size must be less than 10MB')
    }

    // Create application record
    const { data: app, error: insertErr } = await supabase
      .from('applications')
      .insert({ 
        job_id, 
        applicant_id: user.id, 
        pdf_path: 'placeholder', 
        comment,
        status: 'for_review'
      })
      .select('*')
      .single()
    
    if (insertErr) throw insertErr

    // Upload file to storage
    const path = `applications/${app.id}/${Date.now()}_${file.name}`
    const { error: uploadErr } = await supabase.storage
      .from('attachments')
      .upload(path, file, { 
        upsert: false,
        cacheControl: '3600'
      })
    
    if (uploadErr) throw uploadErr

    // Update application with actual file path
    const { error: updErr } = await supabase
      .from('applications')
      .update({ pdf_path: path })
      .eq('id', app.id)
    
    if (updErr) throw updErr

    console.log('✅ Application submitted successfully, ID:', app.id)
    return app.id as number
  } catch (error) {
    console.error('❌ Submit application error:', error)
    throw error
  }
}

export async function listMyApplications() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('Not authenticated')

    console.log('📋 Fetching applications for user:', user.id)

    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        pdf_path,
        comment,
        status,
        submitted_at,
        job_postings (
          id,
          job_title,
          status
        )
      `)
      .eq('applicant_id', user.id)
      .order('submitted_at', { ascending: false })
    
    if (error) throw error

    const applications = (data ?? []).map((row: any) => ({
      id: row.id,
      job_id: row.job_id,
      job_title: row.job_postings?.job_title ?? '—',
      job_status: row.job_postings?.status ?? '—',
      application_status: row.status || 'for_review',
      pdf_path: row.pdf_path,
      comment: row.comment ?? '',
      submitted_at: row.submitted_at,
    }))

    console.log(`✅ Found ${applications.length} applications`)
    return applications
  } catch (error) {
    console.error('❌ List applications error:', error)
    throw error
  }
}

export async function getSignedUrl(path: string) {
  try {
    console.log('🔗 Generating signed URL for:', path)
    
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(path, 60 * 10) // 10 minutes
    
    if (error) throw error
    
    console.log('✅ Signed URL generated')
    return data.signedUrl
  } catch (error) {
    console.error('❌ Get signed URL error:', error)
    throw error
  }
}

// Get application status for tracking
export async function getApplicationStatus(applicationId: string) {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        comment,
        submitted_at,
        job_postings (
          job_title,
          department,
          location
        )
      `)
      .eq('id', applicationId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('❌ Get application status error:', error)
    throw error
  }
}

// Health check function
export async function healthCheck() {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error) throw error
    return { healthy: true }
  } catch (error) {
    console.error('❌ Health check failed:', error)
    return { healthy: false, error }
  }
}