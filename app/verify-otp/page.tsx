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

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })

    if (verifyError) {
      setError(verifyError.message)
      setLoading(false)
      return
    }

    sessionStorage.removeItem('erp_otp_email')
    router.replace('/dashboard')
  }

  async function handleResend() {
    setError(null)
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    setError('A new code has been sent to your email.')
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-wordmark">COLLEGE ERP</div>

        <h1 className="auth-heading">Verify identity</h1>
        <p className="auth-sub">
          A 6-digit code was sent to <strong>{email}</strong>. Enter it below to complete sign-in.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label className="form-label" htmlFor="otp">Verification code</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className="form-input"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
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
