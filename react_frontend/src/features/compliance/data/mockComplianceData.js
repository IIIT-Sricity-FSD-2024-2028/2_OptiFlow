/**
 * Mock Regulatory Compliance Data
 * Pod Alignment: Vaitish (Compliance Officer & Regulatory Audit Loop)
 */

export const MOCK_AUDITORS = [
  { id: 'usr_1', name: 'Ram S', role: 'Compliance Officer', email: 'vaitish.compliance@optiflow.io', status: 'online' },
  { id: 'usr_2', name: 'Dr. Elena Vance', role: 'Compliance Officer', email: 'elena.vance@optiflow.io', status: 'online' },
  { id: 'usr_3', name: 'Marcus Sterling', role: 'Project Manager', email: 'marcus.pm@optiflow.io', status: 'away' },
  { id: 'usr_4', name: 'Sarah Chen', role: 'Team Leader', email: 'sarah.tl@optiflow.io', status: 'online' },
  { id: 'usr_5', name: 'Alex Morgan', role: 'Team Member', email: 'alex.dev@optiflow.io', status: 'offline' },
  { id: 'usr_6', name: 'Rohan Patel', role: 'Process Admin', email: 'rohan.admin@optiflow.io', status: 'busy' },
];

export const MOCK_COMPLIANCE_ITEMS = [
  {
    id: 'CMP-2026-0901',
    title: 'GDPR Article 32: Cryptographic Key Storage & At-Rest Encryption Audit',
    category: 'Data Privacy & Security',
    framework: 'GDPR / ISO 27001',
    severity: 'Critical',
    status: 'In Review',
    assignee: MOCK_AUDITORS[0], // Vaitish
    reviewers: [MOCK_AUDITORS[0], MOCK_AUDITORS[1], MOCK_AUDITORS[2]],
    deadline: '2026-09-30',
    description: 'Quarterly regulatory verification of database secret management and server-side envelope encryption keys rotation certificates.',
    evidence: {
      name: 'encryption_key_rotation_audit_report.pdf',
      size: 2457600, // ~2.34 MB
      type: 'application/pdf',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      uploadedBy: 'Marcus Sterling',
      uploadedAt: '2026-09-22T14:30:00Z',
    },
    comments: [
      {
        id: 'comm_1',
        author: 'Marcus Sterling',
        role: 'Project Manager',
        tag: 'Policy Citation',
        content: 'Attached the KMS rotation logs for Q3. Key rotation completed across all staging and production clusters.',
        createdAt: '2026-09-22T14:35:00Z',
      },
      {
        id: 'comm_2',
        author: 'Vaitish S',
        role: 'Compliance Officer',
        tag: 'Audit Note',
        content: 'Reviewing SHA-256 fingerprint on the encrypted cluster logs. Awaiting secondary verification for branch region ap-south-1.',
        createdAt: '2026-09-23T09:15:00Z',
      },
    ],
  },
  {
    id: 'CMP-2026-0902',
    title: 'SOC2 Type II: Continuous Access Logging & Privilege Escalation Review',
    category: 'Access Control',
    framework: 'SOC2 Trust Criteria',
    severity: 'High',
    status: 'Pending Evidence',
    assignee: MOCK_AUDITORS[0],
    reviewers: [MOCK_AUDITORS[0], MOCK_AUDITORS[3]],
    deadline: '2026-10-05',
    description: 'Verification of privileged sudoers and multi-factor authentication enforcement on all production deployment gateways.',
    evidence: null,
    comments: [
      {
        id: 'comm_3',
        author: 'Sarah Chen',
        role: 'Team Leader',
        tag: 'Evidence Query',
        content: 'Our team will upload the Okta MFA policy dump by end of day.',
        createdAt: '2026-09-24T11:00:00Z',
      },
    ],
  },
  {
    id: 'CMP-2026-0903',
    title: 'HIPAA Omnibus Rule: Patient Health Data Transmission TLS 1.3 Compliance',
    category: 'Healthcare & Confidentiality',
    framework: 'HIPAA Security Rule',
    severity: 'Medium',
    status: 'Compliant',
    assignee: MOCK_AUDITORS[1],
    reviewers: [MOCK_AUDITORS[1], MOCK_AUDITORS[0]],
    deadline: '2026-09-15',
    description: 'Ensure all public API endpoints strictly reject legacy TLS 1.0/1.1 and enforce cipher suite forward secrecy.',
    evidence: {
      name: 'tls_cipher_suite_ssl_labs_scan.pdf',
      size: 1048576,
      type: 'application/pdf',
      sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      uploadedBy: 'Sarah Chen',
      uploadedAt: '2026-09-14T16:00:00Z',
    },
    comments: [
      {
        id: 'comm_4',
        author: 'Dr. Elena Vance',
        role: 'Compliance Officer',
        tag: 'Audit Note',
        content: 'SSLLabs Grade A+ confirmed across all gateway proxies. Cryptographic proof locked.',
        createdAt: '2026-09-15T10:00:00Z',
      },
    ],
  },
  {
    id: 'CMP-2026-0904',
    title: 'ISO 27001 Annex A.12.1.2: Change Management Documentation & PR Approvals',
    category: 'Operations Security',
    framework: 'ISO 27001',
    severity: 'Low',
    status: 'Compliant',
    assignee: MOCK_AUDITORS[0],
    reviewers: [MOCK_AUDITORS[0]],
    deadline: '2026-09-10',
    description: 'Audit peer-review signoffs for critical infrastructure changes over the last 30 days.',
    evidence: {
      name: 'git_signed_commits_audit.txt',
      size: 512000,
      type: 'text/plain',
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      uploadedBy: 'Alex Morgan',
      uploadedAt: '2026-09-10T12:00:00Z',
    },
    comments: [],
  },
];
