import React, { useState, useRef, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { supportAPI } from '../api/client'

const FAQS = [
  { q: 'How do I configure LLM providers?', a: 'Navigate to Configure → System Configuration, select a provider, and enter its API key.' },
  { q: 'What are the demo credentials?', a: 'admin@automator.com / admin123 (Admin role).' },
  { q: 'How do I add a user?', a: 'Go to Configure → User Management, click "+ Add User".' },
  { q: 'How do I connect Jira?', a: 'Go to Configure → Jira Configuration, enter URL, email, and API token.' },
  { q: 'What LLM providers are supported?', a: 'Groq, OpenAI, Ollama, OpenRouter, and Claude.' },
  { q: 'How does Approve/Reject work?', a: 'Click "Approve" to save output to the output/ folder; "Reject" discards it.' },
]

export default function SupportPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I\'m Erica, your support assistant. Ask me anything about the Test Automator application.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const ask = async (question) => {
    if (!question || loading) return
    setInput('')
    setSources(null)
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setLoading(true)
    try {
      const res = await supportAPI.chat(question)
      setMessages(prev => [...prev, { role: 'assistant', text: res.answer }])
      if (res.sources?.length) setSources(res.sources)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => ask(input.trim())

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <DashboardLayout title="Support">
      <div style={styles.root}>
        <div style={styles.hero}>
          <div style={styles.heroIcon}>💬</div>
          <h2 style={styles.heroTitle}>Erica - Support Assistant</h2>
          <p style={styles.heroSub}>Ask questions about the Test Automator platform — powered by RAG with Nomic Embeddings + ChromaDB.</p>
        </div>

        <div style={styles.layout}>
          <div style={styles.chatColumn}>
            <div style={styles.chatContainer}>
              <div style={styles.chatBox}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ ...styles.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={msg.role === 'user' ? styles.msgUser : styles.msgBot}>
                      <div style={msg.role === 'user' ? styles.msgLabelUser : styles.msgLabelBot}>
                        {msg.role === 'user' ? 'You' : 'Erica'}
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.text}</div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={styles.msgRow}>
                    <div style={styles.msgBot}>
                      <div style={styles.msgLabelBot}>Erica</div>
                      <div style={styles.typing}>Thinking...</div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {sources && (
                <div style={styles.sourcesBar}>
                  <span style={{ fontWeight: 600, color: '#6b7280', fontSize: '0.78rem' }}>Sources: </span>
                  {sources.map((s, i) => (
                    <span key={i} style={styles.sourceChip}>{s.section}</span>
                  ))}
                </div>
              )}

              <div style={styles.inputRow}>
                <input
                  style={styles.input}
                  placeholder="Ask a question about the platform..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                />
                <button
                  style={{ ...styles.sendBtn, opacity: !input.trim() || loading ? 0.5 : 1 }}
                  disabled={!input.trim() || loading}
                  onClick={handleSend}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          <div style={styles.faqColumn}>
            <div style={styles.faqCard}>
              <h3 style={styles.faqTitle}>❓ Quick Questions</h3>
              <p style={styles.faqSub}>Click a question to ask Erica</p>
              <div style={styles.faqList}>
                {FAQS.map((faq, i) => (
                  <button
                    key={i}
                    style={styles.faqItem}
                    onClick={() => ask(faq.q)}
                    disabled={loading}
                  >
                    <span style={styles.faqIcon}>💡</span>
                    <span style={styles.faqText}>{faq.q}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.tipsCard}>
              <h3 style={styles.faqTitle}>💡 Tips</h3>
              <ul style={styles.tipsList}>
                <li>Say "hi" to start a conversation</li>
                <li>Ask about features, config, or setup</li>
                <li>Questions are answered from the README docs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

const styles = {
  root: { width: '100%' },
  hero: {
    textAlign: 'center', marginBottom: '24px', padding: '20px',
    background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(168,85,247,0.05))',
    borderRadius: '16px', border: '1px solid #ede9fe',
  },
  heroIcon: { fontSize: '2rem', marginBottom: '6px' },
  heroTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#4c1d95', marginBottom: '4px' },
  heroSub: { color: '#6b7280', fontSize: '0.88rem' },

  layout: { display: 'flex', gap: '20px', alignItems: 'flex-start' },
  chatColumn: { flex: 1, minWidth: 0 },
  faqColumn: { width: '360px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' },

  chatContainer: {
    background: '#fff', borderRadius: '16px', border: '1px solid #ede9fe',
    boxShadow: '0 2px 12px rgba(124,58,237,0.06)', overflow: 'hidden',
  },
  chatBox: {
    padding: '20px', maxHeight: '460px', minHeight: '300px', overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: '14px',
  },
  msgRow: { display: 'flex', width: '100%' },
  msgUser: {
    maxWidth: '80%', padding: '10px 14px', borderRadius: '14px 14px 4px 14px',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
    boxShadow: '0 1px 4px rgba(124,58,237,0.15)',
  },
  msgBot: {
    maxWidth: '80%', padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
    background: '#f3f4f6', color: '#1f2937',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  msgLabelUser: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.7, marginBottom: '4px' },
  msgLabelBot: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#7c3aed', marginBottom: '4px' },
  typing: { color: '#6b7280', fontSize: '0.9rem' },
  sourcesBar: {
    padding: '8px 20px', borderTop: '1px solid #ede9fe', background: '#faf5ff',
    display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
  },
  sourceChip: {
    padding: '2px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600,
    background: '#ede9fe', color: '#6d28d9',
  },
  inputRow: { display: 'flex', borderTop: '1px solid #ede9fe' },
  input: {
    flex: 1, padding: '14px 18px', fontSize: '0.9rem', border: 'none',
    outline: 'none', color: '#1f2937', background: '#faf5ff',
  },
  sendBtn: {
    padding: '14px 28px', fontSize: '0.85rem', fontWeight: 700,
    border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff', cursor: 'pointer',
  },

  faqCard: {
    background: '#fff', borderRadius: '16px', padding: '20px',
    border: '1px solid #ede9fe', boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
  },
  faqTitle: { fontSize: '1rem', fontWeight: 700, color: '#4c1d95', marginBottom: '4px' },
  faqSub: { fontSize: '0.78rem', color: '#9ca3af', marginBottom: '14px' },
  faqList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  faqItem: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
    borderRadius: '10px', border: '1px solid #ede9fe', background: '#faf5ff',
    cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, color: '#374151',
    textAlign: 'left', transition: 'background 0.15s, border-color 0.15s',
    width: '100%',
  },
  faqIcon: { fontSize: '1rem', flexShrink: 0 },
  faqText: { lineHeight: 1.4 },
  tipsCard: {
    background: '#fff', borderRadius: '16px', padding: '20px',
    border: '1px solid #ede9fe', boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
  },
  tipsList: {
    margin: '10px 0 0 0', paddingLeft: '18px', fontSize: '0.82rem',
    color: '#6b7280', lineHeight: 1.8,
  },
}
