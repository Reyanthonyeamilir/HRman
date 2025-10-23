'use client'

import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(url, anon)

/* ---------- Auth (yours) ---------- */
export async function signUp({ email, password, phone }:{
  email:string; password:string; phone?:string
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

export async function signIn({ email, password }:{ email:string; password:string }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}
