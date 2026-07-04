import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

const NAV_ITEMS = [
  { id: 'dashboard',           label: 'Dashboard',           icon: '🏠', path: '/dashboard',           permission: 'dashboard' },
  { id: 'product_requirement', label: 'Product Requirement', icon: '📋', path: '/product-requirement', permission: 'product_requirement' },
  { id: 'planning',            label: 'Planning',            icon: '🗺️', path: '/planning',            permission: 'planning' },
  { id: 'designing',           label: 'Designing',           icon: '🎨', path: '/designing',           permission: 'designing' },
  { id: 'automation',          label: 'Automation',          icon: '⚡', path: '/automation',          permission: 'automation' },
  { id: 'code_review',         label: 'Code Review',         icon: '🔍', path: '/code-review',         permission: 'code_review' },
  { id: 'execution',           label: 'Execution',           icon: '▶️', path: '/execution',           permission: 'execution' },
  { id: 'deployer',            label: 'Deployer',            icon: '🚀', path: '/deployer',            permission: 'deployer' },
  { id: 'configure',           label: 'Configure',           icon: '⚙️', path: '/configure',           permission: 'configure' },
  { id: 'support',             label: 'Support',             icon: '💬', path: '/support',             permission: 'support' },
]

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, hasPermission, logout } = useAuth()

  const accessible = NAV_ITEMS.filter(item => hasPermission(item.permission))

  return (
    <aside style={{ ...styles.sidebar, width: collapsed ? '72px' : '240px' }}>

      {/* Logo */}
      <div style={styles.logoArea}>
        {!collapsed && <div style={{cursor:'pointer'}} onClick={() => navigate('/dashboard')}><Logo size="sm" /></div>}
        <button style={styles.toggleBtn} onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav items */}
      <nav style={styles.nav}>
        {accessible.map(item => {
          const active = location.pathname === item.path
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : ''}
              style={{
                ...styles.navItem,
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                borderLeft: active ? '3px solid #a855f7' : '3px solid transparent',
                color: active ? '#e9d5ff' : 'rgba(255,255,255,0.6)',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* User / logout */}
      <div style={styles.userArea}>
        {!collapsed && (
          <div style={styles.userInfo}>
            <div style={styles.avatar}>{user?.full_name?.[0] || 'U'}</div>
            <div>
              <div style={styles.userName}>{user?.full_name}</div>
              <div style={styles.userRole}>{user?.role}</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{ ...styles.avatar, margin: '0 auto 8px' }}>{user?.full_name?.[0] || 'U'}</div>
        )}
        <button style={styles.logoutBtn} onClick={logout} title="Logout">
          {collapsed ? '🚪' : '🚪 Logout'}
        </button>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 100,
    background: 'linear-gradient(180deg, #1a0a3d 0%, #0f0720 100%)',
    borderRight: '1px solid rgba(167,139,250,0.15)',
    display: 'flex', flexDirection: 'column',
    transition: 'width 0.25s ease', overflow: 'hidden',
    boxShadow: '4px 0 20px rgba(0,0,0,0.3)',
  },
  logoArea: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 16px', borderBottom: '1px solid rgba(167,139,250,0.1)',
    minHeight: '64px',
  },
  toggleBtn: {
    background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
    color: '#a78bfa', borderRadius: '8px', width: '28px', height: '28px',
    cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  nav: { flex: 1, padding: '12px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 12px', borderRadius: '10px', border: '3px solid transparent',
    cursor: 'pointer', width: '100%', transition: 'all 0.15s',
    fontSize: '0.88rem', fontWeight: 500, textAlign: 'left',
  },
  navIcon: { fontSize: '1rem', flexShrink: 0, width: '20px', textAlign: 'center' },
  navLabel: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userArea: { padding: '12px 8px', borderTop: '1px solid rgba(167,139,250,0.1)' },
  userInfo: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 8px', marginBottom: '8px',
  },
  avatar: {
    width: '34px', height: '34px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
  },
  userName: { fontSize: '0.82rem', fontWeight: 600, color: '#e9d5ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' },
  userRole: { fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' },
  logoutBtn: {
    width: '100%', padding: '9px 12px', borderRadius: '10px',
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#fca5a5', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
  },
}
