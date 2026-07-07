import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
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

        <h1 style={styles.title}>Welcome Back</h1>
        <p style={styles.sub}>Sign in to Test Automator</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
              onFocus={e => e.currentTarget.style.borderColor = '#7c3aed'}
              onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              onFocus={e => e.currentTarget.style.borderColor = '#7c3aed'}
              onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* Forgot password */}
          <div style={styles.forgotRow}>
            <Link to="/forgot-password" style={styles.forgotLink}>
              Forgot Password?
            </Link>
          </div>

          <button
            style={{ ...styles.signInBtn, opacity: loading ? 0.75 : 1 }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={styles.registerRow}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.registerLink}>Sign Up</Link>
        </p>

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
    fontSize: '1.45rem',
    fontWeight: 800,
    color: '#111827',
    margin: '0 0 4px',
    textAlign: 'center',
  },
  sub: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '0 0 24px',
    textAlign: 'center',
  },
  errorBox: {
    width: '100%',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '0.85rem',
    marginBottom: '16px',
    boxSizing: 'border-box',
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
  forgotRow: {
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '18px',
    marginTop: '-6px',
  },
  forgotLink: {
    fontSize: '0.8rem',
    color: '#7c3aed',
    fontWeight: 500,
    textDecoration: 'none',
  },
  signInBtn: {
    width: '100%',
    padding: '11px',
    borderRadius: '8px',
    border: 'none',
    background: '#5b21b6',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.15s',
    letterSpacing: '0.2px',
  },
  registerRow: {
    marginTop: '20px',
    fontSize: '0.84rem',
    color: '#6b7280',
    textAlign: 'center',
  },
  registerLink: {
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
