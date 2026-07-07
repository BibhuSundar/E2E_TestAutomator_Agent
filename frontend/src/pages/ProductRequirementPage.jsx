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
import React, { useState, useEffect, useRef } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { agentAPI, jiraAPI, filesAPI, configAPI } from '../api/client'

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

/* ── Upload to server for parsing & storage ──────────────────── */
async function uploadFileToServer(file) {
  const data = await filesAPI.upload(file, 'product_requirement')
  return data.text
}

/* ── Component ─────────────────────────────────────────────────── */
export default function ProductRequirementPage() {
  const { hasPermission } = useAuth()

  // input state
  const [activeTab, setActiveTab]       = useState('paste')
  const [pasteText, setPasteText]       = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [fileContent, setFileContent]   = useState('')
  const [fileEditable, setFileEditable] = useState('')
  const [dragOver, setDragOver]         = useState(false)
  const [jiraKey, setJiraKey]           = useState('')
  const [jiraText, setJiraText]         = useState('')
  const [jiraFetching, setJiraFetching] = useState(false)  // fetch spinner
  const [jiraFetched, setJiraFetched]   = useState(null)   // fetched issue data
  const fileInputRef = useRef()

  // async state
  const [loading, setLoading]       = useState(false)
  const [fileParsing, setFileParsing] = useState(false)  // file extraction spinner
  const [error, setError]           = useState('')

  // result state
  const [result, setResult]         = useState(null)       // raw text from agent
  const [approved, setApproved]     = useState(false)      // approval flag
  const [approvedAt, setApprovedAt] = useState(null)       // timestamp
  const [rejected, setRejected]     = useState(false)      // rejection flag
  const [rejectedAt, setRejectedAt] = useState(null)       // timestamp

  const [jiraProjectKey, setJiraProjectKey]   = useState('')
  const [jiraUploading, setJiraUploading]     = useState(false)
  const [jiraUploadResult, setJiraUploadResult] = useState(null)
  const [jiraUploaded, setJiraUploaded]       = useState(false)

  const resultRef = useRef(null) // scroll to result

  useEffect(() => {
    configAPI.getJira().then(data => {
      if (data.jira_project_key) setJiraProjectKey(data.jira_project_key)
    }).catch(() => {})
  }, [])

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
    setError('')
    setUploadedFile(file)
    setFileContent('')
    setFileEditable('')
    setFileParsing(true)
    try {
      const text = await uploadFileToServer(file)
      setFileContent(text)
      setFileEditable(text)
    } catch (err) {
      setError(`Failed to process file: ${err.message}`)
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
    if (activeTab === 'upload') return fileEditable.trim()
    if (activeTab === 'jira') {
      const prefix = jiraKey.trim() ? `Jira Issue: ${jiraKey.trim()}\n\n` : ''
      return prefix + jiraText.trim()
    }
    return ''
  }

  const isReady = () => {
    if (activeTab === 'paste')  return pasteText.trim().length > 0
    if (activeTab === 'upload') return fileEditable.trim().length > 0 && !fileParsing
    if (activeTab === 'jira')   return jiraText.trim().length > 0 || jiraFetched !== null
    return false
  }

  /* ── fetch jira issue ── */
  const handleFetchJira = async () => {
    if (!jiraKey.trim()) return
    setJiraFetching(true)
    setError('')
    setJiraFetched(null)
    try {
      const data = await jiraAPI.fetchIssue(jiraKey.trim())
      setJiraFetched(data)
      setJiraText(data.formatted)  // auto-populate textarea with fetched content
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to fetch Jira issue "${jiraKey}". Check the key and your Jira config.`)
    } finally {
      setJiraFetching(false)
    }
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
    setJiraUploaded(false)
    setJiraUploadResult(null)
    try {
      const data = await agentAPI.run('product_requirement', task, null, 'ollama')
      setResult(data.result)
      setRejected(false)
      setRejectedAt(null)
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
    filesAPI.saveOutput('product_requirement', result).catch(() => {})
  }

  /* ── reject ── */
  const handleReject = () => {
    setRejected(true)
    setRejectedAt(new Date().toLocaleString())
  }

  /* ── upload to jira ── */
  const handleUploadToJira = async () => {
    let key = jiraProjectKey.trim()
    if (!key) {
      try {
        const config = await configAPI.getJira()
        if (config.jira_project_key) {
          key = config.jira_project_key
          setJiraProjectKey(key)
        }
      } catch {}
    }
    if (!key) {
      setJiraUploadResult({ success: false, error: 'Jira Project Key is not configured. Go to Settings → Jira Configuration to set it up.' })
      return
    }
    setJiraUploading(true)
    setJiraUploadResult(null)
    try {
      const data = await jiraAPI.createIssue(
        key,
        `Refine Product Requirement generated by Test Automator - ${new Date().toLocaleString()}`,
        result
      )
      setJiraUploadResult({ success: true, key: data.issue_key, url: data.issue_url })
      setJiraUploaded(true)
    } catch (err) {
      setJiraUploadResult({ success: false, error: err.response?.data?.detail || 'Failed to create Jira issue.' })
    } finally {
      setJiraUploading(false)
    }
  }

  /* ── tab switch ── */
  const switchTab = (id) => {
    setActiveTab(id)
    setError('')
    setResult(null)
    setApproved(false)
    setApprovedAt(null)
    setRejected(false)
    setRejectedAt(null)
    setJiraFetched(null)
    setJiraUploaded(false)
    setJiraUploadResult(null)
    setJiraProjectKey('')
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
                        onClick={e => { e.stopPropagation(); setUploadedFile(null); setFileContent(''); setFileEditable('') }}
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
                  <>
                    <label style={s.sectionTitle}>Edit before generating</label>
                    <textarea
                      style={s.textarea}
                      rows={6}
                      value={fileEditable}
                      onChange={e => setFileEditable(e.target.value)}
                    />
                  </>
                )}
              </>
            )}

            {/* ── JIRA ── */}
            {activeTab === 'jira' && (
              <>
                <p style={s.sectionTitle}>Jira User Story</p>

                {/* Issue key input + Fetch button */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <input
                    style={{ ...s.input, flex: 1 }}
                    type="text"
                    placeholder="Enter Jira Issue Key — e.g. PROJ-123"
                    value={jiraKey}
                    onChange={e => { setJiraKey(e.target.value); setJiraFetched(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleFetchJira()}
                  />
                  <button
                    style={{
                      ...s.fetchBtn,
                      opacity: jiraFetching || !jiraKey.trim() ? 0.55 : 1,
                      cursor:  jiraFetching || !jiraKey.trim() ? 'not-allowed' : 'pointer',
                    }}
                    onClick={handleFetchJira}
                    disabled={jiraFetching || !jiraKey.trim()}
                  >
                    {jiraFetching
                      ? <><span style={s.spin}>⟳</span> Fetching…</>
                      : '🔍 Fetch'
                    }
                  </button>
                </div>

                {/* Fetched issue preview */}
                {jiraFetched && (
                  <div style={s.jiraPreviewCard}>
                    <div style={s.jiraPreviewHead}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={s.jiraKeyBadge}>{jiraFetched.issue_key}</span>
                        <span style={s.jiraIssueSummary}>{jiraFetched.summary}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {jiraFetched.raw?.status && (
                          <span style={s.jiraMeta}>{jiraFetched.raw.status}</span>
                        )}
                        {jiraFetched.raw?.priority && (
                          <span style={{ ...s.jiraMeta, background: 'rgba(245,158,11,0.1)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }}>
                            {jiraFetched.raw.priority}
                          </span>
                        )}
                        {jiraFetched.raw?.type && (
                          <span style={{ ...s.jiraMeta, background: 'rgba(59,130,246,0.08)', color: '#1d4ed8', border: '1px solid rgba(59,130,246,0.15)' }}>
                            {jiraFetched.raw.type}
                          </span>
                        )}
                      </div>
                    </div>
                    <pre style={s.jiraPreviewText}>{jiraFetched.formatted}</pre>
                  </div>
                )}

                {/* Manual override textarea */}
                <label style={{ ...s.sectionTitle, marginTop: jiraFetched ? '4px' : '0' }}>
                  {jiraFetched ? 'Edit before generating (optional)' : 'Or paste Jira story manually'}
                </label>
                <textarea
                  style={s.textarea}
                  rows={jiraFetched ? 6 : 9}
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
                : '📋  Generate Refined Requirement Document'
              }
            </button>
          </div>
        </div>

        {/* ── Result pane ── */}
        {result && (
          <div ref={resultRef} style={{
            ...s.resultCard,
            borderColor: approved ? '#bbf7d0' : rejected ? '#fecaca' : '#d8b4fe',
          }}>

            {/* Result header */}
            <div style={{
              ...s.resultHead,
              background: approved ? 'rgba(34,197,94,0.05)' : rejected ? 'rgba(239,68,68,0.05)' : 'rgba(124,58,237,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1rem' }}>{approved ? '✅' : rejected ? '❌' : '📄'}</span>
                <span style={{ ...s.resultTitle, color: approved ? '#166534' : rejected ? '#dc2626' : '#4c1d95' }}>
                  {approved ? 'Requirements Document — Approved' : rejected ? 'Requirements Document — Rejected' : 'Requirements Document Generated'}
                </span>
                {approved && (
                  <span style={s.approvedBadge}>
                    ✅ Approved · {approvedAt}
                  </span>
                )}
                {rejected && (
                  <span style={s.rejectedBadge}>
                    ❌ Rejected · {rejectedAt}
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
                <button
                  style={{
                    ...s.jiraUploadBtn,
                    opacity: !approved || jiraUploading || jiraUploaded ? 0.55 : 1,
                    cursor: !approved || jiraUploading || jiraUploaded ? 'not-allowed' : 'pointer',
                  }}
                  onClick={handleUploadToJira}
                  disabled={!approved || jiraUploading || jiraUploaded}
                >
                  {jiraUploading ? <><span style={s.spin}>⟳</span> Uploading...</> : jiraUploaded ? '☁️ Uploaded' : '☁️ Upload Jira'}
                </button>
                {!approved && !rejected && (
                  <button style={s.approveBtn} onClick={handleApprove}>
                    ✅ Approve
                  </button>
                )}
                {!approved && !rejected && (
                  <button style={s.rejectBtn} onClick={handleReject}>
                    ❌ Reject
                  </button>
                )}
              </div>
            </div>

            {/* Document body */}
            <div style={s.resultBody}>
              {approved && (
                <div style={s.approvedStrip}>
                  ✅ This requirements document has been approved and is locked for review.
                </div>
              )}
              {rejected && (
                <div style={s.rejectedStrip}>
                  ❌ This requirements document has been rejected. Click "Generate Refined Requirement Document" to try again.
                </div>
              )}
              <pre style={{ ...s.resultText, opacity: rejected ? 0.5 : 1 }}>{result}</pre>
            </div>

            {/* Footer */}
            <div style={{ ...s.resultFoot, background: approved ? '#f0fdf4' : rejected ? '#fef2f2' : '#faf5ff' }}>
              {approved
                ? <span style={{ color: '#16a34a', fontWeight: 600 }}>
                    🔒 Document approved — download the PDF to share with your team.
                  </span>
                : rejected
                  ? <span style={{ color: '#dc2626', fontWeight: 600 }}>
                    ❌ Document rejected — click <strong>Generate Refined Requirement Document</strong> to try again.
                  </span>
                  : <span style={{ color: '#7c3aed' }}>
                      💡 Review the document above. Click <strong>Approve</strong> to lock it or <strong>Reject</strong> to discard it.
                    </span>
              }
            </div>
          </div>
        )}

        {jiraUploadResult && (
          <div style={{
            ...s.resultCard,
            borderColor: jiraUploadResult.success ? '#bbf7d0' : '#fecaca',
          }}>
            <div style={{
              ...s.resultHead,
              background: jiraUploadResult.success ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
              borderColor: jiraUploadResult.success ? '#bbf7d0' : '#fecaca',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem' }}>{jiraUploadResult.success ? '✅' : '❌'}</span>
                <span style={{ ...s.resultTitle, color: jiraUploadResult.success ? '#166534' : '#dc2626' }}>
                  {jiraUploadResult.success ? 'Uploaded to Jira' : 'Upload Failed'}
                </span>
              </div>
            </div>
            <div style={{ padding: '14px 18px', fontSize: '0.85rem', color: '#374151' }}>
              {jiraUploadResult.success ? (
                <span>
                  Issue <strong>{jiraUploadResult.key}</strong> created successfully.{' '}
                  <a href={jiraUploadResult.url} target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed', fontWeight: 600 }}>
                    Open in Jira ↗
                  </a>
                </span>
              ) : (
                <span style={{ color: '#dc2626' }}>{jiraUploadResult.error}</span>
              )}
            </div>
            <div style={s.resultFoot}>
              <button
                style={{ ...s.clearBtn, fontSize: '0.75rem', padding: '4px 12px', width: 'auto', height: 'auto' }}
                onClick={() => setJiraUploadResult(null)}
              >Dismiss</button>
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

  /* fetch button */
  fetchBtn: {
    padding: '10px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem',
    border: 'none', background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px',
    boxShadow: '0 2px 8px rgba(37,99,235,0.25)', transition: 'opacity 0.2s', whiteSpace: 'nowrap',
  },

  /* jira preview card */
  jiraPreviewCard: {
    border: '1px solid #bfdbfe', borderRadius: '10px',
    background: '#eff6ff', overflow: 'hidden',
  },
  jiraPreviewHead: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '10px 14px', borderBottom: '1px solid #bfdbfe',
    background: '#dbeafe', flexWrap: 'wrap', gap: '8px',
  },
  jiraKeyBadge: {
    padding: '2px 8px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 700,
    background: '#2563eb', color: '#fff', flexShrink: 0,
  },
  jiraIssueSummary: {
    fontSize: '0.85rem', fontWeight: 600, color: '#1e3a8a',
  },
  jiraMeta: {
    padding: '2px 8px', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 600,
    background: 'rgba(34,197,94,0.1)', color: '#166534', border: '1px solid rgba(34,197,94,0.2)',
  },
  jiraPreviewText: {
    padding: '12px 14px', fontSize: '0.8rem', lineHeight: 1.65,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#1e3a8a',
    maxHeight: '200px', overflowY: 'auto', fontFamily: 'inherit', margin: 0,
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
  rejectBtn: {
    padding: '6px 18px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 700,
    background: 'linear-gradient(135deg, #dc2626, #ef4444)', border: 'none',
    color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
  },
  jiraUploadBtn: {
    padding: '6px 16px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 700,
    background: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: 'none',
    color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
  },

  /* result body */
  resultBody: { position: 'relative' },
  approvedStrip: {
    background: '#dcfce7', borderBottom: '1px solid #bbf7d0',
    padding: '8px 20px', fontSize: '0.8rem', fontWeight: 600, color: '#166534',
  },
  rejectedBadge: {
    padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
    background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
  },
  rejectedStrip: {
    background: '#fef2f2', borderBottom: '1px solid #fecaca',
    padding: '8px 20px', fontSize: '0.8rem', fontWeight: 600, color: '#dc2626',
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
