import React, { useState, useEffect, useRef, useCallback } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { agentAPI, jiraAPI, filesAPI } from '../api/client'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const FRAMEWORKS = ['Playwright', 'Selenium', 'Cypress', 'pytest', 'JUnit']
const TABS = [
  { id: 'paste',    label: 'Paste Test Cases' },
  { id: 'upload',   label: 'Upload File' },
  { id: 'jira',     label: 'Jira User Story' },
  { id: 'existing', label: 'Use Existing Test Cases' },
]

/* ── file readers ── */
function readAsPlainText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file, 'UTF-8')
  })
}
async function readPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(`--- Page ${i} ---\n${content.items.map(x => x.str).join(' ')}`)
  }
  return pages.join('\n\n')
}
async function readDOCX(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
async function readFileAsText(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.txt') || name.endsWith('.md')) return readAsPlainText(file)
  if (name.endsWith('.pdf')) return readPDF(file)
  if (name.endsWith('.docx') || name.endsWith('.doc')) return readDOCX(file)
  throw new Error(`Unsupported file type: ${file.name}`)
}

/* ── PDF download ── */
function downloadAsPDF(content) {
  const sanitized = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Automation Scripts</title>
<style>@page{margin:2cm}body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;line-height:1.7;color:#1f2937}
h1{font-size:18px;color:#7c3aed;border-bottom:2px solid #a855f7;padding-bottom:6px;margin-bottom:14px}
.meta{font-size:10px;color:#6b7280;margin-bottom:20px}.content{white-space:pre-wrap;font-family:monospace;font-size:11px}
.footer{margin-top:40px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px}
</style></head><body>
<h1>⚡ Automation Script</h1>
<div class="meta">Generated on ${new Date().toLocaleString()} · Test Automator</div>
<div class="content">${sanitized}</div>
<div class="footer">Confidential · Test Automator AI Platform</div>
</body></html>`
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none'
  document.body.appendChild(iframe)
  iframe.contentDocument.open()
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()
  setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 1000) }, 300)
}

export default function AutomationPage() {
  const { hasPermission } = useAuth()
  const [framework, setFramework]       = useState('Playwright')
  const [targetUrl, setTargetUrl]       = useState('')
  const [usePOM, setUsePOM]             = useState(true)
  const [activeTab, setActiveTab]       = useState('paste')
  const [pasteText, setPasteText]       = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [fileContent, setFileContent]   = useState('')
  const [fileEditable, setFileEditable] = useState('')
  const [dragOver, setDragOver]         = useState(false)
  const [fileParsing, setFileParsing]   = useState(false)
  const [jiraKey, setJiraKey]           = useState('')
  const [jiraText, setJiraText]         = useState('')
  const [jiraFetched, setJiraFetched]   = useState(null)
  const [jiraFetching, setJiraFetching] = useState(false)
  const [outputFiles, setOutputFiles]   = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [existingContent, setExistingContent] = useState('')
  const [fetchingFiles, setFetchingFiles] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [result, setResult]             = useState(null)
  const [error, setError]               = useState('')
  const [approved, setApproved]         = useState(false)
  const [approvedAt, setApprovedAt]     = useState(null)
  const [rejected, setRejected]         = useState(false)
  const [rejectedAt, setRejectedAt]     = useState(null)
  const fileInputRef = useRef()
  const resultRef    = useRef()

  if (!hasPermission('automation')) {
    return (
      <DashboardLayout title="Automation">
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
    setError('')
    setUploadedFile(file)
    setFileContent('')
    setFileEditable('')
    setFileParsing(true)
    try {
      const data = await filesAPI.upload(file, 'automation')
      setFileContent(data.text)
      setFileEditable(data.text)
    } catch (err) {
      setError(`Failed to process file: ${err.message}`)
      setUploadedFile(null)
    } finally {
      setFileParsing(false)
    }
  }

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }

  const handleFetchJira = async () => {
    if (!jiraKey.trim()) return
    setJiraFetching(true)
    setError('')
    setJiraFetched(null)
    try {
      const data = await jiraAPI.fetchIssue(jiraKey.trim())
      setJiraFetched(data)
      setJiraText(data.formatted)
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to fetch Jira issue "${jiraKey}".`)
    } finally {
      setJiraFetching(false)
    }
  }

  const fetchOutputFiles = useCallback(async () => {
    setFetchingFiles(true)
    try {
      const data = await filesAPI.listOutput('designing')
      setOutputFiles(data.files || [])
    } catch {
      setOutputFiles([])
    } finally {
      setFetchingFiles(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'existing') fetchOutputFiles()
  }, [activeTab, fetchOutputFiles])

  const selectExistingFile = async (fname) => {
    setSelectedFile(fname)
    setExistingContent('')
    try {
      const text = await filesAPI.readOutput(`design/${fname}`)
      setExistingContent(text)
    } catch {
      setError('Failed to load test case file.')
    }
  }

  const buildTask = () => {
    const urlNote = targetUrl.trim() ? `Target URL: ${targetUrl.trim()}\n` : ''
    const pomNote = usePOM ? 'Use Page Object Model (POM) pattern.\n' : ''
    const header  = `Framework: ${framework}\n${urlNote}${pomNote}\n`
    if (activeTab === 'paste')    return header + pasteText.trim()
    if (activeTab === 'upload')   return header + fileEditable.trim()
    if (activeTab === 'jira')     return header + (jiraKey.trim() ? `Jira Issue: ${jiraKey.trim()}\n\n` : '') + jiraText.trim()
    if (activeTab === 'existing') return header + existingContent.trim()
    return ''
  }

  const isReady = () => {
    if (activeTab === 'paste')    return pasteText.trim().length > 0
    if (activeTab === 'upload')   return fileEditable.trim().length > 0 && !fileParsing
    if (activeTab === 'jira')     return jiraText.trim().length > 0
    if (activeTab === 'existing') return existingContent.trim().length > 0
    return false
  }

  const handleGenerate = async () => {
    const task = buildTask()
    if (!task) return
    setLoading(true); setError(''); setResult(null); setApproved(false); setApprovedAt(null); setRejected(false); setRejectedAt(null)
    try {
      const data = await agentAPI.run('automation', task, null, 'ollama')
      setResult(data.result)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      setError(err.response?.data?.detail || 'Agent execution failed. Please try again.')
    } finally { setLoading(false) }
  }

  /* ── approve / reject ── */
  const handleApprove = () => {
    setApproved(true); setApprovedAt(new Date().toLocaleString())
    filesAPI.saveOutput('automation', result).catch(() => {})
  }
  const handleReject = () => {
    setRejected(true); setRejectedAt(new Date().toLocaleString())
  }

  const switchTab = (id) => { setActiveTab(id); setError(''); setResult(null); setApproved(false); setApprovedAt(null); setRejected(false); setRejectedAt(null); setJiraFetched(null); setSelectedFile(null); setExistingContent('') }

  return (
    <DashboardLayout title="Automation">
      <div style={s.page}>

        {/* Header */}
        <div>
          <h2 style={s.pageTitle}>Web Script Generator</h2>
          <p style={s.pageSubtitle}>Generate Playwright or Selenium scripts from test cases, uploaded files, or Jira stories</p>
        </div>

        {/* Card */}
        <div style={s.card}>
          <div style={s.cardBody}>

            {/* Row 1: Framework + Target URL */}
            <div style={s.configRow}>
              <div style={s.configField}>
                <label style={s.configLabel}>Framework</label>
                <select style={s.select} value={framework} onChange={e => setFramework(e.target.value)}>
                  {FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div style={{ ...s.configField, flex: 2 }}>
                <label style={s.configLabel}>Target URL</label>
                <input
                  style={s.input}
                  type="text"
                  placeholder="https://example.com"
                  value={targetUrl}
                  onChange={e => setTargetUrl(e.target.value)}
                />
              </div>
            </div>

            {/* POM checkbox */}
            <label style={s.checkRow}>
              <input
                type="checkbox"
                checked={usePOM}
                onChange={e => setUsePOM(e.target.checked)}
                style={s.checkbox}
              />
              <span style={s.checkLabel}>Generate Page Object Model (POM)</span>
            </label>

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

            {/* ── PASTE ── */}
            {activeTab === 'paste' && (
              <>
                <p style={s.sectionTitle}>Test Cases</p>
                <textarea
                  style={s.textarea}
                  rows={9}
                  placeholder={
                    'Enter test cases here…\n\n' +
                    'Example:\n' +
                    'Test: Login Test\n' +
                    'Step 1: Navigate to login page\n' +
                    'Step 2: Enter username and password\n' +
                    'Step 3: Click login button\n' +
                    'Expected: User is redirected to dashboard'
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
                  <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                  {uploadedFile ? (
                    <div style={s.fileRow}>
                      <span style={{ fontSize: '1.8rem' }}>{fileParsing ? '⏳' : '📄'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={s.fileName}>{uploadedFile.name}</div>
                        <div style={s.fileMeta}>{fileParsing ? 'Extracting…' : `${(uploadedFile.size/1024).toFixed(1)} KB · ${fileContent.length.toLocaleString()} chars`}</div>
                      </div>
                      <button style={s.clearBtn} onClick={e => { e.stopPropagation(); setUploadedFile(null); setFileContent(''); setFileEditable('') }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📂</div>
                      <p style={s.dropText}>Drag & drop your file here, or <span style={s.dropLink}>browse</span></p>
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <input
                    style={{ ...s.input, flex: 1 }}
                    type="text"
                    placeholder="Enter Jira Issue Key — e.g. KAN-4"
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
                    {jiraFetching ? <><span style={s.spin}>⟳</span> Fetching...</> : '🔍 Fetch'}
                  </button>
                </div>
                {jiraFetched && (
                  <div style={s.jiraPreviewCard}>
                    <div style={s.jiraPreviewHead}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={s.jiraKeyBadge}>{jiraFetched.issue_key}</span>
                        <span style={s.jiraIssueSummary}>{jiraFetched.summary}</span>
                      </div>
                    </div>
                    <pre style={s.jiraPreviewText}>{jiraFetched.formatted}</pre>
                  </div>
                )}
                <label style={{ ...s.sectionTitle, marginTop: jiraFetched ? '4px' : '0' }}>
                  {jiraFetched ? 'Edit before generating (optional)' : 'Or paste Jira story manually'}
                </label>
                <textarea
                  style={s.textarea}
                  rows={jiraFetched ? 6 : 9}
                  placeholder={
                    'Paste the Jira story or acceptance criteria here…\n\n' +
                    'Example:\n' +
                    'Summary: Product search with filters\n\n' +
                    'As a customer, I want to search and filter products so that\n' +
                    'I can quickly find what I need.\n\n' +
                    'Acceptance Criteria:\n' +
                    '- Search returns results within 2 seconds\n' +
                    '- Filter by category, price range, and rating\n' +
                    '- Empty search shows all products\n' +
                    '- No results shows friendly message'
                  }
                  value={jiraText}
                  onChange={e => setJiraText(e.target.value)}
                />
              </>
            )}

            {/* ── EXISTING ── */}
            {activeTab === 'existing' && (
              <>
                <p style={s.sectionTitle}>Use Existing Test Cases</p>
                <p style={s.hint}>Select a test case document previously generated by the Designing agent.</p>

                {fetchingFiles ? (
                  <div style={s.loadingBox}>⟳ Loading test cases...</div>
                ) : outputFiles.length === 0 ? (
                  <div style={s.emptyBox}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>💭</div>
                    <p>No test case documents found.</p>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                      Go to <strong>Designing</strong> page to generate one first.
                    </p>
                  </div>
                ) : (
                  <div style={s.fileList}>
                    {outputFiles.map(f => (
                      <div
                        key={f.name}
                        style={{
                          ...s.fileListItem,
                          borderColor: selectedFile === f.name ? '#7c3aed' : '#e5e7eb',
                          background: selectedFile === f.name ? 'rgba(124,58,237,0.05)' : '#fff',
                        }}
                        onClick={() => selectExistingFile(f.name)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          <span>📄</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={s.fileListItemName}>{f.name}</div>
                            <div style={s.fileListItemMeta}>
                              {(f.size / 1024).toFixed(1)} KB · {new Date(f.modified).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        {selectedFile === f.name && (
                          <span style={s.selectedBadge}>✓ Selected</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {existingContent && (
                  <>
                    <label style={s.sectionTitle}>Edit before generating</label>
                    <textarea
                      style={s.textarea}
                      rows={6}
                      value={existingContent}
                      onChange={e => setExistingContent(e.target.value)}
                    />
                  </>
                )}
              </>
            )}

            {/* Error */}
            {error && <div style={s.errorBox}>⚠️ {error}</div>}

            {/* Generate button */}
            <button
              style={{ ...s.actionBtn, opacity: loading || !isReady() ? 0.55 : 1, cursor: loading || !isReady() ? 'not-allowed' : 'pointer' }}
              onClick={handleGenerate}
              disabled={loading || !isReady()}
            >
              {loading ? <><span style={s.spin}>⟳</span> Generating scripts…</> : '⚡  Generate Scripts'}
            </button>

          </div>
        </div>

        {/* Result */}
        {result && (
          <div ref={resultRef} style={{
            ...s.resultCard,
            borderColor: approved ? '#bbf7d0' : rejected ? '#fecaca' : '#d8b4fe',
          }}>
            <div style={{
              ...s.resultHead,
              background: approved ? 'rgba(34,197,94,0.05)' : rejected ? 'rgba(239,68,68,0.05)' : 'rgba(124,58,237,0.04)',
              borderColor: approved ? '#bbf7d0' : rejected ? '#fecaca' : '#ede9fe',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{approved ? '✅' : rejected ? '❌' : '✅'}</span>
                <span style={{ ...s.resultTitle, color: approved ? '#166534' : rejected ? '#dc2626' : '#4c1d95' }}>
                  {approved ? 'Automation Script — Approved' : rejected ? 'Automation Script — Rejected' : 'Automation Script Generated'}
                </span>
                <span style={s.frameworkBadge}>{framework}</span>
                {usePOM && <span style={s.pomBadge}>POM</span>}
                {approved && <span style={s.approvedBadge}>✅ Approved · {approvedAt}</span>}
                {rejected && <span style={s.rejectedBadge}>❌ Rejected · {rejectedAt}</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button style={s.copyBtn} onClick={() => navigator.clipboard.writeText(result)}>📋 Copy</button>
                <button style={s.pdfBtn} onClick={() => downloadAsPDF(result)}>⬇️ Download PDF</button>
                {!approved && !rejected && <button style={s.approveBtn} onClick={handleApprove}>✅ Approve</button>}
                {!approved && !rejected && <button style={s.rejectBtn} onClick={handleReject}>❌ Reject</button>}
              </div>
            </div>
            {rejected && (
              <div style={s.rejectedStrip}>❌ This automation script has been rejected. Click Generate Scripts to try again.</div>
            )}
            <pre style={{ ...s.resultText, opacity: rejected ? 0.5 : 1 }}>{result}</pre>
            <div style={{ ...s.resultFoot, background: approved ? '#f0fdf4' : rejected ? '#fef2f2' : '#faf5ff' }}>
              {approved
                ? <span style={{ color: '#16a34a', fontWeight: 600 }}>🔒 Automation script approved.</span>
                : rejected
                  ? <span style={{ color: '#dc2626', fontWeight: 600 }}>❌ Automation script rejected — click <strong>Generate Scripts</strong> to try again.</span>
                  : <span>💡 Review above. Click <strong>Approve</strong> to lock or <strong>Reject</strong> to discard.</span>
              }
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

  card:    { background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' },
  cardBody:{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '14px' },

  /* config row */
  configRow:  { display: 'flex', gap: '14px', flexWrap: 'wrap' },
  configField:{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '140px' },
  configLabel:{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' },

  select: {
    padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
    background: '#fff', fontSize: '0.875rem', color: '#374151',
    fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
  },
  input: {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: '1px solid #d1d5db', background: '#fff', fontSize: '0.875rem',
    outline: 'none', color: '#374151', fontFamily: 'inherit', boxSizing: 'border-box',
  },

  /* checkbox */
  checkRow:   { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  checkbox:   { width: '15px', height: '15px', accentColor: '#7c3aed', cursor: 'pointer' },
  checkLabel: { fontSize: '0.875rem', color: '#374151', fontWeight: 500 },

  /* tabs */
  tabBar: { display: 'flex', borderBottom: '1.5px solid #e5e7eb', marginBottom: '2px' },
  tab: {
    padding: '10px 20px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
    background: 'none', border: 'none', color: '#6b7280',
    borderBottom: '2px solid transparent', marginBottom: '-1.5px',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: { color: '#7c3aed', fontWeight: 600, borderBottom: '2px solid #7c3aed' },

  sectionTitle: { fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '2px' },

  textarea: {
    width: '100%', padding: '12px 14px', borderRadius: '8px',
    border: '1px solid #d1d5db', background: '#fff', fontSize: '0.875rem',
    resize: 'vertical', outline: 'none', color: '#374151', fontFamily: 'inherit',
    lineHeight: 1.65, boxSizing: 'border-box',
  },

  /* drop zone */
  dropZone: {
    border: '2px dashed', borderRadius: '10px', padding: '28px 20px', cursor: 'pointer',
    transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px',
  },
  dropText: { color: '#374151', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' },
  dropLink: { color: '#7c3aed', fontWeight: 700, textDecoration: 'underline' },
  dropHint: { color: '#9ca3af', fontSize: '0.775rem' },
  fileRow:  { display: 'flex', alignItems: 'center', gap: '12px', width: '100%' },
  fileName: { fontWeight: 600, color: '#1f2937', fontSize: '0.875rem', marginBottom: '2px' },
  fileMeta: { fontSize: '0.75rem', color: '#6b7280' },
  clearBtn: {
    marginLeft: 'auto', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#dc2626', borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer',
    fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  preview:     { border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' },
  previewHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' },
  previewText: { padding: '10px 12px', fontSize: '0.78rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#374151', maxHeight: '120px', overflowY: 'auto', fontFamily: 'inherit', margin: 0 },

  fetchBtn: {
    padding: '10px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem',
    border: 'none', background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px',
    boxShadow: '0 2px 8px rgba(37,99,235,0.25)', transition: 'opacity 0.2s', whiteSpace: 'nowrap',
  },
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
  jiraPreviewText: {
    padding: '12px 14px', fontSize: '0.8rem', lineHeight: 1.65,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#1e3a8a',
    maxHeight: '200px', overflowY: 'auto', fontFamily: 'inherit', margin: 0,
  },

  hint:         { fontSize: '0.82rem', color: '#6b7280', marginBottom: '4px' },
  fileList:    { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' },
  fileListItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', borderRadius: '8px', border: '1px solid',
    cursor: 'pointer', gap: '10px', transition: 'all 0.15s',
  },
  fileListItemName: {
    fontSize: '0.82rem', fontWeight: 600, color: '#1f2937',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  fileListItemMeta: { fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' },
  selectedBadge: {
    padding: '2px 8px', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700,
    background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)',
    flexShrink: 0,
  },
  loadingBox: {
    padding: '20px', textAlign: 'center', color: '#7c3aed',
    fontSize: '0.88rem', fontWeight: 600,
  },
  emptyBox: {
    padding: '24px', textAlign: 'center', color: '#6b7280',
    background: '#f9fafb', borderRadius: '8px', fontSize: '0.85rem',
  },
  errorBox: { background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', borderRadius: '8px', padding: '10px 14px', fontSize: '0.875rem' },

  actionBtn: {
    padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem',
    border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '8px',
    boxShadow: '0 3px 12px rgba(124,58,237,0.28)', transition: 'opacity 0.2s', alignSelf: 'flex-start',
  },
  spin: { display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '1rem' },

  resultCard: { background: '#fff', borderRadius: '14px', border: '1.5px solid #d8b4fe', boxShadow: '0 2px 14px rgba(124,58,237,0.09)', overflow: 'hidden' },
  resultHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 18px', borderBottom: '1px solid #ede9fe',
    background: 'rgba(124,58,237,0.04)', flexWrap: 'wrap', gap: '10px',
  },
  resultTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#4c1d95' },
  frameworkBadge: {
    padding: '2px 9px', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700,
    background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)',
  },
  pomBadge: {
    padding: '2px 9px', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700,
    background: 'rgba(8,145,178,0.1)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.2)',
  },
  copyBtn: { padding: '6px 14px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#7c3aed', cursor: 'pointer' },
  pdfBtn:  { padding: '6px 16px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 700, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(124,58,237,0.22)' },
  resultText: { padding: '18px 20px', fontSize: '0.875rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#1f2937', fontFamily: 'monospace', maxHeight: '520px', overflowY: 'auto', margin: 0 },
  resultFoot: { padding: '9px 18px', borderTop: '1px solid #f3f4f6', background: '#faf5ff', fontSize: '0.75rem', color: '#7c3aed' },

  denied:      { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '10px' },
  deniedTitle: { fontSize: '1.3rem', fontWeight: 700, color: '#4c1d95' },
  deniedSub:   { color: '#6b7280', fontSize: '0.9rem', maxWidth: '340px' },

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
  approvedBadge: {
    padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
    background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0',
  },
  rejectedBadge: {
    padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
    background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
  },
  rejectedStrip: {
    background: '#fef2f2', borderBottom: '1px solid #fecaca',
    padding: '8px 20px', fontSize: '0.8rem', fontWeight: 600, color: '#dc2626',
  },
}
