import React, { useState, useEffect } from 'react';
import { ComplianceProvider, useCompliance } from './context/ComplianceContext';
import EvidenceDropzone from './components/EvidenceDropzone';
import CommentThread from './components/CommentThread';

function ComplianceEvidenceView() {
  const {
    items,
    activeItem,
    selectedItemId,
    setSelectedItemId,
    currentUser,
    addComment,
    deleteComment,
    attachEvidence,
    updateSeverity,
    updateStatus,
  } = useCompliance();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'urgent' | 'reviewed'
  const [evidenceMode, setEvidenceMode] = useState('review');
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Data audit report submitted', checked: true },
    { id: 2, text: 'Client consent records attached', checked: false },
    { id: 3, text: 'GDPR verification checklist completed', checked: true },
    { id: 4, text: 'Client cross-verification (blocked — access pending)', blocked: true },
  ]);

  const toggleChecklist = (id) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id && !item.blocked) {
          return { ...item, checked: !item.checked };
        }
        return item;
      })
    );
  };

  const queueItems = items.filter((item) => {
    if (activeTab === 'urgent') return item.severity === 'Critical' || item.severity === 'High';
    if (activeTab === 'reviewed') return item.status === 'Compliant' || item.status === 'Resolved';
    return true; // 'all'
  });

  const pendingCount = items.filter((i) => i.status !== 'Compliant').length;
  const urgentCount = items.filter((i) => i.severity === 'Critical' || i.severity === 'High').length;
  const reviewedCount = items.filter((i) => i.status === 'Compliant').length;

  return (
    <div className="content-wrapper">
      <div className="evidence-layout">
        {/* ===== LEFT: EVIDENCE QUEUE ===== */}
        <section className="evidence-queue" aria-label="Evidence Queue">
          <div className="queue-header">
            <h1 className="queue-header-title">Evidence Queue</h1>
            <span className="queue-pending-count">{pendingCount} pending</span>
          </div>

          <div className="queue-tabs" id="queueTabs" role="tablist">
            <button
              className={`queue-tab ${activeTab === 'all' ? 'active' : ''}`}
              data-tab="all"
              role="tab"
              aria-selected={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
            >
              All ({items.length})
            </button>
            <button
              className={`queue-tab ${activeTab === 'urgent' ? 'active' : ''}`}
              data-tab="urgent"
              role="tab"
              aria-selected={activeTab === 'urgent'}
              onClick={() => setActiveTab('urgent')}
            >
              Urgent ({urgentCount})
            </button>
            <button
              className={`queue-tab ${activeTab === 'reviewed' ? 'active' : ''}`}
              data-tab="reviewed"
              role="tab"
              aria-selected={activeTab === 'reviewed'}
              onClick={() => setActiveTab('reviewed')}
            >
              Reviewed ({reviewedCount})
            </button>
          </div>

          <ul className="queue-list" id="queueList" role="list">
            {queueItems.map((item) => {
              const isSelected = activeItem && activeItem.id === item.id;
              
              // Map severity to legacy CSS badge names
              let badgeClass = 'badge pending';
              if (item.severity === 'Critical') badgeClass = 'badge urgent';
              else if (item.severity === 'High') badgeClass = 'badge due-soon';
              else if (item.status === 'Compliant') badgeClass = 'badge-green';

              return (
                <li
                  key={item.id}
                  className={`queue-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <div className="queue-item-header">
                    <span className="queue-item-title">{item.title}</span>
                    <span className="queue-item-date">{item.deadline || 'Today'}</span>
                  </div>
                  <div className="queue-item-meta">
                    Submitted by {item.assignee?.name || 'Kiran Rao (TL)'} • {item.framework}
                  </div>
                  <div className="queue-item-badges">
                    <span className={badgeClass}>{item.severity === 'Critical' ? 'Urgent' : item.status}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ===== RIGHT: EVIDENCE DETAIL ===== */}
        <section className="evidence-detail" id="evidenceDetail" aria-label="Evidence Detail">
          {activeItem ? (
            <>
              <div className="detail-content">
                {/* Header */}
                <div className="detail-header">
                  <h2 className="detail-title" id="detailTitle">
                    {activeItem.title}
                  </h2>
                  <span className={`badge ${activeItem.severity === 'Critical' ? 'urgent' : 'pending'}`} id="detailBadge">
                    {activeItem.severity === 'Critical' ? 'Urgent' : activeItem.status}
                  </span>
                </div>

                {/* Meta grid matching screenshot */}
                <div className="detail-meta-grid">
                  <div className="detail-meta-cell">
                    <span className="detail-meta-label">Submitted By</span>
                    <div className="detail-meta-value" id="metaSubmitter">
                      {activeItem.assignee?.name || 'Kiran Rao'} ({activeItem.assignee?.role || 'TL'})
                    </div>
                  </div>
                  <div className="detail-meta-cell">
                    <span className="detail-meta-label">Project</span>
                    <div className="detail-meta-value" id="metaProject">
                      Project Atlas
                    </div>
                  </div>
                  <div className="detail-meta-cell">
                    <span className="detail-meta-label">Compliance Rule</span>
                    <div className="detail-meta-value" id="metaRule">
                      {activeItem.framework}
                    </div>
                  </div>
                  <div className="detail-meta-cell">
                    <span className="detail-meta-label">Submitted On</span>
                    <div className="detail-meta-value" id="metaSubmittedOn">
                      Today, 10:22 AM
                    </div>
                  </div>
                  <div className="detail-meta-cell">
                    <span className="detail-meta-label">Review Deadline</span>
                    <div className="detail-meta-value deadline" id="metaDeadline">
                      {activeItem.deadline || 'Today EOD'}
                    </div>
                  </div>
                  <div className="detail-meta-cell">
                    <span className="detail-meta-label">Process Stage</span>
                    <div className="detail-meta-value" id="metaStage">
                      Stage 2 of 3
                    </div>
                  </div>
                </div>

                {/* Submitter Notes */}
                <div className="detail-section">
                  <div className="detail-section-label">Submitter Notes</div>
                  <div className="submitter-notes-box" id="submitterNotes">
                    {activeItem.description ||
                      'Evidence package includes data audit results, GDPR verification checklist, and client consent records. Note: client cross-verification step (subtask 3) is still blocked due to access issue — IT escalation is in progress. Remaining evidence is complete and ready for review.'}
                  </div>
                </div>

                {/* Attached Files & React Component Integration */}
                <div className="detail-section">
                  <div className="detail-section-label">Attached Files</div>
                  <div style={{ marginTop: '12px' }}>
                    <EvidenceDropzone
                      mode={evidenceMode}
                      initialEvidence={activeItem.evidence}
                      onModeChange={(m) => setEvidenceMode(m)}
                      onEvidenceAttached={(evidenceData) => attachEvidence(activeItem.id, evidenceData)}
                      style={{ border: 'none', padding: '0', boxShadow: 'none' }} // Removing custom box shadow from generic component to fit into legacy UI smoothly
                    />
                  </div>
                </div>

                {/* Compliance Checklist */}
                <div className="detail-section">
                  <div className="detail-section-label">Compliance Checklist</div>
                  <div id="complianceChecklist">
                    {checklist.map((c) => (
                      <div
                        key={c.id}
                        className={`checklist-item ${c.blocked ? 'blocked' : ''}`}
                        onClick={() => toggleChecklist(c.id)}
                      >
                        <span
                          className={`check-icon ${c.blocked ? 'unchecked' : c.checked ? 'checked' : 'unchecked'}`}
                          aria-label={c.blocked ? 'Blocked' : c.checked ? 'Completed' : 'Incomplete'}
                        >
                          {!c.blocked && c.checked && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <span>{c.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comments (React Component) */}
                <div className="detail-section">
                  <div className="detail-section-label">Discussion</div>
                  <CommentThread
                    comments={activeItem.comments || []}
                    currentUser={currentUser}
                    onAddComment={(comm) => addComment(activeItem.id, comm)}
                    onDeleteComment={(commId) => deleteComment(activeItem.id, commId)}
                    style={{ border: 'none', padding: '0', boxShadow: 'none' }} 
                  />
                </div>
              </div>

              {/* Sticky footer actions */}
              <div className="detail-footer">
                <button
                  className="btn-request-info"
                  id="btn-request-info"
                  onClick={() => alert('Request sent!')}
                >
                  Request More Info
                </button>
                <button
                  className="btn-reject"
                  id="btn-reject"
                  onClick={() => updateStatus(activeItem.id, 'Violation Flagged')}
                >
                  Reject
                </button>
                <button
                  className="btn-approve"
                  id="btn-approve"
                  onClick={() => updateStatus(activeItem.id, 'Compliant')}
                >
                  Approve Evidence
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select an item from the queue
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ComplianceDashboard() {
  const [navSection, setNavSection] = useState('evidence'); 

  // Mimic the exact SVG icons used in the legacy sidebar
  const icons = {
    dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-5"/></svg>,
    violations: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    evidence: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
    rules: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-5"/></svg>,
    reports: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    audit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  };

  return (
    <ComplianceProvider>
      <div className="admin-layout">
        {/* ===== SIDEBAR (Matching legacy js/components/sidebar.js) ===== */}
        <aside className="sidebar" id="sidebar">
          <div className="sidebar-logo">
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>OptiFlow</span>
          </div>
          <div className="sidebar-role-container">
            <span className="sidebar-user-role1">Compliance Officer</span>
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-section-label">Main</div>
            <a href="#" className={`nav-item ${navSection === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setNavSection('dashboard'); }}>
              {icons.dashboard} Dashboard
            </a>
            <a href="#" className={`nav-item ${navSection === 'violations' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setNavSection('violations'); }}>
              {icons.violations} Violations <span className="nav-badge">2</span>
            </a>
            <a href="#" className={`nav-item ${navSection === 'evidence' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setNavSection('evidence'); }}>
              {icons.evidence} Evidence Queue
            </a>
            <a href="#" className={`nav-item ${navSection === 'rules' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setNavSection('rules'); }}>
              {icons.rules} Rules
            </a>
            <a href="#" className={`nav-item ${navSection === 'reports' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setNavSection('reports'); }}>
              {icons.reports} Reports
            </a>
            <a href="#" className={`nav-item ${navSection === 'audit' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setNavSection('audit'); }}>
              {icons.audit} Audit Log
            </a>
          </nav>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="main-content">
          {/* Top Header */}
          <header className="top-header">
            <div className="page-title">
                {navSection === 'evidence' && 'Evidence Queue'}
                {navSection === 'dashboard' && 'Compliance Overview'}
                {navSection === 'violations' && 'Violations'}
                {navSection === 'rules' && 'Rules'}
                {navSection === 'reports' && 'Reports'}
                {navSection === 'audit' && 'Audit Log'}
            </div>
            <div className="header-actions">
              <button
                className="btn-icon"
                id="btn-notifications"
                style={{ position: 'relative' }}
                aria-label="Notifications"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
            </div>
          </header>

          <ComplianceEvidenceView />
        </main>
      </div>
    </ComplianceProvider>
  );
}
