/**
 * ProductRequirementPage.jsx
 *
 * Supported upload formats: .txt, .md, .pdf, .doc, .docx
 *
 * Flow:
 *  1. User inputs via Paste Text / Upload File / Jira User Story
 *  2. Clicks "Generate Requirements Document"
 *     → calls agentAPI.run('product_requirement', ...) → backend CrewAI agent
 *  3. Refined document displayed in result pane below
 *  4. User can Copy / Download PDF
 *  5. User clicks "Approve" → document locked, approval banner shown
 */
import React, { useState, useRef } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { agentAPI } from '../api/client'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

// Point pdf.js worker to the bundled worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const TABS = [
  { id: 'paste',  label: 'Paste Text' },
  { id: 'upload', label: 'Upload File' },
  { id: 'jira',   label: 'Jira User Story' },
]

/* ── PDF printer ───────────────────────────────────────────────── */
function downloadAsPDF(content, approved = false) {
  const sanitized = content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')

  const approvedBadge = approved
    ? `<div class="approved-badge">✅ APPROVED — ${new Date().toLocaleString()}</div>`
    : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Product Requirements Document</title>
<style>
  @page { margin: 2cm }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 1.8; color: #1f2937 }
  h1   { font-size: 20px; color: #4c1d95; border-bottom: 2px solid #a855f7; padding-bottom: 8px; margin-bottom: 14px }
  .meta { font-size: 11px; color: #6b7280; margin-bottom: 8px }
  .approved-badge {
    display: inline-block; background: #dcfce7; color: #166534;
    border: 1px solid #bbf7d0; border-radius: 6px;
    padding: 5px 14px; font-size: 11px; font-weight: 700; margin-bottom: 20px;
  }
  .content { white-space: pre-wrap }
  .footer  { margin-top: 40px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px }
</style></head><body>
<h1>📋 Product Requirements Document</h1>
<div class="meta">Generated on ${new Date().toLocaleString()} · NatWest Automator</div>
${approvedBadge}
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

/* ── File readers ──────────────────────────────────────────────── */

/** Read plain text / markdown as-is */
function readAsPlainText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file, 'UTF-8')
  })
}

/** Extract text from a PDF using pdf.js */
async function readPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text    = content.items.map(item => item.str).join(' ')
    pages.push(`--- Page ${i} ---\n${text}`)
  }
  return pages.join('\n\n')
}

/** Extract text from a DOCX using mammoth */
async function readDOCX(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

/** Dispatch to the right reader based on file type / extension */
async function readFileAsText(file) {
  const name = file.name.toLowerCase()
  const type = file.type

  // Plain text & markdown
  if (
    type === 'text/plain' ||
    type === 'text/markdown' ||
    name.endsWith('.txt') ||
    name.endsWith('.md')
  ) {
    return readAsPlainText(file)
  }

  // PDF
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return readPDF(file)
  }

  // DOCX / DOC
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/msword' ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  ) {
    return readDOCX(file)
  }

  throw new Error(`Unsupported file type: ${file.name}`)
}

