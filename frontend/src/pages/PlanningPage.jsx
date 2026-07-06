import React, { useState, useEffect, useRef, useCallback } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { agentAPI, jiraAPI, filesAPI } from '../api/client'

const TABS = [
  { id: 'paste',    label: 'Paste Text' },
  { id: 'upload',   label: 'Upload File' },
  { id: 'jira',     label: 'Jira User Story' },
  { id: 'existing', label: 'Use Existing Requirement' },
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

export default function PlanningPage() {
  const { hasPermission } = useAuth()
  const [activeTab, setActiveTab]       = useState('paste')
  const [pasteText, setPasteText]       = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [fileContent, setFileContent]   = useState('')
  const [fileEditable, setFileEditable] = useState('')
  const [fileParsing, setFileParsing]   = useState(false)
  const [dragOver, setDragOver]         = useState(false)

  // Jira
  const [jiraKey, setJiraKey]           = useState('')
  const [jiraText, setJiraText]         = useState('')
  const [jiraFetched, setJiraFetched]   = useState(null)
  const [jiraFetching, setJiraFetching] = useState(false)

  const [outputFiles, setOutputFiles]   = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [existingContent, setExistingContent] = useState('')
  const [fetchingFiles, setFetchingFiles] = useState(false)

  const [loading, setLoading]           = useState(false)
  const [strategyLoading, setStrategyLoading] = useState(false)
  const [result, setResult]             = useState(null)
  const [strategyResult, setStrategyResult] = useState(null)
  const [error, setError]               = useState('')
  const [approved, setApproved]         = useState(false)
  const [approvedAt, setApprovedAt]     = useState(null)
  const [rejected, setRejected]         = useState(false)
  const [rejectedAt, setRejectedAt]     = useState(null)
  const [strategyApproved, setStrategyApproved]   = useState(false)
  const [strategyApprovedAt, setStrategyApprovedAt] = useState(null)
  const [strategyRejected, setStrategyRejected]   = useState(false)
  const [strategyRejectedAt, setStrategyRejectedAt] = useState(null)
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

  const fetchOutputFiles = useCallback(async () => {
    setFetchingFiles(true)
    try {
      const data = await filesAPI.listOutput('product_requirement')
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

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setUploadedFile(file)
    setFileContent('')
    setFileEditable('')
    setFileParsing(true)
    try {
      const data = await filesAPI.upload(file, 'planning')
      setFileContent(data.text)
      setFileEditable(data.text)
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

  const selectExistingFile = async (fname) => {
    setSelectedFile(fname)
    setExistingContent('')
    try {
      const text = await filesAPI.readOutput(`requirement/${fname}`)
      setExistingContent(text)
    } catch {
      setError('Failed to load requirement file.')
    }
  }

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

  const buildTask = () => {
    if (activeTab === 'paste')    return pasteText.trim()
    if (activeTab === 'upload')   return fileEditable.trim()
    if (activeTab === 'jira')     return (jiraKey.trim() ? `Jira Issue: ${jiraKey.trim()}\n\n` : '') + jiraText.trim()
    if (activeTab === 'existing') return existingContent.trim()
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
      const data = await agentAPI.run('planning', task, null, 'ollama')
      setResult(data.result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Agent execution failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateStrategy = async () => {
    const task = buildTask()
    if (!task) return
    setStrategyLoading(true); setError(''); setStrategyResult(null); setStrategyApproved(false); setStrategyApprovedAt(null); setStrategyRejected(false); setStrategyRejectedAt(null)
    try {
      const data = await agentAPI.run('test_strategy', task, null, 'ollama')
      setStrategyResult(data.result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Agent execution failed. Please try again.')
    } finally {
      setStrategyLoading(false)
    }
  }

  /* ── approve / reject ── */
  const handleApprove = () => {
    setApproved(true); setApprovedAt(new Date().toLocaleString())
    filesAPI.saveOutput('planning', result).catch(() => {})
  }
  const handleReject = () => {
    setRejected(true); setRejectedAt(new Date().toLocaleString())
  }
  const handleStrategyApprove = () => {
    setStrategyApproved(true); setStrategyApprovedAt(new Date().toLocaleString())
    filesAPI.saveOutput('test_strategy', strategyResult).catch(() => {})
  }
  const handleStrategyReject = () => {
    setStrategyRejected(true); setStrategyRejectedAt(new Date().toLocaleString())
  }

  const switchTab = (id) => {
    setActiveTab(id); setError(''); setResult(null); setStrategyResult(null)
    setApproved(false); setApprovedAt(null); setRejected(false); setRejectedAt(null)
    setStrategyApproved(false); setStrategyApprovedAt(null); setStrategyRejected(false); setStrategyRejectedAt(null)
    setJiraFetched(null)
  }

  return (
    <DashboardLayout title="Planning">
      <div style={s.page}>

        <div>
          <h2 style={s.pageTitle}>Planning</h2>
          <p style={s.pageSubtitle}>
            Create comprehensive test plans from requirements, uploaded documents, or previously generated requirement docs.
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
                    'Enter your requirements or feature description to plan tests for...\n\n' +
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
                            ? 'Extracting text...'
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
                    'Paste the Jira epic or feature description to build a test plan for...\n\n' +
                    'Example:\n' +
                    'Epic: Payment Gateway Integration\n\n' +
                    'Description:\n' +
                    'Integrate Stripe payment gateway to support credit/debit card payments.'
                  }
                  value={jiraText}
                  onChange={e => setJiraText(e.target.value)}
                />
              </>
            )}

            {activeTab === 'existing' && (
              <>
                <p style={s.sectionTitle}>Use Existing Requirement</p>
                <p style={s.hint}>Select a requirement document previously generated by the Product Requirement agent.</p>

                {fetchingFiles ? (
                  <div style={s.loadingBox}>⟳ Loading requirements...</div>
                ) : outputFiles.length === 0 ? (
                  <div style={s.emptyBox}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>💭</div>
                    <p>No requirement documents found.</p>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                      Go to <strong>Product Requirement</strong> page to generate one first.
                    </p>
                  </div>
                ) : (
                  <div style={s.fileList}>
                    {outputFiles.map(f => (
                      <div
                        key={f.name}
                        style={{
                          ...s.fileListItem,
                          borderColor: selectedFile === f.name ? '#0891b2' : '#e5e7eb',
                          background: selectedFile === f.name ? 'rgba(8,145,178,0.05)' : '#fff',
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

            {error && <div style={s.errorBox}>⚠️ {error}</div>}

            <div style={s.btnRow}>
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
                  ? <><span style={s.spin}>⟳</span> Generating test plan...</>
                  : '🗺️  Generate Test Plan'
                }
              </button>
              <button
                style={{
                  ...s.strategyBtn,
                  opacity: strategyLoading || !isReady() ? 0.55 : 1,
                  cursor:  strategyLoading || !isReady() ? 'not-allowed' : 'pointer',
                }}
                onClick={handleGenerateStrategy}
                disabled={strategyLoading || !isReady()}
              >
                {strategyLoading
                  ? <><span style={s.spin}>⟳</span> Generating test strategy...</>
                  : '📐  Generate Test Strategy'
                }
              </button>
            </div>
          </div>
        </div>

        {result && (
          <div style={{
            ...s.resultCard,
            borderColor: approved ? '#bbf7d0' : rejected ? '#fecaca' : '#a5f3fc',
          }}>
            <div style={{
              ...s.resultHead,
              background: approved ? 'rgba(34,197,94,0.05)' : rejected ? 'rgba(239,68,68,0.05)' : 'rgba(8,145,178,0.04)',
              borderColor: approved ? '#bbf7d0' : rejected ? '#fecaca' : '#cffafe',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1rem' }}>{approved ? '✅' : rejected ? '❌' : '📄'}</span>
                <span style={{ ...s.resultTitle, color: approved ? '#166534' : rejected ? '#dc2626' : '#0e7490' }}>
                  {approved ? 'Test Plan — Approved' : rejected ? 'Test Plan — Rejected' : 'Test Plan Generated'}
                </span>
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
              <div style={s.rejectedStrip}>❌ This test plan has been rejected. Click Generate Test Plan to try again.</div>
            )}
            <pre style={{ ...s.resultText, opacity: rejected ? 0.5 : 1 }}>{result}</pre>
            <div style={{ ...s.resultFoot, background: approved ? '#f0fdf4' : rejected ? '#fef2f2' : '#f0fdff' }}>
              {approved
                ? <span style={{ color: '#16a34a', fontWeight: 600 }}>🔒 Test plan approved.</span>
                : rejected
                  ? <span style={{ color: '#dc2626', fontWeight: 600 }}>❌ Test plan rejected — click <strong>Generate Test Plan</strong> to try again.</span>
                  : <span>💡 Review above. Click <strong>Approve</strong> to lock or <strong>Reject</strong> to discard.</span>
              }
            </div>
          </div>
        )}

        {strategyResult && (
          <div style={{
            ...s.resultCard,
            borderColor: strategyApproved ? '#bbf7d0' : strategyRejected ? '#fecaca' : '#a78bfa',
          }}>
            <div style={{
              ...s.resultHead,
              background: strategyApproved ? 'rgba(34,197,94,0.05)' : strategyRejected ? 'rgba(239,68,68,0.05)' : 'rgba(139,92,246,0.04)',
              borderColor: strategyApproved ? '#bbf7d0' : strategyRejected ? '#fecaca' : '#ddd6fe',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1rem' }}>{strategyApproved ? '✅' : strategyRejected ? '❌' : '📐'}</span>
                <span style={{ ...s.resultTitle, color: strategyApproved ? '#166534' : strategyRejected ? '#dc2626' : '#6d28d9' }}>
                  {strategyApproved ? 'Test Strategy — Approved' : strategyRejected ? 'Test Strategy — Rejected' : 'Test Strategy Generated'}
                </span>
                {strategyApproved && <span style={s.approvedBadge}>✅ Approved · {strategyApprovedAt}</span>}
                {strategyRejected && <span style={s.rejectedBadge}>❌ Rejected · {strategyRejectedAt}</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button style={s.copyBtn} onClick={() => navigator.clipboard.writeText(strategyResult)}>📋 Copy</button>
                <button style={s.pdfBtn} onClick={() => downloadAsPDF(strategyResult)}>⬇️ Download PDF</button>
                {!strategyApproved && !strategyRejected && <button style={s.approveBtn} onClick={handleStrategyApprove}>✅ Approve</button>}
                {!strategyApproved && !strategyRejected && <button style={s.rejectBtn} onClick={handleStrategyReject}>❌ Reject</button>}
              </div>
            </div>
            {strategyRejected && (
              <div style={s.rejectedStrip}>❌ This test strategy has been rejected. Click Generate Test Strategy to try again.</div>
            )}
            <pre style={{ ...s.resultText, opacity: strategyRejected ? 0.5 : 1 }}>{strategyResult}</pre>
            <div style={{ ...s.resultFoot, background: strategyApproved ? '#f0fdf4' : strategyRejected ? '#fef2f2' : '#faf5ff' }}>
              {strategyApproved
                ? <span style={{ color: '#16a34a', fontWeight: 600 }}>🔒 Test strategy approved.</span>
                : strategyRejected
                  ? <span style={{ color: '#dc2626', fontWeight: 600 }}>❌ Test strategy rejected — click <strong>Generate Test Strategy</strong> to try again.</span>
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
  card:         { background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' },
  tabBar:       { display: 'flex', borderBottom: '1.5px solid #e5e7eb' },
  hint:         { fontSize: '0.82rem', color: '#6b7280', marginBottom: '4px' },
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
    background: 'rgba(8,145,178,0.1)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.2)',
    flexShrink: 0,
  },
  loadingBox: {
    padding: '20px', textAlign: 'center', color: '#0891b2',
    fontSize: '0.88rem', fontWeight: 600,
  },
  emptyBox: {
    padding: '24px', textAlign: 'center', color: '#6b7280',
    background: '#f9fafb', borderRadius: '8px', fontSize: '0.85rem',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#dc2626', borderRadius: '8px', padding: '10px 14px', fontSize: '0.875rem',
  },
  btnRow: {
    display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px',
  },
  actionBtn: {
    padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem',
    border: 'none', background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
    color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '8px',
    boxShadow: '0 3px 12px rgba(8,145,178,0.28)', transition: 'opacity 0.2s', flex: 1, justifyContent: 'center',
  },
  strategyBtn: {
    padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem',
    border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '8px',
    boxShadow: '0 3px 12px rgba(124,58,237,0.28)', transition: 'opacity 0.2s', flex: 1, justifyContent: 'center',
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
