import React, { useState, useRef } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { agentAPI } from '../api/client'

const TABS = [
  { id: 'paste',  label: 'Paste Text' },
  { id: 'upload', label: 'Upload File' },
  { id: 'jira',   label: 'Jira User Story' },
]

function downloadAsPDF(content) {
  const sanitized = content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>Test Plan Document</title>
  <style>
    @page{margin:2cm}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.8;color:#1f2937}
    h1{font-size:20px;color:#0e7490;border-bottom:2px solid #06b6d4;padding-bottom:8px;margin-bottom:16px}
    .meta{font-size:11px;color:#6b7280;margin-bottom:24px}
    .content{white-space:pre-wrap}
    .footer{margin-top:40px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px}
  </style></head><body>
  <h1>🗺️ Test Plan Document</h1>
  <div class="meta">Generated on ${new Date().toLocaleString()} · NatWest Automator</div>
  <div class="content">${sanitized}</div>
  <div class="footer">Confidential · NatWest Automator AI Platform</div>
  </body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none'
  document.body.appendChild(iframe)
  iframe.contentDocument.open()
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()
  setTimeout(() => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, 300)
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    if (file.type === 'application/pdf') {
      resolve(`[PDF file: ${file.name}]\n\nNote: PDF content extraction is handled server-side.`)
      return
    }
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export default function PlanningPage() {
  const { hasPermission } = useAuth()
  const [activeTab, setActiveTab]       = useState('paste')
  const [pasteText, setPasteText]       = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [fileContent, setFileContent]   = useState('')
  const [dragOver, setDragOver]         = useState(false)
  const [jiraKey, setJiraKey]           = useState('')
  const [jiraText, setJiraText]         = useState('')
  const [loading, setLoading]           = useState(false)
  const [result, setResult]             = useState(null)
  const [error, setError]               = useState('')
  const fileInputRef = useRef()

  if (!hasPermission('planning')) {
    return (
      <DashboardLayout title="Planning">
        <div style={s.denied}>
          <div style={{ fontSize: '3rem' }}>🔒</div>
          <h3 style={s.deniedTitle}>Access Restricted</h3>
          <p style={s.deniedSub}>Your role does not have permission to access this agent.</p>
        </div>
      </DashboardLayout>
    )
  }

  const handleFile = async (file) => {
    if (!file) return
    const ok = ['text/plain','application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword']
    if (!ok.includes(file.type) && !file.name.match(/\.(txt|pdf|docx|doc)$/i)) {
      setError('Only .txt, .pdf, or .docx files are supported.')
      return
    }
    setError('')
    setUploadedFile(file)
    setFileContent(await readFileAsText(file))
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }

  const buildTask = () => {
    if (activeTab === 'paste')  return pasteText.trim()
    if (activeTab === 'upload') return fileContent.trim()
    if (activeTab === 'jira')   return (jiraKey.trim() ? `Jira Issue: ${jiraKey.trim()}\n\n` : '') + jiraText.trim()
    return ''
  }

  const isReady = () => {
    if (activeTab === 'paste')  return pasteText.trim().length > 0
    if (activeTab === 'upload') return fileContent.trim().length > 0
    if (activeTab === 'jira')   return jiraText.trim().length > 0
    return false
  }

  const handleGenerate = async () => {
    const task = buildTask()
    if (!task) return
    setLoading(true); setError(''); setResult(null)
    try {
      const data = await agentAPI.run('planning', task, null, 'openai')
      setResult(data.result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Agent execution failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (id) => { setActiveTab(id); setError(''); setResult(null) }

  return (
    <DashboardLayout title="Planning">
      <div style={s.page}>

        <div>
          <h2 style={s.pageTitle}>Planning</h2>
          <p style={s.pageSubtitle}>
            Create comprehensive test plans from requirements, uploaded documents, or Jira user stories.
          </p>
        </div>

        <div style={s.card}>
          <div style={s.tabBar}>
            {TABS.map(t => (
              <button
                key={t.id}
                style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }}
                onClick={() => switchTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={s.body}>

            {activeTab === 'paste' && (
              <>
                <p style={s.sectionTitle}>Paste Text</p>
                <textarea
                  style={s.textarea}
                  rows={9}
                  placeholder={
                    'Enter your requirements or feature description to plan tests for…\n\n' +
                    'Example:\n' +
                    'Feature: User Authentication Module\n\n' +
                    'Scope: Login, registration, password reset, session management\n' +
                    'Timeline: 3 sprints (6 weeks)\n' +
                    'Team: 2 QA engineers, 1 automation engineer\n\n' +
                    'Create a comprehensive test plan covering:\n' +
                    '- Test objectives and scope\n' +
                    '- Test strategy and approach\n' +
                    '- Resource allocation and timeline\n' +
                    '- Risk assessment and mitigation'
                  }
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                />
              </>
            )}

            {activeTab === 'upload' && (
              <>
                <p style={s.sectionTitle}>Upload File</p>
                <div
                  style={{
                    ...s.dropZone,
                    borderColor: dragOver ? '#0891b2' : uploadedFile ? '#22c55e' : '#a5f3fc',
                    background:  dragOver ? 'rgba(8,145,178,0.04)' : uploadedFile ? 'rgba(34,197,94,0.03)' : '#f0fdff',
                  }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef} type="file" accept=".txt,.pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files[0])}
                  />
                  {uploadedFile ? (
                    <div style={s.fileRow}>
                      <span style={{ fontSize: '1.8rem' }}>📄</span>
                      <div style={{ flex: 1 }}>
                        <div style={s.fileName}>{uploadedFile.name}</div>
                        <div style={s.fileMeta}>{(uploadedFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button
                        style={s.clearBtn}
                        onClick={e => { e.stopPropagation(); setUploadedFile(null); setFileContent('') }}
                      >✕</button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📂</div>
                      <p style={s.dropText}>
                        Drag & drop your file here, or <span style={s.dropLink}>browse</span>
                      </p>
                      <p style={s.dropHint}>Supports .txt · .pdf · .docx</p>
                    </div>
                  )}
                </div>
                {fileContent && (
                  <div style={s.preview}>
                    <div style={s.previewHead}>
                      <span style={{ fontWeight: 600, fontSize: '0.78rem', color: '#374151' }}>📋 Preview</span>
                      <span style={{ fontSize: '0.74rem', color: '#9ca3af' }}>{fileContent.length} chars</span>
                    </div>
                    <pre style={s.previewText}>
                      {fileContent.slice(0, 500)}{fileContent.length > 500 ? '\n…' : ''}
                    </pre>
                  </div>
                )}
              </>
            )}

            {activeTab === 'jira' && (
              <>
                <p style={s.sectionTitle}>Jira User Story</p>
                <input
                  style={s.input}
                  type="text"
                  placeholder="Jira Issue Key (optional) — e.g. PROJ-123"
                  value={jiraKey}
                  onChange={e => setJiraKey(e.target.value)}
                />
                <textarea
                  style={{ ...s.textarea, marginTop: '10px' }}
                  rows={8}
                  placeholder={
                    'Paste the Jira epic or feature description to build a test plan for…\n\n' +
                    'Example:\n' +
                    'Epic: Payment Gateway Integration\n\n' +
                    'Description:\n' +
                    'Integrate Stripe payment gateway to support credit/debit card payments.\n\n' +
                    'Stories included:\n' +
                    '- PROJ-101: Add card payment form\n' +
                    '- PROJ-102: Handle payment success/failure\n' +
                    '- PROJ-103: Send payment confirmation email'
                  }
                  value={jiraText}
                  onChange={e => setJiraText(e.target.value)}
                />
              </>
            )}

            {error && <div style={s.errorBox}>⚠️ {error}</div>}

            <button
              style={{
                ...s.actionBtn,
                opacity: loading || !isReady() ? 0.55 : 1,
                cursor:  loading || !isReady() ? 'not-allowed' : 'pointer',
              }}
              onClick={handleGenerate}
              disabled={loading || !isReady()}
            >
              {loading
                ? <><span style={s.spin}>⟳</span> Generating test plan…</>
                : '🗺️  Generate Test Plan'
              }
            </button>
          </div>
        </div>

        {result && (
          <div style={s.resultCard}>
            <div style={s.resultHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem' }}>✅</span>
                <span style={s.resultTitle}>Test Plan Generated</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={s.copyBtn} onClick={() => navigator.clipboard.writeText(result)}>
                  📋 Copy
                </button>
                <button style={s.pdfBtn} onClick={() => downloadAsPDF(result)}>
                  ⬇️ Download PDF
                </button>
              </div>
            </div>
            <pre style={s.resultText}>{result}</pre>
            <div style={s.resultFoot}>
              💡 In the print dialog, choose <strong>Save as PDF</strong> to download.
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}

const s = {
  page:         { display: 'flex', flexDirection: 'column', gap: '20px' },
  pageTitle:    { fontSize: '1.45rem', fontWeight: 800, color: '#1f2937', marginBottom: '4px' },
  pageSubtitle: { fontSize: '0.85rem', color: '#6b7280' },
  card:         { background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' },
  tabBar:       { display: 'flex', borderBottom: '1.5px solid #e5e7eb' },
  tab: {
    padding: '12px 22px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
    background: 'none', border: 'none', color: '#6b7280',
    borderBottom: '2px solid transparent', marginBottom: '-1.5px',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive:    { color: '#0891b2', fontWeight: 600, borderBottom: '2px solid #0891b2' },
  body:         { padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '12px' },
  sectionTitle: { fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '2px' },
  textarea: {
    width: '100%', padding: '12px 14px', borderRadius: '8px',
    border: '1px solid #d1d5db', background: '#fff', fontSize: '0.875rem',
    resize: 'vertical', outline: 'none', color: '#374151', fontFamily: 'inherit',
    lineHeight: 1.65, boxSizing: 'border-box', transition: 'border-color 0.15s',
  },
  input: {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid #d1d5db', background: '#fff', fontSize: '0.875rem',
    outline: 'none', color: '#374151', fontFamily: 'inherit',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  },
  dropZone: {
    border: '2px dashed', borderRadius: '10px', padding: '28px 20px',
    cursor: 'pointer', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px',
  },
  dropText: { color: '#374151', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' },
  dropLink: { color: '#0891b2', fontWeight: 700, textDecoration: 'underline' },
  dropHint: { color: '#9ca3af', fontSize: '0.775rem' },
  fileRow:  { display: 'flex', alignItems: 'center', gap: '12px', width: '100%' },
  fileName: { fontWeight: 600, color: '#1f2937', fontSize: '0.875rem', marginBottom: '2px' },
  fileMeta: { fontSize: '0.75rem', color: '#6b7280' },
  clearBtn: {
    marginLeft: 'auto', background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626',
    borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer',
    fontWeight: 700, fontSize: '0.8rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  preview:     { border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' },
  previewHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '7px 12px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
  },
  previewText: {
    padding: '10px 12px', fontSize: '0.78rem', lineHeight: 1.6,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#374151',
    maxHeight: '120px', overflowY: 'auto', fontFamily: 'inherit', margin: 0,
  },
  errorBox: {
    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#dc2626', borderRadius: '8px', padding: '10px 14px', fontSize: '0.875rem',
  },
  actionBtn: {
    padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem',
    border: 'none', background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
    color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '8px',
    boxShadow: '0 3px 12px rgba(8,145,178,0.28)', transition: 'opacity 0.2s', marginTop: '4px',
  },
  spin: { display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '1rem' },
  resultCard: {
    background: '#fff', borderRadius: '14px',
    border: '1.5px solid #a5f3fc', boxShadow: '0 2px 14px rgba(8,145,178,0.09)', overflow: 'hidden',
  },
  resultHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 18px', borderBottom: '1px solid #cffafe',
    background: 'rgba(8,145,178,0.04)', flexWrap: 'wrap', gap: '10px',
  },
  resultTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#0e7490' },
  copyBtn: {
    padding: '6px 14px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 600,
    background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.2)',
    color: '#0891b2', cursor: 'pointer',
  },
  pdfBtn: {
    padding: '6px 16px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 700,
    background: 'linear-gradient(135deg, #0891b2, #06b6d4)', border: 'none',
    color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(8,145,178,0.22)',
  },
  resultText: {
    padding: '18px 20px', fontSize: '0.875rem', lineHeight: 1.8,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#1f2937',
    fontFamily: 'inherit', maxHeight: '500px', overflowY: 'auto', margin: 0,
  },
  resultFoot: {
    padding: '9px 18px', borderTop: '1px solid #f3f4f6',
    background: '#f0fdff', fontSize: '0.75rem', color: '#0891b2',
  },
  denied:      { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '10px' },
  deniedTitle: { fontSize: '1.3rem', fontWeight: 700, color: '#0e7490' },
  deniedSub:   { color: '#6b7280', fontSize: '0.9rem', maxWidth: '340px' },
}