/* ── Component ─────────────────────────────────────────────────── */
export default function ProductRequirementPage() {
  const { hasPermission } = useAuth()

  // input state
  const [activeTab, setActiveTab]       = useState('paste')
  const [pasteText, setPasteText]       = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [fileContent, setFileContent]   = useState('')
  const [dragOver, setDragOver]         = useState(false)
  const [jiraKey, setJiraKey]           = useState('')
  const [jiraText, setJiraText]         = useState('')
  const fileInputRef = useRef()

  // async state
  const [loading, setLoading]       = useState(false)
  const [fileParsing, setFileParsing] = useState(false)  // file extraction spinner
  const [error, setError]           = useState('')

  // result state
  const [result, setResult]     = useState(null)       // raw text from agent
  const [approved, setApproved] = useState(false)      // approval flag
  const [approvedAt, setApprovedAt] = useState(null)   // timestamp

  const resultRef = useRef(null) // scroll to result

  /* ── access guard ── */
  if (!hasPermission('product_requirement')) {
    return (
      <DashboardLayout title="Product Requirement">
        <div style={s.denied}>
          <div style={{ fontSize: '3rem' }}>🔒</div>
          <h3 style={s.deniedTitle}>Access Restricted</h3>
          <p style={s.deniedSub}>Your role does not have permission to access this agent.</p>
        </div>
      </DashboardLayout>
    )
  }

  /* ── file helpers ── */
  const handleFile = async (file) => {
    if (!file) return
    const name = file.name.toLowerCase()
    const allowed = name.endsWith('.txt') || name.endsWith('.md') ||
                    name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx')
    if (!allowed) {
      setError('Unsupported file type. Please upload a .txt, .md, .pdf, .doc, or .docx file.')
      return
    }
    setError('')
    setUploadedFile(file)
    setFileContent('')
    setFileParsing(true)
    try {
      const text = await readFileAsText(file)
      setFileContent(text)
    } catch (err) {
      setError(`Failed to read file: ${err.message}`)
      setUploadedFile(null)
    } finally {
      setFileParsing(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }

  /* ── task builder ── */
  const buildTask = () => {
    if (activeTab === 'paste')  return pasteText.trim()
    if (activeTab === 'upload') return fileContent.trim()
    if (activeTab === 'jira') {
      const prefix = jiraKey.trim() ? `Jira Issue: ${jiraKey.trim()}\n\n` : ''
      return prefix + jiraText.trim()
    }
    return ''
  }

  const isReady = () => {
    if (activeTab === 'paste')  return pasteText.trim().length > 0
    if (activeTab === 'upload') return fileContent.trim().length > 0 && !fileParsing
    if (activeTab === 'jira')   return jiraText.trim().length > 0
    return false
  }

  /* ── generate ── */
  const handleGenerate = async () => {
    const task = buildTask()
    if (!task) return
    setLoading(true)
    setError('')
    setResult(null)
    setApproved(false)
    setApprovedAt(null)
    try {
      const data = await agentAPI.run('product_requirement', task, null, 'groq')
      setResult(data.result)
      // scroll to result after render
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      setError(err.response?.data?.detail || 'Agent execution failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── approve ── */
  const handleApprove = () => {
    setApproved(true)
    setApprovedAt(new Date().toLocaleString())
  }

  /* ── tab switch ── */
  const switchTab = (id) => {
    setActiveTab(id)
    setError('')
    setResult(null)
    setApproved(false)
  }

  /* ── render ── */
  return (
    <DashboardLayout title="Product Requirement">
      <div style={s.page}>

        {/* Header */}
        <div>
          <h2 style={s.pageTitle}>Product Requirement</h2>
          <p style={s.pageSubtitle}>
            Analyze product requirements from pasted text, uploaded files, or Jira user stories.
            The AI agent will return a refined, structured requirements document.
          </p>
        </div>

        {/* ── Input card ── */}
        <div style={s.card}>

          {/* Tabs */}
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

            {/* ── PASTE ── */}
            {activeTab === 'paste' && (
              <>
                <p style={s.sectionTitle}>Paste Text</p>
                <textarea
                  style={s.textarea}
                  rows={9}
                  placeholder={
                    'Enter your product requirements, user story, or BRD here…\n\n' +
                    'Example:\n' +
                    'User Story: As a registered user, I want to reset my password\n' +
                    'so that I can regain access to my account.\n\n' +
                    'Acceptance Criteria:\n' +
                    '- User can request a password reset via email\n' +
                    '- Reset link expires after 24 hours\n' +
                    '- New password must meet complexity requirements'
                  }
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                />
              </>
            )}

            {/* ── UPLOAD ── */}
            {activeTab === 'upload' && (
              <>
                <p style={s.sectionTitle}>Upload File</p>
                <div
                  style={{
                    ...s.dropZone,
                    borderColor: dragOver ? '#7c3aed' : uploadedFile ? '#22c55e' : '#d8b4fe',
                    background:  dragOver ? 'rgba(124,58,237,0.04)' : uploadedFile ? 'rgba(34,197,94,0.03)' : '#faf5ff',
                  }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files[0])}
                  />
                  {uploadedFile ? (
                    <div style={s.fileRow}>
                      <span style={{ fontSize: '1.8rem' }}>{fileParsing ? '⏳' : '📄'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={s.fileName}>{uploadedFile.name}</div>
                        <div style={s.fileMeta}>
                          {fileParsing
                            ? 'Extracting text…'
                            : `${(uploadedFile.size / 1024).toFixed(1)} KB · ${fileContent.length.toLocaleString()} chars extracted`
                          }
                        </div>
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
                      <p style={s.dropHint}>Supports .txt · .md · .pdf · .docx</p>
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

            {/* ── JIRA ── */}
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
                    'Paste the Jira story description or acceptance criteria here…\n\n' +
                    'Example:\n' +
                    'Summary: Implement OAuth2 login with Google\n\n' +
                    'As a user, I want to sign in using my Google account so that\n' +
                    "I don't need to remember a separate password.\n\n" +
                    'Acceptance Criteria:\n' +
                    '✓ "Sign in with Google" button visible on login page\n' +
                    '✓ Successful auth redirects to dashboard\n' +
                    '✓ Failed auth shows error message'
                  }
                  value={jiraText}
                  onChange={e => setJiraText(e.target.value)}
                />
              </>
            )}

            {/* Error */}
            {error && <div style={s.errorBox}>⚠️ {error}</div>}

            {/* Generate button */}
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
                ? <><span style={s.spin}>⟳</span> Analyzing requirements…</>
                : '📋  Generate Requirements Document'
              }
            </button>
          </div>
        </div>

        {/* ── Result pane ── */}
        {result && (
          <div ref={resultRef} style={{ ...s.resultCard, borderColor: approved ? '#bbf7d0' : '#d8b4fe' }}>

            {/* Result header */}
            <div style={{ ...s.resultHead, background: approved ? 'rgba(34,197,94,0.05)' : 'rgba(124,58,237,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1rem' }}>{approved ? '✅' : '📄'}</span>
                <span style={{ ...s.resultTitle, color: approved ? '#166534' : '#4c1d95' }}>
                  {approved ? 'Requirements Document — Approved' : 'Requirements Document Generated'}
                </span>
                {approved && (
                  <span style={s.approvedBadge}>
                    ✅ Approved · {approvedAt}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button style={s.copyBtn} onClick={() => navigator.clipboard.writeText(result)}>
                  📋 Copy
                </button>
                <button style={s.pdfBtn} onClick={() => downloadAsPDF(result, approved)}>
                  ⬇️ Download PDF
                </button>
                {!approved && (
                  <button style={s.approveBtn} onClick={handleApprove}>
                    ✅ Approve
                  </button>
                )}
              </div>
            </div>

            {/* Document body */}
            <div style={s.resultBody}>
              {/* Approved watermark strip */}
              {approved && (
                <div style={s.approvedStrip}>
                  ✅ This requirements document has been approved and is locked for review.
                </div>
              )}
              <pre style={{ ...s.resultText, opacity: approved ? 0.92 : 1 }}>{result}</pre>
            </div>

            {/* Footer */}
            <div style={{ ...s.resultFoot, background: approved ? '#f0fdf4' : '#faf5ff' }}>
              {approved
                ? <span style={{ color: '#16a34a', fontWeight: 600 }}>
                    🔒 Document approved — download the PDF to share with your team.
                  </span>
                : <span style={{ color: '#7c3aed' }}>
                    💡 Review the document above. Click <strong>Approve</strong> to lock it, or <strong>Download PDF</strong> to save.
                  </span>
              }
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}

/* ── Styles ────────────────────────────────────────────────────── */
const s = {
  page:         { display: 'flex', flexDirection: 'column', gap: '20px' },
  pageTitle:    { fontSize: '1.45rem', fontWeight: 800, color: '#1f2937', marginBottom: '4px' },
  pageSubtitle: { fontSize: '0.85rem', color: '#6b7280' },

  /* input card */
  card: {
    background: '#fff', borderRadius: '14px',
    border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden',
  },

  /* tabs */
  tabBar: { display: 'flex', borderBottom: '1.5px solid #e5e7eb' },
  tab: {
    padding: '12px 22px', fontSize: '0.875rem', fontWeight: 500,
    cursor: 'pointer', background: 'none', border: 'none', color: '#6b7280',
    borderBottom: '2px solid transparent', marginBottom: '-1.5px',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: { color: '#7c3aed', fontWeight: 600, borderBottom: '2px solid #7c3aed' },

  /* body */
  body:         { padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '12px' },
  sectionTitle: { fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '2px' },

  /* inputs */
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

  /* drop zone */
  dropZone: {
    border: '2px dashed', borderRadius: '10px', padding: '28px 20px',
    cursor: 'pointer', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px',
  },
  dropText: { color: '#374151', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' },
  dropLink: { color: '#7c3aed', fontWeight: 700, textDecoration: 'underline' },
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

  /* file preview */
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

  /* error */
  errorBox: {
    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#dc2626', borderRadius: '8px', padding: '10px 14px', fontSize: '0.875rem',
  },

  /* generate button */
  actionBtn: {
    padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem',
    border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '8px',
    boxShadow: '0 3px 12px rgba(124,58,237,0.28)', transition: 'opacity 0.2s', marginTop: '4px',
  },
  spin: { display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '1rem' },

  /* result card */
  resultCard: {
    background: '#fff', borderRadius: '14px', border: '1.5px solid',
    boxShadow: '0 2px 14px rgba(0,0,0,0.06)', overflow: 'hidden',
    transition: 'border-color 0.3s',
  },
  resultHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
    flexWrap: 'wrap', gap: '10px', transition: 'background 0.3s',
  },
  resultTitle:  { fontSize: '0.9rem', fontWeight: 700 },
  approvedBadge: {
    padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
    background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0',
  },

  /* action buttons */
  copyBtn: {
    padding: '6px 14px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 600,
    background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
    color: '#7c3aed', cursor: 'pointer',
  },
  pdfBtn: {
    padding: '6px 16px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 700,
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none',
    color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(124,58,237,0.22)',
  },
  approveBtn: {
    padding: '6px 18px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 700,
    background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none',
    color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
  },

  /* result body */
  resultBody: { position: 'relative' },
  approvedStrip: {
    background: '#dcfce7', borderBottom: '1px solid #bbf7d0',
    padding: '8px 20px', fontSize: '0.8rem', fontWeight: 600, color: '#166534',
  },
  resultText: {
    padding: '18px 20px', fontSize: '0.875rem', lineHeight: 1.8,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#1f2937',
    fontFamily: 'inherit', maxHeight: '520px', overflowY: 'auto', margin: 0,
  },
  resultFoot: {
    padding: '10px 20px', borderTop: '1px solid #f3f4f6',
    fontSize: '0.75rem', transition: 'background 0.3s',
  },

  /* denied */
  denied:      { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '10px' },
  deniedTitle: { fontSize: '1.3rem', fontWeight: 700, color: '#4c1d95' },
  deniedSub:   { color: '#6b7280', fontSize: '0.9rem', maxWidth: '340px' },
}
