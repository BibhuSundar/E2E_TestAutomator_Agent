import React from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'

const AGENT_CARDS = [
  { id: 'product_requirement', label: 'Product Requirement', icon: '📋', path: '/product-requirement', color: '#7c3aed', desc: 'Analyze requirements & extract test criteria' },
  { id: 'planning',            label: 'Planning',            icon: '🗺️', path: '/planning',            color: '#0891b2', desc: 'Generate test plans and strategies' },
  { id: 'designing',           label: 'Designing',           icon: '🎨', path: '/designing',           color: '#059669', desc: 'Design test cases and test architecture' },
  { id: 'automation',          label: 'Automation',          icon: '⚡', path: '/automation',          color: '#d97706', desc: 'Generate automation test scripts' },
  { id: 'code_review',         label: 'Code Review',         icon: '🔍', path: '/code-review',         color: '#dc2626', desc: 'Review test code quality' },
  { id: 'execution',           label: 'Execution',           icon: '▶️', path: '/execution',           color: '#7c3aed', desc: 'Execute and report test runs' },
  { id: 'deployer',            label: 'Deployer',            icon: '🚀', path: '/deployer',            color: '#0891b2', desc: 'Deploy test environments & pipelines' },
]

const BAR_DATA = [
  { label: 'Scripts',     value: 147, color: '#7c3aed' },
  { label: 'Reviews',     value: 89,  color: '#6d28d9' },
  { label: 'Deployments', value: 34,  color: '#a855f7' },
  { label: 'Execution',   value: 72,  color: '#0891b2' },
  { label: 'Success %',   value: 94,  color: '#22c55e' },
]

const DONUT_DATA = [
  { label: 'Scripts Generated', value: 147, color: '#7c3aed' },
  { label: 'Code Reviews',      value: 89,  color: '#6d28d9' },
  { label: 'Deployments',       value: 34,  color: '#22c55e' },
  { label: 'Execution',         value: 72,  color: '#0891b2' },
  { label: 'Success Rate',      value: 94,  color: '#16a34a' },
]

