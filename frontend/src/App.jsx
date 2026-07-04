import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import LandingPage    from './pages/LandingPage'
import LoginPage      from './pages/LoginPage'
import RegisterPage   from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import DashboardPage  from './pages/DashboardPage'
import AgentPage      from './pages/AgentPage'
import ProductRequirementPage from './pages/ProductRequirementPage'
import PlanningPage   from './pages/PlanningPage'
import DesigningPage  from './pages/DesigningPage'
import ConfigurePage  from './pages/ConfigurePage'
import SupportPage    from './pages/SupportPage'

// Protected route wrapper
function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={loadingStyle}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

const AGENT_ROUTES = [
  {
    path: '/automation',
    agentId: 'automation',
    agentName: 'Automation',
    description: 'Generate maintainable automation scripts for Selenium, Playwright, Cypress, pytest, or JUnit.',
    placeholder: 'e.g. Generate Playwright test scripts for login functionality using the Page Object Model pattern...',
    permission: 'automation',
  },
  {
    path: '/code-review',
    agentId: 'code_review',
    agentName: 'Code Review',
    description: 'Review test code for quality, maintainability, correctness, and best practices adherence.',
    placeholder: 'e.g. Review this Selenium test class for anti-patterns and improvement opportunities...',
    permission: 'code_review',
  },
  {
    path: '/execution',
    agentId: 'execution',
    agentName: 'Execution',
    description: 'Manage test execution, analyze results, and generate detailed reports with failure analysis.',
    placeholder: 'e.g. Analyze these test results and identify patterns in failures: 15/20 tests passed, 5 failed on login module...',
    permission: 'execution',
  },
  {
    path: '/deployer',
    agentId: 'deployer',
    agentName: 'Deployer',
    description: 'Plan deployment of test environments, CI/CD pipeline setup, and test infrastructure management.',
    placeholder: 'e.g. Create a GitHub Actions CI pipeline that runs our Playwright tests on every PR to main...',
    permission: 'deployer',
  },
]

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"               element={<LandingPage />} />
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/register"       element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route path="/dashboard"            element={<Protected><DashboardPage /></Protected>} />
      <Route path="/product-requirement" element={<Protected><ProductRequirementPage /></Protected>} />
      <Route path="/planning"            element={<Protected><PlanningPage /></Protected>} />
      <Route path="/designing"           element={<Protected><DesigningPage /></Protected>} />
      <Route path="/configure"           element={<Protected><ConfigurePage /></Protected>} />
      <Route path="/support"             element={<Protected><SupportPage /></Protected>} />

      {AGENT_ROUTES.map(r => (
        <Route
          key={r.path}
          path={r.path}
          element={
            <Protected>
              <AgentPage
                agentId={r.agentId}
                agentName={r.agentName}
                description={r.description}
                placeholder={r.placeholder}
                permission={r.permission}
              />
            </Protected>
          }
        />
      ))}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

const loadingStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', fontSize: '1rem', color: '#7c3aed', fontWeight: 600,
}
