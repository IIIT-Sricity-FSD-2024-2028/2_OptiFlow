import React, { createContext, useContext, useState } from 'react';
import { MOCK_COMPLIANCE_ITEMS, MOCK_AUDITORS } from '../data/mockComplianceData';

const ComplianceContext = createContext(null);

export function ComplianceProvider({ children }) {
  const [items, setItems] = useState(MOCK_COMPLIANCE_ITEMS);
  const [selectedItemId, setSelectedItemId] = useState(MOCK_COMPLIANCE_ITEMS[0]?.id || null);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(MOCK_AUDITORS[0]); // Default to Vaitish (Compliance Officer)

  const activeItem = items.find((it) => it.id === selectedItemId) || items[0] || null;

  /**
   * Add a comment to an audit case
   */
  const addComment = (itemId, comment) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            comments: [...(it.comments || []), comment],
          };
        }
        return it;
      })
    );
  };

  /**
   * Delete a comment from an audit case
   */
  const deleteComment = (itemId, commentId) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            comments: (it.comments || []).filter((c) => c.id !== commentId),
          };
        }
        return it;
      })
    );
  };

  /**
   * Attach evidence to an audit case
   */
  const attachEvidence = (itemId, evidenceData) => {
    const evidenceRecord = {
      name: evidenceData.name,
      size: evidenceData.size,
      type: evidenceData.type,
      sha256: evidenceData.sha256,
      uploadedBy: currentUser.name,
      uploadedAt: new Date().toISOString(),
    };

    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            evidence: evidenceRecord,
            status: it.status === 'Pending Evidence' ? 'In Review' : it.status,
            comments: [
              ...(it.comments || []),
              {
                id: `comm_sys_${Date.now()}`,
                author: currentUser.name,
                role: currentUser.role,
                tag: 'Audit Note',
                content: `Attached cryptographic evidence "${evidenceData.name}" (SHA-256: ${evidenceData.sha256.substring(0, 16)}...).`,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        }
        return it;
      })
    );
  };

  /**
   * Update Risk Severity
   */
  const updateSeverity = (itemId, newSeverity) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, severity: newSeverity } : it))
    );
  };

  /**
   * Update Status (e.g. Compliant, Violation Flagged, In Review)
   */
  const updateStatus = (itemId, newStatus) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, status: newStatus } : it))
    );
  };

  /**
   * Filtered items based on severity and search query
   */
  const filteredItems = items.filter((it) => {
    const matchesSeverity = severityFilter === 'All' || it.severity === severityFilter;
    const matchesQuery =
      searchQuery.trim() === '' ||
      it.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.framework.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesQuery;
  });

  const value = {
    items,
    filteredItems,
    activeItem,
    selectedItemId,
    setSelectedItemId,
    severityFilter,
    setSeverityFilter,
    searchQuery,
    setSearchQuery,
    currentUser,
    setCurrentUser,
    auditors: MOCK_AUDITORS,
    addComment,
    deleteComment,
    attachEvidence,
    updateSeverity,
    updateStatus,
  };

  return <ComplianceContext.Provider value={value}>{children}</ComplianceContext.Provider>;
}

export function useCompliance() {
  const context = useContext(ComplianceContext);
  if (!context) {
    throw new Error('useCompliance must be used within a ComplianceProvider');
  }
  return context;
}

export default ComplianceContext;