// ── Bar Chart ────────────────────────────────────────────────────
function BarChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.value))
  const chartH = 80
  const barW   = 36
  const gap    = 24
  const padL   = 30
  const padB   = 22
  const totalW = padL + data.length * (barW + gap) + gap
  const yTicks = [0, 75, 150]

  return (
    <svg width="100%" viewBox={`0 0 ${totalW} ${chartH + padB + 8}`} style={{ overflow: 'visible' }}>
      {yTicks.map(t => {
        const y = chartH - (t / maxVal) * chartH + 8
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={totalW} y2={y} stroke="#f3f4f6" strokeWidth="1"/>
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{t}</text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * chartH
        const x    = padL + i * (barW + gap) + gap
        const y    = chartH - barH + 8
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={d.color} rx="4" opacity="0.88"/>
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="7" fill="#374151">{d.value}</text>
            <text x={x + barW / 2} y={chartH + padB + 2} textAnchor="middle" fontSize="7" fill="#6b7280">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Donut Chart ──────────────────────────────────────────────────
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  let cumulative = 0
  const r = 58, cx = 70, cy = 70, strokeW = 22

  const slices = data.map(d => {
    const pct = d.value / total
    const start = cumulative
    cumulative += pct
    const a1 = start * 2 * Math.PI - Math.PI / 2
    const a2 = cumulative * 2 * Math.PI - Math.PI / 2
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2)
    const large = pct > 0.5 ? 1 : 0
    return { ...d, pct, path: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}` }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      {/* Donut SVG centered */}
      <svg width="140" height="140" viewBox="0 0 140 140">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={strokeW} strokeLinecap="butt"/>
        ))}
        <text x={cx} y={cy - 5}  textAnchor="middle" fontSize="18" fontWeight="800" fill="#1f2937">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9"  fill="#6b7280">Total</text>
      </svg>
      {/* Legend centered below */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#374151' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: d.color, flexShrink: 0 }} />
            <span>{d.label}</span>
            <span style={{ color: '#9ca3af' }}>({Math.round(d.value / total * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, hasPermission } = useAuth()
  const navigate = useNavigate()
  const accessible = AGENT_CARDS.filter(c => hasPermission(c.id))

  return (
    <DashboardLayout title="Dashboard">

      {/* Welcome banner */}
      <div style={styles.banner}>
        <div style={styles.bannerBlob} />
        <div style={styles.bannerContent}>
          <h2 style={styles.bannerTitle}>Welcome back, {user?.full_name?.split(' ')[0]} 👋</h2>
          <p style={styles.bannerSub}>You have access to {accessible.length} AI agents. What would you like to automate today?</p>
        </div>
        <div style={styles.bannerBadge}>{user?.role}</div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        {[
          { label: 'Available Agents', value: accessible.length, icon: '🤖' },
          { label: 'LLM Providers',    value: 2,                 icon: '⚡' },
          { label: 'Role Level',       value: user?.role?.split(' ').slice(-1)[0] || user?.role, icon: '🔐' },
          { label: 'Status',           value: 'Active',          icon: '✅' },
        ].map(s => (
          <div key={s.label} style={styles.statCard}>
            <div style={styles.statIcon}>{s.icon}</div>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={styles.chartsRow}>
        <div style={{ ...styles.chartCard, flex: 1.3 }}>
          <h3 style={styles.chartTitle}>Performance Overview</h3>
          <BarChart data={BAR_DATA} />
        </div>
        <div style={{ ...styles.chartCard, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ ...styles.chartTitle, alignSelf: 'flex-start' }}>Distribution</h3>
          <DonutChart data={DONUT_DATA} />
        </div>
      </div>

      {/* Agent grid */}
      <h3 style={styles.sectionTitle}>Your AI Agents</h3>
      <div style={styles.agentGrid}>
        {accessible.map(card => (
          <div
            key={card.id}
            style={styles.agentCard}
            onClick={() => navigate(card.path)}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.12)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 6px rgba(124,58,237,0.06)'
            }}
          >
            <div style={{ ...styles.agentIconBox, background: `${card.color}15` }}>
              <span style={{ fontSize: '1.3rem' }}>{card.icon}</span>
            </div>
            <h4 style={{ ...styles.agentCardTitle, color: card.color }}>{card.label}</h4>
            <p style={styles.agentCardDesc}>{card.desc}</p>
            <div style={{ ...styles.agentLaunch, color: card.color }}>Launch →</div>
          </div>
        ))}
      </div>

    </DashboardLayout>
  )
}

const styles = {
  banner: {
    position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(135deg, #4c1d95, #7c3aed, #a855f7)',
    borderRadius: '16px', padding: '24px 28px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
    boxShadow: '0 6px 20px rgba(124,58,237,0.3)',
  },
  bannerBlob: {
    position: 'absolute', right: '-50px', top: '-50px',
    width: '180px', height: '180px',
    background: 'rgba(255,255,255,0.07)', borderRadius: '50%', pointerEvents: 'none',
  },
  bannerContent: { position: 'relative', zIndex: 2 },
  bannerTitle: { fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '4px' },
  bannerSub: { color: 'rgba(255,255,255,0.72)', fontSize: '0.85rem' },
  bannerBadge: {
    position: 'relative', zIndex: 2,
    padding: '5px 14px', borderRadius: '20px', fontWeight: 700, fontSize: '0.8rem',
    background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
  },
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '14px', marginBottom: '20px',
  },
  statCard: {
    background: '#fff', borderRadius: '12px', padding: '18px',
    border: '1px solid #ede9fe', textAlign: 'center',
    boxShadow: '0 1px 6px rgba(124,58,237,0.06)',
  },
  statIcon:  { fontSize: '1.4rem', marginBottom: '6px' },
  statValue: { fontSize: '1.4rem', fontWeight: 800, color: '#4c1d95', marginBottom: '2px' },
  statLabel: { fontSize: '0.74rem', color: '#6b7280', fontWeight: 500 },
  chartsRow: {
    display: 'flex', gap: '14px', marginBottom: '18px', alignItems: 'stretch',
  },
  chartCard: {
    background: '#fff', borderRadius: '12px', padding: '14px 18px',
    border: '1px solid #ede9fe',
    boxShadow: '0 1px 6px rgba(124,58,237,0.06)',
  },
  chartTitle: {
    fontSize: '0.85rem', fontWeight: 700, color: '#4c1d95', margin: '0 0 8px',
  },
  sectionTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#4c1d95', marginBottom: '14px' },
  agentGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '14px',
  },
  agentCard: {
    background: '#fff', borderRadius: '12px', padding: '18px',
    border: '1.5px solid #ede9fe', cursor: 'pointer',
    transition: 'transform 0.18s, box-shadow 0.18s',
    boxShadow: '0 1px 6px rgba(124,58,237,0.06)',
  },
  agentIconBox: {
    width: '40px', height: '40px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px',
  },
  agentCardTitle: { fontSize: '0.88rem', fontWeight: 700, marginBottom: '4px' },
  agentCardDesc:  { fontSize: '0.76rem', color: '#6b7280', lineHeight: 1.5, marginBottom: '10px' },
  agentLaunch:    { fontSize: '0.78rem', fontWeight: 700 },
}
