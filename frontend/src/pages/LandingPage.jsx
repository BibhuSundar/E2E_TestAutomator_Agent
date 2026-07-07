import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const FEATURE_CARDS = [
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <rect x="6" y="4" width="18" height="24" rx="3" fill="#a78bfa" opacity="0.85"/>
        <rect x="9" y="8"  width="10" height="2" rx="1" fill="white"/>
        <rect x="9" y="12" width="10" height="2" rx="1" fill="white"/>
        <rect x="9" y="16" width="6"  height="2" rx="1" fill="white"/>
        <rect x="13" y="9" width="17" height="19" rx="3" fill="#7c3aed"/>
        <rect x="17" y="14" width="9" height="2" rx="1" fill="white"/>
        <rect x="17" y="18" width="7" height="2" rx="1" fill="white"/>
        <rect x="17" y="22" width="5" height="2" rx="1" fill="white"/>
      </svg>
    ),
    title: 'Product Requirement',
    desc: 'AI-powered requirement analysis',
    path: '/product-requirement',
    detail: 'The Product Requirement agent uses advanced NLP to analyze your business requirements, user stories, and acceptance criteria. It extracts key testable conditions, identifies ambiguities, and produces a structured requirement summary that your QA team can act on immediately.',
    howItWorks: [
      'Paste your product requirements, user stories, or BRD documents',
      'AI identifies testable acceptance criteria and edge cases',
      'Gaps and ambiguities are flagged with suggested clarifications',
      'Structured output ready for the Planning agent to consume',
    ],
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="13" fill="none" stroke="#34d399" strokeWidth="2.5"/>
        <path d="M13 21 Q16 14 20 21 Q24 28 27 21" stroke="#34d399" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <circle cx="29" cy="29" r="6" fill="#059669"/>
        <path d="M26 29 L28.5 31.5 L32 27" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Planning',
    desc: 'Test plan & strategy generation',
    path: '/planning',
    detail: 'The Planning agent creates comprehensive test plans tailored to your project. It defines scope, objectives, risk areas, test types (functional, regression, performance), resource estimates, and entry/exit criteria — aligned with your sprint timelines and delivery goals.',
    howItWorks: [
      'Provide project context, timelines, and requirements summary',
      'AI generates a full test plan with scope and strategy',
      'Risk-based prioritisation identifies high-impact test areas',
      'Export-ready document with resource and timeline estimates',
    ],
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <rect x="4" y="9" width="32" height="20" rx="3" fill="#1e3a8a" opacity="0.5"/>
        <rect x="4" y="9" width="32" height="20" rx="3" stroke="#60a5fa" strokeWidth="2"/>
        <rect x="7" y="12" width="26" height="14" rx="2" fill="#1e40af" opacity="0.7"/>
        <rect x="10" y="15" width="7"  height="2" rx="1" fill="#93c5fd"/>
        <rect x="10" y="19" width="12" height="2" rx="1" fill="#93c5fd"/>
        <rect x="16" y="29" width="8" height="3" rx="1.5" fill="#60a5fa"/>
        <rect x="12" y="31" width="16" height="2" rx="1" fill="#60a5fa"/>
      </svg>
    ),
    title: 'Designing',
    desc: 'Playwright & Selenium test design',
    path: '/designing',
    detail: 'The Designing agent produces detailed test cases and test scenarios using industry-proven techniques — Boundary Value Analysis, Equivalence Partitioning, Decision Tables, and State Transition. It structures test suites that are maintainable, reusable, and ready for automation.',
    howItWorks: [
      'Provide feature description or acceptance criteria',
      'AI applies BVA, equivalence partitioning and decision tables',
      'Generates structured test cases with steps and expected results',
      'Outputs test design ready for the Automation agent',
    ],
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <rect x="4" y="7" width="28" height="20" rx="3" fill="#78350f" opacity="0.3"/>
        <rect x="4" y="7" width="28" height="20" rx="3" stroke="#f59e0b" strokeWidth="2"/>
        <rect x="4" y="7" width="28" height="7" rx="3" fill="#f59e0b" opacity="0.25"/>
        <circle cx="9"  cy="10.5" r="1.5" fill="#fbbf24"/>
        <circle cx="14" cy="10.5" r="1.5" fill="#fbbf24"/>
        <circle cx="19" cy="10.5" r="1.5" fill="#fbbf24"/>
        <rect x="8"  y="18" width="6"  height="2" rx="1" fill="#fbbf24"/>
        <rect x="16" y="18" width="10" height="2" rx="1" fill="#fbbf24"/>
        <rect x="8"  y="22" width="14" height="2" rx="1" fill="#fbbf24"/>
        <circle cx="30" cy="29" r="7" fill="#f59e0b"/>
        <path d="M27 29 L29.5 31.5 L33.5 27" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Automation',
    desc: 'Cross-platform test generation',
    path: '/automation',
    detail: 'The Automation agent generates production-ready test scripts in your chosen framework — Playwright, Selenium, Cypress, pytest, or JUnit. It follows the Page Object Model pattern, adds proper assertions, handles waits, and produces clean, maintainable code your team can run immediately.',
    howItWorks: [
      'Specify your tech stack and target framework',
      'Paste test cases or describe the scenario to automate',
      'AI generates scripts with POM structure and best practices',
      'Code includes assertions, error handling, and reporting hooks',
    ],
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="13" fill="none" stroke="#a78bfa" strokeWidth="2.5"/>
        <circle cx="20" cy="20" r="8"  fill="none" stroke="#7c3aed" strokeWidth="2"/>
        <circle cx="20" cy="20" r="3"  fill="#a78bfa"/>
        <line x1="20" y1="7"  x2="20" y2="11" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/>
        <line x1="20" y1="29" x2="20" y2="33" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/>
        <line x1="7"  y1="20" x2="11" y2="20" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/>
        <line x1="29" y1="20" x2="33" y2="20" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Code Review',
    desc: 'Intelligent code review',
    path: '/code-review',
    detail: 'The Code Review agent analyses your test automation code for quality, correctness, and maintainability. It identifies anti-patterns, hardcoded values, missing assertions, flaky test risks, and naming issues — giving you actionable, prioritised feedback with suggested fixes.',
    howItWorks: [
      'Paste your test automation code or file content',
      'AI scans for anti-patterns, flaky tests, and code smells',
      'Issues are categorised by severity with fix suggestions',
      'Summary report with quality score and improvement actions',
    ],
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="14" fill="#14532d" opacity="0.35"/>
        <circle cx="20" cy="20" r="14" stroke="#22c55e" strokeWidth="2"/>
        <polygon points="16,13 16,27 29,20" fill="#22c55e"/>
        <path d="M8 32 Q14 28 20 32 Q26 36 32 32" stroke="#22c55e" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Execution',
    desc: 'Test scripts execution & reporting',
    path: '/execution',
    detail: 'The Execution agent orchestrates the running of your test suites, monitors results in real time, and produces detailed reports. It analyses failures, identifies flaky tests, groups errors by root cause, and delivers a clear pass/fail summary with actionable next steps for your team.',
    howItWorks: [
      'Paste your test scripts or describe the test suite to execute',
      'AI plans the execution order and environment requirements',
      'Results are analysed — failures grouped by root cause',
      'Detailed HTML/JSON report generated with fix recommendations',
    ],
  },
]

