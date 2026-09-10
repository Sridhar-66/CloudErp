'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function VerifyOtpPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('erp_otp_email')
    if (!stored) {
      router.replace('/login')
    } else {
      setEmail(stored)
    }
  }, [router])

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const cleanOtp = otp.trim()
    if (cleanOtp.length < 6 || cleanOtp.length > 8) {
      setError('Please enter a valid 6 to 8-digit verification code.')
      setLoading(false)
      return
    }

    console.log(`[Supabase Auth] Verifying OTP token (${cleanOtp.length} digits) for: ${email}`)

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: cleanOtp,
      type: 'email',
    })

    if (verifyError) {
      console.error(`[Supabase Auth] OTP verification failed:`, verifyError.message)
      setError(verifyError.message)
      setLoading(false)
      return
    }

    console.log(`[Supabase Auth] OTP verified successfully. Navigating to /dashboard...`)
    sessionStorage.removeItem('erp_otp_email')
    if (verifyData.session) {
      await supabase.auth.setSession(verifyData.session)
    }
    router.refresh()
    router.push('/dashboard')
  }

  async function handleResend() {
    setError(null)
    console.log(`[Supabase Auth] Resending OTP code to: ${email}`)
    const { error: resendError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    if (resendError) {
      console.error(`[Supabase Auth] Resend OTP failed:`, resendError.message)
      setError(`Failed to resend code: ${resendError.message}`)
    } else {
      console.log(`[Supabase Auth] Resend OTP succeeded for: ${email}`)
      setError('A new verification code has been sent to your email.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-wordmark">COLLEGE ERP</div>

        <h1 className="auth-heading">Verify identity</h1>
        <p className="auth-sub">
          Enter the verification code sent to <strong>{email}</strong> below to complete sign-in.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label className="form-label" htmlFor="otp">Verification code (6-8 digits)</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6,8}"
              maxLength={8}
              className="form-input"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456 or 12345678"
              required
              autoComplete="one-time-code"
              style={{ letterSpacing: '0.2em', fontSize: 'var(--text-lg)' }}
            />
          </div>

          <button
            id="otp-submit"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Verifying…' : 'Verify & sign in'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            id="otp-resend"
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResend}
          >
            Resend code
          </button>
        </div>
      </div>
    </div>
  )
}
