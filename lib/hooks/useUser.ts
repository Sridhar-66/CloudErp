'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Role } from '@/lib/types/database.types'

export function useUser() {
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        if (mounted) setLoading(false)
        return
      }

      // Fetch profile in parallel — we already know the user ID from the token
      const [{ data: profileData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])

      if (mounted) {
        setUser({ id: user.id, email: user.email ?? null })
        setProfile(profileData as Profile | null)
        setLoading(false)
      }
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        router.push('/login')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Redirect to login if not authenticated after loading
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return { user, profile, role: profile?.role as Role | undefined, loading, signOut }
}
