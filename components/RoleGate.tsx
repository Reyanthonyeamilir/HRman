'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Props = {
  children: React.ReactNode
  allow: Array<'applicant' | 'hr' | 'super_admin'>
}

export default function RoleGate({ children, allow }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [ok, setOk] = useState<null | boolean>(null)

  useEffect(() => {
    (async () => {
      // must be logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`)
        return
      }
      // fetch role
      const { data: profile, error } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (error) {
        router.replace('/login')
        return
      }
      setOk(allow.includes(profile.role))
      if (!allow.includes(profile.role)) {
        // optional: send to their own dashboard if they hit a forbidden page
        const target =
          profile.role === 'super_admin' ? '/admin/dashboard' :
          profile.role === 'hr'         ? '/hr/dashboard' :
                                          '/applicant/dashboard'
        router.replace(target)
      }
    })()
  }, [allow, pathname, router])

  if (ok === null) {
    return (
      <div className="grid min-h-dvh place-items-center text-white bg-[url('/auth-bg.jpg')] bg-cover bg-center">
        <div className="rounded-xl bg-black/50 px-4 py-3">Checking access…</div>
      </div>
    )
  }

  return ok ? <>{children}</> : null
}
