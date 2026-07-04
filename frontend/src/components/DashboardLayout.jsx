import React, { useState } from 'react'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

export default function DashboardLayout({ children, title }) {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()
  const sidebarWidth = collapsed ? 72 : 240

  return (
    <div style={styles.root}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      <div style={{ ...styles.main, marginLeft: sidebarWidth, transition: 'margin-left 0.25s ease' }}>
        {/* Header */}
        <header style={styles.header}>
          <h1 style={styles.pageTitle}>{title}</h1>
          <div style={styles.headerRight}>
            <div style={styles.badge}>{user?.role}</div>
            <div style={styles.avatar}>{user?.full_name?.[0] || 'U'}</div>
          </div>
        </header>

        {/* Content */}
        <main style={styles.content}>{children}</main>
      </div>
    </div>
  )
}

const styles = {
  root: { display: 'flex', minHeight: '100vh', background: '#f5f3ff' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  header: {
    height: '64px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    borderBottom: '1px solid #6d28d9',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 28px', position: 'sticky', top: 0, zIndex: 50,
    boxShadow: '0 1px 8px rgba(124,58,237,0.2)',
  },
  pageTitle: {
    fontSize: '1.1rem', fontWeight: 700,
    color: '#ffffff',
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  badge: {
    padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
    background: 'rgba(255,255,255,0.2)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  avatar: {
    width: '36px', height: '36px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: '0.9rem',
  },
  content: { flex: 1, padding: '28px', overflowY: 'auto' },
}
