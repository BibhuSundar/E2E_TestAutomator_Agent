import React, { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // Simulate sending — wire up real email service when ready
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <>
      <div style={styles.banner}>
        <div style={styles.bannerScrollWrap}>
          <span style={styles.bannerScroll}>
            📢 Test Automator is in MVP Stage, Soon we'll get the production-ready Test Automator.
          </span>
        </div>
      </div>
      <div style={styles.root}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logoWrap}>
          <img
            src="/abbcreation-logo.jpg"
            alt="Logo"
            style={styles.logoImg}
            onError={e => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextSibling.style.display = 'flex'
            }}
          />
          <div style={{ ...styles.logoFallback, display: 'none' }}>
            <span style={styles.logoFallbackText}>TA</span>
          </div>
        </div>

        <h1 style={styles.title}>Reset Password</h1>
        <p style={styles.sub}>Enter your email to receive a reset link</p>

        {submitted ? (
          <div style={styles.successBox}>
            ✅ If that email exists, a reset link has been sent. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                onFocus={e => e.currentTarget.style.borderColor = '#7c3aed'}
                onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
              />
            </div>

            <button
              style={{ ...styles.btn, opacity: loading ? 0.75 : 1 }}
              type="submit"
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <Link to="/login" style={styles.backLink}>Back to Login</Link>

      </div>
    </div>
    </>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    width: '100%',
    background: 'radial-gradient(ellipse at 50% 0%, #7c3aed 0%, #5b21b6 28%, #4c1d95 52%, #3b0764 75%, #2e1065 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: '24px',
    boxSizing: 'border-box',
  },

  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '40px 44px 36px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  logoWrap: {
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoImg: {
    width: '64px',
    height: '64px',
    objectFit: 'contain',
    display: 'block',
  },

  logoFallback: {
    width: '64px',
    height: '64px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoFallbackText: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: '#fff',
  },

  title: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#111827',
    margin: '0 0 4px',
    textAlign: 'center',
  },

  sub: {
    fontSize: '0.85rem',
    color: '#6b7280',
    margin: '0 0 24px',
    textAlign: 'center',
  },

  successBox: {
    width: '100%',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#15803d',
    borderRadius: '8px',
    padding: '12px 14px',
    fontSize: '0.85rem',
    marginBottom: '20px',
    boxSizing: 'border-box',
    textAlign: 'center',
    lineHeight: 1.6,
  },

  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    marginBottom: '16px',
    width: '100%',
  },

  label: {
    fontSize: '0.82rem',
    fontWeight: 500,
    color: '#374151',
  },

  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1.5px solid #d1d5db',
    fontSize: '0.9rem',
    color: '#111827',
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },

  btn: {
    width: '100%',
    padding: '11px',
    borderRadius: '8px',
    border: 'none',
    background: '#5b21b6',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.2px',
    transition: 'background 0.15s',
  },

  backLink: {
    marginTop: '18px',
    fontSize: '0.84rem',
    color: '#7c3aed',
    fontWeight: 600,
    textDecoration: 'none',
  },
  banner: {
    width: '100%',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    padding: '8px 18px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 10,
  },
  bannerScrollWrap: { flex: 1, overflow: 'hidden' },
  bannerScroll: {
    display: 'inline-block',
    whiteSpace: 'nowrap',
    animation: 'scrollBanner 30s linear infinite',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#7c3aed',
  },
}
