import React, { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { configAPI, userAPI } from '../api/client'

const TABS = [
  { id: 'system', label: '⚙️ System Configuration' },
  { id: 'jira',   label: '🔗 Jira Configuration' },
  { id: 'users',  label: '👥 User Management' },
]

export default function ConfigurePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('system')

  return (
    <DashboardLayout title="Configure">
      <div style={styles.root}>

        {/* Tabs */}
        <div style={styles.tabBar}>
          {TABS.map(t => (
            <button
              key={t.id}
              style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'system' && <SystemConfig user={user} />}
        {activeTab === 'jira' && <JiraConfig />}
        {activeTab === 'users' && <UserManagement />}

      </div>
    </DashboardLayout>
  )
}

/* ── System Config ── */
function SystemConfig({ user }) {
  const [llm, setLlm] = useState('openai')
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>⚙️ System Configuration</h3>
      <p style={styles.cardDesc}>Configure your Test Automator environment settings.</p>

      <div style={styles.section}>
        <label style={styles.label}>Default LLM Provider</label>
        <div style={styles.toggle}>
          {[
            { id: 'openai',     label: '🤖 OpenAI' },
            { id: 'ollama',     label: '🦙 Ollama (Local)' },
            { id: 'groq',       label: '⚡ Groq' },
            { id: 'openrouter', label: '🌐 OpenRouter' },
            { id: 'claude', label: '☁️ Claude' },
          ].map(p => (
            <button
              key={p.id}
              style={{
                ...styles.toggleBtn,
                background: llm === p.id ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : '#f5f3ff',
                color: llm === p.id ? '#fff' : '#7c3aed',
              }}
              onClick={() => setLlm(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {llm === 'openai' && (
        <div style={styles.section}>
          <label style={styles.label}>OpenAI API Key</label>
          <input style={styles.input} type="password" placeholder="sk-••••••••" />
          <p style={styles.hint}>Configure in backend <code>.env</code> file for security</p>
        </div>
      )}

      {llm === 'ollama' && (
        <>
          <div style={styles.section}>
            <label style={styles.label}>Ollama Base URL</label>
            <input style={styles.input} defaultValue="http://localhost:11434" />
          </div>
          <div style={styles.section}>
            <label style={styles.label}>Ollama Model</label>
            <input style={styles.input} defaultValue="llama3" />
          </div>
        </>
      )}

      {llm === 'groq' && (
        <div style={styles.section}>
          <label style={styles.label}>Groq API Key</label>
          <input style={styles.input} type="password" placeholder="gsk_••••••••" />
          <p style={styles.hint}>Configure in backend <code>.env</code> file for security</p>
        </div>
      )}

      {llm === 'openrouter' && (
        <div style={styles.section}>
          <label style={styles.label}>OpenRouter API Key</label>
          <input style={styles.input} type="password" placeholder="sk-or-••••••••" />
          <p style={styles.hint}>Configure in backend <code>.env</code> file for security</p>
        </div>
      )}

      {llm === 'claude' && (
        <div style={styles.section}>
          <label style={styles.label}>Claude API Key</label>
          <input style={styles.input} type="password" placeholder="sk-ant-••••••••" />
          <p style={styles.hint}>Configure in backend <code>.env</code> file for security</p>
        </div>
      )}

      <div style={styles.section}>
        <label style={styles.label}>LLM Model</label>
        <input style={styles.input} placeholder="e.g. gpt-4o, llama3, llama-3.3-70b-versatile" />
        <p style={styles.hint}>Model name to use with the selected provider</p>
      </div>

      {user?.role === 'Admin' && (
        <div style={styles.section}>
          <label style={styles.label}>Admin Settings</label>
          <div style={styles.adminNote}>Full admin configuration panel — coming in next version.</div>
        </div>
      )}

      <button style={styles.saveBtn} onClick={save}>
        {saved ? '✅ Saved!' : '💾 Save Configuration'}
      </button>
    </div>
  )
}

/* ── Jira Config ── */
function JiraConfig() {
  const [baseUrl, setBaseUrl] = useState('')
  const [email, setEmail] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [hasToken, setHasToken] = useState(false)
  const [projectKey, setProjectKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    configAPI.getJira()
      .then(data => {
        setBaseUrl(data.jira_base_url || '')
        setEmail(data.jira_email || '')
        setHasToken(data.has_token || false)
        setProjectKey(data.jira_project_key || '')
      })
      .catch(() => setError('Failed to load Jira configuration.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await configAPI.updateJira({
        jira_base_url: baseUrl,
        jira_email: email,
        jira_api_token: apiToken,
        jira_project_key: projectKey,
      })
      setSaved(true)
      setHasToken(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save Jira configuration.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.loading}>Loading configuration...</div>
      </div>
    )
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>🔗 Jira Configuration</h3>
      <p style={styles.cardDesc}>
        Configure your Jira Cloud connection. 
        <br />Get an API token at{' '}
        <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" style={styles.link}>
          Atlassian API Tokens
        </a>
      </p>

      <div style={styles.section}>
        <label style={styles.label}>Jira Base URL</label>
        <input
          style={styles.input}
          placeholder="https://your-org.atlassian.net"
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
        />
        <p style={styles.hint}>Your Atlassian domain URL (e.g. https://your-org.atlassian.net)</p>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Email Address</label>
        <input
          style={styles.input}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <p style={styles.hint}>The email address associated with your Atlassian account</p>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>API Token</label>
        <input
          style={styles.input}
          type="password"
          placeholder={hasToken ? '•••••••• (token already configured)' : 'Enter your Jira API token'}
          value={apiToken}
          onChange={e => setApiToken(e.target.value)}
        />
        <p style={styles.hint}>
          {hasToken
            ? 'A token is already configured. Enter a new one only if you want to replace it.'
            : 'Create an API token from the Atlassian dashboard and paste it here'
          }
        </p>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Jira Project Key</label>
        <input
          style={styles.input}
          placeholder="e.g. KAN"
          value={projectKey}
          onChange={e => setProjectKey(e.target.value.toUpperCase())}
        />
        <p style={styles.hint}>The project key where test plans and requirements will be uploaded (e.g. KAN, PROJ, TEST)</p>
      </div>

      {error && <div style={styles.errorBox}>⚠️ {error}</div>}

      <button
        style={{
          ...styles.saveBtn,
          opacity: saving ? 0.6 : 1,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? '⏳ Saving...' : saved ? '✅ Saved!' : '💾 Save Jira Configuration'}
      </button>
    </div>
  )
}

/* ── User Management ── */
const ROLES = ['Admin', 'QA Manager', 'QA Lead', 'QA Analyst']

function UserManagement() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', email: '', full_name: '', password: '', role: 'QA Analyst' })

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const data = await userAPI.list()
      setUsers(data)
    } catch {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleRoleChange = async (userId, role) => {
    setSavingId(userId)
    setError('')
    try {
      const updated = await userAPI.update(userId, { role })
      setUsers(prev => prev.map(u => u.id === userId ? updated : u))
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user.')
    } finally {
      setSavingId(null)
    }
  }

  const handleToggleActive = async (userId, isActive) => {
    setSavingId(userId)
    setError('')
    try {
      const updated = await userAPI.update(userId, { is_active: !isActive })
      setUsers(prev => prev.map(u => u.id === userId ? updated : u))
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user.')
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete "${username}"? This cannot be undone.`)) return
    setDeletingId(userId)
    setError('')
    try {
      await userAPI.delete(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete user.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password || !newUser.full_name) return
    setError('')
    try {
      const created = await userAPI.create(newUser)
      setUsers(prev => [...prev, created])
      setShowAdd(false)
      setNewUser({ username: '', email: '', full_name: '', password: '', role: 'QA Analyst' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user.')
    }
  }

  if (user?.role !== 'Admin') {
    return (
      <div style={styles.card}>
        <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
          🔒 Only Administrators can manage users.
        </div>
      </div>
    )
  }

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={styles.cardTitle}>👥 User Management</h3>
          <p style={styles.cardDesc}>Manage users and assign roles.</p>
        </div>
        <button
          style={{
            padding: '9px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem',
            border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            color: '#fff', cursor: 'pointer',
          }}
          onClick={() => setShowAdd(!showAdd)}
        >
          {showAdd ? '✕ Cancel' : '+ Add User'}
        </button>
      </div>

      {error && <div style={styles.errorBox}>⚠️ {error}</div>}

      {/* Add User Form */}
      {showAdd && (
        <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={styles.label}>Username</label>
              <input style={styles.input} placeholder="Username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Full Name</label>
              <input style={styles.input} placeholder="Full Name" value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Email</label>
              <input style={styles.input} type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Password</label>
              <input style={styles.input} type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Role</label>
              <select style={styles.select} value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <button
            style={{
              ...styles.saveBtn,
              marginTop: '14px',
              opacity: !newUser.username || !newUser.email || !newUser.password ? 0.5 : 1,
            }}
            disabled={!newUser.username || !newUser.email || !newUser.password}
            onClick={handleAddUser}
          >
            Create User
          </button>
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>Loading users...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '22%' }}>User</th>
                <th style={{ ...styles.th, width: '24%' }}>Email</th>
                <th style={{ ...styles.th, width: '16%' }}>Role</th>
                <th style={{ ...styles.th, width: '24%' }}>Status</th>
                <th style={{ ...styles.th, width: '14%' }}>Remove</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ ...styles.tr, opacity: u.is_active ? 1 : 0.5 }}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>@{u.username}</div>
                  </td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>
                    <select
                      style={{ ...styles.select, width: '100%', minWidth: '120px' }}
                      value={u.role}
                      disabled={savingId === u.id}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
                        background: u.is_active ? '#dcfce7' : '#fef2f2',
                        color: u.is_active ? '#166534' : '#dc2626',
                      }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        style={{
                          padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                          border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap',
                          borderColor: u.is_active ? '#fecaca' : '#bbf7d0',
                          background: u.is_active ? '#fef2f2' : '#f0fdf4',
                          color: u.is_active ? '#dc2626' : '#16a34a',
                        }}
                        disabled={savingId === u.id || u.username === 'Admin'}
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                      >
                        {savingId === u.id ? '...' : u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={{
                        padding: '5px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
                        border: '1px solid #fecaca', cursor: 'pointer',
                        background: '#fef2f2', color: '#dc2626',
                      }}
                      disabled={deletingId === u.id || u.username === 'Admin'}
                      onClick={() => handleDelete(u.id, u.full_name)}
                    >
                      {deletingId === u.id ? '...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const styles = {
  root: { maxWidth: '960px', display: 'flex', flexDirection: 'column', gap: '0' },
  tabBar: { display: 'flex', borderBottom: '1.5px solid #e5e7eb', marginBottom: '20px' },
  tab: {
    padding: '10px 22px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
    background: 'none', border: 'none', color: '#6b7280',
    borderBottom: '2px solid transparent', marginBottom: '-1.5px',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: { color: '#7c3aed', fontWeight: 600, borderBottom: '2px solid #7c3aed' },
  card: { background: '#fff', borderRadius: '16px', padding: '28px', border: '1px solid #ede9fe', boxShadow: '0 2px 12px rgba(124,58,237,0.06)' },
  cardTitle: { fontSize: '1.2rem', fontWeight: 700, color: '#4c1d95', marginBottom: '6px' },
  cardDesc: { color: '#6b7280', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.6 },
  link: { color: '#7c3aed', fontWeight: 600 },
  section: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '8px' },
  toggle: { display: 'flex', gap: '10px' },
  toggleBtn: { padding: '9px 18px', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', border: 'none', cursor: 'pointer' },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: '10px',
    border: '1.5px solid #e9d5ff', background: '#faf5ff', fontSize: '0.9rem',
    outline: 'none', color: '#1f2937', boxSizing: 'border-box',
  },
  select: {
    width: '100%', padding: '11px 14px', borderRadius: '10px',
    border: '1.5px solid #e9d5ff', background: '#faf5ff', fontSize: '0.9rem',
    outline: 'none', color: '#1f2937', boxSizing: 'border-box', cursor: 'pointer',
  },
  hint: { fontSize: '0.78rem', color: '#9ca3af', marginTop: '6px', lineHeight: 1.5 },
  adminNote: {
    padding: '12px 16px', borderRadius: '10px', background: 'rgba(124,58,237,0.05)',
    border: '1px dashed rgba(124,58,237,0.2)', color: '#7c3aed', fontSize: '0.88rem',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#dc2626', borderRadius: '8px', padding: '10px 14px', fontSize: '0.875rem', marginBottom: '16px',
  },
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem',
  },
  th: {
    textAlign: 'left', padding: '10px 12px', fontSize: '0.78rem', fontWeight: 700,
    color: '#6b7280', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb',
  },
  td: {
    padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle',
  },
  tr: {
    transition: 'background 0.1s',
  },
  loading: { textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', padding: '20px' },
  saveBtn: {
    width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem',
    border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff', cursor: 'pointer', marginTop: '8px',
    boxShadow: '0 4px 15px rgba(124,58,237,0.3)',
  },
}
