'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Role } from '@/lib/types/database.types'

// Single shared client instance — avoids creating a new client (and firing
// a new getUser() network call) on every component that calls useUser().
const supabase = createClient()

export function useUser() {
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    // ── Step 1: load current session once on mount ────────────────────────────
    async function loadInitialSession() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!mountedRef.current) return

        if (!authUser) {
          // Definitively no session — stop loading. Do NOT push to /login here;
          // the middleware already redirects unauthenticated requests, and
          // pushing here causes spurious logouts during navigation.
          setLoading(false)
          return
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (!mountedRef.current) return

        setUser({ id: authUser.id, email: authUser.email ?? null })
        setProfile(profileData as Profile | null)
        setLoading(false)
      } catch {
        if (mountedRef.current) setLoading(false)
      }
    }

    loadInitialSession()

    // ── Step 2: keep state in sync with auth events ───────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
        router.push('/login')
        return
      }

      // SIGNED_IN or TOKEN_REFRESHED — session payload has the user, so we
      // can update state immediately without an extra network call.
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const authUser = session.user
        setUser({ id: authUser.id, email: authUser.email ?? null })

        // Only fetch profile if we don't already have it
        if (!profile) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single()
          if (mountedRef.current) {
            setProfile(profileData as Profile | null)
          }
        }

        setLoading(false)
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return { user, profile, role: profile?.role as Role | undefined, loading, signOut }
}
