import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLES = ['QA Analyst', 'QA Lead', 'QA Manager']

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'QA Analyst',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      // derive username from email prefix
      const username = form.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')
      await register({
        username,
        email: form.email,
        full_name: form.full_name,
        password: form.password,
        role: form.role,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const focusStyle  = (e) => e.currentTarget.style.borderColor = '#7c3aed'
  const blurStyle   = (e) => e.currentTarget.style.borderColor = '#d1d5db'

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

        {/* Heading */}
        <h1 style={styles.title}>Create Account</h1>
        <p style={styles.sub}>Join Test Automator</p>

        {/* Messages */}
        {error   && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>Account created! Redirecting…</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>

          <div style={styles.field}>
            <label style={styles.label}>Full Name</label>
            <input
              style={styles.input}
              type="text"
              value={form.full_name}
              onChange={update('full_name')}
              required
              autoFocus
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={form.email}
              onChange={update('email')}
              required
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Role</label>
            <select
              style={{ ...styles.input, ...styles.select }}
              value={form.role}
              onChange={update('role')}
              onFocus={focusStyle}
              onBlur={blurStyle}
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={form.password}
              onChange={update('password')}
              required
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <input
              style={styles.input}
              type="password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              required
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          <button
            style={{ ...styles.signUpBtn, opacity: loading || success ? 0.75 : 1 }}
            type="submit"
            disabled={loading || success}
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        {/* Sign in link */}
        <p style={styles.signinRow}>
          Already have an account?{' '}
          <Link to="/login" style={styles.signinLink}>Sign In</Link>
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
    padding: '36px 44px 32px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  logoWrap: {
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoImg: {
    width: '60px',
    height: '60px',
    objectFit: 'contain',
    display: 'block',
  },

  logoFallback: {
    width: '60px',
    height: '60px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoFallbackText: {
    fontSize: '1.4rem',
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
    margin: '0 0 20px',
    textAlign: 'center',
  },

  errorBox: {
    width: '100%',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '0.83rem',
    marginBottom: '14px',
    boxSizing: 'border-box',
  },

  successBox: {
    width: '100%',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#16a34a',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '0.83rem',
    marginBottom: '14px',
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
    marginBottom: '14px',
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
    fontSize: '0.88rem',
    color: '#111827',
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },

  select: {
    appearance: 'auto',
    cursor: 'pointer',
  },

  signUpBtn: {
    width: '100%',
    padding: '11px',
    borderRadius: '8px',
    border: 'none',
    background: '#5b21b6',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '4px',
    letterSpacing: '0.2px',
    transition: 'background 0.15s',
  },

  signinRow: {
    marginTop: '18px',
    fontSize: '0.84rem',
    color: '#6b7280',
    textAlign: 'center',
  },

  signinLink: {
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