// ── Modal component ──────────────────────────────────────────────
function CardModal({ card, onClose }) {
  if (!card) return null

  return (
    <div style={modal.overlay} onClick={onClose}>
      <div style={modal.box} onClick={e => e.stopPropagation()}>

        {/* Close button */}
        <button style={modal.closeBtn} onClick={onClose}>✕</button>

        {/* Icon */}
        <div style={modal.iconWrap}>{card.icon}</div>

        {/* Title */}
        <h2 style={modal.title}>{card.title}</h2>

        {/* Detail description */}
        <p style={modal.detail}>{card.detail}</p>

        {/* How it works */}
        <div style={modal.section}>
          <p style={modal.sectionLabel}>How it works</p>
          <ol style={modal.list}>
            {card.howItWorks.map((step, i) => (
              <li key={i} style={modal.listItem}>
                <span style={modal.listNum}>{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [activeCard, setActiveCard] = useState(null)

  return (
    <>
      {/* Announcement Banner — fixed at very top */}
      <div style={styles.banner}>
        <div style={styles.bannerScrollWrap}>
          <span style={styles.bannerScroll}>
            📢 Test Automator is in MVP Stage, Soon we'll get the production-ready Test Automator.
          </span>
        </div>
      </div>

      <div style={styles.root}>
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

      <h1 style={styles.title}>Test Automator</h1>
      <p style={styles.subtitle}>AI-Driven Multi-Agent Automation System</p>
      <p style={styles.desc}>
        Transform your test cases into production-ready automation scripts with intelligent agents. Classify
        applications, generate scripts, review code, and deploy – all in one platform.
      </p>

      {/* Buttons */}
      <div style={styles.btnRow}>
        <button
          style={styles.btn}
          onClick={() => navigate('/login')}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >Login</button>
        <button
          style={styles.btn}
          onClick={() => navigate('/register')}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >Sign Up</button>
      </div>

      {/* Feature cards */}
      <div style={styles.grid}>
        {FEATURE_CARDS.map(card => (
          <div
            key={card.title}
            style={styles.card}
            onClick={() => setActiveCard(card)}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.14)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={styles.cardIcon}>{card.icon}</div>
            <h3 style={styles.cardTitle}>{card.title}</h3>
            <p style={styles.cardDesc}>{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Modal */}
      <CardModal card={activeCard} onClose={() => setActiveCard(null)} />
    </div>
    </>
  )
}

// ── Page styles ──────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: '100vh',
    width: '100%',
    background: 'radial-gradient(ellipse at 50% 0%, #7c3aed 0%, #5b21b6 28%, #4c1d95 52%, #3b0764 75%, #2e1065 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    boxSizing: 'border-box',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
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
  logoWrap: { marginBottom: '16px' },
  logoImg: {
    width: '80px', height: '80px', objectFit: 'contain',
    borderRadius: '12px', background: '#ffffff', padding: '8px',
    display: 'block', boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
  },
  logoFallback: {
    width: '80px', height: '80px', borderRadius: '12px',
    background: '#ffffff', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
  },
  logoFallbackText: {
    fontSize: '1.9rem', fontWeight: 900,
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  title: {
    fontSize: '2.4rem', fontWeight: 800, color: '#ffffff',
    margin: '0 0 8px', letterSpacing: '-0.5px', textAlign: 'center',
  },
  subtitle: {
    fontSize: '0.95rem', color: 'rgba(255,255,255,0.72)',
    margin: '0 0 10px', textAlign: 'center',
  },
  desc: {
    fontSize: '0.84rem', color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.65, margin: '0 0 22px', maxWidth: '500px', textAlign: 'center',
  },
  btnRow: { display: 'flex', gap: '14px', marginBottom: '32px' },
  btn: {
    padding: '9px 34px', borderRadius: '6px', fontSize: '0.92rem', fontWeight: 600,
    background: 'transparent', border: '1.5px solid rgba(255,255,255,0.65)',
    color: '#ffffff', cursor: 'pointer', transition: 'background 0.15s',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '14px', width: '100%', maxWidth: '860px',
  },
  card: {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: '12px', padding: '24px 18px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
    cursor: 'pointer', transition: 'background 0.18s, border-color 0.18s, transform 0.18s',
    textAlign: 'center',
  },
  cardIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2px' },
  cardTitle: { fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', margin: 0 },
  cardDesc: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 },
}

// ── Modal styles ─────────────────────────────────────────────────
const modal = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(15, 7, 32, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
  },
  box: {
    position: 'relative',
    background: 'linear-gradient(160deg, #3b1f6e 0%, #2d1560 50%, #1e0d45 100%)',
    border: '1px solid rgba(167,139,250,0.25)',
    borderRadius: '16px',
    padding: '36px 32px 32px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
    animation: 'fadeInModal 0.2s ease',
  },
  closeBtn: {
    position: 'absolute', top: '14px', right: '16px',
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.6)', borderRadius: '6px',
    width: '28px', height: '28px', cursor: 'pointer',
    fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  iconWrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '14px',
  },
  title: {
    fontSize: '1.25rem', fontWeight: 800, color: '#ffffff',
    margin: '0 0 12px', textAlign: 'left',
  },
  detail: {
    fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.7, margin: '0 0 20px', textAlign: 'left',
  },
  section: { textAlign: 'left' },
  sectionLabel: {
    fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: '0.8px',
    margin: '0 0 10px',
  },
  list: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' },
  listItem: {
    display: 'flex', gap: '10px', alignItems: 'flex-start',
    fontSize: '0.86rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.55,
  },
  listNum: {
    color: '#a78bfa', fontWeight: 700, flexShrink: 0, minWidth: '16px',
  },
}
