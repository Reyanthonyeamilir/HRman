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
    debug: false
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
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, 
      password, 
      options: { 
        data: phone ? { phone } : {},
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`
      }
    })
    
    if (authError) throw authError

    // If email confirmation is required, return early
    if (authData.user?.identities?.length === 0) {
      return { requiresEmailConfirmation: true as const }
    }

    if (!authData.user) {
      throw new Error('User creation failed')
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id, 
        email, 
        phone, 
        role: 'applicant'
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Don't throw here - user account was created successfully
    }

    return { ok: true as const, user: authData.user }
  } catch (error) {
    console.error('Sign up error:', error)
    throw error
  }
}

export async function signIn({ email, password }: { email: string; password: string }) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    })
    
    if (error) throw error
    
    // Wait for session to be fully established
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    console.log('🔐 Sign in successful, user:', data.user?.email)
    
    // Check if user has a profile, create if not
    if (data.user) {
      const currentUser = await getCurrentUser()
      if (currentUser && !currentUser.profile) {
        console.log('🆕 Auto-creating profile for user...')
        // Auto-assign role based on email
        let role = 'applicant'
        if (email.includes('admin') || email.includes('super')) {
          role = 'super_admin'
        } else if (email.includes('hr')) {
          role = 'hr'
        }
        
        await createOrUpdateProfile(data.user.id, email, role)
      }
    }
    
    return { user: data.user, error: null }
  } catch (error: any) {
    console.error('Sign in error:', error)
    return { user: null, error }
  }
}

// Helper function to get current session
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

// Helper function to get current user with profile
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Auth getUser error:', error)
      throw error
    }
    
    if (!user) {
      console.log('No authenticated user')
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
        // No profile found - this is expected for new users
        console.log('📝 No profile found for user, will create one')
        return { ...user, profile: null }
      } else {
        console.error('❌ Profile fetch error:', profileError)
        // For other errors, still return user but without profile
        return { ...user, profile: null }
      }
    }

    console.log('✅ Profile found:', profile)
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
        email: email,
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

/* ---------------- Applicant APIs ---------------- */
export async function listActiveJobs() {
  try {
    const { data, error } = await supabase
      .from('job_postings')
      .select('id, job_title, department, location, job_description, date_posted, status, image_path')
      .eq('status', 'active')
      .order('date_posted', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('List active jobs error:', error)
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
        comment 
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

    return app.id as number
  } catch (error) {
    console.error('Submit application error:', error)
    throw error
  }
}

export async function listMyApplications() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        pdf_path,
        comment,
        created_at,
        job_postings (
          id,
          job_title,
          status
        )
      `)
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error

    return (data ?? []).map((row: any) => ({
      id: row.id,
      job_id: row.job_id,
      job_title: row.job_postings?.job_title ?? '—',
      job_status: row.job_postings?.status ?? '—',
      pdf_path: row.pdf_path,
      comment: row.comment ?? '',
      submitted_at: row.created_at,
    }))
  } catch (error) {
    console.error('List applications error:', error)
    throw error
  }
}

export async function getSignedUrl(path: string) {
  try {
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(path, 60 * 10)
    
    if (error) throw error
    return data.signedUrl
  } catch (error) {
    console.error('Get signed URL error:', error)
    throw error
  }
}

// Sign out function
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}