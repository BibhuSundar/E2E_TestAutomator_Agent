import React, { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'

export default function ConfigurePage() {
  const { user } = useAuth()
  const [llm, setLlm] = useState('openai')
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <DashboardLayout title="Configure">
      <div style={styles.root}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>⚙️ System Configuration</h3>
          <p style={styles.cardDesc}>Configure your Test Automator environment settings.</p>

          <div style={styles.section}>
            <label style={styles.label}>Default LLM Provider</label>
            <div style={styles.toggle}>
              {['openai', 'ollama'].map(p => (
                <button
                  key={p}
                  style={{
                    ...styles.toggleBtn,
                    background: llm === p ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : '#f5f3ff',
                    color: llm === p ? '#fff' : '#7c3aed',
                  }}
                  onClick={() => setLlm(p)}
                >
                  {p === 'openai' ? '🤖 OpenAI GPT-4o' : '🦙 Ollama (Local)'}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>OpenAI API Key</label>
            <input style={styles.input} type="password" placeholder="sk-••••••••" />
            <p style={styles.hint}>Configure in backend <code>.env</code> file for security</p>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Ollama Base URL</label>
            <input style={styles.input} defaultValue="http://localhost:11434" />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Ollama Model</label>
            <input style={styles.input} defaultValue="llama3" />
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
      </div>
    </DashboardLayout>
  )
}

const styles = {
  root: { maxWidth: '680px' },
  card: { background: '#fff', borderRadius: '16px', padding: '28px', border: '1px solid #ede9fe', boxShadow: '0 2px 12px rgba(124,58,237,0.06)' },
  cardTitle: { fontSize: '1.2rem', fontWeight: 700, color: '#4c1d95', marginBottom: '6px' },
  cardDesc: { color: '#6b7280', fontSize: '0.9rem', marginBottom: '24px' },
  section: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '8px' },
  toggle: { display: 'flex', gap: '10px' },
  toggleBtn: { padding: '9px 18px', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', border: 'none', cursor: 'pointer' },
  input: { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #e9d5ff', background: '#faf5ff', fontSize: '0.9rem', outline: 'none', color: '#1f2937' },
  hint: { fontSize: '0.78rem', color: '#9ca3af', marginTop: '6px' },
  adminNote: { padding: '12px 16px', borderRadius: '10px', background: 'rgba(124,58,237,0.05)', border: '1px dashed rgba(124,58,237,0.2)', color: '#7c3aed', fontSize: '0.88rem' },
  saveBtn: { width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', cursor: 'pointer', marginTop: '8px', boxShadow: '0 4px 15px rgba(124,58,237,0.3)' },
}
