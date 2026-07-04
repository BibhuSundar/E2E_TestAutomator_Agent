import React, { useState } from 'react'
import { agentAPI } from '../api/client'

export default function AgentPanel({ agentId, agentName, description, placeholder }) {
  const [task, setTask] = useState('')
  const [context, setContext] = useState('')
  const [llmProvider, setLlmProvider] = useState('openai')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showContext, setShowContext] = useState(false)

  const handleRun = async () => {
    if (!task.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await agentAPI.run(agentId, task, context || null, llmProvider)
      setResult(data.result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Agent execution failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.root}>
      {/* Agent header */}
      <div style={styles.agentHeader}>
        <div>
          <h2 style={styles.agentName}>{agentName} Agent</h2>
          <p style={styles.agentDesc}>{description}</p>
        </div>
        <div style={styles.statusPill}>
          <span style={styles.statusDot} />
          Ready
        </div>
      </div>

      {/* LLM selector */}
      <div style={styles.row}>
        <label style={styles.label}>LLM Provider</label>
        <div style={styles.llmGroup}>
          {['openai', 'groq', 'ollama'].map(p => (
            <button
              key={p}
              style={{
                ...styles.llmBtn,
                background: llmProvider === p ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(124,58,237,0.08)',
                color: llmProvider === p ? '#fff' : '#7c3aed',
                border: llmProvider === p ? 'none' : '1px solid rgba(124,58,237,0.2)',
              }}
              onClick={() => setLlmProvider(p)}
            >
              {p === 'openai' ? '🤖 OpenAI GPT-4o' : p === 'groq' ? '⚡ Groq' : '🦙 Ollama'}
            </button>
          ))}
        </div>
      </div>

      {/* Task input */}
      <div style={styles.inputGroup}>
        <label style={styles.label}>Task / Prompt</label>
        <textarea
          style={styles.textarea}
          rows={4}
          placeholder={placeholder || `Describe what you want the ${agentName} agent to do…`}
          value={task}
          onChange={e => setTask(e.target.value)}
        />
      </div>

      {/* Optional context */}
      <div>
        <button style={styles.contextToggle} onClick={() => setShowContext(v => !v)}>
          {showContext ? '▾' : '▸'} Additional Context (optional)
        </button>
        {showContext && (
          <textarea
            style={{ ...styles.textarea, marginTop: '8px', minHeight: '80px' }}
            placeholder="Paste any relevant context, requirements, or prior output here…"
            value={context}
            onChange={e => setContext(e.target.value)}
          />
        )}
      </div>

      {/* Run button */}
      <button
        style={{ ...styles.runBtn, opacity: loading || !task.trim() ? 0.6 : 1 }}
        onClick={handleRun}
        disabled={loading || !task.trim()}
      >
        {loading ? (
          <span style={styles.spinner}>⟳</span>
        ) : null}
        {loading ? ' Running agent…' : `▶  Run ${agentName} Agent`}
      </button>

      {/* Error */}
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Result */}
      {result && (
        <div style={styles.resultBox}>
          <div style={styles.resultHeader}>
            <span style={styles.resultLabel}>✅ Agent Output</span>
            <button style={styles.copyBtn} onClick={() => navigator.clipboard.writeText(result)}>Copy</button>
          </div>
          <pre style={styles.resultText}>{result}</pre>
        </div>
      )}
    </div>
  )
}

const styles = {
  root: {
    display: 'flex', flexDirection: 'column', gap: '20px',
    background: '#fff', borderRadius: '16px', padding: '28px',
    border: '1px solid #ede9fe',
    boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
  },
  agentHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' },
  agentName: { fontSize: '1.3rem', fontWeight: 700, color: '#4c1d95', marginBottom: '4px' },
  agentDesc: { color: '#6b7280', fontSize: '0.9rem' },
  statusPill: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
    background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)',
  },
  statusDot: { width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' },
  row: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '0.85rem', fontWeight: 600, color: '#374151' },
  llmGroup: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  llmBtn: {
    padding: '8px 18px', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  textarea: {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: '1.5px solid #e9d5ff', background: '#faf5ff',
    fontSize: '0.9rem', resize: 'vertical', outline: 'none',
    color: '#1f2937', fontFamily: 'inherit', lineHeight: 1.6,
    transition: 'border-color 0.2s',
  },
  contextToggle: {
    background: 'none', border: 'none', color: '#7c3aed',
    fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: '0',
  },
  runBtn: {
    padding: '13px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '1rem',
    border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    boxShadow: '0 4px 15px rgba(124,58,237,0.3)',
  },
  spinner: { display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '1.1rem' },
  errorBox: {
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#dc2626', borderRadius: '10px', padding: '12px 16px', fontSize: '0.9rem',
  },
  resultBox: {
    background: '#faf5ff', border: '1.5px solid #e9d5ff',
    borderRadius: '12px', overflow: 'hidden',
  },
  resultHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px', borderBottom: '1px solid #e9d5ff',
    background: 'rgba(124,58,237,0.05)',
  },
  resultLabel: { fontSize: '0.85rem', fontWeight: 700, color: '#7c3aed' },
  copyBtn: {
    padding: '4px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
    background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
    color: '#7c3aed', cursor: 'pointer',
  },
  resultText: {
    padding: '16px', fontSize: '0.88rem', lineHeight: 1.7,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#1f2937',
    fontFamily: "'Inter', monospace", maxHeight: '500px', overflowY: 'auto',
  },
}
