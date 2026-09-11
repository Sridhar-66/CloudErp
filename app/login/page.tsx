'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const cleanEmail = email.trim().toLowerCase()
    console.log(`[Supabase Auth] Attempting sign-in with password for: ${cleanEmail}`)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (signInError) {
      console.error(`[Supabase Auth] Password sign-in failed:`, signInError.message)
      setError(signInError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const userEmail = (data.user.email || cleanEmail).toLowerCase()
      console.log(`[Supabase Auth] User authenticated successfully: ID=${data.user.id}, Email=${userEmail}. Navigating to dashboard...`)
      router.replace('/dashboard')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-wordmark">COLLEGE ERP</div>

        <h1 className="auth-heading">Sign in</h1>
        <p className="auth-sub">Enter your credentials to access the portal.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@college.edu"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', textAlign: 'center' }}>
          Accounts are provisioned by your IT administrator.
        </p>
      </div>
    </div>
  )
}
