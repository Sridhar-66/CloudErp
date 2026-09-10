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
      const isDemoUser = userEmail.endsWith('@demo.com') || cleanEmail.endsWith('@demo.com')

      console.log(`[Supabase Auth] User authenticated successfully: ID=${data.user.id}, Email=${userEmail}`)
      console.log(`[Supabase Auth] 2FA Check: isDemoUser=${isDemoUser}`)

      // Skip 2FA for @demo.com accounts (demo/testing)
      if (isDemoUser) {
        console.log(`[Supabase Auth] Bypassing 2FA for demo user (${userEmail}). Navigating to dashboard...`)
        sessionStorage.removeItem('erp_otp_email')
        if (data.session) {
          await supabase.auth.setSession(data.session)
        }
        router.refresh()
        router.push('/dashboard')
        return
      }

      // Step 2: For non-demo users, 2FA is required.
      // Sign out temporary password session before sending OTP so unverified session cookies do not trigger server middleware redirect loop
      console.log(`[Supabase Auth] Standard account detected (${userEmail}). Signing out password session before OTP verification...`)
      await supabase.auth.signOut()

      console.log(`[Supabase Auth] Sending email OTP to ${cleanEmail}...`)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: false },
      })

      if (otpError) {
        console.warn('[Supabase Auth] OTP send failed:', otpError.message)
        // If OTP fails (e.g. rate limited or SMTP error), inform user
        setError(`Failed to send OTP verification code: ${otpError.message}`)
        setLoading(false)
        return
      }

      console.log(`[Supabase Auth] OTP sent successfully to ${cleanEmail}. Redirecting to /verify-otp...`)
      // Store email for OTP verification
      sessionStorage.setItem('erp_otp_email', cleanEmail)
      router.push('/verify-otp')
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
