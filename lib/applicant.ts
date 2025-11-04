'use client'

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(url, anon)

/* ---------- Auth Functions ---------- */
export async function signUp({ email, password, phone }: {
  email: string; password: string; phone?: string
}) {
  const { error } = await supabase.auth.signUp({
    email, password, options: { data: phone ? { phone } : {} }
  })
  if (error) throw error

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { requiresEmailConfirmation: true as const }

  const { error: pErr } = await supabase.from('profiles').insert({
    id: user.id, email, phone, role: 'applicant'
  })
  if (pErr) throw pErr
  return { ok: true as const }
}

export async function signIn({ email, password }: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/* ---------- Application Functions ---------- */
export async function listActiveJobs() {
  try {
    const { data, error } = await supabase
      .from('job_postings')
      .select('id, job_title, department, location, job_description, status')
      .eq('status', 'active')
      .order('date_posted', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching active jobs:', error)
    throw error
  }
}

export async function submitApplication({ job_id, file, comment }: {
  job_id: string;
  file: File;
  comment: string
}) {
  try {
    // Get current user with better error handling
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Auth error:', authError)
      throw new Error('Authentication failed. Please sign in again.')
    }
    
    if (!user) {
      throw new Error('Not authenticated. Please sign in to submit an application.')
    }

    console.log('User authenticated:', user.id)

    // Upload PDF file
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${job_id}-${Date.now()}.${fileExt}`
    const filePath = `applications/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('applications')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`File upload failed: ${uploadError.message}`)
    }

    // Create application record
    const { data, error } = await supabase
      .from('applications')
      .insert({
        job_id,
        applicant_id: user.id,
        pdf_path: filePath,
        comment: comment || null
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }
    
    return data.id
  } catch (error) {
    console.error('Error submitting application:', error)
    throw error
  }
}

export async function listMyApplications() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) throw authError
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        pdf_path,
        comment,
        submitted_at,
        job_postings!inner(
          job_title,
          status
        )
      `)
      .eq('applicant_id', user.id)
      .order('submitted_at', { ascending: false })

    if (error) throw error

    // Transform the data - job_postings is returned as an object, not an array
    return (data || []).map((app: any) => {
      return {
        id: app.id,
        job_id: app.job_id,
        job_title: app.job_postings?.job_title || 'Unknown Job',
        job_status: app.job_postings?.status || 'unknown',
        pdf_path: app.pdf_path,
        comment: app.comment || '',
        submitted_at: app.submitted_at
      }
    })
  } catch (error) {
    console.error('Error fetching applications:', error)
    throw error
  }
}

export async function getSignedUrl(filePath: string) {
  try {
    const { data, error } = await supabase.storage
      .from('applications')
      .createSignedUrl(filePath, 60 * 60) // 1 hour expiry

    if (error) throw error
    return data.signedUrl
  } catch (error) {
    console.error('Error generating signed URL:', error)
    throw error
  }
}