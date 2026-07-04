import React from 'react'
import DashboardLayout from '../components/DashboardLayout'

const FAQS = [
  { q: 'How do I configure OpenAI?', a: 'Copy backend/.env.example to backend/.env and set your OPENAI_API_KEY.' },
  { q: 'How do I use Ollama?', a: 'Install Ollama locally (ollama.ai), pull a model (e.g. ollama pull llama3), then select Ollama in the agent panel.' },
  { q: 'What are the demo credentials?', a: 'admin/secret, manager/secret, lead/secret, analyst/secret — change these in production.' },
  { q: 'How do roles work?', a: 'Admin > QA Manager > QA Lead > QA Analyst. Each lower role has fewer tab/agent permissions.' },
  { q: 'Can I chain agents together?', a: 'Full pipeline mode is planned for the next release. Each agent currently runs independently.' },
]

export default function SupportPage() {
  return (
    <DashboardLayout title="Support">
      <div style={styles.root}>
        <div style={styles.hero}>
          <div style={styles.heroIcon}>💬</div>
          <h2 style={styles.heroTitle}>How can we help?</h2>
          <p style={styles.heroSub}>Find answers to common questions or reach out to the team.</p>
        </div>

        <h3 style={styles.sectionTitle}>Frequently Asked Questions</h3>
        <div style={styles.faqList}>
          {FAQS.map((faq, i) => (
            <div key={i} style={styles.faqCard}>
              <p style={styles.faqQ}>❓ {faq.q}</p>
              <p style={styles.faqA}>{faq.a}</p>
            </div>
          ))}
        </div>

        <div style={styles.contactCard}>
          <h3 style={styles.contactTitle}>📧 Contact Support</h3>
          <p style={styles.contactDesc}>Need more help? Reach out to the ABBCreation team.</p>
          <a href="mailto:support@abbcreation.com" style={styles.contactLink}>support@abbcreation.com</a>
        </div>
      </div>
    </DashboardLayout>
  )
}

const styles = {
  root: { maxWidth: '760px' },
  hero: { textAlign: 'center', marginBottom: '32px', padding: '28px', background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(168,85,247,0.05))', borderRadius: '16px', border: '1px solid #ede9fe' },
  heroIcon: { fontSize: '2.5rem', marginBottom: '10px' },
  heroTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#4c1d95', marginBottom: '6px' },
  heroSub: { color: '#6b7280' },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, color: '#4c1d95', marginBottom: '14px' },
  faqList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' },
  faqCard: { background: '#fff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #ede9fe', boxShadow: '0 1px 4px rgba(124,58,237,0.05)' },
  faqQ: { fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: '6px' },
  faqA: { fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.6 },
  contactCard: { background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #ede9fe', textAlign: 'center' },
  contactTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#4c1d95', marginBottom: '8px' },
  contactDesc: { color: '#6b7280', marginBottom: '14px', fontSize: '0.9rem' },
  contactLink: { color: '#7c3aed', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'underline' },
}
