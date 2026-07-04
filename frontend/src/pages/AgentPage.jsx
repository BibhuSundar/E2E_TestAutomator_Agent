/**
 * Generic agent page — wraps DashboardLayout + AgentPanel.
 * Used for all 7 sub-agent pages.
 */
import React from 'react'
import DashboardLayout from '../components/DashboardLayout'
import AgentPanel from '../components/AgentPanel'
import { useAuth } from '../context/AuthContext'

export default function AgentPage({ agentId, agentName, description, placeholder, permission }) {
  const { hasPermission } = useAuth()

  if (!hasPermission(permission)) {
    return (
      <DashboardLayout title={agentName}>
        <div style={styles.denied}>
          <div style={styles.deniedIcon}>🔒</div>
          <h3 style={styles.deniedTitle}>Access Restricted</h3>
          <p style={styles.deniedSub}>Your role does not have permission to access the {agentName} agent.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={agentName}>
      <AgentPanel
        agentId={agentId}
        agentName={agentName}
        description={description}
        placeholder={placeholder}
      />
    </DashboardLayout>
  )
}

const styles = {
  denied: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', textAlign: 'center', gap: '12px',
  },
  deniedIcon: { fontSize: '3.5rem', marginBottom: '8px' },
  deniedTitle: { fontSize: '1.4rem', fontWeight: 700, color: '#4c1d95' },
  deniedSub: { color: '#6b7280', fontSize: '0.95rem', maxWidth: '360px' },
}
